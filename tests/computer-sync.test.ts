import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {configureComputerStorage,saveNote,readNotes,exportBackup,syncSnapshot,acknowledgeOperation,applyChanges,readComputerSyncEnabled,writeComputerSyncEnabled} from '../src/notes.ts'
import {parseChangePage,parseSession} from '../src/computerSync.ts'

test('staging isolates accounts, retains newer pending edits, applies tombstones and binds service identity',async()=>{
  configureComputerStorage('account-a')
  await syncSnapshot('epoch-one')
  assert.equal(await readComputerSyncEnabled(),true)
  const first=await saveNote('2026-11-17','First queued note')
  const old=(await syncSnapshot('epoch-one')).pending[0]!
  const newer=await saveNote(first.date,'Newer queued note')
  await writeComputerSyncEnabled(false)
  assert.equal(await readComputerSyncEnabled(),false)
  assert.equal((await syncSnapshot('epoch-one')).pending.length,2)
  assert.equal((await readNotes())[0]?.text,newer.text)
  await writeComputerSyncEnabled(true)
  assert.equal(await readComputerSyncEnabled(),true)
  await acknowledgeOperation(old)
  assert.equal((await syncSnapshot('epoch-one')).pending[0]?.operationId,newer.operationId)
  const remote={id:'remote-operation-0001',date:first.date,text:'Remote accepted note',deleted:false,revision:1}
  await applyChanges({epoch:'epoch-one',changes:[remote],cursor:1,hasMore:false},'epoch-one')
  assert.equal((await readNotes())[0]?.text,newer.text)
  assert.ok((await exportBackup()).history.some(note=>note.operationId===remote.id))
  assert.equal((await syncSnapshot('epoch-one')).cursor,1)
  await assert.rejects(syncSnapshot('epoch-two'),/identity changed/)
  assert.throws(()=>configureComputerStorage('account-b'),/Reload/)
  await acknowledgeOperation((await syncSnapshot('epoch-one')).pending[0]!)
  await applyChanges({epoch:'epoch-one',changes:[{...remote,id:'remote-operation-0002',text:'',deleted:true,revision:2}],cursor:2,hasMore:false},'epoch-one')
  assert.equal((await readNotes())[0]?.deleted,true)
  assert.equal((await syncSnapshot('epoch-one')).cursor,2)
  await assert.rejects(applyChanges({epoch:'epoch-two',changes:[],cursor:3,hasMore:false},'epoch-one'),/identity changed/)
  assert.equal((await syncSnapshot('epoch-one')).cursor,2)
})

test('malformed or unordered pages and unexpected account sessions are rejected',()=>{
  assert.throws(()=>parseSession({account:'someone-else',epoch:'test'}),/Invalid/)
  assert.deepEqual(parseSession({account:'account-a',epoch:'test'}),{account:'account-a',epoch:'test'})
  const note={id:'remote-operation-0001',date:'2026-11-17',text:'A note',deleted:false,revision:1}
  const page={epoch:'test',changes:[note],cursor:1,hasMore:false}
  assert.deepEqual(parseChangePage(page,0,'test'),page)
  for(const bad of [
    {...page,epoch:'other'},
    {...page,cursor:2},
    {...page,changes:[note,note]},
    {...page,changes:[{...note,date:'2026-02-30'}]},
    {...page,changes:[{...note,deleted:true}]},
    {...page,changes:[],cursor:0,hasMore:true},
  ])assert.throws(()=>parseChangePage(bad,0,'test'))
})
