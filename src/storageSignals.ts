export type StorageChange='saved'|'notes'|'mode'|'session'|'refresh'
type Signal={scope:string;kind:StorageChange;id:string}
const channels=new Map<string,BroadcastChannel|null>()
const seen=new Set<string>()
let listening=false
const prefix='calendar182:storage-signal:'
function receive(value:unknown){
  if(!value||typeof value!=='object')return
  const signal=value as Signal
  if(typeof signal.scope!=='string'||typeof signal.id!=='string'||!['saved','notes','mode','session'].includes(signal.kind)||seen.has(signal.id))return
  seen.add(signal.id)
  if(seen.size>200)seen.delete(seen.values().next().value!)
  window.dispatchEvent(new CustomEvent('calendar-storage-change',{detail:{...signal,external:true}}))
}
function channel(scope:string){
  if(!listening){
    listening=true
    window.addEventListener('storage',event=>{if(event.key?.startsWith(prefix)&&event.newValue){try{receive(JSON.parse(event.newValue))}catch{/* Ignore unrelated/corrupt notification metadata. */}}})
  }
  if(!channels.has(scope)){
    let value:BroadcastChannel|null=null
    try{value=new window.BroadcastChannel(prefix+scope);value.onmessage=event=>receive(event.data)}catch{/* Storage events and foreground refresh remain available. */}
    channels.set(scope,value)
  }
  return channels.get(scope)
}
export function notifyStorage(scope:string,kind:Exclude<StorageChange,'refresh'>){
  if(typeof window==='undefined')return
  // Notification IDs carry no ordering authority, record text or credentials.
  const signal:Signal={scope,kind,id:`${Date.now()}:${Math.random()}`}
  seen.add(signal.id)
  if(seen.size>200)seen.delete(seen.values().next().value!)
  window.dispatchEvent(new CustomEvent('calendar-storage-change',{detail:{...signal,external:false}}))
  try{channel(scope)?.postMessage(signal)}catch{/* Durable data already committed. */}
  try{localStorage.setItem(prefix+scope,JSON.stringify(signal))}catch{/* Do not turn a committed save into a failure. */}
}
export function subscribeStorage(scope:string,listener:(kind:StorageChange,external:boolean)=>void){
  if(typeof window==='undefined')return ()=>{}
  const available=channel(scope)
  const changed=(event:Event)=>{const signal=(event as CustomEvent<Signal&{external:boolean}>).detail;if(signal?.scope===scope)listener(signal.kind,signal.external)}
  const refresh=()=>listener('refresh',true)
  window.addEventListener('calendar-storage-change',changed)
  window.addEventListener('focus',refresh)
  const timer=available?undefined:window.setInterval(()=>{if(!document.hidden)refresh()},5000)
  return ()=>{window.removeEventListener('calendar-storage-change',changed);window.removeEventListener('focus',refresh);if(timer!==undefined)clearInterval(timer)}
}
