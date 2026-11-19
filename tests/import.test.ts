import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseBackup,importNotes,saveNote,readNotes,exportBackup} from '../src/notes.ts'
const legacy=(text='Imported',date='2026-11-16')=>({app:'daymark',version:1,notes:[{date,text,createdAt:'2026-11-01T12:00:00Z',updatedAt:'2026-11-02T12:00:00Z'}]})
test('legacy imports keep existing by default and preserve overwritten text',async()=>{
 await saveNote('2026-11-16','Local')
 assert.equal(await importNotes(parseBackup(legacy())),0)
 assert.equal((await readNotes())[0].text,'Local')
 assert.equal(await importNotes(parseBackup(legacy()),true),1)
 const backup=await exportBackup()
 assert.equal(backup.notes[0].text,'Imported')
 assert.deepEqual(backup.provenance,{version:1,storage:'local',account:null,serviceEpoch:null,cursor:null})
 const {provenance: _provenance,...oldBackup}=backup
 assert.deepEqual(parseBackup(oldBackup),parseBackup(backup))
 assert.ok(backup.history.some(note=>note.text==='Local'))
 assert.equal(backup.outbox.length,2)
 const snapshot=parseBackup(backup)
 assert.equal(await importNotes(snapshot),0)
 assert.equal((await exportBackup()).outbox.length,2)
})
test('bad backup records are rejected before any write',async()=>{
 const before=await exportBackup()
 const invalid=[{...legacy(),app:'other'},{...legacy(),version:2},legacy('x','2026-02-30'),legacy('x'.repeat(20001)),legacy(' ')]
 for(const input of invalid)assert.throws(()=>parseBackup(input))
 const duplicate=legacy();duplicate.notes.push(duplicate.notes[0]);assert.throws(()=>parseBackup(duplicate))
 const timestamp=legacy();timestamp.notes[0].updatedAt='bad';assert.throws(()=>parseBackup(timestamp))
 assert.deepEqual((await exportBackup()).notes,before.notes)
})
test('version collisions roll back the whole import transaction',async()=>{
 const before=await exportBackup(),original=before.notes[0]
 const fresh=parseBackup(legacy('New','2026-11-17'))
 fresh.history.push({...original,text:'Conflicting operation'})
 await assert.rejects(importNotes(fresh,true))
 const after=await exportBackup()
 assert.deepEqual(after.notes,before.notes)
 assert.deepEqual(after.history,before.history)
 assert.deepEqual(after.outbox,before.outbox)
})
test('Calendar182 restore preserves deleted records and history without replaying the source queue',async()=>{
 await saveNote('2026-11-18','Before delete')
 await saveNote('2026-11-18','',true)
 const backup=await exportBackup()
 await saveNote('2026-11-18','New local value')
 const before=await exportBackup()
 const imported=await importNotes(parseBackup(backup),true)
 const after=await exportBackup()
 assert.ok(after.notes.find(note=>note.date==='2026-11-18')?.deleted)
 assert.ok(after.history.some(note=>note.text==='Before delete'))
 assert.ok(after.history.some(note=>note.text==='New local value'))
 assert.equal(after.outbox.length,before.outbox.length+imported)
})
