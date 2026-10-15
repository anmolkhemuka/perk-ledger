import {stageOf,reservesClaim,validateWorkflow} from './stages.mjs';
import {validateFees} from './fees.mjs';
import { validateLegacy } from './legacy.mjs';
import { defaultPreferences, validatePreferences, trackingCategory } from './preferences.mjs';
export const STORAGE_KEY = 'perk-ledger.v1';
export const STATUSES = ['available', 'claimed', 'used personally', 'gifted to family', 'sold', 'expired'];
export const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10) === s; }
const iso = d => d.toISOString().slice(0,10);
function addMonths(s, months) { const [y,m,d] = s.split('-').map(Number); const base = new Date(Date.UTC(y,m-1+months,1)); const last = new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate(); base.setUTCDate(Math.min(d,last)); return iso(base); }
export function periodFor(rule, date) {
  if (!validDate(date)) throw Error('Invalid period date.');
  const months = rule.frequency === 'quarterly' ? 3 : 12;
  if (rule.basis === 'calendar') {
    const [y,m] = date.split('-').map(Number);
    const start = `${y}-${String(rule.frequency === 'quarterly' ? Math.floor((m-1)/3)*3+1 : 1).padStart(2,'0')}-01`;
    return { start, end: addMonths(start,months) };
  }
  if (!validDate(rule.anchor)) throw Error('An anniversary start date is required.');
  if (date < rule.anchor) return null;
  const [y,m] = date.split('-').map(Number), [ay,am] = rule.anchor.split('-').map(Number);
  let n = Math.floor(((y-ay)*12+m-am)/months);
  if (addMonths(rule.anchor,n*months) > date) n--;
  return { start: addMonths(rule.anchor,n*months), end: addMonths(rule.anchor,(n+1)*months) };
}
import {uid} from './ids.mjs';
export {uid};
export function initialData() {
  return { version: 5, feeSettings: [], feeEntries: [], feeReschedules: [], templates: [], preferences: defaultPreferences(), cards: [['BOI','Me'],['Canara Bank','Me'],['Utkarsh Bank','Me'],['Bank of Baroda','Me'],['Bank of Baroda','Mother']].map(([bank,holder])=>({id:uid(),bank,holder,nickname:`${holder === 'Mother' ? 'Mother’s' : 'My'} ${bank}`,last4:''})), benefits: [], periods: [], records: [] };
}
export function syncPeriods(data, date=today()) {
  for (const b of data.benefits) {
    if(b.retired)continue;
    let cursor = b.since;
    let count = 0;
    while (cursor <= date && count++ < 1000) {
      let p = periodFor(b,cursor);
      let transition=false;
      if(b.calendarFrom && cursor>=b.calendarFrom){p=periodFor({...b,basis:'calendar'},cursor);transition=p.start<b.calendarFrom;p.start=transition?b.calendarFrom:p.start;}
      const overlaps=p?data.periods.filter(x=>x.benefitId===b.id&&x.start<p.end&&p.start<x.end):[];
      if(overlaps.length){const last=overlaps.reduce((end,x)=>x.end>end?x.end:end,cursor);cursor=last>cursor?last:p.end;continue;}
      if (!p) { cursor = b.anchor; continue; }
      if (!data.periods.some(x=>x.benefitId===b.id && x.start===p.start && x.end===p.end)) data.periods.push({id:uid(),benefitId:b.id,...p,allowance:transition?0:b.allowance,value:b.value});
      cursor=p.end;
    }
  }
  return data;
}
export function currentPeriod(data,b,date=today()) { return data.periods.find(x=>x.benefitId===b.id&&x.start<=date&&date<x.end); }
export function periodLabel(p) { if(!p)return 'Not started';const y=p.start.slice(0,4),m=Number(p.start.slice(5,7));return p.start.endsWith('-01-01')&&p.end===`${Number(y)+1}-01-01`?y:(p.start.endsWith('-01')&&[1,4,7,10].includes(m)&&new Date(p.end+'T00:00:00Z')-new Date(p.start+'T00:00:00Z')<=92*86400000?`Q${Math.ceil(m/3)} ${y}`:`${p.start} – ${p.end} (exclusive)`); }
// Retiring a conflicting rule never releases already issued units into its replacement.
export function allowanceUsage(data,b,p){
 if(!p)return 0;
 return data.records.filter(r=>{if(!reservesClaim(r))return false;if(r.periodId===p.id)return true;const other=data.benefits.find(x=>x.id===r.benefitId),period=data.periods.find(x=>x.id===r.periodId);return other?.retired&&other.cardId===b.cardId&&trackingCategory(other)===trackingCategory(b)&&period.start<p.end&&p.start<period.end;}).length;
}
export function effectiveStatus(r,date=today()) { if(r.stage){const stage=stageOf(r,date);return stage==='completed'?r.status:stage;}return ['available','claimed'].includes(r.status) && r.expiry && r.expiry < date ? 'expired' : r.status; }
export const outcomeForStatus = status => ({'used personally':'personal','gifted to family':'family',sold:'sold'}[status] ?? null);
export const WORKFLOW_BACKUP_KEY='perk-ledger.pre-workflow-backup';
export const LEGACY_BACKUP_KEY = 'perk-ledger.pre-v2-backup';

