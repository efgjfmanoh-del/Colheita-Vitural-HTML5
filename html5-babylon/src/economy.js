import {CROP_CALENDAR} from './world-calendar.js';
// Currency and crop stocks share ONE atomic save; no cross-key transaction.
export const PRICES=Object.freeze({"wheat":[10,25],"corn":[15,42],"rice":[12,30],"strawberry":[12,32],"lettuce":[0,5],"carrot":[0,15],"pea":[0,9],"basil":[2,7],"tomato":[2,18],"broccoli":[0,20],"sunflower":[0,11],"turnip":[0,8]});
const count=n=>Number.isSafeInteger(n)&&n>=0;
export function validEconomy(v){return !!v&&count(v.coins)&&count(v.trades);}
export function tradeCrop(farm,id,action,qty){
 if(!Object.hasOwn(CROP_CALENDAR,id)||!Object.hasOwn(PRICES,id)||!['buy','sell'].includes(action)||!Number.isSafeInteger(qty)||qty<1||qty>99||!validEconomy(farm.economy))return null;
 const stock=id==='wheat'?farm:farm.stocks?.[id],seeds=stock?.seeds,grain=stock?.grain;
 if(!count(seeds)||!count(grain))return null;
 const price=PRICES[id][action==='buy'?0:1],amount=price*qty,coins=farm.economy.coins;
 if(action==='buy'&&(coins<amount||!count(seeds+qty))||action==='sell'&&(grain<qty||!count(coins+amount))||!count(farm.economy.trades+1))return null;
 const next=JSON.parse(JSON.stringify(farm)),target=id==='wheat'?next:next.stocks[id];
 if(action==='buy'){target.seeds+=qty;next.economy.coins-=amount;}else{target.grain-=qty;next.economy.coins+=amount;}
 next.economy.trades++;return next;
}
