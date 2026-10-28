import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

type GuestItem = { menu_item_id: string; qty: number; addon_ids: string[] };
type MenuAddon = { id: string; name: string; price: number };
const MAX_TRANSFER_PROOF_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getConfiguredAddons(value: unknown): MenuAddon[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const addons: MenuAddon[] = [];
  const ids = new Set<string>();
  for (const rawAddon of value) {
    if (
      !isRecord(rawAddon)
      || typeof rawAddon.id !== "string"
      || !rawAddon.id.trim()
      || typeof rawAddon.name !== "string"
      || !rawAddon.name.trim()
      || typeof rawAddon.price !== "number"
      || !Number.isSafeInteger(rawAddon.price)
      || Number(rawAddon.price) < 0
      || ids.has(rawAddon.id.trim())
    ) {
      return null;
    }
    ids.add(rawAddon.id.trim());
    addons.push({
      id: rawAddon.id.trim(),
      name: rawAddon.name.trim(),
      price: Number(rawAddon.price),
    });
  }
  return addons;
}

async function notifyByWhatsApp(
  phone: string,
  orderToken: string,
  orderNumber: string,
  total: number,
): Promise<"sent" | "not_configured" | "failed"> {
  const gatewayUrl = Deno.env.get("WA_GATEWAY_URL");
  const apiKey = Deno.env.get("WA_API_KEY");
  if (!gatewayUrl || !apiKey) return "not_configured";

  let endpoint: URL;
  try {
    endpoint = new URL("/send", gatewayUrl);
  } catch {
    console.error("WA_GATEWAY_URL bukan URL yang valid.");
    return "failed";
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    console.error("WA_GATEWAY_URL harus HTTPS, kecuali gateway localhost.");
    return "failed";
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({
        nomor_wa: phone,
        pesan: `Pesanan ${orderNumber} berhasil dibuat. Total: Rp${Math.round(total).toLocaleString("id-ID")}. Token cek pesanan: ${orderToken}`,
      }),
      signal: AbortSignal.timeout(6000),
    });
    const responseBody = await response.json().catch(() => null);
    if (!response.ok || responseBody?.success !== true) {
      console.error(
        `Gateway WhatsApp gagal mengirim pesan (HTTP ${response.status}):`,
        responseBody?.message || "Respons bukan JSON sukses; periksa URL tunnel ngrok dan status gateway."
      );
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Notifikasi WhatsApp gagal dikirim:", error);
    return "failed";
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method tidak diizinkan." }, 405);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_TRANSFER_PROOF_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    return jsonResponse({ error: "Ukuran permintaan terlalu besar. Bukti transfer maksimal 5 MB." }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Konfigurasi Supabase Edge Function belum lengkap." }, 500);
  }

  let payload: Record<string, unknown>;
  let proofFile: File;
  try {
    const formData = await request.formData();
    const rawItems = formData.get("items");
    const rawProof = formData.get("proof");
    if (typeof rawItems !== "string" || !(rawProof instanceof File)) {
      return jsonResponse({ error: "Data pesanan dan file bukti transfer wajib dikirim." }, 400);
    }
    const parsedItems: unknown = JSON.parse(rawItems);
    payload = {
      tenant_slug: formData.get("tenant_slug"),
      nim: formData.get("nim"),
      phone: formData.get("phone"),
      items: parsedItems,
    };
    proofFile = rawProof;
  } catch {
    return jsonResponse({ error: "Form pesanan atau JSON item tidak valid." }, 400);
  }

  const slug = typeof payload.tenant_slug === "string" ? payload.tenant_slug.trim() : "";
  const nim = typeof payload.nim === "string" ? payload.nim.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s()+-]/g, "") : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\d{6,20}$/.test(nim)) {
    return jsonResponse({ error: "Tenant atau NIM tidak valid." }, 400);
  }
  if (!/^628\d{8,13}$/.test(phone)) {
    return jsonResponse({ error: "Nomor HP harus memakai format 628 yang valid." }, 400);
  }
  if (proofFile.size < 1 || proofFile.size > MAX_TRANSFER_PROOF_BYTES) {
    return jsonResponse({ error: "Ukuran bukti transfer harus antara 1 byte dan 5 MB." }, 400);
  }
  const proofExtension = proofFile.name.split(".").pop()?.toLowerCase();
  const proofType = proofExtension === "png"
    ? "image/png"
    : ["jpg", "jpeg"].includes(proofExtension || "")
      ? "image/jpeg"
      : "";
  if (!proofType || proofFile.type !== proofType) {
    return jsonResponse({ error: "Bukti transfer hanya boleh berupa file JPG atau PNG." }, 400);
  }
  const proofBytes = new Uint8Array(await proofFile.arrayBuffer());
  const isPng = proofType === "image/png"
    && proofBytes.length >= 8
    && proofBytes[0] === 0x89
    && proofBytes[1] === 0x50
    && proofBytes[2] === 0x4e
    && proofBytes[3] === 0x47
    && proofBytes[4] === 0x0d
    && proofBytes[5] === 0x0a
    && proofBytes[6] === 0x1a
    && proofBytes[7] === 0x0a;
  const isJpeg = proofType === "image/jpeg"
    && proofBytes.length >= 3
    && proofBytes[0] === 0xff
    && proofBytes[1] === 0xd8
    && proofBytes[2] === 0xff;
  if (!isPng && !isJpeg) {
    return jsonResponse({ error: "Isi file tidak sesuai dengan format JPG atau PNG." }, 400);
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 20) {
    return jsonResponse({ error: "Pilih 1 sampai 20 item menu." }, 400);
  }

  const orderLines = new Map<string, GuestItem>();
  for (const rawItem of payload.items) {
    if (!isRecord(rawItem) || typeof rawItem.menu_item_id !== "string" || !rawItem.menu_item_id.trim()) {
      return jsonResponse({ error: "Item menu tidak valid." }, 400);
    }
    if (!Number.isInteger(rawItem.qty) || Number(rawItem.qty) < 1 || Number(rawItem.qty) > 50) {
      return jsonResponse({ error: "Jumlah setiap menu harus antara 1 sampai 50." }, 400);
    }
    const id = rawItem.menu_item_id.trim();
    const rawAddonIds = rawItem.addon_ids ?? [];
    if (
      !Array.isArray(rawAddonIds)
      || rawAddonIds.length > 20
      || rawAddonIds.some((addonId) => typeof addonId !== "string" || !addonId.trim())
      || new Set(rawAddonIds).size !== rawAddonIds.length
    ) {
      return jsonResponse({ error: "Pilihan add-on pada item tidak valid." }, 400);
    }
    const addonIds = (rawAddonIds as string[]).slice().sort();
    const lineKey = `${id}\u0000${addonIds.join(",")}`;
    const existing = orderLines.get(lineKey);
    orderLines.set(lineKey, {
      menu_item_id: id,
      qty: (existing?.qty || 0) + Number(rawItem.qty),
      addon_ids: addonIds,
    });
  }
  const menuIds = [...new Set([...orderLines.values()].map((item) => item.menu_item_id))];
  const menuQuantities = new Map<string, number>();
  for (const line of orderLines.values()) {
    menuQuantities.set(line.menu_item_id, (menuQuantities.get(line.menu_item_id) || 0) + line.qty);
  }
  if (
    orderLines.size > 20
    || [...menuQuantities.values()].some((quantity) => quantity > 50)
    || menuIds.length > 20
  ) {
    return jsonResponse({ error: "Jumlah menu melebihi batas pesanan." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [{ data: profile, error: profileError }, { data: tenant, error: tenantError }] = await Promise.all([
    serviceClient.from("profiles").select("id, nama").eq("nim", nim).eq("peran", "mahasiswa").maybeSingle(),
    serviceClient.from("tenants").select("id, nama_tenant, status_buka").eq("slug", slug).maybeSingle(),
  ]);
  if (profileError) return jsonResponse({ error: `Gagal memvalidasi NIM: ${profileError.message}` }, 500);
  if (!profile) return jsonResponse({ error: "NIM tidak terdaftar sebagai mahasiswa." }, 400);
  if (tenantError) return jsonResponse({ error: `Gagal memuat tenant: ${tenantError.message}` }, 500);
  if (!tenant) return jsonResponse({ error: "Tenant tidak ditemukan." }, 404);
  if (!tenant.status_buka) return jsonResponse({ error: "Tenant sedang tutup dan belum dapat menerima pesanan." }, 409);

  const { data: menuItems, error: menuError } = await serviceClient
    .from("menu_items")
    .select("id, nama_menu, harga, tenant_id, tersedia, add_ons")
    .eq("tenant_id", tenant.id)
    .in("id", menuIds)
    .eq("tersedia", true);
  if (menuError) return jsonResponse({ error: `Gagal memvalidasi menu: ${menuError.message}` }, 500);
  if (!menuItems || menuItems.length !== menuIds.length) {
    return jsonResponse({ error: "Satu atau lebih menu sudah tidak tersedia. Muat ulang halaman." }, 409);
  }

  const menuItemById = new Map<string, (typeof menuItems)[number]>();
  menuItems.forEach((item) => menuItemById.set(item.id, item));
  const orderItems: Array<{
    menu_item_id: string;
    nama_menu: string;
    harga_satuan: number;
    jumlah: number;
    subtotal: number;
    catatan: null;
    add_ons: MenuAddon[];
  }> = [];
  for (const line of orderLines.values()) {
    const item = menuItemById.get(line.menu_item_id);
    if (!item) return jsonResponse({ error: "Satu atau lebih menu sudah tidak tersedia. Muat ulang halaman." }, 409);
    const configuredAddons = getConfiguredAddons(item.add_ons);
    if (!configuredAddons) {
      console.error(`Konfigurasi add-on tidak valid untuk menu ${item.id}.`);
      return jsonResponse({ error: "Konfigurasi add-on menu tidak valid. Hubungi pengelola kantin." }, 500);
    }
    const addonById = new Map<string, MenuAddon>();
    configuredAddons.forEach((addon) => addonById.set(addon.id, addon));
    const selectedAddons: MenuAddon[] = [];
    for (const addonId of line.addon_ids) {
      const addon = addonById.get(addonId);
      if (!addon) {
        return jsonResponse({ error: `Add-on untuk menu "${item.nama_menu}" sudah tidak tersedia. Muat ulang halaman.` }, 409);
      }
      selectedAddons.push(addon);
    }
    const jumlah = line.qty;
    const harga = Number(item.harga);
    const hargaAddons = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const subtotal = (harga + hargaAddons) * jumlah;
    if (!Number.isSafeInteger(harga) || harga < 0 || !Number.isSafeInteger(subtotal)) {
      return jsonResponse({ error: "Harga menu atau add-on tidak valid." }, 400);
    }
    orderItems.push({
      menu_item_id: item.id,
      nama_menu: item.nama_menu,
      harga_satuan: harga,
      jumlah,
      subtotal,
      catatan: null,
      add_ons: selectedAddons,
    });
  }
  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (!Number.isSafeInteger(total) || total <= 0) {
    return jsonResponse({ error: "Total pesanan tidak valid." }, 400);
  }

  const tokenPesanan = `SK-${crypto.randomUUID().toUpperCase()}`;
  const nomorPesanan = `SK-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const proofPath = `${tenant.id}/${tokenPesanan}.${proofExtension}`;
  const { error: uploadError } = await serviceClient.storage
    .from("bukti-transfer")
    .upload(proofPath, proofBytes, {
      contentType: proofType,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    return jsonResponse({ error: `Gagal mengunggah bukti transfer: ${uploadError.message}` }, 500);
  }
  const { data: proofUrlData } = serviceClient.storage.from("bukti-transfer").getPublicUrl(proofPath);
  const proofUrl = proofUrlData.publicUrl;

  const { data: queueData, error: queueError } = await serviceClient.rpc("next_tenant_queue_number", {
    p_tenant_id: tenant.id,
  });
  if (queueError) {
    const { error: cleanupError } = await serviceClient.storage.from("bukti-transfer").remove([proofPath]);
    return jsonResponse({
      error: `Gagal membuat nomor antrean: ${queueError.message}`,
      ...(cleanupError ? { proof_cleanup_error: cleanupError.message } : {}),
    }, 500);
  }
  if (
    !isRecord(queueData)
    || typeof queueData.nomor_antrean !== "string"
    || !/^A-\d{2,}$/.test(queueData.nomor_antrean)
    || typeof queueData.tanggal_antrean !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(queueData.tanggal_antrean)
  ) {
    const { error: cleanupError } = await serviceClient.storage.from("bukti-transfer").remove([proofPath]);
    return jsonResponse({
      error: "Database tidak mengembalikan nomor antrean yang valid.",
      ...(cleanupError ? { proof_cleanup_error: cleanupError.message } : {}),
    }, 500);
  }
  const nomorAntrean = queueData.nomor_antrean;
  const tanggalAntrean = queueData.tanggal_antrean;

  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .insert({
      tenant_id: tenant.id,
      mahasiswa_id: null,
      nim_guest: nim,
      phone,
      nama_mahasiswa: profile.nama,
      nomor_pesanan: nomorPesanan,
      nomor_antrean: nomorAntrean,
      tanggal_antrean: tanggalAntrean,
      token_pesanan: tokenPesanan,
      status: "Menunggu Verifikasi",
      total,
      metode_pembayaran: "qris",
      bukti_transfer: proofUrl,
    })
    .select("id, created_at")
    .single();
  if (orderError || !order) {
    const { error: cleanupError } = await serviceClient.storage.from("bukti-transfer").remove([proofPath]);
    return jsonResponse({
      error: `Gagal membuat pesanan: ${orderError?.message || "Data pesanan tidak dikembalikan."}`,
      ...(cleanupError ? { proof_cleanup_error: cleanupError.message } : {}),
    }, 500);
  }

  const { error: itemsError } = await serviceClient
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) {
    const { error: rollbackError } = await serviceClient.from("orders").delete().eq("id", order.id);
    const { error: cleanupError } = await serviceClient.storage.from("bukti-transfer").remove([proofPath]);
    return jsonResponse({
      error: `Rincian pesanan gagal disimpan: ${itemsError.message}`,
      ...(rollbackError ? { rollback_error: rollbackError.message } : {}),
      ...(cleanupError ? { proof_cleanup_error: cleanupError.message } : {}),
    }, 500);
  }

  const whatsapp = await notifyByWhatsApp(phone, tokenPesanan, nomorPesanan, total);
  return jsonResponse({
    success: true,
    order: {
      token_pesanan: tokenPesanan,
      nomor_pesanan: nomorPesanan,
      nomor_antrean: nomorAntrean,
      tanggal_antrean: tanggalAntrean,
      tenant_nama: tenant.nama_tenant,
      status: "Menunggu Verifikasi",
      total,
      created_at: order.created_at,
      items: orderItems.map(({ nama_menu, jumlah, subtotal, add_ons }) => ({ nama_menu, jumlah, subtotal, add_ons })),
    },
    whatsapp,
  }, 201);
  } catch (error) {
    console.error("Kesalahan tidak terduga saat membuat guest order:", error);
    return jsonResponse({ error: "Terjadi kesalahan internal saat membuat pesanan." }, 500);
  }
});
