import {useState} from 'react'
import {useShensha} from './useShensha'
import {contextForDate,evaluate,items,targetsFor,originLabels,encounteredTargets} from './shensha'
import type {ItemId,ShenshaSettings} from './shensha'
import {dateKey} from './calendar'
type Model=ReturnType<typeof useShensha>
export function ShenshaSettingsPanel({model}:{model:Model}){
 const [search,setSearch]=useState('')
 function update(id:ItemId,enabled:boolean,targets:string[]){model.setDraft({...model.draft,selections:{...model.draft.selections,[id]:{...model.draft.selections[id],enabled,targets}}})}
 return <section className="shensha-settings" aria-label="Shensha settings"><h2>Shensha · 神煞</h2>
 <p>Choose your own matching targets. These selections are local to this browser and account; they do not sync yet and are not included in notes backups.</p>
 <label>Calculation time zone <input value={model.draft.zone} placeholder="Device time zone (leave blank)" onChange={e=>model.setDraft({...model.draft,zone:e.target.value.trim()})}/></label>
 <p>Use an IANA name such as America/Detroit or Asia/Shanghai. Blank uses this device’s time zone.</p>
 <label>Find Shensha <input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {items.filter(([id,name])=>(id+' '+name).toLowerCase().includes(search.toLowerCase())).map(([id,name,kind])=>{
 const rule=model.draft.selections[id]
 return <details key={id} className="shensha-picker"><summary>{name} · {kind==='shen'?'Shen':kind==='sha'?'Sha':'Custom'} · {rule.enabled?'Enabled':'Off'} · {rule.targets.length} targets</summary>
 <label className="shensha-check"><input type="checkbox" checked={rule.enabled} onChange={e=>update(id,e.target.checked,rule.targets)}/>Enable {name}</label>
 <label>{name} strength<select aria-label={`${name} strength`} value={rule.origin||'unclassified'} onChange={e=>model.setDraft({...model.draft,selections:{...model.draft.selections,[id]:{...rule,origin:e.target.value as 'ming'|'yun'|'unclassified'}}})}><option value="unclassified">Not chosen</option><option value="ming">命 · stronger</option><option value="yun">运 · weaker</option></select></label>
 <fieldset><legend>{name} targets</legend><div className="shensha-targets">{targetsFor(id).map(target=><label key={target}><input type="checkbox" aria-label={target} checked={rule.targets.includes(target)} onChange={e=>update(id,rule.enabled,e.target.checked?[...rule.targets,target]:rule.targets.filter(t=>t!==target))}/>{target}{rule.targets.includes(target)&&<small className="target-origin">{originLabels[rule.origin||'unclassified']}</small>}</label>)}</div></fieldset></details>})}
 <div className="note-actions"><button onClick={model.save}>Save Shensha selections</button><button onClick={model.reload}>Load saved selections</button></div>
 {model.dirty&&<p>Unsaved Shensha selections. Day results use your last saved selections.</p>}<p role="status">{model.status}</p>
 <details><summary>Shensha calculation conventions</summary><p>Matches use manually selected targets, not birth-chart inference. Year changes at 立春; month changes at the twelve 节. Year/month boundaries use estimated solar-term times evaluated at local noon. Day changes at midnight. Both 子 segments use that civil date’s day stem. Hour results require the same item to match at least two year/month/day pillars. Counts are per item and pillar. 空亡 makes all results on that date inactive. This is traditional rule matching, not a prediction.</p></details></section>
}
const clock=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
export function ShenshaDay({date,settings,onSettings}:{date:Date;settings:ShenshaSettings;onSettings:()=>void}){
 const [time,setTime]=useState('12:00')
 const context=contextForDate(date,settings.zone),result=evaluate(context,settings.selections)
 const [h,m]=time.split(':').map(Number),minute=Number.isFinite(h*60+m)?h*60+m:720
 const hour=result.hours.find(slot=>slot.startMinute<=minute&&slot.endMinute>minute)!
 function badges(found:ItemId[],pillar:string,hourMatch=false){return found.length?<ul className={`shensha-badges ${result.inactive?'inactive':''}`}>{found.map(id=>{const item=items.find(item=>item[0]===id)!,count=result.counts[id]+(hourMatch?1:0),sign=item[2]==='shen'?'+':item[2]==='sha'?'-':'';return <li key={id} className={`${item[2]} strength-${settings.selections[id].origin||'unclassified'}`} data-shensha={id}>{item[1]}{count>1&&sign?<span aria-label={`${count} matching pillars`}> {sign.repeat(count)}</span>:null}{result.inactive?' · inactive':''}<div className="encounter-origins">{encounteredTargets(pillar,id,settings).map(({target,origin})=><span key={target} className={`origin-${origin}`} data-origin={origin}>{target} · {originLabels[origin]}</span>)}</div></li>})}</ul>:<p>No matches.</p>}
 return <section className="shensha-day" aria-label="Shensha day results"><h3>Shensha · 神煞</h3><button onClick={onSettings}>Edit Shensha selections</button>
 <p>Time zone: {settings.zone||Intl.DateTimeFormat().resolvedOptions().timeZone}. Uses saved selections on this device.</p>
 {!items.some(([id])=>settings.selections[id].enabled)&&<p>No Shensha items enabled. Choose targets in Settings.</p>}
 {result.inactive&&<p className="shensha-void">空亡 · All Shensha results on this date are inactive.</p>}
 {(['year','month','day'] as const).map(scope=><div key={scope} data-pillar-scope={scope} data-pillar={context[scope].pillar}><h4>{scope==='year'?'Year · 年':scope==='month'?'Month · 月':'Day · 日'} — {context[scope].pillar}</h4>{scope!=='day'&&<p>Approx. pillar dates: {dateKey(context[scope].start)} – {dateKey(context[scope].end)}</p>}{badges(result.groups[scope],context[scope].pillar)}</div>)}
 <label>Hour time <input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
 <div data-pillar-scope="hour" data-pillar={hour.pillar}><h4>Hour · 时 — {hour.pillar}</h4>{badges(hour.found,hour.pillar,true)}</div>
 <details><summary>Matching hour intervals</summary><p>Local wall-clock intervals; daylight-saving days may have different elapsed hours.</p>{result.hours.filter(slot=>slot.found.length).map(slot=><div key={slot.startMinute}><strong>{clock(slot.startMinute)}–{clock(slot.endMinute)} · {slot.pillar}</strong>{badges(slot.found,slot.pillar,true)}</div>)}{!result.hours.some(slot=>slot.found.length)&&<p>No strengthened hour matches.</p>}</details></section>
}
