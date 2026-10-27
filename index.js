const express = require('express');
const app = express();
const PORT = 3000;
const { connectToWhatsApp, kirimPesan } = require('./wa-service');

app.use(express.json());

// Endpoint cek server
app.get('/', (req, res) => {
    res.send('Halo! Server SiKantin WA Gateway hidup!');
});

// Endpoint kirim WA
app.post('/send', async (req, res) => {
    try {
        const { nomor_wa, pesan } = req.body;

        console.log('Menerima request:', nomor_wa, pesan);

        if (!nomor_wa || !pesan) {
            return res.status(400).json({ success: false, message: 'nomor_wa dan pesan wajib diisi!' });
        }

        await kirimPesan(nomor_wa + '@s.whatsapp.net', pesan);
        res.json({ success: true, message: 'Pesan berhasil dikirim!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Jalankan server & Baileys
app.listen(PORT, async () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
    await connectToWhatsApp();
});