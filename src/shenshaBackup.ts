import {items,validateSettings} from './shensha.ts'
import type {ShenshaSettings} from './shensha.ts'
export const MAX_SHENSHA_BACKUP_BYTES=128*1024
export function createShenshaBackup(settings:ShenshaSettings){return {format:'calendar182-shensha',version:1,exportedAt:new Date().toISOString(),settings:validateSettings(settings)}}
export function parseShenshaBackup(text:string){
 if(new TextEncoder().encode(text).length>MAX_SHENSHA_BACKUP_BYTES)throw Error('Choose a Shensha backup smaller than 128 KB.')
 let raw;try{raw=JSON.parse(text)}catch{throw Error('This file is not valid JSON.')}
 if(!raw||raw.format!=='calendar182-shensha'||raw.version!==1||typeof raw.exportedAt!=='string'||!Number.isFinite(Date.parse(raw.exportedAt)))throw Error('Choose a supported Calendar182 Shensha settings backup (version 1).')
 const settings=validateSettings(raw.settings)
 if(Object.keys(raw.settings.selections).some(id=>!items.some(item=>item[0]===id)))throw Error('This backup contains unknown Shensha items.')
 return {settings,exportedAt:raw.exportedAt}
}
