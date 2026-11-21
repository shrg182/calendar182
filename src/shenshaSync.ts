import {storageScope,readComputerSyncEnabled} from './notes.ts'
import {validateSettings,emptySettings} from './shensha.ts'
import type {ShenshaSettings} from './shensha.ts'
import {computerApi} from './computerSync.ts'
import type {ComputerSession} from './computerSync.ts'
export interface RemoteSettings {revision:number;settings:ShenshaSettings|null}
export interface SettingsState {settings:ShenshaSettings;epoch:string|null;revision:number;pending:{id:string;base:number;settings:ShenshaSettings}|null;conflict:RemoteSettings|null;generation:number}
const event='calendar-shensha-changed'
const operationId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('')
export const isComputerSettings=()=>storageScope().startsWith('calendar182.computer-staging.v1:')
export function settingsChanged(){window.dispatchEvent(new Event(event));window.dispatchEvent(new Event('calendar-note-saved'))}
export function subscribeSettings(callback:()=>void){
 const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(`shensha:${storageScope()}`):null
 channel?.addEventListener('message',callback);window.addEventListener(event,callback)
 // Polling covers HTTP browsers without BroadcastChannel and missed background events.
 const timer=setInterval(callback,2000)
 return ()=>{channel?.close();window.removeEventListener(event,callback);clearInterval(timer)}
}
function notify(){settingsChanged();if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel(`shensha:${storageScope()}`);channel.postMessage('changed');channel.close()}}
async function open(){return new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open(`calendar182.shensha-sync.v1:${storageScope()}`,1)
 request.onupgradeneeded=()=>request.result.createObjectStore('state')
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
})}
export async function settingsTransaction(update?:(state:SettingsState)=>SettingsState):Promise<SettingsState>{
 const db=await open()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),request=store.get('current');let result:SettingsState,error:unknown
  request.onsuccess=()=>{try{
   let state=request.result as SettingsState|undefined
   if(!state){const raw=localStorage.getItem(`calendar182.shensha.v1:${storageScope()}`);const settings=raw?validateSettings(JSON.parse(raw)):emptySettings();state={settings,epoch:null,revision:0,pending:raw?{id:operationId(),base:0,settings}:null,conflict:null,generation:0}}
   result=update?update(state):state;store.put(result,'current')
  }catch(e){error=e;tx.abort()}}
  tx.oncomplete=()=>{db.close();resolve(result)}
  tx.onabort=()=>{db.close();reject(error||tx.error||Error('Could not save Shensha settings.'))}
 })
}
export async function saveComputerSettings(settings:ShenshaSettings,generation:number,resolveConflict?:'local'|'remote'){
 const value=validateSettings(settings)
 const result=await settingsTransaction(state=>{
  if(state.generation!==generation)throw Error('Saved selections changed. Load saved selections before saving again.')
  if(resolveConflict&&!state.conflict)throw Error('The conflict changed. Review settings again.')
  const remote=state.conflict
  if(resolveConflict==='remote'&&remote?.settings)return {...state,settings:remote.settings,revision:remote.revision,pending:null,conflict:null,generation:state.generation+1}
  if(remote&&!resolveConflict)throw Error('Resolve the settings conflict before saving. Your draft is retained.')
  const base=remote?.revision??state.revision
  return {...state,settings:value,revision:base,pending:{id:operationId(),base,settings:value},conflict:null,generation:state.generation+1}
 });notify();return result
}
export function parseRemoteSettings(value:unknown,epoch:string):RemoteSettings{
 if(!value||typeof value!=='object')throw Error('Invalid settings response.')
 const remote=value as RemoteSettings&{epoch:string}
 if(remote.epoch!==epoch)throw Error('Service identity changed. Shensha settings are retained on this device.')
 if(!Number.isSafeInteger(remote.revision)||remote.revision<0||(remote.revision===0)!==(remote.settings===null))throw Error('Invalid settings revision.')
 return {revision:remote.revision,settings:remote.settings===null?null:validateSettings(remote.settings)}
}
const equal=(a:ShenshaSettings,b:ShenshaSettings)=>JSON.stringify(validateSettings(a))===JSON.stringify(validateSettings(b))
export async function syncShensha(session:ComputerSession){
 let state=await settingsTransaction(current=>{
  if(current.epoch&&current.epoch!==session.epoch)throw Error('Service identity changed. Shensha settings are retained on this device.')
  return {...current,epoch:session.epoch}
 })
 if(!await readComputerSyncEnabled())return
 if(state.pending&&!state.conflict){
  const pending=state.pending
  const response=await computerApi('shensha',{epoch:session.epoch,operation:pending},session.account)
  const remote=parseRemoteSettings(response,session.epoch)
  if(typeof (response as {accepted:unknown}).accepted!=='boolean')throw Error('Invalid settings acknowledgement.')
  const accepted=(response as {accepted:boolean}).accepted
  if(accepted&&(!remote.settings||!equal(remote.settings,pending.settings)||remote.revision<=pending.base))throw Error('Settings acknowledgement mismatch.')
  await settingsTransaction(current=>{
   if(current.epoch!==session.epoch)return current
   if(accepted){
    // A newer local save made during upload remains queued against this acknowledgement.
    if(current.pending?.id===pending.id)return {...current,revision:remote.revision,pending:null,generation:current.generation+1}
    if(current.pending&&current.pending.base===pending.base)return {...current,revision:remote.revision,pending:{...current.pending,base:remote.revision},generation:current.generation+1}
    return current
   }
   if(current.pending?.id!==pending.id)return current
   return {...current,conflict:remote,generation:current.generation+1}
  });notify()
 }
 if(!await readComputerSyncEnabled())return
 const remote=parseRemoteSettings(await computerApi('shensha',undefined,session.account),session.epoch)
 state=await settingsTransaction(current=>{
  if(current.epoch!==session.epoch||remote.revision<=current.revision)return current
  if(current.pending){
   if(remote.settings&&equal(current.settings,remote.settings))return {...current,revision:remote.revision,pending:null,conflict:null,generation:current.generation+1}
   if(current.conflict?.revision===remote.revision)return current
   return {...current,conflict:remote,generation:current.generation+1}
  }
  return {...current,settings:remote.settings!,revision:remote.revision,conflict:null,generation:current.generation+1}
 });notify()
 return state.conflict!==null
}
