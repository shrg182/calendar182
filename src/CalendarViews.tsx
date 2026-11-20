import {HorizontalCalendar} from './HorizontalCalendar'
import type {ReactNode} from 'react'
import type {ShenshaSettings} from './shensha'
import {dateKey,dateLabels,lunarLabel,monthDates} from './calendar'
import type {CalendarView} from './calendarNavigation'
const full=new Intl.DateTimeFormat('en-US',{dateStyle:'full'})
const monthTitle=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'})
const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const min=new Date(1901,0,1,12),max=new Date(2100,11,31,12)
export function CalendarViews({view,date,selected,today,hasNote,onView,onDate,onMove,onToday,settings,note,details}:{settings:ShenshaSettings;note:(date:Date)=>string;details:ReactNode;view:CalendarView;date:Date;selected:Date|null;today:Date;hasNote:(date:Date)=>boolean;onView:(view:CalendarView,date?:Date)=>void;onDate:(date:Date)=>void;onMove:(delta:number)=>void;onToday:()=>void}){
 const start=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);start.setDate(start.getDate()-start.getDay())
 const week=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d<min||d>max?null:d})
 const heading=view==='year'?String(date.getFullYear()):view==='month'?monthTitle.format(date):view==='day'?full.format(date):`${dateKey(week.find(d=>d) as Date)} – ${dateKey(week.filter(d=>d).at(-1) as Date)}`
 function cells(dates:(Date|null)[],compact=false){return <><div className="weekdays" aria-hidden="true">{weekdays.map(d=><span key={d}>{d}</span>)}</div><div className={`dates ${view==='week'?'week-dates':''}`}>{dates.map((d,i)=>d?<button key={dateKey(d)} className={`date ${selected&&dateKey(d)===dateKey(selected)?'selected':''}`} aria-label={`${full.format(d)}, ${lunarLabel(d)}`} aria-current={dateKey(d)===dateKey(today)?'date':undefined} onClick={()=>onDate(d)}><span>{view==='week'?`${d.getMonth()+1}/${d.getDate()}`:d.getDate()}{hasNote(d)&&<span className="note-dot" aria-label="Saved note"> •</span>}</span>{!compact&&<small lang="zh-CN" className={dateLabels(d).special.length?'special':undefined}>{dateLabels(d).compact}</small>}</button>:<span key={`blank-${i}`}/>)}</div></>}
 const atStart=view==='year'?date.getFullYear()===1901:view==='month'?date.getFullYear()===1901&&date.getMonth()===0:view==='week'?start<=min:dateKey(date)===dateKey(min)
 const atEnd=view==='year'?date.getFullYear()===2100:view==='month'?date.getFullYear()===2100&&date.getMonth()===11:view==='week'?new Date(start.getFullYear(),start.getMonth(),start.getDate()+6,12)>=max:dateKey(date)===dateKey(max)
 return <section className="panel calendar-panel" aria-label={`${view[0].toUpperCase()+view.slice(1)} calendar`}>
 <div className="view-switch" role="group" aria-label="Calendar view">{(['year','month','week','day'] as const).map(v=><button key={v} aria-pressed={v===view} onClick={()=>onView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>
 {(view==='month'||view==='year')&&<div className="toolbar"><h2 aria-live="polite">{heading}</h2><div className="navigation"><button aria-label={`Previous ${view}`} disabled={atStart} onClick={()=>onMove(-1)}>‹</button><button onClick={onToday}>Today</button><button aria-label={`Next ${view}`} disabled={atEnd} onClick={()=>onMove(1)}>›</button></div></div>}
 {view==='year'?<div className="year-months">{Array.from({length:12},(_,m)=><section key={m} className="year-month"><h3><button onClick={()=>onView('month',new Date(date.getFullYear(),m,1,12))}>{monthTitle.format(new Date(date.getFullYear(),m,1))}</button></h3>{cells(monthDates(date.getFullYear(),m),true)}</section>)}</div>:view==='month'?cells(monthDates(date.getFullYear(),date.getMonth())):<HorizontalCalendar key={view+dateKey(date)} view={view} date={date} selected={selected} today={today} settings={settings} note={note} onDate={onDate} details={details}/>}
 </section>
}
