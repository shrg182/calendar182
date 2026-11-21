import {useEffect,useRef,useState} from 'react'
import {storageScope} from './notes'
import type {ShenshaSettings} from './shensha'
import {emptySettings,validateSettings} from './shensha'
import {isComputerSettings} from './shenshaSync'
import {useComputerShensha} from './useComputerShensha'
export function useShensha(){const computer=isComputerSettings();const remote=useComputerShensha(computer),local=useLocalShensha();return computer?remote:local}
function useLocalShensha(){
 const key=`calendar182.shensha.v1:${storageScope()}`
 const [initial]=useState(()=>{try{const raw=localStorage.getItem(key);return {raw,value:raw?validateSettings(JSON.parse(raw)):emptySettings(),error:''}}catch{return {raw:null,value:emptySettings(),error:'Saved selections could not be read. Existing storage has not been replaced.'}}})
 const raw=useRef(initial.raw)
 const [saved,setSaved]=useState(initial.value),[draft,setDraft]=useState(initial.value),[status,setStatus]=useState(initial.error)
 const dirty=JSON.stringify(saved)!==JSON.stringify(draft)
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 function save(){try{const value=validateSettings(draft);if(localStorage.getItem(key)!==raw.current)throw Error('Saved selections changed in another tab. Load saved selections before editing again.');const next=JSON.stringify(value);localStorage.setItem(key,next);raw.current=next;setSaved(value);setDraft(value);setStatus('Shensha selections saved on this device.')}catch(error){setStatus(error instanceof Error?error.message:'Could not save selections. Your changes remain here.')}}
 function reload(){if(dirty&&!window.confirm('Discard unsaved Shensha selections and load the saved selections?'))return;try{const next=localStorage.getItem(key);const value=next?validateSettings(JSON.parse(next)):emptySettings();raw.current=next;setSaved(value);setDraft(value);setStatus('Loaded saved Shensha selections.')}catch{setStatus('Saved selections could not be read. Your current selections are retained.')}}
 function checkedSaved(){
  if(dirty)throw Error('Save or load your selections before exporting or importing settings.')
  if(initial.error&&raw.current===null)throw Error('Saved selections could not be read. Load valid saved selections before proceeding.')
  if(localStorage.getItem(key)!==raw.current)throw Error('Saved selections changed in another tab. Load saved selections and review the import again.')
  return validateSettings(saved)
 }
 function importSettings(value:ShenshaSettings,expected:string){
  const current=checkedSaved()
  if(JSON.stringify(current)!==expected)throw Error('Selections changed since the preview. Choose the file again to review the current differences.')
  const next=validateSettings(value),serialized=JSON.stringify(next)
  localStorage.setItem(key,serialized)
  raw.current=serialized;setSaved(next);setDraft(next);setStatus('Shensha settings imported on this device.')
 }
 return {saved,draft,setDraft,status,dirty,save,reload,checkedSaved,importSettings,conflict:null,resolveConflict:async (_choice:'local'|'remote')=>{},computer:false,syncState:'local',busy:false,ready:true}
}
