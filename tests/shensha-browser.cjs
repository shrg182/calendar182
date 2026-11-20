const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=process.env.SHENSHA_TEST_DIST;if(!root)throw Error('Set SHENSHA_TEST_DIST to an isolated build folder');
 const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=process.env.TEST_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({timezoneId:'America/Detroit',viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}`;
 await page.goto(url);await page.getByRole('button',{name:'Settings',exact:true}).click();
 const picker=name=>page.locator('.shensha-picker').filter({has:page.locator('summary').filter({hasText:name})});
 const td=picker('天德');await td.locator('summary').click();await td.getByRole('checkbox',{name:'Enable 天德',exact:true}).check();await td.getByRole('checkbox',{name:'丙',exact:true}).check();
 const custom=picker('自定义①');await custom.locator('summary').click();await custom.getByRole('checkbox',{name:'Enable 自定义①',exact:true}).check();for(const target of ['丙','戊','己','庚'])await custom.getByRole('checkbox',{name:target,exact:true}).check();
 await td.getByLabel('天德 strength',{exact:true}).selectOption('ming');await custom.getByLabel('自定义① strength',{exact:true}).selectOption('yun');assert.equal(await page.locator('.birth-pillars').count(),0);
 await page.getByRole('button',{name:'Save Shensha selections',exact:true}).click();await page.getByText('Shensha selections saved on this device.',{exact:true}).waitFor();
 async function day(){await page.getByRole('button',{name:'Back to calendar',exact:true}).click();await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click()}
 await day();assert.equal(await page.locator('[data-pillar-scope=day]').getAttribute('data-pillar'),'己巳');assert.equal(await page.locator('[data-pillar-scope=year] [data-shensha=tiande]').count(),1);assert.equal(await page.locator('[data-pillar-scope=hour] [data-shensha=custom1]').count(),1);
 assert.match(await page.locator('[data-pillar-scope=year] [data-shensha=tiande]').innerText(),/命 · stronger/);
 assert.match(await page.locator('[data-pillar-scope=day] [data-shensha=custom1]').innerText(),/运 · weaker/);
 await page.getByLabel('Daily note',{exact:true}).fill('Unsaved note retained through Shensha settings');await page.getByRole('button',{name:'Edit Shensha selections'}).click();
 const kw=picker('空亡');await kw.locator('summary').click();await kw.getByRole('checkbox',{name:'Enable 空亡',exact:true}).check();await kw.getByRole('checkbox',{name:'巳',exact:true}).check();await page.getByRole('button',{name:'Save Shensha selections'}).click();await day();assert.match(await page.locator('.shensha-void').innerText(),/inactive/);assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
 const viewButtons=page.getByRole('group',{name:'Calendar view'});
 for(const view of ['Year','Month','Week','Day']){
  await viewButtons.getByRole('button',{name:view,exact:true}).click();await page.getByRole('region',{name:view+' calendar',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
  if(view==='Year')assert.equal(await page.locator('.year-month').count(),12);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 }
 await page.getByRole('button',{name:'Next day',exact:true}).click();assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'');await page.getByRole('button',{name:'Previous day',exact:true}).click();assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
 async function swipe(region,dx,dy=0,target){await (target||region).dispatchEvent('pointerdown',{pointerId:1,button:0,clientX:dx<0?280:80,clientY:200});await region.dispatchEvent('pointerup',{pointerId:1,button:0,clientX:(dx<0?280:80)+dx,clientY:200+dy})}
 for(const mode of ['Week','Day']){
  await viewButtons.getByRole('button',{name:'Month',exact:true}).click();await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click();await viewButtons.getByRole('button',{name:mode,exact:true}).click();
  const region=page.getByRole('region',{name:'Swipe '+mode.toLowerCase()+' calendar',exact:true});
  if(mode==='Week'){assert.equal(await page.locator('.week-column').count(),7);assert.equal(await page.locator('.week-column').first().getAttribute('data-date'),'2026-10-19');await page.getByRole('button',{name:'Select 2026-10-24',exact:true}).click();assert.equal(await page.locator('.week-column').first().getAttribute('data-date'),'2026-10-19');await page.getByRole('button',{name:'Select 2026-10-22',exact:true}).click()}
  await swipe(region,-140);assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-23');
  if(mode==='Week')assert.equal(await page.locator('.week-column').first().getAttribute('data-date'),'2026-10-20');
  await swipe(region,140);assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-22');assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
  await swipe(region,-140,0,page.getByLabel('Daily note',{exact:true}));assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-22');
  await swipe(region,10,150);assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-22');
  for(const width of [320,390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);if(mode==='Week')assert.equal(await page.locator('.week-preview').first().isVisible(),width>600)}
  for(const [key,direction] of [['1901-01-01','Previous'],['2100-12-31','Next']]){await page.getByLabel('Find date',{exact:true}).fill(key);await page.getByRole('button',{name:'Show date',exact:true}).click();assert.equal(await page.getByRole('button',{name:direction+' '+mode.toLowerCase(),exact:true}).isDisabled(),true);if(mode==='Week')assert.equal(await page.locator('.week-column').count(),7)}
  await page.getByRole('button',{name:'Today',exact:true}).click();const todayKey=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),todayKey);
  await page.setViewportSize({width:390,height:844});await page.getByRole('region',{name:mode+' calendar',exact:true}).screenshot({path:'/tmp/calendar-horizontal-'+mode+'.png'});
  if(mode==='Week'){await page.setViewportSize({width:820,height:1000});await page.locator('.rolling-week').screenshot({path:'/tmp/calendar-horizontal-tablet.png'})}
 }
 await viewButtons.getByRole('button',{name:'Month',exact:true}).click();
 await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click();
 assert.equal(await page.getByRole('region',{name:'Upcoming Shensha matches'}).count(),0);
 await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByText('Saved on this device.',{exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await day();assert.match(await page.locator('.shensha-void').innerText(),/inactive/);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await page.locator('.shensha-day').screenshot({path:'/tmp/calendar-shensha-desktop.png'});await page.setViewportSize({width:390,height:844});await page.locator('.shensha-day').screenshot({path:'/tmp/calendar-shensha-mobile.png'});
 // Another tab saves while this tab has a draft: refuse to overwrite its settings.
 await page.getByRole('button',{name:'Edit Shensha selections'}).click();await picker('天德').locator('summary').click();assert.equal(await page.getByLabel('天德 strength',{exact:true}).inputValue(),'ming');await page.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Shanghai');const peer=await context.newPage();await peer.goto(url);await peer.getByRole('button',{name:'Settings',exact:true}).click();await peer.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Kathmandu');await peer.getByRole('button',{name:'Save Shensha selections'}).click();await page.getByRole('button',{name:'Save Shensha selections'}).click();await page.getByText('Saved selections changed in another tab. Load saved selections before editing again.',{exact:true}).waitFor();
 // Storage failure retains current selections and draft, with an honest error.
 await peer.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Shanghai');await peer.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Synthetic storage failure')}});await peer.getByRole('button',{name:'Save Shensha selections'}).click();await peer.getByText('Synthetic storage failure',{exact:true}).waitFor();assert.equal(await peer.getByLabel('Calculation time zone',{exact:true}).inputValue(),'Asia/Shanghai');
 assert.deepEqual(errors,[]);console.log('PASS: horizontal Week/Day swipes, rolling seven dates, phone/tablet layouts, Today, boundaries, editor protection, manual strengths, hidden future controls, saved Shensha selection, pillar/hour matches, Kongwang, reload, note draft preservation, 320/390/1280 layouts, concurrent-save guard and storage failure.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exit(1)});
