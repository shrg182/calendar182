import {storageScope} from './notes.ts'

export function withComputerLock<T>(action:()=>Promise<T>):Promise<T>{
  return navigator.locks?navigator.locks.request(`${storageScope()}:computer-sync`,action):action()
}
