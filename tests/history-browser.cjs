const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:4173/calendar182/');await page.locator('.date').first().click();
  const editor=page.getByRole('textbox',{name:'Daily note'});
  async function save(text){await editor.fill(text);await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved on this device.'}).waitFor()}
  async function chooseOriginal(){
   if(await page.locator('.history').getAttribute('open')===null)await page.locator('.history summary').click();
   const option=page.locator('#note-version option').filter({hasText:'Original text'}).first();await option.waitFor({state:'attached'});
   await page.getByLabel('Previous saved version').selectOption(await option.getAttribute('value'));
  }
  await save('Original text\n第二行');await save('Latest text');
  await chooseOriginal();await page.getByRole('button',{name:'Use this version',exact:true}).click();
  assert.equal(await editor.inputValue(),'Original text\n第二行');
  page.once('dialog',dialog=>dialog.accept());await page.reload();await page.locator('.date').first().click();
  assert.equal(await editor.inputValue(),'Latest text');
  await chooseOriginal();await editor.fill('Unsaved draft');
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Use this version',exact:true}).click();
  assert.equal(await editor.inputValue(),'Unsaved draft');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Use this version',exact:true}).click();
  await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved on this device.'}).waitFor();
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete note',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Deleted on this device.'}).waitFor();
  await chooseOriginal();await page.getByRole('button',{name:'Use this version',exact:true}).click();
  await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved on this device.'}).waitFor();
  await page.reload();await page.locator('.date').first().click();assert.equal(await editor.inputValue(),'Original text\n第二行');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS: history preview, restore as draft, explicit save, protect unsaved draft, deleted-note recovery, reload, mobile layout');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
