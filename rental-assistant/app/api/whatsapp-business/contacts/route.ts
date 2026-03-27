import { NextResponse } from 'next/server';
import { getWAContacts, updateWAContactLabels, upsertWAContact } from '@/lib/db';

export async function GET() {
  const contacts = getWAContacts();
  return NextResponse.json(contacts.map(c => ({
    ...c,
    labels: JSON.parse(c.labels || '[]'),
  })));
}

// Add a new contact manually
export async function POST(req: Request) {
  const { jid, name, phone } = await req.json();
  if (!jid) return NextResponse.json({ error: 'jid requerido' }, { status: 400 });
  upsertWAContact({ jid, name, phone, pushName: undefined, isBlocked: 0, labels: '[]', lastSeen: undefined });
  return NextResponse.json({ ok: true });
}

// Update contact labels
export async function PATCH(req: Request) {
  const { jid, labels } = await req.json();
  if (!jid || !Array.isArray(labels)) {
    return NextResponse.json({ error: 'jid y labels requeridos' }, { status: 400 });
  }
  updateWAContactLabels(jid, labels);
  return NextResponse.json({ ok: true });
}
