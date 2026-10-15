import {uid} from './ids.mjs';
// Card renewals are independent of benefit periods. All amounts include GST.
const dayNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2000-01-01'&&s<='2199-12-31'&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9&&Math.abs(n*100-Math.round(n*100))<.0001;
const text=(s,max=2000)=>typeof s==='string'&&s.length<=max;
const fail=message=>{throw Error(message);};
export function renewalDate(year,monthDay){
 const [month,day]=monthDay.split('-').map(Number);
 const last=new Date(Date.UTC(year,month,0)).getUTCDate();
 return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;
}
export function firstAnnualDue(joiningDate){
 if(!isDate(joiningDate))fail('Enter a valid joining date.');
 const year=Number(joiningDate.slice(0,4))+1;
 if(year>2199)fail('Next renewal exceeds the supported date range.');
 return renewalDate(year,joiningDate.slice(5));
}
export function validateFees(input,existingIds=new Set()){
 if(input.version>=4&&['feeSettings','feeEntries','feeReschedules'].some(key=>input[key]===undefined))fail('Invalid backup: missing card fee collections.');
 const settings=input.feeSettings===undefined?[]:input.feeSettings,entries=input.feeEntries===undefined?[]:input.feeEntries,moves=input.feeReschedules===undefined?[]:input.feeReschedules;
 const cards=new Set(input.cards.map(c=>c.id));
 for(const list of [settings,entries,moves])if(!Array.isArray(list)||list.length>20000)fail('Invalid backup: card fee collections.');
 const cardSettings=new Set(),occurrences=new Set(),ids=new Set(existingIds);
 const feeSettings=settings.map(s=>{
  if(!s||!cards.has(s.cardId)||cardSettings.has(s.cardId)||!amount(s.joiningAmount)||(s.annualAmount!==null&&!amount(s.annualAmount))||!text(s.notes)||!text(s.nextDue,10)||!text(s.nextOccurrence,10)||!text(s.renewalDay,5)||(s.nextDue&&!isDate(s.nextDue))||(s.nextOccurrence&&!isDate(s.nextOccurrence))||!!s.nextDue!==!!s.nextOccurrence||(s.renewalDay&&!isDate('2024-'+s.renewalDay))||(s.nextDue&&!s.renewalDay))fail('Invalid backup: card fee settings.');
  cardSettings.add(s.cardId);return {cardId:s.cardId,joiningAmount:s.joiningAmount,annualAmount:s.annualAmount,nextDue:s.nextDue,nextOccurrence:s.nextOccurrence,renewalDay:s.renewalDay,notes:s.notes};
 });
 const feeEntries=entries.map(e=>{
  const key=e?.cardId+'/'+e?.kind+'/'+e?.occurrence;
  if(!e||!text(e.id,100)||!e.id||ids.has(e.id)||!cardSettings.has(e.cardId)||!['joining','annual'].includes(e.kind)||!['paid','waived'].includes(e.status)||!amount(e.amount)||(e.status==='waived'&&e.amount!==0)||!isDate(e.paidDate)||e.paidDate>dayNow()||!text(e.notes)||occurrences.has(key)||(e.kind==='joining'?(e.occurrence!=='joining'||e.dueDate!==''):(!isDate(e.occurrence)||!isDate(e.dueDate))))fail('Invalid backup: fee payment, date, or duplicate occurrence.');
  ids.add(e.id);occurrences.add(key);return {id:e.id,cardId:e.cardId,kind:e.kind,occurrence:e.occurrence,dueDate:e.dueDate,status:e.status,amount:e.amount,paidDate:e.paidDate,notes:e.notes};
 });
 for(const s of feeSettings)if(s.nextOccurrence&&occurrences.has(`${s.cardId}/annual/${s.nextOccurrence}`))fail('Invalid backup: a settled fee is still scheduled.');
 const feeReschedules=moves.map(e=>{
  if(!e||!text(e.id,100)||!e.id||ids.has(e.id)||!cardSettings.has(e.cardId)||!isDate(e.occurrence)||!isDate(e.from)||!isDate(e.to)||!isDate(e.date)||!text(e.notes))fail('Invalid backup: fee reschedule history.');
  ids.add(e.id);return {id:e.id,cardId:e.cardId,occurrence:e.occurrence,from:e.from,to:e.to,date:e.date,notes:e.notes};
 });
 return {feeSettings,feeEntries,feeReschedules};
}
export function settingsFor(data,cardId){return data.feeSettings?.find(s=>s.cardId===cardId);}
export function saveFeeSettings(data,cardId,values,date=dayNow()){
 if(!data.cards.some(c=>c.id===cardId))fail('Card not found.');
 const old=settingsFor(data,cardId),joiningEntry=data.feeEntries.find(e=>e.cardId===cardId&&e.kind==='joining');
 const inferred=values.autoSchedule!==false&&!values.nextDue&&!old?.nextDue&&!joiningEntry&&!!values.joiningPaidDate;
 const nextDue=values.nextDue||(inferred?firstAnnualDue(values.joiningPaidDate):''),changed=!!old&&nextDue!==old.nextDue;
 const sourceDate=(inferred||values.renewalFromJoining)?(values.joiningPaidDate||joiningEntry?.paidDate):'';
 const occurrence=nextDue?(old?.nextOccurrence||nextDue):'';
 const setting={cardId,joiningAmount:values.joiningAmount,annualAmount:values.annualAmount,nextDue,nextOccurrence:occurrence,renewalDay:nextDue&&(!old?.renewalDay||values.resetRenewal)?(sourceDate||nextDue).slice(5):(old?.renewalDay||''),notes:values.notes||''};
 if(changed&&old.nextDue&&nextDue)data.feeReschedules.push({id:uid(),cardId,occurrence:old.nextOccurrence,from:old.nextDue,to:nextDue,date,notes:'Due date changed in fee settings.'});
 if(old)data.feeSettings=data.feeSettings.map(s=>s.cardId===cardId?setting:s);else data.feeSettings.push(setting);
 if(values.joiningPaidDate&&!joiningEntry)settleFee(data,cardId,'joining','paid',values.joiningAmount,values.joiningPaidDate,'Recorded from joining-fee settings.');
 return setting;
}
export function settleFee(data,cardId,kind,status,paidAmount,paidDate,notes='',expectedOccurrence){
 const s=settingsFor(data,cardId);if(!s)fail('Set up card fees first.');
 if(!['joining','annual'].includes(kind)||!['paid','waived'].includes(status)||!isDate(paidDate)||paidDate>dayNow()||!amount(paidAmount))fail('Enter a valid amount and payment / waiver date, today or earlier.');
 const occurrence=kind==='joining'?'joining':s.nextOccurrence;
 if(!occurrence||(expectedOccurrence&&expectedOccurrence!==occurrence))fail('This fee occurrence changed. Reopen it before recording payment.');
 if(data.feeEntries.some(e=>e.cardId===cardId&&e.kind===kind&&e.occurrence===occurrence))fail('This fee occurrence is already recorded. Correct its existing entry instead.');
 const entry={id:uid(),cardId,kind,occurrence,dueDate:kind==='annual'?s.nextDue:'',status,amount:status==='waived'?0:paidAmount,paidDate,notes};
 if(kind==='annual'){
  let year=Number(occurrence.slice(0,4))+1,next=renewalDate(year,s.renewalDay);
  while(data.feeEntries.some(e=>e.cardId===cardId&&e.kind==='annual'&&e.occurrence===next)){year++;next=renewalDate(year,s.renewalDay);}
  if(year>2199)fail('Next renewal exceeds the supported date range.');
  s.nextDue=next;s.nextOccurrence=next;
 }
 data.feeEntries.push(entry);return entry;
}
export function correctFee(data,id,values,date=dayNow()){
 const e=data.feeEntries.find(e=>e.id===id);if(!e)fail('Fee history entry not found.');
 if(!['paid','waived'].includes(values.status)||!amount(values.amount)||!isDate(values.paidDate)||values.paidDate>date)fail('Enter a valid actual amount and date, today or earlier.');
 Object.assign(e,{status:values.status,amount:values.status==='waived'?0:values.amount,paidDate:values.paidDate,notes:values.notes||''});
 // Corrections never create a second expense or move the current renewal schedule.
 return e;
}
export function rescheduleFee(data,cardId,due,notes='',changeRenewal=false,date=dayNow(),expectedOccurrence){
 const s=settingsFor(data,cardId);if(!s?.nextDue||!isDate(due))fail('Enter a valid due date for a scheduled annual fee.');
 if(expectedOccurrence&&expectedOccurrence!==s.nextOccurrence)fail('This fee occurrence changed. Reopen it before rescheduling.');
 if(s.nextDue===due)fail('Choose a different due date.');
 data.feeReschedules.push({id:uid(),cardId,occurrence:s.nextOccurrence,from:s.nextDue,to:due,date,notes});
 s.nextDue=due;if(changeRenewal)s.renewalDay=due.slice(5);
}
export function financialTotals(data,{from='',to='',cardId=''}={}){
 const bounded=!!(from||to),within=date=>!bounded||!!date&&(!from||date>=from)&&(!to||date<=to);
 if((from&&!isDate(from))||(to&&!isDate(to))||(from&&to&&from>to))fail('Choose a valid date range: From must not follow To.');
 let personal=0,family=0,received=0,feesPaid=0,undated=0;
 for(const r of data.records){if(r.stage&&r.stage!=='completed')continue;if(cardId&&r.cardId!==cardId)continue;const type=r.outcome;
  if(['personal','family'].includes(type)&&r.useValue!==null){if(!r.outcomeDate)undated++;if(within(r.outcomeDate)){if(type==='personal')personal+=Math.round(r.useValue*100);else family+=Math.round(r.useValue*100);}}
  if(type==='sold'&&r.received>0){if(!r.receivedDate)undated++;if(within(r.receivedDate))received+=Math.round(r.received*100);}
 }
 for(const e of data.feeEntries||[])if(e.status==='paid'&&(!cardId||e.cardId===cardId)&&within(e.paidDate))feesPaid+=Math.round(e.amount*100);
 const gross=personal+family+received;
 return {personal:personal/100,family:family/100,received:received/100,feesPaid:feesPaid/100,realised:gross/100,net:(gross-feesPaid)/100,undated};
}
