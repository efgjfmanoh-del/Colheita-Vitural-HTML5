import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});await page.waitForFunction(()=>cvQA.perf.fps!==null,null,{timeout:90000});
 const result=await page.evaluate(()=>{const {groups,componentCounts,batching,ground,scene,layout,avatar,onBridge,blocked}=cvQA;return {meshes:scene.meshes.length,batching,canopy:cvQA.canopyStats,bank:cvQA.bankStats,triangles:scene.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),cameraBetaDegrees:scene.activeCamera.beta*180/Math.PI,flowInstancing:cvQA.flowInstancing,road:cvQA.roadMetrics,dormer:componentCounts.house,bridgeClearSamples:cvQA.bridgeEnds.reduce((count,p,i,arr)=>{if(i)return count;const b=arr[1];for(let k=1;k<40;k++){const t=k/40;if(!blocked(p[0]+(b[0]-p[0])*t,p[2]+(b[2]-p[2])*t))count++;}return count},0),doghouseBlocked:blocked(cvQA.dogHome.x,cvQA.dogHome.z),wellBlocked:blocked(cvQA.well[0],cvQA.well[2]),fpsSoftware:cvQA.perf.fps,frameTimeP95Ms:cvQA.perf.p95Ms,measurementFrames:cvQA.perf.frames,shadowRefreshes:cvQA.shadowCache.refreshes,treePositions:cvQA.treePositions.length,fenceSegments:cvQA.fenceColliders.length,vertices:ground.getTotalVertices(),house:componentCounts.house,doghouse:componentCounts.doghouse,well:componentCounts.cistern,water:componentCounts.river,falls:componentCounts.waterfalls,fallIndices:groups.waterfalls.reduce((total,m)=>total+m.getTotalIndices(),0),fallMeshes:groups.waterfalls.length,trees:Object.keys(groups).filter(k=>k.startsWith('forest')||k.startsWith('sakura')).length,externalTextures:scene.textures.filter(t=>t.url&&/mapa|https?:/i.test(t.url)).length,bridge:onBridge((layout.bridges[0].ends[0][0]+layout.bridges[0].ends[1][0]-800)/16,-((layout.bridges[0].ends[0][1]+layout.bridges[0].ends[1][1])/2-145)/6.553),spawn:[avatar.position.x,avatar.position.z],river:cvQA.riverMotionMetrics,dog:componentCounts.dog,waterBlocked:blocked((183-400)/8,-(20-145)/6.553)}});
 const metricText=await page.locator('#metrics').innerText();assert(/P95 \d+\.\d+ ms · \d+×\d+ · \d+ quadros/.test(metricText),'physical-test telemetry must be visible');
 console.log(JSON.stringify(result));fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/resultado.json',JSON.stringify(result,null,2));assert(result.vertices>10000);assert(Number.isFinite(result.fpsSoftware)&&result.fpsSoftware>0);assert(result.measurementFrames>=2);assert(result.treePositions>=25);assert(result.fenceSegments>20);assert(result.shadowRefreshes>=1);assert(result.frameTimeP95Ms>0);assert(result.batching.merged>100);assert(result.bank.blocks>100);assert(result.bank.boulders>0);assert(result.bank.understory>=80);assert.equal(result.bank.understoryVertices,result.bank.understory*60);assert(result.canopy.trees>=25);assert.equal(result.canopy.leaves,result.canopy.trees*300);assert(result.canopy.petals>0);assert.equal(result.canopy.vertices,(result.canopy.leaves+result.canopy.petals)*7);assert(Math.abs(result.cameraBetaDegrees-48)<.01);assert(result.road.sections>20);assert.equal(result.road.vertices,result.road.sections*7);assert.equal(result.bridgeClearSamples,39,'bridge centerline must be walkable');assert(result.doghouseBlocked&&result.wellBlocked);assert(result.flowInstancing.before>10);assert.equal(result.flowInstancing.after,1);assert.equal(result.flowInstancing.instances,result.flowInstancing.before);assert(result.batching.after<result.batching.before);assert(result.house>80&&result.doghouse>10&&result.well>30);assert(result.water>10&&result.trees>5);assert.equal(result.falls,result.river.fallSegments+result.river.fallGroups,'one logical water face per steep segment and one foam mesh per fall group');assert.equal(result.fallIndices,result.river.fallSegments*6+result.river.foamArcs*8*6,'all waterfall and foam triangles must survive batching');assert(result.fallMeshes>0&&result.fallMeshes<=result.falls,'renderable waterfall geometry must exist');assert.equal(result.externalTextures,0);assert(result.river.joins>30);assert.equal(result.river.maxGap,0);assert(result.river.fallSegments>=2);assert.equal(result.river.fallGroups,2,'two residential cascades');assert(result.river.maxSlope>1,'cascade must drop more than one metre per metre horizontal');assert.equal(result.river.foamArcs,72);assert(result.dog>10);assert.equal(result.bridge,true);assert.equal(result.waterBlocked,true);
 // The 1E run exhausted Playwright's screenshot budget with the continuous render loop.
 // Record the benchmark first, then freeze the loop and capture actual rendered canvas frames.
 await page.evaluate(()=>cvQA.engine.stopRenderLoop());
 async function capture(name,control,expectedBeta=48){
  const frame=await page.evaluate(control=>{if(control)document.getElementById(control).click();cvQA.scene.render();const canvas=document.getElementById('view');const probe=document.createElement('canvas');probe.width=64;probe.height=36;const ctx=probe.getContext('2d');ctx.drawImage(canvas,0,0,64,36);const data=ctx.getImageData(0,0,64,36).data;const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add((data[i]<<16)|(data[i+1]<<8)|data[i+2]);return {png:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,colors:colors.size,beta:cvQA.scene.activeCamera.beta*180/Math.PI};},control);
  assert(Math.abs(frame.beta-expectedBeta)<.25,'camera tilt changed during '+name);assert(frame.width>=640&&frame.height>=360,'capture dimensions');assert(frame.colors>100,'capture must contain real varied scene pixels');
  assert(frame.png.startsWith('data:image/png;base64,'));const bytes=Buffer.from(frame.png.split(',')[1],'base64');assert(bytes.length>10000,'capture PNG size');fs.writeFileSync('qa/'+name+'.png',bytes);console.log('Captured '+name+' '+frame.width+'x'+frame.height+' '+bytes.length+' bytes');
 }
 // Verify the optimized nearest-river calculation against the previous hypot algorithm.
 const motionCheck=await page.evaluate(()=>{
  const q=cvQA;let maxError=0;
  for(let i=0;i<240;i++){
   const x=-44+(i%20)*4.4,z=-25+Math.floor(i/20)*4.2;
   let best={dist:1e9,y:1.8,w:4};
   for(const a of q.riverSegments){const px=x-a.x,pz=z-a.z,t=Math.max(0,Math.min(1,(px*a.dx+pz*a.dz)/a.den)),dist=Math.hypot(px-t*a.dx,pz-t*a.dz);if(dist<best.dist)best={dist,y:a.y+a.dy*t,w:a.w+a.dw*t};}
   const result=q.nearRiver(x,z);maxError=Math.max(maxError,Math.abs(best.dist-result.dist),Math.abs(best.y-result.y),Math.abs(best.w-result.w));
  }
  const saved=q.avatar.position.clone(),yaw=q.avatar.rotation.y;
  const dir=[[1,0],[-1,0],[0,1],[0,-1]].find(([x,z])=>[.1,.2,.3,.4,.5,.6].every(k=>!q.blocked(saved.x+x*k,saved.z+z*k)&&Math.abs(q.surfaceHeight(saved.x+x*k,saved.z+z*k)-saved.y)<.2));
  if(!dir)throw new Error('No walkable speed test direction');
  const [x,z]=dir;
  const late=q.advanceManual(x,z,.10);q.avatar.position.copyFrom(saved);
  let steady=0;for(let k=0;k<6;k++)steady+=q.advanceManual(x,z,1/60);
  q.avatar.position.copyFrom(saved);q.avatar.rotation.y=yaw;
  const hits=q.riverStats.cacheHits;q.nearRiver(saved.x,saved.z);q.nearRiver(saved.x,saved.z);
  return {maxError,late,steady,cacheHits:q.riverStats.cacheHits-hits,dead:q.shapeStick(.05,.03),full:q.shapeStick(2,0),diagonal:q.shapeStick(1,1)};
 });
 assert(motionCheck.maxError<1e-8&&motionCheck.cacheHits>0);
 assert(Math.abs(motionCheck.late-.5)<.015&&Math.abs(motionCheck.steady-motionCheck.late)<.015,'100ms frame must preserve displacement using substeps');
 assert.deepEqual(motionCheck.dead,{x:0,z:0});assert.deepEqual(motionCheck.full,{x:1,z:0});assert(Math.abs(Math.hypot(motionCheck.diagonal.x,motionCheck.diagonal.z)-1)<1e-9);
 fs.writeFileSync('qa/movimento.json',JSON.stringify(motionCheck,null,2));console.log('PASS movement time, analog deadzone and river query equivalence',JSON.stringify(motionCheck));
 await capture('visao-geral',null);await capture('residencia','close');const before=await page.evaluate(()=>cvQA.scene.activeCamera.alpha);await capture('perspectiva-alternativa','rotate');assert.notEqual(await page.evaluate(()=>cvQA.scene.activeCamera.alpha),before);assert.deepEqual(errors,[]);
 // Confirm movement in the running 3D scene, not just static mesh existence.
 await page.evaluate(()=>{document.getElementById('wide').click();cvQA.engine.runRenderLoop(()=>cvQA.scene.render());});
 const walk=await page.evaluate(()=>{const p=cvQA.avatar.position;const dirs=[['d',1,0],['a',-1,0],['w',0,1],['s',0,-1]];const a=cvQA.scene.activeCamera.alpha+Math.PI/2;for(const [key,x,z] of dirs){const dx=x*Math.cos(a)-z*Math.sin(a),dz=x*Math.sin(a)+z*Math.cos(a);if(!cvQA.blocked(p.x+dx*.2,p.z+dz*.2)&&!cvQA.blocked(p.x+dx*.7,p.z+dz*.7))return {key,x:p.x,z:p.z,gaitDistance:cvQA.gait.distance};}return null;});
 assert(walk,'spawn must permit movement');
 await page.keyboard.down(walk.key);
 try{await page.waitForFunction(p=>Math.hypot(cvQA.avatar.position.x-p.x,cvQA.avatar.position.z-p.z)>.15&&cvQA.gait.distance>p.gaitDistance+.1&&cvQA.gait.stride>.03,walk,{timeout:30000});}finally{await page.keyboard.up(walk.key);}
 const moved=await page.evaluate(p=>Math.hypot(cvQA.avatar.position.x-p.x,cvQA.avatar.position.z-p.z),walk);
 assert(moved>.15);const animatedWalk=await page.evaluate(()=>({distance:cvQA.gait.distance,phase:cvQA.gait.phase}));assert(animatedWalk.distance>=moved);assert(Number.isFinite(animatedWalk.phase));
 await page.waitForFunction(()=>!cvQA.gait.moving&&cvQA.gait.stride<.03,null,{timeout:30000});console.log('PASS live avatar movement and gait',moved,animatedWalk);
 const closeSpan=await page.evaluate(()=>{document.getElementById('close').click();return cvQA.scene.activeCamera.orthoRight-cvQA.scene.activeCamera.orthoLeft;});
 const followView=await page.evaluate(()=>{document.getElementById('follow').click();const c=cvQA.scene.activeCamera,p=cvQA.avatar.position;return {span:c.orthoRight-c.orthoLeft,targetError:Math.hypot(c.target.x-p.x,c.target.z-p.z)};});
 assert(followView.span<closeSpan*.65,'follow must zoom in materially');assert(followView.targetError<.1,'follow centers on actual avatar');
 await page.evaluate(()=>cvQA.engine.stopRenderLoop());
 const entrance=await page.evaluate(()=>{const q=cvQA,H=q.home,f=-H.d/2;const place=(x,z)=>{const p=H.C(x,0,z);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);};const walk=(x,z)=>{const p=H.C(x,0,z);for(let i=0;i<150;i++){const dx=p.x-q.avatar.position.x,dz=p.z-q.avatar.position.z,dist=Math.hypot(dx,dz);if(dist<.015)break;const k=Math.min(1,.08/dist);q.moveAvatar(dx*k,dz*k,.025);q.updateEntry(.025);}return q.homeLocal(q.avatar.position.x,q.avatar.position.z);};const tick=()=>{for(let i=0;i<90;i++)q.updateEntry(.05);};place(0,f-3.90);tick();const approachBeta=q.scene.activeCamera.beta*180/Math.PI;const approachWeight=q.entry.cameraWeight;const approachMode=q.entry.mode;const levels=[];for(const z of [f-3.55,f-3.20,f-2.85,f-2.2,f-.8]){walk(0,z);levels.push(q.avatar.position.y-H.y);}tick();const beta=q.scene.activeCamera.beta*180/Math.PI;const stopped=walk(0,f+.6).z<f+.1;return {levels,beta,approachBeta,approachWeight,approachMode,stopped,mode:q.entry.mode,doorVisible:!document.getElementById('door-action').hidden,roofVisible:q.groups['house-roof'].every(m=>m.isEnabled())};});
 assert(entrance.levels[0]>.14&&entrance.levels[0]<.23);assert(entrance.levels[1]>.30&&entrance.levels[1]<.40);assert(entrance.levels[2]>.48&&entrance.levels[4]>.48);assert(entrance.approachWeight>0&&entrance.approachWeight<1);assert(entrance.approachBeta>48&&entrance.approachBeta<64);assert(entrance.stopped&&entrance.doorVisible&&entrance.roofVisible);assert.equal(entrance.mode,'entrada');assert(Math.abs(entrance.beta-65)<.25);await capture('entrada-casa',null,65);
 const tracking=await page.evaluate(()=>{const q=cvQA,H=q.home;const old=q.scene.activeCamera.target.clone(),p=q.avatar.position.clone();const step=H.C(0,0,.25).subtract(H.C(0,0,0));for(let i=0;i<4;i++)q.moveAvatar(-step.x,-step.z,.025);for(let i=0;i<100;i++)q.updateEntry(.05);const moved=q.avatar.position.subtract(p),tracked=q.scene.activeCamera.target.subtract(old);return {moved:Math.hypot(moved.x,moved.z),tracked:Math.hypot(tracked.x,tracked.z),alignment:Math.hypot(moved.x-tracked.x,moved.z-tracked.z)};});assert(tracking.moved>.25);assert(tracking.tracked>.25&&tracking.alignment<.1,'camera follows actor instead of fixed facade');
 const interior=await page.evaluate(()=>{const q=cvQA,H=q.home,f=-H.d/2;document.getElementById('door-action').click();for(let i=0;i<90;i++)q.updateEntry(.05);const opened=q.entry.door>.98&&!q.entry.action&&q.entry.lastAction?.success;const action=q.entry.lastAction;const p=H.C(0,0,f+1.8);for(let i=0;i<150;i++){const dx=p.x-q.avatar.position.x,dz=p.z-q.avatar.position.z,dist=Math.hypot(dx,dz);if(dist<.015)break;const k=Math.min(1,.08/dist);q.moveAvatar(dx*k,dz*k,.025);q.updateEntry(.025);}for(let i=0;i<90;i++)q.updateEntry(.05);const wall=H.C(H.w/2-.1,0,0);return {opened,action,inside:q.entry.inside,roofHidden:q.groups['house-roof'].every(m=>!m.isEnabled()),frontHidden:q.groups['house-front'].every(m=>!m.isEnabled()),wallBlocked:q.homeBlocked(wall.x,wall.z),floor:q.avatar.position.y-H.y};});
 assert(interior.opened&&interior.inside&&interior.roofHidden&&interior.frontHidden&&interior.wallBlocked);assert(interior.action.turnBeforeSwing&&interior.action.gripFrames>10&&interior.action.maxGripError<.02&&interior.action.maxReach<.78&&interior.action.swingDistance>.5,'hand must grip and follow door during opening');assert(Math.abs(interior.floor-.53)<.01);await capture('interior-casa',null,48);
 const closeReopen=await page.evaluate(()=>{const q=cvQA,H=q.home,f=-H.d/2;const tick=()=>{for(let i=0;i<180;i++)q.updateEntry(.05);};const before=q.entry.door;tick();const noAuto=q.entry.door===before;document.getElementById('door-action').click();tick();const closed=q.entry.lastAction,closedLeaf=q.entry.door===0;document.getElementById('door-action').click();tick();return {noAuto,closed,closedLeaf,reopened:q.entry.door===1&&q.entry.lastAction?.success};});
 assert(closeReopen.noAuto&&closeReopen.closedLeaf&&closeReopen.closed?.success&&closeReopen.closed.turnBeforeSwing&&closeReopen.closed.maxGripError<.02&&closeReopen.closed.swingDistance>.5&&closeReopen.reopened,'manual close and reopen');console.log('PASS articulated door open and close',JSON.stringify({open:interior.action,close:closeReopen.closed}));
 const exit=await page.evaluate(()=>{
 const q=cvQA,H=q.home,f=-H.d/2;
 const walk=(x,z)=>{const p=H.C(x,0,z);for(let i=0;i<220;i++){const dx=p.x-q.avatar.position.x,dz=p.z-q.avatar.position.z,dist=Math.hypot(dx,dz);if(dist<.015)break;const k=Math.min(1,.08/dist);q.moveAvatar(dx*k,dz*k,.025);q.updateEntry(.025);}return Math.hypot(p.x-q.avatar.position.x,p.z-q.avatar.position.z);};
 const initial=q.homeLocal(q.avatar.position.x,q.avatar.position.z);
 const hinge=-H.doorW/2+.035,theta=-q.entry.door*Math.PI*.49;
 const leaf=H.C(hinge+Math.cos(theta)*.6,0,f-.055-Math.sin(theta)*.6);
 const leafBlocked=q.homeBlocked(leaf.x,leaf.z);
 // Reopening from indoors leaves the actor on the hinge side of the open leaf.
 // Move around its free tip, then down the clear doorway and the stairs.
 const routeErrors=[walk(initial.x,f+2.2),walk(0,f+2.2),walk(0,f+.8),walk(0,f-4.1)];
 for(let i=0;i<90;i++)q.updateEntry(.05);
 const partialBeta=q.scene.activeCamera.beta*180/Math.PI,mode=q.entry.mode,restored=q.groups['house-roof'].every(m=>m.isEnabled())&&q.groups['house-front'].every(m=>m.isEnabled());
 const outside=H.C(0,0,f-6.5);q.avatar.position.copyFrom(outside);q.avatar.position.y=q.surfaceHeight(outside.x,outside.z);
 for(let i=0;i<120;i++)q.updateEntry(.05);
 return {initial,leafBlocked,routeErrors,mode,restored,partialBeta,beta:q.scene.activeCamera.beta*180/Math.PI,blend:q.entry.blend};});
 console.log('Exit route diagnostics',JSON.stringify(exit));assert(exit.leafBlocked,'open leaf must still block its physical footprint');assert(exit.routeErrors.every(e=>e<.06),'walk around open leaf, not through it');assert.equal(exit.mode,'exterior');assert(exit.restored);assert(exit.partialBeta>48&&exit.partialBeta<65);assert(Math.abs(exit.beta-48)<.25&&exit.blend===0);assert.deepEqual(errors,[]);fs.writeFileSync('qa/entrada-casa.json',JSON.stringify({entrance,tracking,interior,exit},null,2));console.log('PASS physical entrance surfaces, door and automatic camera',JSON.stringify({entrance,tracking,interior,exit}));
 // Shared real collision volumes, including lateral rails and the narrow stair access.
 const porch=await page.evaluate(()=>{
 const q=cvQA,H=q.home,f=-H.d/2,half=H.w*.385;
 const at=(x,z)=>{const p=H.C(x,0,z);return q.homeBlocked(p.x,p.z);};
 const rails=q.porchRails.every(r=>at((r.x1+r.x2)/2,(r.z1+r.z2)/2));
 const fixtures=q.porchFixtures.every(r=>at(r.x,r.z));
 const clearStair=!at(0,f-2.75);
 const start=H.C(-half+.65,0,f-1.4);q.avatar.position.copyFrom(start);q.avatar.position.y=q.surfaceHeight(start.x,start.z);
 const dir=H.C(-1,0,0).subtract(H.C(0,0,0));
 for(let i=0;i<60;i++)q.moveAvatar(dir.x*.08,dir.z*.08,.025);
 const stopped=q.homeLocal(q.avatar.position.x,q.avatar.position.z);
 return {rails,fixtures,clearStair,stopped,half};
 });
 assert(porch.rails&&porch.fixtures&&porch.clearStair&&porch.stopped.x> -porch.half,'porch rails and fixture collisions');
 // Interact with each separate planter via the real UI. No inventory or time simulation claimed.
 const visit=async id=>page.evaluate(id=>{const q=cvQA,p=q.planters.find(x=>x.id===id),v=q.home.C(p.x+(p.x<0?1:-1)*.92,0,p.z);q.avatar.position.copyFrom(v);q.avatar.position.y=q.surfaceHeight(v.x,v.z);q.updateGarden(Date.now()+1000);},id);
 await visit('porch-ceramic');await page.locator('#garden-action').click();await page.locator('[data-flower="rose"]').click();assert(await page.locator('[data-flower="daisy"]').isDisabled());
 await page.locator('#garden-close').click();await visit('porch-wooden');await page.locator('#garden-action').click();await page.locator('[data-flower="lavender"]').click();await page.locator('#garden-close').click();
 const crops=await page.evaluate(()=>{const q=cvQA;for(const p of q.planters)q.updateCrop(p,p.crop.plantedAt+90000);return q.planters.map(p=>({id:p.id,type:p.type,species:p.crop.species,stage:p.stage,vertices:p.mesh.getTotalVertices(),visible:p.mesh.isEnabled()}));});
 assert.equal(crops[0].species,'rose');assert.equal(crops[1].species,'lavender');assert(crops.every(p=>p.visible&&p.stage===1&&p.vertices>0));
 await page.evaluate(()=>{const q=cvQA;const p=q.home.C(0,0,-q.home.d/2-4.1);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<120;i++)q.updateEntry(.05);});
 await capture('varanda-cultivada',null,await page.evaluate(()=>cvQA.scene.activeCamera.beta*180/Math.PI));
 await page.reload();await page.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});await page.evaluate(()=>cvQA.engine.stopRenderLoop());
 const saved=await page.evaluate(()=>cvQA.planters.map(p=>p.crop?.species));assert.deepEqual(saved,['rose','lavender']);
 await visit('porch-ceramic');await page.locator('#garden-action').click();await page.locator('#garden-remove').click();await page.locator('[data-flower="daisy"]').click();
 assert.deepEqual(await page.evaluate(()=>cvQA.planters.map(p=>p.crop?.species)),['daisy','lavender']);
 assert.deepEqual(errors,[]);fs.writeFileSync('qa/varanda.json',JSON.stringify({porch,crops,saved},null,2));console.log('PASS porch rail and planter collision, species, growth and persistence',JSON.stringify({porch,crops,saved}));
 await page.close();
 // Emulated Android viewport validates the DPR bug; not a hardware benchmark.
 const mobile=await browser.newPage({viewport:{width:834,height:375},deviceScaleFactor:3.25,isMobile:true,hasTouch:true});
 mobile.setDefaultTimeout(90000);const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/');
 await mobile.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});
 const profileRead=()=>mobile.evaluate(()=>({quality:cvQA.quality,w:cvQA.engine.getRenderWidth(),h:cvQA.engine.getRenderHeight(),cssW:document.getElementById('view').clientWidth,cssH:document.getElementById('view').clientHeight,dpr:devicePixelRatio}));
 const profiles=[await profileRead()];
 assert.equal(profiles[0].quality,'equilibrado');assert(Math.abs(profiles[0].h-720)<=2,'mobile default resolution');
 for(const [key,target] of [['economico',540],['alto',1080],['equilibrado',720]]){
  await mobile.evaluate(key=>document.getElementById('quality-'+key).click(),key);
  const info=await profileRead();profiles.push(info);assert.equal(info.quality,key);assert(Math.abs(info.h-target)<=2,'profile '+key+' height');assert(Math.abs(info.w/info.h-info.cssW/info.cssH)<.015,'aspect ratio');
 }
 assert.equal(await mobile.evaluate(()=>getComputedStyle(document.getElementById('hud')).userSelect),'none');
 await mobile.evaluate(()=>document.getElementById('hud-toggle').click());assert(await mobile.locator('#hud-panel').isHidden());
 await mobile.evaluate(()=>document.getElementById('hud-toggle').click());assert(await mobile.locator('#hud-panel').isVisible());
 // Verify actual touch input, using Chromium's native touch events.
 const touchStart=await mobile.evaluate(()=>{const p=cvQA.avatar.position,r=document.getElementById('joy').getBoundingClientRect();const dirs=[[1,0],[-1,0],[0,1],[0,-1]];for(const [x,z] of dirs)if(!cvQA.blocked(p.x+x*.25,p.z+z*.25)&&!cvQA.blocked(p.x+x*.6,p.z+z*.6))return {px:p.x,pz:p.z,cx:r.x+r.width/2,cy:r.y+r.height/2,dx:x*30,dy:-z*30};return null;});
 assert(touchStart,'mobile spawn must permit movement');
 const cdp=await mobile.context().newCDPSession(mobile);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchStart.cx,y:touchStart.cy}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchStart.cx+1,y:touchStart.cy+1}]});
 assert(await mobile.evaluate(()=>cvQA.joy.x===0&&cvQA.joy.z===0),'touch jitter must stay in deadzone');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert(await mobile.evaluate(()=>cvQA.joy.x===0&&cvQA.joy.z===0));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchStart.cx,y:touchStart.cy}]});
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchStart.cx+touchStart.dx,y:touchStart.cy+touchStart.dy}]});
 await mobile.waitForFunction(p=>Math.hypot(cvQA.avatar.position.x-p.px,cvQA.avatar.position.z-p.pz)>.1,touchStart,{timeout:30000});
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const touchMoved=await mobile.evaluate(p=>Math.hypot(cvQA.avatar.position.x-p.px,cvQA.avatar.position.z-p.pz),touchStart);
 assert(touchMoved>.1);assert(await mobile.evaluate(()=>cvQA.gait.distance>.1&&cvQA.joy.x===0&&cvQA.joy.z===0));
 // Physical input path in an emulated mobile browser, not a programmatic button.click().
 // Set up a known start on the porch; actual door input and traversal use touch events.
 await mobile.evaluate(()=>{const q=cvQA,H=q.home,p=H.C(0,0,-H.d/2-.9);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<120;i++)q.updateEntry(.05);});
 await mobile.locator('#door-action').waitFor({state:'visible'});
 const doorRect=await mobile.locator('#door-action').boundingBox();
 const tap={x:doorRect.x+doorRect.width/2,y:doorRect.y+doorRect.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tap]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mobile.waitForFunction(()=>cvQA.entry.open&&cvQA.entry.door>.95&&!cvQA.entry.action,null,{timeout:30000});
 const entryTouch=await mobile.evaluate(()=>{const q=cvQA,H=q.home,forward=H.C(0,0,1).subtract(H.C(0,0,0)),a=q.scene.activeCamera.alpha+Math.PI/2,r=document.getElementById('joy').getBoundingClientRect();return {cx:r.x+r.width/2,cy:r.y+r.height/2,dx:30*(forward.x*Math.cos(a)+forward.z*Math.sin(a)),dy:-30*(-forward.x*Math.sin(a)+forward.z*Math.cos(a))};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:entryTouch.cx,y:entryTouch.cy}]});
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:entryTouch.cx+entryTouch.dx,y:entryTouch.cy+entryTouch.dy}]});
  await mobile.waitForFunction(()=>cvQA.entry.inside&&cvQA.homeLocal(cvQA.avatar.position.x,cvQA.avatar.position.z).z> -cvQA.home.d/2+1.65,null,{timeout:30000});
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const touchEntry=await mobile.evaluate(()=>({open:cvQA.entry.open,inside:cvQA.entry.inside,roofHidden:cvQA.groups['house-roof'].every(m=>!m.isEnabled()),local:cvQA.homeLocal(cvQA.avatar.position.x,cvQA.avatar.position.z)}));
 assert(touchEntry.open&&touchEntry.inside&&touchEntry.roofHidden);console.log('PASS actual Chromium touch on door and joystick entry',JSON.stringify(touchEntry));
 assert.deepEqual(mobileErrors,[]);
 fs.writeFileSync('qa/perfis-android.json',JSON.stringify({profiles,desktopMovement:moved,touchMovement:touchMoved,touchEntry},null,2));console.log('PASS emulated mobile profiles and touch',JSON.stringify({profiles,touchMoved}));
 await mobile.close();console.log('PASS geometry, initialization, camera, river and bridge logic; visual approval pending');
}finally{await browser.close()}
