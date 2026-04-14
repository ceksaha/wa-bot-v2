const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const { handleIncomingMessage } = require('./botEngine');
const { notifyPairingCode } = require('./socket');
const Tenant = require('../models/tenant');

const logger = pino({ level: 'silent' });
const sessions = new Map(); // tenantId -> sock
const pairingCodes = new Map(); // tenantId -> code

/**
 * Initialize all tenant WhatsApp sessions
 */
async function startWhatsApp() {
    console.log('🚀 Loading Multi-Tenant WhatsApp Manager...');
    const tenants = await Tenant.findAll();
    
    for (const tenant of tenants) {
        // Skip tenants without a bot number
        if (!tenant.bot_number || tenant.bot_number.length < 8) {
            console.log(`[UMKM-${tenant.id}] Skipping: No valid bot number.`);
            continue;
        }
        await startSession(tenant);
    }
}

/**
 * Start a specific WhatsApp session for a UMKM
 */
async function startSession(tenant) {
    const tenantId = tenant.id;
    const pairingNumber = tenant.bot_number;

    console.log(`[UMKM-${tenantId}] Initializing session...`);
    
    const authPath = path.join(__dirname, `../../../sessions/tenant_${tenantId}`);
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        // Use a more standard browser string
        browser: ['Ubuntu', 'Chrome', '114.0.5735.199'],
        syncFullHistory: false,
        printQRInTerminal: false,
        shouldIgnoreJid: jid => isJidBroadcast(jid)
    });

    sessions.set(tenantId, sock);

    // Pairing Logic
    if (pairingNumber && !sock.authState.creds.registered) {
        console.log(`[UMKM-${tenantId}] Requesting code for ${pairingNumber} in 10s...`);
        setTimeout(async () => {
            try {
                // Double check if still not registered before requesting
                if (sock.authState.creds.registered) return;
                
                const code = await sock.requestPairingCode(pairingNumber.replace(/\D/g, ''));
                console.log(`🔗 [UMKM-${tenantId}] NEW PAIRING CODE: ${code}`);
                pairingCodes.set(tenantId, code);
                notifyPairingCode(tenantId, code);
            } catch (err) {
                console.error(`[UMKM-${tenantId}] Pairing request error:`, err.message);
            }
        }, 10000); // 10 seconds delay
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startSession(tenant);
        } else if (connection === 'open') {
            console.log(`✅ [UMKM-${tenantId}] Connected Successfully!`);
            pairingCodes.delete(tenantId);
            notifyPairingCode(tenantId, null);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;
            
            const from = msg.key.remoteJid;
            
            // IGNORE GROUP MESSAGES (@g.us)
            if (from.endsWith('@g.us')) continue;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            
            if (text) {
                try {
                    const reply = await handleIncomingMessage(from, text, tenantId);
                    if (reply) await sock.sendMessage(from, { text: reply });
                } catch (error) {
                    console.error(`[UMKM-${tenantId}] Bot error:`, error);
                }
            }
        }
    });
}

const sendWhatsAppMessage = async (tenantId, from, text) => {
    const sock = sessions.get(tenantId);
    if (!sock) return;
    try { 
        const jid = from.includes('@') ? from : from.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text }); 
    } catch (e) {
        console.error(`[UMKM-${tenantId}] Gagal mengirim pesan:`, e.message);
    }
};

const getPairingCode = (tenantId) => {
    return pairingCodes.get(tenantId) || null;
};

module.exports = { startWhatsApp, sendWhatsAppMessage, startSession, getPairingCode };
