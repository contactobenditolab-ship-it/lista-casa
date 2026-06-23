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
  const userSubs = subs.filter(s => s.user === targetUser);
  await Promise.allSettled(
    userSubs.map(s =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch(() => {})
    )
  );
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
