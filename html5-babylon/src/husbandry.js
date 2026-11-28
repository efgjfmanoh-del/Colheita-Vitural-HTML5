import {REAL_MS_PER_GAME_DAY as DAY} from './world-calendar.js';
export const SPECIES=Object.freeze({
 chicken:{name:'Galinha',icon:'🐔',price:75,feed:1,water:1,adult:2,product:'egg',yield:2},
 cow:{name:'Vaca',icon:'🐄',price:220,feed:3,water:3,adult:3,product:'milk',yield:2},
 sheep:{name:'Ovelha',icon:'🐑',price:140,feed:2,water:2,adult:3,product:'wool',yield:1},
 pig:{name:'Porco',icon:'🐖',price:125,feed:2,water:2,adult:3,product:'manure',yield:2},
 duck:{name:'Pato',icon:'🦆',price:85,feed:1,water:1,adult:2,product:'duckEgg',yield:1}
});
export const PRODUCTS=Object.freeze({egg:{name:'Ovo de galinha',icon:'🥚',price:12},milk:{name:'Leite',icon:'🥛',price:30},wool:{name:'Lã',icon:'🧶',price:38},manure:{name:'Esterco',icon:'🌿',price:8},duckEgg:{name:'Ovo de pato',icon:'🥚',price:16}});
export const MAX_ANIMALS=10,MAX_SUPPLY=200,FEED_PRICE=20;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const stock=()=>Object.fromEntries(Object.keys(PRODUCTS).map(id=>[id,0]));
const validStock=s=>s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===Object.keys(PRODUCTS).length&&Object.keys(PRODUCTS).every(k=>count(s[k]));
export const freshHusbandry=()=>({schema:1,next:1,feed:0,water:0,last:0,animals:[],pending:stock(),products:stock()});
export function validHusbandry(s){return s?.schema===1&&count(s.next)&&s.next>0&&count(s.last)&&count(s.feed)&&s.feed<=MAX_SUPPLY&&count(s.water)&&s.water<=MAX_SUPPLY&&validStock(s.pending)&&validStock(s.products)&&Array.isArray(s.animals)&&s.animals.length<=MAX_ANIMALS&&new Set(s.animals.map(a=>a?.id)).size===s.animals.length&&s.animals.every(a=>a&&count(a.id)&&a.id>0&&a.id<s.next&&Object.hasOwn(SPECIES,a.species)&&count(a.age)&&a.age<=9999&&count(a.condition)&&a.condition<=100&&(a.bredAt===undefined||count(a.bredAt))&&(a.penId===undefined||typeof a.penId==='string'&&/^extra-[1-5]$/.test(a.penId)));}
export function settleHusbandry(s,now){
 if(!validHusbandry(s)||!count(now))return null;const days=Math.max(0,Math.floor((now-s.last)/DAY));if(!days)return s;
 const n=JSON.parse(JSON.stringify(s));n.last+=days*DAY;
 // Supplies are capped, so productive loops are bounded even after long absence.
 let d=0;for(;d<days&&n.animals.some(a=>n.feed>=SPECIES[a.species].feed&&n.water>=SPECIES[a.species].water);d++){
 for(const a of n.animals){const p=SPECIES[a.species];a.age=Math.min(9999,a.age+1);if(n.feed>=p.feed&&n.water>=p.water){n.feed-=p.feed;n.water-=p.water;a.condition=Math.min(100,a.condition+8);if(a.age>=p.adult&&a.condition>=60&&count(n.pending[p.product]+p.yield))n.pending[p.product]+=p.yield;}else a.condition=Math.max(0,a.condition-12);}
 }
 if(d<days)for(const a of n.animals){a.age=Math.min(9999,a.age+days-d);a.condition=Math.max(0,a.condition-12*(days-d));}
 return n;
}
export function husbandryAction(state,action,id,now,qty=1,penId=null){
 if(penId!==null&&(!/^extra-[1-5]$/.test(penId)||!state.extraPens?.some(p=>p.id===penId&&p.species===id)))return null;
 if(!count(state.coins)||!validHusbandry(state.husbandry)||!count(now))return null;
 const settled=settleHusbandry(state.husbandry,now),h=JSON.parse(JSON.stringify(settled)),next={...state,husbandry:h};let event=null;
 if(action==='buy'){const p=SPECIES[id];if(!Object.hasOwn(SPECIES,id)||h.animals.length>=MAX_ANIMALS||next.coins<p.price||!count(h.next+1))return null;next.coins-=p.price;h.animals.push({id:h.next++,species:id,age:0,condition:100,...(penId?{penId}:{})});}
 else if(action==='feed'){if(h.feed+10>MAX_SUPPLY||next.coins<FEED_PRICE)return null;h.feed+=10;next.coins-=FEED_PRICE;}
 else if(action==='water'){if(h.water+10>MAX_SUPPLY)return null;h.water+=10;}
 else if(action==='collect'){const goods=id&&Object.hasOwn(SPECIES,id)?[SPECIES[id].product]:Object.keys(PRODUCTS);if(!goods.some(k=>h.pending[k]>0))return null;for(const k of goods){if(!count(h.products[k]+h.pending[k]))return null;h.products[k]+=h.pending[k];h.pending[k]=0;}event='animalcollect';}
 else if(action==='care'){const a=h.animals.find(a=>a.id===id);if(!a||a.condition>=100||h.feed<1||h.water<1)return null;h.feed--;h.water--;a.condition=Math.min(100,a.condition+10);event='care';}
 else if(action==='breed'){const p=SPECIES[id],parents=h.animals.filter(a=>a.species===id&&(a.penId??null)===penId&&a.age>=p?.adult&&a.condition>=85&&(a.bredAt===undefined||now-a.bredAt>=3*DAY));if(!p||parents.length<2||h.animals.length>=MAX_ANIMALS||h.feed<2*p.feed||h.water<2*p.water)return null;const [a,b]=parents;h.feed-=2*p.feed;h.water-=2*p.water;a.bredAt=b.bredAt=now;a.condition-=10;b.condition-=10;h.animals.push({id:h.next++,species:id,age:0,condition:90,...(penId?{penId}:{})});event='care';}
 else if(action==='sell'){if(!Object.hasOwn(PRODUCTS,id)||!Number.isInteger(qty)||qty<1||qty>999||h.products[id]<qty||!count(next.coins+qty*PRODUCTS[id].price))return null;h.products[id]-=qty;next.coins+=qty*PRODUCTS[id].price;event='sell';}
 else return null;
 return validHusbandry(h)?{next,event}:null;
}
