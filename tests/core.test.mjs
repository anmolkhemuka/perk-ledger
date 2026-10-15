import test from 'node:test';
import assert from 'node:assert/strict';
import { periodFor, initialData, syncPeriods, currentPeriod, effectiveStatus, totals, validateData, loadData, saveData, STORAGE_KEY, outcomeForStatus } from '../core.mjs';
const rule = {frequency:'quarterly',basis:'calendar',anchor:''};
function fixture(date='2026-10-15') {const d=initialData();d.benefits.push({id:'benefit',cardId:d.cards[0].id,name:'Test benefit',category:'auto',frequency:'quarterly',basis:'calendar',anchor:'',since:'2026-07-01',allowance:5,value:100,notes:''});return syncPeriods(d,date);}
function record(d,p,overrides={}){
 const r={id:crypto.randomUUID(),periodId:p.id,cardId:d.benefits.find(b=>b.id===p.benefitId).cardId,benefitId:p.benefitId,status:'available',value:100,code:'TEST-ONLY',claimDate:'',expiry:'',notes:'Synthetic test record',sale:0,received:0,
 option:'Manual',provider:'',faceValue:100,useValue:null,recipient:'',outcomeDate:'',receivedDate:'',legacy:false,paymentReviewed:false,...overrides};
 r.outcome=outcomeForStatus(r.status);
 if(['personal','family'].includes(r.outcome))r.useValue=overrides.useValue??overrides.value??100;
 if(r.outcome)r.outcomeDate=r.claimDate;
 return r;
}
test('calendar quarter boundaries, year rollover and annual periods',()=>{
 for(const [date,start,end] of [['2026-03-31','2026-01-01','2026-04-01'],['2026-04-01','2026-04-01','2026-07-01'],['2026-12-31','2026-10-01','2027-01-01'],['2027-01-01','2027-01-01','2027-04-01']])assert.deepEqual(periodFor(rule,date),{start,end});
 assert.deepEqual(periodFor({...rule,frequency:'annual'},'2024-02-29'),{start:'2024-01-01',end:'2025-01-01'});
});
test('anniversary quarters clamp month ends without drifting',()=>{
 const r={...rule,basis:'anniversary',anchor:'2024-01-31'};
 assert.deepEqual(periodFor(r,'2024-04-29'),{start:'2024-01-31',end:'2024-04-30'});
 assert.deepEqual(periodFor(r,'2024-04-30'),{start:'2024-04-30',end:'2024-07-31'});
 assert.deepEqual(periodFor(r,'2025-01-30'),{start:'2024-10-31',end:'2025-01-31'});
 assert.equal(periodFor(r,'2024-01-30'),null);
});
test('Feb 29 annual anniversary returns to leap day',()=>{const r={...rule,frequency:'annual',basis:'anniversary',anchor:'2024-02-29'};assert.deepEqual(periodFor(r,'2025-02-28'),{start:'2025-02-28',end:'2026-02-28'});assert.deepEqual(periodFor(r,'2028-02-29'),{start:'2028-02-29',end:'2029-02-28'});});
test('missed periods materialize and history snapshots survive changed allowances',()=>{const d=fixture();const past=d.periods[0];assert.equal(d.periods.length,2);d.benefits[0].allowance=8;d.benefits[0].value=250;syncPeriods(d,'2027-04-01');assert.equal(d.periods.length,4);assert.equal(past.allowance,5);assert.equal(past.value,100);assert.equal(currentPeriod(d,d.benefits[0],'2027-04-01').allowance,8);syncPeriods(d,'2027-04-01');assert.equal(d.periods.length,4);});
test('totals keep personal use, sales receipts, pending and unused distinct',()=>{const d=fixture(),p=d.periods[1];d.records=[record(d,p,{status:'used personally',claimDate:'2026-10-02',value:200}),record(d,p,{status:'sold',claimDate:'2026-10-03',value:900,sale:80,received:30}),record(d,p,{status:'claimed',claimDate:'2026-10-04',expiry:'2026-11-01'}),record(d,p,{expiry:'2026-10-14'})];assert.deepEqual(totals(d,'2026-10-15'),{personal:200,family:0,received:30,pending:50,unused:200,realised:230});assert.doesNotThrow(()=>validateData(d));});
test('old live vouchers count as unused, past unclaimed allowances do not roll over',()=>{const d=fixture();d.records.push(record(d,d.periods[0],{status:'claimed',claimDate:'2026-07-02',expiry:'2026-12-01'}));assert.equal(totals(d,'2026-10-15').unused,600);assert.equal(totals(d,'2027-01-01').unused,0);});
test('expiry date is inclusive and terminal outcomes stay terminal',()=>{const r={status:'claimed',expiry:'2026-10-15'};assert.equal(effectiveStatus(r,'2026-10-15'),'claimed');assert.equal(effectiveStatus(r,'2026-10-16'),'expired');assert.equal(effectiveStatus({...r,status:'sold'},'2026-10-16'),'sold');});
test('JSON round trip restores snapshots, records and exact totals',()=>{const d=fixture();d.records.push(record(d,d.periods[1],{status:'sold',claimDate:'2026-10-05',sale:99.50,received:25.25}));const restored=validateData(JSON.parse(JSON.stringify(d)));assert.deepEqual(restored,validateData(d));assert.deepEqual(totals(restored,'2026-10-15'),totals(d,'2026-10-15'));});
test('local persistence reloads correctly and propagates quota failures',()=>{const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};const d=fixture();saveData(storage,d);assert.deepEqual(loadData(storage),validateData(d));assert.ok(entries.has(STORAGE_KEY));assert.throws(()=>saveData({setItem(){throw Error('Quota exceeded');}},d),/Quota/);assert.throws(()=>loadData({getItem(){return '{broken';}}));assert.throws(()=>loadData({getItem(){throw Error('Storage unavailable');}}));});
test('import rejects invalid and inconsistent data without mutating input',()=>{
 const mutations=[d=>d.version=999,d=>d.cards[0].last4='123456789',d=>d.cards[0].id=d.cards[1].id,d=>d.benefits[0].cardId='missing',d=>d.periods[0].end='2026-02-30',d=>d.benefits[0].allowance=-1,d=>d.benefits[0].value=NaN,d=>d.records.push(record(d,d.periods[1],{status:'sold',claimDate:'2026-10-02',sale:20,received:30})),d=>d.records.push(record(d,d.periods[1],{status:'claimed'})),d=>d.records.push(record(d,d.periods[1],{claimDate:'2026-07-01'})),d=>d.records.push(record(d,d.periods[1],{status:'used personally',claimDate:'2026-10-01',sale:10})),d=>d.records=Array.from({length:6},()=>record(d,d.periods[1])),d=>d.records.push(record(d,d.periods[1],{claimDate:'2026-10-15',expiry:'2026-10-14'}))];
 for(const mutate of mutations){const d=fixture();mutate(d);assert.throws(()=>validateData(d),/Invalid backup/);}
 const d=fixture();const original=structuredClone(d);validateData(d);assert.deepEqual(d,original);
});
test('untrusted text is retained as data, unknown properties stripped',()=>{const d=fixture();d.cards[0].nickname='<img src=x onerror=alert(1)>';d.secret='not a schema field';const v=validateData(d);assert.equal(v.cards[0].nickname,d.cards[0].nickname);assert.equal(v.secret,undefined);});
test('fractional rupees accumulate in paise without drift',()=>{const d=fixture(),p=d.periods[1];d.records=[record(d,p,{status:'sold',claimDate:'2026-10-03',sale:0.3,received:0.1}),record(d,p,{status:'sold',claimDate:'2026-10-04',sale:0.4,received:0.2})];const t=totals(d,'2026-10-15');assert.equal(t.received,0.3);assert.equal(t.pending,0.4);});
