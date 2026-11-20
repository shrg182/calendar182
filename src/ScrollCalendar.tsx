import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {dateKey,dateLabels} from './calendar'
import {contextForDate,evaluate,items,originLabels} from './shensha'
import type {ShenshaSettings} from './shensha'
export type ScrollPosition={top:number;anchor:string}
export type ScrollMemory={get:(view:'day'|'week')=>ScrollPosition|undefined;set:(view:'day'|'week',value:ScrollPosition)=>void}
const base=Date.UTC(1901,0,1),last=Math.round((Date.UTC(2100,11,31)-base)/86400000),offset=new Date(1901,0,1).getDay()
const ordinal=(d:Date)=>Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-base)/86400000)
function civil(n:number){const d=new Date(base+n*86400000);return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12)}
const full=new Intl.DateTimeFormat('en-US',{dateStyle:'full'})
export function ScrollCalendar({view,date,today,settings,note,onDate,memory}:{view:'day'|'week';date:Date;today:Date;settings:ShenshaSettings;note:(date:Date)=>string;onDate:(date:Date)=>void;memory:ScrollMemory}){
 const element=useRef<HTMLDivElement>(null),[top,setTop]=useState(0),[viewport,setViewport]=useState(520)
 useEffect(()=>{const el=element.current!;const observer=new ResizeObserver(()=>setViewport(el.clientHeight));observer.observe(el);return()=>observer.disconnect()},[])
 const height=view==='day'?260:250,total=view==='day'?last+1:Math.floor((last+offset)/7)+1
 const indexFor=(d:Date)=>Math.max(0,Math.min(total-1,view==='day'?ordinal(d):Math.floor((ordinal(d)+offset)/7)))
 const anchor=dateKey(date)
 useLayoutEffect(()=>{const el=element.current!;const saved=memory.get(view);const next=saved?.anchor===anchor?saved.top:indexFor(date)*height;el.scrollTop=next;setTop(el.scrollTop);memory.set(view,{top:el.scrollTop,anchor})},[anchor,view]) // eslint-disable-line react-hooks/exhaustive-deps
 const visible=Math.min(total-1,Math.floor(top/height)),first=Math.max(0,visible-2),end=Math.min(total,visible+6)
 const rows=useMemo(()=>Array.from({length:end-first},(_,i)=>{const index=first+i,start=view==='day'?index:index*7-offset;const dates=Array.from({length:view==='day'?1:7},(_,j)=>start+j).filter(n=>n>=0&&n<=last).map(civil);return {index,dates}}),[first,end,view])
 function jump(index:number){const el=element.current!;el.scrollTop=Math.max(0,Math.min(total-1,index))*height;setTop(el.scrollTop);memory.set(view,{top:el.scrollTop,anchor})}
 const visibleDate=civil(Math.max(0,view==='day'?visible:visible*7-offset))
 return <><div className="toolbar scroll-toolbar"><h2>{view==='day'?full.format(visibleDate):`Week of ${dateKey(visibleDate)}`}</h2><div className="navigation"><button aria-label={`Previous ${view}`} disabled={visible===0} onClick={()=>{jump(visible-1);if(view==='day')onDate(civil(visible-1))}}>‹</button><button onClick={()=>jump(indexFor(today))}>Today</button><button aria-label={`Next ${view}`} disabled={visible===total-1} onClick={()=>{jump(visible+1);if(view==='day')onDate(civil(visible+1))}}>›</button></div></div>
 <p className="scroll-hint">Scroll up or down for earlier or later {view==='day'?'days':'weeks'}. Select a date to open details below.</p>
 <div ref={element} className="calendar-scroll" tabIndex={0} role="region" aria-label={`Scrollable ${view} calendar`} onScroll={event=>{const value=event.currentTarget.scrollTop;setTop(value);memory.set(view,{top:value,anchor})}}>
 <div style={{height:total*height+Math.max(0,viewport-height),position:'relative'}}>{rows.map(({index,dates})=><section key={index} className={`scroll-period scroll-${view}`} data-period={dateKey(dates[0])} style={{position:'absolute',top:index*height,height,width:'100%'}}>
 {view==='week'?<><h3>{dateKey(dates[0])} – {dateKey(dates.at(-1)!)}</h3><div className="scroll-week-days">{dates.map(d=><button key={dateKey(d)} onClick={()=>onDate(d)} aria-label={`Open ${dateKey(d)}`} aria-current={dateKey(d)===dateKey(today)?'date':undefined}><small>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</small><strong>{d.getMonth()+1}/{d.getDate()}</strong><small>{dateLabels(d).compact}</small>{note(d)&&<span aria-label="Note available">●</span>}</button>)}</div></>:<DayCard date={dates[0]} settings={settings} text={note(dates[0])} onDate={onDate}/>}
 </section>)}</div></div></>
}
function DayCard({date,settings,text,onDate}:{date:Date;settings:ShenshaSettings;text:string;onDate:(date:Date)=>void}){
 const result=useMemo(()=>evaluate(contextForDate(date,settings.zone),settings.selections),[date,settings])
 const found=items.filter(([id])=>result.counts[id]>0)
 return <><button className="day-card-open" onClick={()=>onDate(date)} aria-label={`Open ${dateKey(date)}`}>{full.format(date)}</button><p className="card-lunar">{dateLabels(date).lunar} · {dateLabels(date).special.join(' · ')}</p>
 <div className="card-matches" aria-label="Shensha summary">{result.inactive&&<span>空亡 · inactive</span>}{!found.length&&<span>No Shensha matches</span>}{found.map(([id,name,kind])=><span key={id} className={`summary-badge ${kind} strength-${settings.selections[id].origin||'unclassified'} ${result.inactive?'inactive':''}`}>{name} · {originLabels[settings.selections[id].origin||'unclassified']}</span>)}</div>
 <p className="card-note">{text?`Note: ${text}`:'No note'} </p><small>Open the date for all matches and note editing.</small></>
}
