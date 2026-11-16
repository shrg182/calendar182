import {useState} from 'react'
import type {Note} from './notes'
export function NoteSearch({notes,onOpen}:{notes:Record<string,Note>;onOpen:(key:string)=>void}){
  const [query,setQuery]=useState('')
  const term=query.trim().toLocaleLowerCase()
  const matches=term?Object.values(notes).filter(note=>!note.deleted&&note.text.toLocaleLowerCase().includes(term)).sort((a,b)=>b.date.localeCompare(a.date)):[]
  return <section className="note-search" aria-labelledby="search-heading"><h2 id="search-heading">Search saved notes</h2><label htmlFor="search-notes">Note text</label><input id="search-notes" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search this device’s saved notes"/>{term&&<><p role="status">{matches.length} matching notes{matches.length>20?' · showing the first 20':''}.</p><ul>{matches.slice(0,20).map(note=>{const start=Math.max(0,note.text.toLocaleLowerCase().indexOf(term)-40);return <li key={note.date}><button onClick={()=>onOpen(note.date)}><strong>{note.date}</strong><span>{start>0?'…':''}{note.text.slice(start,start+160)}{note.text.length>start+160?'…':''}</span></button></li>})}</ul></>}</section>
}
