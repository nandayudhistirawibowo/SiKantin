import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function rollbackUser(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const cleanupErrors: string[] = [];
  const { error: profileError } = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileError) cleanupErrors.push(`Profil: ${profileError.message}`);

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
  if (authError) cleanupErrors.push(`Auth user: ${authError.message}`);
  return cleanupErrors;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method tidak diizinkan." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse({ error: "Bearer token wajib disertakan." }, 401);
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
    return jsonResponse({ error: "Hanya admin yang dapat membuat user." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  if (!isRecord(payload)) {
    return jsonResponse({ error: "Body permintaan tidak valid." }, 400);
  }

  const peran = payload.peran;
  const nim = typeof payload.nim === "string" ? payload.nim.trim() : "";
  const submittedName = typeof payload.nama === "string" ? payload.nama.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const submittedEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const submittedPhone = typeof payload.no_telepon === "string" ? payload.no_telepon.trim() : "";

  if (peran !== "mahasiswa" && peran !== "pemilik_tenant") {
    return jsonResponse({ error: "Role yang diizinkan hanya mahasiswa atau pemilik tenant." }, 400);
  }
  if (peran === "pemilik_tenant" && (password.length < 8 || password.length > 128)) {
    return jsonResponse({ error: "Password harus berisi 8 sampai 128 karakter." }, 400);
  }
  if (peran === "pemilik_tenant" && submittedPhone && !/^628\d{8,13}$/.test(submittedPhone)) {
    return jsonResponse({ error: "Nomor WhatsApp harus memakai format 628 yang valid." }, 400);
  }
  let email: string;
  let nama: string;
  if (peran === "mahasiswa") {
    if (!/^\d{6,20}$/.test(nim)) {
      return jsonResponse({ error: "NIM harus berisi 6 sampai 20 digit." }, 400);
    }
    if (!submittedName || submittedName.length > 120) {
      return jsonResponse({ error: "Nama mahasiswa wajib diisi maksimal 120 karakter." }, 400);
    }
    email = `${nim}@uym.ac.id`;
    nama = submittedName;
  } else {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail) || submittedEmail.length > 254) {
      return jsonResponse({ error: "Email tidak valid." }, 400);
    }
    email = submittedEmail;
    nama = `Pemilik tenant ${submittedEmail.split("@")[0]}`.slice(0, 120);
  }

  const { data: createdAuthUser, error: createAuthError } = await serviceClient.auth.admin.createUser({
    email,
    ...(peran === "pemilik_tenant" ? { password } : {}),
    email_confirm: true,
    user_metadata: {
      full_name: nama,
      ...(peran === "mahasiswa" ? { password_reset_required: true } : {}),
    },
  });
  if (createAuthError || !createdAuthUser.user) {
    return jsonResponse({ error: `Gagal membuat akun Auth: ${createAuthError?.message || "User tidak dikembalikan."}` }, 400);
  }

  const profile: Record<string, string> = {
    id: createdAuthUser.user.id,
    nama,
    no_telepon: peran === "pemilik_tenant" ? submittedPhone : "",
    peran,
  };
  if (peran === "mahasiswa") profile.nim = nim;

  const { error: profileInsertError } = await serviceClient.from("profiles").insert(profile);
  if (profileInsertError) {
    const cleanupErrors = await rollbackUser(serviceClient, createdAuthUser.user.id);
    return jsonResponse({
      error: `Gagal menyimpan profil: ${profileInsertError.message}`,
      ...(cleanupErrors.length ? { cleanup_errors: cleanupErrors } : {}),
    }, 500);
  }

  if (peran === "mahasiswa") {
    const appSiteUrl = (Deno.env.get("APP_SITE_URL") || "https://sikantin.ndhistira.my.id").replace(/\/+$/, "");
    const { error: passwordLinkError } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${appSiteUrl}/mahasiswa/update-password`,
    });
    if (passwordLinkError) {
      const cleanupErrors = await rollbackUser(serviceClient, createdAuthUser.user.id);
      return jsonResponse({
        error: `Akun mahasiswa gagal diselesaikan karena link pengaturan password tidak dapat dikirim: ${passwordLinkError.message}`,
        ...(cleanupErrors.length ? { cleanup_errors: cleanupErrors } : {}),
      }, 502);
    }
  }

  if (peran === "pemilik_tenant") {
    const { error: tenantInsertError } = await serviceClient.from("tenants").insert({
      nama_tenant: `Tenant ${submittedEmail.split("@")[0]}`.slice(0, 120),
      pemilik_id: createdAuthUser.user.id,
      status_buka: false,
      no_telepon: submittedPhone,
    });
    if (tenantInsertError) {
      const { error: tenantCleanupError } = await serviceClient
        .from("tenants")
        .delete()
        .eq("pemilik_id", createdAuthUser.user.id);
      const cleanupErrors = await rollbackUser(serviceClient, createdAuthUser.user.id);
      if (tenantCleanupError) cleanupErrors.unshift(`Tenant: ${tenantCleanupError.message}`);
      return jsonResponse({
        error: `Gagal menyimpan tenant: ${tenantInsertError.message}`,
        ...(cleanupErrors.length ? { cleanup_errors: cleanupErrors } : {}),
      }, 500);
    }
  }

  return jsonResponse({
    message: peran === "mahasiswa"
      ? "Mahasiswa berhasil didaftarkan. Link pengaturan password dikirim ke alamat NIM."
      : "User berhasil dibuat.",
    user_id: createdAuthUser.user.id,
    peran,
  }, 201);
});
