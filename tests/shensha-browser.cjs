const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=process.env.SHENSHA_TEST_DIST;if(!root)throw Error('Set SHENSHA_TEST_DIST to an isolated build folder');
 const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=process.env.TEST_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({timezoneId:'America/Detroit',viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}`;
 await page.goto(url);await page.getByRole('group',{name:'Calendar view'}).getByRole('button',{name:'Day',exact:true}).click();assert.equal(await page.locator('.shensha-day').count(),0);await page.getByRole('group',{name:'Calendar view'}).getByRole('button',{name:'Month',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();
 const picker=name=>page.locator('.shensha-picker').filter({has:page.getByRole('checkbox',{name:'Enable '+name,exact:true})});
 const td=picker('天德');await td.getByRole('checkbox',{name:'Enable 天德',exact:true}).check();await td.locator('summary').click();await td.getByRole('checkbox',{name:'丙',exact:true}).check();
 const custom=picker('自定义①');await custom.getByRole('checkbox',{name:'Enable 自定义①',exact:true}).check();await custom.locator('summary').click();for(const target of ['丙','戊','己','庚'])await custom.getByRole('checkbox',{name:target,exact:true}).check();
 await td.getByRole('checkbox',{name:'天德 命',exact:true}).check();await custom.getByRole('checkbox',{name:'自定义① 运',exact:true}).check();await custom.getByRole('checkbox',{name:'自定义① negative',exact:true}).check();assert.equal(await page.locator('.birth-pillars').count(),0);
 // Optional choices are exclusive, reversible and independent of Enable.
 await td.getByRole('checkbox',{name:'天德 运',exact:true}).check();assert.equal(await td.getByRole('checkbox',{name:'天德 命',exact:true}).isChecked(),false);
 await td.getByRole('checkbox',{name:'天德 运',exact:true}).uncheck();assert.equal(await td.getByRole('checkbox',{name:'天德 命',exact:true}).isChecked(),false);
 await td.getByRole('checkbox',{name:'天德 命',exact:true}).check();
 await custom.getByRole('checkbox',{name:'自定义① 命',exact:true}).check();assert.equal(await custom.getByRole('checkbox',{name:'自定义① 运',exact:true}).isChecked(),false);
 await custom.getByRole('checkbox',{name:'自定义① 命',exact:true}).uncheck();await custom.getByRole('checkbox',{name:'自定义① 运',exact:true}).check();
 await custom.getByRole('checkbox',{name:'自定义① positive',exact:true}).check();assert.equal(await custom.getByRole('checkbox',{name:'自定义① negative',exact:true}).isChecked(),false);
 await custom.getByRole('checkbox',{name:'自定义① positive',exact:true}).uncheck();assert.equal(await custom.locator('.shensha-custom-choices input:checked').count(),0);
 await custom.getByRole('checkbox',{name:'自定义① negative',exact:true}).check();
 assert.equal(await page.locator('.shensha-setting-row select').count(),0);
 assert.doesNotMatch(await page.locator('.shensha-row-controls').allTextContents().then(text=>text.join(' ')),/Strength|Effect/);
 // Grouped target pickers keep selected chips visible, searchable and keyboard accessible.
 assert.equal(await page.locator('.shensha-setting-group').count(),3);
 await custom.getByRole('searchbox',{name:'Search 自定义① targets',exact:true}).fill('甲子');
 assert.equal(await custom.locator('.shensha-targets input').count(),1);
 await custom.getByRole('searchbox',{name:'Search 自定义① targets',exact:true}).fill('不存在');
 await custom.getByText('No matching targets.',{exact:true}).waitFor();
 await custom.getByRole('searchbox',{name:'Search 自定义① targets',exact:true}).fill('');
 await custom.getByRole('searchbox',{name:'Search 自定义① targets',exact:true}).press('Escape');
 assert.equal(await custom.locator('details').getAttribute('open'),null);
 assert.equal(await custom.getByRole('button',{name:'自定义① remove 丙',exact:true}).isVisible(),true);
 await custom.getByRole('button',{name:'自定义① remove 丙',exact:true}).click();
 await custom.locator('summary').click();await custom.getByRole('checkbox',{name:'丙',exact:true}).check();
 await custom.getByRole('checkbox',{name:'Enable 自定义①',exact:true}).uncheck();
 assert.equal(await custom.getByRole('button',{name:'自定义① remove 丙',exact:true}).isDisabled(),true);
 await custom.getByRole('checkbox',{name:'Enable 自定义①',exact:true}).check();
 assert.equal(await custom.getByRole('button',{name:'自定义① remove 丙',exact:true}).count(),1);
 for(const width of [320,390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await page.setViewportSize({width:390,height:844});await page.locator('.shensha-setting-group').first().screenshot({path:'/tmp/calendar-settings-phone.png'});
 await page.setViewportSize({width:1280,height:1000});await page.locator('.shensha-setting-group').first().screenshot({path:'/tmp/calendar-settings-desktop.png'});
 await page.getByRole('button',{name:'Save Shensha selections',exact:true}).click();await page.getByText('Shensha selections saved on this device.',{exact:true}).waitFor();
 async function day(){await page.getByRole('button',{name:'Back to calendar',exact:true}).click();await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click()}
 await day();assert.equal(await page.locator('[data-pillar-scope=day]').getAttribute('data-pillar'),'己巳');assert.equal(await page.locator('[data-pillar-scope=year] [data-shensha=tiande]').count(),1);assert.equal(await page.locator('[data-pillar-scope=hour] [data-shensha=custom1]').count(),1);
 assert.doesNotMatch(await page.locator('.shensha-day').innerText(),/[命运]/);assert.match(await page.locator('[data-pillar-scope=year] [data-shensha=tiande]').getAttribute('class'),/strength-ming/);
 assert.match(await page.locator('[data-pillar-scope=day] [data-shensha=custom1]').getAttribute('class'),/strength-yun/);
 await page.getByLabel('Daily note',{exact:true}).fill('Unsaved note retained through Shensha settings');await page.getByRole('button',{name:'Settings',exact:true}).click();
 const kw=picker('空亡');await kw.getByRole('checkbox',{name:'Enable 空亡',exact:true}).check();await kw.locator('summary').click();await kw.getByRole('checkbox',{name:'巳',exact:true}).check();await kw.getByRole('checkbox',{name:'空亡 命',exact:true}).check();await page.getByRole('button',{name:'Save Shensha selections'}).click();await day();assert.ok(await page.locator('[data-shensha=kongwang]').count()>0);assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
 assert.equal(await page.locator('.shensha-day .inactive').count(),0);
 const colors=await page.evaluate(()=>{const color=selector=>getComputedStyle(document.querySelector(selector)).color;return [color('[data-shensha=tiande]'),color('[data-shensha=custom1]'),color('[data-shensha=kongwang]')]});assert.equal(new Set(colors).size,3);
 const viewButtons=page.getByRole('group',{name:'Calendar view'});
 const todayKey=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
 const sunday=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
 async function swipe(region,dx,dy=0,target){await (target||region).dispatchEvent('pointerdown',{pointerId:1,button:0,clientX:dx<0?280:80,clientY:200});await region.dispatchEvent('pointerup',{pointerId:1,button:0,clientX:(dx<0?280:80)+dx,clientY:200+dy})}
 await viewButtons.getByRole('button',{name:'Week',exact:true}).click();
 assert.doesNotMatch(await page.locator('.week-matches').allTextContents().then(t=>t.join('')) ,/[命运]/);assert.equal(await page.locator('.week-column').count(),7);assert.equal(await page.locator('.week-column').first().getAttribute('data-date'),sunday);assert.equal(await page.locator('.focused-day').count(),0);assert.equal(await page.getByLabel('Daily note',{exact:true}).count(),0);
 const weekRegion=page.getByRole('region',{name:'Swipe week calendar',exact:true});await swipe(weekRegion,-140);assert.notEqual(await page.locator('.week-column').first().getAttribute('data-date'),sunday);await swipe(weekRegion,140);assert.equal(await page.locator('.week-column').first().getAttribute('data-date'),sunday);
 for(const width of [320,390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const boxes=await page.locator('.week-column').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));assert.ok(boxes.every(b=>Math.abs(b.w-boxes[0].w)<2&&Math.abs(b.h-boxes[0].h)<2));assert.equal(await page.locator('.week-preview').first().isVisible(),true);}
 await page.setViewportSize({width:390,height:844});await page.getByRole('region',{name:'Week calendar',exact:true}).screenshot({path:'/tmp/calendar-columns-phone.png'});await page.setViewportSize({width:820,height:1000});await page.getByRole('region',{name:'Week calendar',exact:true}).screenshot({path:'/tmp/calendar-columns-tablet.png'});
 await page.getByRole('button',{name:'Select '+todayKey,exact:true}).click();await page.getByRole('region',{name:'Day calendar',exact:true}).waitFor();assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),todayKey);
 await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click();
 assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');
 assert.equal(await page.evaluate(()=>Boolean(document.querySelector('.note-editor').compareDocumentPosition(document.querySelector('.shensha-day'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
 const dayRegion=page.getByRole('region',{name:'Swipe day calendar',exact:true});await swipe(dayRegion,-140);assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-23');await swipe(dayRegion,140);assert.equal(await page.getByLabel('Daily note',{exact:true}).inputValue(),'Unsaved note retained through Shensha settings');await swipe(dayRegion,-140,0,page.getByLabel('Daily note',{exact:true}));assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),'2026-10-22');
 for(const key of ['1901-01-01','2100-12-31']){await page.getByLabel('Find date',{exact:true}).fill(key);await page.getByRole('button',{name:'Show date',exact:true}).click();assert.equal(await page.getByRole('button',{name:(key.startsWith('1901')?'Previous':'Next')+' day',exact:true}).isDisabled(),true)}
 await page.getByRole('button',{name:'Today',exact:true}).click();assert.equal(await page.locator('.focused-day').getAttribute('data-focused-date'),todayKey);
 await viewButtons.getByRole('button',{name:'Month',exact:true}).click();
 await page.getByLabel('Find date',{exact:true}).fill('2026-10-22');await page.getByRole('button',{name:'Show date',exact:true}).click();
 assert.equal(await page.getByRole('region',{name:'Upcoming Shensha matches'}).count(),0);
 await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByText('Saved on this device.',{exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await day();assert.ok(await page.locator('[data-shensha=kongwang]').count()>0);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await page.locator('.shensha-day').screenshot({path:'/tmp/calendar-shensha-desktop.png'});await page.setViewportSize({width:390,height:844});await page.locator('.shensha-day').screenshot({path:'/tmp/calendar-shensha-mobile.png'});
 // Another tab saves while this tab has a draft: refuse to overwrite its settings.
 await page.getByRole('button',{name:'Settings',exact:true}).click();await picker('天德').locator('summary').click();assert.equal(await page.getByRole('checkbox',{name:'天德 命',exact:true}).isChecked(),true);await page.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Shanghai');const peer=await context.newPage();await peer.goto(url);await peer.getByRole('button',{name:'Settings',exact:true}).click();await peer.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Kathmandu');await peer.getByRole('button',{name:'Save Shensha selections'}).click();await page.getByRole('button',{name:'Save Shensha selections'}).click();await page.getByText('Saved selections changed in another tab. Load saved selections before editing again.',{exact:true}).waitFor();
 // Storage failure retains current selections and draft, with an honest error.
 await peer.getByLabel('Calculation time zone',{exact:true}).fill('Asia/Shanghai');await peer.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Synthetic storage failure')}});await peer.getByRole('button',{name:'Save Shensha selections'}).click();await peer.getByText('Synthetic storage failure',{exact:true}).waitFor();assert.equal(await peer.getByLabel('Calculation time zone',{exact:true}).inputValue(),'Asia/Shanghai');
 assert.deepEqual(errors,[]);console.log('PASS: Sunday-first Week, seven equal columns, tap-to-Day, note-first layout, hidden empty Shensha, swipes, Today, boundaries, editor protection, manual strengths, hidden future controls, saved Shensha selection, pillar/hour matches, Kongwang, reload, note draft preservation, 320/390/1280 layouts, concurrent-save guard and storage failure.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exit(1)});
