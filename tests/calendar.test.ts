import {test} from 'node:test'
import assert from 'node:assert/strict'
import {monthDates,dateKey} from '../src/calendar.ts'
test('leap February has complete Sunday-first rows',()=>{
 const cells=monthDates(2024,1)
 assert.equal(cells.length%7,0)
 assert.equal(cells.findIndex(Boolean),4)
 const dates=cells.filter((d):d is Date=>d!==null)
 assert.equal(dates.length,29)
 assert.equal(dateKey(dates.at(-1)!),'2024-02-29')
})
test('century leap years and supported edges',()=>{
 assert.equal(monthDates(2100,1).filter(Boolean).length,28)
 assert.equal(monthDates(2000,1).filter(Boolean).length,29)
 assert.doesNotThrow(()=>monthDates(1901,0))
 assert.doesNotThrow(()=>monthDates(2100,11))
 assert.throws(()=>monthDates(1900,11),RangeError)
 assert.throws(()=>monthDates(2101,0),RangeError)
})
test('DST months retain unique civil dates',()=>{
 for(const month of [2,10]){
 const dates=monthDates(2026,month).filter((d):d is Date=>d!==null)
 assert.equal(new Set(dates.map(dateKey)).size,dates.length)
 assert.equal(dates.length,month===2?31:30)
 }
})
