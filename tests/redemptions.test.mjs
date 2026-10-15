import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData,syncPeriods,currentPeriod,totals,validateData,reviewIssues,saveData,loadData,STORAGE_KEY,LEGACY_BACKUP_KEY,outcomeForStatus } from '../core.mjs';
import { optionDefault } from '../preferences.mjs';
function setup(name='Spa / Lakmé',allowance=5){const d=initialData();d.benefits.push({id:'b',cardId:d.cards[0].id,name,category:'auto',allowance,value:2000,frequency:'quarterly',basis:'calendar',anchor:'',since:'2026-10-01',notes:''});syncPeriods(d,'2026-10-15');return d;}
function add(d,status,fields={}){const p=d.periods[0];const r={id:crypto.randomUUID(),periodId:p.id,cardId:d.benefits[0].cardId,benefitId:p.benefitId,status,outcome:outcomeForStatus(status),option:'Lakmé',provider:'Custom salon',code:'TEST-ONLY',value:2000,faceValue:2000,useValue:['used personally','gifted to family'].includes(status)?1500:null,sale:0,received:0,claimDate:'2026-10-10',outcomeDate:['available','claimed','expired'].includes(status)?'':'2026-10-12',expiry:'2026-12-01',recipient:status==='gifted to family'?'Brother':'',notes:'',receivedDate:'',legacy:false,...fields};d.records.push(r);return r;}
function legacy(d){return {version:1,cards:d.cards,benefits:d.benefits.map(({category,...b})=>b),periods:d.periods,records:d.records.map(r=>Object.fromEntries(['id','periodId','status','value','sale','received','claimDate','expiry','code','notes'].map(k=>[k,k==='code'?'TEST-ONLY':r[k]])))};}
test('separate personal, family, receipts, pending and realised; never count face values for sales',()=>{
 const d=setup();add(d,'used personally',{faceValue:3000,useValue:1500});add(d,'gifted to family',{option:'Amazon Prime',faceValue:4000,useValue:1499});add(d,'sold',{faceValue:9999,sale:550,received:200});
 assert.deepEqual(totals(d,'2026-10-15'),{personal:1500,family:1499,received:200,pending:350,unused:4000,realised:3199});
});
test('provider preferences are editable snapshots, not prices or entitlement rules',()=>{
 const d=setup(),b=d.benefits[0];assert.equal(optionDefault(d.preferences,b,'Lakmé'),1500);assert.equal(optionDefault(d.preferences,b,'Spa'),2000);
 const r=add(d,'used personally',{useValue:1500});d.preferences.spa.options[1].useValue=1700;
 assert.equal(optionDefault(d.preferences,b,'Lakmé'),1700);assert.equal(r.useValue,1500);assert.equal(totals(d,'2026-10-15').personal,1500);assert.equal(optionDefault(d.preferences,b,'My custom vendor'),null);
 assert.equal(optionDefault(d.preferences,{name:'OTT'},'Amazon Prime'),1499);assert.equal(optionDefault(d.preferences,{name:'Cab'},'Uber'),100);
});
test('variable Cultfit and health prices are retained individually; partial receipts remain pending',()=>{
 const d=setup('Cultfit');add(d,'sold',{option:'Cultfit',sale:900,received:900});add(d,'sold',{option:'Cultfit',sale:1100,received:400});add(d,'sold',{option:'Thyrocare',sale:725,received:100});
 const t=totals(d,'2026-10-15');assert.equal(t.received,1400);assert.equal(t.pending,1325);assert.equal(t.realised,1400);assert.equal(t.personal,0);assert.doesNotThrow(()=>validateData(d));
});
test('Spa and Lakmé records share one period allowance; issuing then using never adds another unit',()=>{
 const d=setup('Spa / salon',1),r=add(d,'claimed',{option:'Spa'});assert.equal(d.records.length,1);assert.equal(totals(d,'2026-10-15').unused,2000);
 Object.assign(r,{status:'used personally',outcome:'personal',useValue:2000,outcomeDate:'2026-10-12'});assert.doesNotThrow(()=>validateData(d));assert.equal(d.records.length,1);assert.equal(totals(d,'2026-10-15').unused,0);
 add(d,'sold',{option:'Lakmé',sale:500,received:0});assert.throws(()=>validateData(d),/allowance/);
});
test('family gift requires a nickname and only enters the family-use total',()=>{
 const d=setup('OTT');const r=add(d,'gifted to family',{option:'Amazon Prime',useValue:1499,faceValue:500});assert.doesNotThrow(()=>validateData(d));assert.equal(totals(d,'2026-10-15').family,1499);assert.equal(totals(d,'2026-10-15').personal,0);
 r.recipient='';assert.throws(()=>validateData(d),/recipient/);
});
test('migration keeps every original field and amount; unknown actual use/provider/outcome dates need review',()=>{
 const d=setup();add(d,'used personally',{value:1876});add(d,'sold',{value:3500,sale:1017,received:301});add(d,'claimed',{value:750});const old=legacy(d),snapshot=structuredClone(old),v2=validateData(old);
 assert.equal(v2.version,5);assert.deepEqual(old,snapshot);
 old.records.forEach((r,i)=>Object.entries(r).forEach(([k,v])=>assert.equal(v2.records[i][k],v)));
 assert.equal(v2.records[0].outcome,'personal');assert.equal(v2.records[0].useValue,null);assert.equal(v2.records[2].outcome,null);assert.equal(v2.records[0].provider,'');
 assert.ok(v2.records.every(r=>reviewIssues(r).length));const t=totals(v2,'2026-10-15');assert.equal(t.personal,0);assert.equal(t.received,301);assert.equal(t.pending,716);assert.equal(t.realised,301);
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(v2))),v2);
});
test('v2 backup round trip preserves preferences, historical values, family outcome and partial receipts',()=>{
 const d=setup();add(d,'gifted to family',{useValue:1499,option:'Amazon Prime'});add(d,'sold',{sale:537.5,received:137.25});const clean=validateData(d);assert.deepEqual(validateData(JSON.parse(JSON.stringify(clean))),clean);
 const items=new Map(),storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};saveData(storage,clean);assert.deepEqual(loadData(storage),clean);
});
test('migration preserves an exact pre-upgrade recovery copy and blocks overwrite if it cannot be stored',()=>{
 const d=setup();add(d,'used personally');const raw=JSON.stringify(legacy(d)),items=new Map([[STORAGE_KEY,raw]]),storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
 const migrated=loadData(storage);assert.equal(items.get(STORAGE_KEY),raw);saveData(storage,migrated);assert.equal(items.get(LEGACY_BACKUP_KEY),raw);assert.equal(JSON.parse(items.get(STORAGE_KEY)).version,5);
 const failStore={getItem:k=>k===STORAGE_KEY?raw:null,setItem(){throw Error('Quota failure');}};assert.throws(()=>saveData(failStore,migrated),/Quota/);assert.equal(failStore.getItem(STORAGE_KEY),raw);
});
test('ambiguous old Spa/Lakmé rules are flagged and unrecorded estimates are not counted twice',()=>{
 const d=setup('Spa');d.benefits.push({...d.benefits[0],id:'lakme',name:'Lakmé'});syncPeriods(d,'2026-10-15');assert.equal(totals(d,'2026-10-15').unused,0);
});
test('rejects inconsistent outcome/value/payment data and malformed preferences',()=>{
 for(const mutate of [r=>r.outcome='family',r=>r.useValue=1500,r=>r.received=600,r=>r.sale=0,r=>r.outcomeDate='2026-10-01']){const d=setup();const r=add(d,'sold',{sale:550,received:50});mutate(r);assert.throws(()=>validateData(d),/Invalid backup/);}
 const d=setup();d.preferences.spa.options.push({name:'Lakmé',useValue:100});assert.throws(()=>validateData(d),/preferences/);
});
