import {calendarAt,REAL_MS_PER_GAME_MINUTE as MINUTE} from './world-calendar.js';
export const ROOM_COUNT=24;
export const roomGender=slot=>slot<12?'male':'female';
export function assignRooms(items){const used=new Set(),out=[];for(const w of items){let slot=w.room;if(!Number.isInteger(slot)||slot<0||slot>=24||used.has(slot)){const start=w.id%2?12:0;slot=Array.from({length:24},(_,i)=>(start+i)%24).find(i=>!used.has(i));}if(slot===undefined)throw Error('no free room');used.add(slot);out.push({...w,room:slot});}return out;}
export const KITNET={w:26.4,d:13.2,h:2.85,corridor:2.2,pitch:4.4,depth:5.5};
export function roomPlan(slot){if(!Number.isInteger(slot)||slot<0||slot>=24)return null;const i=slot%12,side=i<6?-1:1;return {slot,floor:Math.floor(slot/12),gender:roomGender(slot),x:-11+(i%6)*4.4,z:side*3.85,side};}
// All footprints in metres from room centre/entrance, used by render and collision.
export const KIT_FIXTURES=Object.freeze([
 {id:'bed',x:-1.38,v:3.94,w:1.12,d:2.05},{id:'wardrobe',x:-1.71,v:2.0,w:.66,d:.88},{id:'stove',x:-1.57,v:.57,w:.77,d:.69},{id:'fridge',x:-1.57,v:1.24,w:.77,d:.62},{id:'table',x:1.53,v:1.94,w:.75,d:.85},{id:'planter',x:1.68,v:.53,w:.48,d:.48},{id:'toilet',x:1.60,v:4.04,w:.62,d:.66},{id:'sink',x:.58,v:4.88,w:.58,d:.48},{id:'shower',x:1.65,v:5.04,w:.76,d:.75},
 {id:'bath-wall-side',x:.05,v:4.35,w:.13,d:2.30},{id:'bath-wall-left',x:.28,v:3.20,w:.59,d:.12},{id:'bath-wall-right',x:1.86,v:3.20,w:.69,d:.12}
]);
export const KIT_STANDS=Object.freeze({sleep:{x:-.43,v:3.94},eat:{x:-.66,v:.65},drink:{x:-.66,v:1.25},toilet:{x:1.05,v:4.04},plant:{x:.93,v:.53}});
export const kitBlocked=(x,v,r=.20)=>KIT_FIXTURES.some(f=>Math.abs(x-f.x)<f.w/2+r&&Math.abs(v-f.v)<f.d/2+r);
export function kitPath(goal){const p=KIT_STANDS[goal];if(!p)return [];const entry={x:0,v:.30};if(goal==='toilet')return [entry,{x:.85,v:2.65},{x:.85,v:3.50},p];if(goal==='sleep')return [entry,{x:-.43,v:2.8},p];return [entry,p];}
const clamp=n=>Math.max(0,Math.min(1,n));
export const freshLife=now=>({at:Math.floor(now),hunger:.10,thirst:.10,bladder:.05,energy:.9,goal:'work'});
export const validLife=s=>s&&Number.isSafeInteger(s.at)&&s.at>=0&&['hunger','thirst','bladder','energy'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=1)&&['work','sleep','eat','drink','toilet','idle'].includes(s.goal);
export function lifeGoal(l,now,paid=true){const h=calendarAt(now).hour;if(l.thirst>=.72)return 'drink';if(l.bladder>=.78)return 'toilet';if(l.hunger>=.78)return 'eat';if(h>=20||h<6||l.energy<.15)return 'sleep';if(l.thirst>=.45)return 'drink';if(l.bladder>=.5)return 'toilet';if(l.hunger>=.48)return 'eat';return paid?'work':'idle';}
export function advanceLife(raw,now,paid=true,arrived=null){const l=validLife(raw)?{...raw}:freshLife(now),hours=Math.min(24,Math.max(0,now-l.at)/(60*MINUTE));l.at=Math.max(l.at,Math.floor(now));l.hunger=clamp(l.hunger+hours*.055);l.thirst=clamp(l.thirst+hours*.082);l.bladder=clamp(l.bladder+hours*.046);l.energy=clamp(l.energy-hours*.055);if(arrived==='sleep'&&l.goal==='sleep')l.energy=clamp(l.energy+hours*.25);if(arrived==='eat'&&l.goal==='eat')l.hunger=.06;if(arrived==='drink'&&l.goal==='drink'){l.thirst=.04;l.bladder=clamp(l.bladder+.12);}if(arrived==='toilet'&&l.goal==='toilet')l.bladder=.03;l.goal=lifeGoal(l,now,paid);return l;}
export function workAllowed(l,now){const h=calendarAt(now).hour;return h>=6&&h<20&&(!l||l.goal==='work');}
export function humanGait(g,distance,dt,speedBlend=0){g.distance=(g.distance||0)+distance;g.moving=distance>1e-4;g.phase=((g.phase||0)+distance*2*Math.PI/1.45)%(Math.PI*2);const target=Math.min(1,distance/Math.max(.001,dt)/3.5);g.stride=(g.stride||0)+(target-(g.stride||0))*(1-Math.exp(-dt*18));if(g.stride<.003)g.stride=0;const swing=Math.sin(g.phase)*g.stride;return {angles:[1,2,3,4].map(i=>swing*(i<=2?.53+.24*speedBlend:.39+.27*speedBlend)*(i===1||i===4?1:-1)),bob:Math.abs(Math.sin(g.phase))*g.stride*.045};}
