import {calendarAt,CROP_CALENDAR,cropSchedule,gameHoursToRealMs} from './world-calendar.js';
const clamp=(n,lo=0,hi=1)=>Math.min(hi,Math.max(lo,n));
export const WEATHER_INTERVAL=gameHoursToRealMs(6);
const hash=n=>{let x=(n+7919)|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
export function weatherAt(elapsed){
 const slot=Math.floor(Math.max(0,elapsed)/WEATHER_INTERVAL),c=calendarAt(slot*WEATHER_INTERVAL);
 const rainChance=[.36,.25,.15,.30][c.seasonIndex],r=slot===0? .95:hash(slot),kind=r<rainChance*.18?'storm':r<rainChance?'rain':r<rainChance+.25?'cloud':'sun';
 const temp=[28,20,16,24][c.seasonIndex]+Math.round((hash(slot+10000)-.5)*6)-(kind==='rain'||kind==='storm'?2:0);
 return {kind,temperature:temp,slot,rain:kind==='rain'||kind==='storm',label:{sun:'Sol',cloud:'Nublado',rain:'Chuva',storm:'Tempestade'}[kind]};
}
export const newSoil=at=>({at,moisture:.38,fertility:.78,pest:0,weeds:0,irrigated:false,lastCrop:null,progress:0});
export function validSoil(s){return !!s&&Number.isFinite(s.at)&&s.at>=0&&['moisture','fertility','pest','progress'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=1)&&(s.weeds===undefined||Number.isFinite(s.weeds)&&s.weeds>=0&&s.weeds<=1)&&typeof s.irrigated==='boolean'&&(s.lastCrop===null||Object.hasOwn(CROP_CALENDAR,s.lastCrop));}
export function simulatePlot(plot,elapsed,weather=weatherAt){
 if(!plot?.soil)return plot;
 const p={...plot,soil:{...plot.soil}},s=p.soil,crop=CROP_CALENDAR[p.crop||'wheat'],until=Math.max(s.at,elapsed);s.weeds=s.weeds??0;
 // At least 45% of nominal speed, no crop loss while offline. One-minute real steps;
 // bounded catch-up: after 48h every planted watered crop is mature.
 let at=Math.max(s.at,until-48*3600000);
 if(p.state==='watered'&&until-s.at>48*3600000)s.progress=1;
 while(at<until-1e-6){
  const step=Math.min(until-at,60000-at%60000,WEATHER_INTERVAL-at%WEATHER_INTERVAL),w=weather(at),hours=step/gameHoursToRealMs(1);
  s.moisture=clamp(s.moisture+(w.rain?.23:-(w.kind==='sun'?.08:.045))*hours);
  if(s.irrigated)s.moisture=Math.max(s.moisture,crop.moisture+.10);
  if(p.state!=='raw')s.weeds=clamp(s.weeds+(w.rain?.045:.025)*hours);
  if(p.state==='raw'||p.state==='tilled'){s.fertility=clamp(s.fertility+.018*hours);s.pest=clamp(s.pest-.06*hours);}
  if(p.state==='sown'&&(w.rain||s.irrigated)&&s.moisture>=Math.min(.65,crop.moisture)){p.state='watered';p.wateredAt=p.wateredAt??at;}
  if(p.state==='watered'&&s.progress<1){
   const temp=clamp(1-Math.max(0,Math.abs(w.temperature-crop.temperature)-5)*.035,.65,1);
   const moist=clamp(1-Math.max(0,crop.moisture-.20-s.moisture)*1.1-Math.max(0,s.moisture-(p.crop==='rice'?1:.96))*1.5,.65,1);
   const fertile=clamp(.65+s.fertility*.55,.65,1);
   s.pest=clamp(s.pest+(s.moisture>.80?.032:.006)*hours);
   const rate=Math.max(.45,temp*moist*fertile*(1-.20*s.pest)*(1-.16*s.weeds));
   s.progress=clamp(s.progress+step/(p.durationMs||cropSchedule(p.crop||'wheat',calendarAt(at).month).realMs)*rate);
  }
  at+=step;
  // No repeated processing of a long offline interval for a fully mature crop.
  if(p.state==='watered'&&s.progress>=1&&until-at>gameHoursToRealMs(12)){at=until-gameHoursToRealMs(12);}
 }
 s.at=until;return p;
}
export function harvestInfo(plot){
 const c=CROP_CALENDAR[plot.crop||'wheat'],s=plot.soil||newSoil(0);
 return {units:Math.max(1,c.yield+(s.fertility>=.90?1:0)-(s.pest>.70?1:0)),quality:s.fertility>=.85&&s.pest<.35?'Especial':s.fertility<.45||s.pest>.70?'Comum':'Boa'};
}
export function prepareSpecies(plot,id,elapsed){
 const p=simulatePlot(plot,elapsed),soil={...p.soil,progress:0};
 if(soil.lastCrop&&soil.lastCrop!==id)soil.fertility=clamp(soil.fertility+.12);
 const schedule=cropSchedule(id,calendarAt(elapsed).month);
 return {...p,crop:id,state:'sown',durationMs:schedule.realMs,soil};
}

// Advisory only: estimates use the same temperature penalty and calendar as cultivation.
// No fictional lunar/day bonuses or additional fertilizer recipes.
export function cropAdvice(id,elapsed){
 const crop=CROP_CALENDAR[id],c=calendarAt(elapsed),schedule=cropSchedule(id,c.month);
 const days=Array.from({length:7},(_,i)=>{
  const at=elapsed+i*gameHoursToRealMs(24),date=calendarAt(at),sc=cropSchedule(id,date.month);
  const forecast=Array.from({length:4},(_,j)=>weatherAt(at+j*WEATHER_INTERVAL));
  const temperature=Math.round(forecast.reduce((n,w)=>n+w.temperature,0)/4);
  const storm=forecast.some(w=>w.kind==='storm'),rain=forecast.filter(w=>w.rain).length;
  const rate=forecast.reduce((n,w)=>n+clamp(1-Math.max(0,Math.abs(w.temperature-crop.temperature)-5)*.035,.65,1),0)/4;
  const score=rate/(sc.preferred?1:crop.offSeasonMultiplier);
  const label=!sc.preferred?'Fora de época':storm?'Atenção à chuva forte':rate<.95?'Temperatura menos favorável':'Favorável';
  return {date,temperature,storm,rain,score,label,preferred:sc.preferred};
 });
 return {id,crop,schedule,days,best:days.slice().sort((a,b)=>b.score-a.score||a.date.absoluteDay-b.date.absoluteDay)[0]};
}

// Shared offline wind field. North is +Z; east is +X. The vector points
// where air travels, while the vane's arrow points into the wind.
export function windAt(elapsed,kind=weatherAt(elapsed).kind){
 const hour=Math.max(0,elapsed)/gameHoursToRealMs(1),slot=Math.floor(hour/3),u=hour/3-slot,mix=u*u*(3-2*u);
 const a=hash(slot+44000)*Math.PI*2,b=hash(slot+44001)*Math.PI*2,angle=a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*mix;
 const speed=({sun:1.5,cloud:2.8,rain:4.6,storm:9.5})[kind]??1.5;
 const gust=.78+.28*(.5+.5*Math.sin(hour*2.4))+.15*(.5+.5*Math.sin(hour*7.7));
 return {angle,speed:speed*gust,x:Math.sin(angle)*speed*gust,z:Math.cos(angle)*speed*gust};
}
