// Real tabs share cookies, IndexedDB and storage notifications within one profile.
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const data=mkdtempSync(join(tmpdir(),'calendar-tabs-'));
 const server=spawn('python3',['prototype/sync/server.py','--port','0','--data-dir',data,'--calendar-dist','prototype/sync/calendar-dist'],{stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Tab test server did not start')),10000);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/listening on 127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(`http://127.0.0.1:${m[1]}`)}});server.once('error',reject);server.once('exit',code=>{if(code)reject(new Error('Tab test server exited'))})});
  const credentials=JSON.parse(readFileSync(join(data,'test-credentials.json'),'utf8'));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const fallback of [false,true]){
   const key=fallback?'2026-11-18':'2026-11-17',context=await browser.newContext({viewport:{width:390,height:844}}),peerContext=await browser.newContext();
   if(fallback)await context.addInitScript(()=>{Object.defineProperty(navigator,'locks',{value:undefined,configurable:true});Object.defineProperty(window,'BroadcastChannel',{value:undefined,configurable:true})});
   const A=await context.newPage(),B=await context.newPage(),D=await peerContext.newPage(),errors=[];
   for(const p of [A,B,D])p.on('pageerror',e=>errors.push(e.message));
   const editor=p=>p.getByLabel('Daily note',{exact:true});
   const panel=p=>p.getByRole('complementary',{name:'Computer synchronization'});
   const button=p=>panel(p).getByRole('button',{name:'Sync now',exact:true});
   const status=p=>panel(p).getByRole('status');
   async function idle(p){await p.waitForFunction(()=>{const b=document.querySelector('[aria-label="Computer synchronization"] button');return b&&!b.disabled})}
   async function date(p){await p.getByLabel('Find date',{exact:true}).fill(key);await p.getByRole('button',{name:'Show date',exact:true}).click();await editor(p).waitFor()}
   async function open(p,account='account-a',login=false){
    await p.goto(base+'/calendar/');
    if(login){await p.getByLabel('Test account',{exact:true}).selectOption(account);await p.getByLabel('Test token',{exact:true}).fill(credentials[account]);await p.getByRole('button',{name:'Connect computer sync',exact:true}).click()}
    await p.getByRole('region',{name:'Month calendar'}).waitFor();await idle(p);await p.getByLabel('Automatic sync while this page is open').uncheck();await date(p);
   }
   async function save(p,text){await editor(p).fill(text);await p.getByRole('button',{name:'Save note',exact:true}).click();await p.locator('main > [role=status]').filter({hasText:'Saved on this device.'}).waitFor()}
   async function text(p,value){await p.waitForFunction(value=>document.querySelector('#daily-note')?.value===value,value)}
   async function sync(p){await idle(p);const response=p.waitForResponse(r=>r.url().includes('/api/changes?')&&r.status()===200);await button(p).click();await response;await idle(p)}
   async function snapshot(p){return p.evaluate(async()=>{const request=indexedDB.open('calendar182.computer-staging.v1:account-a');const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=reject});return new Promise((resolve,reject)=>{const tx=db.transaction(['notes','outbox','history'],'readonly'),notes=tx.objectStore('notes').getAll(),outbox=tx.objectStore('outbox').getAll(),history=tx.objectStore('history').getAll();tx.oncomplete=()=>{db.close();resolve({notes:notes.result,outbox:outbox.result,history:history.result})};tx.onabort=reject})})}
   await open(A,'account-a',true);await open(B);await open(D,'account-a',true);
   await save(A,'Shared tab first');await text(B,'Shared tab first');
   await B.locator('.history summary').click();
   await save(A,'Shared tab second');await text(B,'Shared tab second');await B.getByRole('option').filter({hasText:'Shared tab first'}).waitFor({state:'attached'});
   await editor(B).fill('Private draft in tab B');await save(A,'Shared saved change');
   await B.getByText('Saved notes changed in another tab.',{exact:false}).waitFor();assert.equal(await editor(B).inputValue(),'Private draft in tab B');
   A.once('dialog',dialog=>dialog.accept());await A.getByRole('button',{name:'Delete note',exact:true}).click();
   await A.locator('main > [role=status]').filter({hasText:'Deleted on this device.'}).waitFor();assert.equal(await editor(B).inputValue(),'Private draft in tab B');
   await save(B,'Explicit tab B save');await text(A,'Explicit tab B save');
   await editor(A).fill('Concurrent tab A');await editor(B).fill('Concurrent tab B');
   await Promise.all([A.getByRole('button',{name:'Save note',exact:true}).click(),B.getByRole('button',{name:'Save note',exact:true}).click()]);
   await Promise.all([A,B].map(p=>p.locator('main > [role=status]').filter({hasText:'Saved on this device.'}).waitFor()));
   const before=await snapshot(A),canonical=before.notes.find(note=>note.date===key).text;
   await text(A,canonical);await text(B,canonical);
   assert.ok(before.history.some(note=>note.text==='Concurrent tab A')||canonical==='Concurrent tab A');assert.ok(before.history.some(note=>note.text==='Concurrent tab B')||canonical==='Concurrent tab B');
   await Promise.all([sync(A),sync(B)]);
   const changes=await A.evaluate(()=>fetch('/api/changes?cursor=0&limit=100').then(r=>r.json()));
   const accepted=changes.changes.filter(note=>note.date===key);
   assert.equal(accepted.length,before.outbox.length);assert.equal(new Set(accepted.map(note=>note.id)).size,accepted.length);assert.equal((await snapshot(A)).outbox.length,0);
   await sync(D);await save(D,'Remote update via one local tab');await sync(D);await sync(A);await text(B,'Remote update via one local tab');
   await A.getByRole('button',{name:'Settings',exact:true}).click();await A.locator('input[value=local]').click();
   await status(A).filter({hasText:/sync paused/}).waitFor();await B.getByRole('button',{name:'Settings',exact:true}).click();
   await B.waitForFunction(()=>document.querySelector('input[value=local]')?.checked===true);assert.equal(await button(B).isDisabled(),true);
   await A.getByRole('button',{name:'Back to calendar',exact:true}).click();await B.getByRole('button',{name:'Back to calendar',exact:true}).click();
   await save(A,'Paused across every local tab');await text(B,'Paused across every local tab');await sync(D);assert.equal(await editor(D).inputValue(),'Remote update via one local tab');
   const C=await context.newPage();C.on('pageerror',e=>errors.push(e.message));await C.goto(base+'/calendar/');await C.getByRole('region',{name:'Month calendar'}).waitFor();await date(C);await text(C,'Paused across every local tab');assert.equal(await button(C).isDisabled(),true);
   await B.getByRole('button',{name:'Settings',exact:true}).click();await B.locator('input[value=computer]').click();await idle(B);await idle(A);await idle(C);
   await B.getByRole('button',{name:'Back to calendar',exact:true}).click();await C.getByLabel('Automatic sync while this page is open').uncheck();
   await sync(B);await sync(D);await text(D,'Paused across every local tab');
   // Close the tab after the server commits, before that tab can acknowledge.
   let acceptedResolve,releaseResolve;const committed=new Promise(resolve=>acceptedResolve=resolve),release=new Promise(resolve=>releaseResolve=resolve);
   await C.route('**/api/operations',async route=>{try{const response=await route.fetch();assert.equal(response.status(),200);acceptedResolve();await release;await route.abort('failed')}catch{/* Page closure cancels its response. */}});
   await save(C,'Accepted before source tab closed');await button(C).click();await committed;await C.close();releaseResolve();
   await save(D,'Later remote write after source closed');await sync(D);await sync(A);await text(A,'Later remote write after source closed');await text(B,'Later remote write after source closed');assert.equal((await snapshot(A)).outbox.length,0);
   // Shared-cookie reauthentication updates peers, but never copies a draft.
   await save(A,'Queued during shared session expiry');await editor(B).fill('Draft retained in second tab');await context.clearCookies();
   await button(A).click();await A.getByRole('form',{name:'Reconnect computer synchronization'}).waitFor();
   await button(B).click();await B.getByRole('form',{name:'Reconnect computer synchronization'}).waitFor();
   await A.getByLabel('Reconnect test token',{exact:true}).fill(credentials['account-a']);await A.getByRole('button',{name:'Reconnect same account',exact:true}).click();
   await B.getByRole('form',{name:'Reconnect computer synchronization'}).waitFor({state:'detached'});await idle(A);await idle(B);
   assert.equal(await editor(B).inputValue(),'Draft retained in second tab');await sync(D);await text(D,'Queued during shared session expiry');
   await save(B,'Draft retained in second tab');await sync(B);await text(A,'Draft retained in second tab');
   // A different account in this profile gets a different database/channel.
   await A.evaluate(async token=>{await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:'account-b',token})})},credentials['account-b']);
   const other=await context.newPage();await open(other,'account-b');assert.equal(await editor(other).inputValue(),'');
   await save(A,'Account A pending stays isolated');await text(B,'Account A pending stays isolated');assert.equal(await editor(other).inputValue(),'');
   await button(A).click();await A.getByRole('form',{name:'Reconnect computer synchronization'}).waitFor();
   assert.equal((await other.evaluate(()=>fetch('/api/changes').then(r=>r.json()))).changes.length,0);
   assert.deepEqual(errors,[]);
   console.log(`PASS: real shared tabs (${fallback?'storage-event / no-Web-Locks fallback':'BroadcastChannel + Web Locks'}): saves, history, drafts, delete, concurrent sync, shared mode, new tab, source closure/lost ack, peer reauthentication and account isolation`);
   await context.close();await peerContext.close();
  }
 }finally{
  if(browser)await browser.close();server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null||server.signalCode!==null)resolve();else server.once('exit',resolve)});rmSync(data,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exit(1)});
