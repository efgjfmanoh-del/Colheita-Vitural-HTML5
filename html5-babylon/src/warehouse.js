import {CROP_CALENDAR} from './world-calendar.js';
const count=n=>Number.isSafeInteger(n)&&n>=0;
export function validWarehouse(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([id,v])=>id==='supplies'?!!v&&count(v.compost)&&count(v.treatments):Object.hasOwn(CROP_CALENDAR,id)&&v&&count(v.seeds)&&count(v.grain));}
export function transferWarehouse(state,id,kind,direction,quantity,write){
 const supply=id==='supplies';if(!(supply?['compost','treatments'].includes(kind):Object.hasOwn(CROP_CALENDAR,id)&&['seeds','grain'].includes(kind))||!['deposit','withdraw'].includes(direction)||!Number.isSafeInteger(quantity)||quantity<1||quantity>999||!validWarehouse(state.warehouse??{}))return {ok:false,error:'Transferência inválida.'};
 const bag=id==='wheat'||supply?state:state.stocks?.[id],stored=state.warehouse?.[id]??(supply?{compost:0,treatments:0}:{seeds:0,grain:0});if(!count(bag?.[kind]))return {ok:false,error:'Estoque indisponível.'};
 const delta=direction==='deposit'?quantity:-quantity,remain=bag[kind]-delta,held=stored[kind]+delta;if(!count(remain)||!count(held))return {ok:false,error:'Quantidade indisponível.'};
 const next=JSON.parse(JSON.stringify(state));next.warehouse??={};next.warehouse[id]={...stored,[kind]:held};(id==='wheat'||supply?next:next.stocks[id])[kind]=remain;
 try{write(JSON.stringify(next));}catch{return {ok:false,error:'Falha ao salvar; estoque preservado.'};}return {ok:true,next};
}
