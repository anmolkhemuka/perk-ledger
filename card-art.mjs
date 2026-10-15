// Fixed product IDs keep artwork independent of nicknames and bank display text.
export const CARD_TYPES=[
 {key:'boi',bank:'BOI',label:'BOI',src:'./assets/cards/boi-select.png',name:'Bank of India RuPay Select Debit Card'},
 {key:'canara',bank:'Canara Bank',label:'Canara',src:'./assets/cards/canara-select.jpg',name:'Canara Bank RuPay Select Debit Card'},
 {key:'utkarsh',bank:'Utkarsh Bank',label:'Utkarsh',src:'./assets/cards/utkarsh-select.jpg',name:'Utkarsh Bank RuPay Select Debit Card'},
 {key:'bob',bank:'Bank of Baroda',label:'BOB Bhoomi',src:'./assets/cards/bob-bhoomi.png',name:'Bank of Baroda Bhoomi RuPay Select Debit Card'},
 {key:'other',bank:'',label:'Other card',src:'',name:'Other card'}
];
export function inferCardType(card){
 const bank=String(card?.bank||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(bank==='boi'||bank.includes('bankofindia'))return 'boi';
 if(bank.includes('canara'))return 'canara';
 if(bank.includes('utkarsh'))return 'utkarsh';
 if(bank.includes('baroda')||bank==='bob'||bank.includes('bhoomi'))return 'bob';
 return 'other';
}
export function cardArt(card){const key=card?.cardType??inferCardType(card);return CARD_TYPES.find(t=>t.key===key&&t.src)||null;}
