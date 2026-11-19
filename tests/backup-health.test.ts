import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseBackupHealth} from '../src/backupHealth.ts'

test('backup status requires real flags, counts and timestamps',()=>{
  const status={enabled:true,running:true,intervalSeconds:3600,snapshotCount:2,lastSnapshotAt:1795100000,snapshotFailed:false,copyConfigured:true,copyFailed:false,copyInProgress:false,lastCopyVerifiedAt:1795100060,managedStartup:true}
  assert.deepEqual(parseBackupHealth(status),status)
  for(const bad of [{...status,copyFailed:undefined},{...status,snapshotCount:-1},{...status,lastSnapshotAt:NaN},{...status,intervalSeconds:null},{...status,managedStartup:'yes'}])assert.throws(()=>parseBackupHealth(bad))
})
