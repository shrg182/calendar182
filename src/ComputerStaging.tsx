import {useEffect,useRef,useState} from 'react'
import {ComputerApiError,computerApi,parseSession,syncComputer,verifyReconnectedSession} from './computerSync'
import type {ComputerSession} from './computerSync'
import {configureComputerStorage,readComputerSyncEnabled,writeComputerSyncEnabled} from './notes'
import {ComputerStorageContext} from './computerStorageContext'
import App from './App'
import {rememberComputer,rememberedComputer} from './rememberedComputer'

export function ComputerStaging(){
  const [session,setSession]=useState<ComputerSession|null>(null)
  const [localAccess,setLocalAccess]=useState(false),[verifyLocal,setVerifyLocal]=useState(false)
  const [account,setAccount]=useState('account-a'),[token,setToken]=useState('')
  const [status,setStatus]=useState('Checking computer connection…')
  const [busy,setBusy]=useState(true)
  async function activate(value:unknown){
    const next=parseSession(value)
    configureComputerStorage(next.account)
    await rememberComputer(next)
    setLocalAccess(false);setVerifyLocal(false)
    setSession(next)
  }
  useEffect(()=>{
    let active=true
    computerApi('session').then(async value=>{if(active)await activate(value)}).catch(async error=>{
      try{
        const saved=await rememberedComputer()
        if(active&&saved){
          configureComputerStorage(saved.account)
          setLocalAccess(true);setVerifyLocal(!(error instanceof ComputerApiError&&error.status===401));setSession(saved)
        }else if(active)setStatus(error instanceof ComputerApiError&&error.status===401?'Connect with the generated test credentials. Use synthetic notes only.':'No previously connected account is available here. Connect to the computer once before reopening its notes offline.')
      }catch{if(active)setStatus('Local notes could not be opened. Reconnect to the computer and retry; stored notes have not been cleared.')}
    }).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[])
  if(session)return <ComputerWorkspace session={session} localAccess={localAccess} verifyLocal={verifyLocal}/>
  return <main className="app"><section className="panel"><h1>Calendar computer sync test</h1>
    <p>This separate test build uses its own notes database. Your usual Calendar notes are untouched. Use fake notes only; this build uses test authentication.</p>
    <form className="computer-login" onSubmit={async event=>{
      event.preventDefault();if(busy)return;setBusy(true)
      try{await activate(await computerApi('login',{account,token}));setToken('')}
      catch(error){setToken('');setStatus(error instanceof Error?error.message:'Connection failed.')}
      finally{setBusy(false)}
    }}>
      <label htmlFor="computer-account">Test account</label><select id="computer-account" value={account} disabled={busy} onChange={e=>setAccount(e.target.value)}><option>account-a</option><option>account-b</option></select>
      <label htmlFor="computer-token">Test token</label><input id="computer-token" type="password" autoComplete="off" required value={token} disabled={busy} onChange={e=>setToken(e.target.value)}/>
      <button disabled={busy} type="submit">Connect computer sync</button>
    </form><p role="status">{status}</p></section></main>
}
function ComputerWorkspace({session,localAccess,verifyLocal}:{session:ComputerSession;localAccess:boolean;verifyLocal:boolean}){
  const [status,setStatus]=useState(localAccess?'Local notes opened. Saved edits stay queued until the computer session is verified.':'Ready to sync.'),[busy,setBusy]=useState(false)
  const [automatic,setAutomatic]=useState(true)
  const [enabled,setEnabled]=useState<boolean|null>(null),[changing,setChanging]=useState(false)
  const [authRequired,setAuthRequired]=useState(localAccess),[reconnecting,setReconnecting]=useState(false)
  const [needsVerification,setNeedsVerification]=useState(verifyLocal)
  const verifying=useRef(false)
  const [reconnectToken,setReconnectToken]=useState(''),[reconnectStatus,setReconnectStatus]=useState('')
  const selectionPending=useRef(false)
  useEffect(()=>{
    let active=true
    readComputerSyncEnabled().then(value=>{if(active){setEnabled(value);if(!value)setStatus('Computer sync paused. Notes and pending edits stay on this device.')}}).catch(()=>{if(active)setStatus('Storage selection could not be loaded. Reload to retry; sync has not started.')})
    return ()=>{active=false}
  },[])
  async function select(next:boolean){
    if(run.current||selectionPending.current||enabled===null||next===enabled)return
    selectionPending.current=true;setChanging(true)
    try{
      await writeComputerSyncEnabled(next)
      setEnabled(next)
      if(next)setWake(value=>value+1)
      setStatus(next?'Computer sync enabled. Pending saved edits will upload.':'Computer sync paused. Notes and pending edits stay on this device.')
    }catch{setStatus('Could not change storage selection. Your previous selection is retained.');setWake(value=>value+1)}
    finally{selectionPending.current=false;setChanging(false)}
  }
  const run=useRef(false)
  const [wake,setWake]=useState(0)
  const consumedWake=useRef(0)
  async function verifySavedSession(){
    if(verifying.current||!needsVerification)return
    verifying.current=true
    try{
      verifyReconnectedSession(await computerApi('session',undefined,session.account),session)
      setNeedsVerification(false);setAuthRequired(false)
      setStatus(enabled?'Computer connection restored. Saved changes can synchronize; unsaved drafts stay here.':'Computer connection restored. Sync remains paused; local notes and pending edits are retained.')
      setWake(value=>value+1)
    }catch(error){
      if(error instanceof ComputerApiError&&error.status===401){setNeedsVerification(false);setStatus('Sign-in expired. Reconnect below; local notes and drafts are retained.')}
      else setStatus(error instanceof Error&&error.message.includes('identity changed')?error.message:'Computer connection unavailable. Local notes and pending edits are retained.')
    }finally{verifying.current=false}
  }
  useEffect(()=>{
    if(!needsVerification)return
    const check=()=>{if(navigator.onLine)void verifySavedSession()}
    window.addEventListener('online',check);window.addEventListener('focus',check)
    return ()=>{window.removeEventListener('online',check);window.removeEventListener('focus',check)}
  })
  async function reconnect(){
    if(reconnecting||run.current)return
    setReconnecting(true);setReconnectStatus('Reconnecting…')
    try{
      verifyReconnectedSession(await computerApi('login',{account:session.account,token:reconnectToken}),session)
      setAuthRequired(false)
      setReconnectStatus('')
      if(enabled){setStatus('Reconnected. Resuming saved changes; unsaved drafts remain on this device.');setWake(value=>value+1)}
      else setStatus('Reconnected. Computer sync remains paused; notes and pending edits stay on this device.')
    }catch(error){setReconnectStatus(error instanceof Error?error.message:'Could not reconnect. Local changes are retained.')}
    finally{setReconnectToken('');setReconnecting(false)}
  }
  useEffect(()=>{
    if(enabled!==true||authRequired)return
    let active=true,timer:ReturnType<typeof setTimeout>,retry=2000,retryAllowed=true
    async function tick(){
      if(!active||selectionPending.current)return
      if(run.current){timer=setTimeout(tick,250);return}
      if(document.hidden&&automatic){timer=setTimeout(tick,15000);return}
      run.current=true;setBusy(true)
      try{
        // Coordinate open tabs where Web Locks is available. The protocol also
        // tolerates exact retries; single-tab use is required on insecure LANs.
        const sync=async()=>{
          if(!active||selectionPending.current||!await readComputerSyncEnabled())return null
          return syncComputer(session)
        }
        const result=navigator.locks?await navigator.locks.request('calendar-computer-sync',sync):await sync()
        if(!result){if(active){setEnabled(false);setStatus('Computer sync paused. Notes and pending edits stay on this device.')}return}
        if(active)setStatus(result.more||result.pending?'Changes pending; sync will continue.':'Saved notes synced. Unsaved drafts stay on this device.')
        retry=result.more||result.pending?250:15000
      }catch(error){
        if(active){
          setStatus(error instanceof Error?error.message:'Sync failed; local changes retained.')
          if(error instanceof ComputerApiError&&error.status===401){retryAllowed=false;setAuthRequired(true)}
        }
        retry=Math.min(retry*2,60000)
      }
      finally{run.current=false;setBusy(false);if(active&&automatic&&retryAllowed)timer=setTimeout(tick,retry)}
    }
    const manual=wake!==consumedWake.current
    consumedWake.current=wake
    if(automatic||manual)void tick()
    const kick=()=>{if(automatic){clearTimeout(timer);if(!run.current)void tick()}}
    window.addEventListener('online',kick);window.addEventListener('focus',kick);window.addEventListener('calendar-note-saved',kick);document.addEventListener('visibilitychange',kick)
    return ()=>{active=false;clearTimeout(timer);window.removeEventListener('online',kick);window.removeEventListener('focus',kick);window.removeEventListener('calendar-note-saved',kick);document.removeEventListener('visibilitychange',kick)}
  },[session,wake,automatic,enabled,authRequired])
  return <ComputerStorageContext.Provider value={{enabled:enabled===true,busy:busy||changing||reconnecting||enabled===null,select}}><aside className="computer-sync" aria-label="Computer synchronization"><strong>Computer sync test · {session.account}</strong><p>Separate test notes. One tab per browser profile. Keep the computer service running.</p><label><input type="checkbox" checked={automatic} disabled={enabled!==true||changing||authRequired} onChange={event=>setAutomatic(event.target.checked)}/> Automatic sync while this page is open</label><button disabled={busy||changing||enabled!==true||authRequired} onClick={()=>setWake(value=>value+1)}>Sync now</button><p role="status">{status}</p>
    {needsVerification&&<button onClick={()=>void verifySavedSession()}>Check computer connection</button>}
    {authRequired&&!needsVerification&&<form className="computer-login" aria-label="Reconnect computer synchronization" onSubmit={event=>{event.preventDefault();void reconnect()}}>
      <p>Reconnect <strong>{session.account}</strong> without reloading. Your notes, pending edits and unsaved drafts stay in place.</p>
      <label htmlFor="reconnect-token">Reconnect test token</label><input id="reconnect-token" type="password" autoComplete="off" required disabled={reconnecting} value={reconnectToken} onChange={event=>setReconnectToken(event.target.value)}/>
      <button disabled={reconnecting} type="submit">Reconnect same account</button>
      {reconnectStatus&&<p role="alert">{reconnectStatus}</p>}
    </form>}
  </aside><App/></ComputerStorageContext.Provider>
}
