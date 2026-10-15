document.querySelector('#update').onclick=async()=>{
 const button=document.querySelector('#update'),status=document.querySelector('#status');button.disabled=true;status.textContent='Refreshing app files…';
 try{
  const scope=new URL('./',location.href).href;
  if('serviceWorker' in navigator){for(const registration of await navigator.serviceWorker.getRegistrations())if(registration.scope===scope)await registration.unregister();}
  if('caches' in window){for(const key of await caches.keys())if(key.startsWith('perk-ledger-shell-'+scope+'-'))await caches.delete(key);}
  status.textContent='Ready. Your saved records have not been changed. Open the updated app below, then retry Cloud sync.';document.querySelector('#open').hidden=false;
 }catch{status.textContent='Refresh could not finish. Check your connection and try again.';button.disabled=false;}
};
