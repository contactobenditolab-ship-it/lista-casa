import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const LISTA_SHEET = 'Lista';
const SUBS_SHEET = 'Suscripciones';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheet(sheets, name, headers) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${name}!A1`,
    });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: { requests: [{ addSheet: { properties: { title: name } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${name}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    });
  }
}

// ── ITEMS ─────────────────────────────────────────────
export async function getItems() {
  const sheets = await getSheets();
  await ensureSheet(sheets, LISTA_SHEET, ['id','text','cat','done','createdBy','createdAt','doneBy','doneAt','assignedTo']);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${LISTA_SHEET}!A2:I`,
  });
  return (res.data.values || []).map(r => ({
    id: r[0]||'', text: r[1]||'', cat: r[2]||'otros',
    done: r[3]==='true', createdBy: r[4]||'',
    createdAt: Number(r[5])||0, doneBy: r[6]||null,
    doneAt: Number(r[7])||null, assignedTo: r[8]||null,
  })).filter(r => r.id);
}

export async function saveAllItems(items) {
  const sheets = await getSheets();
  await ensureSheet(sheets, LISTA_SHEET, ['id','text','cat','done','createdBy','createdAt','doneBy','doneAt','assignedTo']);
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${LISTA_SHEET}!A2:I` });
  if (!items.length) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: `${LISTA_SHEET}!A2`,
    valueInputOption: 'RAW',
    resource: { values: items.map(i => [
      i.id, i.text, i.cat, String(i.done),
      i.createdBy||'', i.createdAt||0,
      i.doneBy||'', i.doneAt||'', i.assignedTo||'',
    ])},
  });
}

// ── SUBSCRIPTIONS ─────────────────────────────────────
export async function getSubscriptions() {
  const sheets = await getSheets();
  await ensureSheet(sheets, SUBS_SHEET, ['user','subscription']);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SUBS_SHEET}!A2:B`,
  });
  return (res.data.values || [])
    .filter(r => r[0] && r[1])
    .map(r => ({ user: r[0], subscription: JSON.parse(r[1]) }));
}

export async function saveSubscription(user, subscription) {
  const sheets = await getSheets();
  await ensureSheet(sheets, SUBS_SHEET, ['user','subscription']);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: `${SUBS_SHEET}!A2:B`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === user);
  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: `${SUBS_SHEET}!A2`,
      valueInputOption: 'RAW',
      resource: { values: [[user, JSON.stringify(subscription)]] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `${SUBS_SHEET}!A${idx+2}:B${idx+2}`,
      valueInputOption: 'RAW',
      resource: { values: [[user, JSON.stringify(subscription)]] },
    });
  }
}
