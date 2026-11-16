import {useState} from 'react'
import {parseBackup} from './notes'
import type {ImportData,Note} from './notes'
export function BackupImport({notes,disabled,restore}:{notes:Record<string,Note>;disabled:boolean;restore:(data:ImportData,replace:boolean)=>Promise<void>}){
  const [preview,setPreview]=useState<ImportData|null>(null)
  const [replace,setReplace]=useState(false),[error,setError]=useState(''),[reading,setReading]=useState(false)
  const locked=disabled||reading
  async function choose(file:File|undefined){
    setPreview(null);setError('');setReplace(false)
    if(!file)return
    setReading(true)
    try{
      if(file.size>25*1024*1024)throw new Error('Choose a backup smaller than 25 MB.')
      setPreview(parseBackup(JSON.parse(await file.text())))
    }catch(error){setError(error instanceof Error?error.message:'Could not read backup.')}
    finally{setReading(false)}
  }
  return <div className="backup-import"><label htmlFor="import-backup">Import notes backup</label><input id="import-backup" type="file" accept=".json,application/json" disabled={locked} onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}}/>
  {preview && <div className="import-preview"><p>{preview.notes.length} notes ready; {preview.notes.filter(note=>notes[note.date]).length} dates already exist. {preview.notes.filter(note=>note.deleted).length} imported records are deletions.</p><label htmlFor="import-choice">Dates already on this device</label><select id="import-choice" value={replace?'replace':'keep'} disabled={locked} onChange={event=>setReplace(event.target.value==='replace')}><option value="keep">Keep existing notes</option><option value="replace">Replace with imported notes</option></select><p>Replacing can restore notes or apply saved deletions. Previous versions will be retained. Imported operations are not sent to any cloud service.</p><div className="note-actions"><button disabled={locked} onClick={()=>{void restore(preview,replace).then(()=>setPreview(null)).catch(error=>setError(error instanceof Error?error.message:'Import failed.'))}}>Import notes</button><button disabled={locked} onClick={()=>setPreview(null)}>Cancel import</button></div></div>}
  {error && <p role="alert">{error}</p>}</div>
}
