// Shared local-space geometry and traversal for the original house.
export const STAIR=Object.freeze({x:-2.5,half:.8,lo:-2.4,hi:2.4,steps:12,ground:.53,rise:.235,radius:.20});
export const UPPER_Y=STAIR.ground+STAIR.rise*STAIR.steps;
const inHole=p=>Math.abs(p.x-STAIR.x)<STAIR.half&&p.z>STAIR.lo&&p.z<STAIR.hi;
const inLane=p=>Math.abs(p.x-STAIR.x)<=STAIR.half-STAIR.radius+1e-6;
export function treadHeight(z){const t=(z-STAIR.lo)/(STAIR.hi-STAIR.lo);return STAIR.ground+STAIR.rise*Math.max(1,Math.min(STAIR.steps,Math.floor(t*STAIR.steps)+1));}
export function residenceStep(from,to,y,w,d){
 const s=STAIR,inside=p=>Math.abs(p.x)<=w/2-.42&&Math.abs(p.z)<=d/2-.42;
 const fromStair=inHole(from)&&y>s.ground+.10&&y<=UPPER_Y+.08;
 const upper=!fromStair&&inside(from)&&y>=UPPER_Y-.08;
 const toHole=inHole(to),deny={blocked:true,height:y};
 if(fromStair){
  if(!inLane(to))return deny;
  if(toHole)return {blocked:false,height:treadHeight(to.z)};
  if(to.z<=s.lo&&from.z<s.lo+.45)return {blocked:false,height:s.ground};
  if(to.z>=s.hi&&from.z>s.hi-.45&&inside(to))return {blocked:false,height:UPPER_Y};
  return deny;
 }
 if(upper){
  if(!inside(to))return deny;
  if(toHole)return from.z>=s.hi&&inLane(to)?{blocked:false,height:treadHeight(to.z)}:deny;
  return {blocked:false,height:UPPER_Y};
 }
 if(toHole)return from.z<=s.lo&&inLane(to)?{blocked:false,height:treadHeight(to.z)}:deny;
 return null;
}
