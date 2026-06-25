'use client';
import { useState, useEffect, useRef } from 'react';

const USERS = ['Silvia', 'Sergio'];
const OTHER = { Silvia: 'Sergio', Sergio: 'Silvia' };
const CATS = [
  { id: 'super',   label: '🥦 Supermercado', short: '🥦', color: '#FCD34D', bg: '#2D2004', border: '#92400E' },
  { id: 'compras', label: '🛍️ Compras',      short: '🛍️', color: '#FB923C', bg: '#2D1004', border: '#9A3412' },
  { id: 'tareas',  label: '✅ Tareas',        short: '✅', color: '#6EE7B7', bg: '#022C22', border: '#065F46' },
  { id: 'casa',    label: '🏡 Casa',          short: '🏡', color: '#93C5FD', bg: '#172554', border: '#1E40AF' },
  { id: 'recados', label: '🚗 Recados',       short: '🚗', color: '#FCA5A5', bg: '#2D0A0A', border: '#991B1B' },
  { id: 'otros',   label: '📦 Otros',         short: '📦', color: '#C4B5FD', bg: '#1E1040', border: '#5B21B6' },
];
const catMap = Object.fromEntries(CATS.map(c => [c.id, c]));
const USER_COLOR = { Silvia: '#C084FC', Sergio: '#60A5FA' };
const USER_BG    = { Silvia: '#2D1347', Sergio: '#0F2847' };

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0D0D0F;--bg2:#141416;--sf:#1C1C1F;--sf2:#242428;
    --bd:#2A2A2F;--bd2:#333338;--tx:#F2F2F7;--tx2:#AEAEB2;--tx3:#636366;
    --accent:#6EE7B7;--r:16px;
  }
  html,body{height:100%;background:var(--bg)}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--tx);
    padding-bottom:90px;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}

  /* HEADER */
  header{background:rgba(13,13,15,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border-bottom:1px solid var(--bd);padding:14px 16px 0;
    padding-top:calc(env(safe-area-inset-top,0px) + 14px);position:sticky;top:0;z-index:50}
  .hr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  h1{font-size:20px;font-weight:700;letter-spacing:-.5px}
  .ubtn{display:flex;align-items:center;gap:6px;padding:7px 13px;border-radius:20px;border:none;
    font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}

  /* TABS */
  .tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding-bottom:12px}
  .tabs::-webkit-scrollbar{display:none}
  .tab{flex-shrink:0;padding:7px 15px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;
    border:1px solid transparent;background:transparent;color:var(--tx3);transition:all .15s}
  .tab.active{color:var(--tx);font-weight:700;background:var(--sf2);border-color:var(--bd2)}

  /* MAIN */
  main{padding:14px 14px 0}

  /* ADD ROW — simple, sin caja */
  .add-row{display:flex;gap:8px;margin-bottom:16px;align-items:center}
  .add-wrap{flex:1;position:relative;display:flex;align-items:center}
  .cat-indicator{position:absolute;left:12px;font-size:16px;pointer-events:none;line-height:1}
  input[type=text]{flex:1;width:100%;padding:13px 14px 13px 38px;border:1px solid var(--bd2);border-radius:14px;
    font-size:16px;background:var(--sf);color:var(--tx);outline:none;
    -webkit-appearance:none;transition:border-color .15s}
  input[type=text]:focus{border-color:var(--accent)}
  input[type=text]::placeholder{color:var(--tx3)}
  .btn-add{width:48px;height:48px;background:var(--accent);color:#022C22;border:none;
    border-radius:14px;font-size:24px;font-weight:800;cursor:pointer;flex-shrink:0;
    display:flex;align-items:center;justify-content:center}
  .btn-add:active{opacity:.8;transform:scale(.94)}

  /* SUPERMERCADO */
  .super-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .super-title{font-size:12px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px}
  .copy-btn{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:20px;
    border:1px solid var(--bd2);background:var(--sf);color:var(--tx2);
    font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
  .copy-btn.copied{border-color:#065F46;color:#6EE7B7;background:#022C22}
  .super-list{background:var(--sf);border-radius:var(--r);border:1px solid var(--bd);overflow:hidden}
  .super-item{display:flex;align-items:center;gap:13px;padding:15px 14px;
    cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .1s}
  .super-item:active{background:var(--sf2)}
  .super-cb{width:26px;height:26px;border-radius:7px;border:2px solid var(--bd2);flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
    color:transparent;transition:all .15s}
  .super-item.done-s .super-cb{background:var(--accent);border-color:var(--accent);color:#022C22}
  .super-text{font-size:16px;font-weight:400;flex:1;line-height:1.3}
  .super-item.done-s .super-text{text-decoration:line-through;color:var(--tx3)}
  .super-del{background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;
    padding:4px 2px;line-height:1;flex-shrink:0}
  .super-sep{height:1px;background:var(--bd);margin:0 14px}

  /* CARDS NORMALES */
  .sec-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
    color:var(--tx3);padding:2px 2px 10px}
  .list{display:flex;flex-direction:column;gap:1px;background:var(--sf);
    border-radius:var(--r);border:1px solid var(--bd);overflow:hidden;margin-bottom:8px}
  .card{padding:13px 14px;display:flex;align-items:center;gap:12px;
    position:relative;cursor:pointer;transition:background .1s;background:var(--sf)}
  .card:active{background:var(--sf2)}
  .card-sep{height:1px;background:var(--bd);margin:0 14px}
  .check{width:24px;height:24px;border-radius:50%;border:2px solid var(--bd2);background:transparent;
    cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;
    font-size:12px;color:transparent;transition:all .15s}
  .check:active{transform:scale(.85)}
  .card.done .check{background:var(--accent);border-color:var(--accent);color:#022C22;font-weight:700}
  .card-body{flex:1;min-width:0}
  .itext{font-size:15px;font-weight:500;line-height:1.35;word-break:break-word}
  .card.done .itext{text-decoration:line-through;color:var(--tx3)}
  .imeta{font-size:11px;color:var(--tx3);margin-top:3px;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
  .cat-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .assigned-pill{font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;border:1px solid}
  .chevron{color:var(--tx3);font-size:12px;flex-shrink:0;transition:transform .2s}
  .chevron.open{transform:rotate(90deg)}

  /* CARD EXPANDIDA */
  .card-actions{padding:0 14px 13px 50px;display:flex;gap:8px;flex-wrap:wrap;background:var(--sf)}
  .nudge-btn{padding:7px 13px;border-radius:10px;border:1px solid #92400E;background:#2D1A04;
    color:#FCD34D;font-size:12px;font-weight:700;cursor:pointer}
  .nudge-btn:active{opacity:.7}
  .nudge-btn.loading{opacity:.4;pointer-events:none}
  .assign-btn{padding:7px 13px;border-radius:10px;border:1px solid var(--bd2);
    background:var(--sf2);color:var(--tx2);font-size:12px;font-weight:600;cursor:pointer}
  .del-btn{padding:7px 13px;border-radius:10px;border:1px solid #7F1D1D;
    background:#1C0A0A;color:#FCA5A5;font-size:12px;font-weight:600;cursor:pointer;margin-left:auto}

  /* ASSIGN PICKER */
  .assign-row{padding:0 14px 13px 50px;display:flex;gap:6px;flex-wrap:wrap;background:var(--sf)}
  .aopt{padding:6px 13px;border-radius:10px;border:1px solid var(--bd2);background:var(--sf2);
    color:var(--tx2);font-size:12px;font-weight:600;cursor:pointer}
  .aopt.active-silvia{border-color:#9333EA;color:#C084FC;background:#2D1347}
  .aopt.active-sergio{border-color:#2563EB;color:#60A5FA;background:#0F2847}

  /* DONE TOGGLE */
  .done-toggle{display:flex;align-items:center;gap:7px;padding:14px 2px 10px;cursor:pointer;
    color:var(--tx3);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;user-select:none}

  /* EMPTY / LOADING */
  .empty{text-align:center;padding:50px 20px;color:var(--tx3)}
  .empty-icon{font-size:42px;margin-bottom:10px}
  .empty-txt{font-size:15px;font-weight:500}
  .loading-state{text-align:center;padding:70px 20px;color:var(--tx3)}
  .spinner{width:28px;height:28px;border:2px solid var(--bd2);border-top-color:var(--accent);
    border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* TOAST */
  .toast{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);
    left:50%;transform:translateX(-50%);background:var(--sf2);color:var(--tx);
    border:1px solid var(--bd2);padding:10px 20px;border-radius:20px;
    font-size:13px;font-weight:600;z-index:200;pointer-events:none;white-space:nowrap;
    animation:toastIn .2s ease}
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

  /* MODAL */
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:300;
    display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
  .modal{background:var(--sf);border-radius:24px 24px 0 0;border-top:1px solid var(--bd);
    padding:24px 20px calc(env(safe-area-inset-bottom,0px) + 28px);width:100%;max-width:480px}
  .modal-handle{width:36px;height:4px;background:var(--bd2);border-radius:2px;margin:0 auto 20px}
  .modal h2{font-size:18px;font-weight:700;margin-bottom:16px}
  .user-opts{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
  .uopt{padding:15px 16px;border-radius:14px;border:1px solid;font-size:16px;font-weight:600;
    cursor:pointer;display:flex;align-items:center;gap:14px;background:transparent}
  .uavatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}
  .modal-divider{height:1px;background:var(--bd);margin:4px 0 16px}
  .modal-action{width:100%;padding:13px;border-radius:12px;border:1px solid var(--bd2);
    background:var(--sf2);color:var(--tx2);font-size:14px;font-weight:600;cursor:pointer;
    display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .modal-action.active{border-color:#065F46;color:#6EE7B7;background:#022C22}
`;

export default function Home() {
  const [user, setUser]         = useState(null);
  const [items, setItems]       = useState(() => {
    try { const c = typeof window !== 'undefined' && localStorage.getItem('listaCasa_cache'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [filter, setFilter]     = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listaCasa_filter')) || 'super');
  const [inputVal, setInputVal] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [loading, setLoading]   = useState(() => {
    try { return !(typeof window !== 'undefined' && localStorage.getItem('listaCasa_cache')); } catch { return true; }
  });
  const [showModal, setShowModal]   = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [nudging, setNudging]       = useState(null);
  const [copied, setCopied]         = useState(false);
  const syncTimer = useRef(null);
  const inputRef  = useRef(null);

  // La categoría a añadir = pestaña activa (si es "todos" → "otros")
  const addCat = filter === 'todos' ? 'otros' : filter;
  const activeCat = catMap[addCat] || catMap['otros'];

  useEffect(() => {
    const saved = localStorage.getItem('listaCasa_user');
    if (saved) setUser(saved); else setShowModal(true);
    fetchItems();
    const iv = setInterval(() => fetchItems(true), 12000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { if (user) checkPushStatus(); }, [user]);

  async function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setPushEnabled(!!sub);
  }

  async function togglePush() {
    if (pushEnabled) return;
    if (!user) { setShowModal(true); return; }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { flash('Permiso denegado'); return; }
      const { publicKey } = await fetch('/api/vapid-key').then(r => r.json());
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, subscription: sub.toJSON() }),
      });
      setPushEnabled(true);
      flash('🔔 Notificaciones activadas');
    } catch (e) { flash('Error: ' + e.message); }
  }

  function urlBase64ToUint8Array(b64) {
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
  }

  async function fetchItems(silent = false) {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        try { localStorage.setItem('listaCasa_cache', JSON.stringify(data.items)); } catch {}
      }
      if (!silent) setLoading(false);
    } catch { if (!silent) setLoading(false); }
  }

  function flash(msg) {
    setSyncMsg(msg);
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setSyncMsg(''), 2800);
  }

  function updateCache(updater) {
    try {
      const cached = localStorage.getItem('listaCasa_cache');
      if (!cached) return;
      localStorage.setItem('listaCasa_cache', JSON.stringify(updater(JSON.parse(cached))));
    } catch {}
  }

  function selectUser(name) {
    setUser(name);
    localStorage.setItem('listaCasa_user', name);
    setShowModal(false);
  }

  async function addItem() {
    const text = inputVal.trim();
    if (!text) { inputRef.current?.focus(); return; }
    if (!user) { setShowModal(true); return; }
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      text, cat: addCat, done: false,
      createdBy: user, createdAt: Date.now(),
      doneBy: null, doneAt: null, assignedTo: null,
    };
    setItems(prev => [item, ...prev]);
    updateCache(prev => [item, ...prev]);
    setInputVal('');
    inputRef.current?.focus();
    flash('Añadido ✓');
    try {
      const res = await fetch('/api/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        updateCache(prev => prev.filter(i => i.id !== item.id));
        setInputVal(text);
        flash('❌ Error al guardar');
      }
    } catch {
      setItems(prev => prev.filter(i => i.id !== item.id));
      updateCache(prev => prev.filter(i => i.id !== item.id));
      setInputVal(text);
      flash('❌ Sin conexión');
    }
  }

  async function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updates = { done: !item.done, doneBy: !item.done ? user : null, doneAt: !item.done ? Date.now() : null };
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    updateCache(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    flash(updates.done ? '✓ Hecho' : 'Deshecho');
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates, actor: user, itemSnapshot: item }),
    });
  }

  async function nudgeItem(id) {
    const item = items.find(i => i.id === id);
    if (!item || !user) return;
    setNudging(id);
    const target = item.assignedTo || OTHER[user];
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: {}, actor: user, nudge: true, itemSnapshot: item }),
    });
    setNudging(null);
    flash(`📣 ¡${target} avisado/a!`);
  }

  async function assignItem(id, target) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, assignedTo: target || null } : i));
    updateCache(prev => prev.map(i => i.id === id ? { ...i, assignedTo: target || null } : i));
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: { assignedTo: target || null }, actor: user, itemSnapshot: items.find(i => i.id === id) }),
    });
  }

  async function deleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    updateCache(prev => prev.filter(i => i.id !== id));
    await fetch('/api/items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    flash('Eliminado');
  }

  function copyList() {
    const superItems = items.filter(i => i.cat === 'super' && !i.done);
    if (!superItems.length) { flash('La lista está vacía'); return; }
    const text = superItems.map(i => `• ${i.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); flash('📋 Lista copiada');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => flash('Error al copiar'));
  }

  const catItems = filter === 'todos' ? items : items.filter(i => i.cat === filter);
  const isSuper  = filter === 'super';
  const pending  = catItems.filter(i => !i.done);
  const done     = catItems.filter(i => i.done);

  return (
    <>
      <style>{CSS}</style>

      {/* MODAL */}
      {showModal && (
        <div className="overlay" onClick={() => user && setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <h2>¿Quién eres?</h2>
            <div className="user-opts">
              {USERS.map(u => (
                <button key={u} className="uopt"
                  style={{ borderColor: USER_COLOR[u]+'55', color: USER_COLOR[u] }}
                  onClick={() => selectUser(u)}>
                  <div className="uavatar" style={{ background: USER_BG[u], color: USER_COLOR[u] }}>{u[0]}</div>
                  {u}
                </button>
              ))}
            </div>
            <div className="modal-divider"/>
            <button className={`modal-action${pushEnabled ? ' active' : ''}`} onClick={() => { togglePush(); setShowModal(false); }}>
              <span>{pushEnabled ? '🔔' : '🔕'}</span>
              {pushEnabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="hr">
          <h1>🏠 Lista Casa</h1>
          {user ? (
            <button className="ubtn" onClick={() => setShowModal(true)}
              style={{ background: USER_BG[user], color: USER_COLOR[user] }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:USER_COLOR[user],display:'inline-block' }}/>
              {user}
            </button>
          ) : (
            <button className="ubtn" onClick={() => setShowModal(true)}
              style={{ background:'var(--sf2)', color:'var(--tx2)', border:'1px solid var(--bd2)' }}>
              Elegir
            </button>
          )}
        </div>
        <div className="tabs">
          {[{id:'todos',label:'Todos',short:'Todos'}, ...CATS].map(c => (
            <button key={c.id} className={`tab${filter===c.id?' active':''}`}
              onClick={() => { setFilter(c.id); localStorage.setItem('listaCasa_filter', c.id); }}
              style={filter===c.id && c.color ? {color:c.color,borderColor:c.border+'88',background:c.bg} : {}}>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <main>
        {/* INPUT — categoría automática según pestaña */}
        <div className="add-row">
          <div className="add-wrap">
            <span className="cat-indicator">{activeCat.short}</span>
            <input ref={inputRef} type="text"
              placeholder={`Añadir en ${activeCat.label.split(' ').slice(1).join(' ')}…`}
              value={inputVal} onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addItem()} />
          </div>
          <button className="btn-add" onClick={addItem}>+</button>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner"/>Cargando…</div>
        ) : isSuper ? (
          /* ── SUPERMERCADO ── */
          <>
            <div className="super-header">
              <span className="super-title">🛒 {pending.length} pendiente{pending.length!==1?'s':''}</span>
              <button className={`copy-btn${copied?' copied':''}`} onClick={copyList}>
                {copied ? '✓ Copiado' : '📋 Copiar lista'}
              </button>
            </div>
            {pending.length === 0 ? (
              <div className="empty"><div className="empty-icon">🎉</div><div className="empty-txt">¡Lista vacía!</div></div>
            ) : (
              <div className="super-list">
                {pending.map((item, idx) => (
                  <div key={item.id}>
                    <div className="super-item" onClick={() => toggleItem(item.id)}>
                      <div className="super-cb">✓</div>
                      <span className="super-text">{item.text}</span>
                      <button className="super-del" onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>✕</button>
                    </div>
                    {idx < pending.length-1 && <div className="super-sep"/>}
                  </div>
                ))}
              </div>
            )}
            {done.length > 0 && (
              <>
                <div className="done-toggle" onClick={() => setShowDone(v=>!v)}>
                  <span>{showDone?'▾':'▸'}</span> Ya cogido ({done.length})
                </div>
                {showDone && (
                  <div className="super-list">
                    {done.map((item,idx) => (
                      <div key={item.id}>
                        <div className="super-item done-s" onClick={() => toggleItem(item.id)}>
                          <div className="super-cb">✓</div>
                          <span className="super-text">{item.text}</span>
                          <button className="super-del" onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>✕</button>
                        </div>
                        {idx < done.length-1 && <div className="super-sep"/>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ── OTRAS CATEGORÍAS ── */
          <>
            {pending.length === 0 ? (
              <div className="empty"><div className="empty-icon">🎉</div><div className="empty-txt">Todo al día</div></div>
            ) : (
              <>
                {filter === 'todos' && <div className="sec-label">Pendientes — {pending.length}</div>}
                <div className="list">
                  {pending.map((item, idx) => (
                    <div key={item.id}>
                      <ItemCard item={item} currentUser={user}
                        onToggle={toggleItem} onDelete={deleteItem}
                        onNudge={nudgeItem} onAssign={assignItem}
                        nudging={nudging===item.id} />
                      {idx < pending.length-1 && <div className="card-sep"/>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {done.length > 0 && (
              <>
                <div className="done-toggle" onClick={() => setShowDone(v=>!v)}>
                  <span>{showDone?'▾':'▸'}</span> Completados ({done.length})
                </div>
                {showDone && (
                  <div className="list">
                    {done.map((item,idx) => (
                      <div key={item.id}>
                        <ItemCard item={item} currentUser={user}
                          onToggle={toggleItem} onDelete={deleteItem}
                          onNudge={nudgeItem} onAssign={assignItem}
                          nudging={nudging===item.id} />
                        {idx < done.length-1 && <div className="card-sep"/>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {syncMsg && <div className="toast">{syncMsg}</div>}
    </>
  );
}

function ItemCard({ item, currentUser, onToggle, onDelete, onNudge, onAssign, nudging }) {
  const cat = catMap[item.cat] || catMap['otros'];
  const [expanded, setExpanded] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const target = item.assignedTo || (currentUser ? OTHER[currentUser] : 'el otro');

  return (
    <>
      <div className={`card${item.done?' done':''}`} onClick={() => { if (!item.done) { setExpanded(v=>!v); setShowAssign(false); } }}>
        <button className="check" onClick={e => { e.stopPropagation(); onToggle(item.id); }}>
          {item.done ? '✓' : ''}
        </button>
        <div className="card-body">
          <div className="itext">{item.text}</div>
          <div className="imeta">
            <span className="cat-dot" style={{background:cat.border}}/>
            <span style={{color:cat.color,fontWeight:600,fontSize:11}}>{cat.label}</span>
            {item.createdBy && <span style={{color:'var(--tx3)'}}>· {item.createdBy}</span>}
            {item.assignedTo && (
              <span className="assigned-pill"
                style={{color:USER_COLOR[item.assignedTo],borderColor:USER_COLOR[item.assignedTo]+'44',background:USER_BG[item.assignedTo]}}>
                → {item.assignedTo}
              </span>
            )}
            {item.done && item.doneBy && <span style={{color:'var(--accent)'}}>· ✓ {item.doneBy}</span>}
          </div>
        </div>
        {!item.done && <span className={`chevron${expanded?' open':''}`}>›</span>}
        {item.done && <button className="super-del" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>✕</button>}
      </div>

      {expanded && !item.done && (
        <>
          {showAssign ? (
            <div className="assign-row">
              <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,alignSelf:'center'}}>Para:</span>
              <button className="aopt" onClick={() => { onAssign(item.id,''); setShowAssign(false); }}>Los dos</button>
              {['Silvia','Sergio'].map(u => (
                <button key={u}
                  className={`aopt${item.assignedTo===u?' active-'+u.toLowerCase():''}`}
                  onClick={() => { onAssign(item.id,u); setShowAssign(false); }}>
                  {u}
                </button>
              ))}
            </div>
          ) : (
            <div className="card-actions">
              <button className={`nudge-btn${nudging?' loading':''}`}
                onClick={() => onNudge(item.id)}>
                {nudging ? '⏳…' : `📣 Oye ${target}`}
              </button>
              <button className="assign-btn" onClick={() => setShowAssign(true)}>👤 Asignar</button>
              <button className="del-btn" onClick={() => onDelete(item.id)}>Borrar</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
