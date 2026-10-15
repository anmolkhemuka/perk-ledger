// Strict validation of the original backup format, before migration.
const STATUSES = ['available','claimed','used personally','sold','expired'];
function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10) === s; }
export function validateLegacy(input) {
  const fail = message => {throw Error(`Invalid backup: ${message}`);};
  const obj = x => x && typeof x==='object' && !Array.isArray(x);
  const str = (x,max=2000) => typeof x==='string' && x.length<=max;
  const amount = x => typeof x==='number' && Number.isFinite(x) && x>=0 && x<=1e9 && Math.abs(x*100-Math.round(x*100))<0.0001;
  const date = x => validDate(x) && x>='2000-01-01' && x<='2199-12-31';
  if(!obj(input)||input.version!==1) fail('unsupported format or version.');
  for(const key of ['cards','benefits','periods','records']) if(!Array.isArray(input[key])||input[key].length>20000) fail(`${key} must be a list (maximum 20,000).`);
  const allIds=new Set();
  for(const key of ['cards','benefits','periods','records']) for(const x of input[key]) { if(!obj(x)||!str(x.id,100)||!x.id||allIds.has(x.id)) fail('missing or duplicate ID.'); allIds.add(x.id); }
  const cards = new Set(input.cards.map(x=>x.id)), benefits = new Set(input.benefits.map(x=>x.id)), periods=new Map(input.periods.map(x=>[x.id,x]));
  for(const c of input.cards) if(!str(c.bank,100)||!c.bank.trim()||!str(c.holder,100)||!c.holder.trim()||!str(c.nickname,100)||!str(c.last4,4)||!/^\d{0,4}$/.test(c.last4)||(c.last4.length!==0&&c.last4.length!==4)) fail('card details or last four digits.');
  for(const b of input.benefits) if(!cards.has(b.cardId)||!str(b.name,100)||!b.name.trim()||!['quarterly','annual'].includes(b.frequency)||!['calendar','anniversary'].includes(b.basis)||!str(b.anchor,10)||(b.basis==='anniversary'&&!date(b.anchor))||!date(b.since)||!Number.isInteger(b.allowance)||b.allowance<0||b.allowance>10000||!amount(b.value)||!str(b.notes)) fail('benefit rule.');
  const periodKeys=new Set();
  for(const p of input.periods) {const key=`${p.benefitId}/${p.start}/${p.end}`; if(!benefits.has(p.benefitId)||!date(p.start)||!date(p.end)||p.start>=p.end||!Number.isInteger(p.allowance)||p.allowance<0||p.allowance>10000||!amount(p.value)||periodKeys.has(key)) fail('period details.'); periodKeys.add(key);}
  const counts = new Map();
  for(const r of input.records) {
    const p=periods.get(r.periodId);
    if(!p||!STATUSES.includes(r.status)||!str(r.code,500)||!str(r.notes)||!amount(r.value)||!amount(r.sale)||!amount(r.received)||r.received>r.sale||!str(r.claimDate,10)||!str(r.expiry,10)||(r.claimDate&&(!date(r.claimDate)||r.claimDate<p.start||r.claimDate>=p.end))||(r.expiry&&!date(r.expiry))||(r.claimDate&&r.expiry&&r.expiry<r.claimDate)||(['claimed','used personally','sold'].includes(r.status)&&!r.claimDate)||(r.status!=='sold'&&(r.sale!==0||r.received!==0))) fail('voucher, dates, status or payment amounts.');
    counts.set(p.id,(counts.get(p.id)||0)+1);
  }
  for(const [id,count] of counts) if(count>periods.get(id).allowance) fail('records exceed a period allowance.');
  // Copy only schema fields; unknown properties are never carried into application state.
  const pick=(x,keys)=>Object.fromEntries(keys.map(k=>[k,x[k]]));
  return {version:1,cards:input.cards.map(x=>pick(x,['id','bank','holder','nickname','last4'])),benefits:input.benefits.map(x=>pick(x,['id','cardId','name','frequency','basis','anchor','since','allowance','value','notes'])),periods:input.periods.map(x=>pick(x,['id','benefitId','start','end','allowance','value'])),records:input.records.map(x=>pick(x,['id','periodId','status','code','claimDate','expiry','notes','value','sale','received']))};
}
