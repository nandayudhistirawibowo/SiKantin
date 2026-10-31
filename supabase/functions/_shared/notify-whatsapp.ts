type OrderItem = { nama_menu: string; jumlah: number; subtotal: number };

type WhatsAppNotification =
  | { phone: string; message: string }
  | {
    phone: string;
    tenantName: string;
    queueNumber: string;
    orderToken: string;
    orderNumber: string;
    total: number;
    items: OrderItem[];
  };

export async function notifyByWhatsApp(
  notification: WhatsAppNotification,
): Promise<"sent" | "not_configured" | "failed"> {
  const gatewayUrl = Deno.env.get("WA_GATEWAY_URL");
  const apiKey = Deno.env.get("WA_API_KEY");
  if (!gatewayUrl || !apiKey) {
    console.error("WhatsApp tidak dikonfigurasi: WA_GATEWAY_URL atau WA_API_KEY belum tersedia.");
    return "not_configured";
  }

  let message: string;
  if ("message" in notification) {
    message = notification.message;
  } else {
    const configuredAppUrl = Deno.env.get("APP_URL");
    if (!configuredAppUrl) {
      console.error("APP_URL belum dikonfigurasi; tautan cek pesanan tidak dapat dibuat.");
      return "failed";
    }

    let appUrl: URL;
    try {
      appUrl = new URL(configuredAppUrl);
    } catch {
      console.error("APP_URL bukan URL yang valid.");
      return "failed";
    }
    if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost" && appUrl.hostname !== "127.0.0.1") {
      console.error("APP_URL harus HTTPS, kecuali aplikasi localhost.");
      return "failed";
    }

    message = [
      `Halo! Pesanan Anda di ${notification.tenantName} berhasil.`,
      `Nomor Antrean: ${notification.queueNumber}`,
      "---------------------",
      "Rincian Pesanan:",
      ...notification.items.map((item) =>
        `- ${item.jumlah}x ${item.nama_menu} = Rp ${Math.round(item.subtotal).toLocaleString("id-ID")}`
      ),
      "---------------------",
      `Total: Rp ${Math.round(notification.total).toLocaleString("id-ID")}`,
      `Silakan cek status pesanan Anda di: ${appUrl.origin}/cek-pesanan?token=${encodeURIComponent(notification.orderToken)}`,
      `Nomor pesanan: ${notification.orderNumber}`,
    ].join("\n");
  }

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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({
        nomor_wa: notification.phone,
        pesan: message,
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
