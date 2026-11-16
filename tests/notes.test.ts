import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readNotes,saveNote,exportBackup} from '../src/notes.ts'

test('note, durable operation and history commit together; delete remains recoverable',async()=>{
 const first=await saveNote('2026-11-16','First note\n第二行')
 assert.equal((await readNotes()).find(note=>note.date===first.date)?.text,first.text)
 const second=await saveNote(first.date,'Revised')
 assert.equal(second.createdAt,first.createdAt)
 assert.notEqual(second.operationId,first.operationId)
 const deleted=await saveNote(first.date,'',true)
 assert.equal(deleted.deleted,true)
 const backup=await exportBackup()
 assert.equal(backup.notes.length,1)
 assert.equal(backup.notes[0].deleted,true)
 assert.deepEqual(backup.history.map(note=>note.text),[first,second].sort((a,b)=>a.operationId.localeCompare(b.operationId)).map(note=>note.text))
 assert.equal(backup.outbox.length,3)
 assert.deepEqual(backup.outbox.map(note=>note.text),[first.text,second.text,''])
 assert.equal(new Set(backup.outbox.map(note=>note.operationId)).size,3)
 assert.equal(backup.app,'calendar182')
 assert.equal(backup.version,1)
 assert.ok(backup.history.some(note=>note.text===first.text))
})
test('invalid dates and invalid text do not change saved records',async()=>{
 const before=await exportBackup()
 for(const date of ['2026-02-30','1900-12-31','2101-01-01','bad'])await assert.rejects(saveNote(date,'text'))
 await assert.rejects(saveNote('2026-11-17',' '.repeat(10)))
 await assert.rejects(saveNote('2026-11-17','x'.repeat(20001)))
 const after=await exportBackup()
 assert.deepEqual(after.notes,before.notes)
 assert.deepEqual(after.outbox,before.outbox)
})
