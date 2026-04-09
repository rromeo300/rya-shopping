import { NextResponse } from 'next/server';
import { getWAMessages } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jid = searchParams.get('jid');
  const limit = parseInt(searchParams.get('limit') ?? '50');

  if (!jid) return NextResponse.json({ error: 'jid requerido' }, { status: 400 });

  const messages = getWAMessages(jid, limit);
  return NextResponse.json(messages);
}
