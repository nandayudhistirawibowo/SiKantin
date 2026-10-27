import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method tidak diizinkan." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Konfigurasi Supabase Edge Function belum lengkap." }, 500);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  const token = typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).token_pesanan
      ?? (payload as Record<string, unknown>).token
    : null;
  if (typeof token !== "string" || !/^SK-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(token.trim())) {
    return jsonResponse({ error: "Token pesanan tidak valid." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .select("id, nomor_pesanan, token_pesanan, status, total, created_at, tenant_id")
    .eq("token_pesanan", token.trim().toUpperCase())
    .maybeSingle();
  if (orderError) return jsonResponse({ error: `Gagal memuat pesanan: ${orderError.message}` }, 500);
  if (!order) return jsonResponse({ error: "Pesanan tidak ditemukan. Periksa kembali token." }, 404);

  const [{ data: tenant, error: tenantError }, { data: items, error: itemsError }] = await Promise.all([
    serviceClient.from("tenants").select("nama_tenant").eq("id", order.tenant_id).single(),
    serviceClient.from("order_items").select("nama_menu, jumlah, subtotal").eq("order_id", order.id),
  ]);
  if (tenantError) return jsonResponse({ error: `Gagal memuat nama tenant: ${tenantError.message}` }, 500);
  if (itemsError) return jsonResponse({ error: `Gagal memuat rincian pesanan: ${itemsError.message}` }, 500);

  const normalizedItems = items.map((item) => ({
    nama_menu: item.nama_menu,
    jumlah: item.jumlah,
    subtotal: item.subtotal,
  }));
  return jsonResponse({
    order: {
      token_pesanan: order.token_pesanan,
      nomor_pesanan: order.nomor_pesanan,
      tenant_nama: tenant.nama_tenant,
      tenants: { nama_tenant: tenant.nama_tenant },
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      items: normalizedItems,
      order_items: normalizedItems,
    },
  });
  } catch (error) {
    console.error("Kesalahan tidak terduga saat mencari guest order:", error);
    return jsonResponse({ error: "Terjadi kesalahan internal saat mencari pesanan." }, 500);
  }
});
