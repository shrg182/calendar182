import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {rememberComputer,rememberedComputer} from '../src/rememberedComputer.ts'

test('offline identity stores only validated account/service labels, never credentials',async()=>{
  assert.equal(await rememberedComputer(),null)
  const session={account:'account-a',epoch:'confirmed-service',token:'never-persist-this'}
  await rememberComputer(session)
  assert.deepEqual(await rememberedComputer(),{account:session.account,epoch:session.epoch})
  await assert.rejects(rememberComputer({account:'unknown',epoch:'service'}),/Invalid/)
  assert.deepEqual(await rememberedComputer(),{account:session.account,epoch:session.epoch})
  const request=indexedDB.open('calendar182.computer-device.v1',1)
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=reject})
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('device','readwrite');tx.objectStore('device').put({account:'unknown',epoch:'service'},'last-confirmed')
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error)
  })
  db.close()
  assert.equal(await rememberedComputer(),null)
})
