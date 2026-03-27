// Send a message FROM the bot's number to any WhatsApp contact
// Used by the web dashboard "Reply via Bot" button
import { NextResponse } from 'next/server';
import { addMessage, getOrCreateConversation } from '@/lib/db';

export async function POST(req: Request) {
  const { phone, message } = await req.json();
  if (!phone || !message) {
    return NextResponse.json({ error: 'phone y message requeridos' }, { status: 400 });
  }

  // Format JID — ensure it ends with @s.whatsapp.net
  const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

  try {
    // Dynamically import to avoid loading Baileys in the Next.js server at build time
    const { sendBotMessage } = await import('@/whatsapp-bot');
    const sent = await sendBotMessage(jid, message);

    if (!sent) {
      return NextResponse.json(
        { error: 'Bot de WhatsApp no está conectado. Inicia rental-whatsapp en PM2.' },
        { status: 503 }
      );
    }

    // Log the sent message in the conversation
    const conv = getOrCreateConversation('whatsapp', jid);
    addMessage(conv.id, 'assistant', message);

    return NextResponse.json({ ok: true, jid });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
