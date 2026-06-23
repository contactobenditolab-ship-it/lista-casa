import { NextResponse } from 'next/server';
import { saveSubscription } from '../../../lib/sheets.js';

export async function POST(req) {
  try {
    const { user, subscription } = await req.json();
    if (!user || !subscription) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    await saveSubscription(user, subscription);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
