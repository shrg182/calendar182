const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,writeFileSync,cpSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const temp=mkdtempSync(join(tmpdir(),'calendar-offline-')),data=join(temp,'data'),dist=join(temp,'dist');
 cpSync('prototype/sync/calendar-dist',dist,{recursive:true});
 const service=spawn('python3',['prototype/sync/server.py','--port','0','--data-dir',data,'--calendar-dist',dist],{stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  const base=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Offline test server did not start')),10000);
   service.stdout.on('data',chunk=>{const m=chunk.toString().match(/listening on 127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(`http://127.0.0.1:${m[1]}`)}});
   service.once('error',reject);service.once('exit',code=>{if(code)reject(new Error('Offline test service exited'))});
  });
  const credentials=JSON.parse(readFileSync(join(data,'test-credentials.json'),'utf8'));
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}}),peerContext=await browser.newContext();
  let page=await context.newPage();const peer=await peerContext.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));peer.on('pageerror',e=>errors.push(e.message));
  const editor=p=>p.getByLabel('Daily note',{exact:true});
  const syncPanel=p=>p.getByRole('complementary',{name:'Computer synchronization'});
  const syncStatus=p=>syncPanel(p).getByRole('status');
  const syncButton=p=>syncPanel(p).getByRole('button',{name:'Sync now',exact:true});
  async function openDate(p){await p.getByLabel('Find date',{exact:true}).fill('2026-11-17');await p.getByRole('button',{name:'Show date',exact:true}).click();await editor(p).waitFor()}
  async function idle(p){await p.waitForFunction(()=>{const button=document.querySelector('.computer-sync[aria-label="Computer synchronization"] button');return button&&!button.disabled})}
  async function connect(p){
   await p.goto(base+'/calendar/');await p.getByLabel('Test token',{exact:true}).fill(credentials['account-a']);await p.getByRole('button',{name:'Connect computer sync',exact:true}).click();
   await syncStatus(p).filter({hasText:'Saved notes synced.'}).waitFor();await idle(p);await openDate(p);
   await p.getByRole('complementary',{name:'Offline availability'}).getByRole('status').filter({hasText:'Offline app ready.'}).waitFor();
  }
  async function save(p,text){await editor(p).fill(text);await p.getByRole('button',{name:'Save note',exact:true}).click();await p.locator('main > [role=status]').filter({hasText:'Saved on this device.'}).waitFor()}
  async function manualSync(p){await idle(p);const response=p.waitForResponse(r=>r.url().includes('/api/changes?')&&r.status()===200);await syncButton(p).click();await response;await idle(p)}
  await connect(page);await connect(peer);
  await page.getByLabel('Automatic sync while this page is open').uncheck();
  await peer.getByLabel('Automatic sync while this page is open').uncheck();
  await save(page,'Saved before offline opening');await manualSync(page);await manualSync(peer);
  // A real service worker must serve the app shell, JS and CSS with networking disabled.
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});
  await context.setOffline(true);await page.reload();await openDate(page);
  assert.equal(await editor(page).inputValue(),'Saved before offline opening');
  await save(page,'Saved after offline reload');await page.reload();await openDate(page);
  assert.equal(await editor(page).inputValue(),'Saved after offline reload');
  await context.setOffline(false);await syncStatus(page).filter({hasText:'Saved notes synced.'}).waitFor();await idle(page);
  await manualSync(peer);assert.equal(await editor(peer).inputValue(),'Saved after offline reload');
  const cached=await page.evaluate(async()=>{const result=[];for(const name of await caches.keys()){if(name.startsWith('calendar182-shell:'))for(const request of await (await caches.open(name)).keys())result.push(request.url)}return result});
  assert.ok(cached.some(url=>url.endsWith('/calendar/')));
  assert.equal(cached.some(url=>url.includes('/api/')),false);
  console.log('Offline reload/edit/reload/reconnect passed; API responses absent from shell cache');
  // Expired authentication on reopening gives local access and a reconnect form.
  await context.clearCookies();await page.reload();await openDate(page);
  await page.getByRole('form',{name:'Reconnect computer synchronization'}).waitFor();
  assert.equal(await editor(page).inputValue(),'Saved after offline reload');
  await page.getByLabel('Reconnect test token',{exact:true}).fill(credentials['account-a']);await page.getByRole('button',{name:'Reconnect same account',exact:true}).click();
  await syncStatus(page).filter({hasText:'Saved notes synced.'}).waitFor();await idle(page);
  // Broken new shell must not replace the working cache.
  const original=readFileSync(join(dist,'offline-worker.js'),'utf8');
  const build=JSON.parse(original.match(/const BUILD = (.*);/)[1]);
  const broken={...build,cache:build.cache+'-broken',files:[...build.files,'/calendar/assets/missing.js']};
  writeFileSync(join(dist,'offline-worker.js'),original.replace(/const BUILD = .*;/,`const BUILD = ${JSON.stringify(broken)};`));
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();await new Promise(resolve=>{if(!r.installing)return resolve();r.installing.addEventListener('statechange',function(){if(this.state==='redundant')resolve()})})});
  assert.ok((await page.evaluate(()=>caches.keys())).includes(build.cache));
  assert.equal((await page.evaluate(()=>caches.keys())).includes(broken.cache),false);
  await context.setOffline(true);await page.reload();await openDate(page);assert.equal(await editor(page).inputValue(),'Saved after offline reload');
  await context.setOffline(false);await syncStatus(page).filter({hasText:'Saved notes synced.'}).waitFor();await idle(page);
  // A valid update waits; it never reloads a draft or activates across existing tabs.
  const updated={...build,cache:build.cache+'-next'};
  writeFileSync(join(dist,'index.html'),readFileSync(join(dist,'index.html'),'utf8').replace('<title>Calendar</title>','<title>Calendar updated test</title>'));
  writeFileSync(join(dist,'offline-worker.js'),original.replace(/const BUILD = .*;/,`const BUILD = ${JSON.stringify(updated)};`));
  await editor(page).fill('Draft must survive an app update');
  const second=await context.newPage();await second.goto(base+'/calendar/');
  await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});
  await page.getByText('An app update is ready.',{exact:false}).waitFor();
  assert.equal(await editor(page).inputValue(),'Draft must survive an app update');assert.equal(await page.title(),'Calendar');
  await second.close();
  assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).waiting!==null),true);
  await save(page,'Saved safely before app update');
  await page.close();
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/calendar/');
  await page.waitForFunction(()=>document.title==='Calendar updated test');await openDate(page);
  assert.equal(await editor(page).inputValue(),'Saved safely before app update');
  await context.setOffline(true);await page.reload();await openDate(page);
  assert.equal(await editor(page).inputValue(),'Saved safely before app update');
  assert.equal((await page.evaluate(()=>caches.keys())).includes(build.cache),false);
  await page.screenshot({path:'/tmp/calendar182-offline.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: cached app and notes reopen offline; edits survive reload and sync; expired-auth local access; failed install rollback; update waits for saved draft and closed tabs; new shell reopens offline.');
 }finally{
  if(browser)await browser.close();service.kill('SIGTERM');
  await new Promise(resolve=>{if(service.exitCode!==null||service.signalCode!==null)resolve();else service.once('exit',resolve)});
  rmSync(temp,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exit(1)});
