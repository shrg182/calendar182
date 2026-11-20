import {test} from 'node:test'
import assert from 'node:assert/strict'
import {contextForDate,dayPillar,emptySettings,evaluate,items,matches,targetsFor,validateSettings,termsForYear,noon} from '../src/shensha.ts'
const date=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12)}
test('reference pillar example and civil-midnight split Zi hours',()=>{
 const c=contextForDate(date('2026-10-22'),'America/Detroit')
 assert.equal(c.year.pillar,'丙午');assert.equal(c.month.pillar,'戊戌');assert.equal(c.day.pillar,'己巳')
 assert.equal(c.hours.find(h=>h.startMinute===660)?.pillar,'庚午')
 assert.equal(c.hours[0].pillar,c.hours.at(-1)?.pillar)
 assert.equal(c.hours[0].startMinute,0);assert.equal(c.hours.at(-1)?.endMinute,1440)
 assert.notEqual(dayPillar(date('2026-10-22')),dayPillar(date('2026-10-23')))
})
test('target restrictions, disabled items and duplicate target normalization',()=>{
 assert.equal(items.length,21);assert.equal(targetsFor('tianyi').length,12)
 assert.deepEqual(targetsFor('tianluodiwang'),['戌','亥','辰','巳'])
 assert.equal(targetsFor('shie').length,10);assert.equal(targetsFor('yinyang').length,12)
 assert.equal(targetsFor('custom1').length,82);assert.equal(targetsFor('tiande').length,22)
 const s=emptySettings();s.selections.tianyi={enabled:true,targets:['巳','巳']}
 assert.deepEqual(validateSettings(s).selections.tianyi.targets,['巳'])
 s.selections.tianyi.targets=['甲'];assert.throws(()=>validateSettings(s))
 s.selections.tianyi.targets=[];assert.throws(()=>validateSettings(s))
 assert.deepEqual(matches('甲子',emptySettings().selections),[])
 assert.throws(()=>validateSettings({...emptySettings(),zone:'Not/AZone'}))
})
test('repeat counts use pillars not target count; hour strengthening is per item',()=>{
 const c=contextForDate(date('2026-10-22'),'America/Detroit');c.year.pillar='甲子';c.month.pillar='乙丑';c.day.pillar='丙寅'
 const s=emptySettings().selections
 s.custom1={enabled:true,targets:['甲','子','甲子','乙','丑']}
 s.custom2={enabled:true,targets:['丙','寅']}
 const r=evaluate(c,s);assert.equal(r.counts.custom1,2);assert.equal(r.counts.custom2,1)
 assert.ok(r.hours.some(h=>h.found.includes('custom1')))
 assert.ok(r.hours.every(h=>!h.found.includes('custom2')))
})
test('Kongwang suppresses the whole date only when a baseline pillar matches',()=>{
 const c=contextForDate(date('2026-10-22'),'America/Detroit'),s=emptySettings().selections
 s.kongwang={enabled:true,targets:['子']};assert.equal(evaluate(c,s).inactive,false)
 assert.ok(evaluate(c,s).hours.every(h=>!h.found.includes('kongwang')))
 s.kongwang.targets=['巳'];assert.equal(evaluate(c,s).inactive,true)
})
test('noon solar-boundary rule and supported date edges',()=>{
 const spring=termsForYear(2026).find(t=>t.offset===0)!
 for(const zone of ['Asia/Shanghai','America/Detroit','Pacific/Kiritimati','Pacific/Honolulu']){
  for(const key of ['2026-02-03','2026-02-04','2026-02-05']){
   const d=date(key),c=contextForDate(d,zone)
   assert.equal(c.year.pillar,noon(d,zone)>=spring.instant?'丙午':'乙巳')
  }
 }
 for(const key of ['1901-01-01','2100-12-31','2024-02-29','2026-03-08','2026-11-01']){
  const c=contextForDate(date(key),'America/Detroit');assert.equal(c.hours.length,13)
  assert.ok(c.year.start<=date(key)&&date(key)<=c.year.end)
  assert.ok(c.month.start<=date(key)&&date(key)<=c.month.end)
 }
 assert.throws(()=>contextForDate(date('1900-12-31')))
})
