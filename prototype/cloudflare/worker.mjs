// Local API feasibility only. No production authentication or deployment entry point.
const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const record = row => ({ ...row, deleted: Boolean(row.deleted) });
const columns = 'id,date,text,deleted,revision';
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1901-01-01' || value > '2100-12-31') return false;
  const time = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
function validOperation(op) {
  return op && typeof op === 'object' && typeof op.id === 'string'
    && /^[A-Za-z0-9_-]{16,100}$/.test(op.id) && validDate(op.date)
    && typeof op.text === 'string' && Array.from(op.text).length <= 20000
    && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(op.text)
    && typeof op.deleted === 'boolean' && (op.deleted ? op.text === '' : Boolean(op.text.trim()));
}
async function body(request) {
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw new Error('invalid_body');
  // Bound actual streamed bytes, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 100000) { await reader.cancel(); throw new Error('invalid_body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('invalid_body'); }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Fail closed on public hosts even if someone copies the local test bindings.
    if (env.LOCAL_TEST_ONLY !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      return json({ error: 'Local feasibility harness only; production authentication is absent' }, 503);
    }
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return json({ error: 'Same-origin request required' }, 403);
    // Injected by tests, not credentials and not an Internet authentication scheme.
    const account = request.headers.get('X-Local-Test-Account');
    if (!['account-a', 'account-b'].includes(account)) return json({ error: 'Local test identity required' }, 401);
    try {
      // Primary session avoids optional read-replica staleness for this protocol.
      const db = env.DB.withSession('first-primary');
      const epoch = await db.prepare("SELECT value FROM meta WHERE key='epoch'").first('value');
      if (!epoch) return json({ error: 'Schema not initialized' }, 503);
      if (request.method === 'POST' && url.pathname === '/api/operations') {
        const data = await body(request);
        if (!data || typeof data !== 'object') return json({ error: 'Invalid operation' }, 400);
        if (data.epoch !== epoch) return json({ error: 'Service identity changed; preserve local data' }, 409);
        if (!validOperation(data.operation)) return json({ error: 'Invalid operation' }, 400);
        const op = data.operation;
        // Identity conflict trigger runs before ON CONFLICT. Retry does not append
        // a revision; selection is in the same atomic D1 batch as acceptance.
        const results = await db.batch([
          db.prepare('INSERT INTO changes(account,id,date,text,deleted) VALUES (?,?,?,?,?) ON CONFLICT(account,id) DO NOTHING')
            .bind(account, op.id, op.date, op.text, Number(op.deleted)),
          db.prepare(`SELECT ${columns} FROM changes WHERE account=? AND id=?`).bind(account, op.id),
        ]);
        return json({ record: record(results[1].results[0]) });
      }
      if (request.method === 'GET' && url.pathname === '/api/changes') {
        const rawCursor = url.searchParams.get('cursor') ?? '0', rawLimit = url.searchParams.get('limit') ?? '100';
        const cursor = Number(rawCursor), limit = Number(rawLimit);
        if (!/^\d+$/.test(rawCursor) || !/^\d+$/.test(rawLimit) || !Number.isSafeInteger(cursor)
          || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json({ error: 'Invalid pagination' }, 400);
        const results = await db.batch([
          db.prepare('SELECT COALESCE(MAX(revision),0) AS maximum FROM changes'),
          db.prepare(`SELECT ${columns} FROM changes WHERE account=? AND revision>? ORDER BY revision LIMIT ?`).bind(account, cursor, limit + 1),
        ]);
        if (cursor > results[0].results[0].maximum) return json({ error: 'Cursor ahead of service' }, 400);
        const rows = results[1].results, page = rows.slice(0, limit);
        return json({ changes: page.map(record), cursor: page.at(-1)?.revision ?? cursor, hasMore: rows.length > limit, epoch });
      }
      if (request.method === 'GET' && url.pathname === '/api/history') {
        const date = url.searchParams.get('date');
        if (!validDate(date)) return json({ error: 'Invalid date' }, 400);
        const rows = await db.prepare(`SELECT ${columns} FROM changes WHERE account=? AND date=? ORDER BY revision DESC LIMIT 100`).bind(account, date).all();
        return json({ history: rows.results.map(record) });
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error.message.includes('operation_identity_conflict')) return json({ error: 'Operation ID reused with different content' }, 409);
      if (error.message === 'invalid_body') return json({ error: 'JSON body of at most 100000 bytes required' }, 400);
      // Includes quota/outage failures: never acknowledge an uncommitted operation.
      return json({ error: 'Storage unavailable; retain pending operation and retry' }, 503);
    }
  },
};
