// Tests the real Calendar staging build, not the standalone experiment editor.
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const data=mkdtempSync(join(tmpdir(),'calendar-staging-test-'));
 const server=spawn('python3',['prototype/sync/server.py','--port','0','--data-dir',data,'--calendar-dist','prototype/sync/calendar-dist'],{stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  const base=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Staging service did not start')),10000);
   server.stdout.on('data',chunk=>{const match=chunk.toString().match(/listening on 127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timeout);resolve(`http://127.0.0.1:${match[1]}`)}});
   server.once('error',reject);server.once('exit',code=>{if(code)reject(new Error(`Service exited: ${code}`))});
  });
  const credentials=JSON.parse(readFileSync(join(data,'test-credentials.json'),'utf8'));
  browser=await chromium.launch({channel:'chrome',headless:true});
  const ca=await browser.newContext({viewport:{width:1280,height:900}}),cb=await browser.newContext({viewport:{width:390,height:844}});
  const A=await ca.newPage(),B=await cb.newPage(),errors=[];
  const editor=p=>p.getByLabel('Daily note',{exact:true});
  const syncPanel=p=>p.getByRole('complementary',{name:'Computer synchronization'});
  const syncButton=p=>syncPanel(p).getByRole('button',{name:'Sync now',exact:true});
  const syncStatus=p=>syncPanel(p).getByRole('status');
  for(const p of [A,B])p.on('pageerror',e=>errors.push(e.message));
  async function waitIdle(p){await p.waitForFunction(()=>{const b=document.querySelector('.computer-sync button');return b&&!b.disabled})}
  async function openDate(p){await p.getByLabel('Find date',{exact:true}).fill('2026-11-17');await p.getByRole('button',{name:'Show date',exact:true}).click();await editor(p).waitFor()}
  async function connect(p,account='account-a'){
   await p.goto(base+'/calendar/');await p.getByLabel('Test account',{exact:true}).selectOption(account);
   await p.getByLabel('Test token',{exact:true}).fill(credentials[account]);await p.getByRole('button',{name:'Connect computer sync',exact:true}).click();
   await syncStatus(p).filter({hasText:'Saved notes synced.'}).waitFor();await waitIdle(p);
   await p.getByLabel('Automatic sync while this page is open').uncheck();await openDate(p);
  }
  async function save(p,text){
   await editor(p).fill(text);await p.getByRole('button',{name:'Save note',exact:true}).click();
   await p.locator('main > [role=status]').filter({hasText:'Saved on this device.'}).waitFor();
  }
  async function sync(p){
   await waitIdle(p);const response=p.waitForResponse(r=>r.url().includes('/api/changes?')&&r.status()===200);
   await syncButton(p).click();await response;await waitIdle(p);
   assert.match(await syncStatus(p).textContent(),/Saved notes synced/);
  }
  await connect(A);await connect(B);console.log('Connected both Calendar clients');
  await save(A,'Computer calendar edit');await sync(A);await sync(B);assert.equal(await editor(B).inputValue(),'Computer calendar edit');
  await save(B,'Phone calendar reply');await sync(B);await sync(A);assert.equal(await editor(A).inputValue(),'Phone calendar reply');
  console.log('Bidirectional edits passed');await ca.setOffline(true);await save(A,'Offline later acceptance');
  await save(B,'Online while computer offline');await sync(B);
  await ca.setOffline(false);await sync(A);await sync(B);assert.equal(await editor(B).inputValue(),'Offline later acceptance');
  await editor(B).fill('Keep this unsaved draft');await save(A,'Remote while phone drafts');await sync(A);await sync(B);
  assert.equal(await editor(B).inputValue(),'Keep this unsaved draft');
  await save(B,'Explicitly saved draft');await sync(B);await sync(A);
  A.once('dialog',d=>d.accept());await A.getByRole('button',{name:'Delete note',exact:true}).click();
  await A.locator('main > [role=status]').filter({hasText:'Deleted on this device.'}).waitFor();await sync(A);await sync(B);assert.equal(await editor(B).inputValue(),'');
  console.log('Offline, draft and deletion checks passed');let dropped=false;
  await A.route('**/api/operations',async route=>{const result=await route.fetch();assert.equal(result.status(),200);dropped=true;await route.abort('failed')});
  await save(A,'Accepted but acknowledgement lost');await syncButton(A).click();
  await syncStatus(A).filter({hasText:/fetch|network/i}).waitFor();await waitIdle(A);assert.equal(dropped,true);
  await A.unroute('**/api/operations');await save(B,'Later phone acceptance');await sync(B);await sync(A);await sync(B);
  assert.equal(await editor(A).inputValue(),'Later phone acceptance');
  console.log('Lost acknowledgement check passed');
  // Keep uploads blocked across an online reload to prove outbox persistence.
  await A.route('**/api/operations',route=>route.abort('failed'));
  await save(A,'Pending survives Calendar reload');await A.reload();
  await syncStatus(A).filter({hasText:/fetch|network/i}).waitFor();await waitIdle(A);
  await A.getByLabel('Automatic sync while this page is open').uncheck();await openDate(A);
  assert.equal(await editor(A).inputValue(),'Pending survives Calendar reload');
  assert.equal(await A.evaluate(async()=>{const req=indexedDB.open('calendar182.computer-staging.v1:account-a');const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=reject});return new Promise(resolve=>{const tx=db.transaction('outbox'),get=tx.objectStore('outbox').count();tx.oncomplete=()=>{db.close();resolve(get.result)}})}),1);
  await A.unroute('**/api/operations');await sync(A);await sync(B);assert.equal(await editor(B).inputValue(),'Pending survives Calendar reload');
  await B.locator('.history summary').click();
  const choice=B.getByRole('option').filter({hasText:'Phone calendar reply'});await choice.waitFor({state:'attached'});
  await B.getByLabel('Previous saved version').selectOption(await choice.getAttribute('value'));
  await B.getByRole('button',{name:'Use this version',exact:true}).click();
  assert.equal(await editor(B).inputValue(),'Phone calendar reply');await save(B,'Phone calendar reply');await sync(B);await sync(A);
  assert.equal(await editor(A).inputValue(),'Phone calendar reply');
  await A.getByLabel('Automatic sync while this page is open').check();await B.getByLabel('Automatic sync while this page is open').check();
  await save(A,'Automatic Calendar sync');await B.waitForFunction(()=>document.querySelector('#daily-note')?.value==='Automatic Calendar sync',null,{timeout:25000});
  await waitIdle(A);await A.getByLabel('Automatic sync while this page is open').uncheck();
  // Local-only selection is durable and does not upload saved edits or lose drafts.
  await waitIdle(B);await B.getByLabel('Automatic sync while this page is open').uncheck();
  await editor(A).fill('Draft kept while selecting storage');
  await A.getByRole('button',{name:'Settings',exact:true}).click();
  await A.locator('input[value=local]').click();
  await syncStatus(A).filter({hasText:'Computer sync paused.'}).waitFor();
  assert.equal(await syncButton(A).isDisabled(),true);
  await A.getByRole('button',{name:'Back to calendar',exact:true}).click();
  assert.equal(await editor(A).inputValue(),'Draft kept while selecting storage');
  let pausedRequests=0;
  A.on('request',request=>{if(/\/api\/(operations|changes)/.test(request.url()))pausedRequests++});
  await save(A,'Local-only saved edit');await sync(B);
  assert.equal(await editor(B).inputValue(),'Automatic Calendar sync');
  await A.reload();await syncStatus(A).filter({hasText:'Computer sync paused.'}).waitFor();await openDate(A);
  assert.equal(await editor(A).inputValue(),'Local-only saved edit');assert.equal(await syncButton(A).isDisabled(),true);
  await ca.setOffline(true);await save(A,'Paused offline edit');await ca.setOffline(false);
  await sync(B);assert.equal(await editor(B).inputValue(),'Automatic Calendar sync');
  assert.equal(pausedRequests,0);
  await A.getByRole('button',{name:'Settings',exact:true}).click();
  await A.locator('input[value=computer]').click();
  await syncStatus(A).filter({hasText:'Saved notes synced.'}).waitFor();await waitIdle(A);
  await A.getByRole('button',{name:'Back to calendar',exact:true}).click();
  await sync(B);assert.equal(await editor(B).inputValue(),'Paused offline edit');
  await A.reload();await syncStatus(A).filter({hasText:'Saved notes synced.'}).waitFor();await waitIdle(A);
  await A.getByLabel('Automatic sync while this page is open').uncheck();await openDate(A);
  assert.equal(await editor(A).inputValue(),'Paused offline edit');
  console.log('Storage selection pause, reload, draft retention and resume passed');
  const cc=await browser.newContext(),C=await cc.newPage();await connect(C,'account-b');assert.equal(await editor(C).inputValue(),'');
  await save(A,'Must not cross accounts');
  await A.evaluate(async({base,token})=>{await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:'account-b',token})})},{base,token:credentials['account-b']});
  await syncButton(A).click();await syncStatus(A).filter({hasText:'Sign-in expired'}).waitFor();await waitIdle(A);
  assert.equal((await A.evaluate(async()=>fetch('/api/changes').then(r=>r.json()))).changes.length,0);
  const names=await B.evaluate(async()=>(await indexedDB.databases()).map(db=>db.name));
  assert.equal(names.includes('calendar182.notes.v1'),false);assert.equal(names.some(n=>n.startsWith('calendar182.sync-prototype')),false);
  await B.getByRole('button',{name:'Settings',exact:true}).click();
  await B.getByText('Connected in this isolated test build',{exact:true}).waitFor();
  for(const width of [320,390,1280]){await B.setViewportSize({width,height:900});assert.equal(await B.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
  assert.equal(await B.locator('.computer-sync').count(),1);
  assert.equal(await B.locator('header').count(),1);
  await B.screenshot({path:'/tmp/calendar182-computer-staging.png'});
  await B.setViewportSize({width:320,height:900});
  await B.screenshot({path:'/tmp/calendar182-computer-staging-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: Calendar two-client sync, offline late acceptance, drafts, deletion/recovery, lost-ack retry, pending reload, automatic sync, account isolation, durable local/computer selection, separate storage and responsive Settings.');
 }finally{
  if(browser)await browser.close();server.kill('SIGTERM');
  await new Promise(resolve=>{if(server.exitCode!==null||server.signalCode!==null)resolve();else server.once('exit',resolve)});
  rmSync(data,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exit(1)});
