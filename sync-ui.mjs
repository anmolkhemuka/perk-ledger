import {GitHubStore,decision} from './github-sync.mjs';
const CONFIG='perk-ledger.github.config',TOKEN='perk-ledger.github.token',META='perk-ledger.github.meta';
export function initGitHubSync({getData,applyData,validate,canSave}){
 let config={},meta={},client,busy=false,stopped=false,timer;
 const raw=()=>JSON.stringify(getData());
 const read=(store,key,fallback)=>{try{return JSON.parse(store.getItem(key))||fallback;}catch{return fallback;}};
 config=read(localStorage,CONFIG,{});meta=read(localStorage,META,{});
 const button=document.createElement('button');button.type='button';button.className='button subtle';button.textContent='Cloud sync';document.querySelector('.header-right').append(button);
 const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');document.querySelector('main').prepend(status);
 const say=s=>status.textContent=s;
 const dialog=document.createElement('dialog');dialog.className='sync-dialog';dialog.setAttribute('aria-labelledby','sync-title');dialog.innerHTML=`<form method="dialog"><header class="sync-heading"><div><h2 id="sync-title">Cloud sync</h2><p>Keep your devices together</p></div><button type="button" data-command="close" class="icon-button" aria-label="Close cloud sync">×</button></header><div class="sync-body"><p class="sync-intro">Connect your private GitHub data repository.</p><label class="field">GitHub username<input name="owner" required autocomplete="username" autocapitalize="none" spellcheck="false"></label><label class="field">Private data repository<input name="repo" required autocapitalize="none" spellcheck="false"></label><label class="field">Restricted token<input name="token" type="password" required autocomplete="off" autocapitalize="none" spellcheck="false"></label><label class="sync-remember"><input type="checkbox" name="remember"><span>Remember on this device<small>Browser storage is not encrypted.</small></span></label><p class="sync-message" data-message role="status"></p><details class="sync-help"><summary>Token help & app updates</summary><p>Use a fine-grained token limited to this private repository with Contents read/write. Never put it in source code or share it.</p><p>Sync version 4 · <a href="./update.html">Refresh app files</a></p></details></div><div class="sync-actions"><button type="button" data-command="connect" class="button primary">Connect / check</button><button type="button" data-command="download" class="button subtle">Load cloud data</button><button type="button" data-command="upload" class="button subtle">Upload this device</button><button type="button" data-command="disconnect" class="text-button">Disconnect</button><button type="button" data-command="close" class="button subtle">Close</button></div></form>`;
 document.body.append(dialog);
 const fitDialog=()=>{dialog.style.maxHeight=Math.max(180,(window.visualViewport?.height||window.innerHeight)-24)+'px';};
 window.visualViewport?.addEventListener('resize',fitDialog);window.addEventListener('resize',fitDialog);
 const f=dialog.querySelector('form'),message=dialog.querySelector('[data-message]');
 const token=()=>sessionStorage.getItem(TOKEN)||localStorage.getItem(TOKEN)||'';
 const checkpoint=(sha,snapshot)=>{meta={sha,base:snapshot};localStorage.setItem(META,JSON.stringify(meta));};
 const recovery=()=>{localStorage.setItem('perk-ledger.before-cloud-load',raw());};
 function load(remote){const checked=validate(remote.data);recovery();applyData(checked);checkpoint(remote.sha,raw());stopped=false;say('Synced with private GitHub storage');}
 async function sync(){
  if(!client||busy||stopped||!meta.base||!canSave())return;
  if(!navigator.onLine){say('Offline — changes saved locally, waiting to sync');return;}
  busy=true;say('Syncing…');
  try{const remote=await client.read();if(remote)validate(remote.data);const snapshot=raw(),action=decision(snapshot,meta.base,remote,meta.sha);
   if(action==='conflict'){stopped=true;throw Error('Conflicting changes detected. Export a backup, then open Cloud sync to review which copy to keep.');}
   if(action==='download'){if(document.querySelector('#editor')?.open){say('Cloud update available — close the editing form to load it');return;}load(remote);}
   else if(action==='upload'){const sha=await client.write(getData(),meta.sha);checkpoint(sha,snapshot);say(raw()===snapshot?'Synced with private GitHub storage':'New changes waiting to sync');}
   else say('Synced with private GitHub storage');
  }catch(e){say(e.message+' Your local copy is retained.');}finally{busy=false;}
 }
 button.onclick=()=>{f.elements.owner.value=config.owner||'anmolkhemuka';f.elements.repo.value=config.repo||'perk-ledger-data';f.elements.token.value=token();f.elements.remember.checked=!!localStorage.getItem(TOKEN);message.textContent='Connect first, then load your cloud copy or upload this device.';fitDialog();dialog.showModal();};
 dialog.addEventListener('click',async e=>{
  const command=e.target.dataset.command;if(command==='close'){dialog.close();return;}if(!command||busy)return;
  if(command==='disconnect'){client=null;stopped=false;config={};meta={};for(const k of [CONFIG,TOKEN,META])localStorage.removeItem(k);sessionStorage.removeItem(TOKEN);say('Cloud disconnected — local data retained');message.textContent='Disconnected.';return;}
  if(!f.reportValidity())return;
  busy=true;
  try{
   if(!canSave())throw Error('Resolve the local storage warning before connecting.');
   const next={owner:f.elements.owner.value.trim(),repo:f.elements.repo.value.trim()},secret=f.elements.token.value.trim();
   if(client&&(next.owner!==config.owner||next.repo!==config.repo))throw Error('Disconnect before switching repositories.');
   const candidate=new GitHubStore({...next,token:secret});await candidate.checkPrivate();
   const remote=await candidate.read();if(remote)validate(remote.data);
   if(command==='connect'){
    if(next.owner!==config.owner||next.repo!==config.repo){meta={};localStorage.removeItem(META);}
    config=next;localStorage.setItem(CONFIG,JSON.stringify(config));localStorage.removeItem(TOKEN);sessionStorage.removeItem(TOKEN);(f.elements.remember.checked?localStorage:sessionStorage).setItem(TOKEN,secret);client=candidate;
    message.textContent=remote?'Private cloud ledger found. On a new device choose Load cloud data.':'Private repository is empty. Choose Upload this device to initialise it.';say('Connected — choose initial data source');
   }else{
    if(!client||next.owner!==config.owner||next.repo!==config.repo)throw Error('Connect to this repository first.');
    if(command==='download'){
     if(!remote)throw Error('No cloud ledger exists yet.');
     if(!confirm('Replace this device’s ledger with the cloud copy? Export a backup first. A local recovery copy will also be retained.'))return;
     load(remote);message.textContent='Cloud data loaded. Automatic sync enabled.';
    }else{
     if(!confirm(remote?'Replace the cloud ledger with THIS device’s data? This can replace changes from another device. Export backups first.':'Upload this device’s ledger to private GitHub storage?'))return;
     if(remote)localStorage.setItem('perk-ledger.before-cloud-replace',JSON.stringify(remote.data));
     const snapshot=raw(),sha=await candidate.write(getData(),remote?.sha);checkpoint(sha,snapshot);client=candidate;stopped=false;message.textContent='Uploaded. Automatic sync enabled.';say('Synced with private GitHub storage');
    }
   }
  }catch(error){message.textContent=error.message;say('Sync needs attention — local data retained');}finally{busy=false;}
 });
 window.addEventListener('online',sync);window.addEventListener('focus',sync);
 window.addEventListener('storage',e=>{if([CONFIG,TOKEN,META].includes(e.key)){stopped=true;say('Sync settings changed in another tab. Reload this tab before syncing.');}});
 setInterval(sync,30000);
 try{if(config.owner&&token()){client=new GitHubStore({...config,token:token()});client.checkPrivate().then(sync).catch(e=>{client=null;say(e.message);});}else say('Saved locally — cloud sync not connected');}catch(e){say(e.message);}
 return ()=>{clearTimeout(timer);timer=setTimeout(sync,1200);};
}
