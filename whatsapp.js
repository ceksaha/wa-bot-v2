const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleIncomingMessage } = require('./botEngine');
const { notifyPairingCode } = require('./socket');
const Setting = require('../models/setting');

const logger = pino({ level: 'silent' });

let sock;
let lastPairingCode = null;

async function startWhatsApp() {
    console.log('Initializing WhatsApp connection...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    let version = [2, 3000, 1015901307];
    try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
    } catch (e) {}

    let pairingNumber = process.env.PAIRING_NUMBER;
    if (!pairingNumber) {
        try {
            const botSetting = await Setting.findOne({ key: 'bot_number' });
            if (botSetting && botSetting.value) {
                pairingNumber = botSetting.value;
            }
        } catch (e) {}
    }

    sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        browser: ['Ubuntu', 'Chrome', '20.0.0.4'],
        syncFullHistory: false,
        printQRInTerminal: false,
        generateHighQualityQR: true,
        shouldIgnoreJid: jid => isJidBroadcast(jid)
    });

    if (pairingNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(pairingNumber.replace(/\D/g, ''));
                console.log('🔗 WHATSAPP PAIRING CODE:', code);
                lastPairingCode = code;
                notifyPairingCode(code);

            } catch (err) {
                console.error('❌ Gagal menjana Pairing Code:', err.message);
            }
        }, 5000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected Successfully!');
            lastPairingCode = null;
            notifyPairingCode(null);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;
            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            if (text) {
                try {
                    const reply = await handleIncomingMessage(from, text);
                    if (reply) await sock.sendMessage(from, { text: reply });
                } catch (error) {
                    console.error('❌ Error processing message:', error);
                }
            }
        }
    });

    return sock;
}

const sendWhatsAppMessage = async (from, text) => {
    if (!sock) return;
    try { 
        const jid = from.includes('@') ? from : from.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text }); 
    } catch (e) {
        console.error('❌ Gagal mengirim pesan:', e.message);
    }
};

module.exports = { startWhatsApp, sendWhatsAppMessage, getPairingCode: () => lastPairingCode };
