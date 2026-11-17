import {useEffect,useState} from 'react'
import {noteStore} from './storage'
import type {Note} from './notes'
const {readNoteHistory}=noteStore
export function NoteHistory({date,revision,disabled,dirty,onRestore}:{date:string;revision:string;disabled:boolean;dirty:boolean;onRestore:(text:string)=>void}){
  const [expanded,setExpanded]=useState(false)
  const [snapshot,setSnapshot]=useState<{key:string;versions:Note[];error:string}>({key:'',versions:[],error:''})
  const [choice,setChoice]=useState('')
  const [refresh,setRefresh]=useState(0)
  useEffect(()=>noteStore.subscribe(kind=>{if(kind==='saved'||kind==='notes'||kind==='refresh')setRefresh(value=>value+1)}),[])
  const versionKey=`${date}:${revision}:${refresh}`
  const {versions,error}=snapshot
  const loading=snapshot.key!==versionKey
  useEffect(()=>{
    if(!expanded||disabled)return
    let active=true
    readNoteHistory(date).then(rows=>{if(active){setSnapshot({key:versionKey,versions:rows,error:''});setChoice(current=>rows.some(note=>note.operationId===current)?current:rows[0]?.operationId||'')}}).catch(()=>{if(active)setSnapshot({key:versionKey,versions:[],error:'History could not be loaded. Close and reopen to retry.'})})
    return ()=>{active=false}
  },[date,versionKey,expanded,disabled])
  const selected=versions.find(note=>note.operationId===choice)
  return <details className="history" onToggle={event=>setExpanded(event.currentTarget.open)}><summary>Note history</summary>
    {loading?<p>Loading previous versions…</p>:error?<p role="alert">{error}</p>:!versions.length?<p>No previous saved versions for this date.</p>:<>
      <label htmlFor="note-version">Previous saved version</label><select id="note-version" value={choice} disabled={disabled} onChange={event=>setChoice(event.target.value)}>{versions.map((note,index)=><option key={note.operationId} value={note.operationId}>{index+1}. {new Date(note.updatedAt).toLocaleString()} — {note.text.slice(0,40)}</option>)}</select>
      {selected && <><pre>{selected.text}</pre><button disabled={disabled} onClick={()=>{if(!dirty||window.confirm('Replace your unsaved draft with this saved version?')){onRestore(selected.text);document.getElementById('daily-note')?.focus()}}}>Use this version</button><p className="hint">Copies the text into your draft. Choose Save note to keep it.</p></>}
    </>}
  </details>
}
