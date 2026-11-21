import {useRef,useState} from 'react'
import type {useShensha} from './useShensha'
import {items,originLabels,birthScopes} from './shensha'
import {createShenshaBackup,parseShenshaBackup,MAX_SHENSHA_BACKUP_BYTES} from './shenshaBackup'
type Preview=ReturnType<typeof parseShenshaBackup>&{expected:string;current:ReturnType<typeof createShenshaBackup>['settings']}
export function ShenshaBackupPanel({model}:{model:ReturnType<typeof useShensha>}){
 const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[reading,setReading]=useState(false),[message,setMessage]=useState('')
 const sequence=useRef(0)
 function exportSettings(){setError('');setMessage('');try{
  const backup=createShenshaBackup(model.checkedSaved()),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download=`calendar182-shensha-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setMessage('Shensha backup download started.')
 }catch(e){setError(e instanceof Error?e.message:'Could not export settings.')}}
 async function choose(file:File|undefined){const request=++sequence.current;setPreview(null);setError('');setMessage('');if(!file)return;setReading(true)
  try{const current=model.checkedSaved();if(file.size>MAX_SHENSHA_BACKUP_BYTES)throw Error('Choose a Shensha backup smaller than 128 KB.');const parsed=parseShenshaBackup(await file.text());if(request===sequence.current)setPreview({...parsed,current,expected:JSON.stringify(current)})}
  catch(e){if(request===sequence.current)setError(e instanceof Error?e.message:'Could not read settings backup.')}
  finally{if(request===sequence.current)setReading(false)}
 }
 const changed=preview?items.filter(([id])=>JSON.stringify(preview.current.selections[id])!==JSON.stringify(preview.settings.selections[id])):[]
 const describe=(rule:Preview['settings']['selections'][typeof items[number][0]])=>`${rule.enabled?'On':'Off'} · ${rule.targets.join('、')||'No targets'} · ${originLabels[rule.origin||'unclassified']}${rule.effect?' · '+rule.effect:''}`
 const stale=preview&&JSON.stringify(model.saved)!==preview.expected
 return <section className="shensha-backup" aria-label="Shensha settings backup"><h3>Shensha settings backup</h3><p>Export saved targets, strengths, custom effects, time zone and retained birth-pillar data. Notes and account credentials are not included. The file can be imported on another device.</p>
 <button disabled={model.dirty||model.busy||!model.ready||reading} onClick={exportSettings}>Export Shensha settings</button>
 <label htmlFor="shensha-import">Import Shensha settings</label><input id="shensha-import" type="file" accept=".json,application/json" disabled={model.dirty||model.busy||!model.ready||reading} onChange={e=>{void choose(e.target.files?.[0]);e.target.value=''}}/>
 {model.dirty&&<p>Save or load your selections before exporting or importing settings.</p>}{reading&&<p role="status">Reading settings backup…</p>}
 {preview&&<div className="import-preview"><h4>Review Shensha import</h4><p>Backup: {new Date(preview.exportedAt).toLocaleString()}. {changed.length} items change; {items.filter(([id])=>preview.settings.selections[id].enabled).length} enabled after import.</p>
 <p>Time zone: {preview.current.zone||'Device time zone'} → {preview.settings.zone||'Device time zone'}. A device time zone follows the receiving device.</p>
 <p>Retained birth pillars: {birthScopes.filter(scope=>preview.current.birth[scope]).length} → {birthScopes.filter(scope=>preview.settings.birth[scope]).length} entered. {JSON.stringify(preview.current.birth)===JSON.stringify(preview.settings.birth)?'Unchanged.':'Will be replaced; these are hidden from normal use.'}</p>
 {changed.length>0&&<ul className="shensha-import-changes">{changed.map(([id,name])=><li key={id}><strong>{name}</strong><div>Current: {describe(preview.current.selections[id])}</div><div>Import: {describe(preview.settings.selections[id])}</div></li>)}</ul>}
 <p>This replaces all Shensha settings in the current browser/account. Export the current settings first if you want to keep a copy.</p>
 {stale&&<p role="alert">Selections changed since this preview. Choose the file again.</p>}
 <div className="note-actions"><button disabled={model.dirty||model.busy||!model.ready||reading||Boolean(stale)} onClick={async()=>{setError('');try{await model.importSettings(preview.settings,preview.expected);setPreview(null);setMessage('Shensha settings imported on this device.')}catch(e){setError(e instanceof Error?e.message:'Import failed.')}}}>Replace Shensha settings</button><button onClick={()=>{sequence.current++;setPreview(null);setReading(false);setError('')}}>Cancel Shensha import</button></div></div>}
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</section>
}
