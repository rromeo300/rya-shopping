import { NextResponse } from 'next/server';
import { getWAConversations, updateWAConversationLabels, archiveWAConversation, getWAStats } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get('archived') === 'true';
  const stats = searchParams.get('stats') === 'true';

  if (stats) return NextResponse.json(getWAStats());

  const conversations = getWAConversations(archived);
  return NextResponse.json(conversations.map(c => ({
    ...c,
    labels: JSON.parse(c.labels || '[]'),
    archived: c.archived === 1,
    pinned: c.pinned === 1,
  })));
}

// Update labels or archive status of a conversation
export async function PATCH(req: Request) {
  const body = await req.json();
  const { jid, labels, archived } = body;

  if (!jid) return NextResponse.json({ error: 'jid requerido' }, { status: 400 });

  if (Array.isArray(labels)) {
    updateWAConversationLabels(jid, labels);
  }
  if (typeof archived === 'boolean') {
    archiveWAConversation(jid, archived);
  }

  return NextResponse.json({ ok: true });
}
