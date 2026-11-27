import {record,hasPerk} from './progression.js';
import {CROP_CALENDAR} from './world-calendar.js';
// Prices for the three original shared species are preserved; rice is new.
export const PRICES=Object.freeze({wheat:Object.freeze({buy:10,sell:25}),corn:Object.freeze({buy:15,sell:42}),rice:Object.freeze({buy:16,sell:40}),strawberry:Object.freeze({buy:12,sell:32}),lettuce:Object.freeze({buy:5,sell:12}),carrot:Object.freeze({buy:15,sell:40}),pea:Object.freeze({buy:9,sell:24}),basil:Object.freeze({buy:7,sell:18}),tomato:Object.freeze({buy:18,sell:48}),broccoli:Object.freeze({buy:20,sell:55}),sunflower:Object.freeze({buy:11,sell:29}),turnip:Object.freeze({buy:8,sell:20})});
export const SUPPLIES=Object.freeze({compost:Object.freeze({name:'Adubo orgânico',buy:8}),treatments:Object.freeze({name:'Tratamento de pragas',buy:12})});
export const INITIAL_COINS=500;
export const validBalance=n=>Number.isSafeInteger(n)&&n>=0;
export function quoteTrade(state,id,action,quantity){
 if(!Object.hasOwn(PRICES,id)||!Object.hasOwn(CROP_CALENDAR,id)||!['buy','sell'].includes(action)||!Number.isSafeInteger(quantity)||quantity<1||quantity>999)return {ok:false,error:'Operação inválida.'};
 if(!validBalance(state?.coins))return {ok:false,error:'Saldo indisponível.'};
 const stock=id==='wheat'?{seeds:state.seeds,grain:state.grain}:state.stocks?.[id];
 if(!validBalance(stock?.seeds)||!validBalance(stock?.grain))return {ok:false,error:'Estoque indisponível.'};
 const total=(action==='sell'&&hasPerk(state.progress,'negocio')?Math.floor(PRICES[id][action]*1.05):PRICES[id][action])*quantity,coins=state.coins+(action==='buy'?-total:total);
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
 if(action==='sell'&&next.progress)record(next.progress,'sell',{units:quantity,value:q.total});
 return {...q,next};
}
// Persist stock and currency in one authoritative save, before touching live state.
export function commitTrade(state,id,action,quantity,write){
 const q=tradeFarm(state,id,action,quantity);if(!q.ok)return q;
 try{write(JSON.stringify(q.next));}catch{return {ok:false,error:'Falha ao salvar; nenhuma alteração aplicada.'};}
 return q;
}

export function quoteSupply(state,id,quantity){if(!Object.hasOwn(SUPPLIES,id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>999||!validBalance(state?.coins)||!validBalance(state?.[id]))return {ok:false,error:'Operação inválida.'};const total=SUPPLIES[id].buy*quantity,coins=state.coins-total;if(coins<0)return {ok:false,error:'Moedas insuficientes.'};if(!validBalance(state[id]+quantity))return {ok:false,error:'Limite de estoque.'};return {ok:true,total,coins};}
export function commitSupply(state,id,quantity,write){const q=quoteSupply(state,id,quantity);if(!q.ok)return q;const next=JSON.parse(JSON.stringify(state));next.coins=q.coins;next[id]+=quantity;try{write(JSON.stringify(next));}catch{return {ok:false,error:'Falha ao salvar; nenhuma alteração aplicada.'};}return {...q,next};}
