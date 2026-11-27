import {CROP_CALENDAR} from './world-calendar.js';
// Prices for the three original shared species are preserved; rice is new.
export const PRICES=Object.freeze({wheat:Object.freeze({buy:10,sell:25}),corn:Object.freeze({buy:15,sell:42}),rice:Object.freeze({buy:16,sell:40}),strawberry:Object.freeze({buy:12,sell:32})});
export const INITIAL_COINS=500;
export const validBalance=n=>Number.isSafeInteger(n)&&n>=0;
export function quoteTrade(state,id,action,quantity){
 if(!Object.hasOwn(PRICES,id)||!Object.hasOwn(CROP_CALENDAR,id)||!['buy','sell'].includes(action)||!Number.isSafeInteger(quantity)||quantity<1||quantity>999)return {ok:false,error:'Operação inválida.'};
 if(!validBalance(state?.coins))return {ok:false,error:'Saldo indisponível.'};
 const stock=id==='wheat'?{seeds:state.seeds,grain:state.grain}:state.stocks?.[id];
 if(!validBalance(stock?.seeds)||!validBalance(stock?.grain))return {ok:false,error:'Estoque indisponível.'};
 const total=PRICES[id][action]*quantity,coins=state.coins+(action==='buy'?-total:total);
 if(action==='buy'&&coins<0)return {ok:false,error:'Moedas insuficientes.'};
 if(action==='sell'&&stock.grain<quantity)return {ok:false,error:'Colheita insuficiente.'};
 if(!validBalance(coins)||!validBalance(stock.seeds+(action==='buy'?quantity:0)))return {ok:false,error:'Limite de saldo ou estoque.'};
 return {ok:true,total,coins};
}
export function tradeFarm(state,id,action,quantity){
 const q=quoteTrade(state,id,action,quantity);if(!q.ok)return q;
 const next=JSON.parse(JSON.stringify(state));next.coins=q.coins;
 if(id==='wheat'){if(action==='buy')next.seeds+=quantity;else next.grain-=quantity;}
 else{if(action==='buy')next.stocks[id].seeds+=quantity;else next.stocks[id].grain-=quantity;}
 return {...q,next};
}
// Persist stock and currency in one authoritative save, before touching live state.
export function commitTrade(state,id,action,quantity,write){
 const q=tradeFarm(state,id,action,quantity);if(!q.ok)return q;
 try{write(JSON.stringify(q.next));}catch{return {ok:false,error:'Falha ao salvar; nenhuma alteração aplicada.'};}
 return q;
}
