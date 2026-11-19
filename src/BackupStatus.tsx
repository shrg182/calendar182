import {useEffect,useState} from 'react'
import {computerApi} from './computerSync'
import {parseBackupHealth} from './backupHealth'
import type {BackupHealth} from './backupHealth'

const time=(stamp:number|null)=>stamp===null?'Not yet verified':new Date(stamp*1000).toLocaleString()
export function BackupStatus({account}:{account:string}){
  const [refresh,setRefresh]=useState(0)
  const [state,setState]=useState<{data:BackupHealth|null;error:string;loading:boolean}>({data:null,error:'',loading:true})
  useEffect(()=>{
    let active=true,pending=false
    const load=async(force=false)=>{
      if(pending||(!force&&document.hidden))return
      pending=true
      try{
        const data=parseBackupHealth(await computerApi('backup-status',undefined,account))
        if(active)setState({data,error:'',loading:false})
      }catch{if(active)setState(previous=>({...previous,error:'Backup status could not be refreshed. Check the computer connection or reconnect sign-in.',loading:false}))}
      finally{pending=false}
    }
    void load(true)
    const timer=setInterval(()=>void load(),30000)
    const resume=()=>void load()
    document.addEventListener('visibilitychange',resume)
    return ()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',resume)}
  },[account,refresh])
  const {data,error,loading}=state
  return <section className="backup-health" aria-labelledby="backup-health-title" aria-busy={loading}>
    <h3 id="backup-health-title">Computer service & backups</h3>
    {loading&&<p role="status">Checking backup status…</p>}
    {error&&<p role="alert">{error} {data?'Values below are the last known status.':''}</p>}
    {data&&<>
      <dl><dt>Service startup</dt><dd>{data.managedStartup?'Automatic at Mac sign-in':'Started manually'}</dd>
      <dt>Automatic backups</dt><dd>{!data.enabled?'Disabled':data.running?`Running — every ${data.intervalSeconds!<60?`${data.intervalSeconds} seconds`:`${Math.round(data.intervalSeconds!/60)} minutes`}`:'Backup worker is not running'}</dd>
      <dt>Latest local snapshot</dt><dd>{time(data.lastSnapshotAt)}</dd>
      <dt>Retained local snapshots</dt><dd>{data.snapshotCount}</dd>
      <dt>Destination copying</dt><dd>{!data.copyConfigured?'Not configured':data.copyInProgress?'Checking destination copy…':'Configured'}</dd>
      <dt>Last verified destination copy</dt><dd>{time(data.lastCopyVerifiedAt)}</dd></dl>
      {data.snapshotFailed&&<p role="alert">Local snapshot failed. Previous verified snapshots are retained; check the computer’s backup storage.</p>}
      {data.copyFailed&&<p role="alert">Destination copy or status verification failed. Local snapshots are retained; check the selected backup folder.</p>}
      <p>Destination verification checks files in the selected folder. It does not confirm a new cloud upload. The Mac must remain awake and signed in.</p>
    </>}
    <button disabled={loading} onClick={()=>{setState(previous=>({...previous,loading:true}));setRefresh(value=>value+1)}}>Refresh backup status</button>
  </section>
}
