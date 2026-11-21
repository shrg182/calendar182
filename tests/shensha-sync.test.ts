import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {configureComputerStorage,writeComputerSyncEnabled} from '../src/notes.ts'
import {emptySettings} from '../src/shensha.ts'
import {settingsTransaction,saveComputerSettings,syncShensha,parseRemoteSettings} from '../src/shenshaSync.ts'

test('settings retain offline saves, retry exact IDs, detect conflicts, isolate epochs and preserve concurrent edits',async()=>{
 Object.assign(globalThis,{window:new EventTarget(),localStorage:{getItem:()=>null},BroadcastChannel:undefined})
 configureComputerStorage('account-a')
 const session={account:'account-a',epoch:'epoch-one'}
 let remote={epoch:session.epoch,revision:0,settings:null as ReturnType<typeof emptySettings>|null}
 const accepted=new Map<string,unknown>();let drop=false,requests=0,during:(()=>Promise<void>)|null=null
 globalThis.fetch=async(_input,init)=>{
  requests++;assert.equal((init!.headers as Record<string,string>)['X-Calendar-Account'],'account-a')
  if(init?.method==='POST'){
   const {epoch,operation:op}=JSON.parse(init.body as string);assert.equal(epoch,session.epoch)
   let result=accepted.get(op.id)
   if(!result){const ok=op.base===remote.revision;if(ok)remote={...remote,revision:remote.revision+1,settings:op.settings};result={...remote,accepted:ok};if(ok)accepted.set(op.id,result)}
   if(during){const run=during;during=null;await run()}
   if(drop){drop=false;throw Error('Lost acknowledgement')}
   return new Response(JSON.stringify(result))
  }
  return new Response(JSON.stringify(remote))
 }
 const local=emptySettings();local.zone='America/Detroit'
 let state=await settingsTransaction();assert.equal(state.pending,null)
 state=await saveComputerSettings(local,state.generation)
 await writeComputerSyncEnabled(false);await syncShensha(session);assert.equal(requests,0)
 await writeComputerSyncEnabled(true);drop=true
 await assert.rejects(syncShensha(session),/Lost acknowledgement/)
 const id=(await settingsTransaction()).pending!.id
 // A different device advances the server after our lost response.
 const newer=emptySettings();newer.zone='Asia/Shanghai';remote={...remote,revision:2,settings:newer}
 await syncShensha(session);state=await settingsTransaction();assert.equal(state.pending,null);assert.equal(state.settings.zone,'Asia/Shanghai');assert.ok(accepted.has(id))
 const mine=emptySettings();mine.zone='UTC';state=await saveComputerSettings(mine,state.generation)
 remote={...remote,revision:3,settings:local}
 assert.equal(await syncShensha(session),true);state=await settingsTransaction();assert.equal(state.settings.zone,'UTC');assert.equal(state.conflict?.settings?.zone,'America/Detroit')
 await assert.rejects(saveComputerSettings(mine,state.generation),/Resolve/)
 state=await saveComputerSettings(mine,state.generation,'local');await syncShensha(session);assert.equal(remote.settings?.zone,'UTC')
 // Save while a previous upload is in flight: queue the new value against its acknowledgement.
 state=await settingsTransaction();await saveComputerSettings(local,state.generation)
 during=async()=>{const current=await settingsTransaction();await saveComputerSettings(newer,current.generation)}
 await syncShensha(session);state=await settingsTransaction();assert.equal(state.settings.zone,'Asia/Shanghai');assert.ok(state.pending);assert.equal(state.pending.base,remote.revision)
 await syncShensha(session);assert.equal(remote.settings?.zone,'Asia/Shanghai');assert.equal((await settingsTransaction()).pending,null)
 // Stale tab and malformed/foreign service replies never replace saved settings.
 await assert.rejects(saveComputerSettings(local,0),/changed/)
 await assert.rejects(syncShensha({...session,epoch:'other-epoch'}),/identity changed/)
 assert.throws(()=>parseRemoteSettings({...remote,epoch:'wrong'},session.epoch),/identity changed/)
 assert.throws(()=>parseRemoteSettings({...remote,revision:0},session.epoch),/Invalid/)
})
