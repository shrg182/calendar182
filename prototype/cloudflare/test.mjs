import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare } from 'miniflare';
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const script = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8');
const op = (n, text = 'test', date = '2026-11-16', deleted = false) => ({ id: `test-operation-${String(n).padStart(8, '0')}`, text, date, deleted });
async function harness(t, persist) {
  const mf = new Miniflare({ modules: true, script, compatibilityDate: '2026-07-01',
    d1Databases: { DB: 'calendar-feasibility' }, d1Persist: persist ?? false,
    bindings: { LOCAL_TEST_ONLY: 'true' }, });
  let closed = false;
  const close = async () => { if (!closed) { closed = true; await mf.dispose(); } };
  t.after(close);
  const db = await mf.getD1Database('DB');
  if (!(await db.prepare("SELECT name FROM sqlite_master WHERE name='meta'").first())) {
    // exec splits SQL on newlines; preserve multiline trigger as one line.
    await db.exec(schema.replaceAll('\n', ' '));
  }
  const epoch = await db.prepare("SELECT value FROM meta WHERE key='epoch'").first('value');
  async function request(path, data, account = 'account-a', extra = {}) {
    const response = await mf.dispatchFetch(`http://localhost${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { 'X-Local-Test-Account': account, ...(data === undefined ? {} : { Origin: 'http://localhost', 'Content-Type': 'application/json' }), ...extra },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return { status: response.status, body: await response.json() };
  }
  async function write(operation, account) {
    const result = await request('/api/operations', { epoch, operation }, account);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body.record;
  }
  return { mf, db, epoch, request, write, close };
}
test('lost acknowledgement retry stays immutable after a later edit', async t => {
  const h = await harness(t);
  const first = await h.write(op(1, 'old')), later = await h.write(op(2, 'new'));
  assert.deepEqual(await h.write(op(1, 'old')), first);
  assert.equal((await h.request('/api/history?date=2026-11-16')).body.history[0].revision, later.revision);
  assert.equal((await h.request('/api/operations', { epoch: h.epoch, operation: op(1, 'changed') })).status, 409);
  assert.equal((await h.request('/api/changes')).body.changes.length, 2);
});
test('concurrent unique and duplicate writes serialize without duplicate acceptance', async t => {
  const h = await harness(t);
  const rows = await Promise.all(Array.from({ length: 20 }, (_, n) => h.write(op(n))));
  assert.equal(new Set(rows.map(r => r.revision)).size, 20);
  const retries = await Promise.all(Array.from({ length: 10 }, () => h.write(op(0))));
  assert.equal(new Set(retries.map(r => r.revision)).size, 1);
  const conflict = await Promise.all(['one', 'two'].map(text => h.request('/api/operations', { epoch: h.epoch, operation: op(99, text) })));
  assert.deepEqual(conflict.map(r => r.status).sort(), [200, 409]);
  assert.equal((await h.request('/api/changes')).body.changes.length, 21);
});
test('incremental pagination, account isolation and bounded idle payload', async t => {
  const h = await harness(t);
  for (let i = 0; i < 205; i++) await h.write(op(i));
  await h.write(op(0, 'other account'), 'account-b');
  let cursor = 0, more = true; const revisions = [];
  while (more) {
    const { body } = await h.request(`/api/changes?cursor=${cursor}&limit=100`);
    revisions.push(...body.changes.map(r => r.revision)); cursor = body.cursor; more = body.hasMore;
  }
  assert.equal(revisions.length, 205); assert.equal(new Set(revisions).size, 205);
  const idle = (await h.request(`/api/changes?cursor=${cursor}`)).body;
  assert.deepEqual(idle.changes, []); assert.ok(JSON.stringify(idle).length < 160);
  assert.equal((await h.request('/api/changes', undefined, 'account-b')).body.changes.length, 1);
  assert.equal((await h.request('/api/history?date=2026-11-17', undefined, 'account-b')).body.history.length, 0);
});
test('late offline acceptance, deletion and explicit recovery preserve history', async t => {
  const h = await harness(t);
  await h.write(op(1, 'online'));
  const deletion = await h.write(op(2, '', undefined, true));
  assert.equal(deletion.deleted, true);
  const late = await h.write(op(3, 'offline uploaded later'));
  assert.ok(late.revision > deletion.revision);
  await h.write(op(4, 'recovered online'));
  assert.deepEqual((await h.request('/api/history?date=2026-11-16')).body.history.map(r => r.text), ['recovered online', 'offline uploaded later', '', 'online']);
});
test('invalid writes and bad cursors do not change stored data', async t => {
  const h = await harness(t);
  for (const operation of [op(1, ''), op(1, 'x', '2026-02-30'), op(1, 'x'.repeat(20001)), op(1, 'text', undefined, true), op(1, '\ud800')]) {
    assert.equal((await h.request('/api/operations', { epoch: h.epoch, operation })).status, 400);
  }
  assert.equal((await h.request('/api/operations', { epoch: 'wrong', operation: op(1) })).status, 409);
  for (const query of ['cursor=1', 'cursor=-1', 'cursor=wat', 'limit=0', 'limit=101', 'cursor=1e3']) assert.equal((await h.request(`/api/changes?${query}`)).status, 400);
  assert.equal((await h.request('/api/operations', { epoch: h.epoch, operation: op(1, 'x'.repeat(100001)) })).status, 400);
  assert.deepEqual((await h.request('/api/changes')).body.changes, []);
});
test('D1 batch rolls back earlier statements after identity conflict', async t => {
  const h = await harness(t); await h.write(op(1, 'original'));
  await assert.rejects(h.db.batch([
    h.db.prepare("INSERT INTO changes(account,id,date,text,deleted) VALUES ('account-a','rollback-operation-0001','2026-11-16','must roll back',0)"),
    h.db.prepare('INSERT INTO changes(account,id,date,text,deleted) VALUES (?,?,?,?,0)').bind('account-a', op(1).id, '2026-11-16', 'conflict'),
  ]));
  assert.equal((await h.request('/api/changes')).body.changes.length, 1);
});
test('storage failure returns retryable error without acknowledging a write', async t => {
  const h = await harness(t);
  await h.db.exec("CREATE TRIGGER simulate_unavailable BEFORE INSERT ON changes BEGIN SELECT RAISE(ABORT,'simulated quota or outage'); END;");
  const result = await h.request('/api/operations', { epoch: h.epoch, operation: op(1) });
  assert.equal(result.status, 503); assert.equal(result.body.record, undefined);
  await h.db.exec('DROP TRIGGER simulate_unavailable;');
  assert.equal((await h.write(op(1))).text, 'test');
  assert.equal((await h.request('/api/changes')).body.changes.length, 1);
});
test('test identity gate fails closed for public hosts and cross-origin writes', async t => {
  const h = await harness(t);
  assert.equal((await h.mf.dispatchFetch('https://example.com/api/changes', { headers: { 'X-Local-Test-Account': 'account-a' } })).status, 503);
  assert.equal((await h.request('/api/changes', undefined, 'stranger')).status, 401);
  assert.equal((await h.request('/api/operations', { epoch: h.epoch, operation: op(1) }, 'account-a', { Origin: 'http://evil.example' })).status, 403);
});
test('persistent local D1 retains service identity, revisions and retry identity across runtime restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'calendar-d1-'));
  // Register directory cleanup after runtime hooks; close both before removal.
  const first = await harness(t, dir); const saved = await first.write(op(1));
  const epoch = first.epoch; await first.close();
  const restarted = await harness(t, dir);
  assert.equal(restarted.epoch, epoch);
  assert.deepEqual(await restarted.write(op(1)), saved);
  assert.equal((await restarted.request('/api/changes')).body.changes.length, 1);
  await restarted.close();
  await rm(dir, { recursive: true, force: true });
});