export function migrateLegacy(input) {
  const data=validateLegacy(input);
  const periods=new Map(data.periods.map(p=>[p.id,p]));
  const benefits=new Map(data.benefits.map(b=>[b.id,b]));
  const records=data.records.map(r=>{
    const period=periods.get(r.periodId),benefit=benefits.get(period.benefitId);
    return {...r,cardId:benefit.cardId,benefitId:benefit.id,
      outcome:outcomeForStatus(r.status),option:'',provider:'',faceValue:null,useValue:null,
      recipient:'',outcomeDate:'',receivedDate:'',legacy:true};
  });
  return {...data,version:2,preferences:defaultPreferences(),
    benefits:data.benefits.map(b=>({...b,category:'auto'})),records};
}
export function reviewIssues(r) {
  const issues=[];
  if(r.outcome==='sold'&&r.received<r.sale&&!r.paymentReviewed)issues.push('Older unpaid sale: confirm payment once; unpaid amounts excluded from earnings');
  if(r.stage==='needs review')issues.push('Confirm portal request / voucher stage');
  if(r.stage==='voucher ready'&&!r.voucherReceivedDate)issues.push('Voucher received date unconfirmed');
  if(!['requested','not requested'].includes(r.stage)&&!r.option&&!r.provider)issues.push('Provider / option missing');
  if(r.legacy&&r.faceValue===null&&!['requested','not requested'].includes(r.stage))issues.push('Reference value unconfirmed');
  if(r.legacy&&!r.outcome&&(!r.stage||r.stage==='needs review'))issues.push('Outcome not yet confirmed');
  if(['personal','family'].includes(r.outcome)&&r.useValue===null)issues.push('Actual use value unconfirmed');
  if(r.outcome&&!r.outcomeDate)issues.push('Outcome date missing');
  if(r.outcome==='family'&&!r.recipient)issues.push('Family recipient missing');
  if(r.legacy&&r.outcome==='sold'&&r.received>0&&!r.receivedDate)issues.push('Last payment date unknown');
  if(r.outcome==='sold'&&r.sale===0)issues.push('Sale price needs review');
  if(r.legacy&&(!r.stage||r.stage==='completed')&&!issues.length)issues.push('Confirm migrated details');
  return issues;
}
export function sharedSpaConflicts(data) {
  return data.cards.filter(c=>data.benefits.filter(b=>!b.retired&&b.cardId===c.id&&trackingCategory(b)==='spa').length>1).map(c=>c.id);
}
export function totals(data,date=today()) {
  const paise=n=>Math.round(n*100);
  let personal=0,family=0,received=0,pending=0,unused=0;
  for(const r of data.records){
    const status=effectiveStatus(r,date);
    if(status==='used personally'&&r.useValue!==null)personal+=paise(r.useValue);
    if(status==='gifted to family'&&r.useValue!==null)family+=paise(r.useValue);
    if(status==='sold'){received+=paise(r.received);pending+=paise(r.sale)-paise(r.received);}
    if(['available','claimed','voucher ready'].includes(status))unused+=paise(r.faceValue??r.value);
  }
  for(const b of data.benefits){if(b.retired)continue;if(data.benefits.filter(x=>!x.retired&&x.cardId===b.cardId&&trackingCategory(x)===trackingCategory(b)).length>1)continue;const p=currentPeriod(data,b,date);if(p)unused+=Math.max(0,p.allowance-allowanceUsage(data,b,p))*paise(p.value);}
  return {personal:personal/100,family:family/100,received:received/100,pending:pending/100,unused:unused/100,realised:(personal+family+received)/100};
}
export function validateData(input) {
  if(input?.version===1)return validateData(migrateLegacy(input));
  if(![2,3,4,5].includes(input?.version))throw Error('Invalid backup: unsupported format or version.');
  if(!Array.isArray(input.records)||!Array.isArray(input.benefits))throw Error('Invalid backup: collections must be lists.');
  // Reuse the original strict checks for IDs, relationships, dates and allowance counts.
  const inactive=new Map();for(const r of input.records)if(r.stage==='not requested')inactive.set(r.periodId,(inactive.get(r.periodId)||0)+1);
  const base=validateLegacy({...input,version:1,benefits:input.benefits.map(b=>({...b,value:b.value??0})),periods:input.periods.map(p=>({...p,allowance:p.allowance+(inactive.get(p.id)||0),value:p.value??0})),records:input.records.map(r=>({...r,value:r.value??0,claimDate:r.stage==='completed'&&r.voucherReceivedDate&&!r.claimDate?(input.periods.find(p=>p.id===r.periodId)?.start||''):r.claimDate,status:r?.status==='gifted to family'?'used personally':r?.status}))});
  const eventIds=new Set(['cards','benefits','periods','records'].flatMap(key=>base[key].map(x=>x.id)));
  const amount=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9&&Math.abs(x*100-Math.round(x*100))<.0001;
  const text=(x,max)=>typeof x==='string'&&x.length<=max;
  const preferences=validatePreferences(input.preferences);
  const benefits=base.benefits.map((b,i)=>{
    const category=input.benefits[i].category??'auto';
    if(!['auto','spa','fitness','healthcare','cab','ott','other'].includes(category))throw Error('Invalid backup: tracking category.');
    const raw=input.benefits[i];
    if(raw.value!==null&&!amount(raw.value))throw Error('Invalid estimate.');
    if(raw.calendarFrom&&!validDate(raw.calendarFrom))throw Error('Invalid calendar transition.');
    const exception=b.allowance!==1&&['spa','fitness','healthcare','cab','ott'].includes(trackingCategory({...b,category}));
    return {...b,allowanceException:exception,value:raw.value,category,templateId:typeof raw.templateId==='string'?raw.templateId:'',override:raw.override===true||exception,retired:raw.retired===true,calendarFrom:raw.calendarFrom||''};
  });
  const periodsById=new Map(base.periods.map(p=>[p.id,p]));
  const benefitsById=new Map(benefits.map(b=>[b.id,b]));
  const records=base.records.map((b,i)=>{
    const r=input.records[i];
    const period=periodsById.get(r.periodId),benefit=benefitsById.get(period.benefitId);
    const fail=message=>{throw Error(`Invalid backup: ${message}`);};
    if(r.benefitId!==benefit.id||r.cardId!==benefit.cardId)fail('card, benefit and period do not match.');
    if((r.value!==null&&!amount(r.value))||!STATUSES.includes(r.status)||r.outcome!==outcomeForStatus(r.status)||!text(r.option,100)||!text(r.provider,100)||!text(r.recipient,100)||!text(r.outcomeDate,10)||typeof r.legacy!=='boolean'||(r.faceValue!==null&&!amount(r.faceValue))||(r.useValue!==null&&!amount(r.useValue)))fail('redemption details.');
    const receivedDate=r.receivedDate??'';
    if(!text(receivedDate,10)||(receivedDate&&(!validDate(receivedDate)||receivedDate<'2000-01-01'||receivedDate>'2199-12-31')))fail('last payment date.');
    if(r.outcomeDate&&(!validDate(r.outcomeDate)||r.outcomeDate<'2000-01-01'||r.outcomeDate>'2199-12-31'||(r.claimDate&&r.outcomeDate<r.claimDate)))fail('outcome date must be valid and not before issue date.');
    if(!['personal','family'].includes(r.outcome)&&r.useValue!==null)fail('sold / unredeemed vouchers cannot have a personal or family-use value.');
    if(!r.legacy){
      if(!['requested','not requested'].includes(r.stage)&&!r.option.trim()&&!r.provider.trim())fail('choose a provider or option.');
      if(r.outcome&&!r.outcomeDate)fail('confirm the use, gift or sale date.');
      if(['personal','family'].includes(r.outcome)&&r.useValue===null)fail('confirm the actual personal / family-use value.');
      if(r.outcome==='family'&&!r.recipient.trim())fail('enter a family recipient nickname.');
      if(r.outcome==='sold'&&r.sale<=0)fail('enter the actual agreed sale price.');
    }
    const workflow=validateWorkflow(r,input.periods.find(p=>p.id===r.periodId),eventIds);
    return {...b,claimDate:r.claimDate,...workflow,value:r.value,cardId:r.cardId,benefitId:r.benefitId,status:r.status,outcome:r.outcome,option:r.option,provider:r.provider,faceValue:r.faceValue,useValue:r.useValue,recipient:r.recipient,outcomeDate:r.outcomeDate,receivedDate,legacy:r.legacy,paymentReviewed:r.paymentReviewed===true};
  });
  const templates=input.templates??[];
  if(!Array.isArray(templates)||templates.length>5||new Set(templates.map(t=>t.category)).size!==templates.length)throw Error('Invalid shared templates.');
  const cleanTemplates=templates.map(t=>{if(!['spa','fitness','healthcare','cab','ott'].includes(t.category)||t.id!==t.category||typeof t.enabled!=='boolean'||(t.allowance===null?t.enabled:(!Number.isInteger(t.allowance)||t.allowance<0||t.allowance>10000))||!['annual','quarterly'].includes(t.frequency)||(t.value!==null&&!amount(t.value)))throw Error('Invalid shared template settings.');const previous=t.allowance!==1&&t.allowance!==null?t.allowance:(t.legacyAllowance??null);if(previous!==null&&(!Number.isInteger(previous)||previous<0||previous>10000))throw Error('Invalid legacy allowance.');return {id:t.id,category:t.category,enabled:t.enabled,allowance:1,legacyAllowance:previous,frequency:t.frequency,value:t.value};});
  const periods=base.periods.map((p,i)=>{const value=input.periods[i].value;if(value!==null&&!amount(value))throw Error('Invalid period estimate.');return {...p,allowance:input.periods[i].allowance,value};});
  for(const p of periods)if(records.filter(r=>r.periodId===p.id&&reservesClaim(r)).length>p.allowance)throw Error('Invalid backup: requests / vouchers exceed the period allowance.');
  const fees=validateFees({...input,cards:base.cards},eventIds);
  return {...base,version:5,preferences,benefits,periods,records,templates:cleanTemplates,...fees};
}
export function loadData(storage) {const raw=storage.getItem(STORAGE_KEY);return raw===null?initialData():validateData(JSON.parse(raw));}
export function saveData(storage,data) {
  const clean=validateData(data);
  const raw=storage.getItem?.(STORAGE_KEY);
  // Keep an exact local recovery copy before replacing an older ledger for the first time.
  let oldVersion;try{oldVersion=raw&&JSON.parse(raw).version;}catch{/* A confirmed restore may replace unreadable storage. */}
  if(oldVersion>=2&&oldVersion<5&&!storage.getItem(WORKFLOW_BACKUP_KEY))storage.setItem(WORKFLOW_BACKUP_KEY,raw);
  if(oldVersion===1&&!storage.getItem(LEGACY_BACKUP_KEY))storage.setItem(LEGACY_BACKUP_KEY,raw);
  storage.setItem(STORAGE_KEY,JSON.stringify(clean));
}
