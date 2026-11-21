const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-settings-sync-'));let browser;
 const child=spawn('python3',['-u','-c',"import sys;sys.path.insert(0,'prototype/sync');from server import make_server;s=make_server('127.0.0.1',0,sys.argv[1],calendar_dist=sys.argv[2]);print(s.server_port,flush=True);s.serve_forever()",data,process.env.SHENSHA_TEST_DIST||'/tmp/calendar182-settings-sync-test'],{cwd:path.resolve(__dirname,'..')});
 try{
 const port=await new Promise((resolve,reject)=>{child.stdout.once('data',b=>resolve(Number(b.toString().trim())));child.once('error',reject);child.once('exit',n=>reject(Error('Server exited '+n)));child.stderr.on('data',b=>process.stderr.write(b))});
 const url=`http://127.0.0.1:${port}`,tokens=JSON.parse(fs.readFileSync(path.join(data,'test-credentials.json')));
 browser=process.env.TEST_ENGINE==='webkit'?await webkit.launch():await chromium.launch({channel:'chrome'});
 const a=await browser.newContext({viewport:{width:390,height:844}}),b=await browser.newContext(),c=await browser.newContext();
 const pa=await a.newPage(),pb=await b.newPage(),pc=await c.newPage(),errors=[];
 for(const page of [pa,pb,pc])page.on('pageerror',e=>errors.push(e.message));
 async function login(page,account='account-a'){await page.goto(url+'/calendar/');await page.getByLabel('Test account',{exact:true}).selectOption(account);await page.getByLabel('Test token',{exact:true}).fill(tokens[account]);await page.getByRole('button',{name:'Connect computer sync',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Calculation time zone',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.shensha-settings fieldset').disabled);await page.getByRole('checkbox',{name:'Automatic sync while this page is open'}).uncheck();await page.waitForFunction(()=>!document.querySelector('.computer-sync button').disabled)}
 async function sync(page){const received=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/shensha'&&response.request().method()==='GET');await page.getByRole('button',{name:'Sync now',exact:true}).click();await received;await page.waitForFunction(()=>!document.querySelector('.computer-sync button').disabled)}
 async function save(page,zone){await page.getByLabel('Calculation time zone',{exact:true}).fill(zone);await page.getByRole('button',{name:'Save Shensha selections',exact:true}).click();await page.getByText('Unsaved Shensha selections. Day results use your last saved selections.').waitFor({state:'hidden'})}
 await login(pa);await save(pa,'Asia/Shanghai');await sync(pa);
 await login(pb);await sync(pb);await pb.getByLabel('Calculation time zone',{exact:true}).filter({visible:true}).waitFor();await pb.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='Asia/Shanghai');
 // Draft survives an incoming change, with an explicit stale-save refusal.
 await pb.getByLabel('Calculation time zone',{exact:true}).fill('UTC');await save(pa,'America/Detroit');await sync(pa);await sync(pb);
 assert.equal(await pb.getByLabel('Calculation time zone',{exact:true}).inputValue(),'UTC');await pb.getByRole('button',{name:'Save Shensha selections',exact:true}).click();await pb.getByText('Saved selections changed. Load saved selections before saving again.',{exact:true}).waitFor();
 pb.on('dialog',dialog=>dialog.accept());await pb.getByRole('button',{name:'Load saved selections',exact:true}).click();await pb.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='America/Detroit');
 // Competing durable offline changes trigger a review, rather than overwrite.
 await b.setOffline(true);await save(pb,'UTC');await save(pa,'Asia/Shanghai');await sync(pa);await b.setOffline(false);await sync(pb);await pb.getByRole('region',{name:'Shensha sync conflict'}).waitFor();await pb.getByRole('button',{name:'Keep this device’s settings'}).click();await sync(pb);await sync(pa);await pa.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='UTC');
 await login(pc,'account-b');await sync(pc);assert.equal(await pc.getByLabel('Calculation time zone',{exact:true}).inputValue(),'');
 await pb.reload();await pb.getByRole('button',{name:'Settings',exact:true}).click();await pb.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='UTC');
 // Existing device settings are migrated without silently replacing either version.
 const d=await browser.newContext(),pd=await d.newPage();await pd.goto(url+'/calendar/');
 await pd.evaluate(()=>{const settings={version:1,zone:'America/Detroit',birth:{year:'甲子',month:'',day:'',hour:''},selections:Object.fromEntries('tiande yuede tianyi wenchang lushen yima huagai jiangxing jinyu tianyi-medical taohua yangren jiesha zaisha kongwang shie yinyang tianluodiwang custom1 custom2 custom3'.split(' ').map(id=>[id,{enabled:false,targets:[]}]))};localStorage.setItem('calendar182.shensha.v1:calendar182.computer-staging.v1:account-a',JSON.stringify(settings))});
 await login(pd);await sync(pd);await pd.getByRole('region',{name:'Shensha sync conflict'}).waitFor();assert.equal(await pd.getByLabel('Calculation time zone',{exact:true}).inputValue(),'America/Detroit');
 await pd.getByRole('button',{name:'Use computer settings',exact:true}).click();await pd.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='UTC');await pd.reload();await pd.getByRole('button',{name:'Settings',exact:true}).click();await pd.waitForFunction(()=>document.querySelector('.shensha-settings input').value==='UTC');
 for(const width of [320,390,820]){await pd.setViewportSize({width,height:900});assert.equal(await pd.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await d.close();
 assert.equal(await pa.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS: two independent devices, draft preservation, stale-save guard, offline conflict review, reload, account isolation and mobile layout');
 }finally{if(browser)await browser.close();child.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
