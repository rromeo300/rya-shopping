// WhatsApp bot using Baileys (no Puppeteer needed — uses WhatsApp Web protocol)
// First run: scan the QR code with your phone
// After that: stays connected automatically
import fs from 'fs';
import path from 'path';

// Load .env.local so PM2 restarts always find credentials
(function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^#=][^=]*)=(.+)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* rely on system env */ }
})();

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { getOrCreateConversation, addMessage } from './lib/db';
import { chat } from './lib/assistant';

const SESSION_DIR = path.join(process.cwd(), 'data', 'whatsapp-session');

async function startWhatsApp() {
  // Ensure session directory exists
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as never),
    },
    browser: Browsers.macOS('Desktop'),
    printQRInTerminal: true,
    logger: {
      level: 'silent',
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: (msg: string) => console.warn('[WA]', msg),
      error: (msg: string) => console.error('[WA]', msg),
      fatal: (msg: string) => console.error('[WA FATAL]', msg),
      child: () => ({
        level: 'silent',
        trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as never),
      }),
    } as never,
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
      console.log('   WhatsApp → Dispositivos vinculados → Vincular dispositivo\n');
    }
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔴 Conexión cerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado y listo para recibir mensajes');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip messages from yourself or status updates
      if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue;

      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || '';

      if (!text.trim()) continue;

      const jid = msg.key.remoteJid!;
      const senderName = msg.pushName ?? 'Usuario';

      console.log(`[${new Date().toLocaleTimeString()}] ${senderName}: ${text}`);

      try {
        // Show typing indicator
        await sock.sendPresenceUpdate('composing', jid);

        // Get or create conversation
        const conversation = getOrCreateConversation('whatsapp', jid);
        addMessage(conversation.id, 'user', text);

        // Get AI response
        const response = await chat(text, conversation.id);
        addMessage(conversation.id, 'assistant', response);

        console.log(`[${new Date().toLocaleTimeString()}] Asistente: ${response.substring(0, 80)}...`);

        // Stop typing and send response
        await sock.sendPresenceUpdate('paused', jid);
        await sock.sendMessage(jid, { text: response });

      } catch (error) {
        console.error('Error procesando mensaje:', error);
        await sock.sendMessage(jid, {
          text: 'Lo siento, ocurrió un error. Intenta de nuevo.',
        });
      }
    }
  });

  console.log('🚀 Bot de WhatsApp iniciado...');
  return sock;
}

startWhatsApp().catch(console.error);
