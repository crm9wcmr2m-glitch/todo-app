const SUPABASE_URL = 'https://zvtisyltheuycvjffdis.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dGlzeWx0aGV1eWN2amZmZGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDkwODAsImV4cCI6MjA5MjI4NTA4MH0.reaEcUeRKU-HnbKdM7VtuosHT7xjjpercf6MTOTmTrM';

let session = null;
let todos   = [];
let filter  = 'all';

// ── HELPERS ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${session ? session.access_token : ANON_KEY}`
  };
}

async function authApi(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, ...options.headers }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || JSON.stringify(data));
  return data;
}

async function dbApi(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...authHeaders(), 'Prefer': 'return=representation', ...options.headers }
  });
  if (!r.ok) { const t = await r.text(); throw new Error(t); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function parseHash(loc = window.location) {
  const hash = loc.hash.slice(1);
  if (!hash) return null;
  return Object.fromEntries(hash.split('&').map(p => p.split('=').map(decodeURIComponent)));
}

// ── UI ───────────────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('[data-view]').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
}

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.display = 'block';
}

function hideMsg(id) {
  document.getElementById(id).style.display = 'none';
}

function render() {
  const list = document.getElementById('todo-list');
  const filtered = todos.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.done : !t.done
  );

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty">Görev yok</li>';
  } else {
    list.innerHTML = filtered.map(t => t.editing ? `
      <li class="editing" data-id="${t.id}">
        <input type="checkbox" disabled style="opacity:0.3">
        <input class="edit-input" id="edit-${t.id}" value="${escHtml(t.text)}" maxlength="200"
          onkeydown="handleEditKey(event,${t.id})">
        <button class="save-btn" onclick="saveEdit(${t.id})">Kaydet</button>
        <button class="cancel-btn" onclick="cancelEdit(${t.id})">İptal</button>
      </li>
    ` : `
      <li class="${t.done ? 'done' : ''}" data-id="${t.id}">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggle(${t.id})">
        <span ondblclick="startEdit(${t.id})" title="Düzenlemek için çift tıkla">${escHtml(t.text)}</span>
        <button class="action-btn edit-btn" onclick="startEdit(${t.id})" title="Düzenle">✎</button>
        <button class="action-btn delete-btn" onclick="remove(${t.id})" title="Sil">✕</button>
      </li>
    `).join('');
  }

  const remaining = todos.filter(t => !t.done).length;
  document.getElementById('count-label').textContent = `${remaining} görev bekliyor`;
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

async function register() {
  hideMsg('register-msg');
  const first = document.getElementById('reg-first').value.trim();
  const last  = document.getElementById('reg-last').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;

  if (!first || !last) return showMsg('register-msg', 'Ad ve soyad alanları zorunludur.');
  if (!email)          return showMsg('register-msg', 'E-posta adresi zorunludur.');
  if (pass.length < 6) return showMsg('register-msg', 'Şifre en az 6 karakter olmalıdır.');

  const btn = document.querySelector('[data-view="register"] .btn-primary');
  btn.disabled = true; btn.textContent = 'Kayıt yapılıyor...';

  try {
    const data = await authApi('/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: pass,
        options: { emailRedirectTo: 'https://crm9wcmr2m-glitch.github.io/todo-app/' }
      })
    });

    const userId = data.user?.id || data.id;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Prefer': 'return=minimal',
        'Authorization': `Bearer ${data.access_token || ANON_KEY}` },
      body: JSON.stringify({ id: userId, first_name: first, last_name: last, email })
    });

    document.getElementById('new-user-id').textContent = userId;
    showView('registered');
  } catch (e) {
    showMsg('register-msg', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Kayıt Ol';
  }
}

