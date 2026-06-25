import webpush from 'web-push';
import { getSubscriptions } from './sheets.js';

let initialized = false;
function initVapid() {
  if (initialized) return;
  webpush.setVapidDetails(
    'mailto:contacto@benditolab.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  initialized = true;
}

export async function sendPushTo(targetUser, payload) {
  initVapid();
  const subs = await getSubscriptions();
  console.log(`[push] total subs en Sheet: ${subs.length}, buscando user="${targetUser}"`);
  console.log(`[push] usuarios en Sheet: ${subs.map(s=>s.user).join(', ')}`);
  const userSubs = subs.filter(s => s.user === targetUser);
  console.log(`[push] subs encontradas para ${targetUser}: ${userSubs.length}`);

  const results = await Promise.allSettled(
    userSubs.map(s =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload))
        .then(r => ({ ok: true, status: r.statusCode }))
        .catch(e => ({ ok: false, error: e.message, status: e.statusCode }))
    )
  );
  results.forEach((r, i) => console.log(`[push] sub[${i}] result:`, JSON.stringify(r.value || r.reason)));
  return results;
}

export async function sendPushToAll(exceptUser, payload) {
  initVapid();
  const subs = await getSubscriptions();
  const targets = exceptUser ? subs.filter(s => s.user !== exceptUser) : subs;
  await Promise.allSettled(
    targets.map(s =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch(() => {})
    )
  );
}
