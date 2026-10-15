// App files may update automatically; private ledger storage is never touched here.
export function initAppUpdates({win=window,doc=document,nav=navigator,reload=()=>win.location.reload()}={}){
 if(!nav.serviceWorker)return;
 const workers=nav.serviceWorker;
 let registration,checking=false,pending=false,reloading=false,controlled=!!workers.controller,retry;
 const blocked=()=>!!doc.querySelector('dialog[open]')||doc.querySelector('#storage-error')?.hidden===false||doc.documentElement.dataset.syncBusy==='true'||doc.documentElement.dataset.syncPending==='true';
 function apply(){
  if(!pending||reloading||doc.visibilityState==='hidden')return;
  if(blocked()){
   let note=doc.querySelector('#app-update-status');
   if(!note){note=doc.createElement('p');note.id='app-update-status';note.className='app-update-status';note.setAttribute('role','status');doc.querySelector('main')?.prepend(note);}
   note.textContent='An app update is ready. It will apply automatically after you finish and close this form, or syncing completes.';
   if(!retry)retry=win.setTimeout(()=>{retry=null;apply();},1000);
   return;
  }
  reloading=true;reload();
 }
 workers.addEventListener('controllerchange',()=>{if(!controlled){controlled=true;return;}pending=true;apply();});
 async function check(){
  apply();if(checking||nav.onLine===false||doc.visibilityState==='hidden')return;
  checking=true;
  try{if(!registration)registration=await workers.register('./sw.js',{updateViaCache:'none'});await registration.update();}catch{/* Offline: keep the current working app. */}finally{checking=false;}
 }
 doc.addEventListener('close',apply,true);
 doc.addEventListener('perk:update-check',apply);
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState!=='hidden')check();});
 win.addEventListener('focus',check);win.addEventListener('online',check);
 win.setInterval(check,5*60*1000);
 check();return {check};
}