async function login() {
  hideMsg('login-msg');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  if (!email || !pass) return showMsg('login-msg', 'E-posta ve şifre zorunludur.');

  const btn = document.querySelector('[data-view="login"] .btn-primary');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';

  try {
    const data = await authApi('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    session = { access_token: data.access_token, user: data.user };
    localStorage.setItem('session', JSON.stringify(session));
    await initApp();
  } catch (e) {
    showMsg('login-msg', 'E-posta veya şifre hatalı.');
  } finally {
    btn.disabled = false; btn.textContent = 'Giriş Yap';
  }
}

async function logout() {
  try {
    await authApi('/logout', { method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` } });
  } catch (_) {}
  session = null;
  localStorage.removeItem('session');
  todos = [];
  showView('login');
}

// ── TODO CRUD ────────────────────────────────────────────────────────────────

async function initApp() {
  let profile = null;
  try {
    const rows = await dbApi('/profiles?id=eq.' + session.user.id);
    profile = rows && rows[0];
  } catch (_) {}

  const name = profile
    ? `${profile.first_name} ${profile.last_name}`
    : session.user.email;

  document.getElementById('user-badge').textContent = name;
  showView('app');
  await loadTodos();
}

async function loadTodos() {
  try {
    todos = await dbApi('/todos?user_id=eq.' + session.user.id + '&order=created_at.asc');
    render();
  } catch (e) {
    showMsg('app-msg', 'Veriler yüklenemedi: ' + e.message);
  }
}

async function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    const [row] = await dbApi('/todos', {
      method: 'POST',
      body: JSON.stringify({ text, done: false, user_id: session.user.id })
    });
    todos.push(row);
    render();
  } catch (e) {
    showMsg('app-msg', 'Görev eklenemedi.'); input.value = text;
  }
}

async function toggle(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done; render();
  try {
    await dbApi(`/todos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ done: t.done }) });
  } catch (e) {
    t.done = !t.done; render(); showMsg('app-msg', 'Güncellenemedi.');
  }
}

function startEdit(id) {
  todos.forEach(t => { t.editing = false; });
  const t = todos.find(t => t.id === id);
  if (t) t.editing = true;
  render();
  const el = document.getElementById('edit-' + id);
  if (el) { el.focus(); el.select(); }
}

async function saveEdit(id) {
  const el = document.getElementById('edit-' + id);
  const text = el?.value.trim();
  if (!text) return;
  const t = todos.find(t => t.id === id);
  const old = t.text;
  t.text = text; t.editing = false; render();
  try {
    await dbApi(`/todos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ text }) });
  } catch (e) {
    t.text = old; render(); showMsg('app-msg', 'Düzenlenemedi.');
  }
}

function cancelEdit(id) {
  const t = todos.find(t => t.id === id);
  if (t) t.editing = false;
  render();
}

function handleEditKey(e, id) {
  if (e.key === 'Enter') saveEdit(id);
  if (e.key === 'Escape') cancelEdit(id);
}

async function remove(id) {
  todos = todos.filter(t => t.id !== id); render();
  try {
    await dbApi(`/todos?id=eq.${id}`, { method: 'DELETE' });
  } catch (e) {
    showMsg('app-msg', 'Silinemedi.'); loadTodos();
  }
}

async function clearDone() {
  const ids = todos.filter(t => t.done).map(t => t.id);
  if (!ids.length) return;
  todos = todos.filter(t => !t.done); render();
  try {
    await dbApi(`/todos?id=in.(${ids.join(',')})`, { method: 'DELETE' });
  } catch (e) {
    showMsg('app-msg', 'Silinemedi.'); loadTodos();
  }
}

function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// ── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  session = JSON.parse(localStorage.getItem('session') || 'null');
  const params = parseHash();

  if (params) {
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (params.error) {
      if (params.error_code === 'otp_expired' || params.error === 'access_denied') {
        showView('link-expired');
      } else {
        showView('login');
        showMsg('login-msg', params.error_description || 'Bir hata oluştu.');
      }
      return;
    }

    if (params.access_token && (params.type === 'signup' || params.type === 'magiclink')) {
      session = { access_token: params.access_token, user: { id: params.user_id || '' } };
      try {
        const user = await authApi('/user', {
          headers: { 'Authorization': `Bearer ${params.access_token}` }
        });
        session.user = user;
        localStorage.setItem('session', JSON.stringify(session));
        showView('confirmed');
      } catch (_) {
        showView('confirmed');
      }
      return;
    }
  }

  if (session?.access_token) {
    initApp().catch(() => { session = null; localStorage.removeItem('session'); showView('login'); });
  } else {
    showView('login');
  }
}

if (typeof module !== 'undefined') {
  module.exports = { escHtml, parseHash };
} else {
  document.getElementById('todo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
  });
  init();
}
