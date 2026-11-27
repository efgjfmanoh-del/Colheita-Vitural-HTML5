// Quarter-turn stair: shared geometry, traversal and physical rails.
export const STAIR=Object.freeze({x:-3.1,half:.8,lo:-1.5,turn:.9,mid:1.7,exit:.1,steps:6,ground:.53,rise:.235,radius:.20});
const s=STAIR,L=s.x-s.half,R=s.x+s.half,Z=s.mid+s.half;
export const LANDING_Y=s.ground+s.steps*s.rise,UPPER_Y=LANDING_Y+s.steps*s.rise;
const e=1e-7,between=(v,a,b)=>v>=a-e&&v<=b+e;
export const STAIR_HOLES=Object.freeze([[L,R,s.lo,Z],[R,s.exit,s.turn,Z]]);
const rect=(p,a,b,c,d)=>between(p.x,a,b)&&between(p.z,c,d);
export const stairZone=p=>rect(p,L,R,s.lo,s.turn)&&p.z<s.turn-e?'first':rect(p,L,R,s.turn,Z)?'landing':rect(p,R,s.exit,s.turn,Z)&&p.x<s.exit-e?'second':null;
const lane=p=>rect(p,L+s.radius,R-s.radius,s.lo,s.turn)||rect(p,L+s.radius,R,s.turn,Z-s.radius)||rect(p,R-s.radius,s.exit,s.turn+s.radius,Z-s.radius);
export function treadHeight(v,flight=1){const start=flight===1?s.lo:R,base=flight===1?s.ground:LANDING_Y;return base+s.rise*Math.max(1,Math.min(s.steps,Math.floor((v-start)/.4)+1));}
// Smooth step-offset support, independent of frame rate, using the same rise/run as the physical treads.
export function walkHeight(v,flight=1){const start=flight===1?s.lo:R,base=flight===1?s.ground:LANDING_Y,t=Math.max(0,Math.min(s.steps,(v-start)/.4)),k=Math.floor(t),u=t-k;return base+s.rise*(k+u*u*(3-2*u));}
export function stairHeight(p){const z=stairZone(p);return z==='first'?walkHeight(p.z):z==='landing'?LANDING_Y:z==='second'?walkHeight(p.x,2):null;}
export function residenceStep(from,to,y,w,d){
 const inside=p=>Math.abs(p.x)<=w/2-.42&&Math.abs(p.z)<=d/2-.42,zone=stairZone(from),dest=stairZone(to),on=!!zone&&Math.abs(y-stairHeight(from))<=.04,upper=!on&&inside(from)&&y>=UPPER_Y-.08,deny={blocked:true,height:y};
 const groundGate=p=>p.z<=s.lo+e&&Math.abs(p.x-s.x)<=s.half-s.radius+e;
 const upperGate=p=>p.x>=s.exit-e&&Math.abs(p.z-s.mid)<=s.half-s.radius+e;
 if(on){
  if(dest){if(!lane(to)||Math.abs(stairHeight(to)-y)>s.rise+.001)return deny;return {blocked:false,height:stairHeight(to)};}
  if(zone==='first'&&from.z<s.lo+.45&&groundGate(to))return {blocked:false,height:s.ground};
  if(zone==='second'&&from.x>s.exit-.45&&upperGate(to)&&inside(to))return {blocked:false,height:UPPER_Y};
  return deny;
 }
 if(upper){if(!inside(to))return deny;if(dest)return upperGate(from)&&dest==='second'&&lane(to)&&Math.abs(stairHeight(to)-y)<=s.rise+.001?{blocked:false,height:stairHeight(to)}:deny;return {blocked:false,height:UPPER_Y};}
 if(dest)return groundGate(from)&&dest==='first'&&lane(to)&&Math.abs(stairHeight(to)-s.ground)<=s.rise+.001?{blocked:false,height:stairHeight(to)}:deny;
 return null;
}
export const STAIR_RAILS=Object.freeze([
 [[L+.04,s.ground+1.05,s.lo],[L+.04,LANDING_Y+1.05,s.turn]],
 [[R-.04,s.ground+1.05,s.lo],[R-.04,LANDING_Y+1.05,s.turn]],
 [[L+.04,LANDING_Y+1.05,s.turn],[L+.04,LANDING_Y+1.05,Z-.04]],
 [[L+.04,LANDING_Y+1.05,Z-.04],[R,LANDING_Y+1.05,Z-.04]],
 [[R,LANDING_Y+1.05,Z-.04],[s.exit,UPPER_Y+1.05,Z-.04]],
 [[R,LANDING_Y+1.05,s.turn+.04],[s.exit,UPPER_Y+1.05,s.turn+.04]]
]);
export function railTargets(p){return STAIR_RAILS.map(([a,b])=>{const dx=b[0]-a[0],dz=b[2]-a[2],u=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[2])*dz)/(dx*dx+dz*dz)));return {x:a[0]+u*dx,y:a[1]+u*(b[1]-a[1]),z:a[2]+u*dz};});}

