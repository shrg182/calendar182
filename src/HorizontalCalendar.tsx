import {useMemo,useRef,useState} from 'react'
import type {ReactNode,PointerEvent,WheelEvent} from 'react'
import {dateKey,dateLabels} from './calendar'
import {shiftView} from './calendarNavigation'
import {contextForDate,evaluate,items,originLabels} from './shensha'
import type {ShenshaSettings} from './shensha'
const full=new Intl.DateTimeFormat('en-US',{dateStyle:'full'})
const short=new Intl.DateTimeFormat('en-US',{weekday:'short'})
const min=new Date(1901,0,1,12),lastStart=new Date(2100,11,25,12)
function startFor(d:Date){const start=shiftView(d,'day',-3);return start>lastStart?lastStart:start}
export function HorizontalCalendar({view,date,selected,today,settings,note,onDate,details}:{view:'day'|'week';date:Date;selected:Date|null;today:Date;settings:ShenshaSettings;note:(date:Date)=>string;onDate:(date:Date)=>void;details:ReactNode}){
 const active=selected||date
 const [start,setStart]=useState(()=>startFor(date))
 const pointer=useRef<{x:number;y:number;id:number}|null>(null),wheelTime=useRef(0),ignoreClick=useRef(false)
 const dates=useMemo(()=>Array.from({length:7},(_,i)=>shiftView(start,'day',i)),[start])
 const atStart=view==='day'?dateKey(active)==='1901-01-01':start<=min
 const atEnd=view==='day'?dateKey(active)==='2100-12-31':start>=lastStart
 function move(delta:number){if(delta<0?atStart:atEnd)return;if(view==='week'){const next=shiftView(start,'day',delta);setStart(next);const shifted=shiftView(active,'day',delta),end=shiftView(next,'day',6);onDate(shifted<next?next:shifted>end?end:shifted)}else onDate(shiftView(active,'day',delta))}
 function interactive(target:EventTarget|null){return target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable="true"],.note-editor,.history'))}
 function down(e:PointerEvent){if(interactive(e.target)||e.button!==0)return;pointer.current={x:e.clientX,y:e.clientY,id:e.pointerId};ignoreClick.current=false}
 function up(e:PointerEvent){const p=pointer.current;pointer.current=null;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ignoreClick.current=true;move(dx<0?1:-1)}}
 function wheel(e:WheelEvent){if(interactive(e.target)||Math.abs(e.deltaX)<25||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;const now=Date.now();if(now-wheelTime.current>450){wheelTime.current=now;move(e.deltaX>0?1:-1)}}
 return <div className={`horizontal-calendar horizontal-${view}`}>
 <div className="toolbar horizontal-toolbar"><h2 aria-live="polite">{view==='day'?full.format(active):`${dateKey(start)} – ${dateKey(dates[6])}`}</h2><div className="navigation"><button aria-label={`Previous ${view}`} disabled={atStart} onClick={()=>move(-1)}>‹</button><button onClick={()=>{setStart(startFor(today));onDate(today)}}>Today</button><button aria-label={`Next ${view}`} disabled={atEnd} onClick={()=>move(1)}>›</button></div></div>
 <p className="swipe-hint">Swipe left for the next day, right for the previous day. {view==='week'?'The seven-day window moves one day at a time.':'Scroll vertically to read this day.'}</p>
 <div className="horizontal-swipe" role="region" aria-label={`Swipe ${view} calendar`} tabIndex={0} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{pointer.current=null}} onWheel={wheel} onClickCapture={e=>{if(ignoreClick.current){ignoreClick.current=false;e.preventDefault();e.stopPropagation()}}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1)}}}>
 {view==='week'&&<div className="rolling-week">{dates.map(d=><article key={dateKey(d)} className={`week-column ${dateKey(d)===dateKey(active)?'chosen':''}`} data-date={dateKey(d)}><button aria-label={`Select ${dateKey(d)}`} aria-pressed={dateKey(d)===dateKey(active)} aria-current={dateKey(d)===dateKey(today)?'date':undefined} onClick={()=>onDate(d)}><small>{short.format(d)}</small><strong>{d.getMonth()+1}/{d.getDate()}</strong><small className="week-lunar">{dateLabels(d).compact}</small>{note(d)&&<span aria-label="Note available">●</span>}</button><div className="week-preview"><MatchPreview date={d} settings={settings}/><p className="week-note">{note(d)||'No note'}</p></div></article>)}</div>}
 <div className="focused-day" data-focused-date={dateKey(active)}>{details}</div>
 </div></div>
}
function MatchPreview({date,settings}:{date:Date;settings:ShenshaSettings}){
 const result=useMemo(()=>evaluate(contextForDate(date,settings.zone),settings.selections),[date,settings]);const found=items.filter(([id])=>result.counts[id]>0)
 return <div className="week-matches">{result.inactive&&<small>空亡 · inactive</small>}{!found.length&&<small>No Shensha matches</small>}{found.map(([id,name,kind])=><span key={id} className={`summary-badge ${kind} strength-${settings.selections[id].origin||'unclassified'} ${result.inactive?'inactive':''}`}>{name}<br/>{originLabels[settings.selections[id].origin||'unclassified']}</span>)}</div>
}
