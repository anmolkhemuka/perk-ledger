export const CATEGORIES = ['spa','fitness','healthcare','cab','ott','other'];
export const CATEGORY_LABELS = {spa:'Spa / salon (shared Spa + Lakmé)',fitness:'Cultfit / fitness',healthcare:'Healthcare / Thyrocare',cab:'Cab / Uber',ott:'OTT',other:'Other'};
// User-supplied tracking preferences. These do not create or verify bank entitlements.
export function defaultPreferences() {
  return {
    spa:{outcome:'used personally',recipient:'',hint:'Spa and Lakmé use the same allowance. Sale prices must be entered individually.',options:[{name:'Spa',useValue:2000},{name:'Lakmé',useValue:1500}]},
    fitness:{outcome:'sold',recipient:'',hint:'Usually sold for ₹900–₹1,100. Enter the actual agreed price.',options:[{name:'Cultfit',useValue:null}]},
    healthcare:{outcome:'sold',recipient:'',hint:'Sale prices vary. Personal use is also supported.',options:[{name:'Thyrocare',useValue:null}]},
    cab:{outcome:'used personally',recipient:'',hint:'Personal-use default ₹100; change it for this redemption if needed.',options:[{name:'Uber',useValue:100}]},
    ott:{outcome:'used personally',recipient:'Brother',hint:'Amazon Prime use value defaults to ₹1,499. Sales are often ₹500–₹600; enter the actual price.',options:[{name:'Amazon Prime',useValue:1499}]},
    other:{outcome:'used personally',recipient:'',hint:'Choose a provider and confirm the actual value or sale price.',options:[]},
  };
}
export function trackingCategory(b) {
  if (b.category && b.category !== 'auto') return b.category;
  if (/spa|lakm|salon|massage/i.test(b.name)) return 'spa';
  if (/cult|fitness|gym/i.test(b.name)) return 'fitness';
  if (/thyro|health|medical|diagnostic/i.test(b.name)) return 'healthcare';
  if (/ott|stream|prime|netflix/i.test(b.name)) return 'ott';
  if (/cab|taxi|uber/i.test(b.name)) return 'cab';
  return 'other';
}
export function optionDefault(preferences,b,option) {
  return preferences[trackingCategory(b)].options.find(x=>x.name.toLocaleLowerCase()===option.trim().toLocaleLowerCase())?.useValue ?? null;
}
export function validatePreferences(p) {
  const fail=()=>{throw Error('Invalid backup: tracking preferences.');};
  if(!p||typeof p!=='object'||Array.isArray(p))fail();
  const result={};
  for(const category of CATEGORIES){
    const x=p[category];
    if(!x||!['used personally','gifted to family','sold'].includes(x.outcome)||typeof x.recipient!=='string'||x.recipient.length>100||typeof x.hint!=='string'||x.hint.length>1000||!Array.isArray(x.options)||x.options.length>50)fail();
    const names=new Set();
    const options=x.options.map(o=>{
      if(!o||typeof o.name!=='string'||!o.name.trim()||o.name.length>100||names.has(o.name.trim().toLocaleLowerCase())||(o.useValue!==null&&(!Number.isFinite(o.useValue)||o.useValue<0||o.useValue>1e9||Math.abs(o.useValue*100-Math.round(o.useValue*100))>.0001)))fail();
      names.add(o.name.trim().toLocaleLowerCase());return {name:o.name.trim(),useValue:o.useValue};
    });
    result[category]={outcome:x.outcome,recipient:x.recipient,hint:x.hint,options};
  }
  return result;
}
