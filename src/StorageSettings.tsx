import {storageOptions} from './storage'
import {useContext} from 'react'
import {ComputerStorageContext} from './computerStorageContext'

export function StorageSettings(){
  const control=useContext(ComputerStorageContext)
  const computer=control!==null
  const enabled=control?.enabled===true
  return <section className="storage-settings" aria-labelledby="storage-heading">
    <h3 id="storage-heading">Storage options</h3>
    <p>Active storage: <strong>{enabled?'This device + your computer (test)':'This device'}</strong>. No cloud account is connected.</p>
    <fieldset aria-describedby="storage-availability">
      <legend>Where to keep your notes</legend>
      {storageOptions.map(option=><label className="storage-option" key={option.id}>
        <input type="radio" name="storage-provider" value={option.id} checked={enabled?option.id==='computer':option.id==='local'} disabled={control?.busy||!(option.available||(computer&&option.id==='computer'))} onChange={()=>{if(control)void control.select(option.id==='computer')}}/>
        <span><strong>{option.name}</strong><span>{option.purpose}</span><small>{computer&&option.id==='computer'?(enabled?'Connected in this isolated test build':'Paused — select to resume computer sync'):computer&&option.id==='local'?(enabled?'Local copies retained':'Active'):option.status}</small></span>
      </label>)}
    </fieldset>
    <p id="storage-availability">Cloud options will become selectable when their connections and safe data transfer are ready. {computer?'Selecting This device pauses computer sync. Selecting Your computer resumes it and uploads pending saved edits. Both choices keep the same account’s local notes, history and drafts; existing computer copies are retained. Your usual Calendar notes remain separate.':'The computer sync experiment is separate from this Calendar.'}</p>
    <p>You can export and import backups below to move saved notes between browsers now.</p>
  </section>
}
