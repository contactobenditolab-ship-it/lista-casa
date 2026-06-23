// Backend via Apps Script REST API
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export async function getItems() {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getItems`);
  const data = await res.json();
  return data.items || [];
}

export async function saveItem(item) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addItem', item }),
  });
  return res.json();
}

export async function updateItem(id, updates) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateItem', id, updates }),
  });
  return res.json();
}

export async function deleteItem(id) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteItem', id }),
  });
  return res.json();
}

export async function getSubscriptions() {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getSubscriptions`);
  const data = await res.json();
  return data.subscriptions || [];
}

export async function saveSubscription(user, subscription) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveSubscription', user, subscription }),
  });
  return res.json();
}
