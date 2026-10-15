// Cache only this app's public shell. Never cache GitHub API responses or ledger data.
const PREFIX='perk-ledger-shell-'+self.registration.scope;
const CACHE=PREFIX+'-v10';
const FILES=["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./festive.css", "./portal.mjs", "./card-art.css", "./celebration.mjs", "./setup.mjs", "./styles.css", "./github-sync.mjs", "./fees.css", "./ids.mjs", "./legacy.mjs", "./stages.mjs", "./redemptions.css", "./core.mjs", "./preferences.mjs", "./fees.mjs", "./workflow.css", "./install.mjs", "./app-updates.mjs", "./app.mjs", "./theme.mjs", "./card-art.mjs", "./sync-ui.mjs", "./visuals.mjs", "./assets/cards/boi-select.png", "./assets/cards/canara-select.jpg", "./assets/cards/utkarsh-select.jpg", "./assets/cards/bob-bhoomi.png", "./assets/app/icon-192.png", "./assets/app/icon-512.png", "./assets/app/icon-maskable-512.png", "./assets/app/apple-touch-icon.png"];
const allowed=new Set(FILES.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);url.search='';url.hash='';
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!allowed.has(url.href))return;
 event.respondWith((async()=>{
  // Fresh public files online; retain the installed shell as an offline fallback.
  // Do not write network responses into that shell or cache API/private responses.
  try{const response=await fetch(event.request,{cache:'no-store'});if(response.ok)return response;}catch{}
  const cached=await (await caches.open(CACHE)).match(url.href);
  return cached||Response.error();
 })());
});
// A complete new shell activates immediately. Pages reload once it is safe to do so.
