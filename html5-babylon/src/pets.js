import {AgentBrain,PROFILES,petGoals,findRoute,clamp01,CARE_POLICY,careGoals} from './ecosystem-ai.js';
export function createPets(api){
 const {V,Mesh,MeshBuilder,scene,entity,own,box,sphere,cyl,mat,M,home,dogHome,porchFixtures,fencePoints,blocked,surfaceHeight,homeLocal,angleDelta,avatar,weather,doorState,ui,cancelInput}=api;
 const SAVE='cv.pets.v1',defaults=()=>({name:'',food:1,water:1,hunger:.28,thirst:.35,affinity:0,energy:.8});
 let data={dog:defaults(),cat:defaults()},error='',seed=9213,selected=null,uiClock=0,saveClock=0;
 const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 try{const raw=JSON.parse(localStorage.getItem(SAVE)||'null');if(raw){const next={};for(const id of ['dog','cat']){const d={...defaults(),...raw[id]};if(!raw[id]||typeof d.name!=='string'||d.name.length>24||!['food','water','hunger','thirst','affinity','energy'].every(k=>Number.isFinite(d[k])&&d[k]>=0&&d[k]<=1))throw Error('invalid pet save');next[id]=d;}data=next;}}catch{error='Dados dos pets indisponíveis; save protegido.';}
 function save(){if(error)return false;try{localStorage.setItem(SAVE,JSON.stringify(data));return true;}catch{error='Falha ao salvar os pets.';return false;}}
 const dogCoat=mat('dog caramel','#ba713c'),dogLight=mat('dog cream','#f1dcb9'),catCoat=mat('cat grey tabby','#92908a'),catLight=mat('cat cream','#e8dcc6'),stripe=mat('cat charcoal','#50514e'),nose=mat('cat nose','#b77a76'),ceramic=mat('pet ceramic','#4b7990'),waterMat=mat('pet water','#78b5c5',.18),foodMat=mat('pet kibble','#8e5934'),cushion=mat('cat cushion','#a76f4b');
 const f=-home.d/2;
 // Replace the former left bench; opening faces the front of the veranda.
 entity('cat shelter');const catHome={x:-2.45,z:f-.66,hx:.62,hz:.51};
 const catAt=(x,y,z)=>home.C(catHome.x+x,.53+y,catHome.z+z);
 const cb=(n,x,y,z,w,h,d,m)=>{const p=catAt(x,y,z);return box(n,p.x,p.y,p.z,w,h,d,m,home.angle);};
 cb('cat shelter floor',0,.055,0,1.24,.11,1.02,M.woodLight);cb('cat shelter rear',0,.45,.47,1.24,.80,.08,M.wood);
 for(const k of [-1,1])cb('cat shelter wall',k*.58,.45,0,.08,.80,1.02,M.woodLight);
 cb('cat shelter lintel',0,.76,-.47,1.24,.18,.08,M.wood);
 for(const k of [-1,1])cb('cat shelter front jamb',k*.49,.42,-.47,.22,.64,.08,M.wood);
 cb('cat shelter roof',0,.94,0,1.38,.16,1.17,M.roof);cb('cat cushion',0,.14,.04,.90,.08,.76,cushion);
 // Cloth curtains are articulated at their top, not solid wooden doors.
 const cloth=mat('warm canvas pet curtain','#b7a27b');cloth.alpha=.93;
 function curtain(id,pos,angle,w,h){
  entity(id+' curtain');const hinge=new Mesh(id+' curtain hinge',scene);hinge.position.copyFrom(pos);hinge.rotation.y=angle;
  const strips=[];for(let i=0;i<3;i++){const strip=new Mesh(id+' cloth joint '+i,scene);strip.parent=hinge;strip.position.x=(i-1)*w/3;
   const mesh=box(id+' hanging cloth '+i,0,-h/2,0,w/3-.025,h,.025,cloth,0,false);mesh.parent=strip;strips.push(strip);}
  return {hinge,strips};
 }
 const dogCurtain=curtain('dog',dogHome.C(0,1.80,-dogHome.d/2-.08),dogHome.angle,1.35,.88);
 const catCurtain=curtain('cat',catAt(0,.67,-.51),home.angle,.72,.53);
 porchFixtures.push({kind:'cat shelter',...catHome});
 function rig(id,coat,light,cat){
  entity(id);const s=cat?.70:1,root=new Mesh(id+' root',scene),body=new Mesh(id+' torso pivot',scene);body.parent=root;
  const pivot=(n,x,y,z,parent=body)=>{const m=new Mesh(id+' '+n,scene);m.parent=parent;m.position.set(x*s,y*s,z*s);return m;};
  const part=(n,x,y,z,rx,ry,rz,m,parent=body,cast=false)=>{const p=sphere(id+' '+n,x*s,y*s,z*s,rx*s,ry*s,rz*s,m,cast);p.parent=parent;return p;};
  part('body',0,.42,.04,.33,.27,.53,coat,body,true);part('chest',0,.43,-.33,.25,.27,.23,light);
  const head=pivot('neck',0,.55,-.39);
  part('head',0,.15,-.09,.27,.25,.27,coat,head);part('muzzle',0,.03,-.28,.18,.11,.14,light,head);part('nose',0,.08,-.40,.07,.05,.06,cat?nose:M.black,head);
  const ears=[];for(const k of [-1,1]){
   const e=pivot('ear '+k,k*.20,.28,-.04,head);ears.push(e);
   if(cat){const tip=MeshBuilder.CreateCylinder(id+' pointed ear',{diameterTop:0,diameterBottom:.23*s,height:.26*s,tessellation:3},scene);tip.position.y=.09*s;tip.rotation.z=-k*.15;own(tip,coat,false);tip.parent=e;}
   else part('floppy ear',0,-.11,0,.10,.23,.13,M.woodDark,e);
   part('eye',k*.12,.20,-.27,.04,.045,.035,M.black,head);
   if(cat)for(const j of [-1,0,1]){const whisker=box(id+' whisker',k*.22*s,(.06+j*.028)*s,-.27*s,.23*s,.012*s,.012*s,catLight,0,false);whisker.rotation.z=k*j*.12;whisker.parent=head;}
  }
  const legs=[];for(const k of [-1,1])for(const j of [-1,1]){
   const hip=pivot('hip '+k+' '+j,k*.19,.32,j*.30);part('upper leg',0,-.10,0,.09,.16,.105,coat,hip);
   const knee=pivot('knee',0,-.20,0,hip);part('paw',0,-.075,-.045,.105,.08,.13,light,knee);legs.push({hip,knee,phase:k===j?0:Math.PI});
  }
  const tail=pivot('tail',0,.48,.46);part('tail base',0,.10,.14,.075,.13,.22,coat,tail);const tip=pivot('tail tip',0,.14,.30,tail);part('tail end',0,.10,.12,.065,.16,.15,cat?stripe:coat,tip);
  return {root,body,head,ears,legs,tail,tip,s};
 }
 function point(x,z){return V(x,surfaceHeight(x,z),z);}
 function bowl(id,p,drink){
  entity('pet bowls');const r=id==='dog'?.25:.18;
  cyl(id+' ceramic bowl',p.x,p.y+.065,p.z,r,.13,ceramic,r*1.12,false);
  const rim=MeshBuilder.CreateTorus(id+' rim',{diameter:r*2.05,thickness:.035,tessellation:16},scene);rim.position=V(p.x,p.y+.135,p.z);own(rim,ceramic,false);
  const contents=cyl(id+(drink?' water':' food'),p.x,p.y+.11,p.z,r*.85,.018,drink?waterMat:foodMat,r*.85,false);
  const pieces=[];if(!drink)for(let i=0;i<7;i++){const a=i*2.4;pieces.push(sphere(id+' kibble',p.x+Math.cos(a)*r*.48,p.y+.13,p.z+Math.sin(a)*r*.48,.042,.027,.04,foodMat,false));}
  return {point:p,contents,pieces};
 }
 function inside(x,z){let hit=false;for(let i=0,j=fencePoints.length-1;i<fencePoints.length;j=i++){const a=fencePoints[i],b=fencePoints[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)hit=!hit;}return hit;}
 function valid(x,z){const l=homeLocal(x,z);return inside(x,z)&&!(Math.abs(l.x)<home.w/2&&Math.abs(l.z)<home.d/2)&&!blocked(x,z);}
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 // Cooperative route search: yield during line checks and every graph expansion.
 function* segmentSteps(a,b){
  const n=Math.max(1,Math.ceil(dist(a,b)/.045));let y=surfaceHeight(a.x,a.z);
  for(let i=1;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,h=surfaceHeight(x,z);if(!valid(x,z)||Math.abs(h-y)>.34)return false;y=h;if(i%8===0)yield;}return true;
 }
 const grid=.32;
 function* routeSteps(a,b){
  if(!valid(b.x,b.z))return null;
  if(yield* segmentSteps(a,b))return [b.clone()];
  const cache=new Map(),edges=new Map(),key=n=>n.i+':'+n.j,at=(i,j)=>{const k=i+':'+j;if(!cache.has(k))cache.set(k,valid(i*grid,j*grid)?{i,j,p:point(i*grid,j*grid)}:null);return cache.get(k);};
  function* snap(p){let best=null,dd=Infinity;const i=Math.round(p.x/grid),j=Math.round(p.z/grid);for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const n=at(i+x,j+z);if(n&&dist(p,n.p)<dd&&(yield* segmentSteps(p,n.p))){best=n;dd=dist(p,n.p);}yield;}return best;}
  const start=yield* snap(a),goal=yield* snap(b);if(!start||!goal)return null;
  const goalKey=key(goal),open=[{node:start,g:0,f:dist(start.p,goal.p),prev:null}],best=new Map([[key(start),0]]);let end=null;
  for(let iter=0;open.length&&iter<2800;iter++){
   let i=0;for(let j=1;j<open.length;j++)if(open[j].f<open[i].f)i=j;
   const c=open.splice(i,1)[0],k=key(c.node);if(c.g!==best.get(k)){yield;continue;}if(k===goalKey){end=c;break;}
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const q=at(c.node.i+di,c.node.j+dj);if(!q){yield;continue;}const nk=key(q),g=c.g+dist(c.node.p,q.p);if(g>=(best.get(nk)??Infinity)){yield;continue;}
    const ek=k<nk?k+'|'+nk:nk+'|'+k;
    if(!edges.has(ek))edges.set(ek,yield* segmentSteps(c.node.p,q.p));
    if(edges.get(ek)){best.set(nk,g);open.push({node:q,g,f:g+dist(q.p,goal.p),prev:c});}yield;
   }
  }
  if(!end)return null;const raw=[b.clone()];for(let n=end;n;n=n.prev)raw.unshift(n.node.p);
  const out=[];let last=a;
  for(let i=0;i<raw.length;){let j=raw.length-1;while(j>i&&!(yield* segmentSteps(last,raw[j]))){j--;yield;}out.push(raw[j].clone());last=raw[j];i=j+1;yield;}return out;
 }
 function route(a,b){const gen=routeSteps(a,b);let n;do{n=gen.next();}while(!n.done);return n.value;}
 function safe(origin,offsets){for(const [x,z] of offsets){const p=point(origin.x+x,origin.z+z);if(valid(p.x,p.z))return p;}return origin.clone();}
 const dogOut0=dogHome.C(0,0,-dogHome.d/2-1.12),dogOut=safe(dogOut0,[[0,0],[-.2,-.4],[.2,-.5],[0,-1]]);
 const catOut0=catAt(0,0,-.99),catOut=safe(catOut0,[[0,0],[0,-.15],[.15,-.12]]);
 const dp1=safe(dogOut,[[-1.05,-.35],[1.1,-.2],[0,-1.25]]),dp2=safe(dogOut,[[1.1,-.35],[-1.25,-.7],[0,-1.7]]);
 const cp1=home.C(-3.62,.53,f-1.18),cp2=home.C(-1.30,.53,f-1.18);
 const pets=[
  {id:'dog',label:'Cachorro',rig:rig('dog',dogCoat,dogLight,false),out:dogOut,curtain:dogCurtain,threshold:dogHome.C(0,.51,-dogHome.d/2+.02),bed:dogHome.C(0,.51,.42),food:bowl('dog',dp2,false),water:bowl('dog',dp1,true)},
  {id:'cat',label:'Gato',rig:rig('cat',catCoat,catLight,true),out:catOut,curtain:catCurtain,threshold:catAt(0,.11,-.49),bed:catAt(0,.18,.12),food:bowl('cat',point(cp2.x,cp2.z),false),water:bowl('cat',point(cp1.x,cp1.z),true)}
 ];
 const stats={decisions:0,paths:0,failed:0,arrivals:0,distance:0,care:0,completedInteractions:0,cancelledInteractions:0,toyTravel:0,handContacts:0,routeSlices:0,routeMaxSliceMs:0,routeOverBudget:0,routeCompleted:0},goals=petGoals();
 function state(p,s,t){p.state=s;p.timer=t;}
 function* routeCandidates(origin,targets){for(const target of targets){const path=yield* routeSteps(origin,target);if(path)return path;yield;}return null;}
 function plan(p,target,after,homeward=false){
  const candidates=Array.isArray(target)?target:[target];if(!candidates.length)return false;
  p.path=[];p.pending=routeCandidates(p.rig.root.position.clone(),candidates);p.routeGoal=p.brain.goal;
  if(homeward)p.path.push({v:p.threshold.clone(),private:true},{v:p.bed.clone(),private:true});
  p.after=after;state(p,'walk',0);return true;
 }
 let routeCursor=0;
 function pumpRoutes(budgetMs=2){
  const start=performance.now();let steps=0;
  while(steps<96&&performance.now()-start<budgetMs){
   const p=pets[routeCursor++%pets.length];if(!pets.some(q=>q.pending&&q.state==='walk'))break;
   if(!p.pending||p.state!=='walk'){steps++;continue;}
   const n=p.pending.next();steps++;if(!n.done)continue;
   p.pending=null;stats.routeCompleted++;
   if(n.value){p.path=n.value.map(v=>({v,private:false})).concat(p.path);stats.paths++;}
   else{stats.failed++;p.brain.fail(p.routeGoal);p.path=[];state(p,'idle',2);}
  }
  if(steps){const ms=performance.now()-start;stats.routeSlices++;stats.routeMaxSliceMs=Math.max(stats.routeMaxSliceMs,ms);if(ms>budgetMs+1)stats.routeOverBudget++;}
 }
 function leave(p){p.pending=null;p.path=[{v:p.threshold.clone(),private:true},{v:p.out.clone(),private:true}];p.after='idle';state(p,'walk',0);}
 for(const p of pets){p.brain=new AgentBrain(PROFILES[p.id],rnd);p.rig.root.position.copyFrom(p.out);p.path=[];p.after='idle';p.inShelter=false;p.inHouse=false;p.needCheck=0;p.phase=0;p.lastCare=-100;state(p,'idle',p.id==='dog'?2:4);}
 // Stand beside the bowl rather than placing the animal's body inside it.
 function mealPlan(p,kind){
  const bowl=kind==='drink'?p.water:p.food,origin=p.rig.root.position,reach=p.id==='dog'?.68:.49;
  const other=kind==='drink'?p.food.point:p.water.point;
  const preferred=Math.atan2(origin.z-bowl.point.z,origin.x-bowl.point.x),candidates=[];
  for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
   const a=preferred+offset,x=bowl.point.x+Math.cos(a)*reach,z=bowl.point.z+Math.sin(a)*reach;
   if(!valid(x,z)||Math.abs(surfaceHeight(x,z)-bowl.point.y)>.18||dist({x,z},other)<(p.id==='dog'?.45:.32))continue;
   candidates.push(point(x,z));
  }
  if(candidates.length&&plan(p,candidates,kind)){p.mealTarget=bowl.point.clone();return true;}
  p.brain.fail(kind);return false;
 }
 // A dedicated portal connects the porch to a bounded indoor route, even with the human door closed.
 const houseOut=home.C(0,.53,f-.85),houseThreshold=home.C(0,.53,f-.055),houseIn=home.C(0,.53,f+.95);
 function visitHouse(p){
  if(p.inShelter||p.inHouse||doorState().active)return false;
  if(!plan(p,houseOut,'house'))return false;
  p.path.push({v:houseThreshold.clone(),private:true,portal:1},{v:houseIn.clone(),private:true,portal:1});
  return true;
 }
 function exitHouse(p){
  if(doorState().active)return false;
  p.pending=null;p.path=[{v:houseThreshold.clone(),private:true,portal:-1},{v:houseOut.clone(),private:true,portal:-1}];p.after='idle';state(p,'walk',0);return true;
 }
 function choose(p){
  const d=data[p.id],w=weather(),per={...d,night:!!w.night,rain:!!w.rain,inShelter:p.inShelter,playerNear:dist(p.rig.root.position,avatar.position)<3.0};
  const goal=p.brain.choose(goals,per);stats.decisions++;
  if(p.inHouse){if(!exitHouse(p))state(p,'house',1);return;}
  if(p.inShelter){if(goal==='rest'){state(p,'sleep',8);return;}leave(p);return;}
  if(goal==='drink'&&mealPlan(p,'drink'))return;
  if(goal==='eat'&&mealPlan(p,'eat'))return;
  if(goal==='shelter'&&plan(p,p.out,'sleep',true))return;
  if(goal==='social'){p.rig.root.rotation.y=Math.atan2(p.rig.root.position.x-avatar.position.x,p.rig.root.position.z-avatar.position.z);state(p,'sit',3);return;}
  if(goal==='explore'){
   if(rnd()<(p.id==='cat'?.40:.22)&&visitHouse(p))return;
   for(let i=0;i<9;i++){const x=p.out.x+(rnd()-.5)*29,z=p.out.z+(rnd()-.5)*20;if(!valid(x,z)||dist(p.rig.root.position,{x,z})<2.5)continue;if(plan(p,point(x,z),'idle'))return;}
  }
  state(p,'sit',3+rnd()*3);
 }
 function pose(p,dt){
  const r=p.rig,s=r.s,walking=p.state==='walk'&&!p.pending,playing=p.state==='play',sleep=p.state==='sleep',sit=p.state==='sit',eat=p.state==='eat'||p.state==='drink',pet=p.state==='pet';
  p.phase+=dt*(walking?10:playing?13:2.8);const a=p.phase,e=1-Math.exp(-dt*10);
  const y=s*(sleep?-.24:sit?-.10:walking?.035*Math.abs(Math.sin(a)):playing?.11*Math.abs(Math.sin(a)):.012*Math.sin(a));
  r.body.position.y+=(y-r.body.position.y)*e;r.body.rotation.x+=((sit?-.20:0)-r.body.rotation.x)*e;
  const h=eat?.72:sleep?.30:pet?-.18:0;r.head.rotation.x+=(h+(eat?.10*Math.sin(a*3):.025*Math.sin(a))-r.head.rotation.x)*e;
  r.tail.rotation.y+=(Math.sin(a*(playing||pet?2.5:1))*(sleep?.035:playing||pet?.75:walking?.35:.17)-r.tail.rotation.y)*e;
  r.tail.rotation.x+=((sleep?-.5:p.id==='cat'?-.45:.10)-r.tail.rotation.x)*e;r.tip.rotation.y=Math.sin(a+.8)*.2;
  for(const l of r.legs){const w=walking?.55*Math.sin(a+l.phase):playing?.70*Math.sin(a+l.phase):sleep?.85:sit?.36:0;l.hip.rotation.x+=(w-l.hip.rotation.x)*e;l.knee.rotation.x+=((sleep?-.95:walking?-.28*Math.max(0,Math.sin(a+l.phase)):0)-l.knee.rotation.x)*e;}
  for(let i=0;i<r.ears.length;i++)r.ears[i].rotation.z=Math.sin(a*.6+i)*.06;
 }
 // Reconsider nonessential activity at low frequency, preserving meals,
