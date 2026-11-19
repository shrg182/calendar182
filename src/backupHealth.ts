export interface BackupHealth {
  enabled:boolean;running:boolean;intervalSeconds:number|null;snapshotCount:number
  lastSnapshotAt:number|null;snapshotFailed:boolean;copyConfigured:boolean;copyFailed:boolean
  copyInProgress:boolean;lastCopyVerifiedAt:number|null;managedStartup:boolean
}
export function parseBackupHealth(value:unknown):BackupHealth{
  if(!value||typeof value!=='object')throw new Error('Invalid backup status.')
  const data=value as BackupHealth
  for(const key of ['enabled','running','snapshotFailed','copyConfigured','copyFailed','copyInProgress','managedStartup'] as const){
    if(typeof data[key]!=='boolean')throw new Error('Invalid backup status.')
  }
  if(!Number.isSafeInteger(data.snapshotCount)||data.snapshotCount<0)throw new Error('Invalid snapshot count.')
  for(const stamp of [data.lastSnapshotAt,data.lastCopyVerifiedAt])if(stamp!==null&&(typeof stamp!=='number'||!Number.isFinite(stamp)||stamp<0||stamp>1e12))throw new Error('Invalid backup time.')
  if(data.intervalSeconds!==null&&(typeof data.intervalSeconds!=='number'||!Number.isFinite(data.intervalSeconds)||data.intervalSeconds<=0))throw new Error('Invalid backup interval.')
  if(data.enabled&&data.intervalSeconds===null)throw new Error('Missing backup interval.')
  return data
}
