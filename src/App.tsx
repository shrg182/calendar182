import {useState} from 'react'
import {dateKey,dateLabels,lunarLabel,monthDates,MIN_YEAR,MAX_YEAR} from './calendar'
import './App.css'
const fullDate=new Intl.DateTimeFormat('en-US',{dateStyle:'full'})
const title=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'})
export default function App(){
  const [today]=useState(()=>new Date())
  const [shown,setShown]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1,12))
  const [selected,setSelected]=useState<Date|null>(null)
  const [settings,setSettings]=useState(false)
  function move(delta:number){setShown(new Date(shown.getFullYear(),shown.getMonth()+delta,1,12));setSelected(null)}
  return <div className="app">
    <header><a className="brand" href="#" onClick={()=>setSettings(false)}><span aria-hidden="true">◫</span> Calendar</a><button onClick={()=>setSettings(!settings)} aria-expanded={settings}>{settings?'Back to calendar':'Settings'}</button></header>
    <main>{settings && <h1 className="settings-title">Settings</h1>}
    <p className="preview">Development preview · Notes, Shensha and sync are being built.</p>
    {settings?<section className="panel"><h2>Data & synchronization</h2><p>No cloud service is connected. This preview does not store personal data.</p><h2>About Calendar</h2><p>Calendar182 is an independent application. The existing Health Calendar remains separate.</p><p>Date range: 1901–2100. Chinese lunar dates, traditional festivals and solar terms use the UTC+8 calendar reference. Today and Gregorian dates follow your device.</p></section>:<>
      <section className="panel" aria-label="Month calendar"><div className="toolbar"><h2 aria-live="polite">{title.format(shown)}</h2><div className="navigation"><button aria-label="Previous month" disabled={shown.getFullYear()===MIN_YEAR && shown.getMonth()===0} onClick={()=>move(-1)}>‹</button><button onClick={()=>{setShown(new Date(today.getFullYear(),today.getMonth(),1,12));setSelected(null)}}>Today</button><button aria-label="Next month" disabled={shown.getFullYear()===MAX_YEAR && shown.getMonth()===11} onClick={()=>move(1)}>›</button></div></div>
      <div className="weekdays" aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day}>{day}</span>)}</div>
      <div className="dates">{monthDates(shown.getFullYear(),shown.getMonth()).map((date,i)=>date?<button key={dateKey(date)} className={`date ${selected && dateKey(date)===dateKey(selected)?'selected':''}`} aria-label={`${fullDate.format(date)}, ${lunarLabel(date)}, ${dateLabels(date).special.join(', ')}`} aria-current={dateKey(date)===dateKey(today)?'date':undefined} onClick={()=>setSelected(date)}><span>{date.getDate()}</span><small lang="zh-CN" className={dateLabels(date).special.length ? 'special' : undefined}>{dateLabels(date).compact}</small></button>:<span key={`blank-${i}`} />)}</div></section>
      {selected?<section className="panel details" aria-live="polite"><span className="eyebrow">DAY DETAILS</span><h2>{fullDate.format(selected)}</h2><p lang="zh-CN">{lunarLabel(selected)}</p>{dateLabels(selected).special.length>0 && <p lang="zh-CN" className="special-detail">{dateLabels(selected).special.join(' · ')}</p>}<p className="hint">Chinese calendar reference: UTC+8. Festival labels do not indicate official days off.</p><p>Notes and traditional calendar details are planned for a future update.</p></section>:<p className="hint">Select a date to see its details.</p>}
    </>}
    </main><footer>Calendar <span>Gregorian + Lunar</span></footer>
  </div>
}
