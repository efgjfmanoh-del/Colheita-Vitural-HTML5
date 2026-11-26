// Engine-independent utility AI. Agents share a decision contract, not a species script.
export const clamp01=n=>Math.max(0,Math.min(1,n));
export const PROFILES=Object.freeze({
 dog:{curiosity:.75,social:.92,rest:.65,speed:1.65,thirstRate:.0011,hungerRate:.00075},
 cat:{curiosity:.95,social:.48,rest:.90,speed:1.4,thirstRate:.0009,hungerRate:.00065}
});
export class AgentBrain{
 constructor(profile,random=Math.random){this.profile=profile;this.random=random;this.time=0;this.goal=null;this.lastScores={};this.memory=new Map();}
 tick(dt){this.time+=Math.max(0,dt);}
 fail(goal){this.memory.set(goal,this.time+8);}
 choose(goals,perception){
  const candidates=goals.filter(g=>(this.memory.get(g.id)||0)<=this.time&&(!g.available||g.available(perception)));
  const scores=candidates.map(g=>({id:g.id,score:g.score(perception,this.profile)+this.random()*.035+(this.goal===g.id?.025:0)})).filter(g=>Number.isFinite(g.score));
  this.lastScores=Object.fromEntries(scores.map(g=>[g.id,g.score]));scores.sort((a,b)=>b.score-a.score);
  this.goal=scores[0]?.id??null;return this.goal;
 }
}
export function petGoals(){
 return [
  {id:'drink',available:p=>p.water>.03&&p.thirst>.25,score:p=>p.thirst*2.7+.10},
  {id:'eat',available:p=>p.food>.03&&p.hunger>.30,score:p=>p.hunger*2.4+.07},
  {id:'shelter',available:p=>!p.inShelter,score:(p,t)=>p.night?1.15+t.rest*.25:p.rain?.87+t.rest*.1:p.energy<.26?.85:.04},
  {id:'social',available:p=>!p.inShelter&&p.playerNear,score:(p,t)=>.18+t.social*.45+p.affinity*.22},
  {id:'explore',available:p=>!p.inShelter,score:(p,t)=>.24+t.curiosity*.39+p.energy*.1},
  {id:'rest',score:(p,t)=>.22+t.rest*.20+(1-p.energy)*.45+(p.inShelter&&p.night?.9:0)}
 ];
}
// A* uses a supplied habitat's topology. Land, water and air may provide distinct neighbours.
export function findRoute(start,goal,neighbors,distance,key,budget=2800){
 const target=key(goal),open=[{node:start,g:0,f:distance(start,goal),prev:null}],best=new Map([[key(start),0]]);
 for(let iter=0;open.length&&iter<budget;iter++){
  let i=0;for(let j=1;j<open.length;j++)if(open[j].f<open[i].f)i=j;
  const c=open.splice(i,1)[0],k=key(c.node);if(c.g!==best.get(k))continue;
  if(k===target){const route=[];for(let n=c;n;n=n.prev)route.unshift(n.node);return route;}
  for(const n of neighbors(c.node)){const nk=key(n),g=c.g+distance(c.node,n);if(g>=(best.get(nk)??Infinity))continue;best.set(nk,g);open.push({node:n,g,f:g+distance(n,goal),prev:c});}
 }return null;
}
