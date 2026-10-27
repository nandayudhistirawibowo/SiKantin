const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

let sockGlobal = null;
let sudahKirimPesan = false;
let jumlahPesanTerkirim = 0;
const BATAS_PESAN_SEBELUM_BREAK = 5;
const DURASI_BREAK_MS = 60000; // Break 1 menit buat testing

// Fungsi delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi kirim pesan gaya manusia
async function kirimPesanHumanLike(sock, nomorTujuan, pesan) {
    // Cek break
    if (jumlahPesanTerkirim >= BATAS_PESAN_SEBELUM_BREAK) {
        console.log(`😴 Udah ngirim ${jumlahPesanTerkirim} pesan. Break dulu selama ${DURASI_BREAK_MS / 60000} menit...`);
        await delay(DURASI_BREAK_MS);
        jumlahPesanTerkirim = 0;
        console.log('☕ Break selesai. Lanjut ngirim lagi!');
    }

    // Random delay awal
    const jedaAwal = Math.floor(Math.random() * 4000) + 1000;
    console.log(`⏳ Menunggu ${(jedaAwal / 1000).toFixed(1)} detik sebelum kirim...`);
    await delay(jedaAwal);

    // Simulasi mengetik
    await sock.sendPresenceUpdate('composing', nomorTujuan);
    await delay(1500);

    // Kirim pesan
    await sock.sendMessage(nomorTujuan, { text: pesan });

    // Matikan status mengetik
    await sock.sendPresenceUpdate('paused', nomorTujuan);

    // Random delay akhir
    const jedaAkhir = Math.floor(Math.random() * 2000) + 1000;
    await delay(jedaAkhir);

    jumlahPesanTerkirim++;
    console.log(`✅ Pesan terkirim ke ${nomorTujuan} (Total: ${jumlahPesanTerkirim})`);
}

// Fungsi koneksi utama
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('Silakan scan QR di atas pakai WhatsApp lo!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus. Mencoba reconnect:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp berhasil terhubung!');
            sockGlobal = sock; // Simpen socket biar bisa dipake di kirimPesan
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// Fungsi buat ngirim pesan dari luar (dipanggil index.js)
async function kirimPesan(nomorTujuan, pesan) {
    if (!sockGlobal) throw new Error('WhatsApp belum terhubung!');
    return await kirimPesanHumanLike(sockGlobal, nomorTujuan, pesan);
}

// Export
module.exports = { connectToWhatsApp, kirimPesan };