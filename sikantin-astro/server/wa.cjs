require('./env.cjs');

const { connectToWhatsApp } = require('./wa-service.cjs');

connectToWhatsApp().catch((error) => {
    console.error('Gagal menghubungkan WhatsApp:', error);
    process.exitCode = 1;
});
