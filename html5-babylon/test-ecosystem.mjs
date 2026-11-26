import assert from 'node:assert/strict';
import {AgentBrain,PROFILES,petGoals,findRoute,careGoals,CARE_POLICY} from './src/ecosystem-ai.js';
const b=new AgentBrain(PROFILES.dog,()=>0),goals=petGoals(),p={food:1,water:1,hunger:.1,thirst:.1,energy:.8,night:false,rain:false,inShelter:false,playerNear:false,affinity:0};
assert.equal(b.choose(goals,{...p,thirst:.9}),'drink');
assert.equal(b.choose(goals,{...p,hunger:.9}),'eat');
assert.equal(b.choose(goals,{...p,night:true}),'shelter');
b.fail('shelter');assert.notEqual(b.choose(goals,{...p,night:true}),'shelter');b.tick(9);assert.equal(b.choose(goals,{...p,night:true}),'shelter');
assert.equal(b.choose(goals,{...p,night:true,inShelter:true}),'rest');
const key=n=>n.join(','),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),neighbors=([x,z])=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([x,z])=>x>=0&&z>=0&&x<=4&&z<=4&&!(x===2&&z<4));
const route=findRoute([0,0],[4,0],neighbors,dist,key);
assert(route&&route.some(p=>p[0]===2&&p[1]===4));assert(!route.some(p=>p[0]===2&&p[1]<4));console.log('PASS utility AI needs, weather, memory and obstacle planning');

// Exact preventive boundary and priority even during rain, sleep or social activity.
assert.equal(CARE_POLICY.returnAt,.30);
for(const profile of Object.values(PROFILES)){
 const a=new AgentBrain(profile,()=>0);
 const context={...p,night:true,rain:true,inShelter:true,playerNear:true,affinity:1,energy:.1};
 assert.equal(careGoals({...context,hunger:.299,thirst:.299}).length,0);
 assert.equal(a.choose(goals,{...context,hunger:.30}),'eat');
 assert.equal(a.choose(goals,{...context,thirst:.30}),'drink');
 assert.equal(a.choose(goals,{...context,hunger:.70,thirst:.31}),'eat');
 assert.equal(a.choose(goals,{...context,hunger:.31,thirst:.70}),'drink');
 assert.equal(careGoals({...context,hunger:.95,food:0}).length,0);
 assert.equal(a.choose(goals,{...context,hunger:.95,food:0,thirst:.30}),'drink');
}
console.log('PASS preventive care at 70% satisfaction, urgent priority and empty supply');
