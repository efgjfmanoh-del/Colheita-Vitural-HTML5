import {gameHoursToRealMs} from './world-calendar.js';
export const FISH_COOLDOWN=gameHoursToRealMs(1),FISH_PRICE=18;
export const freshFishery=()=>({schema:1,fish:0,spots:{}});
const count=n=>Number.isSafeInteger(n)&&n>=0;
const validId=id=>typeof id==='string'&&/^river-fish-[0-9]+$/.test(id);
export function validFishery(s){return s?.schema===1&&count(s.fish)&&s.spots&&typeof s.spots==='object'&&!Array.isArray(s.spots)&&Object.keys(s.spots).length<=64&&Object.entries(s.spots).every(([k,v])=>validId(k)&&count(v));}
export function fishingReady(s,id,now){return validFishery(s)&&validId(id)&&count(now)&&(s.spots[id]===undefined||now>=s.spots[id]+FISH_COOLDOWN);}
export function landFish(s,id,now){if(!fishingReady(s,id,now)||!count(s.fish+1))return null;return {...s,fish:s.fish+1,spots:{...s.spots,[id]:now}};}
export function sellFish(state,qty,write){if(!validFishery(state.fishery)||!count(state.coins)||!Number.isInteger(qty)||qty<1||qty>999||state.fishery.fish<qty||!count(state.coins+qty*FISH_PRICE))return {ok:false,error:'Estoque indisponível.'};const next={...state,coins:state.coins+qty*FISH_PRICE,fishery:{...state.fishery,fish:state.fishery.fish-qty}};try{write(JSON.stringify(next));}catch{return {ok:false,error:'Falha ao salvar; estoque preservado.'};}return {ok:true,next};}
// Gameplay timers are independent of GPU frame delivery. The bite window
// begins only when the bite notification is actually dispatched to the UI.
export const CAST_WAIT_MS=2200,BITE_WINDOW_MS=5800;
export function createFishingTiming({schedule=setTimeout,cancel=clearTimeout,onPhase=()=>{}}={}){
 let phase='idle',timer=null,generation=0;
 const clear=()=>{generation++;if(timer!==null)cancel(timer);timer=null;};
 function stop(){clear();phase='idle';}
 function start(){
  if(phase!=='idle')return false;
  phase='waiting';const id=++generation;
  timer=schedule(()=>{
   if(id!==generation||phase!=='waiting')return;
   timer=null;phase='bite';onPhase(phase);
   if(id!==generation||phase!=='bite')return;
   timer=schedule(()=>{if(id!==generation||phase!=='bite')return;timer=null;phase='missed';onPhase(phase);},BITE_WINDOW_MS);
  },CAST_WAIT_MS);
  return true;
 }
 return {start,stop,get phase(){return phase;}};
}
