const SUPABASE_URL = 'https://pgvvhraoqwkqdykmvkif.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndnZocmFvcXdrcWR5a212a2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODA5NzQsImV4cCI6MjA5NzI1Njk3NH0.xVRa81_FrqJsK1ZIXIV55Wg2qwm0troQ2kiWSrhGgFY';

// ── Supabase REST helper ──────────────────────────────────────────────────
const db = {
  // Generic SELECT
  // opts.filter is an object like { username: 'eq.admin', role: 'eq.user' }
  async query(table, opts = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = [];
    if (opts.select) params.push(`select=${encodeURIComponent(opts.select)}`);
    if (opts.filter) {
      if (typeof opts.filter === 'string') {
        // raw filter string e.g. "or=(owner1_id.eq.x,owner2_id.eq.y)"
        params.push(opts.filter);
      } else {
        Object.entries(opts.filter).forEach(([k, v]) => params.push(`${k}=${encodeURIComponent(v)}`));
      }
    }
    if (opts.order) params.push(`order=${opts.order}`);
    if (opts.limit) params.push(`limit=${opts.limit}`);
    if (params.length) url += '?' + params.join('&');
    const r = await fetch(url, { headers: _h() });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw err;
    }
    return r.json();
  },

  // INSERT — set returning=true to get the inserted row back
  async insert(table, data, returning = false) {
    const headers = {
      ..._h(),
      'Content-Type': 'application/json',
    };
    if (returning) headers['Prefer'] = 'return=representation';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw err;
    }
    return returning ? r.json() : null;
  },

  // UPDATE — filter is { column: 'value' } and applies eq. automatically
  async update(table, data, filter) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    url += Object.entries(filter).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ..._h(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw err;
    }
    return r.json();
  },

  // DELETE — filter is { column: 'value' }
  async delete(table, filter) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    url += Object.entries(filter).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(url, { method: 'DELETE', headers: _h() });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw err;
    }
  },

  // Upload a file to Supabase Storage (avatars bucket)
  async uploadAvatar(file, filename) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw err;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/avatars/${filename}`;
  },
};

function _h() {
  return {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
  };
}

// ── Session (localStorage) ────────────────────────────────────────────────
const session = {
  get()        { try { return JSON.parse(localStorage.getItem('cf_session')); } catch { return null; } },
  set(user)    { localStorage.setItem('cf_session', JSON.stringify(user)); },
  clear()      { localStorage.removeItem('cf_session'); },
};

// ── Utilities ─────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
       + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function uid(p) {
  return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function $(id) { return document.getElementById(id); }

// ── Mobile sidebar drawer ─────────────────────────────────────────────────
function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function closeSidebar()  { document.body.classList.remove('sidebar-open'); }

// ── Global toast notification ─────────────────────────────────────────────
function toast(msg, type = 'ok', duration = 3500) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '28px', right: '28px', zIndex: '9999',
      padding: '13px 20px', borderRadius: '10px', fontSize: '14px',
      fontWeight: '500', maxWidth: '340px', fontFamily: 'Inter, sans-serif',
      boxShadow: '0 8px 30px rgba(0,0,0,.18)', transition: 'opacity .3s',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.background = type === 'ok' ? '#1e6b54' : type === 'err' ? '#9b3a30' : '#9b6b1a';
  el.style.color = '#fff';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, duration);
}

// ── Generate a 10-digit account number ───────────────────────────────────
function genAccountNo() {
  return String(Math.floor(Math.random() * 9000000000) + 1000000000);
}

// ── Log an activity entry ─────────────────────────────────────────────────
async function logActivity(type, description, amount, actorId) {
  try {
    await db.insert('activity_log', {
      type,
      description,
      amount: amount || null,
      actor_id: actorId || null,
    });
  } catch (e) {
    console.warn('Activity log failed:', e);
  }
}
