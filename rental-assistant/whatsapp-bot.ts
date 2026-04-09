// WhatsApp Bot — client-facing assistant
// Responds to guest/tenant queries, handles check-in/check-out
// Sends messages from its OWN number (not the owner's personal WA)
import fs from 'fs';
import path from 'path';

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

const SESSION_DIR = path.join(process.cwd(), 'data', 'whatsapp-bot-session');

// Export sock so API routes can call sendMessage
let activeSock: ReturnType<typeof makeWASocket> | null = null;
export function getBotSock() { return activeSock; }

// Send a message to any JID from the bot's number (used by web dashboard)
export async function sendBotMessage(jid: string, text: string): Promise<boolean> {
  if (!activeSock) return false;
  try {
    await activeSock.sendMessage(jid, { text });
    return true;
  } catch {
    return false;
  }
}

async function startBot() {
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
      trace: () => {}, debug: () => {}, info: () => {},
      warn: (msg: string) => console.warn('[WA-BOT]', msg),
      error: (msg: string) => console.error('[WA-BOT]', msg),
      fatal: (msg: string) => console.error('[WA-BOT FATAL]', msg),
      child: () => ({
        level: 'silent',
        trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as never),
      }),
    } as never,
  });

  activeSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 ESCANEA EL QR CON EL NÚMERO DEL BOT (número dedicado):');
      console.log('   Este es el número que responde a tus clientes\n');
    }
    if (connection === 'close') {
      activeSock = null;
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reconnect = code !== DisconnectReason.loggedOut;
      console.log(`🔴 Bot desconectado (${code}). Reconectando: ${reconnect}`);
      if (reconnect) setTimeout(startBot, 5000);
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot de clientes conectado y listo');
    }
  });

  // ── Handle incoming messages ────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || '';

      if (!text.trim()) continue;

      const jid = msg.key.remoteJid!;
      const senderName = msg.pushName ?? 'Cliente';

      console.log(`[${new Date().toLocaleTimeString()}] ${senderName} (${jid}): ${text}`);

      try {
        await sock.sendPresenceUpdate('composing', jid);

        const conversation = getOrCreateConversation('whatsapp', jid);
        addMessage(conversation.id, 'user', `[${senderName}]: ${text}`);

        const response = await chat(
          `Mensaje de cliente ${senderName} (${jid}): ${text}`,
          conversation.id
        );

        addMessage(conversation.id, 'assistant', response);
        console.log(`[${new Date().toLocaleTimeString()}] → ${response.substring(0, 80)}...`);

        await sock.sendPresenceUpdate('paused', jid);

        // Split long messages
        if (response.length <= 4096) {
          await sock.sendMessage(jid, { text: response });
        } else {
          const chunks = response.match(/[\s\S]{1,4000}/g) ?? [response];
          for (const chunk of chunks) {
            await sock.sendMessage(jid, { text: chunk });
          }
        }
      } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(jid, {
          text: 'Lo siento, tuve un problema. Por favor intenta de nuevo en un momento.',
        });
      }
    }
  });

  console.log('🤖 WhatsApp Bot iniciando...');
  return sock;
}

startBot().catch(console.error);
