import {acknowledgeOperation,applyChanges,syncSnapshot,readComputerSyncEnabled} from './notes.ts'
import type {ChangePage,RemoteNote} from './notes.ts'

export interface ComputerSession {account:string;epoch:string}
export class ComputerApiError extends Error {
  status:number
  constructor(status:number,message:string){super(message);this.name='ComputerApiError';this.status=status}
}
export async function computerApi(path:string,body?:unknown,account?:string):Promise<unknown>{
  const response=await fetch(`/api/${path}`,{
    method:body===undefined?'GET':'POST',credentials:'same-origin',
    headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(account?{'X-Calendar-Account':account}:{})},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000),
  })
  if(!response.ok)throw new ComputerApiError(response.status,response.status===401?(path==='login'?'Incorrect test credentials. Try again.':'Sign-in expired. Reconnect below; local changes and drafts are retained.'):response.status===429?'Too many sign-in attempts. Wait one minute before trying again; local notes and drafts are retained.':response.status===409?'Account or service changed. Local changes are retained; export a backup before investigating.':`Computer sync unavailable (${response.status}). Local changes are retained.`)
  return response.json()
}
export function parseSession(value:unknown):ComputerSession{
  if(!value||typeof value!=='object')throw new Error('Invalid computer session.')
  const {account,epoch}=value as ComputerSession
  if(typeof account!=='string'||!/^account-[ab]$/.test(account)||typeof epoch!=='string'||!epoch.length)throw new Error('Invalid computer session.')
  return {account,epoch}
}
export function verifyReconnectedSession(value:unknown,previous:ComputerSession):ComputerSession{
  const next=parseSession(value)
  if(next.account!==previous.account)throw new Error('Reconnect the same account. Local changes have not been transferred.')
  if(next.epoch!==previous.epoch)throw new Error('Service identity changed. Export a local backup before investigating; pending changes are retained.')
  return next
}
function remoteNote(value:unknown):RemoteNote{
  if(!value||typeof value!=='object')throw new Error('Invalid downloaded note.')
  const note=value as RemoteNote
  const date=new Date(`${note.date}T12:00:00Z`)
  if(typeof note.id!=='string'||!note.id.length||typeof note.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(note.date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==note.date||note.date<'1901-01-01'||note.date>'2100-12-31'||typeof note.text!=='string'||note.text.length>20000||typeof note.deleted!=='boolean'||(note.deleted?note.text!=='':!note.text.trim())||!Number.isSafeInteger(note.revision)||note.revision<1)throw new Error('Invalid downloaded note.')
  return note
}
export function parseChangePage(value:unknown,cursor:number,epoch:string):ChangePage{
  if(!value||typeof value!=='object')throw new Error('Invalid change response.')
  const page=value as ChangePage
  if(page.epoch!==epoch)throw new Error('Service identity changed. Preserve local notes and export a backup.')
  if(!Array.isArray(page.changes)||page.changes.length>100||typeof page.hasMore!=='boolean'||!Number.isSafeInteger(page.cursor)||page.cursor<cursor)throw new Error('Invalid change cursor.')
  let previous=cursor
  for(const value of page.changes){const note=remoteNote(value);if(note.revision<=previous)throw new Error('Invalid change order.');previous=note.revision}
  if(page.cursor!==previous || (page.hasMore&&!page.changes.length))throw new Error('Invalid change cursor.')
  return page
}
export async function syncComputer(session:ComputerSession){
  const current=parseSession(await computerApi('session',undefined,session.account))
  if(current.account!==session.account||current.epoch!==session.epoch)throw new Error('Account or service changed. Preserve local notes and export a backup before investigating.')
  const snapshot=await syncSnapshot(session.epoch)
  for(const operation of snapshot.pending.slice(0,100)){
    if(!await readComputerSyncEnabled())return {pending:snapshot.pending.length,more:false,paused:true}
    const value=await computerApi('operations',{epoch:session.epoch,operation:{id:operation.operationId,date:operation.date,text:operation.text,deleted:operation.deleted}},session.account)
    const record=remoteNote((value as {record:unknown}).record)
    if(record.id!==operation.operationId||record.date!==operation.date||record.text!==operation.text||record.deleted!==operation.deleted)throw new Error('Acknowledgement mismatch. Pending change retained.')
    await acknowledgeOperation(operation)
  }
  let cursor=snapshot.cursor,more=true
  for(let i=0;more&&i<20;i++){
    if(!await readComputerSyncEnabled())return {pending:snapshot.pending.length,more:false,paused:true}
    const page=parseChangePage(await computerApi(`changes?cursor=${cursor}&limit=100`,undefined,session.account),cursor,session.epoch)
    await applyChanges(page,session.epoch);cursor=(await syncSnapshot(session.epoch)).cursor;more=page.hasMore
  }
  const after=await syncSnapshot(session.epoch)
  return {pending:after.pending.length,more,paused:false}
}
