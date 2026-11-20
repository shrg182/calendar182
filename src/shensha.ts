// Manual-target rules and noon/midnight conventions from Health Calendar §19.
export const stems=[...'甲乙丙丁戊己庚辛壬癸'], branches=[...'子丑寅卯辰巳午未申酉戌亥']
export const pairs=Array.from({length:60},(_,i)=>stems[i%10]+branches[i%12])
export const items=[
 ['tiande','天德','shen'],['yuede','月德','shen'],['tianyi','天乙','shen'],['wenchang','文昌','shen'],
 ['lushen','禄神','shen'],['yima','驿马','shen'],['huagai','华盖','shen'],['jiangxing','将星','shen'],
 ['jinyu','金舆','shen'],['tianyi-medical','天医','shen'],['taohua','桃花','shen'],
 ['yangren','羊刃','sha'],['jiesha','劫煞','sha'],['zaisha','灾煞','sha'],['kongwang','空亡','sha'],
 ['shie','十恶大败','sha'],['yinyang','阴阳差错','sha'],['tianluodiwang','天罗地网','sha'],
 ['custom1','自定义①','custom'],['custom2','自定义②','custom'],['custom3','自定义③','custom'],
] as const
export type ItemId=typeof items[number][0]
export type Selections=Record<ItemId,{enabled:boolean;targets:string[]}>
export const birthScopes=['year','month','day','hour'] as const
export type BirthPillars=Record<typeof birthScopes[number],string>
export interface ShenshaSettings {version:1;zone:string;selections:Selections;birth:BirthPillars}
export function classifyTarget(target:string,birth:BirthPillars):'ming'|'yun'|'uncertain'|'unclassified'{
 const known=birthScopes.map(scope=>birth[scope]).filter(Boolean)
 if(known.some(pillar=>target.length===2?pillar===target:stems.includes(target)?pillar[0]===target:pillar[1]===target))return 'ming'
 return known.length===4?'yun':known.length?'uncertain':'unclassified'
}
export const originLabels={ming:'命 · stronger',yun:'运 · weaker',uncertain:'Uncertain · birth pillars incomplete',unclassified:'Unclassified · enter birth pillars'}
export function encounteredTargets(pillar:string,id:ItemId,settings:ShenshaSettings){
 return settings.selections[id].targets.filter(target=>[pillar[0],pillar[1],pillar].includes(target)).map(target=>({target,origin:classifyTarget(target,settings.birth)}))
}
export function targetsFor(id:ItemId):string[]{
 if(id==='shie')return ['甲辰','乙巳','丙申','丁亥','戊戌','己丑','庚辰','辛巳','壬申','癸亥']
 if(id==='yinyang')return ['丙子','丁丑','戊寅','辛卯','壬辰','癸巳','丙午','丁未','戊申','辛酉','壬戌','癸亥']
 if(id==='tianluodiwang')return ['戌','亥','辰','巳']
 if(id==='tiande'||id==='yuede')return [...stems,...branches]
 if(id==='zaisha'||id.startsWith('custom'))return [...stems,...branches,...pairs]
 return [...branches]
}
export function emptySettings():ShenshaSettings{return {version:1,zone:'',birth:{year:'',month:'',day:'',hour:''},selections:Object.fromEntries(items.map(([id])=>[id,{enabled:false,targets:[]}])) as unknown as Selections}}
export function validateSettings(raw:unknown):ShenshaSettings{
 if(!raw||typeof raw!=='object')throw Error('Invalid Shensha settings.')
 const value=raw as ShenshaSettings
 if(value.version!==1||typeof value.zone!=='string'||value.zone.length>100||!value.selections||typeof value.selections!=='object')throw Error('Invalid Shensha settings.')
 if(value.zone)new Intl.DateTimeFormat('en',{timeZone:value.zone}).format(0)
 const result=emptySettings();result.zone=value.zone
 // Missing birth fields are valid legacy settings; preserve existing selections.
 if(value.birth!==undefined){
  if(!value.birth||typeof value.birth!=='object')throw Error('Invalid birth pillars.')
  for(const scope of birthScopes){const pillar=value.birth[scope];if(typeof pillar!=='string'||(pillar!==''&&!pairs.includes(pillar)))throw Error('Choose valid birth pillars.');result.birth[scope]=pillar}
 }
 for(const [id] of items){const entry=value.selections[id]
  if(!entry||typeof entry.enabled!=='boolean'||!Array.isArray(entry.targets)||entry.targets.length>82||entry.targets.some(t=>typeof t!=='string'||!targetsFor(id).includes(t))||(entry.enabled&&!entry.targets.length))throw Error(`Choose valid targets for ${id}.`)
  result.selections[id]={enabled:entry.enabled,targets:[...new Set(entry.targets)]}
 }
 return result
}
const mod=(n:number,m:number)=>((n%m)+m)%m
const jie=[['小寒',285,0,6,11],['立春',315,1,4,0],['惊蛰',345,2,6,1],['清明',15,3,5,2],['立夏',45,4,6,3],['芒种',75,5,6,4],['小暑',105,6,7,5],['立秋',135,7,8,6],['白露',165,8,8,7],['寒露',195,9,8,8],['立冬',225,10,7,9],['大雪',255,11,7,10]] as const
function longitude(t:number){const d=t/86400000+2440587.5-2451545,g=(357.529+0.98560028*d)*Math.PI/180;return mod(280.459+0.98564736*d+1.915*Math.sin(g)+.020*Math.sin(2*g),360)}
export function termsForYear(year:number){return jie.map(([name,target,month,day,offset])=>{
 const guess=Date.UTC(year,month,day,12);let low=guess-7*86400000,high=guess+7*86400000
 const delta=(t:number)=>mod(longitude(t)-target+180,360)-180
 if(delta(low)<=0&&delta(high)>=0){for(let i=0;i<42;i++){const mid=(low+high)/2;if(delta(mid)<0)low=mid;else high=mid}}
 else low=high=guess
 return {name,year,offset,instant:(low+high)/2}
})}
export function noon(date:Date,zone:string){
 if(!zone)return new Date(date.getFullYear(),date.getMonth(),date.getDate(),12).getTime()
 const target=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12)
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})
 let instant=target
 for(let i=0;i<4;i++){const p=Object.fromEntries(fmt.formatToParts(instant).map(p=>[p.type,p.value]));const delta=target-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);instant+=delta;if(!delta)break}
 return instant
}
export function dayPillar(date:Date){const cycle=mod(Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000)+2440588+49,60);return pairs[cycle]}
function effectiveDate(instant:number,zone:string){
 let d=new Date(instant)
 if(zone){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(instant).map(p=>[p.type,p.value]));d=new Date(+p.year,+p.month-1,+p.day,12)}
 const result=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);if(noon(result,zone)<instant)result.setDate(result.getDate()+1);return result
}
export function contextForDate(date:Date,zone=''){
 if(!Number.isFinite(date.getTime())||date.getFullYear()<1901||date.getFullYear()>2100)throw Error('Date outside 1901–2100.')
 const instant=noon(date,zone),year=date.getFullYear()
 const terms=[year-1,year,year+1,year+2].flatMap(termsForYear).sort((a,b)=>a.instant-b.instant)
 const term=terms.filter(t=>t.instant<=instant).at(-1)!
 const start=terms.filter(t=>t.offset===0&&t.instant<=instant).at(-1)!
 const end=terms.find(t=>t.offset===0&&t.instant>instant)!
 const cycle=mod(start.year-4,60),firstStem=(cycle%10%5)*2+2
 const month=stems[mod(firstStem+term.offset,10)]+branches[mod(2+term.offset,12)]
 function range(pillar:string,a:number,b:number){const last=effectiveDate(b,zone);last.setDate(last.getDate()-1);return {pillar,start:effectiveDate(a,zone),end:last}}
 const day=dayPillar(date),dayStem=stems.indexOf(day[0]),hours=[0,1,3,5,7,9,11,13,15,17,19,21,23]
 return {year:range(pairs[cycle],start.instant,end.instant),month:range(month,term.instant,terms.find(t=>t.instant>instant)!.instant),day:{pillar:day},
  hours:hours.map((h,i)=>{const branch=Math.floor((h+1)/2)%12;return {pillar:stems[mod((dayStem%5)*2+branch,10)]+branches[branch],startMinute:h*60,endMinute:(hours[i+1]??24)*60}})}
}
export function matches(pillar:string,selections:Selections){return items.filter(([id])=>selections[id].enabled&&selections[id].targets.some(t=>[pillar[0],pillar[1],pillar].includes(t))).map(([id])=>id)}
export function evaluate(context:ReturnType<typeof contextForDate>,selections:Selections){
 const groups={year:matches(context.year.pillar,selections),month:matches(context.month.pillar,selections),day:matches(context.day.pillar,selections)}
 const counts=Object.fromEntries(items.map(([id])=>[id,Object.values(groups).filter(found=>found.includes(id)).length])) as Record<ItemId,number>
 const hours=context.hours.map(slot=>({...slot,found:matches(slot.pillar,selections).filter(id=>counts[id]>=2)}))
 return {groups,counts,hours,inactive:counts.kongwang>0}
}

// Civil-date iteration preserves dates across daylight-saving transitions.
export function upcomingMatches(start:string,end:string,settings:ShenshaSettings){
 function parse(key:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key))throw Error('Choose valid start and end dates.')
  const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d,12)
  if(y<1901||y>2100||date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)throw Error('Choose valid dates within 1901–2100.')
  return date
 }
 const first=parse(start),last=parse(end)
 const days=Math.round((Date.UTC(last.getFullYear(),last.getMonth(),last.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000)+1
 if(days<1)throw Error('End date must be on or after start date.')
 if(days>93)throw Error('Choose a range of 93 days or fewer.')
 const rows=[]
 for(const date=new Date(first);date<=last;date.setDate(date.getDate()+1)){
  const context=contextForDate(date,settings.zone),result=evaluate(context,settings.selections)
  if(Object.values(result.groups).some(group=>group.length))rows.push({date:new Date(date),context,result})
 }
 return rows
}
