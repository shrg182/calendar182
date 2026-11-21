import {ShenshaBackupPanel} from './ShenshaBackupPanel'
import {useRef,useState} from 'react'
import {useShensha} from './useShensha'
import {contextForDate,evaluate,items,targetsFor,originLabels,encounteredTargets,effectFor,stems,branches} from './shensha'
import type {ItemId,ShenshaSettings} from './shensha'
type Model=ReturnType<typeof useShensha>
function ShenshaSettingRow({id,name,kind,model}:{id:ItemId;name:string;kind:'shen'|'sha'|'custom';model:Model}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false)
 const summary=useRef<HTMLElement|null>(null)
 const rule=model.draft.selections[id]
 function update(changes:Partial<typeof rule>){model.setDraft({...model.draft,selections:{...model.draft.selections,[id]:{...rule,...changes}}})}
 const allowed=targetsFor(id),filtered=allowed.filter(target=>target.includes(query.trim()))
 const groups=[['天干 · Heavenly stems',filtered.filter(t=>stems.includes(t))],['地支 · Earthly branches',filtered.filter(t=>branches.includes(t))],['干支 · Stem–branch pairs',filtered.filter(t=>t.length===2)]] as const
 return <div className="shensha-picker shensha-setting-row" data-setting={id}>
 <div className="shensha-row-controls"><label className="shensha-check"><input type="checkbox" checked={rule.enabled} onChange={e=>{update({enabled:e.target.checked});if(!e.target.checked)setOpen(false)}}/>Enable {name}</label>
 <label className="shensha-strength">Strength<select aria-label={`${name} strength`} value={rule.origin||'unclassified'} onChange={e=>update({origin:e.target.value as 'ming'|'yun'|'unclassified'})}><option value="unclassified">未选 · Not chosen</option><option value="ming">命 · stronger</option><option value="yun">运 · weaker</option></select></label>
 {kind==='custom'&&<label className="shensha-effect">Effect<select aria-label={`${name} effect`} value={rule.effect||''} onChange={e=>update({effect:e.target.value?e.target.value as 'positive'|'negative'|'neutral':undefined})}><option value="">Not chosen</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select></label>}</div>
 <div className="shensha-target-picker"><div className="shensha-chips" aria-label={`${name} selected targets`}>{rule.targets.length?rule.targets.map(target=><button className="shensha-chip" type="button" key={target} aria-label={`${name} remove ${target}`} disabled={!rule.enabled} onClick={()=>{update({targets:rule.targets.filter(t=>t!==target)});summary.current?.focus()}}>{target}<span aria-hidden="true"> ×</span></button>):<span className="shensha-no-targets">No targets selected</span>}</div>
 <details open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary ref={summary} aria-label={`${name} · Choose targets`} aria-disabled={!rule.enabled} onClick={event=>{if(!rule.enabled)event.preventDefault()}} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);summary.current?.focus()}}}>Choose targets <span className="shensha-target-count">({rule.targets.length})</span></summary>
 <div className="shensha-options" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);summary.current?.focus()}}}><label>Search {name} targets<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="甲、子、甲子…" autoComplete="off" spellCheck={false}/></label>
 {groups.filter(([,targets])=>targets.length).map(([label,targets])=><fieldset key={label} disabled={!rule.enabled}><legend>{label}</legend><div className="shensha-targets">{targets.map(target=><label key={target}><input type="checkbox" aria-label={target} checked={rule.targets.includes(target)} onChange={e=>update({targets:e.target.checked?[...rule.targets,target]:rule.targets.filter(t=>t!==target)})}/>{target}</label>)}</div></fieldset>)}
 {!filtered.length&&<p role="status">No matching targets.</p>}</div></details>
 </div></div>
}
export function ShenshaSettingsPanel({model}:{model:Model}){
 const [search,setSearch]=useState('')
 function describe(value:ShenshaSettings){return <><p>Time zone: {value.zone||'Device time zone'}</p><p>Retained birth pillars: {Object.values(value.birth).filter(Boolean).join('、')||'None'}</p><ul>{items.map(([id,name])=>{const rule=value.selections[id];return <li key={id}>{name}: {rule.enabled?'On':'Off'} · {rule.targets.join('、')||'No targets'} · {originLabels[rule.origin||'unclassified']}{rule.effect?' · '+rule.effect:''}</li>})}</ul></>}
 return <section className="shensha-settings" aria-label="Shensha settings"><h2>Shensha · 神煞</h2>
 <p>Enable an item, then choose its matching targets. Turning it off retains its targets. {model.computer?'Saved selections sync through your computer with this account when computer sync is enabled.':'These selections are saved in this browser only.'} Shensha settings are separate from notes backups.</p>
 <fieldset className="shensha-editor" disabled={!model.ready||model.busy}><label>Calculation time zone <input value={model.draft.zone} placeholder="Device time zone (leave blank)" onChange={e=>model.setDraft({...model.draft,zone:e.target.value.trim()})}/></label>
 <p>Use an IANA name such as America/Detroit or Asia/Shanghai. Blank uses this device’s time zone.</p>
 <label>Find Shensha <input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {(['shen','sha','custom'] as const).map(kind=>{
 const visible=items.filter(([id,name,itemKind])=>itemKind===kind&&(id+' '+name).toLowerCase().includes(search.toLowerCase()))
 return visible.length?<fieldset className="shensha-setting-group" key={kind}><legend>{kind==='shen'?'神 · Shen':kind==='sha'?'煞 · Sha':'自定义 · Custom'}</legend>{visible.map(([id,name])=><ShenshaSettingRow key={id} id={id} name={name} kind={kind} model={model}/>)}</fieldset>:null
 })}
 {!items.some(([id,name])=>(id+' '+name).toLowerCase().includes(search.toLowerCase()))&&<p role="status">No matching Shensha.</p>}
 <div className="note-actions"><button onClick={model.save}>Save Shensha selections</button><button onClick={model.reload}>Load saved selections</button></div>
 {model.dirty&&<p>Unsaved Shensha selections. Day results use your last saved selections.</p>}<p role="status">{model.status}</p>
 </fieldset>
 {model.conflict&&<section aria-label="Shensha sync conflict"><h3>Review Shensha settings conflict</h3><p>Another device saved different settings. Export your local settings to keep a separate copy before choosing. This replaces the complete settings version, including retained birth data.</p><details><summary>This device’s saved settings</summary>{describe(model.saved)}</details><details><summary>Computer settings</summary>{model.conflict.settings&&describe(model.conflict.settings)}</details><button disabled={model.dirty} onClick={()=>void model.resolveConflict('local')}>Keep this device’s settings</button><button disabled={model.dirty} onClick={()=>void model.resolveConflict('remote')}>Use computer settings</button></section>}
 <ShenshaBackupPanel model={model}/>
 <details><summary>Shensha calculation conventions</summary><p>Matches use manually selected targets, not birth-chart inference. Year changes at 立春; month changes at the twelve 节. Year/month boundaries use estimated solar-term times evaluated at local noon. Day changes at midnight. Both 子 segments use that civil date’s day stem. Hour results require the same item to match at least two year/month/day pillars. Counts are per item and pillar. 空亡 is a moderating influence, not cancellation. Other matches retain their natural colors and strength; no percentage reduction is assigned. This is traditional rule matching, not a prediction.</p></details></section>
}
const clock=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
export function ShenshaDay({date,settings}:{date:Date;settings:ShenshaSettings;onSettings?:()=>void}){
 const [time,setTime]=useState('12:00')
 const context=contextForDate(date,settings.zone),result=evaluate(context,settings.selections)
 const [h,m]=time.split(':').map(Number),minute=Number.isFinite(h*60+m)?h*60+m:720
 const hour=result.hours.find(slot=>slot.startMinute<=minute&&slot.endMinute>minute)!
 function badges(found:ItemId[],pillar:string,hourMatch=false){return found.length?<ul className={`shensha-badges `}>{found.map(id=>{const item=items.find(item=>item[0]===id)!,count=result.counts[id]+(hourMatch?1:0),sign=effectFor(id,settings)==='positive'?'+':effectFor(id,settings)==='negative'?'-':'';return <li key={id} className={`effect-${effectFor(id,settings)}  strength-${settings.selections[id].origin||'unclassified'}`} data-shensha={id}>{item[1]}{count>1&&sign?<span aria-label={`${count} matching pillars`}> {sign.repeat(count)}</span>:null}<div className="encounter-origins">{encounteredTargets(pillar,id,settings).map(({target,origin})=><span key={target} className={`origin-${origin}`} data-origin={origin}>{target}</span>)}</div></li>})}</ul>:null}
 if(!Object.values(result.groups).some(group=>group.length))return null
 const hasHours=result.hours.some(slot=>slot.found.length)
 return <section className="shensha-day" aria-label="Shensha day results"><h3>神煞</h3>
 {(['year','month','day'] as const).filter(scope=>result.groups[scope].length).map(scope=><div key={scope} data-pillar-scope={scope} data-pillar={context[scope].pillar}><h4>{scope==='year'?'年':scope==='month'?'月':'日'} · {context[scope].pillar}</h4>{badges(result.groups[scope],context[scope].pillar)}</div>)}
 {hasHours&&<><label>Hour <input aria-label="Hour time" type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
 {hour.found.length>0&&<div data-pillar-scope="hour" data-pillar={hour.pillar}><h4>时 · {hour.pillar}</h4>{badges(hour.found,hour.pillar,true)}</div>}
 <details><summary>时段</summary>{result.hours.filter(slot=>slot.found.length).map(slot=><div key={slot.startMinute}><strong>{clock(slot.startMinute)}–{clock(slot.endMinute)} · {slot.pillar}</strong>{badges(slot.found,slot.pillar,true)}</div>)}</details></>}
 </section>
}
