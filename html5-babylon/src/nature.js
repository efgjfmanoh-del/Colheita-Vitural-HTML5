import {REAL_MS_PER_GAME_DAY} from './world-calendar.js';
export const RESOURCE_LABELS=Object.freeze({wood:'Madeira',stone:'Pedra',saplings:'Mudas'});
export const freshNature=()=>({schema:1,wood:0,stone:0,saplings:0,nodes:{}});
const count=n=>Number.isSafeInteger(n)&&n>=0;
export const validNodeId=(id,kind)=>kind==='tree'?/^forest (?:[0-9]|[1-3][0-9]|40)$/.test(id):kind==='stone'&&/^stone-[0-9]+$/.test(id);
export function validNature(n){
 return n?.schema===1&&['wood','stone','saplings'].every(k=>count(n[k]))&&n.nodes&&typeof n.nodes==='object'&&!Array.isArray(n.nodes)&&Object.keys(n.nodes).length<=100&&Object.entries(n.nodes).every(([id,s])=>s&&validNodeId(id,s.kind)&&Number.isInteger(s.hits)&&s.hits>=0&&s.hits<=3&&['ready','stump','growing','renewing'].includes(s.phase)&&count(s.at)&&((s.kind==='tree'&&['ready','stump','growing'].includes(s.phase))||(s.kind==='stone'&&['ready','renewing'].includes(s.phase)))&&(s.phase==='ready'?s.hits<3:s.hits===3));
}
export function natureStage(n,id,kind,now){
 const s=n.nodes[id];if(!s)return {kind,phase:'ready',hits:0,at:0,stage:3};
 if(s.phase==='ready')return {...s,stage:3};
 if(s.phase==='stump')return {...s,stage:0};
 const duration=(kind==='tree'?3:5)*REAL_MS_PER_GAME_DAY,f=Math.max(0,Math.min(1,(now-s.at)/duration));return {...s,stage:Math.min(3,Math.floor(f*3)),mature:f>=1};
}
export function natureAction(n,id,kind,action,now){
 if(!validNature(n)||!validNodeId(id,kind)||!count(now))return null;
 const s=natureStage(n,id,kind,now);if(s.kind!==kind)return null;
 const next=JSON.parse(JSON.stringify(n));
 if(action==='plant'){
  if(kind!=='tree'||s.phase!=='stump'||n.saplings<1)return null;
  next.saplings--;next.nodes[id]={kind,hits:3,phase:'growing',at:now};return {next,event:null};
 }
 if(action!=='strike'||(s.phase!=='ready'&&!s.mature))return null;
 const hits=s.mature?1:s.hits+1,done=hits===3;
 next.nodes[id]={kind,hits,phase:done?(kind==='tree'?'stump':'renewing'):'ready',at:now};
 if(done){if(kind==='tree'){next.wood+=4;next.saplings+=1;}else next.stone+=3;}
 if(!validNature(next))return null;
 return {next,event:done?(kind==='tree'?'chop':'mine'):null};
}

export const RESOURCE_PRICES=Object.freeze({wood:8,stone:10,saplings:6});
export function validResourceStock(s){return !!s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(RESOURCE_LABELS).every(k=>count(s[k]))&&Object.keys(s).length===3;}
export function resourceTrade(state,id,qty,write){
 if(!Object.hasOwn(RESOURCE_PRICES,id)||!validNature(state.nature)||!count(state.coins)||!Number.isInteger(qty)||qty<1||qty>999||state.nature[id]<qty)return {ok:false,error:'Quantidade indisponível.'};
 const next=JSON.parse(JSON.stringify(state)),total=RESOURCE_PRICES[id]*qty;next.nature[id]-=qty;next.coins+=total;if(!count(next.coins))return {ok:false,error:'Limite de saldo.'};
 try{write(JSON.stringify(next));}catch{return {ok:false,error:'Falha ao salvar; recursos preservados.'};}return {ok:true,next,total};
}
export function transferResources(state,id,direction,qty,write){
 if(!Object.hasOwn(RESOURCE_LABELS,id)||!validNature(state.nature)||!['deposit','withdraw'].includes(direction)||!Number.isInteger(qty)||qty<1||qty>999)return {ok:false,error:'Transferência inválida.'};
 const stock=state.warehouse?.resources??{wood:0,stone:0,saplings:0};if(!validResourceStock(stock))return {ok:false,error:'Estoque indisponível.'};
 const delta=direction==='deposit'?qty:-qty,bag=state.nature[id]-delta,held=stock[id]+delta;
 if(!count(bag)||!count(held))return {ok:false,error:'Quantidade indisponível.'};
 const next=JSON.parse(JSON.stringify(state));next.nature[id]=bag;next.warehouse??={};next.warehouse.resources={...stock,[id]:held};
 try{write(JSON.stringify(next));}catch{return {ok:false,error:'Falha ao salvar; recursos preservados.'};}return {ok:true,next};
}
