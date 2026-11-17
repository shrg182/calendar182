import {parseSession} from './computerSync.ts'
import type {ComputerSession} from './computerSync.ts'

// A local account label is not authentication. Never persist the test token here.
function registry():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('calendar182.computer-device.v1',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('device')
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error||new Error('Could not open local account registry.'))
    request.onblocked=()=>reject(new Error('Close other test tabs and retry.'))
  })
}
export async function rememberComputer(value:ComputerSession):Promise<void>{
  const session=parseSession(value),db=await registry()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('device','readwrite')
    tx.objectStore('device').put({account:session.account,epoch:session.epoch},'last-confirmed')
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onabort=()=>{db.close();reject(tx.error||new Error('Could not remember this local account.'))}
  })
}
export async function rememberedComputer():Promise<ComputerSession|null>{
  const db=await registry()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('device','readonly'),request=tx.objectStore('device').get('last-confirmed')
    tx.oncomplete=()=>{
      db.close()
      try{resolve(request.result?parseSession(request.result):null)}catch{resolve(null)}
    }
    tx.onabort=()=>{db.close();reject(tx.error||new Error('Could not read the local account.'))}
  })
}
