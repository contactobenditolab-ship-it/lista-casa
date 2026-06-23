import { NextResponse } from 'next/server';
import { sendPushTo, sendPushToAll } from '../../../lib/push.js';

export async function POST(req) {
  try {
    const { targetUser, exceptUser, payload } = await req.json();
    if (targetUser) {
      await sendPushTo(targetUser, payload);
    } else {
      await sendPushToAll(exceptUser, payload);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
