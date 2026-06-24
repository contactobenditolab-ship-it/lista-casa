'use client'; // v1782320516
import { useState, useEffect, useRef } from 'react';

const USERS = ['Silvia', 'Sergio'];
const OTHER = { Silvia: 'Sergio', Sergio: 'Silvia' };
const CATS = [
  { id: 'super', label: '🥦 Supermercado', color: '#FCD34D', bg: '#2D2004', border: '#92400E' },
  { id: 'compras', label: '🛍️ Compras', color: '#FB923C', bg: '#2D1004', border: '#9A3412' },
  { id: 'tareas',  label: '✅ Tareas',  color: '#6EE7B7', bg: '#022C22', border: '#065F46' },
  { id: 'casa',    label: '🏡 Casa',    color: '#93C5FD', bg: '#172554', border: '#1E40AF' },
  { id: 'recados', label: '🚗 Recados', color: '#FCA5A5', bg: '#2D0A0A', border: '#991B1B' },
  { id: 'otros',   label: '📦 Otros',   color: '#C4B5FD', bg: '#1E1040', border: '#5B21B6' },
];
const catMap = Object.fromEntries(CATS.map(c => [c.id, c]));
const USER_COLOR = { Silvia: '#C084FC', Sergio: '#60A5FA' };
const USER_BG    = { Silvia: '#2D1347', Sergio: '#0F2847' };

