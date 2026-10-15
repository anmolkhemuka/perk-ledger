// Credentials are device preferences, never part of ledger exports.
export function encodeJSON(value) {
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary);
}
export function decodeJSON(value) {
  const binary=atob(value.replace(/\s/g,''));
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
}
export function browserFetch(...args){
  const root=typeof window==='object'?window:globalThis;
  return root.fetch.call(root,...args);
}
export class GitHubStore {
  constructor({owner,repo,token},request=browserFetch){
    if(!/^[a-zA-Z0-9-]+$/.test(owner)||!/^[\w.-]+$/.test(repo)||!token)throw Error('Enter a valid owner, repository and token.');
    this.base=`https://api.github.com/repos/${owner}/${repo}`;this.token=token;this.request=request;
  }
  async call(path,options={}) {
    const result=await this.request(this.base+path,{...options,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${this.token}`,'Content-Type':'application/json',...options.headers}});
    if(result.status===404&&options.allowMissing)return null;
    if(!result.ok)throw Error(result.status===409||result.status===422?'Cloud changed. Sync stopped; review before saving again.':result.status===401||result.status===403?'GitHub access denied. Check token permissions or expiry.':`GitHub request failed (${result.status}). Check repository access and retry.`);
    return result.json();
  }
  async checkPrivate(){const r=await this.call('');if(!r.private)throw Error('Data repository must be private. Nothing was uploaded.');}
  async read(){const r=await this.call('/contents/ledger.json',{allowMissing:true});if(!r)return null;if(r.size>5*1024*1024||r.encoding!=='base64'||typeof r.content!=='string')throw Error('Cloud ledger is too large or unsupported.');return {sha:r.sha,data:decodeJSON(r.content)};}
  async write(data,sha){const r=await this.call('/contents/ledger.json',{method:'PUT',body:JSON.stringify({message:'Save Perk Ledger',content:encodeJSON(data),...(sha?{sha}:{})})});return r.content.sha;}
}
export function decision(local,base,cloud,expectedSha){
  if(!base||!expectedSha)return 'connect';
  const dirty=local!==base;
  if(!cloud)return 'conflict';
  if(cloud.sha!==expectedSha)return dirty?'conflict':'download';
  return dirty?'upload':'synced';
}
