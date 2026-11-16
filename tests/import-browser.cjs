const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:4173/calendar182/');
  await page.locator('.date').first().click();
  const editor=page.getByRole('textbox',{name:'Daily note'});
  await editor.fill('Unsaved local draft');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await page.getByLabel('Import notes backup',{exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Back to calendar',exact:true}).click();
  await page.getByRole('button',{name:'Save note',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Saved on this device.'}).waitFor();
  const key=await page.locator('.toolbar h2').textContent();
  const date=new Date(`${key} 1 12:00:00`); // Current view's first day.
  const civil=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
  const payload={app:'daymark',version:1,notes:[{date:civil,text:'Imported legacy note',createdAt:'2026-01-01T12:00:00Z',updatedAt:'2026-01-02T12:00:00Z'}]};
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const upload=async value=>page.getByLabel('Import notes backup',{exact:true}).setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await upload(payload);
  await page.getByText('1 notes ready; 1 dates already exist.',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('Dates already on this device').inputValue(),'keep');
  await page.getByRole('button',{name:'Import notes',exact:true}).click();
  await page.getByRole('status').filter({hasText:'0 notes imported'}).waitFor();
  await upload(payload);
  await page.getByLabel('Dates already on this device').selectOption('replace');
  await page.getByRole('button',{name:'Import notes',exact:true}).click();
  await page.getByRole('status').filter({hasText:'1 notes imported'}).waitFor();
  await page.getByRole('button',{name:'Back to calendar',exact:true}).click();
  assert.equal(await editor.inputValue(),'Imported legacy note');
  await page.reload();await page.locator('.date').first().click();
  assert.equal(await editor.inputValue(),'Imported legacy note');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await upload({...payload,notes:[...payload.notes,...payload.notes]});
  await page.getByRole('alert').filter({hasText:'Duplicate note dates'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Import notes',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS: draft guard, legacy upload, preview, keep default, replace, reload, invalid file, mobile layout');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