export default function Home() {
  const [user, setUser]           = useState(null);
  const [items, setItems] = useState(() => { try { const c = typeof window !== 'undefined' && localStorage.getItem('listaCasa_cache'); return c ? JSON.parse(c) : []; } catch { return []; } });
  const [filter, setFilter]       = useState(() => (typeof window !== 'undefined' && localStorage.getItem('listaCasa_filter')) || 'todos');
  const [selCat, setSelCat]       = useState('super');
  const [assignTo, setAssignTo]   = useState('');
  const [inputVal, setInputVal]   = useState('');
  const [showDone, setShowDone]   = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const [loading, setLoading] = useState(() => { try { return !(typeof window !== 'undefined' && localStorage.getItem('listaCasa_cache')); } catch { return true; } });
  const [showModal, setShowModal] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [nudging, setNudging]     = useState(null);
  const syncTimer = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('listaCasa_user');
    if (saved) setUser(saved);
    else setShowModal(true);
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

  async function enablePush() {
    if (!user) { setShowModal(true); return; }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { flash('Permiso denegado'); return; }
      const vkRes = await fetch('/api/vapid-key');
      const { publicKey } = await vkRes.json();
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
      if (data.items) { setItems(data.items); try { localStorage.setItem('listaCasa_cache', JSON.stringify(data.items)); } catch {} }
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
      const updated = updater(JSON.parse(cached));
      localStorage.setItem('listaCasa_cache', JSON.stringify(updated));
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
      text, cat: selCat, done: false,
      createdBy: user, createdAt: Date.now(),
      doneBy: null, doneAt: null,
      assignedTo: assignTo || null,
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
        // Revertir si el servidor falló
        setItems(prev => prev.filter(i => i.id !== item.id));
        updateCache(prev => prev.filter(i => i.id !== item.id));
        setInputVal(text);
        flash('❌ Error al guardar, inténtalo de nuevo');
      }
    } catch {
      // Sin conexión — revertir también
      setItems(prev => prev.filter(i => i.id !== item.id));
      updateCache(prev => prev.filter(i => i.id !== item.id));
      setInputVal(text);
      flash('❌ Sin conexión, inténtalo de nuevo');
    }
  }

  async function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updates = { done: !item.done, doneBy: !item.done ? user : null, doneAt: !item.done ? Date.now() : null };
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    updateCache(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    flash(updates.done ? '¡Hecho! ✓' : 'Deshecho');
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
    flash(`📣 Avisando a ${target}…`);
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: {}, actor: user, nudge: true, itemSnapshot: item }),
    });
    setNudging(null);
    flash(`📣 ¡${target} avisado/a!`);
  }

  async function assignItem(id, target) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, assignedTo: target || null } : i));
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

  const filtered = items.filter(i => filter === 'todos' || i.cat === filter);
  const pending  = filtered.filter(i => !i.done);
  const done     = filtered.filter(i => i.done);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D0D0F;
          --bg2:#141416;
          --sf:#1C1C1F;
          --sf2:#242428;
          --bd:#2A2A2F;
          --bd2:#333338;
          --tx:#F2F2F7;
          --tx2:#AEAEB2;
          --tx3:#636366;
          --accent:#6EE7B7;
          --r:16px;
        }
        html,body{height:100%;background:var(--bg)}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--tx);padding-bottom:90px;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}

        /* HEADER */
        header{
          background:rgba(13,13,15,0.85);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border-bottom:1px solid var(--bd);
          padding:env(safe-area-inset-top,14px) 16px 0;
          padding-top:calc(env(safe-area-inset-top,0px) + 14px);
          position:sticky;top:0;z-index:50;
        }
        .hr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px}
        h1{font-size:20px;font-weight:700;letter-spacing:-.5px;flex-shrink:0}
        .hright{display:flex;align-items:center;gap:6px;flex-shrink:0}

        .push-btn{
          padding:5px 10px;border-radius:20px;
          border:1px solid var(--bd2);background:var(--sf2);
          font-size:12px;font-weight:600;cursor:pointer;color:var(--tx2);
          white-space:nowrap;transition:all .15s;
        }
        .push-btn.on{border-color:#065F46;color:#6EE7B7;background:#022C22}
        .ubtn{
          display:flex;align-items:center;gap:5px;
          padding:6px 12px;border-radius:20px;border:none;
          font-weight:600;font-size:13px;cursor:pointer;
          white-space:nowrap;transition:opacity .15s;
        }
        .ubtn:active{opacity:.7}

        /* TABS */
        .tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding-bottom:12px}
        .tabs::-webkit-scrollbar{display:none}
        .tab{
          flex-shrink:0;padding:6px 14px;border-radius:20px;
          font-size:13px;font-weight:500;cursor:pointer;
          border:1px solid transparent;background:transparent;
          color:var(--tx3);transition:all .15s;
        }
        .tab.active{color:var(--tx);font-weight:700;background:var(--sf2);border-color:var(--bd2)}

        /* MAIN */
        main{padding:14px 14px 0}

        /* ADD BOX */
        .add-box{
          background:var(--sf);border-radius:var(--r);
          border:1px solid var(--bd);padding:14px;
          margin-bottom:16px;
        }
        .add-row{display:flex;gap:8px;margin-bottom:12px}
        input[type=text]{
          flex:1;padding:12px 14px;
          border:1px solid var(--bd2);border-radius:12px;
          font-size:16px;background:var(--bg);color:var(--tx);
          outline:none;min-width:0;transition:border-color .15s;
          -webkit-appearance:none;
        }
        input[type=text]:focus{border-color:var(--accent)}
        input[type=text]::placeholder{color:var(--tx3)}
        .btn-add{
          width:46px;height:46px;background:var(--accent);color:#022C22;
          border:none;border-radius:12px;font-size:22px;font-weight:800;
          cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          transition:opacity .15s;
        }
        .btn-add:active{opacity:.8}

        .options-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
        .cat-btn,.assign-btn{
          padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;
          cursor:pointer;border:1px solid transparent;
          opacity:.4;transition:opacity .15s;
        }
        .cat-btn.sel,.assign-btn.sel{opacity:1}
        .assign-btn{border-color:var(--bd2);color:var(--tx2);background:var(--sf2);opacity:.6}
        .assign-btn.sel{opacity:1;border-color:var(--bd2)}
        .assign-btn.sel-silvia{border-color:#9333EA;color:#C084FC;background:#2D1347;opacity:1}
        .assign-btn.sel-sergio{border-color:#2563EB;color:#60A5FA;background:#0F2847;opacity:1}
        .divider{width:100%;height:0;margin:2px 0}

        /* SECTION */
        .sec-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);padding:2px 2px 10px}

        /* CARDS */
        .list{display:flex;flex-direction:column;gap:8px}
        .card{
          background:var(--sf);border-radius:var(--r);
          border:1px solid var(--bd);
          padding:13px 13px 13px 16px;
          display:flex;align-items:flex-start;gap:11px;
          position:relative;overflow:hidden;
          transition:opacity .2s,transform .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .card.done{opacity:.35}
        .card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}

        .check{
          width:26px;height:26px;border-radius:50%;
          border:2px solid var(--bd2);background:transparent;
          cursor:pointer;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;margin-top:1px;transition:all .15s;
          color:transparent;
        }
        .check:active{transform:scale(.88)}
        .card.done .check{background:var(--accent);border-color:var(--accent);color:#022C22;font-weight:700}

        .body{flex:1;min-width:0}
        .itext{font-size:15px;font-weight:500;line-height:1.35;word-break:break-word;color:var(--tx)}
        .card.done .itext{text-decoration:line-through;color:var(--tx3)}

        .meta{display:flex;align-items:center;gap:5px;margin-top:5px;flex-wrap:wrap}
        .badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:2px 8px;border-radius:10px}
        .who{font-size:10px;color:var(--tx3);font-weight:500}
        .assigned-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;border:1px solid}
        .done-by{font-size:10px;color:var(--accent);font-weight:600}

        /* ACTION BUTTONS */
        .actions{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
        .nudge-btn{
          padding:6px 12px;border-radius:10px;
          border:1px solid #92400E;background:#2D1A04;
          color:#FCD34D;font-size:12px;font-weight:700;
          cursor:pointer;display:flex;align-items:center;gap:5px;
          transition:opacity .15s;-webkit-tap-highlight-color:transparent;
        }
        .nudge-btn:active{opacity:.7}
        .nudge-btn.loading{opacity:.4;pointer-events:none}
        .reassign-btn{
          padding:6px 12px;border-radius:10px;
          border:1px solid var(--bd2);background:var(--sf2);
          color:var(--tx2);font-size:12px;font-weight:600;cursor:pointer;
        }
        .assign-mini{display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;align-items:center}
        .assign-mini-lbl{font-size:11px;color:var(--tx3);font-weight:600}
        .assign-mini-btn{
          padding:4px 10px;border-radius:14px;border:1px solid var(--bd2);
          background:var(--sf2);color:var(--tx2);font-size:11px;font-weight:600;cursor:pointer;
        }
        .assign-mini-btn.active-silvia{border-color:#9333EA;color:#C084FC;background:#2D1347}
        .assign-mini-btn.active-sergio{border-color:#2563EB;color:#60A5FA;background:#0F2847}
        .assign-mini-btn.active-both{border-color:var(--bd2);color:var(--tx);background:var(--sf2)}

        .del{background:none;border:none;cursor:pointer;color:var(--tx3);font-size:16px;padding:2px;flex-shrink:0;opacity:.35;margin-top:2px;transition:opacity .15s}
        .del:active{opacity:1}

        /* EMPTY */
        .empty{text-align:center;padding:50px 20px;color:var(--tx3)}
        .empty-icon{font-size:42px;margin-bottom:10px}
        .empty-txt{font-size:15px;font-weight:500}

        /* DONE TOGGLE */
        .done-toggle{
          display:flex;align-items:center;gap:7px;padding:14px 2px 10px;
          cursor:pointer;color:var(--tx3);font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.8px;user-select:none;
        }

        /* TOAST */
        .toast{
          position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);
          left:50%;transform:translateX(-50%);
          background:var(--sf2);color:var(--tx);
          border:1px solid var(--bd2);
          padding:10px 20px;border-radius:20px;
          font-size:13px;font-weight:600;z-index:200;
          pointer-events:none;white-space:nowrap;
          animation:toastIn .2s ease;
        }
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

        /* MODAL */
        .overlay{
          position:fixed;inset:0;background:rgba(0,0,0,.7);
          z-index:300;display:flex;align-items:flex-end;justify-content:center;
          padding:0 0 env(safe-area-inset-bottom,20px);
          backdrop-filter:blur(4px);
        }
        .modal{
          background:var(--sf);border-radius:24px 24px 0 0;
          border-top:1px solid var(--bd);
          padding:28px 24px calc(env(safe-area-inset-bottom,0px) + 28px);
          width:100%;max-width:480px;
        }
        .modal-handle{width:36px;height:4px;background:var(--bd2);border-radius:2px;margin:0 auto 20px}
        .modal h2{font-size:20px;font-weight:700;margin-bottom:6px}
        .modal p{font-size:14px;color:var(--tx2);margin-bottom:20px}
        .user-opts{display:flex;flex-direction:column;gap:10px}
        .uopt{
          padding:16px 18px;border-radius:14px;border:1px solid;
          font-size:16px;font-weight:600;cursor:pointer;
          display:flex;align-items:center;gap:14px;
          transition:opacity .15s;
        }
        .uopt:active{opacity:.75}
        .uavatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;font-weight:700;flex-shrink:0}

        .loading-state{text-align:center;padding:70px 20px;color:var(--tx3)}
        .spinner{width:28px;height:28px;border:2px solid var(--bd2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* USER MODAL */}
      {showModal && (
        <div className="overlay" onClick={() => user && setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <h2>¿Quién eres?</h2>
            <p>Elige tu perfil. Se guardará en este dispositivo.</p>
            <div className="user-opts">
              {USERS.map(u => (
                <button key={u} className="uopt"
                  style={{ borderColor: USER_COLOR[u]+'44', color: USER_COLOR[u], background: USER_BG[u] }}
                  onClick={() => selectUser(u)}>
                  <div className="uavatar" style={{ background: USER_COLOR[u]+'33', color: USER_COLOR[u] }}>{u[0]}</div>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="hr">
          <h1>🏠 Lista Casa</h1>
          <div className="hright">
            <button className={`push-btn${pushEnabled ? ' on' : ''}`}
              onClick={pushEnabled ? undefined : enablePush}>
              {pushEnabled ? '🔔 ON' : '🔕 Notifs'}
            </button>
            {user ? (
              <button className="ubtn" onClick={() => setShowModal(true)}
                style={{ background: USER_BG[user], color: USER_COLOR[user] }}>
                <span style={{ width:8,height:8,borderRadius:'50%',background:USER_COLOR[user],display:'inline-block',flexShrink:0 }}/>
                {user}
              </button>
            ) : (
              <button className="ubtn" onClick={() => setShowModal(true)}
                style={{ background: 'var(--sf2)', color: 'var(--tx2)', border: '1px solid var(--bd2)' }}>
                Elegir
              </button>
            )}
          </div>
        </div>
        <div className="tabs">
          {[{id:'todos',label:'Todos'}, ...CATS].map(c => (
            <button key={c.id} className={`tab${filter===c.id?' active':''}`}
              onClick={() => { setFilter(c.id); localStorage.setItem('listaCasa_filter', c.id); }}
              style={filter===c.id && c.color ? {color:c.color,borderColor:c.border+'88',background:c.bg} : {}}>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <main>
        {/* ADD FORM */}
        <div className="add-box">
          <div className="add-row">
            <input ref={inputRef} type="text" placeholder="Añadir tarea o compra…"
              value={inputVal} onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addItem()} />
            <button className="btn-add" onClick={addItem}>+</button>
          </div>
          <div className="options-row">
            {CATS.map(c => (
              <button key={c.id} className={`cat-btn${selCat===c.id?' sel':''}`}
                style={{ background: selCat===c.id ? c.bg : 'var(--sf2)', borderColor: c.border, color: c.color }}
                onClick={() => setSelCat(c.id)}>{c.label}</button>
            ))}
            <div className="divider"/>
            <span style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>Para:</span>
            <button className={`assign-btn${assignTo===''?' sel':''}`} onClick={() => setAssignTo('')}>Los dos</button>
            {USERS.map(u => (
              <button key={u}
                className={`assign-btn${assignTo===u?' sel-'+u.toLowerCase():''}`}
                onClick={() => setAssignTo(assignTo===u ? '' : u)}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"/>
            Cargando…
          </div>
        ) : (
          <>
            {pending.length>0 && <div className="sec-label">Pendientes — {pending.length}</div>}
            <div className="list">
              {pending.length===0 ? (
                <div className="empty">
                  <div className="empty-icon">🎉</div>
                  <div className="empty-txt">Todo al día</div>
                </div>
              ) : pending.map(item => (
                <ItemCard key={item.id} item={item} currentUser={user}
                  onToggle={toggleItem} onDelete={deleteItem}
                  onNudge={nudgeItem} onAssign={assignItem}
                  nudging={nudging===item.id} />
              ))}
            </div>

            {done.length>0 && (
              <>
                <div className="done-toggle" onClick={() => setShowDone(v=>!v)}>
                  <span style={{fontSize:13}}>{showDone?'▾':'▸'}</span>
                  Completados ({done.length})
                </div>
                {showDone && (
                  <div className="list">
                    {done.map(item => (
                      <ItemCard key={item.id} item={item} currentUser={user}
                        onToggle={toggleItem} onDelete={deleteItem}
                        onNudge={nudgeItem} onAssign={assignItem}
                        nudging={nudging===item.id} />
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
  const [showAssign, setShowAssign] = useState(false);
  const target = item.assignedTo || (currentUser ? OTHER[currentUser] : 'el otro');

  return (
    <div className={`card${item.done?' done':''}`}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:cat.border,borderRadius:'3px 0 0 3px'}}/>
      <button className="check" onClick={() => onToggle(item.id)}>
        {item.done ? '✓' : ''}
      </button>
      <div className="body">
        <div className="itext">{item.text}</div>
        <div className="meta">
          <span className="badge" style={{background:cat.bg,color:cat.color}}>{cat.label}</span>
          {item.createdBy && (
            <span className="who">por <span style={{color:USER_COLOR[item.createdBy],fontWeight:600}}>{item.createdBy}</span></span>
          )}
          {item.assignedTo && (
            <span className="assigned-badge"
              style={{background:USER_BG[item.assignedTo],color:USER_COLOR[item.assignedTo],borderColor:USER_COLOR[item.assignedTo]+'44'}}>
              → {item.assignedTo}
            </span>
          )}
          {item.done && item.doneBy && <span className="done-by">✓ {item.doneBy}</span>}
        </div>

        {!item.done && currentUser && (
          <div className="actions">
            <button className={`nudge-btn${nudging?' loading':''}`} onClick={() => onNudge(item.id)}>
              {nudging ? '⏳ Enviando…' : `📣 Oye ${target}, hazlo tú`}
            </button>
            <button className="reassign-btn" onClick={() => setShowAssign(v=>!v)}>
              {showAssign ? '✕' : '👤'}
            </button>
          </div>
        )}

        {showAssign && (
          <div className="assign-mini">
            <span className="assign-mini-lbl">Asignar:</span>
            <button className={`assign-mini-btn${!item.assignedTo?' active-both':''}`}
              onClick={() => { onAssign(item.id,''); setShowAssign(false); }}>Los dos</button>
            {['Silvia','Sergio'].map(u => (
              <button key={u}
                className={`assign-mini-btn${item.assignedTo===u?' active-'+u.toLowerCase():''}`}
                onClick={() => { onAssign(item.id,u); setShowAssign(false); }}>
                {u}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="del" onClick={() => onDelete(item.id)}>✕</button>
    </div>
  );
}

