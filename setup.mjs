import {uid,today,currentPeriod,syncPeriods,allowanceUsage} from './core.mjs';
import {trackingCategory} from './preferences.mjs';
export const SHARED_LABELS={spa:'Spa / Lakmé',fitness:'Fitness / Cultfit',healthcare:'Healthcare / Thyrocare',cab:'Cab / Uber',ott:'OTT'};
export function templateDraft(data){return Object.keys(SHARED_LABELS).map(category=>{
 const saved=data.templates?.find(t=>t.category===category);if(saved)return {...saved};
 const matching=data.benefits.filter(b=>trackingCategory(b)===category),first=matching[0];
 return {id:category,category,enabled:!!first,allowance:1,frequency:first?.frequency??'quarterly',value:first?.value??null};
});}
export function setupIssues(data){const issues=[];for(const b of data.benefits)if(b.allowance!==1)issues.push(`${b.name}: legacy allowance ${b.allowance} retained on this card; standard setup uses one claim.`);for(const c of data.cards)for(const category of Object.keys(SHARED_LABELS)){const matches=data.benefits.filter(b=>!b.retired&&b.cardId===c.id&&trackingCategory(b)===category);if(matches.length>1)issues.push(`${c.nickname||c.bank}: multiple ${SHARED_LABELS[category]} rules retained; review separately.`);}for(const b of data.benefits)if(b.basis==='anniversary'&&!b.calendarFrom)issues.push(`${b.name}: calendar conversion available in advanced settings.`);return issues;}
export function convertCalendar(data,id,date=today()){
 const b=data.benefits.find(b=>b.id===id);if(!b)throw Error('Benefit not found.');
 const snapshots=data.periods.filter(p=>p.benefitId===id&&p.end>date);
 // Finish every already-issued snapshot before beginning calendar periods. The first
 // calendar fragment receives no extra allowance; the next full calendar period starts normally.
 b.calendarFrom=snapshots.reduce((end,p)=>p.end>end?p.end:end,date);
 return b.calendarFrom;
}
export function applyTemplates(data,templates,cardIds,date=today()){
 data.templates=templates;
 for(const t of templates.filter(t=>t.enabled)){
  if(t.allowance===null)throw Error(`Enter the allowance for ${SHARED_LABELS[t.category]}; no bank rules are assumed.`);
  for(const cardId of cardIds){
   const matching=data.benefits.filter(b=>!b.retired&&b.cardId===cardId&&trackingCategory(b)===t.category);
   if(matching.length>1)continue; // Conflicting legacy entitlements need a human decision.
   if(matching.length){const b=matching[0];if(!b.templateId){b.templateId=t.id;b.override=b.allowance!==t.allowance||b.value!==t.value||b.frequency!==t.frequency||b.basis!=='calendar';}
    if(!b.override){if(b.frequency!==t.frequency)convertCalendar(data,b.id,date);b.allowance=t.allowance;b.value=t.value;b.frequency=t.frequency;}
   }else if(!data.benefits.some(b=>b.retired&&b.cardId===cardId&&trackingCategory(b)===t.category))data.benefits.push({id:uid(),cardId,name:SHARED_LABELS[t.category],category:t.category,templateId:t.id,override:false,allowance:t.allowance,value:t.value,frequency:t.frequency,basis:'calendar',anchor:'',since:date,notes:''});
  }
 }
 syncPeriods(data,date);return data;
}
export function eligibleBenefits(data,category,date=today()){return data.benefits.filter(b=>!b.retired&&trackingCategory(b)===category&&data.benefits.filter(x=>!x.retired&&x.cardId===b.cardId&&trackingCategory(x)===category).length===1&&(()=>{const p=currentPeriod(data,b,date);return p&&allowanceUsage(data,b,p)<p.allowance;})());}

// Keep the same entitlement and snapshots when disabling or restoring a card benefit.
export function setCardBenefits(data,cardId,benefitIds,templateIds,date=today()){
 const selected=new Set(benefitIds);
 for(const b of data.benefits.filter(b=>b.cardId===cardId))b.retired=!selected.has(b.id);
 const templates=data.templates;
 const additions=(templates||[]).filter(t=>templateIds.includes(t.id)&&!data.benefits.some(b=>b.cardId===cardId&&trackingCategory(b)===t.category));
 applyTemplates(data,additions,[cardId],date);data.templates=templates;return data;
}
