import {uid,today,currentPeriod,allowanceUsage,validDate} from './core.mjs';
import {stageOf,snapshotRecord} from './stages.mjs';
import {trackingCategory} from './preferences.mjs';
export function appendWorkflow(record,patch,action,notes='',date=today()){
 const from=record.stage??'needs review',to=patch.stage??from;
 const event={id:uid(),date,action,from,to,notes,snapshot:snapshotRecord(record)};
 Object.assign(record,patch,{workflowHistory:[...(record.workflowHistory||[]),event]});return record;
}
function target(data,benefitId,periodId,recordId){
 const b=data.benefits.find(b=>b.id===benefitId),p=data.periods.find(p=>p.id===periodId&&p.benefitId===benefitId);
 if(!b||!p)throw Error('Choose a valid card benefit and period.');
 let r=recordId&&data.records.find(r=>r.id===recordId&&r.periodId===p.id);
 if(recordId&&!r)throw Error('The selected record changed. Reopen it.');
 if(!r||r.stage==='not requested'){
 if(data.benefits.filter(x=>!x.retired&&x.cardId===b.cardId&&trackingCategory(x)===trackingCategory(b)).length>1)throw Error('Review conflicting benefit rules before creating a request or voucher.');

  if(b.retired||allowanceUsage(data,b,p)>=p.allowance)throw Error('This entitlement is already reserved or completed. Update its existing record.');
  if(!r)r=data.records.find(r=>r.periodId===p.id&&r.stage==='not requested');
  if(!r){r={id:uid(),periodId:p.id,benefitId:b.id,cardId:b.cardId,status:'available',outcome:null,option:'',provider:'',faceValue:p.value,value:p.value,useValue:null,sale:0,received:0,claimDate:'',outcomeDate:'',receivedDate:'',recipient:'',expiry:'',code:'',notes:'',legacy:false,paymentReviewed:false,stage:'not requested',requestDate:'',voucherReceivedDate:'',workflowHistory:[]};data.records.push(r);}
 }
 return {b,p,r};
}
export function requestBenefit(data,benefitId,periodId,requestDate,notes='',recordId){
 const {p,r}=target(data,benefitId,periodId,recordId);
 if(r.stage!=='not requested')throw Error('A request or voucher already exists. Update that same record.');
 if(!validDate(requestDate)||requestDate<p.start||requestDate>=p.end||requestDate>today())throw Error('Request date must be within its claim period and no later than today.');
 return appendWorkflow(r,{stage:'requested',status:'available',requestDate,claimDate:requestDate,notes},'Portal request recorded',notes);
}
export function receiveVoucher(data,benefitId,periodId,details,recordId){
 const {r}=target(data,benefitId,periodId,recordId);
 if(!['not requested','requested','voucher ready','needs review','expired'].includes(r.stage))throw Error('This voucher already has a completed outcome. Correct that outcome instead.');
 const received=details.voucherReceivedDate,expiry=details.expiry||'';
 if(!details.code?.trim()||!details.option?.trim()||!validDate(received)||received>today()||(r.requestDate&&received<r.requestDate)||(expiry&&(!validDate(expiry)||expiry<received)))throw Error('Enter a code, provider and received date (today or earlier). Expiry cannot precede receipt.');
 return appendWorkflow(r,{workflowReview:false,stage:'voucher ready',status:'available',option:details.option.trim(),provider:details.provider?.trim()||'',code:details.code.trim(),voucherReceivedDate:received,expiry,notes:details.notes??r.notes,legacy:r.legacy},r.stage==='requested'?'Voucher received':'Voucher added / corrected',details.notes||'');
}
export function cancelRequest(data,id,notes=''){
 const r=data.records.find(r=>r.id===id);if(!r||r.stage!=='requested')throw Error('Only an unsuccessful pending request can be cancelled.');
 return appendWorkflow(r,{stage:'not requested',status:'available',outcome:null,requestDate:'',voucherReceivedDate:'',claimDate:'',notes},'Request cancelled',notes);
}
export function correctStage(data,id,stage,details={}){
 const r=data.records.find(r=>r.id===id);if(!r)throw Error('Record not found.');
 if(!['not requested','requested','expired'].includes(stage))throw Error('Use Add voucher or Use / Gift / Sell to confirm this stage.');
 const p=data.periods.find(p=>p.id===r.periodId),b=data.benefits.find(b=>b.id===r.benefitId);
 if(r.stage==='not requested'&&stage!=='not requested'&&allowanceUsage(data,b,p)>=p.allowance)throw Error('This entitlement is already reserved.');
 const requestDate=stage==='requested'?details.requestDate:'';
 if(stage==='requested'&&(!validDate(requestDate)||requestDate<p.start||requestDate>=p.end||requestDate>today()))throw Error('Confirm the actual request date within this period.');
 return appendWorkflow(r,{stage,status:stage==='expired'?'expired':'available',outcome:null,useValue:null,sale:0,received:0,outcomeDate:'',receivedDate:'',...(stage==='not requested'?{code:'',option:'',provider:'',expiry:'',voucherReceivedDate:'',requestDate:'',claimDate:''}:stage==='requested'?{requestDate,claimDate:requestDate,code:'',expiry:'',voucherReceivedDate:''}:{}),notes:details.notes??r.notes},'Stage corrected',details.notes||'');
}
export function completeVoucher(data,id,patch,allowReview=false){
 const r=data.records.find(r=>r.id===id);if(!r||!['voucher ready','completed',...(allowReview?['needs review']:[])].includes(stageOf(r,today())))throw Error('Add the voucher first, or explicitly correct / review its stage.');
 if(patch.periodId!==r.periodId||patch.cardId!==r.cardId||patch.benefitId!==r.benefitId)throw Error('The card, benefit and claim period of this voucher cannot be changed.');
 return appendWorkflow(r,{...patch,workflowReview:false,stage:'completed'},r.stage==='completed'?'Outcome corrected':'Outcome completed',patch.notes||'');
}
export function workflowRows(data,{date=today(),includePastCompleted=false}={}){
 const rows=[];
 for(const b of data.benefits){const p=currentPeriod(data,b,date),active=p?data.records.filter(r=>r.periodId===p.id&&r.stage!=='not requested'):[];
  const conflict=data.benefits.filter(x=>!x.retired&&x.cardId===b.cardId&&trackingCategory(x)===trackingCategory(b)).length>1;
  if(p&&!b.retired){const remaining=Math.max(0,p.allowance-allowanceUsage(data,b,p));if(remaining)rows.push({b,p,r:data.records.find(r=>r.periodId===p.id&&r.stage==='not requested')||null,stage:'not requested',units:remaining,conflict});else if(!active.length)rows.push({b,p,r:null,stage:'unavailable',units:0,conflict});}
  for(const r of data.records.filter(r=>r.benefitId===b.id&&r.stage!=='not requested')){const period=data.periods.find(p=>p.id===r.periodId),stage=stageOf(r,date);if(period.id===p?.id||includePastCompleted||stage!=='completed')rows.push({b,p:period,r,stage,units:1,older:period.id!==p?.id,conflict});}
 }
 return rows;
}
export function workflowCounts(data,date=today()){
 const rows=workflowRows(data,{date});return {need:rows.filter(x=>x.stage==='not requested'&&!x.conflict).reduce((sum,x)=>sum+x.units,0),awaiting:rows.filter(x=>x.stage==='requested').length,ready:rows.filter(x=>x.stage==='voucher ready').length};
}
export function nearing(date,end,days=14){if(!end||end<date)return false;return (Date.parse(end+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000<=days;}
