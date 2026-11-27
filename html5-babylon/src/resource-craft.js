import {validNature} from './nature.js';
export const CRAFT_KEYS=Object.freeze(['cv.wheat.v1','cv.build.v1']),CRAFT_JOURNAL='cv.resourceCraft.v1';
export const FENCE_RECIPE=Object.freeze({wood:2,stone:1});
const count=n=>Number.isSafeInteger(n)&&n>=0;
const validPair=o=>o&&typeof o==='object'&&Object.keys(o).length===2&&CRAFT_KEYS.every(k=>Object.hasOwn(o,k)&&(o[k]===null||typeof o[k]==='string'));
const read=storage=>Object.fromEntries(CRAFT_KEYS.map(k=>[k,storage.getItem(k)]));
const verified=(storage,k,value)=>{storage.setItem(k,value);if(storage.getItem(k)!==value)throw Error('Falha na gravação verificada');};
export function craftFence(farm,build,qty=1){
 if(!validNature(farm?.nature)||build?.version!==1||!count(build.stock)||!Number.isInteger(qty)||qty<1||qty>99||build.stock+qty>10000)return null;
 const wood=FENCE_RECIPE.wood*qty,stone=FENCE_RECIPE.stone*qty;if(farm.nature.wood<wood||farm.nature.stone<stone)return null;
 return {farm:{...farm,nature:{...farm.nature,wood:farm.nature.wood-wood,stone:farm.nature.stone-stone}},build:{...build,stock:build.stock+qty}};
}
function validateAfter(after){try{const f=JSON.parse(after[CRAFT_KEYS[0]]),b=JSON.parse(after[CRAFT_KEYS[1]]);return f?.schema===1&&validNature(f.nature)&&b?.version===1&&count(b.stock)&&b.stock<=10000;}catch{return false;}}
export function recoverCraft(storage){
 const raw=storage.getItem(CRAFT_JOURNAL);if(raw===null)return false;
 const j=JSON.parse(raw);if(j?.schema!==1||!validPair(j.before)||!validPair(j.after)||!validateAfter(j.after))throw Error('Transação de materiais inválida; saves preservados.');
 const current=read(storage);if(CRAFT_KEYS.some(k=>current[k]!==j.before[k]&&current[k]!==j.after[k]))throw Error('Conflito na transação de materiais; saves preservados.');
 for(const k of CRAFT_KEYS)if(current[k]!==j.after[k])verified(storage,k,j.after[k]);
 storage.removeItem(CRAFT_JOURNAL);if(storage.getItem(CRAFT_JOURNAL)!==null)throw Error('Transação pendente; reabra o jogo.');
 return true;
}
export function commitCraft(storage,farm,build,qty=1){
 const next=craftFence(farm,build,qty);if(!next)return {ok:false,pending:false,error:'Materiais insuficientes ou limite de estoque.'};
 try{
 if(storage.getItem(CRAFT_JOURNAL)!==null)return {ok:false,pending:true,error:'Transação pendente; reabra o jogo.'};
 const before=read(storage),after={[CRAFT_KEYS[0]]:JSON.stringify(next.farm),[CRAFT_KEYS[1]]:JSON.stringify(next.build)};
 if(!validateAfter(after))return {ok:false,pending:false,error:'Estado inválido.'};
 verified(storage,CRAFT_JOURNAL,JSON.stringify({schema:1,before,after}));
 recoverCraft(storage);
 return {ok:true,...next};
 }catch{let pending=true;try{pending=storage.getItem(CRAFT_JOURNAL)!==null;}catch{}return {ok:false,pending,error:pending?'Transação interrompida; reabra o jogo para recuperar os materiais.':'Falha ao gravar; materiais preservados.'};}
}
