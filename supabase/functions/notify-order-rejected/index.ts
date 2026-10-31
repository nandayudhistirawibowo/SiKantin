import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method tidak diizinkan." }, 405);
  }

  const tokenMatch = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse({ error: "Token autentikasi wajib disertakan." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Konfigurasi Supabase Edge Function belum lengkap." }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller }, error: authError } = await authClient.auth.getUser(tokenMatch[1]);
  if (authError || !caller) {
    return jsonResponse({ error: "JWT tidak valid atau sesi sudah kedaluwarsa." }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  if (!isRecord(payload) || typeof payload.order_id !== "string") {
    return jsonResponse({ error: "ID pesanan tidak valid." }, 400);
  }
  const orderId = payload.order_id.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return jsonResponse({ error: "ID pesanan tidak valid." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("peran")
    .eq("id", caller.id)
    .maybeSingle();
  if (profileError) {
    return jsonResponse({ error: `Gagal memeriksa profil pemilik tenant: ${profileError.message}` }, 500);
  }
  if (profile?.peran !== "pemilik_tenant") {
    return jsonResponse({ error: "Hanya pemilik tenant yang dapat mengirim notifikasi penolakan." }, 403);
  }

  const { data: tenant, error: tenantError } = await serviceClient
    .from("tenants")
    .select("id, nama_tenant")
    .eq("pemilik_id", caller.id)
    .maybeSingle();
  if (tenantError) {
    return jsonResponse({ error: `Gagal memuat tenant: ${tenantError.message}` }, 500);
  }
  if (!tenant) {
    return jsonResponse({ error: "Tenant tidak ditemukan." }, 404);
  }

  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .select("phone, nomor_pesanan, alasan_pembatalan")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .eq("status", "Dibatalkan")
    .maybeSingle();
  if (orderError) {
    return jsonResponse({ error: `Gagal memuat pesanan: ${orderError.message}` }, 500);
  }
  if (!order) {
    return jsonResponse({ error: "Pesanan tidak ditemukan atau belum ditolak." }, 404);
  }

  const phone = typeof order.phone === "string" ? order.phone.replace(/\D/g, "") : "";
  const reason = typeof order.alasan_pembatalan === "string" ? order.alasan_pembatalan.trim() : "";
  if (!/^628\d{8,13}$/.test(phone)) {
    return jsonResponse({ error: "Nomor WhatsApp pelanggan tidak valid." }, 422);
  }
  if (!reason) {
    return jsonResponse({ error: "Alasan penolakan pesanan tidak tersedia." }, 422);
  }

  const gatewayUrl = Deno.env.get("WA_GATEWAY_URL");
  const apiKey = Deno.env.get("WA_API_KEY");
  if (!gatewayUrl || !apiKey) {
    return jsonResponse({ error: "Secret WA_GATEWAY_URL atau WA_API_KEY belum dikonfigurasi." }, 500);
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/send", gatewayUrl);
  } catch {
    return jsonResponse({ error: "WA_GATEWAY_URL bukan URL yang valid." }, 500);
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    return jsonResponse({ error: "WA_GATEWAY_URL harus HTTPS, kecuali gateway localhost." }, 500);
  }

  const message = `Mohon maaf, pesanan Anda ${order.nomor_pesanan} di ${tenant.nama_tenant} ditolak. Alasan: ${reason}. Silakan pesan menu lain.`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({ nomor_wa: phone, pesan: message }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    console.error("Notifikasi penolakan WhatsApp gagal dikirim:", error);
    return jsonResponse({ error: "Gateway WhatsApp tidak dapat dihubungi." }, 502);
  }

  let responseBody: { success?: boolean; message?: string } | null = null;
  try {
    responseBody = await response.json();
  } catch {
    return jsonResponse({ error: `Gateway WhatsApp memberikan respons tidak valid (HTTP ${response.status}).` }, 502);
  }
  if (!response.ok || responseBody?.success !== true) {
    return jsonResponse({
      error: responseBody?.message || `Gateway WhatsApp gagal mengirim pesan (HTTP ${response.status}).`,
    }, 502);
  }

  return jsonResponse({ success: true });
});
