'use client';
import { useState, useEffect, useRef } from 'react';

const USERS = ['Silvia', 'Sergio'];
const OTHER = { Silvia: 'Sergio', Sergio: 'Silvia' };
const CATS = [
  { id: 'compras', label: '🛒 Compras', color: '#92400E', bg: '#FEF3C7', border: '#F59E0B' },
  { id: 'tareas',  label: '✅ Tareas',  color: '#065F46', bg: '#D1FAE5', border: '#10B981' },
  { id: 'casa',    label: '🏡 Casa',    color: '#1E40AF', bg: '#DBEAFE', border: '#3B82F6' },
  { id: 'recados', label: '🚗 Recados', color: '#991B1B', bg: '#FEE2E2', border: '#EF4444' },
  { id: 'otros',   label: '📦 Otros',   color: '#5B21B6', bg: '#EDE9FE', border: '#8B5CF6' },
];
const catMap = Object.fromEntries(CATS.map(c => [c.id, c]));
const USER_COLOR = { Silvia: '#7B4EA0', Sergio: '#2563EB' };
const USER_BG    = { Silvia: '#F3ECF9', Sergio: '#EFF4FF' };

export default function Home() {
  const [user, setUser]           = useState(null);
  const [items, setItems]         = useState([]);
  const [filter, setFilter]       = useState('todos');
  const [selCat, setSelCat]       = useState('compras');
  const [assignTo, setAssignTo]   = useState('');   // '' = nadie concreto
  const [inputVal, setInputVal]   = useState('');
  const [showDone, setShowDone]   = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [nudging, setNudging]     = useState(null); // item id being nudged
  const syncTimer = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('listaCasa_user');
    if (saved) { setUser(saved); }
    else setShowModal(true);
    fetchItems();
    const iv = setInterval(() => fetchItems(true), 12000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (user) checkPushStatus();
  }, [user]);

  // ── PUSH SETUP ───────────────────────────────────────
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, subscription: sub.toJSON() }),
      });
      setPushEnabled(true);
      flash('🔔 Notificaciones activadas');
    } catch (e) {
      flash('Error: ' + e.message);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
  }

  // ── DATA ────────────────────────────────────────────
  async function fetchItems(silent = false) {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (!silent) setLoading(false);
    } catch { if (!silent) setLoading(false); }
  }

  function flash(msg) {
    setSyncMsg(msg);
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setSyncMsg(''), 2800);
  }

  function selectUser(name) {
    setUser(name);
    localStorage.setItem('listaCasa_user', name);
    setShowModal(false);
    checkPushStatus();
  }

  // ── ACTIONS ─────────────────────────────────────────
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
    setInputVal('');
    inputRef.current?.focus();
    flash('Añadido ✓');
    await fetch('/api/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
  }

  async function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updates = {
      done: !item.done,
      doneBy: !item.done ? user : null,
      doneAt: !item.done ? Date.now() : null,
    };
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    flash(updates.done ? '¡Hecho! ✓' : 'Deshecho');
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates, actor: user }),
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
      body: JSON.stringify({ id, updates: {}, actor: user, nudge: true }),
    });
    setNudging(null);
    flash(`📣 ¡${target} avisado/a!`);
  }

  async function assignItem(id, target) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, assignedTo: target || null } : i));
    await fetch('/api/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: { assignedTo: target || null }, actor: user }),
    });
  }

  async function deleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch('/api/items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    flash('Eliminado');
  }

  // ── RENDER ───────────────────────────────────────────
  const filtered = items.filter(i => filter === 'todos' || i.cat === filter);
  const pending  = filtered.filter(i => !i.done);
  const done     = filtered.filter(i => i.done);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--accent:#2D6A4F;--bg:#F7F6F3;--sf:#fff;--bd:#E5E2DC;--mu:#8A877F;--tx:#1A1814;--r:14px}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--tx);padding-bottom:80px;-webkit-tap-highlight-color:transparent}
        header{background:var(--sf);border-bottom:1px solid var(--bd);padding:14px 16px 10px;position:sticky;top:0;z-index:50}
        .hr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px}
        h1{font-size:19px;font-weight:700;letter-spacing:-.4px;flex-shrink:0}
        .hright{display:flex;align-items:center;gap:6px}
        .push-btn{padding:5px 10px;border-radius:16px;border:1.5px solid var(--bd);background:transparent;font-size:12px;cursor:pointer;color:var(--mu);font-weight:600;white-space:nowrap}
        .push-btn.on{border-color:#10B981;color:#065F46;background:#D1FAE5}
        .ubtn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:20px;border:none;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}
        .tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
        .tabs::-webkit-scrollbar{display:none}
        .tab{flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid transparent;background:transparent;color:var(--mu)}
        .tab.active{color:var(--tx);font-weight:700;background:#F0EDEA;border-color:#D4CFC8}
        main{padding:14px 14px 0}
        .add-box{background:var(--sf);border-radius:var(--r);border:1px solid var(--bd);padding:12px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .add-row{display:flex;gap:8px;margin-bottom:10px}
        input[type=text]{flex:1;padding:10px 13px;border:1.5px solid var(--bd);border-radius:10px;font-size:15px;background:var(--bg);color:var(--tx);outline:none;min-width:0}
        input[type=text]:focus{border-color:var(--accent)}
        .btn-add{padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:20px;font-weight:700;cursor:pointer;flex-shrink:0}
        .options-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
        .cat-btn,.assign-btn{padding:4px 11px;border-radius:14px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid;opacity:.45;transition:opacity .15s}
        .cat-btn.sel,.assign-btn.sel{opacity:1}
        .assign-btn{border-color:#D4CFC8;color:var(--mu);background:#F0EDEA}
        .assign-btn.sel-silvia{border-color:#7B4EA0;color:#7B4EA0;background:#F3ECF9;opacity:1}
        .assign-btn.sel-sergio{border-color:#2563EB;color:#2563EB;background:#EFF4FF;opacity:1}
        .sec-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--mu);padding:2px 0 8px}
        .list{display:flex;flex-direction:column;gap:8px}
        .card{background:var(--sf);border-radius:var(--r);border:1px solid var(--bd);padding:11px 12px 11px 15px;display:flex;align-items:flex-start;gap:10px;position:relative;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.05);transition:opacity .2s}
        .card.done{opacity:.44;background:var(--bg)}
        .card-left{width:3px;position:absolute;left:0;top:0;bottom:0}
        .check{width:24px;height:24px;border-radius:50%;border:2px solid var(--bd);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:1px;transition:all .15s}
        .card.done .check{background:var(--accent);border-color:var(--accent);color:#fff}
        .body{flex:1;min-width:0}
        .itext{font-size:15px;font-weight:500;line-height:1.35;word-break:break-word}
        .card.done .itext{text-decoration:line-through;color:var(--mu)}
        .meta{display:flex;align-items:center;gap:5px;margin-top:4px;flex-wrap:wrap}
        .badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:10px}
        .who{font-size:10px;color:var(--mu);font-weight:500}
        .assigned-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px}
        .done-by{font-size:10px;color:var(--accent);font-weight:600}
        .actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
        .nudge-btn{padding:5px 10px;border-radius:10px;border:1.5px solid #F59E0B;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity .15s}
        .nudge-btn:active{opacity:.7}
        .nudge-btn.loading{opacity:.5;pointer-events:none}
        .reassign-btn{padding:5px 10px;border-radius:10px;border:1.5px solid var(--bd);background:var(--bg);color:var(--mu);font-size:11px;font-weight:600;cursor:pointer}
        .del{background:none;border:none;cursor:pointer;color:var(--mu);font-size:15px;padding:2px;flex-shrink:0;opacity:.35;margin-top:1px}
        .empty{text-align:center;padding:44px 20px;color:var(--mu)}
        .empty-icon{font-size:38px;margin-bottom:8px}
        .done-toggle{display:flex;align-items:center;gap:7px;padding:12px 0 8px;cursor:pointer;color:var(--mu);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;user-select:none}
        .sync{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1A1814;color:#fff;padding:9px 18px;border-radius:18px;font-size:13px;font-weight:500;z-index:200;pointer-events:none;white-space:nowrap;animation:fadeIn .2s}
        @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:20px}
        .modal{background:#fff;border-radius:20px;padding:24px;width:100%;max-width:400px}
        .modal h2{font-size:18px;font-weight:700;margin-bottom:6px}
        .modal p{font-size:14px;color:var(--mu);margin-bottom:18px}
        .user-opts{display:flex;flex-direction:column;gap:10px}
        .uopt{padding:14px 18px;border-radius:12px;border:2px solid;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:12px;background:transparent}
        .uavatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700}
        .loading{text-align:center;padding:60px 20px;color:var(--mu);font-size:15px}
        .assign-select{padding:4px 8px;border-radius:10px;border:1.5px solid var(--bd);font-size:12px;background:var(--bg);color:var(--tx);cursor:pointer;font-weight:600}
      `}</style>

      {/* USER MODAL */}
      {showModal && (
        <div className="overlay" onClick={() => user && setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>¿Quién eres?</h2>
            <p>Elige tu perfil. Se guardará en este dispositivo.</p>
            <div className="user-opts">
              {USERS.map(u => (
                <button key={u} className="uopt"
                  style={{ borderColor: USER_COLOR[u], color: USER_COLOR[u], background: USER_BG[u] }}
                  onClick={() => selectUser(u)}>
                  <div className="uavatar" style={{ background: USER_COLOR[u] }}>{u[0]}</div>
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
            <button
              className={`push-btn${pushEnabled ? ' on' : ''}`}
              onClick={pushEnabled ? undefined : enablePush}>
              {pushEnabled ? '🔔 Notifs ON' : '🔕 Activar'}
            </button>
            {user ? (
              <button className="ubtn" onClick={() => setShowModal(true)}
                style={{ background: USER_BG[user], color: USER_COLOR[user] }}>
                <span style={{ width:8,height:8,borderRadius:'50%',background:USER_COLOR[user],display:'inline-block' }}/>
                {user}
              </button>
            ) : (
              <button className="ubtn" onClick={() => setShowModal(true)}
                style={{ background:'#F0EDEA',color:USER_COLOR['Silvia'],border:'none' }}>Elegir</button>
            )}
          </div>
        </div>
        <div className="tabs">
          {[{id:'todos',label:'Todos'}, ...CATS].map(c => (
            <button key={c.id} className={`tab${filter===c.id?' active':''}`}
              onClick={() => setFilter(c.id)}
              style={filter===c.id && c.color ? {background:c.bg,borderColor:c.border,color:c.color} : {}}>
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
                style={{background:c.bg,borderColor:c.border,color:c.color}}
                onClick={() => setSelCat(c.id)}>{c.label}</button>
            ))}
            <div style={{width:'100%',height:0}}/>
            <span style={{fontSize:11,color:'var(--mu)',fontWeight:600}}>Para:</span>
            <button className={`assign-btn${assignTo===''?' sel':''}`} onClick={() => setAssignTo('')}>Los dos</button>
            {USERS.map(u => (
              <button key={u} className={`assign-btn${assignTo===u?' sel-'+u.toLowerCase():''}`}
                onClick={() => setAssignTo(assignTo===u ? '' : u)}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* PENDING */}
        {loading ? (
          <div className="loading">Cargando lista…</div>
        ) : (
          <>
            {pending.length>0 && <div className="sec-label">Pendientes — {pending.length}</div>}
            <div className="list">
              {pending.length===0 ? (
                <div className="empty"><div className="empty-icon">🎉</div><div>Todo al día</div></div>
              ) : pending.map(item => (
                <ItemCard key={item.id} item={item} currentUser={user}
                  onToggle={toggleItem} onDelete={deleteItem}
                  onNudge={nudgeItem} onAssign={assignItem}
                  nudging={nudging===item.id} />
              ))}
            </div>

            {/* DONE */}
            {done.length>0 && (
              <>
                <div className="done-toggle" onClick={() => setShowDone(v=>!v)}>
                  <span>{showDone?'▾':'▸'}</span>
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

      {syncMsg && <div className="sync">{syncMsg}</div>}
    </>
  );
}

function ItemCard({ item, currentUser, onToggle, onDelete, onNudge, onAssign, nudging }) {
  const cat = catMap[item.cat] || catMap['otros'];
  const [showAssign, setShowAssign] = useState(false);
  const myItem = item.createdBy === currentUser;
  const otherUser = currentUser ? OTHER[currentUser] : null;
  const target = item.assignedTo || otherUser;

  return (
    <div className={`card${item.done?' done':''}`}>
      <div className="card-left" style={{background:cat.border}}/>
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
              style={{background:USER_BG[item.assignedTo],color:USER_COLOR[item.assignedTo],border:`1px solid ${USER_COLOR[item.assignedTo]}`}}>
              → {item.assignedTo}
            </span>
          )}
          {item.done && item.doneBy && (
            <span className="done-by">✓ {item.doneBy}</span>
          )}
        </div>

        {/* ACTION BUTTONS */}
        {!item.done && currentUser && (
          <div className="actions">
            <button
              className={`nudge-btn${nudging?' loading':''}`}
              onClick={() => onNudge(item.id)}>
              {nudging ? '⏳ Enviando…' : `📣 Oye ${target}, hazlo tú`}
            </button>
            <button className="reassign-btn" onClick={() => setShowAssign(v=>!v)}>
              {showAssign ? '✕' : '👤 Asignar'}
            </button>
          </div>
        )}

        {showAssign && (
          <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'var(--mu)',fontWeight:600,alignSelf:'center'}}>Asignar a:</span>
            <button className={`assign-btn${!item.assignedTo?' sel':''}`}
              style={{opacity:1}} onClick={() => { onAssign(item.id,''); setShowAssign(false); }}>Los dos</button>
            {USERS.map(u => (
              <button key={u} className={`assign-btn${item.assignedTo===u?' sel-'+u.toLowerCase():''}`}
                style={{opacity:1}}
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
