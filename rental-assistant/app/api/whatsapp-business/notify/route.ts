// Internal endpoint called by whatsapp-observer to push updates to SSE clients
import { NextResponse } from 'next/server';
import { notifyClients } from '../events/route';

export async function POST(req: Request) {
  const header = req.headers.get('x-internal');
  if (header !== 'observer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { event, data } = await req.json();
  notifyClients(event, data);
  return NextResponse.json({ ok: true });
}