// player interactions and private doorway/shelter traversals.
 function reconsiderCare(p){
  const d=data[p.id],need=careGoals(d).find(g=>(p.brain.memory.get(g.id)||0)<=p.brain.time);
  if(!need||['drink','eat','pet','play'].includes(p.state))return false;
  if(p.state==='walk'){
   if(['drink','eat'].includes(p.after)||p.path.some(s=>s.private)||p.inHouse||p.inShelter)return false;
  }else if(!['idle','sit','sleep','house'].includes(p.state))return false;
  p.brain.goal=need.id;
  if(p.inShelter){leave(p);return true;}
  if(p.inHouse)return exitHouse(p);
  const prior={path:p.path,pending:p.pending,after:p.after,state:p.state,timer:p.timer};
  if(mealPlan(p,need.id))return true;
  Object.assign(p,prior);return false;
 }
 function tickPet(p,dt){
  const d=data[p.id];p.brain.tick(dt);d.hunger=clamp01(d.hunger+dt*p.brain.profile.hungerRate);d.thirst=clamp01(d.thirst+dt*p.brain.profile.thirstRate);d.energy=clamp01(d.energy+dt*(p.state==='sleep'?.028:p.state==='walk'||p.state==='play'?-.004:.002));
  p.needCheck+=dt;if(p.needCheck>=.5){p.needCheck=0;reconsiderCare(p);}
  if(p.state==='walk'){
   const step=p.path[0];if(p.pending){/* Wait for bounded route slices. */}
   else if(!step){p.inShelter=p.after==='sleep';p.inHouse=p.after==='house';stats.arrivals++;state(p,p.after,p.after==='sleep'?12:p.after==='house'?8:p.after==='eat'||p.after==='drink'?4:2);}
   else if(step.portal&&doorState().active){/* Wait until the moving human door is stable. */}
   else{const root=p.rig.root,dx=step.v.x-root.position.x,dz=step.v.z-root.position.z,dd=Math.hypot(dx,dz),k=Math.min(1,p.brain.profile.speed*dt/Math.max(.0001,dd)),x=root.position.x+dx*k,z=root.position.z+dz*k;
    if(!step.private&&!valid(x,z)){const target=p.path.at(-1)?.v;if(target&&p.path.every(q=>!q.private)){plan(p,target,p.after);}else{p.brain.fail(p.brain.goal);p.path=[];state(p,'idle',2);}}
    else{root.position.set(x,step.private?root.position.y+(step.v.y-root.position.y)*k:surfaceHeight(x,z),z);if(dd>.012)root.rotation.y+=angleDelta(root.rotation.y,Math.atan2(-dx,-dz))*(1-Math.exp(-dt*10));stats.distance+=dd*k;if(k===1)p.path.shift();}
   }
  }else if((p.timer-=dt)<=0){
   if(p.state==='drink'||p.state==='eat'){const liquid=p.state==='drink',k=liquid?'water':'food',n=liquid?'thirst':'hunger',use=Math.min(d[k],.24,Math.max(0,(d[n]-CARE_POLICY.satisfiedAt)/2));d[k]-=use;d[n]=clamp01(d[n]-use*2);save();state(p,'idle',2);}
   else if(p.state==='pet'||p.state==='play'){if(p.interaction)p.timer=.15;else state(p,'idle',2);}
   else choose(p);
  }
  if((p.state==='drink'||p.state==='eat')&&p.mealTarget){const root=p.rig.root,dx=root.position.x-p.mealTarget.x,dz=root.position.z-p.mealTarget.z;root.rotation.y+=angleDelta(root.rotation.y,Math.atan2(dx,dz))*(1-Math.exp(-dt*12));}
  pose(p,dt);
  const s=p.path[0],cross=s?.private&&!s.portal&&p.state==='walk',nearDoor=dist(p.rig.root.position,p.threshold)<.85,angle=cross&&nearDoor?(p.after==='sleep'?1.1:-1.1):0;
  for(let i=0;i<p.curtain.strips.length;i++){const q=p.curtain.strips[i];q.rotation.x+=(angle*(1-i*.07)-q.rotation.x)*(1-Math.exp(-dt*12));}
  for(const [b,l] of [[p.food,d.food],[p.water,d.water]]){b.contents.setEnabled(l>.02);b.contents.position.y=b.point.y+.08+.033*l;for(let i=0;i<b.pieces.length;i++)b.pieces[i].setEnabled(l>(i+.1)/b.pieces.length);}
 }
 // Separate the home service area from proximity to a living animal.
 const atHeight=(a,b)=>Math.abs(a.y-b.y)<.85;
 const houseDistance=p=>Math.min(...[p.out,p.food.point,p.water.point].filter(v=>atHeight(avatar.position,v)).map(v=>dist(avatar.position,v)),Infinity);
 const homeNear=p=>houseDistance(p)<2.0;
 const animalNear=p=>!p.inShelter&&atHeight(avatar.position,p.rig.root.position)&&dist(avatar.position,p.rig.root.position)<1.65;
 const available=p=>animalNear(p)&&!p.path.some(s=>s.private)&&!['eat','drink','sleep','pet','play'].includes(p.state)&&p.brain.time-p.lastCare>=8;
 const mood=p=>{const d=data[p.id];return d.energy<.25?'Cansado':d.hunger>=.30||d.thirst>=.30?'Precisa de cuidados':p.state==='sleep'?'Sonolento':p.id==='cat'&&p.brain.time%34>=20?'Independente':'Bem-humorado';};
 let notice='',noticeUntil=0,activePet=null,interaction=null;
 // Real reusable toy meshes; one per species, allocated once and hidden when unused.
 const toys={};entity('pet toys');
 const ballMat=mat('dog tennis ball','#d4d85c'),yarnMat=mat('cat rose yarn','#d28e91'),yarnThread=mat('cat yarn thread','#a85d65');
 for(const id of ['dog','cat']){
  const root=new Mesh(id+' toy root',scene),radius=id==='dog'?.11:.09;
  const core=sphere(id+' toy',0,0,0,radius,radius,radius,id==='dog'?ballMat:yarnMat,false);core.parent=root;
  for(let i=0;i<(id==='dog'?2:6);i++){const ring=MeshBuilder.CreateTorus(id+' toy seam '+i,{diameter:radius*1.86,thickness:.012,tessellation:16},scene);ring.parent=root;ring.rotation.set(i*.51,i*.78,.35+i*.24);own(ring,id==='dog'?M.plaster:yarnThread,false);}
  root.setEnabled(false);toys[id]={root,radius};
 }
 function interactionActive(){return !!interaction;}
 function cancelInteraction(){if(!interaction)return false;const p=interaction.p;toys[p.id].root.setEnabled(false);p.interaction=null;state(p,'idle',2);interaction=null;api.playerFinish();stats.cancelledInteractions++;return true;}
 function contactPoint(p){
  const root=p.rig.root;root.computeWorldMatrix(true);
  const y=p.id==='dog'?.67:.48;
  return root.position.add(V(0,y,0));
 }
 // Separate moving body collider from the static route topology. Ellipses
 // rotate with each model and permit only outward recovery from prior overlap.
 function bodyClearance(p,x,z){
  const root=p.rig.root,a=root.rotation.y,c=Math.cos(a),s=Math.sin(a),dx=x-root.position.x,dz=z-root.position.z;
  const rx=p.id==='dog'?.46:.35,rz=p.id==='dog'?.72:.54;
  return (Math.hypot((dx*c-dz*s)/rx,(dx*s+dz*c)/rz)-1)*Math.min(rx,rz);
 }
 function bodyBlocked(x,z,from=null){
  return pets.some(p=>{
   const root=p.rig.root.position;if(p.inShelter||Math.abs(surfaceHeight(x,z)-root.y)>.65)return false;
   const next=bodyClearance(p,x,z),prev=from?bodyClearance(p,from.x,from.z):null;
   return next<0&&!(prev!==null&&prev<0&&next>prev+1e-6);
  });
 }
 function approachPoint(p){
  const root=p.rig.root.position,a=Math.atan2(avatar.position.z-root.z,avatar.position.x-root.x),candidates=[];
  for(const offset of [0,.55,-.55,1.1,-1.1,1.65,-1.65,Math.PI]){
   const x=root.x+Math.cos(a+offset)*.57,z=root.z+Math.sin(a+offset)*.57,y=surfaceHeight(x,z);
   if(Math.abs(y-root.y)>.24||api.playerBlocked(x,z))continue;
   // Reject a route across a wall or furniture, even if its endpoint is clear.
   let clear=true;for(let t=.1;t<=1.001;t+=.1){const u=avatar.position.x+(x-avatar.position.x)*t,v=avatar.position.z+(z-avatar.position.z)*t;const prev={x:avatar.position.x+(x-avatar.position.x)*Math.max(0,t-.1),z:avatar.position.z+(z-avatar.position.z)*Math.max(0,t-.1)};if(api.playerBlocked(u,v,prev)){clear=false;break;}}
   if(clear)candidates.push(V(x,y,z));
  }
  return candidates[0]||null;
 }
 function beginInteraction(p,action){
  if(interaction)return false;const dest=approachPoint(p);if(!dest){message('Chegue um pouco mais perto por um caminho livre.',p);return false;}
  api.cancelInput();p.pending=null;p.path=[];p.lastCare=p.brain.time;p.interaction=action;
  p.rig.root.rotation.y=Math.atan2(p.rig.root.position.x-avatar.position.x,p.rig.root.position.z-avatar.position.z);
  state(p,action,100);interaction={p,action,dest,phase:'approach',elapsed:0,contact:0,toyOrigin:null,toyEnd:null};
  return true;
 }
 function completeInteraction(a){
  const p=a.p,d=data[p.id],before=d.affinity;
  d.affinity=clamp01(before+(a.action==='pet'?.025:.04));
  if(!save())d.affinity=before;else{stats.care++;stats.completedInteractions++;message('♥ Afinidade aumentou',p);}
  toys[p.id].root.setEnabled(false);p.interaction=null;state(p,'idle',2);interaction=null;api.playerFinish();
 }
 function updateInteraction(dt){
  const a=interaction;if(!a)return;const p=a.p,root=p.rig.root;
  if(p.inShelter||Math.abs(avatar.position.y-root.position.y)>.8||dist(avatar.position,root.position)>2.1){cancelInteraction();return;}
  a.elapsed+=dt;
  if(a.phase==='approach'){
   const dx=a.dest.x-avatar.position.x,dz=a.dest.z-avatar.position.z,dd=Math.hypot(dx,dz);
   if(dd>.045){const k=Math.min(1,1.6*dt/dd);api.playerMove(dx*k,dz*k,dt);if(a.elapsed>2.2)cancelInteraction();return;}
   a.phase='perform';a.elapsed=0;return;
  }
  const t=a.elapsed,fade=Math.max(0,Math.min(1,t/.32,(a.action==='pet'?2.6:3.4)-t>0?((a.action==='pet'?2.6:3.4)-t)/.32:0));
  if(a.action==='pet'){
   const target=contactPoint(p);target.x+=Math.sin(t*9)*.08;target.z+=Math.cos(t*9)*.09;
   const result=api.playerPose(target,fade,dt);if(fade>.98&&result.error<.035&&result.reach<.86){a.contact+=dt;stats.handContacts++;}
   if(t>=2.6){if(a.contact>.65)completeInteraction(a);else cancelInteraction();}
  }else{
   const toy=toys[p.id],base=root.position,dx=avatar.position.x-base.x,dz=avatar.position.z-base.z,dd=Math.max(.001,Math.hypot(dx,dz));
   if(!a.toyOrigin){a.toyOrigin=point(base.x+dx/dd*.30,base.z+dz/dd*.30);const end=point(base.x+dz/dd*.65,base.z-dx/dd*.65);a.toyEnd=valid(end.x,end.z)&&Math.abs(end.y-base.y)<.20?end:a.toyOrigin.clone();toy.root.position.copyFrom(a.toyOrigin);toy.root.position.y+=toy.radius;toy.root.setEnabled(true);}
   const u=(1-Math.cos(Math.min(1,t/3.1)*Math.PI*4))/2;
   const x=a.toyOrigin.x+(a.toyEnd.x-a.toyOrigin.x)*u,z=a.toyOrigin.z+(a.toyEnd.z-a.toyOrigin.z)*u;
   const y=surfaceHeight(x,z)+toy.radius+Math.abs(Math.sin(t*8))*(p.id==='dog'?.07:.035);
   stats.toyTravel+=Math.hypot(x-toy.root.position.x,z-toy.root.position.z);toy.root.position.set(x,y,z);toy.root.rotation.x+=dt*8;toy.root.rotation.z+=dt*5;
   root.rotation.y+=angleDelta(root.rotation.y,Math.atan2(root.position.x-x,root.position.z-z))*(1-Math.exp(-dt*12));
   p.rig.head.rotation.x=.35+.18*Math.sin(t*8);
   const target=toy.root.position.clone();target.y+=.25;api.playerPose(target,.62*fade,dt);
   if(t>=3.4)completeInteraction(a);
  }
 }
 function message(s,p){notice=s;noticeUntil=p.brain.time+2.8;}
 function care(id,action,value){const p=pets.find(p=>p.id===id);if(!p||error)return false;const d=data[id],before={...d};
  if(action==='food'&&homeNear(p))d.food=1;
  else if(action==='water'&&homeNear(p))d.water=1;
  else if(action==='name'&&homeNear(p)&&!d.name){const name=String(value??'').trim().slice(0,24);if(!name)return false;d.name=name;}
  else if(['pet','play'].includes(action)&&available(p)&&!interaction){
   // Cats can decline based on needs and independent temperament; affection improves willingness.
   const willing=d.energy>=.25&&d.hunger<.30&&d.thirst<.30&&(p.id==='dog'||rnd()<Math.min(.94,.42+d.affinity*.40+(mood(p)==='Bem-humorado'?.22:0)));
   if(!willing){
    p.lastCare=p.brain.time;message((d.name||p.label)+' prefere ficar sozinho agora.',p);
    if(p.id==='cat'){
     const root=p.rig.root.position;for(let i=0;i<8;i++){const a=i*Math.PI/4,x=root.x+Math.cos(a)*2.4,z=root.z+Math.sin(a)*2.4;if(valid(x,z)&&dist({x,z},avatar.position)>dist(root,avatar.position)+.5){plan(p,point(x,z),'idle');break;}}
    }
    return false;
   }
   return beginInteraction(p,action);
  }else return false;
  if(!save()){Object.assign(d,before);return false;}
  // Social interactions are saved only when the physical action completes.
  stats.care++;return true;
 }
 const labels={idle:'Observando',walk:'Passeando',sit:'Sentado',sleep:'Dormindo',drink:'Bebendo',eat:'Comendo',pet:'Recebendo carinho',play:'Brincando',house:'Visitando a casa'};
 const panel=ui('pet-panel'),button=ui('pet-action'),actions=ui('pet-context');
 function portrait(id){
  const dog=id==='dog',coat=dog?'#b87944':'#92908a',cream='#f1dfbd',ear=dog?'#75472e':'#77766f';
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="10" fill="#516947"/><circle cx="32" cy="32" r="26" fill="#779066"/>'+ (dog?'<ellipse cx="12" cy="29" rx="9" ry="17" fill="'+ear+'"/><ellipse cx="52" cy="29" rx="9" ry="17" fill="'+ear+'"/>':'<path d="M12 29 9 5 29 18M52 29 55 5 35 18" fill="'+ear+'" stroke="#dab1a0" stroke-width="3"/>')+'<ellipse cx="32" cy="32" rx="22" ry="22" fill="'+coat+'"/><path d="M32 11Q24 23 27 35Q8 38 18 49Q32 60 46 49Q56 38 37 35Q40 23 32 11" fill="'+cream+'"/><circle cx="23" cy="30" r="3.2" fill="#292a25"/><circle cx="41" cy="30" r="3.2" fill="#292a25"/><ellipse cx="32" cy="39" rx="5" ry="3.6" fill="'+(dog?'#37312c':'#b77a76')+'"/><path d="M32 42q-6 7-10 1m10-1q6 7 10 1" fill="none" stroke="#694c3b" stroke-width="1.8" stroke-linecap="round"/></svg>';
 }
 function refresh(){if(!selected)return;const p=selected,d=data[p.id],name=d.name||p.label;
  ui('pet-title').textContent=p.id==='dog'?'Casa dos cães':'Casa dos gatos';
  ui('pet-fixed-name').textContent=d.name?d.name+' 🔒':p.label;
  ui('pet-slot-name').textContent=name;ui('pet-mood').textContent=mood(p);
  ui('pet-personality').textContent=p.id==='dog'?'Sociável · Brincalhão · Porte médio':'Curioso · Independente · Porte pequeno';
  ui('pet-levels').textContent='Ração '+Math.round(d.food*100)+'% · Água '+Math.round(d.water*100)+'%';
  ui('pet-needs').textContent='Saciedade '+Math.round((1-d.hunger)*100)+'% · Hidratação '+Math.round((1-d.thirst)*100)+'%';
  ui('pet-affinity').value=Math.round(d.affinity*100);ui('pet-affinity-value').textContent=Math.round(d.affinity*100)+'%';
  ui('pet-care-status').textContent=d.hunger>=CARE_POLICY.returnAt&&d.food<=CARE_POLICY.minSupply?'Repor ração':d.thirst>=CARE_POLICY.returnAt&&d.water<=CARE_POLICY.minSupply?'Repor água':labels[p.state];
  ui('pet-error').textContent=error;
  ui('pet-food').disabled=ui('pet-water').disabled=!!error||!homeNear(p);
  ui('pet-name-form').hidden=!!d.name;ui('pet-rename').disabled=!!error||!!d.name||!homeNear(p);
 }
 function close(){panel.hidden=true;selected=null;}
 button.onclick=()=>{const n=pets.filter(homeNear).sort((a,b)=>houseDistance(a)-houseDistance(b));if(!n.length)return;selected=n[0];ui('pet-name').value='';ui('pet-portrait').innerHTML=portrait(selected.id);ui('pet-slot-portrait').innerHTML=portrait(selected.id);panel.hidden=false;refresh();actions.hidden=true;};
 ui('pet-close').onclick=close;
 for(const [id,action] of [['pet-food','food'],['pet-water','water'],['pet-rename','name']])ui(id).onclick=()=>{if(selected){care(selected.id,action,ui('pet-name').value);refresh();}};
 for(const [id,action] of [['pet-pet','pet'],['pet-play','play']])ui(id).onclick=()=>{if(activePet){care(activePet.id,action);}};
 function positionActions(){
  if(actions.hidden||!activePet)return;
  const p=activePet.rig.root.position;
  const pos=api.project(p.add(V(0,.12,0)));
  if(!pos||pos.z<0||pos.z>1){actions.hidden=true;return;}
  const width=actions.offsetWidth||130,height=actions.offsetHeight||65;
  const left=Math.min(innerWidth-width-12,Math.max(12,pos.x-width/2)),top=Math.min(innerHeight-height-12,Math.max(65,pos.y+14));
  // A projected interaction must not intercept the two physical control regions.
  const bounds={left,top,right:left+width,bottom:top+height};
  const overlaps=el=>{const r=el.getBoundingClientRect();return bounds.left<r.right+8&&bounds.right>r.left-8&&bounds.top<r.bottom+8&&bounds.bottom>r.top-8;};
  if(overlaps(ui('joy'))||overlaps(ui('run-action'))){actions.hidden=true;return;}
  actions.style.left=left+'px';actions.style.top=top+'px';
 }
 function update(dt,allowUI=true){dt=Math.max(0,Math.min(.10,dt));for(const p of pets)tickPet(p,dt);updateInteraction(dt);pumpRoutes();const crossing=pets.find(p=>p.state==='walk'&&p.path[0]?.portal&&dist(p.rig.root.position,houseThreshold)<1.1);const flapTarget=crossing&&doorState().open<.1?crossing.path[0].portal*1.36:0;home.petFlap.rotation.x+=(flapTarget-home.petFlap.rotation.x)*(1-Math.exp(-dt*14));saveClock+=dt;if(saveClock>20){saveClock=0;save();}uiClock+=dt;
  if(uiClock>=.10){uiClock=0;
   const n=pets.filter(homeNear).sort((a,b)=>houseDistance(a)-houseDistance(b));
   if(selected&&(!allowUI||!homeNear(selected)))close();
   button.hidden=!allowUI||!n.length||!panel.hidden;
   if(n.length)button.textContent=n[0].id==='dog'?'Casa dos cães':'Casa dos gatos';
   if(selected)refresh();
   activePet=pets.filter(animalNear).sort((a,b)=>dist(avatar.position,a.rig.root.position)-dist(avatar.position,b.rig.root.position))[0]||null;
   actions.hidden=!allowUI||!panel.hidden||!activePet||!!interaction;
   if(activePet){ui('pet-context-name').textContent=data[activePet.id].name||activePet.label;ui('pet-play-icon').textContent=activePet.id==='cat'?'🧶':'🎾';ui('pet-pet').disabled=ui('pet-play').disabled=!available(activePet);}
   ui('pet-notice').hidden=!notice||!pets.some(p=>p.brain.time<noticeUntil);ui('pet-notice').textContent=notice;
  }
  positionActions();
 }
 window.addEventListener('pagehide',save);
 return {pets,stats,toys,save,bodyBlocked,bodyClearance,interactionActive,cancelInteraction,route,pumpRoutes,valid,plan,mealPlan,reconsiderCare,visitHouse,exitHouse,houseOut,houseIn,catHome,leave,care,pose,update,homeNear,animalNear,mood,get data(){return data}};
}
