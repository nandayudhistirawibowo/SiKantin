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

async function hashActivationCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method tidak diizinkan." }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Body harus berupa JSON yang valid." }, 400);
  }
  if (
    !isRecord(payload)
    || typeof payload.nim !== "string"
    || typeof payload.activation_code !== "string"
    || typeof payload.new_password !== "string"
  ) {
    return jsonResponse({ error: "NIM, kode aktivasi, dan password baru wajib diisi." }, 400);
  }

  const nim = payload.nim.trim();
  const activationCode = payload.activation_code.trim().toUpperCase();
  const newPassword = payload.new_password;
  if (!/^\d{6,20}$/.test(nim)) {
    return jsonResponse({ error: "NIM harus berisi 6 sampai 20 digit." }, 400);
  }
  if (!/^AKT-[0-9A-F]{16}$/.test(activationCode)) {
    return jsonResponse({ error: "NIM atau kode aktivasi tidak cocok." }, 400);
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return jsonResponse({ error: "Password harus berisi 8 sampai 128 karakter." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Konfigurasi Supabase Edge Function belum lengkap." }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const codeHash = await hashActivationCode(activationCode);
  const { data: matchingProfile, error: profileLookupError } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("nim", nim)
    .eq("peran", "mahasiswa")
    .eq("activation_code", codeHash)
    .maybeSingle();
  if (profileLookupError) {
    console.error("Gagal memeriksa kode aktivasi mahasiswa:", profileLookupError.message);
    return jsonResponse({ error: "Aktivasi akun gagal diproses. Silakan coba lagi." }, 500);
  }
  if (!matchingProfile) {
    return jsonResponse({ error: "NIM atau kode aktivasi tidak cocok, atau kode sudah digunakan." }, 400);
  }

  const { data: authUser, error: authLookupError } = await serviceClient.auth.admin.getUserById(matchingProfile.id);
  if (authLookupError || !authUser.user) {
    console.error("Gagal memuat akun Auth untuk aktivasi:", authLookupError?.message || "Akun tidak ditemukan.");
    return jsonResponse({ error: "Akun mahasiswa tidak dapat diaktifkan. Hubungi administrator." }, 500);
  }

  const { data: consumedProfile, error: consumeError } = await serviceClient
    .from("profiles")
    .update({ activation_code: null })
    .eq("id", matchingProfile.id)
    .eq("activation_code", codeHash)
    .select("id")
    .maybeSingle();
  if (consumeError) {
    console.error("Gagal memakai kode aktivasi:", consumeError.message);
    return jsonResponse({ error: "Aktivasi akun gagal diproses. Silakan coba lagi." }, 500);
  }
  if (!consumedProfile) {
    return jsonResponse({ error: "Kode aktivasi sudah digunakan. Minta kode baru kepada administrator." }, 409);
  }

  const { error: passwordError } = await serviceClient.auth.admin.updateUserById(matchingProfile.id, {
    password: newPassword,
    user_metadata: {
      ...authUser.user.user_metadata,
      initial_password_required: false,
      password_reset_required: false,
    },
  });
  if (passwordError) {
    const { error: restoreError } = await serviceClient
      .from("profiles")
      .update({ activation_code: codeHash })
      .eq("id", matchingProfile.id)
      .is("activation_code", null);
    if (restoreError) {
      console.error("Kode aktivasi tidak dapat dipulihkan setelah gagal memperbarui password:", restoreError.message);
    }
    return jsonResponse({ error: `Password gagal disimpan: ${passwordError.message}` }, 500);
  }

  return jsonResponse({ success: true });
});
