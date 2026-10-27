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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method tidak diizinkan." }, 405);
  }

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
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return jsonResponse({ error: "Body permintaan tidak valid." }, 400);
  }
  const nim = (payload as Record<string, unknown>).nim;
  if (typeof nim !== "string" || !/^\d{6,20}$/.test(nim.trim())) {
    return jsonResponse({ valid: false, message: "Format NIM tidak valid." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("nim", nim.trim())
    .eq("peran", "mahasiswa")
    .maybeSingle();
  if (error) {
    return jsonResponse({ error: `Gagal memvalidasi NIM: ${error.message}` }, 500);
  }

  return jsonResponse({
    valid: Boolean(profile),
    ...(profile ? {} : { message: "NIM tidak terdaftar sebagai mahasiswa." }),
  });
});
