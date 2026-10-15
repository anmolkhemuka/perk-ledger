import {financialEntries,financialTotals} from './fees.mjs';
import {currentPeriod,allowanceUsage,effectiveStatus,today} from './core.mjs';
import {trackingCategory} from './preferences.mjs';
export const entryTotal=rows=>rows.reduce((sum,row)=>sum+Math.round((row.amount??0)*100),0)/100;
export function unusedEntries(data,filters={},date=today()){
 financialTotals(data,filters); // Reuse the same date-range validation.
 const overlaps=p=>(!filters.from||p.end>filters.from)&&(!filters.to||p.start<=filters.to);
 const entries=[];
 for(const r of data.records){if(filters.cardId&&r.cardId!==filters.cardId)continue;if(!['available','claimed','voucher ready'].includes(effectiveStatus(r,date)))continue;const p=data.periods.find(p=>p.id===r.periodId);if(!overlaps(p))continue;entries.push({recordId:r.id,benefitId:r.benefitId,periodId:p.id,kind:'voucher',units:1,amount:r.faceValue??r.value});}
 for(const b of data.benefits){if(b.retired||(filters.cardId&&b.cardId!==filters.cardId))continue;if(data.benefits.filter(x=>!x.retired&&x.cardId===b.cardId&&trackingCategory(x)===trackingCategory(b)).length>1)continue;const p=currentPeriod(data,b,date);if(!p||!overlaps(p))continue;const units=Math.max(0,p.allowance-allowanceUsage(data,b,p));if(units)entries.push({benefitId:b.id,periodId:p.id,kind:'allowance',units,amount:p.value===null?null:Math.round(p.value*100)*units/100});}
 return entries;
}
export function summaryEntries(data,metric,filters={},date=today()){
 if(metric==='wallet')return unusedEntries(data,filters,date);
 const kind={personal:'personal',gift:'family',received:'received'}[metric];
 return financialEntries(data,filters).filter(e=>e.inRange&&(metric==='sparkle'||e.kind===kind)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
