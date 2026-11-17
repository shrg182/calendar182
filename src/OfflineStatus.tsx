import {useEffect,useState} from 'react'

export function OfflineStatus(){
  const [canCache]=useState(()=>window.isSecureContext&&'serviceWorker' in navigator&&import.meta.env.PROD)
  const [status,setStatus]=useState(()=>!window.isSecureContext||!('serviceWorker' in navigator)?'Offline reopening needs a trusted HTTPS connection. This address supports saving locally while the page stays open.':!import.meta.env.PROD?'Offline app caching is available in the built test app.':'Preparing offline app…')
  const [update,setUpdate]=useState(false)
  useEffect(()=>{
    if(!canCache)return
    let active=true,registration:ServiceWorkerRegistration|undefined
    const watch=(worker:ServiceWorker)=>{
      const changed=()=>{
        if(!active)return
        if(worker.state==='activated')setStatus('Offline app ready. Saved local notes can reopen in this browser without a connection.')
        if(worker.state==='installed'&&registration?.active)setUpdate(true)
        if(worker.state==='redundant'&&!registration?.active)setStatus('Offline app could not be prepared. Keep this page open and retry when connected.')
      }
      worker.addEventListener('statechange',changed);changed()
    }
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}offline-worker.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(value=>{
      if(!active)return
      registration=value
      if(value.active)setStatus('Offline app ready. Saved local notes can reopen in this browser without a connection.')
      if(value.waiting)setUpdate(true)
      if(value.installing)watch(value.installing)
      value.addEventListener('updatefound',()=>{if(value.installing)watch(value.installing)})
    }).catch(async()=>{
      const existing=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).catch(()=>undefined)
      if(active)setStatus(existing?.active?'Offline app ready. Saved local notes can reopen in this browser without a connection.':'Offline app could not be prepared. Keep this page open and retry when connected.')
    })
    const check=()=>{if(registration&&navigator.onLine)void registration.update().catch(()=>{})}
    window.addEventListener('online',check);window.addEventListener('focus',check)
    return ()=>{active=false;window.removeEventListener('online',check);window.removeEventListener('focus',check)}
  },[canCache])
  return <aside className="computer-sync" aria-label="Offline availability"><p role="status">{status}</p>{update&&<p role="status">An app update is ready. Save any drafts, close all Calendar tabs, then reopen Calendar to install it. Saved notes and pending edits are kept.</p>}</aside>
}
