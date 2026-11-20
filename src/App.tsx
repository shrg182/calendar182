import type {ScrollMemory,ScrollPosition} from './ScrollCalendar'
import {CalendarViews} from './CalendarViews'
import {shiftView} from './calendarNavigation'
import type {CalendarView} from './calendarNavigation'
import {useContext,useState} from 'react'
import {dateKey,dateLabels,lunarLabel,MIN_YEAR,MAX_YEAR} from './calendar'
import {NoteSearch} from './NoteSearch'
import {NoteHistory} from './NoteHistory'
import {BackupImport} from './BackupImport'
import {useNotes} from './useNotes'
import {StorageSettings} from './StorageSettings'
import {ComputerStorageContext} from './computerStorageContext'
import {useShensha} from './useShensha'
import {ShenshaSettingsPanel,ShenshaDay} from './ShenshaPanel'
import './App.css'
const fullDate=new Intl.DateTimeFormat('en-US',{dateStyle:'full'})
const computerStaging=import.meta.env.VITE_COMPUTER_SYNC==='1'
export default function App(){
  const [scrollMemory]=useState<ScrollMemory>(()=>{const values:Partial<Record<'day'|'week',ScrollPosition>>={};return {get:view=>values[view],set:(view,value)=>{values[view]=value}}})
  const notebook=useNotes()
  const shensha=useShensha()
  const computerStorage=useContext(ComputerStorageContext)
  const [today]=useState(()=>new Date())
  const [shown,setShown]=useState(()=>new Date(today.getFullYear(),today.getMonth(),today.getDate(),12))
  const [selected,setSelected]=useState<Date|null>(null)
  const [settings,setSettings]=useState(false)
  const [findDate,setFindDate]=useState(()=>dateKey(new Date()))
  const [view,setView]=useState<CalendarView>('month')
  function openDate(date:Date){if(view==='month'||view==='year')setShown(date);setSelected(date);if(view==='day'||view==='week')requestAnimationFrame(()=>{const details=document.querySelector<HTMLElement>('.details');details?.focus({preventScroll:true});details?.scrollIntoView({block:'start'})})}
  function changeView(next:CalendarView,date?:Date){setView(next);if(date)setShown(date);if(next==='day'&&!selected)setSelected(date||shown)}
  function move(delta:number){const date=shiftView(shown,view,delta);setShown(date);setSelected(view==='day'?date:null)}
  return <div className="app">
    <header><a className="brand" href="#" onClick={()=>setSettings(false)}><span aria-hidden="true">◫</span> Calendar</a><button onClick={()=>setSettings(!settings)} aria-expanded={settings}>{settings?'Back to calendar':'Settings'}</button></header>
    <main>{settings && <h1 className="settings-title">Settings</h1>}
    <p className="preview">Development preview</p>
    {settings?<section className="panel"><h2>Data & synchronization</h2><StorageSettings/><p>{computerStaging?(computerStorage?.enabled?'Test notes are saved on this device and synchronized with your computer. Export a backup before clearing browser data.':'Computer sync is paused. Notes and pending edits stay on this device. Export a backup before clearing browser data.'):'Notes are saved on this device only. No cloud service is connected. Export a backup before clearing browser data or changing devices.'}</p><button disabled={!notebook.ready || notebook.busy} onClick={()=>void notebook.backup()}>Export notes backup</button><p>Backups contain plain-text notes and previous saved versions. Unsaved drafts are not exported. Save all drafts before importing. Import keeps existing notes unless you choose replacement.</p><BackupImport notes={notebook.notes} disabled={!notebook.ready || notebook.busy || notebook.dirty} restore={notebook.restore}/>{notebook.dirty && <p>Save all unsaved notes before importing.</p>}<NoteSearch notes={notebook.notes} onOpen={key=>{const [year,month,day]=key.split('-').map(Number);setSelected(new Date(year,month-1,day,12));setShown(new Date(year,month-1,day,12));setSettings(false)}}/><ShenshaSettingsPanel model={shensha}/><h2>About Calendar</h2><p>Calendar182 is an independent application. The existing Health Calendar remains separate.</p><h2>Help</h2><p>Date range: 1901–2100.</p><p>Chinese lunar dates, traditional festivals and solar terms use the UTC+8 calendar reference. Today and Gregorian dates follow your device. Festival labels do not indicate official days off.</p></section>:<>
      <CalendarViews settings={shensha.saved} memory={scrollMemory} note={date=>notebook.drafts[dateKey(date)]??(notebook.notes[dateKey(date)]?.deleted?'':notebook.notes[dateKey(date)]?.text||'')} view={view} date={shown} selected={selected} today={today} hasNote={date=>Boolean(notebook.notes[dateKey(date)]&&!notebook.notes[dateKey(date)].deleted)} onView={changeView} onDate={openDate} onMove={move} onToday={()=>{setShown(today);setSelected(view==='day'?today:null)}}/>
      <form className="find-date" onSubmit={event=>{event.preventDefault();const [year,month,day]=findDate.split('-').map(Number);const date=new Date(year,month-1,day,12);if(dateKey(date)!==findDate || year<MIN_YEAR || year>MAX_YEAR)return;setShown(new Date(year,month-1,day,12));setSelected(date)}}><label htmlFor="find-date">Find date</label><input id="find-date" type="date" required min="1901-01-01" max="2100-12-31" value={findDate} onChange={event=>setFindDate(event.target.value)}/><button type="submit">Show date</button></form>
      {selected?<section tabIndex={-1} className="panel details" aria-live="polite">{(view==='day'||view==='week')&&<button onClick={()=>{document.querySelector('.calendar-panel')?.scrollIntoView({block:'start'});document.querySelector<HTMLElement>('.calendar-scroll')?.focus({preventScroll:true})}}>Back to calendar list</button>}<span className="eyebrow">DAY DETAILS</span><h2>{fullDate.format(selected)}</h2><p lang="zh-CN">{lunarLabel(selected)}</p>{dateLabels(selected).special.length>0 && <p lang="zh-CN" className="special-detail">{dateLabels(selected).special.join(' · ')}</p>}<ShenshaDay date={selected} settings={shensha.saved} onSettings={()=>setSettings(true)}/><div className="note-editor"><label htmlFor="daily-note">Daily note</label><textarea id="daily-note" maxLength={20000} rows={6} disabled={!notebook.ready || notebook.busy} value={notebook.drafts[dateKey(selected)]??(notebook.notes[dateKey(selected)]?.deleted?'':notebook.notes[dateKey(selected)]?.text||'')} onChange={event=>notebook.edit(dateKey(selected),event.target.value)} /><div className="note-actions"><button disabled={!notebook.ready || notebook.busy || !(notebook.drafts[dateKey(selected)]??notebook.notes[dateKey(selected)]?.text??'').trim()} onClick={()=>void notebook.save(dateKey(selected))}>Save note</button><button disabled={!notebook.ready || notebook.busy || !notebook.notes[dateKey(selected)] || notebook.notes[dateKey(selected)].deleted} onClick={()=>{if(window.confirm('Delete this saved note?'))void notebook.save(dateKey(selected),true)}}>Delete note</button></div><p className="hint">{computerStaging?(computerStorage?.enabled?'Saved locally, then synced with your computer while this page is open. Save before closing; unsaved drafts remain on this device.':'Computer sync is paused. Saved edits stay on this device until you resume sync. Save before closing.'):'Saved on this device only. Save before closing; unsaved drafts stay available while navigating this page.'}</p><NoteHistory key={dateKey(selected)} date={dateKey(selected)} revision={notebook.notes[dateKey(selected)]?.operationId||''} disabled={!notebook.ready || notebook.busy} dirty={(notebook.drafts[dateKey(selected)]??'')!==(notebook.notes[dateKey(selected)]?.deleted?'':notebook.notes[dateKey(selected)]?.text||'') && notebook.drafts[dateKey(selected)]!==undefined} onRestore={text=>notebook.edit(dateKey(selected),text)}/></div></section>:<p className="hint">Select a date to see its details.</p>}
    </>}
    <p role="status">{notebook.status}</p>{notebook.dirty&&notebook.peerChanged&&<p role="status">Saved notes changed in another tab. Your unsaved draft is kept here; save it explicitly when ready.</p>}</main><footer>Calendar <span>Gregorian + Lunar</span></footer>
  </div>
}
