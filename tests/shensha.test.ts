import {test} from 'node:test'
import assert from 'node:assert/strict'
import {contextForDate,dayPillar,emptySettings,evaluate,items,matches,targetsFor,validateSettings,termsForYear,noon,upcomingMatches,classifyTarget,encounteredTargets} from '../src/shensha.ts'
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

test('upcoming dates include endpoints, retain inactive matches and agree with day details across DST',()=>{
 const s=emptySettings();s.zone='America/Detroit';s.selections.tiande={enabled:true,targets:['丙']};s.selections.kongwang={enabled:true,targets:['巳']}
 const rows=upcomingMatches('2026-10-22','2026-11-02',s)
 assert.equal(rows.length,12);assert.equal(rows[0].date.getDate(),22);assert.equal(rows.at(-1)!.date.getDate(),2)
 assert.equal(rows[0].result.inactive,true)
 for(const row of rows)assert.deepEqual(row.result,evaluate(contextForDate(row.date,s.zone),s.selections))
 assert.equal(upcomingMatches('2024-02-28','2024-03-01',emptySettings()).length,0)
 assert.equal(upcomingMatches('2100-12-31','2100-12-31',s).length>=0,true)
 assert.throws(()=>upcomingMatches('2026-02-30','2026-03-01',s))
 assert.throws(()=>upcomingMatches('2026-11-02','2026-11-01',s))
 assert.throws(()=>upcomingMatches('2026-01-01','2026-04-04',s))
 assert.doesNotThrow(()=>upcomingMatches('2026-01-01','2026-04-03',s))
})

test('birth targets classify independently, with exact pair matching and incomplete-data uncertainty',()=>{
 const s=emptySettings();assert.equal(classifyTarget('申',s.birth),'unclassified')
 s.birth={year:'甲申',month:'乙丑',day:'丙寅',hour:''}
 assert.equal(classifyTarget('申',s.birth),'ming');assert.equal(classifyTarget('子',s.birth),'uncertain')
 assert.equal(classifyTarget('甲',s.birth),'ming');assert.equal(classifyTarget('甲寅',s.birth),'uncertain')
 s.birth.hour='丁卯';assert.equal(classifyTarget('子',s.birth),'yun');assert.equal(classifyTarget('甲寅',s.birth),'yun')
 s.selections.custom1={enabled:true,targets:['甲','子','甲子']}
 assert.deepEqual(encounteredTargets('甲子','custom1',s).map(t=>t.origin),['unclassified','unclassified','unclassified'])
 const {birth,...legacy}=s;assert.deepEqual(validateSettings(legacy).birth,emptySettings().birth)
 assert.deepEqual(validateSettings(legacy).selections,s.selections)
 assert.throws(()=>validateSettings({...s,birth:{...birth,hour:'甲丑'}}))
})

test('manual strength applies to every target and overrides preserved birth data',()=>{const s=emptySettings();s.birth.year='甲子';s.selections.custom1={enabled:true,targets:['甲','子'],origin:'yun'};assert.deepEqual(encounteredTargets('甲子','custom1',s).map(t=>t.origin),['yun','yun']);assert.deepEqual(validateSettings(s).birth,s.birth);assert.equal(validateSettings(s).selections.custom1.origin,'yun');assert.throws(()=>validateSettings({...s,selections:{...s.selections,custom1:{...s.selections.custom1,origin:'invalid'}}}))})
