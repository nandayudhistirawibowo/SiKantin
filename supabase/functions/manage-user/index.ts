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

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile, error: callerProfileError } = await serviceClient
    .from("profiles")
    .select("peran")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerProfileError) {
    return jsonResponse({ error: `Gagal memeriksa role admin: ${callerProfileError.message}` }, 500);
  }
  if (callerProfile?.peran !== "admin") {
    return jsonResponse({ error: "Hanya admin yang dapat menghapus user." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  if (!isRecord(payload) || payload.action !== "delete" || typeof payload.user_id !== "string") {
    return jsonResponse({ error: "Permintaan penghapusan user tidak valid." }, 400);
  }

  const targetId = payload.user_id.trim();
  if (!targetId || targetId === caller.id) {
    return jsonResponse({ error: "Akun kosong atau akun yang sedang digunakan tidak dapat dihapus." }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from("profiles")
    .select("peran")
    .eq("id", targetId)
    .maybeSingle();
  if (targetProfileError) {
    return jsonResponse({ error: `Gagal memeriksa user: ${targetProfileError.message}` }, 500);
  }
  if (!targetProfile) {
    return jsonResponse({ error: "User tidak ditemukan." }, 404);
  }
  if (targetProfile.peran === "admin") {
    return jsonResponse({ error: "Akun admin tidak dapat dihapus melalui panel ini." }, 403);
  }

  const { count, error: tenantError } = await serviceClient
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("pemilik_id", targetId);
  if (tenantError) {
    return jsonResponse({ error: `Gagal memeriksa kepemilikan tenant: ${tenantError.message}` }, 500);
  }
  if (count) {
    return jsonResponse({ error: "User masih menjadi pemilik tenant. Alihkan atau hapus tenant terlebih dahulu." }, 409);
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return jsonResponse({ error: `Gagal menghapus akun Auth: ${deleteError.message}` }, 500);
  }

  return jsonResponse({ message: "User berhasil dihapus.", user_id: targetId });
});
