import {createContext} from 'react'

export interface ComputerStorageControl {
  enabled:boolean
  busy:boolean
  select:(enabled:boolean)=>Promise<void>
}
export const ComputerStorageContext=createContext<ComputerStorageControl|null>(null)
