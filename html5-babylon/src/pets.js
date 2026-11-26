import {AgentBrain,PROFILES,petGoals,findRoute,clamp01} from './ecosystem-ai.js';
export function createPets(api){
 const {V,Mesh,MeshBuilder,scene,entity,own,box,sphere,cyl,mat,M,home,dogHome,porchFixtures,fencePoints,blocked,surfaceHeight,homeLocal,angleDelta,avatar,weather,ui,cancelInput}=api;
 const SAVE='cv.pets.v1',defaults=()=>({name:'',food:1,water:1,hunger:.28,thirst:.35,affinity:0,energy:.8});
 let data={dog:defaults(),cat:defaults()},error='',seed=9213,selected=null,uiClock=0,saveClock=0;
 const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 try{const raw=JSON.parse(localStorage.getItem(SAVE)||'null');if(raw){const next={};for(const id of ['dog','cat']){const d={...defaults(),...raw[id]};if(!raw[id]||typeof d.name!=='string'||d.name.length>24||!['food','water','hunger','thirst','affinity','energy'].every(k=>Number.isFinite(d[k])&&d[k]>=0&&d[k]<=1))throw Error('invalid pet save');next[id]=d;}data=next;}}catch{error='Dados dos pets indisponíveis; save protegido.';}
 function save(){if(error)return false;try{localStorage.setItem(SAVE,JSON.stringify(data));return true;}catch{error='Falha ao salvar os pets.';return false;}}
 const dogCoat=mat('dog caramel','#ba713c'),dogLight=mat('dog cream','#f1dcb9'),catCoat=mat('cat grey tabby','#92908a'),catLight=mat('cat cream','#e8dcc6'),stripe=mat('cat charcoal','#50514e'),nose=mat('cat nose','#b77a76'),ceramic=mat('pet ceramic','#4b7990'),waterMat=mat('pet water','#78b5c5',.18),foodMat=mat('pet kibble','#8e5934'),cushion=mat('cat cushion','#a76f4b');
 const f=-home.d/2;
 // Place cat shelter in the spare rear-right corner of the porch, opening towards the aisle.
 entity('cat shelter');const catHome={x:4.60,z:f-.58,hx:.46,hz:.44};
 const catAt=(x,y,z)=>home.C(catHome.x+x,.53+y,catHome.z+z);
 const cb=(n,x,y,z,w,h,d,m)=>{const p=catAt(x,y,z);return box(n,p.x,p.y,p.z,w,h,d,m,home.angle);};
 cb('cat shelter floor',0,.055,0,.92,.11,.88,M.woodLight);cb('cat shelter rear',.42,.42,0,.08,.74,.88,M.wood);
 for(const k of [-1,1])cb('cat shelter wall',0,.42,k*.40,.92,.74,.08,M.woodLight);
 cb('cat shelter lintel',-.42,.70,0,.08,.18,.88,M.wood);cb('cat shelter roof',0,.86,0,1.05,.14,1.01,M.roof);cb('cat cushion',.04,.14,0,.67,.08,.65,cushion);
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
 function segment(a,b){const n=Math.max(1,Math.ceil(dist(a,b)/.20));let y=surfaceHeight(a.x,a.z);for(let i=1;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,h=surfaceHeight(x,z);if(!valid(x,z)||Math.abs(h-y)>.34)return false;y=h;}return true;}
 const grid=.45;
 function route(a,b){
  if(!valid(b.x,b.z))return null;if(segment(a,b))return [b.clone()];
  const cache=new Map(),key=n=>n.i+':'+n.j,at=(i,j)=>{const k=i+':'+j;if(!cache.has(k))cache.set(k,valid(i*grid,j*grid)?{i,j,p:point(i*grid,j*grid)}:null);return cache.get(k);};
  function snap(p){let best=null,dd=Infinity;const i=Math.round(p.x/grid),j=Math.round(p.z/grid);for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const n=at(i+x,j+z);if(n&&dist(p,n.p)<dd&&segment(p,n.p)){best=n;dd=dist(p,n.p);}}return best;}
  const start=snap(a),goal=snap(b);if(!start||!goal)return null;
  const nodes=findRoute(start,goal,n=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([i,j])=>at(n.i+i,n.j+j)).filter(q=>q&&segment(n.p,q.p)),(a,b)=>dist(a.p,b.p),key);
  if(!nodes)return null;const raw=nodes.map(n=>n.p).concat([b.clone()]),out=[];let last=a;
  for(let i=0;i<raw.length;){let j=raw.length-1;while(j>i&&!segment(last,raw[j]))j--;out.push(raw[j].clone());last=raw[j];i=j+1;}return out;
 }
 function safe(origin,offsets){for(const [x,z] of offsets){const p=point(origin.x+x,origin.z+z);if(valid(p.x,p.z))return p;}return origin.clone();}
 const dogOut0=dogHome.C(0,0,-dogHome.d/2-1.12),dogOut=safe(dogOut0,[[0,0],[-.2,-.4],[.2,-.5],[0,-1]]);
 const catOut0=catAt(-.85,0,0),catOut=safe(catOut0,[[0,0],[0,-.2],[-.1,-.2]]);
 const dp1=safe(dogOut,[[-1.05,-.35],[1.1,-.2],[0,-1.25]]),dp2=safe(dogOut,[[1.1,-.35],[-1.25,-.7],[0,-1.7]]);
 const cp1=home.C(2.8,.53,f-1.9),cp2=home.C(2.0,.53,f-2.0);
 const pets=[
  {id:'dog',label:'Cachorro',rig:rig('dog',dogCoat,dogLight,false),out:dogOut,threshold:dogHome.C(0,.51,-dogHome.d/2+.02),bed:dogHome.C(0,.51,.42),food:bowl('dog',dp2,false),water:bowl('dog',dp1,true)},
  {id:'cat',label:'Gato',rig:rig('cat',catCoat,catLight,true),out:catOut,threshold:catAt(-.44,.11,0),bed:catAt(.02,.18,0),food:bowl('cat',point(cp2.x,cp2.z),false),water:bowl('cat',point(cp1.x,cp1.z),true)}
 ];
 const stats={decisions:0,paths:0,failed:0,arrivals:0,distance:0,care:0},goals=petGoals();
 function state(p,s,t){p.state=s;p.timer=t;}
 function plan(p,target,after,homeward=false){
  const r=route(p.rig.root.position,target);if(!r){stats.failed++;p.brain.fail(p.brain.goal);return false;}
  p.path=r.map(v=>({v,private:false}));if(homeward)p.path.push({v:p.threshold.clone(),private:true},{v:p.bed.clone(),private:true});
  p.after=after;stats.paths++;state(p,'walk',0);return true;
 }
 function leave(p){p.path=[{v:p.threshold.clone(),private:true},{v:p.out.clone(),private:true}];p.after='idle';state(p,'walk',0);}
 for(const p of pets){p.brain=new AgentBrain(PROFILES[p.id],rnd);p.rig.root.position.copyFrom(p.out);p.path=[];p.after='idle';p.inShelter=false;p.phase=0;p.lastCare=-100;state(p,'idle',p.id==='dog'?2:4);}
 function choose(p){
  const d=data[p.id],w=weather(),per={...d,night:!!w.night,rain:!!w.rain,inShelter:p.inShelter,playerNear:dist(p.rig.root.position,avatar.position)<3.0};
  const goal=p.brain.choose(goals,per);stats.decisions++;
  if(p.inShelter){if(goal==='rest'){state(p,'sleep',8);return;}leave(p);return;}
  if(goal==='drink'&&plan(p,p.water.point,'drink'))return;
  if(goal==='eat'&&plan(p,p.food.point,'eat'))return;
  if(goal==='shelter'&&plan(p,p.out,'sleep',true))return;
  if(goal==='social'){p.rig.root.rotation.y=Math.atan2(p.rig.root.position.x-avatar.position.x,p.rig.root.position.z-avatar.position.z);state(p,'sit',3);return;}
  if(goal==='explore'){
   for(let i=0;i<9;i++){const x=p.out.x+(rnd()-.5)*29,z=p.out.z+(rnd()-.5)*20;if(!valid(x,z)||dist(p.rig.root.position,{x,z})<2.5)continue;if(plan(p,point(x,z),'idle'))return;}
  }
  state(p,'sit',3+rnd()*3);
 }
 function pose(p,dt){
  const r=p.rig,s=r.s,walking=p.state==='walk',playing=p.state==='play',sleep=p.state==='sleep',sit=p.state==='sit',eat=p.state==='eat'||p.state==='drink',pet=p.state==='pet';
  p.phase+=dt*(walking?10:playing?13:2.8);const a=p.phase,e=1-Math.exp(-dt*10);
  const y=s*(sleep?-.24:sit?-.10:walking?.035*Math.abs(Math.sin(a)):playing?.11*Math.abs(Math.sin(a)):.012*Math.sin(a));
  r.body.position.y+=(y-r.body.position.y)*e;r.body.rotation.x+=((sit?-.20:0)-r.body.rotation.x)*e;
  const h=eat?.72:sleep?.30:pet?-.18:0;r.head.rotation.x+=(h+(eat?.10*Math.sin(a*3):.025*Math.sin(a))-r.head.rotation.x)*e;
  r.tail.rotation.y+=(Math.sin(a*(playing||pet?2.5:1))*(sleep?.035:playing||pet?.75:walking?.35:.17)-r.tail.rotation.y)*e;
  r.tail.rotation.x+=((sleep?-.5:p.id==='cat'?-.45:.10)-r.tail.rotation.x)*e;r.tip.rotation.y=Math.sin(a+.8)*.2;
  for(const l of r.legs){const w=walking?.55*Math.sin(a+l.phase):playing?.70*Math.sin(a+l.phase):sleep?.85:sit?.36:0;l.hip.rotation.x+=(w-l.hip.rotation.x)*e;l.knee.rotation.x+=((sleep?-.95:walking?-.28*Math.max(0,Math.sin(a+l.phase)):0)-l.knee.rotation.x)*e;}
  for(let i=0;i<r.ears.length;i++)r.ears[i].rotation.z=Math.sin(a*.6+i)*.06;
 }
 function tickPet(p,dt){
  const d=data[p.id];p.brain.tick(dt);d.hunger=clamp01(d.hunger+dt*p.brain.profile.hungerRate);d.thirst=clamp01(d.thirst+dt*p.brain.profile.thirstRate);d.energy=clamp01(d.energy+dt*(p.state==='sleep'?.028:p.state==='walk'||p.state==='play'?-.004:.002));
  if(p.state==='walk'){
   const step=p.path[0];if(!step){p.inShelter=p.after==='sleep';stats.arrivals++;state(p,p.after,p.after==='sleep'?12:p.after==='eat'||p.after==='drink'?4:2);}
   else{const root=p.rig.root,dx=step.v.x-root.position.x,dz=step.v.z-root.position.z,dd=Math.hypot(dx,dz),k=Math.min(1,p.brain.profile.speed*dt/Math.max(.0001,dd)),x=root.position.x+dx*k,z=root.position.z+dz*k;
    if(!step.private&&!valid(x,z)){p.brain.fail(p.brain.goal);p.path=[];state(p,'idle',2);}
    else{root.position.set(x,step.private?root.position.y+(step.v.y-root.position.y)*k:surfaceHeight(x,z),z);if(dd>.012)root.rotation.y+=angleDelta(root.rotation.y,Math.atan2(-dx,-dz))*(1-Math.exp(-dt*10));stats.distance+=dd*k;if(k===1)p.path.shift();}
   }
  }else if((p.timer-=dt)<=0){
   if(p.state==='drink'||p.state==='eat'){const liquid=p.state==='drink',k=liquid?'water':'food',n=liquid?'thirst':'hunger',use=Math.min(d[k],.24);d[k]-=use;d[n]=clamp01(d[n]-use*2);save();state(p,'idle',2);}
   else if(p.state==='pet'||p.state==='play')state(p,'idle',2);
   else choose(p);
  }
  pose(p,dt);
  for(const [b,l] of [[p.food,d.food],[p.water,d.water]]){b.contents.setEnabled(l>.02);b.contents.position.y=b.point.y+.08+.033*l;for(let i=0;i<b.pieces.length;i++)b.pieces[i].setEnabled(l>(i+.1)/b.pieces.length);}
 }
 const near=(p)=>Math.min(dist(avatar.position,p.rig.root.position),dist(avatar.position,p.out),dist(avatar.position,p.food.point),dist(avatar.position,p.water.point))<2.0;
 function care(id,action,value){const p=pets.find(p=>p.id===id);if(!p||!near(p)||error)return false;const d=data[id],before={...d};
  if(action==='food'&&dist(avatar.position,p.food.point)<2)d.food=1;
  else if(action==='water'&&dist(avatar.position,p.water.point)<2)d.water=1;
  else if(action==='name'){const name=String(value??'').trim().slice(0,24);if(!name)return false;d.name=name;}
  else if(['pet','play'].includes(action)&&!p.inShelter&&dist(avatar.position,p.rig.root.position)<1.65&&p.brain.time-p.lastCare>=8)d.affinity=clamp01(d.affinity+(action==='pet'?.025:.04));
  else return false;
  if(!save()){Object.assign(d,before);return false;}
  if(['pet','play'].includes(action)){p.lastCare=p.brain.time;p.path=[];p.rig.root.rotation.y=Math.atan2(p.rig.root.position.x-avatar.position.x,p.rig.root.position.z-avatar.position.z);state(p,action,action==='pet'?3:5);}
  stats.care++;return true;
 }
 const labels={idle:'Observando',walk:'Passeando',sit:'Sentado',sleep:'Dormindo',drink:'Bebendo',eat:'Comendo',pet:'Recebendo carinho',play:'Brincando'};
 const panel=ui('pet-panel'),button=ui('pet-action');
 function refresh(){if(!selected)return;const p=selected,d=data[p.id];ui('pet-title').textContent=(d.name||p.label)+' · '+labels[p.state];ui('pet-levels').textContent='Ração '+Math.round(d.food*100)+'% · Água '+Math.round(d.water*100)+'% · Afinidade '+Math.round(d.affinity*100)+'%';ui('pet-needs').textContent='Fome '+Math.round(d.hunger*100)+'% · Sede '+Math.round(d.thirst*100)+'% · Energia '+Math.round(d.energy*100)+'%';ui('pet-error').textContent=error;ui('pet-food').disabled=!!error||dist(avatar.position,p.food.point)>=2;ui('pet-water').disabled=!!error||dist(avatar.position,p.water.point)>=2;for(const k of ['pet-pet','pet-play'])ui(k).disabled=!!error||p.inShelter||dist(avatar.position,p.rig.root.position)>=1.65||p.brain.time-p.lastCare<8;}
 button.onclick=()=>{const n=pets.filter(near).sort((a,b)=>dist(avatar.position,a.rig.root.position)-dist(avatar.position,b.rig.root.position));if(!n.length)return;cancelInput();selected=n[0];ui('pet-name').value=data[selected.id].name;panel.hidden=false;refresh();};
 ui('pet-close').onclick=()=>{panel.hidden=true;selected=null;cancelInput();};
 for(const [id,action] of [['pet-food','food'],['pet-water','water'],['pet-pet','pet'],['pet-play','play'],['pet-rename','name']])ui(id).onclick=()=>{if(selected){care(selected.id,action,ui('pet-name').value);refresh();}};
 function update(dt,allowUI=true){dt=Math.max(0,Math.min(.10,dt));for(const p of pets)tickPet(p,dt);saveClock+=dt;if(saveClock>20){saveClock=0;save();}uiClock+=dt;if(uiClock<.15)return;uiClock=0;
  const n=pets.filter(near).sort((a,b)=>dist(avatar.position,a.rig.root.position)-dist(avatar.position,b.rig.root.position));button.hidden=!allowUI||!n.length||!panel.hidden;if(n.length)button.textContent='Pet · '+(data[n[0].id].name||n[0].label);if(selected&&!near(selected))ui('pet-close').click();else if(!panel.hidden)refresh();
 }
 window.addEventListener('pagehide',save);
 return {pets,stats,route,valid,plan,leave,care,pose,update,get data(){return data}};
}
