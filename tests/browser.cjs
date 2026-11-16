const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/calendar182/');
  await page.getByRole('region',{name:'Month calendar'}).waitFor();
  assert.equal(await page.getByText('Your days, together.',{exact:true}).count(),0);
  const before=await page.locator('.toolbar h2').textContent();
  await page.getByRole('button',{name:'Next month',exact:true}).click();
  assert.notEqual(await page.locator('.toolbar h2').textContent(),before);
  await page.getByRole('button',{name:'Today',exact:true}).click();
  assert.equal(await page.locator('.toolbar h2').textContent(),before);
  await page.locator('.date').first().click();
  await page.getByText('DAY DETAILS',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('heading',{name:'Data & synchronization'}).waitFor();
  await page.getByRole('button',{name:'Back to calendar',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'/tmp/calendar182-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for (const key of ['2024-02-29','1901-01-01','2100-12-31']) {
   await page.getByLabel('Find date',{exact:true}).fill(key);
   await page.getByRole('button',{name:'Show date',exact:true}).click();
   const [year,month,day]=key.split('-').map(Number);
   assert.equal(await page.locator('.details h2').textContent(),new Intl.DateTimeFormat('en-US',{dateStyle:'full'}).format(new Date(year,month-1,day,12)));
  }
  assert.equal(await page.getByRole('button',{name:'Next month',exact:true}).isDisabled(),true);
  for (const width of [320,390,1280]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: production subpath, month navigation, today, details, settings, mobile/desktop overflow, no browser errors');
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
