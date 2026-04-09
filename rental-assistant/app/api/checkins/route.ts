import { NextResponse } from 'next/server';
import { getCheckins, createCheckin, updateCheckin, getTodayCheckins, getTodayCheckouts } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const today = searchParams.get('today') === 'true';
  const todayOut = searchParams.get('todayCheckouts') === 'true';

  if (today) return NextResponse.json(getTodayCheckins());
  if (todayOut) return NextResponse.json(getTodayCheckouts());
  return NextResponse.json(getCheckins(status));
}

export async function POST(req: Request) {
  const data = await req.json();
  if (!data.propertyId || !data.guestName || !data.checkInDate) {
    return NextResponse.json({ error: 'propertyId, guestName y checkInDate requeridos' }, { status: 400 });
  }
  const checkin = createCheckin({ ...data, status: 'scheduled' });
  return NextResponse.json(checkin);
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const checkin = updateCheckin(id, data);
  if (!checkin) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(checkin);
}
