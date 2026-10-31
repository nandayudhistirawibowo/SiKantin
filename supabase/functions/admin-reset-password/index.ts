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
    return jsonResponse({ error: "Hanya admin yang dapat mereset password." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  if (!isRecord(payload) || typeof payload.user_id !== "string") {
    return jsonResponse({ error: "Permintaan reset password tidak valid." }, 400);
  }

  const targetId = payload.user_id.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return jsonResponse({ error: "ID user tidak valid." }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from("profiles")
    .select("peran, nim")
    .eq("id", targetId)
    .maybeSingle();
  if (targetProfileError) {
    return jsonResponse({ error: `Gagal memeriksa user: ${targetProfileError.message}` }, 500);
  }
  if (!targetProfile) {
    return jsonResponse({ error: "User tidak ditemukan." }, 404);
  }
  if (targetProfile.peran !== "mahasiswa") {
    return jsonResponse({ error: "Reset password hanya tersedia untuk akun mahasiswa." }, 403);
  }
  if (typeof targetProfile.nim !== "string" || !/^\d{6,20}$/.test(targetProfile.nim)) {
    return jsonResponse({ error: "NIM mahasiswa tidak valid; password tidak dapat direset." }, 500);
  }

  const { data: targetAuth, error: targetAuthError } = await serviceClient.auth.admin.getUserById(targetId);
  if (targetAuthError || !targetAuth.user) {
    return jsonResponse({ error: `Gagal memeriksa akun Auth: ${targetAuthError?.message || "User tidak ditemukan."}` }, 500);
  }

  const { error: updateError } = await serviceClient.auth.admin.updateUserById(targetId, {
    password: targetProfile.nim,
    user_metadata: {
      ...targetAuth.user.user_metadata,
      is_temp_password: true,
      password_reset_required: false,
    },
  });
  if (updateError) {
    return jsonResponse({ error: `Password gagal direset: ${updateError.message}` }, 500);
  }

  return jsonResponse({
    message: "Password berhasil direset menjadi NIM. Mahasiswa wajib menggantinya setelah login.",
    password: targetProfile.nim,
    user_id: targetId,
  });
});
