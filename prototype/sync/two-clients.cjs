const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const data = mkdtempSync(join(tmpdir(), 'calendar-sync-test-'));
  const server = spawn('python3', ['prototype/sync/server.py', '--port', '0', '--data-dir', data], { stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Prototype server did not start')), 10000);
      server.stdout.on('data', chunk => {
        const match = chunk.toString().match(/listening on 127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
      });
      server.once('error', reject);
      server.once('exit', code => { if (code) reject(new Error(`Prototype server exited: ${code}`)); });
    });
    const credentials = JSON.parse(readFileSync(join(data, 'test-credentials.json'), 'utf8'));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const A = await contextA.newPage(), B = await contextB.newPage();
    const errors = [];
    for (const page of [A, B]) page.on('pageerror', error => errors.push(error.message));
    async function connected(page, account = 'account-a') {
      await page.goto(base);
      await page.getByLabel('Test account', { exact: true }).selectOption(account);
      await page.getByLabel('Test token', { exact: true }).fill(credentials[account]);
      await page.getByRole('button', { name: 'Connect', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('status').textContent === 'Synced.');
      await page.getByLabel('Automatic sync while this page is open').uncheck();
      await page.getByLabel('Date', { exact: true }).fill('2026-11-16');
    }
    async function save(page, text) {
      await page.getByLabel('Test note', { exact: true }).fill(text);
      await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
      await page.waitForFunction(() => !document.getElementById('save').disabled && document.getElementById('status').textContent.startsWith('Saved on this device;'));
    }
    async function sync(page, failure = false) {
      await page.getByRole('button', { name: 'Sync now', exact: true }).click();
      await page.waitForFunction(() => !document.getElementById('sync').disabled);
      const status = await page.getByRole('status').textContent();
      assert.equal(status.startsWith('Sync failed:'), failure, status);
    }
    const text = page => page.getByLabel('Test note', { exact: true }).inputValue();
    await connected(A); await connected(B);
    await save(A, 'A online'); await sync(A); await sync(B); assert.equal(await text(B), 'A online');
    await save(B, 'B reply'); await sync(B); await sync(A); assert.equal(await text(A), 'B reply');

    await contextA.setOffline(true); await save(A, 'A older offline edit'); await sync(A, true);
    await save(B, 'B online edit while A offline'); await sync(B);
    await contextA.setOffline(false); await sync(A); await sync(B);
    assert.equal(await text(B), 'A older offline edit');

    await B.getByLabel('Test note', { exact: true }).fill('Unsent B draft');
    await save(A, 'Remote while B types'); await sync(A); await sync(B);
    assert.equal(await text(B), 'Unsent B draft');
    assert.match(await B.locator('#draft-notice').textContent(), /preserved/);
    await B.getByRole('button', { name: 'Delete test note', exact: true }).click();
    await B.waitForFunction(() => !document.getElementById('delete').disabled && document.getElementById('status').textContent.startsWith('Saved on this device;'));
    await sync(B); await sync(A); assert.equal(await text(A), '');

    await save(A, 'Accepted but response lost');
    let lost = false;
    await A.route('**/api/operations', async route => {
      const response = await route.fetch(); assert.equal(response.status(), 200); lost = true;
      await route.abort('failed');
    });
    await sync(A, true); assert.equal(lost, true);
    await A.unroute('**/api/operations');
    await save(B, 'Later B accepted'); await sync(B);
    await sync(A); assert.equal(await text(A), 'Later B accepted');
    await sync(B); assert.equal(await text(B), 'Later B accepted');
    assert.match(await A.locator('#pending').textContent(), /^0 pending/);

    await contextA.setOffline(true); await save(A, 'Pending survives reload');
    await contextA.setOffline(false); await A.reload();
    await A.waitForFunction(() => document.getElementById('status').textContent === 'Synced.');
    await A.getByLabel('Automatic sync while this page is open').uncheck();
    await A.getByLabel('Date', { exact: true }).fill('2026-11-16');
    assert.equal(await text(A), 'Pending survives reload');
    await sync(B); assert.equal(await text(B), 'Pending survives reload');

    const received = async page => Number((await page.locator('#metrics').textContent()).match(/JSON received: (\d+)/)[1]);
    const before = await received(B); await sync(B); const idleBytes = (await received(B)) - before;
    assert.ok(idleBytes < 160, `Idle payload was ${idleBytes} bytes`);

    await B.locator('#history-panel summary').click();
    await B.getByRole('button', { name: 'Refresh history', exact: true }).click();
    const recovery = B.locator('#history li').filter({ hasText: 'B online edit while A offline' });
    await recovery.getByRole('button', { name: 'Copy to draft', exact: true }).click();
    assert.equal(await text(B), 'B online edit while A offline');
    await save(B, 'B online edit while A offline'); await sync(B); await sync(A);
    assert.equal(await text(A), 'B online edit while A offline');

    await A.getByLabel('Automatic sync while this page is open').check();
    await save(A, 'Automatic sync without Sync now');
    await A.waitForFunction(() => document.getElementById('pending').textContent.startsWith('0 pending') && document.getElementById('status').textContent === 'Synced.');
    await B.getByLabel('Automatic sync while this page is open').check();
    await B.waitForFunction(() => document.getElementById('note').value === 'Automatic sync without Sync now');
    await A.getByLabel('Automatic sync while this page is open').uncheck();
    await B.getByLabel('Automatic sync while this page is open').uncheck();

    const contextC = await browser.newContext(); const C = await contextC.newPage();
    await connected(C, 'account-b'); assert.equal(await text(C), '');
    assert.equal(await C.locator('#records li').count(), 0);
    assert.equal(await B.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', browserClients: 2, accountIsolation: true, offlineLateAcceptance: true,
      lostAcknowledgementDeduplicated: true, draftPreserved: true, deleteAndRecovery: true,
      pendingSurvivesReload: true, automaticSync: true, idleResponseBodyBytes: idleBytes }));
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await new Promise(resolve => { if (server.exitCode !== null || server.signalCode !== null) resolve(); else server.once('exit', resolve); });
    rmSync(data, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exit(1); });
