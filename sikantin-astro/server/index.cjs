require('./env.cjs');

const crypto = require('node:crypto');
const express = require('express');
const { connectToWhatsApp, kirimPesan } = require('./wa-service.cjs');

const app = express();
const port = Number(process.env.PORT || process.env.WA_PORT || 3000);
const host = process.env.WA_HOST || '127.0.0.1';
const apiKey = process.env.WA_API_KEY;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT (atau WA_PORT) harus berupa nomor port yang valid.');
}
if (!apiKey || apiKey.length < 32) {
    throw new Error('Atur WA_API_KEY dengan nilai acak minimal 32 karakter sebelum menjalankan gateway.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/', (_request, response) => {
    response.json({ success: true, service: 'SiKantin WhatsApp Gateway' });
});

app.post('/send', async (request, response) => {
    const authorization = request.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
    const suppliedKey = Buffer.from(token);
    const expectedKey = Buffer.from(apiKey);
    const authorized = suppliedKey.length === expectedKey.length
        && crypto.timingSafeEqual(suppliedKey, expectedKey);

    if (!authorized) {
        return response.status(401).json({ success: false, message: 'Autentikasi gateway tidak valid.' });
    }

    const phone = typeof request.body?.nomor_wa === 'string'
        ? request.body.nomor_wa.replace(/[\s()+-]/g, '')
        : '';
    const message = typeof request.body?.pesan === 'string' ? request.body.pesan.trim() : '';

    if (!/^628\d{8,13}$/.test(phone) || !message || message.length > 4096) {
        return response.status(400).json({
            success: false,
            message: 'nomor_wa harus berformat 628 yang valid dan pesan harus berisi 1 sampai 4096 karakter.'
        });
    }

    try {
        await kirimPesan(`${phone}@s.whatsapp.net`, message);
        return response.json({ success: true, message: 'Pesan berhasil dikirim.' });
    } catch (error) {
        console.error('Gagal mengirim pesan WhatsApp:', error);
        return response.status(503).json({ success: false, message: error.message });
    }
});

app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
        return response.status(400).json({ success: false, message: 'Body JSON tidak valid.' });
    }
    if (error?.type === 'entity.too.large') {
        return response.status(413).json({ success: false, message: 'Body permintaan terlalu besar.' });
    }
    console.error('Kesalahan gateway:', error);
    return response.status(500).json({ success: false, message: 'Terjadi kesalahan internal gateway.' });
});

async function start() {
    await connectToWhatsApp();
    app.listen(port, host, () => {
        console.log(`WhatsApp Gateway aktif di http://${host}:${port}`);
    });
}

start().catch((error) => {
    console.error('WhatsApp Gateway gagal dijalankan:', error);
    process.exitCode = 1;
});
