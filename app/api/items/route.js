import { getItems, saveAllItems } from '../../../lib/sheets.js';
import { sendPushToAll, sendPushTo } from '../../../lib/push.js';
import { NextResponse } from 'next/server';

const CAT_EMOJI = { compras:'🛒', tareas:'✅', casa:'🏡', recados:'🚗', otros:'📦' };

export async function GET() {
  try {
    const items = await getItems();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { item } = await req.json();
    const items = await getItems();
    items.unshift(item);
    await saveAllItems(items);

    const emoji = CAT_EMOJI[item.cat] || '📋';
    const notifyPayload = {
      title: `${emoji} Nueva tarea`,
      body: `${item.createdBy} añadió: "${item.text}"`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: '/' },
    };

    if (item.assignedTo) {
      await sendPushTo(item.assignedTo, {
        ...notifyPayload,
        title: `${emoji} Te lo toca a ti`,
        body: `${item.createdBy} te asignó: "${item.text}"`,
      });
    } else {
      await sendPushToAll(item.createdBy, notifyPayload);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, updates, actor, nudge } = await req.json();
    const items = await getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const item = { ...items[idx], ...updates };
    items[idx] = item;
    await saveAllItems(items);

    const emoji = CAT_EMOJI[item.cat] || '📋';

    if (nudge) {
      // "Hazlo tú" button — notify the assignee
      const target = item.assignedTo || (actor === 'Silvia' ? 'Sergio' : 'Silvia');
      await sendPushTo(target, {
        title: `👋 ¡Oye! Toca hacer esto`,
        body: `${actor} te recuerda: "${item.text}"`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: '/' },
        requireInteraction: true,
      });
    } else if (updates.done !== undefined) {
      await sendPushToAll(actor, {
        title: updates.done ? `${emoji} Tarea completada` : `${emoji} Tarea reabierta`,
        body: updates.done
          ? `${actor} completó: "${item.text}"`
          : `${actor} reactivó: "${item.text}"`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: '/' },
      });
    } else if (updates.assignedTo !== undefined) {
      await sendPushTo(updates.assignedTo, {
        title: `${emoji} Te asignaron una tarea`,
        body: `${actor} te asignó: "${item.text}"`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: '/' },
        requireInteraction: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    const items = await getItems();
    const filtered = items.filter(i => i.id !== id);
    await saveAllItems(filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
