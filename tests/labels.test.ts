import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dateLabels} from '../src/calendar.ts'
const date=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12)}
const fixture=JSON.parse(readFileSync(new URL('./fixtures/hko-2026.json',import.meta.url),'utf8'))

test('all 365 lunar dates agree with the HKO 2026 table',()=>{
 for(const [key,month,day] of fixture.lunar){
  const label=dateLabels(date(key))
  assert.equal(label.monthName,month,key)
  assert.equal(label.dayName,day,key)
 }
})
test('all 24 solar terms agree with HKO 2026 civil dates',()=>{
 const actual=[];const names=[]
 for(const [key] of fixture.lunar){const term=dateLabels(date(key)).term;if(term){actual.push(key);names.push(term)}}
 assert.deepEqual(actual,fixture.solarTermDates)
 assert.equal(new Set(names).size,24)
 assert.equal(dateLabels(date('2026-11-22')).compact,'小雪')
 assert.equal(dateLabels(date('2026-01-20')).compact,'大寒')
})
test('traditional day and month labels, holidays, leap months and collisions',()=>{
 assert.equal(dateLabels(date('2026-11-09')).compact,'十月')
 assert.equal(dateLabels(date('2026-11-10')).compact,'初二')
 assert.equal(dateLabels(date('2026-02-17')).compact,'春节')
 assert.equal(dateLabels(date('2026-02-16')).compact,'除夕')
 assert.equal(dateLabels(date('2026-12-25')).compact,'圣诞节')
 assert.equal(dateLabels(date('2025-07-25')).compact,'闰六月')
 assert.equal(dateLabels(date('2020-10-01')).compact,'国庆节 · 中秋节')
 assert.deepEqual(dateLabels(date('2025-05-31')).special,['端午节'])
 assert.deepEqual(dateLabels(date('2025-06-30')).special,[])
})
