export interface Note {date:string;text:string;createdAt:string;updatedAt:string;deleted:boolean;operationId:string}
let database: Promise<IDBDatabase>|undefined
function open():Promise<IDBDatabase>{
  if(!database) database=new Promise((resolve,reject)=>{
    const request=indexedDB.open('calendar182.notes.v1',1)
    request.onupgradeneeded=()=>{
      const db=request.result
      db.createObjectStore('notes',{keyPath:'date'})
      db.createObjectStore('history',{keyPath:'operationId'})
      db.createObjectStore('outbox',{keyPath:'sequence',autoIncrement:true}).createIndex('operationId','operationId',{unique:true})
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
      note={date,text:deleted?'':text,createdAt:previous?.createdAt||now,updatedAt:now,deleted,operationId:crypto.randomUUID()}
      if(previous) tx.objectStore('history').put(previous)
      notes.put(note)
      // Durable local operations; no provider is connected yet.
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
