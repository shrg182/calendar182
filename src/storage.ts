import {readNotes,saveNote,exportBackup,importNotes,readNoteHistory,subscribeNoteChanges} from './notes.ts'

/** Local persistence remains independent of optional cloud sync/backup providers. */
export interface NoteStore {
  readNotes: typeof readNotes
  saveNote: typeof saveNote
  exportBackup: typeof exportBackup
  importNotes: typeof importNotes
  readNoteHistory: typeof readNoteHistory
  subscribe: typeof subscribeNoteChanges
}

export const noteStore: NoteStore = {readNotes,saveNote,exportBackup,importNotes,readNoteHistory,subscribe:subscribeNoteChanges}

export interface StorageOption {
  id: string
  name: string
  purpose: string
  available: boolean
  status: string
}

// Availability describes the Calendar app, not the separate sync experiment.
export const storageOptions: readonly StorageOption[] = [
  {id:'local',name:'This device',purpose:'Save notes in this browser without a cloud account.',available:true,status:'Active'},
  {id:'computer',name:'Your computer',purpose:'Synchronize through your own computer.',available:false,status:'Prototype only — not connected to Calendar'},
  {id:'onedrive',name:'OneDrive',purpose:'Use your Microsoft cloud storage account.',available:false,status:'Integration not available yet'},
  {id:'google-drive',name:'Google Drive',purpose:'Use your Google cloud storage account.',available:false,status:'Integration not available yet'},
  {id:'dropbox',name:'Dropbox',purpose:'Use your Dropbox cloud storage account.',available:false,status:'Integration not available yet'},
]

export function getAvailableStorageOption(id:string):StorageOption {
  const option=storageOptions.find(option=>option.id===id)
  if(!option?.available)throw new Error('This storage option is not available. Your current storage has not changed.')
  return option
}
