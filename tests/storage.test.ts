import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {getAvailableStorageOption,noteStore,storageOptions} from '../src/storage.ts'

test('unimplemented or unknown storage cannot be activated or alter local data',async()=>{
  const saved=await noteStore.saveNote('2026-11-18','Preserve this note when a provider is unavailable')
  const before=await noteStore.exportBackup()
  for(const option of storageOptions.filter(option=>!option.available)){
    assert.throws(()=>getAvailableStorageOption(option.id),/not available/)
  }
  assert.throws(()=>getAvailableStorageOption('unknown'),/not available/)
  assert.equal(getAvailableStorageOption('local').id,'local')
  const after=await noteStore.exportBackup()
  assert.deepEqual(after.notes,before.notes)
  assert.deepEqual(after.history,before.history)
  assert.deepEqual(after.outbox,before.outbox)
  assert.equal((await noteStore.readNotes()).find(note=>note.date===saved.date)?.text,saved.text)
})
