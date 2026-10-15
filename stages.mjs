export const STAGES=['not requested','requested','voucher ready','completed','expired','needs review'];
export const STAGE_LABELS={'not requested':'Not requested',requested:'Requested','voucher ready':'Voucher ready',completed:'Completed',expired:'Expired','needs review':'Needs review'};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2000-01-01'&&s<='2199-12-31'&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9&&Math.abs(n*100-Math.round(n*100))<.0001;
const text=(s,max=2000)=>typeof s==='string'&&s.length<=max;
export function inferredStage(r){
 if(['used personally','gifted to family','sold'].includes(r.status))return 'completed';
 if(r.code?.trim())return r.status==='expired'?'expired':'voucher ready';
 return 'needs review';
}
export function stageOf(r,now){const stage=r.stage??inferredStage(r);return stage==='voucher ready'&&r.expiry&&r.expiry<now?'expired':stage;}
export const reservesClaim=r=>r.stage!=='not requested';
const snapshotText={status:40,outcome:20,option:100,provider:100,recipient:100,claimDate:10,outcomeDate:10,receivedDate:10,requestDate:10,voucherReceivedDate:10,expiry:10,code:500,notes:2000};
export function snapshotRecord(r){
 const result={};for(const key of Object.keys(snapshotText))result[key]=key==='outcome'?(r[key]??null):(r[key]??'');
 for(const key of ['value','faceValue','useValue'])result[key]=r[key]??null;
 result.sale=r.sale??0;result.received=r.received??0;return result;
}
export function validateWorkflow(r,period,ids){
 const stage=r.stage??inferredStage(r),workflowReview=r.workflowReview===true||(!r.stage&&stage==='voucher ready'&&!r.voucherReceivedDate),requestDate=r.requestDate??'',voucherReceivedDate=r.voucherReceivedDate??'',history=r.workflowHistory??[];
 const fail=()=>{throw Error('Invalid backup: portal stage, voucher dates or workflow history.');};
 if(!STAGES.includes(stage)||!text(requestDate,10)||!text(voucherReceivedDate,10)||(requestDate&&(!date(requestDate)||requestDate<period.start||requestDate>=period.end))||(voucherReceivedDate&&(!date(voucherReceivedDate)||(requestDate&&voucherReceivedDate<requestDate)))||!Array.isArray(history)||history.length>1000)fail();
 if(stage==='completed'&&!['used personally','gifted to family','sold'].includes(r.status))fail();
 if(stage!=='completed'&&r.outcome)fail();
 if(stage==='requested'&&!requestDate)fail();
 if(r.stage==='voucher ready'&&!workflowReview&&(!r.code?.trim()||!voucherReceivedDate))fail();
 if(stage==='not requested'&&(r.code||requestDate||voucherReceivedDate))fail();
 if(voucherReceivedDate&&r.expiry&&r.expiry<voucherReceivedDate)fail();
 if(stage==='completed'&&voucherReceivedDate&&r.outcomeDate&&r.outcomeDate<voucherReceivedDate)fail();
 const clean=history.map(e=>{
  if(!e||!text(e.id,100)||!e.id||ids.has(e.id)||!date(e.date)||!text(e.action,60)||!e.action||!STAGES.includes(e.from)||!STAGES.includes(e.to)||!text(e.notes)||!e.snapshot||typeof e.snapshot!=='object')fail();
  ids.add(e.id);const s=e.snapshot;
  for(const [key,max] of Object.entries(snapshotText))if(key==='outcome'?(s[key]!==null&&!['personal','family','sold'].includes(s[key])):!text(s[key],max))fail();
  for(const key of ['claimDate','outcomeDate','receivedDate','requestDate','voucherReceivedDate','expiry'])if(s[key]&&!date(s[key]))fail();
  for(const key of ['value','faceValue','useValue'])if(s[key]!==null&&!amount(s[key]))fail();
  if(!amount(s.sale)||!amount(s.received)||s.received>s.sale)fail();
  return {id:e.id,date:e.date,action:e.action,from:e.from,to:e.to,notes:e.notes,snapshot:snapshotRecord(s)};
 });
 return {stage,workflowReview,requestDate,voucherReceivedDate,workflowHistory:clean};
}
