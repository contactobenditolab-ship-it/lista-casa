import { getItems, saveItem, updateItem, deleteItem } from '../../../lib/sheets.js';
import { sendPushToAll, sendPushTo } from '../../../lib/push.js';
import { NextResponse } from 'next/server';

const CAT_EMOJI = { super:'🥦', compras:'🛍️', tareas:'✅', casa:'🏡', recados:'🚗', otros:'📦' };

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
    await saveItem(item);
    const emoji = CAT_EMOJI[item.cat] || '📋';
    const payload = item.assignedTo ? {
      title: `${emoji} Te toca a ti`,
      body: `${item.createdBy} te asignó: "${item.text}"`,
      icon: '/icon-192.png', badge: '/badge-72.png', data: { url: '/' }, requireInteraction: true,
    } : {
      title: `${emoji} Nueva tarea`,
      body: `${item.createdBy} añadió: "${item.text}"`,
      icon: '/icon-192.png', badge: '/badge-72.png', data: { url: '/' },
    };
    if (item.assignedTo) await sendPushTo(item.assignedTo, payload);
    else await sendPushToAll(item.createdBy, payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, updates, actor, nudge, itemSnapshot } = await req.json();

    if (!nudge || Object.keys(updates).length > 0) {
      await updateItem(id, updates);
    }

    const item = itemSnapshot || { text: '(tarea)', cat: 'otros', assignedTo: null };
    const emoji = CAT_EMOJI[item.cat] || '📋';

    if (nudge) {
      const target = item.assignedTo || (actor === 'Silvia' ? 'Sergio' : 'Silvia');
      console.log(`[nudge] actor=${actor} target=${target} item="${item.text}"`);
      const pushResult = await sendPushTo(target, {
        title: `👋 ¡Oye! Toca hacer esto`,
        body: `${actor} te recuerda: "${item.text}"`,
        icon: '/icon-192.png', badge: '/badge-72.png', data: { url: '/' }, requireInteraction: true,
      });
      console.log(`[nudge] pushResult=${JSON.stringify(pushResult)}`);
    } else if (updates.done !== undefined) {
      await sendPushToAll(actor, {
        title: updates.done ? `${emoji} Completado` : `${emoji} Reabierto`,
        body: updates.done ? `${actor} completó: "${item.text}"` : `${actor} reactivó: "${item.text}"`,
        icon: '/icon-192.png', badge: '/badge-72.png', data: { url: '/' },
      });
    } else if (updates.assignedTo) {
      await sendPushTo(updates.assignedTo, {
        title: `${emoji} Te asignaron una tarea`,
        body: `${actor} te asignó: "${item.text}"`,
        icon: '/icon-192.png', badge: '/badge-72.png', data: { url: '/' }, requireInteraction: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`[PUT error] ${e.message}`);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
