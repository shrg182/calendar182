const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,rmSync,renameSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');const {join}=require('node:path');const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=mkdtempSync(join(tmpdir(),'calendar-health-')),data=join(root,'data'),copy=join(root,'selected-copy-root');mkdirSync(copy);
 const server=spawn('python3',['prototype/sync/server.py','--port','0','--data-dir',data,'--calendar-dist','prototype/sync/calendar-dist','--backup-interval','1','--backup-keep','3','--backup-copy-root',copy],{stdio:['ignore','pipe','pipe'],env:{...process.env,CALENDAR182_LAUNCH_AGENT:'1'}});
 let browser,inspectionPage;
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Health server did not start')),10000);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/listening on 127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(`http://127.0.0.1:${m[1]}`)}});server.once('error',reject)});
  const credentials=JSON.parse(readFileSync(join(data,'test-credentials.json'),'utf8'));
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:320,height:900}}),errors=[];
  inspectionPage=page;page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/calendar/');
  await page.getByLabel('Test token',{exact:true}).fill(credentials['account-a']);await page.getByRole('button',{name:'Connect computer sync',exact:true}).click();
  await page.getByRole('region',{name:'Month calendar'}).waitFor();await page.locator('.date').first().click();await page.getByLabel('Daily note',{exact:true}).fill('Draft remains through status refresh');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const panel=page.locator('.backup-health'),refresh=panel.getByRole('button',{name:'Refresh backup status',exact:true});
  async function waitHealth(predicate){
   const deadline=Date.now()+10000;
   while(Date.now()<deadline){const response=await page.request.get(base+'/api/backup-status');const report=await response.json();if(predicate(report))return report;await new Promise(resolve=>setTimeout(resolve,100))}
   throw new Error('Expected service health state did not arrive');
  }
  async function refreshPanel(){
   const pending=page.waitForResponse(r=>r.url().endsWith('/api/backup-status'));
   await refresh.click();const response=await pending;
   await page.waitForFunction(()=>document.querySelector('.backup-health')?.getAttribute('aria-busy')==='false');
   return response;
  }

  await panel.getByText('Automatic at Mac sign-in',{exact:true}).waitFor();
  await waitHealth(report=>report.lastCopyVerifiedAt!==null&&report.snapshotCount>0);
  await refreshPanel();await panel.getByText('Configured',{exact:true}).waitFor();
  assert.equal(await panel.getByText('Not yet verified',{exact:true}).count(),0);
  renameSync(copy,copy+'-disconnected');
  await waitHealth(report=>report.copyFailed);
  assert.equal((await (await refreshPanel()).json()).copyFailed,true);await panel.getByRole('alert').filter({hasText:'Destination copy or status verification failed.'}).waitFor();
  renameSync(copy+'-disconnected',copy);
  await waitHealth(report=>!report.copyFailed);
  await refreshPanel();
  assert.equal(await panel.getByRole('alert').count(),0);
  await page.route('**/api/backup-status',route=>route.fulfill({status:503,body:'Unavailable'}));
  await refreshPanel();await panel.getByRole('alert').filter({hasText:'last known status'}).waitFor();
  await page.unroute('**/api/backup-status');await refreshPanel();
  assert.equal(await panel.getByRole('alert').count(),0);
  for(const width of [320,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
  await page.setViewportSize({width:320,height:900});await panel.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:'/tmp/calendar-backup-health.png'});
  await page.getByRole('button',{name:'Back to calendar',exact:true}).click();assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Draft remains through status refresh');
  assert.deepEqual(errors,[]);console.log('PASS: health success/times, destination failure/recovery, stale-status error, refresh, draft preservation and 320/1280 layout. Managed-startup marker simulated; real launchd verified separately.');
 }catch(error){if(inspectionPage){console.log('Health panel diagnostic:',await inspectionPage.locator('.backup-health').innerText().catch(()=>''));console.log('Visibility:',await inspectionPage.evaluate(()=>document.visibilityState));console.log('Service health:',await inspectionPage.evaluate(()=>fetch('/api/backup-status').then(r=>r.json())))}throw error;}finally{if(browser)await browser.close();server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null||server.signalCode!==null)resolve();else server.once('exit',resolve)});rmSync(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exit(1)});
