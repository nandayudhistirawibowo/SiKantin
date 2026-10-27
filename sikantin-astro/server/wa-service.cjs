const path = require('node:path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { supabase } = require('./lib/supabase.cjs');

let socket;
let connecting;
let connected = false;

const authDirectory = path.resolve(
    process.env.WA_AUTH_DIR || path.join(__dirname, '..', '..', 'auth_info_baileys')
);

function getMessageContent(message) {
    let content = message.message || {};

    for (let depth = 0; depth < 5; depth += 1) {
        const wrapped = content.ephemeralMessage?.message
            || content.viewOnceMessage?.message
            || content.viewOnceMessageV2?.message
            || content.documentWithCaptionMessage?.message;
        if (!wrapped) break;
        content = wrapped;
    }

    const [messageType, payload] = Object.entries(content)
        .find(([, value]) => value && typeof value === 'object') || [];
    if (!messageType) return null;

    const text = typeof payload === 'string'
        ? payload
        : payload?.text
            || payload?.caption
            || payload?.selectedDisplayText
            || payload?.title
            || null;

    return {
        messageType,
        text: typeof text === 'string' ? text.slice(0, 16000) : null
    };
}

function getMessageTimestamp(message) {
    const timestamp = message.messageTimestamp;
    const seconds = typeof timestamp?.toNumber === 'function'
        ? timestamp.toNumber()
        : Number(timestamp);
    return Number.isFinite(seconds) && seconds > 0
        ? new Date(seconds * 1000).toISOString()
        : new Date().toISOString();
}

async function saveIncomingMessage(message) {
    const messageId = message.key?.id;
    const senderJid = message.key?.participant || message.key?.remoteJid;
    const content = getMessageContent(message);
    if (!messageId || !senderJid || !content) return;

    console.log(`Pesan masuk: ${senderJid} (${content.messageType})`);

    const { error } = await supabase
        .from('messages')
        .upsert({
            wa_message_id: messageId,
            sender_jid: senderJid,
            push_name: typeof message.pushName === 'string' ? message.pushName.slice(0, 120) : null,
            message_type: content.messageType,
            message_text: content.text,
            message_timestamp: getMessageTimestamp(message)
        }, {
            onConflict: 'wa_message_id',
            ignoreDuplicates: true
        });

    if (error) {
        console.error(`Gagal menyimpan pesan WhatsApp ${messageId} ke Supabase:`, error.message);
    }
}

async function connectToWhatsApp() {
    if (connected) return socket;
    if (connecting) return connecting;

    connecting = (async () => {
        const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
        socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' })
        });

        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('messages.upsert', ({ messages, type }) => {
            if (!['notify', 'append'].includes(type)) return;

            for (const message of messages) {
                if (message.key?.fromMe || message.key?.remoteJid === 'status@broadcast') continue;
                saveIncomingMessage(message).catch((error) => {
                    console.error('Gagal memproses pesan WhatsApp masuk:', error);
                });
            }
        });
        socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                qrcode.generate(qr, { small: true });
                console.log('Pindai QR tersebut melalui WhatsApp > Perangkat tertaut.');
            }

            if (connection === 'open') {
                connected = true;
                console.log('WhatsApp berhasil terhubung.');
            } else if (connection === 'close') {
                connected = false;
                socket = null;
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`Koneksi WhatsApp terputus. Reconnect: ${shouldReconnect}`);
                if (shouldReconnect) {
                    setTimeout(() => {
                        connectToWhatsApp().catch((error) => {
                            console.error('Gagal menghubungkan ulang WhatsApp:', error);
                        });
                    }, 3000);
                }
            }
        });

        return socket;
    })();

    try {
        return await connecting;
    } finally {
        connecting = null;
    }
}

async function kirimPesan(nomorTujuan, pesan) {
    if (!connected || !socket) {
        throw new Error('WhatsApp belum terhubung.');
    }
    return socket.sendMessage(nomorTujuan, { text: pesan });
}

module.exports = { connectToWhatsApp, kirimPesan };
