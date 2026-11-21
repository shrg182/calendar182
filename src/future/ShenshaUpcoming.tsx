import {useMemo,useState} from 'react'
import {dateKey} from '../calendar'
import {items,upcomingMatches} from '../shensha'
import type {ItemId,ShenshaSettings} from '../shensha'
const names=(ids:ItemId[])=>ids.map(id=>items.find(item=>item[0]===id)![1]).join(' · ')
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
export function ShenshaUpcoming({settings,onOpen}:{settings:ShenshaSettings;onOpen:(date:Date)=>void}){
 const [start,setStart]=useState(()=>dateKey(new Date()))
 const [end,setEnd]=useState(()=>{const d=new Date();d.setDate(d.getDate()+29);return dateKey(d)})
 const [range,setRange]=useState<{start:string;end:string}|null>(null)
 const [page,setPage]=useState(0)
 const search=useMemo(()=>{if(!range)return {rows:[],error:''};try{return {rows:upcomingMatches(range.start,range.end,settings),error:''}}catch(error){return {rows:[],error:error instanceof Error?error.message:'Unable to search dates.'}}},[range,settings])
 const current=Math.min(page,Math.max(0,Math.ceil(search.rows.length/10)-1))
 return <section className="panel shensha-upcoming" aria-label="Upcoming Shensha matches"><h2>Upcoming Shensha matches</h2>
 <p>Uses saved selections and time zone: {settings.zone||Intl.DateTimeFormat().resolvedOptions().timeZone}. Includes any year, month or day match, so year/month targets may match many dates. 空亡 is shown alongside other influences.</p>
 <form onSubmit={event=>{event.preventDefault();setRange({start,end});setPage(0)}} className="note-actions">
 <label>Start date <input type="date" required min="1901-01-01" max="2100-12-31" value={start} onChange={e=>setStart(e.target.value)}/></label>
 <label>End date <input type="date" required min="1901-01-01" max="2100-12-31" value={end} onChange={e=>setEnd(e.target.value)}/></label>
 <button type="submit">Find Shensha dates</button></form><p>Search up to 93 days, including both endpoints.</p>
 {search.error&&<p role="alert">{search.error}</p>}
 {range&&!search.error&&<><p role="status">{search.rows.length} matching dates · {range.start} – {range.end}. {search.rows.filter(row=>row.result.hasKongwang).length} with 空亡.</p>
 {!search.rows.length&&<p>No matches in this range. Enable items and save their targets in Settings, or try another range.</p>}
 <ul className="shensha-date-list">{search.rows.slice(current*10,current*10+10).map(({date,context,result})=><li key={dateKey(date)}>
 <button onClick={()=>onOpen(date)}>Open {dateKey(date)}</button>
 {result.hasKongwang&&<p className="shensha-void">空亡</p>}
 <ul>{(['year','month','day'] as const).filter(scope=>result.groups[scope].length).map(scope=><li key={scope}>{scope==='year'?'Year':scope==='month'?'Month':'Day'} {context[scope].pillar}: {names(result.groups[scope])}</li>)}</ul>
 {result.hours.some(hour=>hour.found.length)&&<details><summary>Matching hour intervals</summary><p>Local wall-clock times; an item must match at least two year/month/day pillars to appear here.</p><ul>{result.hours.filter(hour=>hour.found.length).map(hour=><li key={hour.startMinute}>{clock(hour.startMinute)}–{clock(hour.endMinute)} · {hour.pillar}: {names(hour.found)}</li>)}</ul></details>}
 </li>)}</ul>
 {search.rows.length>10&&<div className="note-actions"><button disabled={current===0} onClick={()=>setPage(current-1)}>Previous results</button><span>Page {current+1} of {Math.ceil(search.rows.length/10)}</span><button disabled={(current+1)*10>=search.rows.length} onClick={()=>setPage(current+1)}>Next results</button></div>}</>}
 </section>
}
