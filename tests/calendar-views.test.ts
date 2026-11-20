import {test} from 'node:test'
import assert from 'node:assert/strict'
import {shiftView} from '../src/calendarNavigation.ts'
const d=(y:number,m:number,day:number)=>new Date(y,m-1,day,12)
test('view navigation clamps month lengths, leap years, and supported limits',()=>{
 assert.equal(shiftView(d(2024,1,31),'month',1).getDate(),29)
 assert.equal(shiftView(d(2024,2,29),'year',1).getDate(),28)
 assert.equal(shiftView(d(2026,3,7),'week',1).getDate(),14)
 assert.equal(shiftView(d(2026,12,31),'day',1).getFullYear(),2027)
 assert.equal(shiftView(d(1901,1,1),'week',-1).getTime(),d(1901,1,1).getTime())
 assert.equal(shiftView(d(2100,12,31),'year',1).getTime(),d(2100,12,31).getTime())
})
