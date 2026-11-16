// Separate experimental client. Never opens the production notes database.
const $ = id => document.getElementById(id);
const state = { db: null, account: '', epoch: '', cursor: 0, syncing: false, writing: false,
  drafts: new Map(), snapshot: { notes: [], outbox: [], history: [] }, timer: null,
  retry: 2000, requests: 0, sent: 0, received: 0, authenticated: true };
const uuid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
const status = message => { $('status').textContent = message; };
const encoder = new TextEncoder();
async function api(path, data) {
  const body = data === undefined ? undefined : JSON.stringify(data);
  state.requests++; state.sent += body ? encoder.encode(body).length : 0;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body, signal: controller.signal });
    const text = await response.text(); state.received += encoder.encode(text).length;
    const value = JSON.parse(text);
    if (!response.ok) {
      if (response.status === 401) state.authenticated = false;
      throw new Error(value.error || `HTTP ${response.status}`);
    }
    return value;
  } finally { clearTimeout(timeout); diagnostics(); }
}
function diagnostics() {
  $('metrics').textContent = `Requests: ${state.requests}\nJSON sent: ${state.sent} bytes\nJSON received: ${state.received} bytes\nCursor: ${state.cursor}`;
}
function transaction(stores, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(stores, mode);
    let result;
    tx.oncomplete = () => resolve(typeof result === 'function' ? result() : result);
    tx.onabort = () => reject(tx.error || new Error('Local transaction failed'));
    try { result = action(tx); } catch (error) { tx.abort(); reject(error); }
  });
}
async function snapshot() {
  const value = await transaction(['notes', 'outbox', 'history', 'meta'], 'readonly', tx => {
    const notes = tx.objectStore('notes').getAll(), outbox = tx.objectStore('outbox').getAll();
    const history = tx.objectStore('history').getAll(), meta = tx.objectStore('meta').get('state');
    return () => ({ notes: notes.result, outbox: outbox.result, history: history.result, meta: meta.result });
  });
  state.snapshot = value;
  state.cursor = value.meta?.cursor || 0;
  if (value.meta?.epoch && value.meta.epoch !== state.epoch) throw new Error('Service identity changed. Export test data before resetting.');
  return value;
}
function date() { return $('date').value; }
function render() {
  const current = state.snapshot.notes.find(note => note.date === date());
  $('note').value = state.drafts.has(date()) ? state.drafts.get(date()) : current?.deleted ? '' : current?.text || '';
  const pending = state.snapshot.outbox.length;
  $('pending').textContent = `${pending} pending operation${pending === 1 ? '' : 's'} · downloaded through revision ${state.cursor}`;
  $('draft-notice').textContent = state.drafts.has(date()) ? 'Unsaved draft preserved. Save it explicitly; downloaded changes do not replace it.' : '';
  $('save').disabled = state.writing; $('delete').disabled = state.writing;
  $('records').replaceChildren();
  for (const note of [...state.snapshot.notes].sort((a, b) => b.date.localeCompare(a.date))) {
    const li = document.createElement('li'), button = document.createElement('button');
    button.textContent = `${note.date} · ${note.deleted ? '(Deleted)' : note.text.slice(0, 100)} · revision ${note.revision ?? 'pending'}`;
    button.onclick = () => { $('date').value = note.date; render(); };
    li.append(button); $('records').append(li);
  }
  renderHistory(); diagnostics();
}
function renderHistory() {
  $('history').replaceChildren();
  for (const note of state.snapshot.history.filter(note => note.date === date()).sort((a, b) => (b.revision || 0) - (a.revision || 0))) {
    const li = document.createElement('li');
    li.textContent = `Revision ${note.revision ?? 'local'}: ${note.deleted ? '(Deleted)' : note.text}`;
    if (!note.deleted) {
      const button = document.createElement('button'); button.textContent = 'Copy to draft';
      button.onclick = () => {
        if (state.drafts.has(date()) && !confirm('Replace your unsaved draft?')) return;
        state.drafts.set(date(), note.text); render();
      }; li.append(button);
    }
    $('history').append(li);
  }
}
async function save(deleted = false) {
  if (state.writing) return;
  const key = date(), text = deleted ? '' : $('note').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < '1901-01-01' || key > '2100-12-31' || !new Date(`${key}T12:00:00Z`).getTime()) { status('Choose a supported date.'); return; }
  if (!deleted && (!text.trim() || text.length > 20000)) { status('Enter up to 20,000 characters.'); return; }
  state.writing = true; render();
  const note = { date: key, text, deleted, id: uuid(), revision: null };
  try {
    await transaction(['notes', 'outbox', 'history'], 'readwrite', tx => {
      const notes = tx.objectStore('notes'), previous = notes.get(key);
      previous.onsuccess = () => {
        if (previous.result) tx.objectStore('history').put(previous.result);
        notes.put(note); tx.objectStore('outbox').add(note);
      };
    });
    if (deleted || state.drafts.get(key) === text) state.drafts.delete(key);
    await snapshot(); status('Saved on this device; pending sync.'); kick();
  } catch (error) { status(`Save failed: ${error.message}. Keep your draft.`); }
  finally { state.writing = false; render(); }
}
async function applyPage(page) {
  if (page.epoch !== state.epoch) throw new Error('Service identity changed. Preserve local data.');
  await transaction(['notes', 'outbox', 'history', 'meta'], 'readwrite', tx => {
    const pending = tx.objectStore('outbox').getAll();
    pending.onsuccess = () => {
      const localDates = new Set(pending.result.map(note => note.date));
      for (const note of page.changes) {
        tx.objectStore('history').put(note);
        if (!localDates.has(note.date)) tx.objectStore('notes').put(note);
      }
      tx.objectStore('meta').put({ key: 'state', cursor: page.cursor, epoch: page.epoch });
    };
  });
}
async function sync() {
  if (!state.db || state.syncing) return;
  clearTimeout(state.timer); state.syncing = true; $('sync').disabled = true;
  try {
    await snapshot();
    for (const operation of state.snapshot.outbox) {
      const result = await api('/api/operations', { operation, epoch: state.epoch });
      await transaction(['outbox', 'history'], 'readwrite', tx => {
        tx.objectStore('history').put(result.record);
        tx.objectStore('outbox').delete(operation.sequence);
      });
    }
    let more = true;
    // Bound a run so a busy peer cannot keep the UI syncing indefinitely.
    for (let pages = 0; more && pages < 20; pages++) {
      const page = await api(`/api/changes?cursor=${state.cursor}&limit=100`);
      await applyPage(page); await snapshot(); more = page.hasMore;
    }
    const pending = state.snapshot.outbox.length;
    status(more || pending ? 'Pending changes; another sync will continue.' : state.drafts.size ? 'Saved records synced. Unsaved drafts are still local.' : 'Synced.');
    state.retry = 2000;
    schedule(more || pending ? 250 : 15000);
  } catch (error) {
    status(`Sync failed: ${error.message}. Local notes and pending changes are retained.`);
    schedule(state.retry); state.retry = Math.min(state.retry * 2, 60000);
  } finally { state.syncing = false; $('sync').disabled = false; render(); }
}
function schedule(delay) {
  clearTimeout(state.timer);
  if ($('automatic').checked && state.authenticated) state.timer = setTimeout(() => void sync(), delay);
}
function kick() { if ($('automatic').checked) schedule(250); }
async function start(session) {
  state.account = session.account; state.epoch = session.epoch; state.authenticated = true;
  state.db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(`calendar182.sync-prototype.v1:${session.account}`, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('notes', { keyPath: 'date' });
      db.createObjectStore('outbox', { keyPath: 'sequence', autoIncrement: true });
      db.createObjectStore('history', { keyPath: 'id' }); db.createObjectStore('meta', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other experiment tabs and retry.'));
  });
  const initial = await snapshot();
  if (!initial.meta) await transaction(['meta'], 'readwrite', tx => tx.objectStore('meta').put({ key: 'state', cursor: 0, epoch: state.epoch }));
  $('login').hidden = true; $('workspace').hidden = false;
  $('identity').textContent = `Test account: ${session.account}`; render(); await sync();
}
$('login').onsubmit = async event => {
  event.preventDefault();
  try { const session = await api('/api/login', { account: $('account').value, token: $('token').value }); $('token').value = ''; await start(session); }
  catch (error) { $('token').value = ''; status(error.message); }
};
$('note').oninput = () => { state.drafts.set(date(), $('note').value); $('draft-notice').textContent = 'Unsaved draft'; };
$('date').onchange = render;
$('save').onclick = () => void save(); $('delete').onclick = () => void save(true);
$('sync').onclick = () => void sync(); $('automatic').onchange = () => { clearTimeout(state.timer); kick(); };
$('history-refresh').onclick = async () => {
  try {
    const result = await api(`/api/history?date=${encodeURIComponent(date())}`);
    await transaction(['history'], 'readwrite', tx => { for (const note of result.history) tx.objectStore('history').put(note); });
    await snapshot(); renderHistory();
  } catch (error) { status(error.message); }
};
$('export').onclick = async () => {
  try {
    const data = await snapshot(), url = URL.createObjectURL(new Blob([JSON.stringify({ prototype: true, account: state.account, ...data }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'calendar-sync-test-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { status(`Export failed: ${error.message}`); }
};
window.addEventListener('online', kick); window.addEventListener('focus', kick);
window.addEventListener('beforeunload', event => { if (state.drafts.size || state.writing) { event.preventDefault(); event.returnValue = ''; } });
const now = new Date(); $('date').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
try { const session = await api('/api/session'); await start(session); } catch { status('Enter generated test credentials. Existing local test data is retained.'); }
