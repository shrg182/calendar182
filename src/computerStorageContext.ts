import {createContext} from 'react'

export interface ComputerStorageControl {
  account:string
  enabled:boolean
  busy:boolean
  syncing:boolean
  canSync:boolean
  syncError:string|null
  syncNow:()=>void
  select:(enabled:boolean)=>Promise<void>
}
export const ComputerStorageContext=createContext<ComputerStorageControl|null>(null)
