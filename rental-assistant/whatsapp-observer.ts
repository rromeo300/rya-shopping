// WhatsApp Business Observer
// READ-ONLY mode — never sends messages to avoid ban risk
// Syncs contacts, conversations, labels to local SQLite DB
// Web dashboard at http://localhost:3000/whatsapp-business
import fs from 'fs';
import path from 'path';

// Load .env.local so PM2 always finds credentials
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
  isJidGroup,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import {
  upsertWAContact,
  upsertWALabel,
  upsertWAConversation,
  insertWAMessage,
  updateWAConversationLabels,
  updateWAContactLabels,
  archiveWAConversation,
  getWAConversations,
  getWAStats,
  getWALabels,
} from './lib/db';

// Push real-time update to all open browser tabs via SSE
// We call the Next.js API endpoint via HTTP (observer runs in a separate process)
async function pushUpdate(event: string, data: unknown) {
  try {
    await fetch('http://localhost:3000/api/whatsapp-business/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal': 'observer' },
      body: JSON.stringify({ event, data }),
    });
  } catch { /* Next.js might not be running yet */ }
}

const SESSION_DIR = path.join(process.cwd(), 'data', 'whatsapp-business-session');

function jidToPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

async function startObserver() {
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
    syncFullHistory: true,
    logger: {
      level: 'silent',
      trace: () => {}, debug: () => {}, info: () => {},
      warn: (msg: string) => console.warn('[WA-OBS]', msg),
      error: (msg: string) => console.error('[WA-OBS]', msg),
      fatal: (msg: string) => console.error('[WA-OBS FATAL]', msg),
      child: () => ({
        level: 'silent',
        trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as never),
      }),
    } as never,
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Connection status ──────────────────────────────────────
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 ESCANEA EL CÓDIGO QR CON TU WHATSAPP BUSINESS:');
      console.log('   WhatsApp → Dispositivos vinculados → Vincular dispositivo\n');
    }
    if (connection === 'close') {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`🔴 Desconectado (código ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(startObserver, 5000);
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Business Observer conectado');
      console.log('👁  Modo solo lectura + organización activo');
    }
  });

  // ── Sync contacts ──────────────────────────────────────────
  sock.ev.on('contacts.update', (contacts) => {
    for (const c of contacts) {
      if (!c.id) continue;
      upsertWAContact({
        jid: c.id,
        name: c.name ?? c.notify,
        phone: isJidGroup(c.id) ? undefined : jidToPhone(c.id),
        pushName: c.notify,
        isBlocked: 0,
        labels: '[]',
        lastSeen: undefined,
      });
    }
    console.log(`📒 Contactos sincronizados: ${contacts.length}`);
  });

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      upsertWAContact({
        jid: c.id,
        name: c.name ?? c.notify,
        phone: isJidGroup(c.id) ? undefined : jidToPhone(c.id),
        pushName: c.notify,
        isBlocked: 0,
        labels: '[]',
        lastSeen: undefined,
      });
    }
  });

  // ── Sync labels (WhatsApp Business feature) ────────────────
  sock.ev.on('labels.edit', (label) => {
    upsertWALabel({
      id: label.id,
      name: label.name,
      color: label.color ?? 0,
      predefinedId: label.predefinedId ?? undefined,
    });
    console.log(`🏷  Etiqueta actualizada: ${label.name}`);
  });

  sock.ev.on('label.association', ({ type, association }) => {
    // Update labels on contact or conversation
    console.log(`🏷  Label association: ${type} → ${association.labelId} on ${association.jid}`);
  });

  // ── Sync chats/conversations ───────────────────────────────
  sock.ev.on('chats.upsert', (chats) => {
    for (const chat of chats) {
      upsertWAConversation({
        jid: chat.id,
        name: chat.name,
        unreadCount: chat.unreadCount ?? 0,
        lastMessage: undefined,
        lastMessageTime: chat.conversationTimestamp
          ? new Date(Number(chat.conversationTimestamp) * 1000).toISOString()
          : undefined,
        labels: JSON.stringify(chat.labels ?? []),
        archived: chat.archived ? 1 : 0,
        pinned: chat.pinned ? 1 : 0,
      });
    }
  });

  sock.ev.on('chats.update', (updates) => {
    for (const update of updates) {
      if (!update.id) continue;
      upsertWAConversation({
        jid: update.id,
        name: update.name,
        unreadCount: update.unreadCount ?? 0,
        lastMessage: undefined,
        lastMessageTime: update.conversationTimestamp
          ? new Date(Number(update.conversationTimestamp) * 1000).toISOString()
          : undefined,
        labels: JSON.stringify(update.labels ?? []),
        archived: update.archived ? 1 : 0,
        pinned: update.pinned ? 1 : 0,
      });

      if (update.archive !== undefined) {
        archiveWAConversation(update.id, update.archive);
        console.log(`📁 Chat ${update.archive ? 'archivado' : 'desarchivado'}: ${update.id}`);
      }
    }
  });

  // ── Sync messages (read only) ──────────────────────────────
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid!;
      const content =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '[media]';

      const timestamp = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      insertWAMessage({
        id: msg.key.id!,
        jid,
        content,
        fromMe: msg.key.fromMe ? 1 : 0,
        senderName: msg.pushName ?? undefined,
        timestamp,
        type: Object.keys(msg.message)[0] ?? 'text',
      });

      // Update conversation last message
      upsertWAConversation({
        jid,
        name: undefined,
        unreadCount: 0,
        lastMessage: content,
        lastMessageTime: timestamp,
        labels: '[]',
        archived: 0,
        pinned: 0,
      });

      // Push real-time update to open browser tabs
      pushUpdate('new_message', {
        jid,
        content,
        fromMe: msg.key.fromMe,
        senderName: msg.pushName,
        timestamp,
        stats: getWAStats(),
      });
    }
  });

  console.log('👁  WhatsApp Business Observer iniciando...');
  return sock;
}

// Export sock for use by API routes (label/archive operations)
let activeSock: Awaited<ReturnType<typeof makeWASocket>> | null = null;

startObserver().then(sock => {
  activeSock = sock;
}).catch(console.error);

export function getSock() { return activeSock; }
