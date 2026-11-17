export interface Note {date:string;text:string;createdAt:string;updatedAt:string;deleted:boolean;operationId:string;revision?:number}
let database: Promise<IDBDatabase>|undefined
let databaseName='calendar182.notes.v1'
let staging=false
export function configureComputerStorage(account:string){
  const name=`calendar182.computer-staging.v1:${account}`
  if(database && databaseName!==name)throw new Error('Reload before changing accounts. Local notes are retained.')
  databaseName=name;staging=true
}
function makeOperationId(){
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('')
}
function open():Promise<IDBDatabase>{
  if(!database) database=new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1)
    request.onupgradeneeded=()=>{
      const db=request.result
      db.createObjectStore('notes',{keyPath:'date'})
      db.createObjectStore('history',{keyPath:'operationId'})
      db.createObjectStore('outbox',{keyPath:'sequence',autoIncrement:true}).createIndex('operationId','operationId',{unique:true})
      if(staging)db.createObjectStore('meta',{keyPath:'key'})
    }
    request.onerror=()=>{database=undefined;reject(request.error)}
    request.onblocked=()=>{database=undefined;reject(new Error('Close other Calendar tabs and retry.'))}
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=undefined};resolve(request.result)}
  })
  return database
}
export async function readNotes():Promise<Note[]>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('notes','readonly'),request=tx.objectStore('notes').getAll()
    tx.oncomplete=()=>resolve(request.result)
    tx.onabort=()=>reject(tx.error || new Error('Could not read notes.'))
  })
}
export async function saveNote(date:string,text:string,deleted=false):Promise<Note>{
  const parsed=new Date(`${date}T12:00:00Z`)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<'1901-01-01'||date>'2100-12-31') throw new Error('Invalid note date.')
  if(text.length>20000||(!deleted&&!text.trim())) throw new Error('Enter a note of up to 20,000 characters.')
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['notes','history','outbox'],'readwrite')
    const notes=tx.objectStore('notes'),request=notes.get(date)
    let note:Note
    request.onsuccess=()=>{
      const previous=request.result as Note|undefined
      const now=new Date().toISOString()
      note={date,text:deleted?'':text,createdAt:previous?.createdAt||now,updatedAt:now,deleted,operationId:makeOperationId()}
      if(previous) tx.objectStore('history').put(previous)
      notes.put(note)
      // Durable operations are consumed only by the isolated computer build.
      tx.objectStore('outbox').put(note)
    }
    tx.oncomplete=()=>resolve(note)
    tx.onabort=()=>reject(tx.error||new Error('Could not save. Your draft is still available.'))
  })
}
export async function exportBackup(){
  const db=await open()
  return new Promise<{app:string;version:number;exportedAt:string;notes:Note[];history:Note[];outbox:Note[]}>((resolve,reject)=>{
    const tx=db.transaction(['notes','history','outbox'],'readonly')
    const notes=tx.objectStore('notes').getAll(),history=tx.objectStore('history').getAll(),outbox=tx.objectStore('outbox').getAll()
    tx.oncomplete=()=>resolve({app:'calendar182',version:1,exportedAt:new Date().toISOString(),notes:notes.result,history:history.result,outbox:outbox.result})
    tx.onabort=()=>reject(tx.error||new Error('Could not export backup.'))
  })
}

export interface ImportData {notes:Note[];history:Note[]}
function object(value:unknown):Record<string,unknown>{
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Invalid backup record.')
  return value as Record<string,unknown>
}
export function parseBackup(value:unknown):ImportData{
  const data=object(value),legacy=data.app==='daymark'
  if((!legacy && data.app!=='calendar182')||data.version!==1||!Array.isArray(data.notes))throw new Error('Choose a Calendar182 or Daymark version 1 backup.')
  function records(raw:unknown):Note[]{
    if(!Array.isArray(raw)||raw.length>100000)throw new Error('Invalid or oversized backup.')
    return raw.map(value=>{
      const item=object(value)
      const date=item.date,text=item.text,deleted=legacy?false:item.deleted
      if(typeof date!=='string'||typeof text!=='string'||typeof deleted!=='boolean')throw new Error('Invalid note.')
      const parsed=new Date(`${date}T12:00:00Z`)
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<'1901-01-01'||date>'2100-12-31')throw new Error('Invalid note date.')
      if(text.length>20000||(!deleted&&!text.trim())||(deleted&&text!==''))throw new Error('Invalid note text.')
      if(typeof item.createdAt!=='string'||typeof item.updatedAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||!Number.isFinite(Date.parse(item.updatedAt)))throw new Error('Invalid note timestamp.')
      const operationId=legacy?makeOperationId():item.operationId
      if(typeof operationId!=='string'||!operationId.length||operationId.length>128)throw new Error('Invalid operation ID.')
      return {date,text,deleted,createdAt:item.createdAt,updatedAt:item.updatedAt,operationId}
    })
  }
  const notes=records(data.notes)
  if(new Set(notes.map(note=>note.date)).size!==notes.length)throw new Error('Duplicate note dates. Nothing was imported.')
  const history=legacy?[]:[...records(data.history),...records(data.outbox)]
  const versions=new Map<string,Note>()
  for(const note of [...notes,...history]){
    const prior=versions.get(note.operationId)
    if(prior&&JSON.stringify(prior)!==JSON.stringify(note))throw new Error('Conflicting backup versions.')
    versions.set(note.operationId,note)
  }
  return {notes,history:[...versions.values()]}
}
export async function importNotes(data:ImportData,replace=false):Promise<number>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['notes','history','outbox'],'readwrite')
    const notes=tx.objectStore('notes'),history=tx.objectStore('history'),outbox=tx.objectStore('outbox')
    const existingHistory=history.getAll(),existingNotes=notes.getAll()
    let count=0
    existingNotes.onsuccess=()=>{
      const current=new Map<string,Note>(existingNotes.result.map((note:Note)=>[note.date,note]))
      const versions=new Map<string,Note>([...existingHistory.result,...existingNotes.result].map((note:Note)=>[note.operationId,note]))
      for(const imported of data.history){
        const old=versions.get(imported.operationId)
        if(old && (old.date!==imported.date||old.text!==imported.text||old.deleted!==imported.deleted||old.createdAt!==imported.createdAt||old.updatedAt!==imported.updatedAt)){tx.abort();return}
        history.put(imported)
      }
      for(const imported of data.notes){
        const previous=current.get(imported.date)
        if(previous&&!replace)continue
        if(previous)history.put(previous)
        const note={...imported,operationId:makeOperationId(),revision:undefined,updatedAt:new Date().toISOString()}
        notes.put(note);outbox.put(note);count++
      }
    }
    tx.oncomplete=()=>resolve(count)
    tx.onabort=()=>reject(tx.error||new Error('Import cancelled. No changes were saved.'))
  })
}

