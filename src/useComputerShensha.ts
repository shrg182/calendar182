import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {emptySettings,validateSettings} from './shensha'
import type {ShenshaSettings} from './shensha'
import {saveComputerSettings,settingsTransaction,subscribeSettings} from './shenshaSync'
import type {SettingsState} from './shenshaSync'
export function useComputerShensha(enabled:boolean){
 const [state,setState]=useState<SettingsState|null>(null),[saved,setSaved]=useState(emptySettings),[draft,setDraft]=useState(emptySettings),[status,setStatus]=useState('Loading Shensha settings…')
 const dirty=JSON.stringify(saved)!==JSON.stringify(draft),dirtyRef=useRef(dirty)
 useLayoutEffect(()=>{dirtyRef.current=dirty},[dirty])
 const generation=useRef(-1),saving=useRef(false)
 const [busy,setBusy]=useState(false)
 useEffect(()=>{
  if(!enabled)return
  let active=true
  const refresh=()=>void settingsTransaction().then(next=>{if(!active)return;setState(next);if(!dirtyRef.current){generation.current=next.generation;setSaved(next.settings);setDraft(next.settings);setStatus(next.conflict?'Shensha settings differ between devices. Review both versions below.':next.pending?'Saved Shensha settings are waiting to sync.':'Shensha settings loaded.')}}).catch(e=>{if(active)setStatus(e instanceof Error?e.message:'Could not load settings.')})
  refresh();const unsubscribe=subscribeSettings(refresh)
  return ()=>{active=false;unsubscribe()}
 },[enabled])
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 function install(next:SettingsState){generation.current=next.generation;dirtyRef.current=false;setState(next);setSaved(next.settings);setDraft(next.settings);setStatus(next.pending?'Shensha settings saved; waiting to sync.':'Shensha settings loaded.')}
 function checkedSaved(){if(!state||dirty)throw Error('Save or load your selections before exporting or importing settings.');if(state.generation!==generation.current)throw Error('Saved selections changed. Load saved selections first.');return validateSettings(saved)}
 async function persist(value:ShenshaSettings){if(!state||saving.current)throw Error('Wait for settings to finish saving.');saving.current=true;setBusy(true);try{install(await saveComputerSettings(value,generation.current))}finally{saving.current=false;setBusy(false)}}
 async function save(){try{await persist(draft)}catch(e){setStatus(e instanceof Error?e.message:'Could not save settings. Your draft is retained.')}}
 async function reload(){if(dirty&&!window.confirm('Discard unsaved Shensha selections and load the saved selections?'))return;try{install(await settingsTransaction())}catch{setStatus('Could not load saved selections.')}}
 async function importSettings(value:ShenshaSettings,expected:string){if(JSON.stringify(checkedSaved())!==expected)throw Error('Selections changed since the preview. Choose the file again.');await persist(value)}
 async function resolveConflict(choice:'local'|'remote'){
  try{if(dirty)throw Error('Load saved selections before resolving the conflict. Your draft is retained.');install(await saveComputerSettings(checkedSaved(),generation.current,choice))}
  catch(e){setStatus(e instanceof Error?e.message:'Could not resolve settings conflict.')}
 }
 return {saved,draft,setDraft,status,dirty,save,reload,checkedSaved,importSettings,conflict:state?.conflict??null,resolveConflict,computer:true,busy,ready:state!==null}
}
