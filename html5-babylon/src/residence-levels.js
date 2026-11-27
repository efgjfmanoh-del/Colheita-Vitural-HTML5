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
export function stairHeight(p){const z=stairZone(p);return z==='first'?treadHeight(p.z):z==='landing'?LANDING_Y:z==='second'?treadHeight(p.x,2):null;}
export function residenceStep(from,to,y,w,d){
 const inside=p=>Math.abs(p.x)<=w/2-.42&&Math.abs(p.z)<=d/2-.42,zone=stairZone(from),dest=stairZone(to),on=!!zone&&y>s.ground+.10&&y<=UPPER_Y+.08,upper=!on&&inside(from)&&y>=UPPER_Y-.08,deny={blocked:true,height:y};
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
