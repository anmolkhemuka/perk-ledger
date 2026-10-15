import {initAppUpdates} from './app-updates.mjs';
const button=document.querySelector('#install-app'),help=document.querySelector('#install-help'),status=document.querySelector('#install-status');
let pending;
const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(installed()){button.hidden=true;status.textContent='Running as your home-screen app';}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;button.hidden=false;button.textContent='＋ Install Perk Ledger';});
button.addEventListener('click',async()=>{if(!pending){help.open=!help.open;return;}try{await pending.prompt();const choice=await pending.userChoice;status.textContent=choice.outcome==='accepted'?'Installation requested':'You can install later';}catch{help.open=true;}finally{pending=null;}});
window.addEventListener('appinstalled',()=>{button.hidden=true;status.textContent='Perk Ledger added to your apps';pending=null;});
initAppUpdates();
