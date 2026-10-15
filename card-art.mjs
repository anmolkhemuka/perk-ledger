// Public product artwork only. No personal card photographs or banking details.
export function cardArt(card){
 const bank=String(card?.bank||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(bank.includes('canara'))return {key:'canara',src:'./assets/cards/canara-select.jpg',name:'Canara Bank RuPay Select Debit Card'};
 if(bank.includes('utkarsh'))return {key:'utkarsh',src:'./assets/cards/utkarsh-select.jpg',name:'Utkarsh Bank RuPay Select Debit Card'};
 if(bank.includes('baroda')||bank==='bob'||bank.includes('bhoomi'))return {key:'bob',src:'./assets/cards/bob-bhoomi.png',name:'Bank of Baroda Bhoomi RuPay Select Debit Card'};
 return null;
}