// The living room fronts the house; kitchen is behind it on the right.
// The west circulation hall stays open to the L staircase.
export const GROUND_DIVIDER=Object.freeze({z:.85,thickness:.18,from:.95,to:7.03,doorLeft:3.65,doorRight:5.35,height:2.82,doorHeight:2.25});
export function groundWallSegments(){const d=GROUND_DIVIDER;return [[d.from,d.doorLeft],[d.doorRight,d.to]];}
export function groundDividerBlocked(p,radius=.20){const d=GROUND_DIVIDER;if(Math.abs(p.z-d.z)>=d.thickness/2+radius)return false;return groundWallSegments().some(([a,b])=>p.x>a-radius&&p.x<b+radius);}

// Upper rooms share a wall with a central hall. Keep the stair opening and front approach free.
export const UPPER_WALLS=Object.freeze([{axis:'z',fixed:3.2,from:-4.28,to:-2.8},{axis:'z',fixed:3.2,from:-1.4,to:2},{axis:'z',fixed:3.2,from:3.4,to:4.28},{axis:'x',fixed:.65,from:3.2,to:7.03}]);
export const INTERIOR_DOORS=Object.freeze([{id:'kitchen-door',label:'Porta da cozinha',floor:1,axis:'x',fixed:GROUND_DIVIDER.z,from:3.65,to:5.35},{id:'bath-door',label:'Porta do banheiro',floor:2,axis:'z',fixed:3.2,from:-2.8,to:-1.4},{id:'bed-door',label:'Porta do quarto',floor:2,axis:'z',fixed:3.2,from:2,to:3.4}]);
export function wallSegmentBlocked(p,w,r=.2){const along=w.axis==='x'?p.x:p.z,cross=w.axis==='x'?p.z:p.x;return Math.abs(cross-w.fixed)<.09+r&&along>w.from-r&&along<w.to+r;}
export function upperWallBlocked(p,r=.2){return UPPER_WALLS.some(w=>wallSegmentBlocked(p,w,r));}
// Sliding leaf travels along the wall, retaining its own physical collision at every position.
export function doorLeaf(d,open){const shift=(d.to-d.from)*Math.max(0,Math.min(1,open));const direction=d.id==='kitchen-door'||d.id==='bed-door'?-1:1;return {...d,from:d.from+direction*shift,to:d.to+direction*shift,fixed:d.fixed+.13};}
export function doorLeafBlocked(p,d,open,r=.2){return wallSegmentBlocked(p,doorLeaf(d,open),r);}
export function fixtureBlocked(p,f,r=.18){return Math.abs(p.x-f.x)<f.hx+r&&Math.abs(p.z-f.z)<f.hz+r;}

// Recessed upper veranda: inside the original roof footprint, with a real façade opening.
export const BALCONY=Object.freeze({half:2.8,front:-4.39,back:-2.25,railZ:-4.12,railHeight:1.05,openingHeight:2.35,planters:[{id:'upper-ceramic',type:'ceramic',x:-1.95,z:-3.75,floor:2},{id:'upper-wooden',type:'wooden',x:1.85,z:-3.75,floor:2}]});
export function balconyRailBlocked(p,r=.2){return Math.abs(p.z-BALCONY.railZ)<.065+r&&Math.abs(p.x)<BALCONY.half+r;}
export function gardenGrowth(crop,now,needsWater=false,duration=90000){if(!crop||!Number.isFinite(now)||!Number.isFinite(duration)||duration<=0)return 0;const start=needsWater?crop.wateredAt:crop.plantedAt;if(!Number.isFinite(start)||start<0||start<crop.plantedAt)return 0;return Math.max(0,Math.min(1,(now-start)/duration));}
export function waterGardenCrop(crop,now){if(!crop||!Number.isFinite(now)||now<crop.plantedAt||Number.isFinite(crop.wateredAt))return null;return {...crop,wateredAt:now};}
