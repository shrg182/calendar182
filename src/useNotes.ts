import {useEffect,useState} from 'react'
import {noteStore} from './storage'
import type {ImportData,Note} from './notes'
const {readNotes,saveNote,exportBackup,importNotes}=noteStore
export function useNotes(){
  const [notes,setNotes]=useState<Record<string,Note>>({})
  const [drafts,setDrafts]=useState<Record<string,string>>({})
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false)
  const [status,setStatus]=useState('Loading notes…')
  const [peerChanged,setPeerChanged]=useState(false)
  useEffect(()=>{
    let active=true
    const refresh=()=>readNotes().then(rows=>{if(active){setNotes(Object.fromEntries(rows.map(note=>[note.date,note])));setReady(true);setStatus(previous=>previous==='Loading notes…'?'':previous)}}).catch(()=>{if(active)setStatus('Notes could not be opened. Reload to retry.')})
    void refresh()
    window.addEventListener('calendar-notes-changed',refresh)
    const unsubscribe=noteStore.subscribe((kind,external)=>{if(kind==='saved'||kind==='notes'||kind==='refresh'){void refresh();if(external&&kind!=='refresh')setPeerChanged(true)}})
    return ()=>{active=false;unsubscribe();window.removeEventListener('calendar-notes-changed',refresh)}
  },[])
  const dirty=Object.entries(drafts).some(([key,text])=>text!==(notes[key]?.deleted?'':notes[key]?.text||''))
  useEffect(()=>{
    const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    if(dirty||busy) window.addEventListener('beforeunload',protect)
    return ()=>window.removeEventListener('beforeunload',protect)
  },[dirty,busy])
  function edit(key:string,text:string){setDrafts(previous=>({...previous,[key]:text}));setStatus('Unsaved changes');setPeerChanged(false)}
  async function save(key:string,deleted=false){
    if(busy||!ready)return
    const text=drafts[key]??(notes[key]?.deleted?'':notes[key]?.text||'')
    setBusy(true);setStatus('Saving…')
    try{
      const note=await saveNote(key,text,deleted)
      setNotes(previous=>({...previous,[key]:note}))
      setDrafts(previous=>{const next={...previous};if(deleted||next[key]===text)delete next[key];return next})
      setStatus(deleted?'Deleted on this device. Previous versions are retained for backup export.':'Saved on this device.')
      setPeerChanged(false)
      window.dispatchEvent(new Event('calendar-note-saved'))
    }catch{setStatus('Could not save. Your draft is still available; copy it before closing.')}
    finally{setBusy(false)}
  }
  async function backup(){
    if(busy||!ready)return
    setBusy(true)
    try{
      const backup=await exportBackup()
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}))
      const link=document.createElement('a');link.href=url;link.download=`calendar182-backup-${new Date().toISOString().slice(0,10)}.json`;link.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      setStatus('Backup exported. Unsaved drafts are not included.')
    }catch{setStatus('Could not export backup. Please retry.')}
    finally{setBusy(false)}
  }
  async function restore(data:ImportData,replace:boolean){
    if(busy||!ready||dirty)throw new Error('Save all drafts before importing.')
    setBusy(true)
    try{
      const count=await importNotes(data,replace)
      const rows=await readNotes()
      setNotes(Object.fromEntries(rows.map(note=>[note.date,note])))
      setDrafts({})
      setStatus(`${count} notes imported on this device.`)
      window.dispatchEvent(new Event('calendar-note-saved'))
    }catch(error){setStatus('Could not complete import. Reload to check saved notes.');throw error}
    finally{setBusy(false)}
  }
  return {notes,drafts,ready,busy,status,dirty,peerChanged,edit,save,backup,restore}
}
