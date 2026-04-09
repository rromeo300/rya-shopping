import { NextResponse } from 'next/server';
import { getWALabels, upsertWALabel } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getWALabels());
}

// Create or update a label
export async function POST(req: Request) {
  const { id, name, color } = await req.json();
  if (!id || !name) return NextResponse.json({ error: 'id y name requeridos' }, { status: 400 });
  upsertWALabel({ id, name, color: color ?? 0, predefinedId: undefined });
  return NextResponse.json({ ok: true });
}