export async function readNoteHistory(date:string):Promise<Note[]>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('history','readonly'),request=tx.objectStore('history').getAll()
    tx.oncomplete=()=>resolve((request.result as Note[]).filter(note=>note.date===date&&!note.deleted).sort((a,b)=>(b.revision??Number.MAX_SAFE_INTEGER)-(a.revision??Number.MAX_SAFE_INTEGER)||b.updatedAt.localeCompare(a.updatedAt)))
    tx.onabort=()=>reject(tx.error||new Error('Could not read note history.'))
  })
}

export interface RemoteNote {id:string;date:string;text:string;deleted:boolean;revision:number}
export interface ChangePage {epoch:string;cursor:number;hasMore:boolean;changes:RemoteNote[]}
interface PendingNote extends Note {sequence:number}
interface SyncMeta {key:'sync';epoch:string;cursor:number}
function requireStaging(){if(!staging)throw new Error('Computer sync requires the isolated staging database.')}
export async function readComputerSyncEnabled():Promise<boolean>{
  requireStaging()
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('meta','readonly'),request=tx.objectStore('meta').get('sync-enabled')
    tx.oncomplete=()=>resolve(request.result?.enabled!==false)
    tx.onabort=()=>reject(tx.error||new Error('Could not load storage selection.'))
  })
}
export async function writeComputerSyncEnabled(enabled:boolean):Promise<void>{
  requireStaging()
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('meta','readwrite')
    tx.objectStore('meta').put({key:'sync-enabled',enabled})
    tx.oncomplete=()=>resolve()
    tx.onabort=()=>reject(tx.error||new Error('Could not save storage selection.'))
  })
}
export async function syncSnapshot(epoch:string){
  requireStaging()
  const db=await open()
  return new Promise<{pending:PendingNote[];cursor:number}>((resolve,reject)=>{
    const tx=db.transaction(['meta','outbox'],'readwrite')
    const meta=tx.objectStore('meta').get('sync'),pending=tx.objectStore('outbox').getAll()
    let cursor=0,mismatch=false
    meta.onsuccess=()=>{
      const saved=meta.result as SyncMeta|undefined
      if(saved && saved.epoch!==epoch){mismatch=true;tx.abort();return}
      cursor=saved?.cursor||0
      if(!saved)tx.objectStore('meta').put({key:'sync',epoch,cursor})
    }
    tx.oncomplete=()=>resolve({pending:pending.result,cursor})
    tx.onabort=()=>reject(new Error(mismatch?'Service identity changed. Export your staging backup before continuing.':'Could not read pending changes.'))
  })
}
export async function acknowledgeOperation(operation:PendingNote){
  requireStaging()
  const db=await open()
  return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('outbox','readwrite'),store=tx.objectStore('outbox'),request=store.get(operation.sequence)
    request.onsuccess=()=>{if(request.result?.operationId===operation.operationId)store.delete(operation.sequence)}
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Could not acknowledge operation.'))
  })
}
export async function applyChanges(page:ChangePage,epoch:string){
  requireStaging()
  if(page.epoch!==epoch)throw new Error('Service identity changed. Preserve your local notes.')
  const db=await open()
  return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['notes','history','outbox','meta'],'readwrite')
    const meta=tx.objectStore('meta').get('sync'),pending=tx.objectStore('outbox').getAll()
    pending.onsuccess=()=>{
      const saved=meta.result as SyncMeta|undefined
      if(!saved || saved.epoch!==epoch || page.cursor<saved.cursor){tx.abort();return}
      const dates=new Set((pending.result as PendingNote[]).map(note=>note.date))
      const history=tx.objectStore('history'),notes=tx.objectStore('notes')
      for(const record of page.changes){
        const old=history.get(record.id)
        old.onsuccess=()=>{
          const now=new Date().toISOString()
          const note:Note={date:record.date,text:record.text,deleted:record.deleted,operationId:record.id,revision:record.revision,createdAt:old.result?.createdAt||now,updatedAt:old.result?.updatedAt||now}
          history.put(note)
          if(!dates.has(note.date))notes.put(note)
        }
      }
      tx.objectStore('meta').put({key:'sync',epoch,cursor:page.cursor})
    }
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Could not apply changes; cursor was retained.'))
  })
}
