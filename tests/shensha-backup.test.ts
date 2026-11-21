import {test} from 'node:test'
import assert from 'node:assert/strict'
import {emptySettings} from '../src/shensha.ts'
import {createShenshaBackup,parseShenshaBackup} from '../src/shenshaBackup.ts'
test('Shensha backup round-trips every setting including retained birth data',()=>{
 const s=emptySettings();s.zone='Asia/Shanghai';s.birth.year='甲子';s.selections.custom1={enabled:true,targets:['甲','甲子'],origin:'yun',effect:'neutral'};s.selections.tiande={enabled:false,targets:['丙'],origin:'ming'};
 const data=createShenshaBackup(s);assert.deepEqual(parseShenshaBackup(JSON.stringify(data)).settings,s);assert.equal('notes' in data,false);assert.equal('account' in data,false)
})
test('Shensha import rejects other backups, invalid settings, future versions and oversized files',()=>{
 const data=createShenshaBackup(emptySettings());
 for(const bad of ['{',JSON.stringify({format:'notes'}),JSON.stringify({...data,version:2}),JSON.stringify({...data,settings:{...data.settings,zone:'Not/AZone'}}),' '.repeat(131073)])assert.throws(()=>parseShenshaBackup(bad))
 data.settings.selections.tianyi={enabled:true,targets:['甲']};assert.throws(()=>parseShenshaBackup(JSON.stringify(data)))
})
test('legacy settings with no birth fields remain importable without losing targets',()=>{
 const data=createShenshaBackup(emptySettings());const {birth,...legacy}=data.settings;assert.deepEqual(parseShenshaBackup(JSON.stringify({...data,settings:legacy})).settings.birth,birth)
})
