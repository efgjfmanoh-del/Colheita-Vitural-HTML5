import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
import {calendarAt,cropSchedule,daylightAt,gameHoursToRealMs,REAL_MS_PER_GAME_DAY,DAYS_PER_MONTH,newWorldClock,elapsedWorldClock,upgradeWorldClock} from './src/world-calendar.js';
const startCalendar=calendarAt(0);assert.equal(startCalendar.hour,8);assert.equal(startCalendar.month,3);assert.equal(startCalendar.day,1);assert.equal(startCalendar.season,'Outono');
assert.equal(calendarAt(5000).minute,1);assert.equal(calendarAt(300000).hour,9);assert.equal(calendarAt(7200000).day,2);assert.equal(calendarAt(7200000).hour,8);
assert.equal(calendarAt(7*REAL_MS_PER_GAME_DAY).month,4);assert.equal(calendarAt(21*REAL_MS_PER_GAME_DAY).season,'Inverno');assert.equal(calendarAt(42*REAL_MS_PER_GAME_DAY).season,'Primavera');assert.equal(calendarAt(63*REAL_MS_PER_GAME_DAY).season,'Verão');assert.equal(calendarAt(84*REAL_MS_PER_GAME_DAY).year,2);
assert.equal(gameHoursToRealMs(4),1200000);assert.equal(cropSchedule('wheat',3).realMs,1200000);assert.equal(cropSchedule('wheat',12).realMs,1800000);assert.equal(daylightAt(12).daylight,1);assert.equal(daylightAt(0).daylight,0);
const legacy={schema:1,anchor:1000000,floor:4500000},migrationNow=7000000,migrated=upgradeWorldClock(legacy,migrationNow);
assert.equal(migrated.schema,2);assert.equal(elapsedWorldClock(migrated,migrationNow),12000000);
assert.equal(elapsedWorldClock(migrated,migrationNow+300000),12300000);
assert.equal(elapsedWorldClock(migrated,migrationNow-10000),12000000);
assert.deepEqual(upgradeWorldClock(migrated,migrationNow+7200000),migrated);
assert.equal(elapsedWorldClock(newWorldClock(1000),7201000),7200000);
console.log('PASS calendar exact 12x ratio, dates, seasons, year, crop schedules, daylight and legacy clock migration');
import {weatherAt,WEATHER_INTERVAL,newSoil,simulatePlot,prepareSpecies,harvestInfo} from './src/farm-simulation.js';
const soil=newSoil(0),seed=prepareSpecies({state:'tilled',soil},'wheat',0),watered={...seed,state:'watered',soil:{...seed.soil,moisture:.92}};
const sunny=()=>({kind:'sun',temperature:19,rain:false}),rainy=()=>({kind:'rain',temperature:19,rain:true});
assert(simulatePlot(watered,1200000,sunny).soil.progress>.95);
const dry=simulatePlot({...watered,soil:{...watered.soil,moisture:.03}},600000,sunny),wet=simulatePlot(watered,600000,sunny);assert(dry.soil.progress<wet.soil.progress);
const rain=simulatePlot(seed,600000,rainy);assert.equal(rain.state,'watered');
const irrigated=simulatePlot({...seed,soil:{...seed.soil,irrigated:true}},600000,sunny);assert.equal(irrigated.state,'watered');assert(irrigated.soil.moisture>=.58);
const rotated=prepareSpecies({state:'tilled',soil:{...soil,lastCrop:'wheat',fertility:.5}},'corn',0);assert(rotated.soil.fertility>.5);
assert(harvestInfo({...watered,soil:{...soil,fertility:1,pest:0}}).units>harvestInfo({...watered,soil:{...soil,fertility:.3,pest:.9}}).units);
assert.deepEqual(weatherAt(3*WEATHER_INTERVAL),weatherAt(3*WEATHER_INTERVAL));assert.equal(cropSchedule('rice',3).hours,12);assert.equal(cropSchedule('strawberry',4).hours,5);
console.log('PASS agriculture climate, rain, irrigation, moisture, crop schedules, fertility, rotation and yield');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});await page.waitForFunction(()=>cvQA.perf.fps!==null,null,{timeout:90000});
 await page.evaluate(()=>{document.getElementById('audio-effects').click();document.getElementById('audio-ambient').click();const v=document.getElementById('audio-volume');v.value='20';v.dispatchEvent(new Event('input'));});const audioPref=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv.audio.v1')));assert.deepEqual(audioPref,{effects:false,ambient:false,volume:20});await page.evaluate(()=>{document.getElementById('audio-effects').click();document.getElementById('audio-ambient').click();const v=document.getElementById('audio-volume');v.value='35';v.dispatchEvent(new Event('input'));});console.log('PASS audio controls and persisted settings');
 const ruralCamera=await page.evaluate(()=>({profile:cvQA.cameraProfile,beta:cvQA.scene.activeCamera.beta*180/Math.PI,span:cvQA.scene.activeCamera.orthoRight-cvQA.scene.activeCamera.orthoLeft,alpha:cvQA.scene.activeCamera.alpha*180/Math.PI}));assert(ruralCamera.profile==='rural'&&Math.abs(ruralCamera.beta-56)<.1&&Math.abs(ruralCamera.span-36)<.1&&Math.abs(ruralCamera.alpha+70)<.1);await page.screenshot({path:'qa/camera-rural.png'});await page.evaluate(()=>cvQA.selectCameraProfile('ampla'));console.log('Camera profile rural',JSON.stringify(ruralCamera));
 const result=await page.evaluate(()=>{const {groups,componentCounts,batching,ground,scene,layout,avatar,onBridge,blocked}=cvQA;return {meshes:scene.meshes.length,batching,canopy:cvQA.canopyStats,bank:cvQA.bankStats,triangles:scene.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),cameraBetaDegrees:scene.activeCamera.beta*180/Math.PI,flowInstancing:cvQA.flowInstancing,road:cvQA.roadMetrics,dormer:componentCounts.house,bridgeClearSamples:cvQA.bridgeEnds.reduce((count,p,i,arr)=>{if(i)return count;const b=arr[1];for(let k=1;k<40;k++){const t=k/40;if(!blocked(p[0]+(b[0]-p[0])*t,p[2]+(b[2]-p[2])*t))count++;}return count},0),doghouseBlocked:blocked(cvQA.dogHome.x,cvQA.dogHome.z),wellBlocked:blocked(cvQA.well[0],cvQA.well[2]),fpsSoftware:cvQA.perf.fps,frameTimeP95Ms:cvQA.perf.p95Ms,measurementFrames:cvQA.perf.frames,shadowRefreshes:cvQA.shadowCache.refreshes,treePositions:cvQA.treePositions.length,fenceSegments:cvQA.fenceColliders.length,vertices:ground.getTotalVertices(),house:componentCounts.house,doghouse:componentCounts.doghouse,well:componentCounts.cistern,water:componentCounts.river,falls:componentCounts.waterfalls,fallIndices:groups.waterfalls.reduce((total,m)=>total+m.getTotalIndices(),0),fallMeshes:groups.waterfalls.length,trees:Object.keys(groups).filter(k=>k.startsWith('forest')||k.startsWith('sakura')).length,externalTextures:scene.textures.filter(t=>t.url&&/mapa|https?:/i.test(t.url)).length,bridge:onBridge((layout.bridges[0].ends[0][0]+layout.bridges[0].ends[1][0]-800)/16,-((layout.bridges[0].ends[0][1]+layout.bridges[0].ends[1][1])/2-145)/6.553),spawn:[avatar.position.x,avatar.position.z],river:cvQA.riverMotionMetrics,dog:componentCounts.dog,waterBlocked:blocked((183-400)/8,-(20-145)/6.553)}});
 const craft=await page.evaluate(()=>({...cvQA.roofCraft,roofMeshes:cvQA.groups['house-roof'].filter(m=>m.material?.name==='individual curved terracotta tiles').length,porchMeshes:cvQA.groups['house-porch-roof'].filter(m=>m.material?.name==='individual curved terracotta tiles').length}));
 console.log('Colonial roof and window planters',JSON.stringify(craft));
 assert.equal(craft.fields,3);assert(craft.tiles>400&&craft.tiles<2000);assert.equal(craft.vertices,craft.tiles*14);assert.equal(craft.triangles,craft.tiles*12);assert.equal(craft.flowerBoxes,2);assert.equal(craft.flowerHeads,18);assert(craft.roofMeshes>=1&&craft.porchMeshes>=1);
 const facade=await page.evaluate(()=>({...cvQA.facadeCraft,plaster:cvQA.scene.materials.find(m=>m.name==='warm cream')?.diffuseTexture?.name,blueDoor:cvQA.groups['house-door'].some(m=>m.name==='solid swinging door'&&m.material?.name==='painted rural blue')}));
 console.log('Limewashed farmhouse facade',JSON.stringify(facade));assert.equal(facade.plaster,'limewash plaster');assert.equal(facade.plinths,5);assert.equal(facade.sideFlowerBoxes,4);assert(facade.blueDoor);
 const clockText=await page.locator('#world-clock').innerText();assert(/^\d\d:\d\d$/.test(clockText)&&/Ano 1.*Outono/.test(await page.locator('#world-date-detail').innerText()),'calendar must be visible');
 const initialHud=await page.evaluate(()=>{const p=document.getElementById('world-calendar').getBoundingClientRect(),n=document.getElementById('ranch-hud').getBoundingClientRect(),b=document.getElementById('calendar-toggle').getBoundingClientRect();return {width:p.width,left:p.left,top:p.top,nameX:n.left,nameY:n.top,buttonX:b.left};});const initialHudWidth=initialHud.width;await page.locator('#calendar-toggle').click();await page.waitForFunction(w=>document.getElementById('world-calendar').getBoundingClientRect().width<w-50,initialHudWidth);
 const compactHud=await page.evaluate(()=>{const p=document.getElementById('world-calendar');return {compact:p.classList.contains('compact'),name:document.getElementById('ranch-hud').textContent,time:document.getElementById('world-clock').textContent,date:document.getElementById('world-date').textContent,temp:document.getElementById('world-temp').textContent,phase:document.getElementById('world-phase-icon').getAttribute('aria-label'),hidden:[...p.querySelectorAll('.calendar-extra')].every(e=>e.getAttribute('aria-hidden')==='true'),pref:localStorage.getItem('cv.calendarHUD.v1')};});assert(compactHud.compact&&compactHud.name&&/^\d\d:\d\d$/.test(compactHud.time)&&/^\d\d\/\d\d$/.test(compactHud.date)&&/\d+\.\d °C/.test(compactHud.temp)&&compactHud.phase&&compactHud.hidden&&compactHud.pref==='compact');
 await page.waitForFunction(()=>document.getElementById('world-calendar').getBoundingClientRect().width<=182);
 const horizontalHud=await page.evaluate(()=>{const p=document.getElementById('world-calendar'),r=p.getBoundingClientRect(),n=document.getElementById('ranch-hud').getBoundingClientRect(),b=document.getElementById('calendar-toggle').getBoundingClientRect(),detail=getComputedStyle(document.getElementById('calendar-details'));return {left:r.left,top:r.top,nameX:n.left,nameY:n.top,buttonX:b.left,detailOpacity:Number(detail.opacity),arrow:getComputedStyle(document.querySelector('#calendar-toggle svg')).transform};});
 assert(Math.abs(horizontalHud.left-initialHud.left)<.1&&Math.abs(horizontalHud.top-initialHud.top)<.1&&Math.abs(horizontalHud.nameX-initialHud.nameX)<.1&&Math.abs(horizontalHud.nameY-initialHud.nameY)<.1&&horizontalHud.buttonX<initialHud.buttonX-50&&horizontalHud.detailOpacity<.05&&horizontalHud.arrow.startsWith('matrix(-1'));
 console.log('PASS left-anchored horizontal HUD',JSON.stringify({initialHud,horizontalHud}));await page.screenshot({path:'qa/hud-recolhido.png'});await page.locator('#calendar-toggle').click();assert.equal(await page.locator('#calendar-toggle').getAttribute('aria-expanded'),'true');await page.waitForFunction(()=>document.getElementById('world-calendar').getBoundingClientRect().width>350);await page.screenshot({path:'qa/hud-expandido.png'});console.log('PASS retractable ranch HUD',JSON.stringify(compactHud));
 const metricText=await page.locator('#metrics').innerText();assert(/P95 \d+\.\d+ ms · \d+×\d+ · \d+ quadros/.test(metricText),'physical-test telemetry must be visible');
 console.log(JSON.stringify(result));fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/resultado.json',JSON.stringify(result,null,2));assert(result.vertices>10000);assert(Number.isFinite(result.fpsSoftware)&&result.fpsSoftware>0);assert(result.measurementFrames>=2);assert(result.treePositions>=25);assert(result.fenceSegments>20);assert(result.shadowRefreshes>=1);assert(result.frameTimeP95Ms>0);assert(result.batching.merged>100);assert(result.bank.blocks>100);assert(result.bank.boulders>0);assert(result.bank.understory>=80);assert.equal(result.bank.understoryVertices,result.bank.understory*60);assert(result.canopy.trees>=25);assert.equal(result.canopy.leaves,result.canopy.trees*300);assert(result.canopy.petals>0);assert.equal(result.canopy.vertices,(result.canopy.leaves+result.canopy.petals)*7);assert(Math.abs(result.cameraBetaDegrees-48)<.01);assert(result.road.sections>20);assert.equal(result.road.material,'dirt');assert.equal(result.road.stones,0,'stone is reserved for the residential road');assert.equal(result.road.vertices,result.road.sections*7);assert.equal(result.road.indices,result.road.segments*36);assert.equal(result.bridgeClearSamples,39,'bridge centerline must be walkable');assert(result.doghouseBlocked&&result.wellBlocked);assert(result.flowInstancing.before>10);assert.equal(result.flowInstancing.after,1);assert.equal(result.flowInstancing.instances,result.flowInstancing.before);assert(result.batching.after<result.batching.before);assert(result.house>80&&result.doghouse>10&&result.well>30);assert(result.water>10&&result.trees>5);assert.equal(result.falls,result.river.fallSegments+result.river.fallGroups,'one logical water face per steep segment and one foam mesh per fall group');assert.equal(result.fallIndices,result.river.fallSegments*6+result.river.foamArcs*8*6,'all waterfall and foam triangles must survive batching');assert(result.fallMeshes>0&&result.fallMeshes<=result.falls,'renderable waterfall geometry must exist');assert.equal(result.externalTextures,0);assert(result.river.joins>30);assert.equal(result.river.maxGap,0);assert(result.river.fallSegments>=2);assert.equal(result.river.fallGroups,2,'two residential cascades');assert(result.river.maxSlope>1,'cascade must drop more than one metre per metre horizontal');assert.equal(result.river.foamArcs,72);assert(result.dog>10);assert.equal(result.bridge,true);assert.equal(result.waterBlocked,true);
 // The 1E run exhausted Playwright's screenshot budget with the continuous render loop.
 // Record the benchmark first, then freeze the loop and capture actual rendered canvas frames.
 await page.evaluate(()=>cvQA.engine.stopRenderLoop());
 const chimney=await page.evaluate(()=>{
  const q=cvQA,old=q.quality;q.selectQuality('equilibrado');q.updateChimneySmoke(0,true);
  const p=q.smokePuffs[0];p.phase=.20;q.updateChimneySmoke(0,true);const y=p.mesh.position.y,size=p.mesh.scaling.x;
  q.updateChimneySmoke(.1,true);const rising=p.mesh.position.y>y&&p.mesh.scaling.x>size;
  const all=q.smokePuffs.every(p=>p.mesh.isEnabled()&&p.mesh.position.y>=q.smokeOrigin.y&&p.mesh.visibility>=0&&p.mesh.visibility<=1);
  q.updateChimneySmoke(0,false);const hidden=q.smokePuffs.every(p=>!p.mesh.isEnabled());
  q.selectQuality('economico');q.updateChimneySmoke(0,true);const economical=q.smokePuffs.filter(p=>p.mesh.isEnabled()).length;
  q.selectQuality(old);q.updateChimneySmoke(0,true);
  return {count:q.smokePuffs.length,rising,all,hidden,economical};
 });
 console.log('Chimney smoke pool',JSON.stringify(chimney));
 assert.equal(chimney.count,6);assert(chimney.rising&&chimney.all&&chimney.hidden);assert.equal(chimney.economical,3);
 // Quality selection resets the measured FPS window; retain the prior benchmark in result.

 async function capture(name,control,expectedBeta=48){
  const frame=await page.evaluate(control=>{if(control)document.getElementById(control).click();cvQA.scene.render();const canvas=document.getElementById('view');const probe=document.createElement('canvas');probe.width=64;probe.height=36;const ctx=probe.getContext('2d');ctx.drawImage(canvas,0,0,64,36);const data=ctx.getImageData(0,0,64,36).data;const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add((data[i]<<16)|(data[i+1]<<8)|data[i+2]);return {png:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,colors:colors.size,beta:cvQA.scene.activeCamera.beta*180/Math.PI};},control);
  assert(Math.abs(frame.beta-expectedBeta)<.25,'camera tilt changed during '+name);assert(frame.width>=640&&frame.height>=360,'capture dimensions');assert(frame.colors>100,'capture must contain real varied scene pixels');
  assert(frame.png.startsWith('data:image/png;base64,'));const bytes=Buffer.from(frame.png.split(',')[1],'base64');assert(bytes.length>10000,'capture PNG size');fs.writeFileSync('qa/'+name+'.png',bytes);console.log('Captured '+name+' '+frame.width+'x'+frame.height+' '+bytes.length+' bytes');
 }
 // Validate world-space rain, roof/river collisions, bounded pools and actual render.
 const rainQA=await page.evaluate(()=>{
  const q=cvQA,H=q.home,old=q.weatherVisual,roof=H.C(0,0,0),deck=q.bridgeEnds.map(v=>v),river=q.riverSegments.find(p=>q.rainSurface(p.x,p.z).kind==='river'),front=q.facadeCraft.upperWindows;
  for(let i=0;i<180;i++)q.updateRain(.05,{kind:'rain',rain:true});
  const result={roof:q.rainSurface(roof.x,roof.z),river:river&&q.rainSurface(river.x,river.z),bridge:q.rainSurface((deck[0][0]+deck[1][0])/2,(deck[0][2]+deck[1][2])/2),stats:JSON.parse(JSON.stringify(q.rainStats)),pool:q.rainPool.length,impacts:q.impactPool.length,overlay:!!document.getElementById('rain-overlay'),icon:q.weatherPresentation({kind:'rain',rain:true,slot:1,label:'Chuva'},{daylight:1},12).icon,nightIcon:q.weatherPresentation({kind:'sun',rain:false,slot:1,label:'Sol'},{daylight:0},0).icon,windowGap:Math.min(...front.map(w=>w.bottom-q.facadeCraft.porchRoofHigh)),aligned:front[0].y===front[1].y&&q.facadeCraft.sideWindows.every(w=>w.y===front[0].y),puddles:q.puddles.filter(p=>p.mesh.isEnabled()).length};
  return result;
 });
 console.log('World rain diagnostics',JSON.stringify(rainQA));assert.equal(rainQA.roof.kind,'roof');assert.equal(rainQA.river?.kind,'river');assert.equal(rainQA.bridge.kind,'deck');assert(rainQA.stats.impacts.roof>0&&rainQA.stats.impacts.river>0&&rainQA.stats.impacts.ground>0&&rainQA.stats.runoff>0);assert(rainQA.stats.wetness>.32&&rainQA.puddles>0);assert.equal(rainQA.pool,420);assert.equal(rainQA.impacts,96);assert(!rainQA.overlay&&rainQA.aligned&&rainQA.windowGap>.15);assert.equal(rainQA.icon,'🌦️');assert.equal(rainQA.nightIcon,'🌙');
 fs.writeFileSync('qa/chuva-3d.json',JSON.stringify(rainQA,null,2));
 await capture('chuva-3d',null);
 await page.evaluate(()=>{const q=cvQA;for(let i=0;i<1900;i++)q.updateRain(.1,{kind:'sun',rain:false});q.updateRain(0,q.weatherVisual);});
 // Check actual full-width deck overlap, field entry, fences and central aisle.
 const links=await page.evaluate(()=>{
 const q=cvQA,c=q.connectionQA,axis=c.bridgeAxis,side=c.bridgeSide;
 const evaluate=(row,end)=>{const project=(p,v)=>(p.x-end[0])*v.x+(p.z-end[2])*v.z;return {centerError:Math.hypot(row[1].x-end[0],row[1].z-end[2]),axisError:Math.max(...row.map(p=>Math.abs(project(p,axis)))),left:project(row[0],side),right:project(row[2],side),deckGap:Math.abs(c.deckLength-c.bridgePlankCount*c.bridgePlankDepth),verticalError:Math.max(...row.map(p=>Math.abs(p.y-c.deckTop)))};};
 const entry=evaluate(c.bridgeEntryRow,q.bridgeEnds[0]),exit=evaluate(c.bridgeExitRow,q.bridgeEnds[1]),gate=q.wheatGate;
 return {entry,exit,clearGate:!q.blocked(gate.x,gate.z),fence:q.fieldRails.every(([a,b])=>q.blocked((a.x+b.x)/2,(a.z+b.z)/2)),traversable:q.approachCurve.filter((p,i)=>i%2===0).every(p=>!q.blocked(p.x,p.z)),inside:q.inWheat(c.fieldEnd.x,c.fieldEnd.z),residenceClearance:Math.min(...q.residenceRails.flatMap(([a,b])=>Array.from({length:13},(_,k)=>q.roadClearance(q.pathRows,a.x+(b.x-a.x)*k/12,a.z+(b.z-a.z)*k/12)))),fieldClearance:Math.min(...q.fieldRails.flatMap(([a,b])=>Array.from({length:13},(_,k)=>q.roadClearance(q.approachRows,a.x+(b.x-a.x)*k/12,a.z+(b.z-a.z)*k/12)))),plots:q.wheatPlots.length,beds:q.wheatBeds.length,aisle:q.wheatBeds.every(b=>b.x2<=gate.x-1.65||b.x1>=gate.x+1.65)};
 });
 console.log('Physical connection and wheat sector',JSON.stringify(links));fs.writeFileSync('qa/conexoes-campo.json',JSON.stringify(links,null,2));
 for(const p of [links.entry,links.exit])assert(p.centerError<1e-6&&p.axisError<1e-6&&Math.abs(p.left+1.575)<1e-6&&Math.abs(p.right-1.575)<1e-6&&p.deckGap<1e-6&&p.verticalError<1e-6,'bridge full-width flush abutment required');
 assert(links.clearGate&&links.fence&&links.traversable&&links.inside&&links.beds>=6&&links.plots>=30&&links.aisle,'wheat field must be connected and accessible');assert(links.residenceClearance>.34&&links.fieldClearance>.10,'fences must not cross paths');
 const landscape=await page.evaluate(()=>({terrain:cvQA.terrainSkirtStats,beds:cvQA.bedSurfaceStats,road:cvQA.roadMetrics,plots:cvQA.wheatPlots.length}));
 assert(landscape.terrain.margin>=64&&landscape.terrain.maxJoinGap<1e-6&&landscape.terrain.vertices<10000);
 assert(landscape.beds.continuousBeds===8&&landscape.beds.plotGaps===0&&landscape.plots===72&&landscape.road.fineGravel&&landscape.road.stones===0);
 const soilCoverage=await page.evaluate(()=>{const q=cvQA;const rows=q.wheatBeds.map(b=>{const ps=q.bedPlots.get(b.id),widths=ps.map(p=>p.x2-p.x1);return {id:b.id,count:ps.length,first:ps[0].x1-b.x1,last:b.x2-ps.at(-1).x2,gap:Math.max(...ps.slice(1).map((p,i)=>Math.abs(p.x1-ps[i].x2))),widthDelta:Math.max(...widths)-Math.min(...widths)};});const dry=q.soilTone('tilled',.20),wet=q.soilTone('tilled',.95),m=q.wheatFurrows.material;return {rows,stats:q.bedSurfaceStats,dry:dry.asArray(),wet:wet.asArray(),gloss:m.specularColor.asArray(),vertices:q.wheatFurrows.getTotalVertices(),oldLayer:!!q.groups['wheat prepared soil']?.length};});
 console.log('Continuous soil coverage and wet color',JSON.stringify(soilCoverage));assert(soilCoverage.rows.every(r=>r.count===9&&Math.abs(r.first)<1e-8&&Math.abs(r.last)<1e-8&&r.gap<1e-8&&r.widthDelta<1e-8));assert(soilCoverage.stats.maxWidth-soilCoverage.stats.minWidth<1e-6&&soilCoverage.stats.maxBoundaryGap<1e-8);assert(soilCoverage.wet.every((v,i)=>v<soilCoverage.dry[i])&&soilCoverage.gloss.every(v=>v===0));assert(soilCoverage.vertices>0&&!soilCoverage.oldLayer);fs.writeFileSync('qa/solo-continuo.json',JSON.stringify(soilCoverage,null,2));

 fs.writeFileSync('qa/paisagem.json',JSON.stringify(landscape,null,2));console.log('PASS continuous landscape, bed ribbons and fine gravel texture',JSON.stringify(landscape));
 // Normal exploration must follow from the residential sector to the remote field.
 const explore=await page.evaluate(()=>{
  const q=cvQA,c=q.scene.activeCamera,old=q.avatar.position.clone(),start=c.target.clone();
  const bootFollow=q.cameraFollow;
  document.getElementById('wide').click();const width=c.orthoRight-c.orthoLeft;
  const locations=[q.wheatPlots.at(-1),{x:old.x-12,z:old.z-9},old];
  const visits=[];
  for(const p of locations){
   q.avatar.position.set(p.x,q.surfaceHeight(p.x,p.z),p.z);
   for(let i=0;i<160;i++)q.updateEntry(.05);
   visits.push({error:Math.hypot(c.target.x-p.x,c.target.z-p.z),width:c.orthoRight-c.orthoLeft,beta:c.beta*180/Math.PI,following:q.cameraFollow});
  }
  q.avatar.position.copyFrom(old);for(let i=0;i<160;i++)q.updateEntry(.05);
  return {bootFollow,width,visits,qaHidden:document.getElementById('hud-panel').hidden,menuSeparate:document.getElementById('player-menu').contains(document.getElementById('controls-open'))};
 });
 console.log('Wide exploration follows across sectors',JSON.stringify(explore));
 assert(explore.bootFollow&&explore.qaHidden&&explore.menuSeparate);
 assert(explore.visits.every(v=>v.error<.12&&Math.abs(v.width-explore.width)<.1&&Math.abs(v.beta-48)<.25&&v.following));
 fs.writeFileSync('qa/camera-exploracao.json',JSON.stringify(explore,null,2));
 await capture('campo-trigo','field-view');
 await capture('visao-geral-retorno','wide');
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
 // Controlled, frame-independent sprint/brake test on a clear piece of outdoor terrain.
 const runTest=await page.evaluate(()=>{
  const q=cvQA,original=q.avatar.position.clone(),yaw=q.avatar.rotation.y;
  let route=null;
  // Spawn is near the bridge. Search deterministically for real dry, clear terrain.
  for(let radius=0;radius<=24&&!route;radius+=.5){
   for(let a=0;a<16&&!route;a++){
    const start=original.clone();start.x+=Math.cos(a*Math.PI/8)*radius;start.z+=Math.sin(a*Math.PI/8)*radius;start.y=q.surfaceHeight(start.x,start.z);
    if(q.blocked(start.x,start.z)||!q.dustAllowed(start.x,start.z))continue;
    const dir=[[1,0],[-1,0],[0,1],[0,-1]].find(([x,z])=>Array.from({length:20},(_,i)=>(i+1)*.10).every(k=>!q.blocked(start.x+x*k,start.z+z*k)&&q.dustAllowed(start.x+x*k,start.z+z*k)&&Math.abs(q.surfaceHeight(start.x+x*k,start.z+z*k)-start.y)<.2));
    if(dir)route={start,dir};
   }
  }
  if(!route)throw Error('No clear dry-ground sprint test direction');
  const [x,z]=route.dir;q.avatar.position.copyFrom(route.start);q.resetSprint();
  let walk=0;for(let i=0;i<8;i++)walk+=q.updateLocomotion(x,z,1/60,false);
  q.avatar.position.copyFrom(route.start);q.resetSprint();
  let run=0;for(let i=0;i<8;i++)run+=q.updateLocomotion(x,z,1/60,true);
  const speed=q.sprint.speed,lean=q.sprint.lean,bursts=q.sprint.bursts;
  let coast=0,minLean=0;for(let i=0;i<15;i++){coast+=q.updateLocomotion(0,0,1/60,false);minLean=Math.min(minLean,q.sprint.lean);}
  const burstCount=q.sprint.bursts-bursts,particles=q.dustPool.filter(p=>p.mesh.isEnabled()).length;
  const stop=q.updateLocomotion(0,0,.05,false);
  for(let i=0;i<50;i++){q.updateDust(.02);q.updateLocomotion(0,0,.02,false);}
  const cleared=q.dustPool.every(p=>!p.mesh.isEnabled());
  const countBeforeSurfaceTest=q.sprint.bursts;
  const bridge=q.bridgeEnds;
  q.avatar.position.copyFromFloats((bridge[0][0]+bridge[1][0])/2,(bridge[0][1]+bridge[1][1])/2,(bridge[0][2]+bridge[1][2])/2);
  const bridgeAllowsDust=q.dustAllowed(q.avatar.position.x,q.avatar.position.z);q.emitBrakeDust();
  const porch=q.home.C(0,0,-q.home.d/2-1.5);q.avatar.position.copyFrom(porch);const porchAllowsDust=q.dustAllowed(porch.x,porch.z);q.emitBrakeDust();
  const inside=q.home.C(0,0,0);q.avatar.position.copyFrom(inside);const interiorAllowsDust=q.dustAllowed(inside.x,inside.z);q.emitBrakeDust();
  const forbiddenBursts=q.sprint.bursts-countBeforeSurfaceTest;
  q.avatar.position.copyFrom(original);q.avatar.rotation.y=yaw;q.resetSprint();
  return {walk,run,speed,lean,coast,minLean,burstCount,particles,stop,cleared,bridgeAllowsDust,porchAllowsDust,interiorAllowsDust,forbiddenBursts,start:route.start.asArray()};
 });
 console.log('Sprint diagnostics',JSON.stringify(runTest));fs.writeFileSync('qa/corrida.json',JSON.stringify(runTest,null,2));
 assert(runTest.run>runTest.walk*1.20&&runTest.speed>6.5&&runTest.lean>.04,'sprint must be faster and lean forward');
 assert(runTest.coast>0&&runTest.coast<=.31&&runTest.minLean<-.04&&runTest.stop===0,'bounded brake and body lean');
 assert(runTest.burstCount===1&&runTest.particles>0&&runTest.cleared,'bounded foot dust burst must expire');
 assert(!runTest.bridgeAllowsDust&&!runTest.porchAllowsDust&&!runTest.interiorAllowsDust&&runTest.forbiddenBursts===0,'no dust on built surfaces');
 fs.writeFileSync('qa/corrida.json',JSON.stringify(runTest,null,2));console.log('PASS sprint, bounded braking and pooled dust',JSON.stringify(runTest));
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
 const gable=await page.evaluate(()=>cvQA.polyQA.filter(p=>p.name.startsWith('gable')));console.log('Complete gable triangles and UVs',JSON.stringify(gable));assert(gable.filter(p=>p.vertices===4).length===3&&gable.every(p=>p.uvs===p.vertices&&p.triangles===p.vertices-2&&p.area>0));
 const entrance=await page.evaluate(()=>{const q=cvQA,H=q.home,f=-H.d/2;const place=(x,z)=>{const p=H.C(x,0,z);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);};const walk=(x,z)=>{const p=H.C(x,0,z);for(let i=0;i<150;i++){const dx=p.x-q.avatar.position.x,dz=p.z-q.avatar.position.z,dist=Math.hypot(dx,dz);if(dist<.015)break;const k=Math.min(1,.08/dist);q.moveAvatar(dx*k,dz*k,.025);q.updateEntry(.025);}return q.homeLocal(q.avatar.position.x,q.avatar.position.z);};const tick=()=>{for(let i=0;i<90;i++)q.updateEntry(.05);};place(0,f-3.90-q.porchExtension);tick();const approachBeta=q.scene.activeCamera.beta*180/Math.PI;const approachWeight=q.entry.cameraWeight;const approachMode=q.entry.mode;const levels=[];for(const z of [f-3.55-q.porchExtension,f-3.20-q.porchExtension,f-2.85-q.porchExtension,f-2.2,f-.8]){walk(0,z);levels.push(q.avatar.position.y-H.y);}tick();const beta=q.scene.activeCamera.beta*180/Math.PI;const stopped=walk(0,f+.6).z<f+.1;return {levels,beta,approachBeta,approachWeight,approachMode,stopped,mode:q.entry.mode,doorVisible:!document.getElementById('door-action').hidden,roofVisible:q.groups['house-roof'].every(m=>m.isEnabled())};});
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
 const routeErrors=[walk(initial.x,f+2.2),walk(0,f+2.2),walk(0,f+.8),walk(0,f-4.1-q.porchExtension)];
 for(let i=0;i<90;i++)q.updateEntry(.05);
 const partialBeta=q.scene.activeCamera.beta*180/Math.PI,mode=q.entry.mode,restored=q.groups['house-roof'].every(m=>m.isEnabled())&&q.groups['house-front'].every(m=>m.isEnabled());
 const outside=H.C(0,0,f-6.5-q.porchExtension);q.avatar.position.copyFrom(outside);q.avatar.position.y=q.surfaceHeight(outside.x,outside.z);
 for(let i=0;i<120;i++)q.updateEntry(.05);
 return {initial,leafBlocked,routeErrors,mode,restored,partialBeta,beta:q.scene.activeCamera.beta*180/Math.PI,blend:q.entry.blend};});
 console.log('Exit route diagnostics',JSON.stringify(exit));assert(exit.leafBlocked,'open leaf must still block its physical footprint');assert(exit.routeErrors.every(e=>e<.06),'walk around open leaf, not through it');assert.equal(exit.mode,'exterior');assert(exit.restored);assert(exit.partialBeta>48&&exit.partialBeta<65);assert(Math.abs(exit.beta-48)<.25&&exit.blend===0);assert.deepEqual(errors,[]);fs.writeFileSync('qa/entrada-casa.json',JSON.stringify({entrance,tracking,interior,exit},null,2));console.log('PASS physical entrance surfaces, door and automatic camera',JSON.stringify({entrance,tracking,interior,exit}));
 // Camera coverage behind and beside major buildings, then restore the original view.
 const stability=await page.evaluate(()=>{
  const q=cvQA;q.worldInput(0,0,0);const a=q.worldInput(0,1,0),b=q.worldInput(0,1,Math.PI),c=q.worldInput(0,1,Math.PI/2);q.worldInput(0,0,Math.PI);const d=q.worldInput(0,1,Math.PI);q.worldInput(0,0,0);
  const rocks=q.rockColliders.filter(r=>!q.onBridge(r.x,r.z));return {a,b,c,d,rocks:rocks.length,blocked:rocks.every(r=>q.rockBlocked(r.x,r.z)),escape:q.obstacleEntered(-.1,-.2)===false&&q.obstacleEntered(-.2,-.1)===true};
 });
 console.log('Stable input frame and rock collision',JSON.stringify(stability));assert.deepEqual(stability.a,stability.b);assert.deepEqual(stability.a,stability.c);assert(Math.hypot(stability.a.x-stability.d.x,stability.a.z-stability.d.z)>1.99);assert(stability.rocks>100&&stability.blocked&&stability.escape);
 const orbitQA=await page.evaluate(()=>{
  const q=cvQA,H=q.home,cam=q.scene.activeCamera,base=cam.alpha,initialBeta=cam.beta,old=q.avatar.position.clone();
  const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  const go=(x,z)=>{const p=H.C(x,0,z);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<140;i++)q.updateEntry(.05);const zone=q.exteriorCameraZone(p.x,p.z);return {side:q.entry.cameraSide,weight:q.entry.cameraWeight,alpha:cam.alpha,error:zone?angle(cam.alpha,zone.alpha):null,roofVisible:q.groups['house-roof'].every(m=>m.isEnabled()),interior:q.entry.inside};};
  const rear=go(0,H.d/2+1.05),right=go(H.w/2+1.05,0),left=go(-H.w/2-1.05,0);
  q.avatar.position.copyFrom(old);q.avatar.position.y=q.surfaceHeight(old.x,old.z);for(let i=0;i<160;i++)q.updateEntry(.05);
  return {rear,right,left,restored:angle(cam.alpha,base),betaError:Math.abs(cam.beta-initialBeta),blend:q.entry.blend,registry:q.cameraBuildings.length};
 });
 const houseTransition=await page.evaluate(()=>{const q=cvQA,H=q.home,old=q.avatar.position.clone(),f=-H.d/2;const place=z=>{const p=H.C(0,0,z);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);q.updateEntry(.05);};place(f-.5);const before=q.residenceShadowState.insideSwitches;for(let i=0;i<60;i++)place(f+(i%2?.20:.26));const jitter=q.residenceShadowState.insideSwitches-before;place(f+.65);for(let i=0;i<30;i++)q.updateEntry(.05);const interior=q.entry.inside&&q.groups['house-front'].every(m=>!m.isEnabled())&&[...q.residenceShadowState.members].every(([m,s])=>m.isEnabled()||!s.active);place(f-.6);for(let i=0;i<80;i++)q.updateEntry(.05);const restored=!q.entry.inside&&q.groups['house-front'].every(m=>m.isEnabled()&&m.visibility>.98);q.avatar.position.copyFrom(old);for(let i=0;i<90;i++)q.updateEntry(.05);return {jitter,interior,restored};});console.log('Threshold and shadow transition',JSON.stringify(houseTransition));assert(houseTransition.jitter===0&&houseTransition.interior&&houseTransition.restored);
 const camStability=await page.evaluate(()=>{const q=cvQA,c=q.cameraStability;c.zone=null;c.hold=0;const start=c.switches;const zones=[];for(let i=0;i<120;i++){const v=i%2?.09:.11;zones.push(q.stableCameraZone(v,{weight:.1,side:'left',alpha:0,id:'house'},false,.016)?.kind);}const switches=c.switches-start;for(let i=0;i<40;i++)q.stableCameraZone(0,null,false,.016);return {switches,unique:new Set(zones).size,cleared:c.zone===null,maxTurnRate:c.maxTurnRate};});
 console.log('Camera hysteresis and angular speed',JSON.stringify(camStability));assert(camStability.switches<=2&&camStability.unique===1&&camStability.cleared&&camStability.maxTurnRate<=1.150001);
 console.log('Major-building exterior camera',JSON.stringify(orbitQA));for(const side of ['rear','right','left']){assert.equal(orbitQA[side].side,side);assert(orbitQA[side].weight>.75&&orbitQA[side].error<.08&&orbitQA[side].roofVisible&&!orbitQA[side].interior);}assert(orbitQA.restored<.02&&orbitQA.betaError<.02&&orbitQA.blend===0);
 const terrainQA=await page.evaluate(()=>{
  const q=cvQA,old=q.avatar.position.clone();let candidate=null;
  // Find an actual moderate hillside traversable for one metre, with measurable elevation.
  for(let x=-43;x<-20&&!candidate;x+=.6)for(let z=5;z<19&&!candidate;z+=.5){
   const samples=Array.from({length:21},(_,i)=>({x,z:z+i*.05}));
   if(samples.some(p=>q.blocked(p.x,p.z)||Math.abs(q.surfaceHeight(p.x,p.z)-q.renderedTerrainY(p.x,p.z))>.045))continue;
   const rise=q.surfaceHeight(x,z+1)-q.surfaceHeight(x,z);if(rise>.045&&rise<.65)candidate={x,z,rise};
  }
  if(!candidate)return {candidate:null};const {x,z}=candidate;q.avatar.position.set(x,q.surfaceHeight(x,z),z);
  let maxError=0;for(let i=0;i<20;i++){q.moveAvatar(0,.05,.025);maxError=Math.max(maxError,Math.abs(q.avatar.position.y-q.renderedTerrainY(q.avatar.position.x,q.avatar.position.z)));}
  const climbed=q.avatar.position.y-q.surfaceHeight(x,z),distance=q.avatar.position.z-z;q.avatar.position.copyFrom(old);
  return {candidate,climbed,distance,maxError,wallRejected:!q.terrainMotionAllowed(x,z,x+.05,z,0,.8)};
 });
 console.log('Terrain contact and slope',JSON.stringify(terrainQA));assert(terrainQA.candidate&&terrainQA.distance>.95&&terrainQA.climbed>.04&&terrainQA.maxError<1e-5&&terrainQA.wallRejected);
 fs.writeFileSync('qa/camera-relevo.json',JSON.stringify({orbitQA,terrainQA},null,2));
 // Shared real collision volumes, including lateral rails and the narrow stair access.
 const porch=await page.evaluate(()=>{
 const q=cvQA,H=q.home,f=-H.d/2,half=q.porchHalf;
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
 // Validate exact physical path endpoints and side flower clearance.
 const walkway=await page.evaluate(()=>{const q=cvQA,H=q.home,first=q.pathRows[0],last=q.pathRows.at(-1),local=first.map(p=>q.homeLocal(p.x,p.z));return {width:q.porchHalf*2,depth:q.porchDepth,stones:q.pavingStats.residence,approachStones:q.pavingStats.approach,stoneColors:q.pavingStats.colors.size,stairError:Math.hypot(first[1].x-q.stairFoot.x,first[1].z-q.stairFoot.z),bridgeError:Math.hypot(last[1].x-q.bridgeEntry.x,last[1].z-q.bridgeEntry.z),stairWidth:Math.abs(local[2].x-local[0].x),flowers:q.pathFlowerPositions.length,sides:[...new Set(q.pathFlowerPositions.map(p=>p.side))],minClearance:Math.min(...q.pathFlowerPositions.map(p=>q.pathDistance(p.x,p.z))),benches:q.benches.map(b=>({x:b.x,windowClear:Math.abs(b.x)+b.hx< H.w*.3-.775})),pots:q.planters.map(p=>({id:p.id,clear:Math.abs(p.x)+p.config.hx<q.porchHalf-.11}))};});
 console.log('Walkway diagnostics',JSON.stringify(walkway));assert(Math.abs(walkway.width-11.165)<.001&&Math.abs(walkway.depth-3.65)<.001&&walkway.stones>20&&walkway.approachStones===0&&walkway.stoneColors>=5&&walkway.stairError<1e-6&&walkway.bridgeError<1e-6&&Math.abs(walkway.stairWidth-2.2)<.001&&walkway.flowers>10&&walkway.sides.length===2&&walkway.minClearance>=1.66&&walkway.benches.every(b=>b.windowClear)&&walkway.pots.every(p=>p.clear));
 // A geometry-only test missed a visually absent surface in 0.1.14.
 // Render the actual path, then hide only the paving and verify that its pixels change.
 const paving=await page.evaluate(()=>{
  const q=cvQA;document.getElementById('close').click();q.scene.render();
  const canvas=document.getElementById('view'),probe=document.createElement('canvas');probe.width=canvas.width;probe.height=canvas.height;const ctx=probe.getContext('2d');
  const points=q.pathRows.slice(3,-4).filter((_,i)=>i%2===0).map(r=>q.projectPoint(r[1])).filter(p=>p.x>=4&&p.y>=4&&p.x<canvas.width-4&&p.y<canvas.height-4&&p.z>=0&&p.z<=1);
  function sample(){ctx.clearRect(0,0,probe.width,probe.height);ctx.drawImage(canvas,0,0);return points.map(p=>{const v=ctx.getImageData(Math.floor(p.x)-1,Math.floor(p.y)-1,3,3).data;return [0,1,2].map(k=>{let s=0;for(let i=k;i<v.length;i+=4)s+=v[i];return s/9;});});}
  const visible=sample();q.pathMesh.setEnabled(false);q.scene.render();const hidden=sample();q.pathMesh.setEnabled(true);q.scene.render();
  const differences=visible.map((v,i)=>v.reduce((sum,c,k)=>sum+Math.abs(c-hidden[i][k]),0));
  const minElevation=Math.min(...q.pathRows.flat().map(v=>v.y-q.renderedTerrainY(v.x,v.z)));
  const luminance=visible.map(([r,g,b])=>.2126*r+.7152*g+.0722*b);
  const stonePixels=visible.filter(([r,g,b],i)=>luminance[i]>=70&&luminance[i]<248&&r>=g*.96&&g>=b*.95).length;
  return {samples:points.length,changed:differences.filter(x=>x>20).length,differences,minElevation,stonePixels,luminance,medianLuminance:[...luminance].sort((a,b)=>a-b)[Math.floor(luminance.length/2)]};
 });
 console.log('Rendered paving visibility',JSON.stringify(paving));assert(paving.samples>=5&&paving.changed>=Math.ceil(paving.samples*.65)&&paving.minElevation>=.09,'paving must actually appear in rendered pixels above terrain');assert(paving.stonePixels>=Math.ceil(paving.samples*.50)&&paving.medianLuminance>=80&&paving.medianLuminance<235,'stone must render in a light warm tone, not dark soil');
 fs.writeFileSync('qa/pavimento.json',JSON.stringify(paving,null,2));
 // Walk to the two benches, use actual buttons and inspect jointed poses and state.
 const seats=[];
 for(const id of ['bench-right','bench-yard']){
  await page.evaluate(id=>{const q=cvQA,b=q.allBenches.find(x=>x.id===id),p=q.seatStand(b);p.x+=.03;q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);q.updateEntry(.05);q.layoutContextActions();},id);
  await page.locator('#seat-action').click();
  const seated=await page.evaluate(()=>{const q=cvQA;for(let i=0;i<100;i++)q.updateEntry(.025);const b=q.seating.bench,p=q.seatTarget(b);const before=q.avatar.position.clone();q.updateLocomotion(1,0,.1,true);return {phase:q.seating.phase,blend:q.seating.blend,seatError:Math.hypot(q.avatar.position.x-p.x,q.avatar.position.z-p.z),facing:Math.abs(Math.sin((q.avatar.rotation.y-q.seatYaw(b))/2)),legs:q.seatLegs.every(l=>l.thigh.isEnabled()&&l.shin.isEnabled()),locked:q.avatar.position.subtract(before).length()<1e-8};});
  assert(seated.phase==='seated'&&seated.blend===1&&seated.seatError<.001&&seated.facing<.001&&seated.legs&&seated.locked);
  if(id==='bench-right')await capture('banco-sentado',null,await page.evaluate(()=>cvQA.scene.activeCamera.beta*180/Math.PI));
  await page.evaluate(()=>cvQA.layoutContextActions());await page.locator('#seat-action').click();
  const stood=await page.evaluate(()=>{const q=cvQA;for(let i=0;i<50;i++)q.updateEntry(.025);return {phase:q.seating.phase,blend:q.seating.blend,last:q.seating.last,legsRestored:q.bodyParts[1].isEnabled()&&q.bodyParts[2].isEnabled(),blocked:q.blocked(q.avatar.position.x,q.avatar.position.z)};});
  assert(stood.phase==='idle'&&stood.blend===0&&stood.last.success&&stood.last.bench===id&&stood.legsRestored&&!stood.blocked);seats.push({id,seated,stood});
 }
 fs.writeFileSync('qa/assentos.json',JSON.stringify({walkway,seats},null,2));console.log('PASS aligned walkway, clear side flowers and animated seating',JSON.stringify({walkway,seats}));
 // Interact with each separate planter via the real UI. No inventory or time simulation claimed.
 const visit=async id=>page.evaluate(id=>{const q=cvQA,p=q.planters.find(x=>x.id===id),v=q.home.C(p.x+(p.x<0?1:-1)*.92,0,p.z);q.avatar.position.copyFrom(v);q.avatar.position.y=q.surfaceHeight(v.x,v.z);q.updateGarden(Date.now()+1000);q.updateWheat(Date.now(),true);q.layoutContextActions();},id);
 await visit('porch-ceramic');await page.locator('#garden-action').click();await page.locator('[data-flower="rose"]').click();assert(await page.locator('[data-flower="daisy"]').isDisabled());
 await page.locator('#garden-close').click();await visit('porch-wooden');await page.locator('#garden-action').click();await page.locator('[data-flower="lavender"]').click();await page.locator('#garden-close').click();
 const crops=await page.evaluate(()=>{const q=cvQA;for(const p of q.planters)q.updateCrop(p,p.crop.plantedAt+90000);return q.planters.map(p=>({id:p.id,type:p.type,species:p.crop.species,stage:p.stage,vertices:p.mesh.getTotalVertices(),visible:p.mesh.isEnabled()}));});
 assert.equal(crops[0].species,'rose');assert.equal(crops[1].species,'lavender');assert(crops.every(p=>p.visible&&p.stage===1&&p.vertices>0));
 await page.evaluate(()=>{const q=cvQA;const p=q.home.C(0,0,-q.home.d/2-4.1);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<120;i++)q.updateEntry(.05);});
 await capture('varanda-cultivada',null,await page.evaluate(()=>cvQA.scene.activeCamera.beta*180/Math.PI));
 // Wheat lifecycle through the actual UI, independently of the ornamental garden.
 const wheatVisit=async id=>page.evaluate(id=>{const q=cvQA,p=q.wheatPlots.find(x=>x.id===id);q.avatar.position.copyFromFloats(p.x,q.surfaceHeight(p.x,p.z),p.z);for(let i=0;i<100;i++)q.updateEntry(.05);q.updateWheat(Date.now(),true);},id);
 const wheatIds=await page.evaluate(()=>[cvQA.wheatPlots[0].id,cvQA.wheatPlots.find(p=>p.bedId!==cvQA.wheatPlots[0].bedId).id]);
 const finishTill=async()=>page.evaluate(()=>{const q=cvQA;let visible=false;for(let i=0;i<600&&q.tillWork;i++){visible||=q.hoeRoot.isEnabled();q.tickTill(.025);q.tickMounds(.025);}for(let i=0;i<35;i++)q.tickMounds(.025);return {visible,done:!q.tillWork,stats:{...q.tillStats}};});
 await wheatVisit(wheatIds[0]);assert.equal(await page.locator('#wheat-action').innerText(),'Arar');
 const panelGeometry=()=>page.evaluate(()=>{const p=document.querySelector('.world-manager:not([hidden])'),r=p.getBoundingClientRect(),j=document.getElementById('joy').getBoundingClientRect(),run=document.getElementById('run-action').getBoundingClientRect();return {id:p.id,width:r.width,height:r.height,screen:innerHeight,clear:r.left>j.right&&r.right<run.left,icons:p.querySelectorAll('[data-icon]').length};});
 const agricultureUI=await panelGeometry();assert(agricultureUI.id==='wheat-panel'&&agricultureUI.width>agricultureUI.height*1.6&&agricultureUI.clear&&agricultureUI.icons>=8);
 await page.locator('#wheat-close').click();assert(await page.locator('#wheat-panel').isHidden());assert(await page.locator('#pet-action').isHidden());await page.locator('#wheat-expand').click();assert(await page.locator('#wheat-panel').isVisible());
 await page.locator('[data-crop="corn"]').click();assert.equal(await page.locator('#crop-select').inputValue(),'corn');await page.locator('[data-crop="wheat"]').click();

 await page.locator('#wheat-action').click();const worked=await finishTill();assert(worked.visible&&worked.done&&worked.stats.completed===1&&worked.stats.strokes>2&&worked.stats.sideSamples>10&&worked.stats.insideSamples===0&&worked.stats.maxBladeError<.001&&worked.stats.impacts>2);assert.equal(await page.locator('#wheat-action').innerText(),'Plantar trigo');
 const ridge=await page.evaluate(id=>{const q=cvQA,b=q.wheatPlots.find(p=>p.id===id).bedId,parts=q.bedPlots.get(b);return {heights:parts.map(p=>q.moundHeight(p.id)),states:parts.map(p=>q.wheatStatus(p.id)),updates:q.moundQA.updates,vertices:q.wheatFurrows.getTotalVertices()};},wheatIds[0]);assert(ridge.heights.every(v=>Math.abs(v-.15)<.001)&&ridge.states.every(v=>v==='tilled')&&ridge.updates>0&&ridge.vertices>0);fs.writeFileSync('qa/sulcos.json',JSON.stringify(ridge,null,2));
 await wheatVisit(wheatIds[0]);await page.locator('#wheat-undo').click();assert.equal(await page.locator('#wheat-action').innerText(),'Arar');
 await page.locator('#wheat-action').click();assert((await finishTill()).done);await wheatVisit(wheatIds[0]);await page.locator('#wheat-action').click();
 assert.equal(await page.locator('#wheat-action').innerText(),'Regar');await page.locator('#wheat-action').click();
 assert(await page.locator('#wheat-action').isDisabled());
 const planted=await page.evaluate(ids=>({state:cvQA.wheatStatus(ids[0]),other:cvQA.wheatStatus(ids[1]),seeds:cvQA.wheatState.seeds,grain:cvQA.wheatState.grain,early:cvQA.applyWheatAction('harvest',ids[0]),remote:cvQA.applyWheatAction('till',cvQA.wheatPlots.at(-1).id),visible:cvQA.wheatStalks.isEnabled()}),wheatIds);
 assert.deepEqual(planted,{state:'watered',other:'raw',seeds:23,grain:0,early:false,remote:false,visible:true});
 const clockBefore=await page.evaluate(id=>({anchor:cvQA.worldClock.anchor,elapsed:cvQA.worldElapsed(),duration:cvQA.wheatState.plots[id].durationMs}),wheatIds[0]);assert.equal(clockBefore.duration,1200000);
 await page.reload();await page.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});await page.evaluate(()=>cvQA.engine.stopRenderLoop());
 await wheatVisit(wheatIds[0]);assert.equal(await page.evaluate(id=>cvQA.wheatStatus(id),wheatIds[0]),'watered');
 const clockAfter=await page.evaluate(id=>({anchor:cvQA.worldClock.anchor,elapsed:cvQA.worldElapsed(),duration:cvQA.wheatState.plots[id].durationMs}),wheatIds[0]);assert.equal(clockAfter.anchor,clockBefore.anchor);assert(clockAfter.elapsed>=clockBefore.elapsed);assert.equal(clockAfter.duration,clockBefore.duration);
 // Simulate the saved seasonal growth duration, not a hard-coded 90 seconds.
 await page.evaluate(id=>{const p=cvQA.wheatState.plots[id],now=p.wateredAt+cvQA.wheatDuration(p)*3+1000;window.originalWheatNow=Date.now;Date.now=()=>now;cvQA.updateWheat(now,true);},wheatIds[0]);
 assert.equal(await page.locator('#wheat-action').innerText(),'Colher');
 await capture('trigo-maduro','field-view');
 await page.locator('#wheat-action').click();await page.evaluate(()=>{Date.now=window.originalWheatNow;delete window.originalWheatNow;});
 const harvest=await page.evaluate(id=>({state:cvQA.wheatStatus(id),grain:cvQA.wheatState.grain,seeds:cvQA.wheatState.seeds,repeat:cvQA.applyWheatAction('harvest',id),persisted:JSON.parse(localStorage.getItem('cv.wheat.v1'))}),wheatIds[0]);
 assert(harvest.state==='tilled'&&harvest.grain>=2&&harvest.grain<=4&&harvest.seeds===24&&!harvest.repeat&&harvest.persisted.grain===harvest.grain);
 await page.locator('#inventory-open').click();assert(await page.locator('#inventory-dialog').isVisible());
 assert.equal(await page.locator('[data-item="seed:wheat"] [data-count]').getAttribute('data-count'),String(harvest.seeds));assert.equal(await page.locator('[data-item="harvest:wheat"] [data-count]').getAttribute('data-count'),String(harvest.grain));
 await page.locator('[data-inventory-category="seeds"]').click();assert.equal(await page.locator('#inventory-items .inventory-item').count(),12);
 const inventoryBefore=await page.evaluate(()=>JSON.stringify(cvQA.wheatState));await page.locator('[data-item="seed:corn"]').click();assert.equal(await page.locator('#crop-select').inputValue(),'corn');assert.equal(await page.evaluate(()=>JSON.stringify(cvQA.wheatState)),inventoryBefore);
 await page.locator('[data-item="seed:wheat"]').click();await page.screenshot({path:'qa/inventario-unificado.png'});
 await page.locator('[data-inventory-category="market"]').click();const beforeTrade=await page.evaluate(()=>({coins:cvQA.wheatState.coins,grain:cvQA.wheatState.grain,seeds:cvQA.wheatState.seeds}));
 await page.locator('[data-market="wheat"] [data-trade="buy"]').click();
 await page.locator('[data-market="wheat"] [data-trade="sell"]').click();
 const afterTrade=await page.evaluate(()=>({coins:cvQA.wheatState.coins,grain:cvQA.wheatState.grain,seeds:cvQA.wheatState.seeds,persisted:JSON.parse(localStorage.getItem('cv.wheat.v1'))}));
 assert.equal(afterTrade.coins,beforeTrade.coins+15);assert.equal(afterTrade.grain,beforeTrade.grain-1);assert.equal(afterTrade.seeds,beforeTrade.seeds+1);assert.equal(afterTrade.persisted.coins,afterTrade.coins);assert.equal(afterTrade.persisted.grain,afterTrade.grain);assert.equal(afterTrade.persisted.seeds,afterTrade.seeds);
 await page.screenshot({path:'qa/comercio-agricola.png'});console.log('PASS live agricultural trade and atomic persistence',JSON.stringify({beforeTrade,afterTrade:{coins:afterTrade.coins,grain:afterTrade.grain,seeds:afterTrade.seeds}}));
await page.locator('[data-inventory-category="warehouse"]').click();const warehouseBefore=await page.evaluate(()=>cvQA.wheatState.seeds);await page.locator('[data-warehouse="wheat"] [data-transfer="seeds:deposit"]').click();assert.equal(await page.evaluate(()=>cvQA.wheatState.seeds),warehouseBefore-1);await page.locator('[data-warehouse="wheat"] [data-transfer="seeds:withdraw"]').click();assert.equal(await page.evaluate(()=>cvQA.wheatState.seeds),warehouseBefore);await page.screenshot({path:'qa/armazem.png'});await page.locator('#inventory-close').click();assert(await page.locator('#inventory-dialog').isHidden());console.log('PASS unified inventory reflects actual harvest and seed selection without mutating stock');
 fs.writeFileSync('qa/trigo-ciclo.json',JSON.stringify({planted,harvest},null,2));console.log('PASS wheat lifecycle, proximity, independent plots, growth, reload and harvest accounting',JSON.stringify({planted,harvest}));
 // Use actual agriculture controls, distinct seed stocks, and center.
 await wheatVisit(wheatIds[1]);await page.locator('#wheat-action').click();assert((await finishTill()).done);await wheatVisit(wheatIds[1]);const permanent=await page.evaluate(ids=>{const q=cvQA;return ids.every(id=>q.bedPlots.get(q.wheatPlots.find(p=>p.id===id).bedId).every(p=>q.moundHeight(p.id)>.149));},wheatIds);assert(permanent);await page.locator('#crop-select').selectOption('corn');assert(await page.locator('#tool-bar').isHidden(),'Tool dock must not intercept active agriculture manager');await page.locator('#farm-fertilize').click();await page.locator('#farm-irrigate').click();await page.locator('#wheat-action').click();
 const corn=await page.evaluate(id=>({crop:cvQA.wheatState.plots[id].crop,soil:cvQA.wheatState.plots[id].soil,stock:cvQA.wheatState.stocks.corn.seeds,wheat:cvQA.wheatState.seeds}),wheatIds[1]);
 assert(corn.crop==='corn'&&corn.soil.irrigated&&corn.soil.fertility>.9&&corn.stock===11&&corn.wheat===25);
 assert(await page.locator('#player-menu').isHidden());await page.locator('#menu-open').click();assert(await page.locator('#player-menu').isVisible());await page.locator('#menu-resume').click();await page.evaluate(()=>{const q=cvQA,p=q.fieldSignCollider;q.avatar.position.set(p.x,q.surfaceHeight(p.x,p.z),p.z-1.2);q.updateWorldActions(.2);});await page.locator('#farm-open').click();assert(await page.locator('#farm-center').isVisible());assert(await page.locator('#player-menu').isHidden());assert(await page.locator('#fence-context').isHidden());assert((await page.locator('#farm-catalog').innerText()).includes('Morango'));assert((await page.locator('#farm-forecast').innerText()).includes('°C'));await page.locator('[data-guide="strawberry"]').click();assert.equal(await page.locator('#guide-title').innerText(),'Morango');assert.equal(await page.locator('#guide-facts .farm-card').count(),6);assert.equal(await page.locator('#guide-days .farm-card').count(),7);assert.equal(await page.locator('#guide-days .guide-best').count(),1);const guide=await page.evaluate(()=>cvQA.cropAdvice('strawberry',0));assert(guide.days.length===7&&guide.schedule.preferred===false&&guide.crop.temperature===18&&guide.best.score===Math.max(...guide.days.map(d=>d.score)));await page.screenshot({path:'qa/mural-agricola.png'});await page.locator('#farm-close').click();
 fs.writeFileSync('qa/agricultura.json',JSON.stringify({corn},null,2));console.log('PASS agricultural controls, distinct crop stocks and forecast center');
 const saved=await page.evaluate(()=>cvQA.planters.map(p=>p.crop?.species));assert.deepEqual(saved,['rose','lavender']);
 await visit('porch-ceramic');assert(await page.locator('#wheat-panel').isHidden(),'wheat panel must release the garden controls');await page.locator('#garden-action').click();const gardenUI=await panelGeometry();assert(gardenUI.id==='garden-panel'&&gardenUI.clear&&gardenUI.icons>=5);console.log('Shared horizontal manager geometry',JSON.stringify({agricultureUI,gardenUI}));await page.locator('#garden-remove').click();await page.locator('[data-flower="daisy"]').click();
 assert.deepEqual(await page.evaluate(()=>cvQA.planters.map(p=>p.crop?.species)),['daisy','lavender']);
 assert.deepEqual(errors,[]);fs.writeFileSync('qa/varanda.json',JSON.stringify({porch,crops,saved},null,2));console.log('PASS porch rail and planter collision, species, growth and persistence',JSON.stringify({porch,crops,saved}));
 // Verify both real pet rigs and local care without overwriting existing farm saves.
 const petQA=await page.evaluate(()=>{const q=cvQA,s=q.petSystem,old=q.avatar.position.clone();for(const p of s.pets){p.state='idle';p.timer=100;s.data[p.id].hunger=.1;s.data[p.id].thirst=.1;}const dog=s.pets[0],cat=s.pets[1];const models=s.pets.map(p=>({id:p.id,legs:p.rig.legs.length,spawn:s.valid(p.out.x,p.out.z),food:!!s.route(p.out,p.food.point),water:!!s.route(p.out,p.water.point)}));dog.state='walk';const before=dog.rig.legs[0].hip.rotation.x;for(let i=0;i<11;i++)s.pose(dog,.05);const articulated=Math.abs(dog.rig.legs[0].hip.rotation.x-before)>.02;dog.state='idle';dog.timer=100;q.avatar.position.copyFrom(dog.rig.root.position);q.updateGarden();q.updateWheat(Date.now(),true);s.update(.1);s.update(.1);return {models,articulated,old:old.asArray(),near:!document.getElementById('pet-action').hidden};});
 const petRange=await page.evaluate(()=>{const q=cvQA,s=q.petSystem,old=q.avatar.position.clone(),results=s.pets.map(p=>{q.avatar.position.copyFrom(p.out);const near=s.uiHomeNear(p);q.avatar.position.copyFrom(p.out);q.avatar.position.x+=4;const far=!s.uiHomeNear(p);q.avatar.position.copyFrom(p.out);q.avatar.position.y+=2;const floor=!s.uiHomeNear(p);return {id:p.id,near,far,floor};});q.avatar.position.copyFrom(old);s.update(.1);q.layoutContextActions();return results;});assert(petRange.every(p=>p.near&&p.far&&p.floor));console.log('Pet interaction distance and floor separation',JSON.stringify(petRange));
 console.log('Companion rigs and paths',JSON.stringify(petQA));assert(petQA.models.length===2&&petQA.models.every(p=>p.legs===4&&p.spawn&&p.food&&p.water)&&petQA.articulated&&petQA.near);
 await page.locator('#pet-action').click();await page.locator('#pet-name').fill('Tobias');await page.locator('#pet-rename').click();assert(await page.locator('#pet-name-form').isHidden());
 const lockedName=await page.evaluate(()=>!cvQA.petSystem.care('dog','name','Outro'));assert(lockedName);
 const panelBounds=await page.evaluate(()=>{const p=document.getElementById('pet-panel').getBoundingClientRect(),j=document.getElementById('joy').getBoundingClientRect(),r=document.getElementById('run-action').getBoundingClientRect();return {horizontal:p.width>p.height*2,clear:p.left>j.right&&p.right<r.left,height:p.height,screen:innerHeight};});assert(panelBounds.horizontal&&panelBounds.clear&&panelBounds.height<panelBounds.screen*.40);
 await page.locator('#pet-close').click();await page.evaluate(()=>{const q=cvQA,p=q.petSystem.pets[0];q.avatar.position.copyFrom(p.rig.root.position);q.petSystem.update(.1);q.petSystem.update(.1);});
 await page.locator('#pet-pet').click();
 const care=await page.evaluate(()=>{const s=cvQA.petSystem,started=s.interactionActive(),before=s.data.dog.affinity;for(let i=0;i<130&&s.interactionActive();i++)s.update(.05);return {name:s.data.dog.name,affinity:s.data.dog.affinity,before,saved:JSON.parse(localStorage.getItem('cv.pets.v1')).dog,started,completed:s.stats.completedInteractions,contacts:s.stats.handContacts,active:s.interactionActive()};});
 assert(care.name==='Tobias'&&care.started&&care.affinity>care.before&&care.saved.name==='Tobias'&&care.completed>0&&care.contacts>0&&!care.active);
 const separation=await page.evaluate(()=>{const q=cvQA,s=q.petSystem,dog=s.pets[0],old=q.avatar.position.clone(),pos=dog.rig.root.position.clone();let p=null;for(let x=-18;x<20&&!p;x+=1)for(let z=-12;z<20&&!p;z+=1){if(!s.valid(x,z)||Math.hypot(x-dog.out.x,z-dog.out.z)<6||Math.hypot(x-s.pets[1].out.x,z-s.pets[1].out.z)<6)continue;p=q.home.C(0,0,0);p.set(x,q.surfaceHeight(x,z),z);}if(!p)return {found:false};dog.rig.root.position.copyFrom(p);q.avatar.position.copyFrom(p);const found=s.animalNear(dog)&&!s.homeNear(dog),foodDenied=!s.care('dog','food'),waterDenied=!s.care('dog','water');dog.rig.root.position.copyFrom(pos);q.avatar.position.copyFrom(old);return {found,foodDenied,waterDenied};});assert(separation.found&&separation.foodDenied&&separation.waterDenied);console.log('Separate animal and home proximity',JSON.stringify(separation));
 const toyQA=await page.evaluate(()=>{const q=cvQA,s=q.petSystem,p=s.pets[0],d=s.data.dog;p.state='idle';p.timer=100;p.lastCare=-100;d.hunger=.1;d.thirst=.1;d.energy=.9;q.avatar.position.copyFrom(p.rig.root.position);const before=d.affinity,started=s.care('dog','play');let shown=false;for(let i=0;i<160&&s.interactionActive();i++){s.update(.05);shown||=s.toys.dog.root.isEnabled();}const completed=d.affinity>before&&!s.toys.dog.root.isEnabled(),travel=s.stats.toyTravel;p.state='idle';p.timer=100;p.lastCare=-100;q.avatar.position.copyFrom(p.rig.root.position);const value=d.affinity,again=s.care('dog','play');s.cancelInteraction();return {started,shown,completed,travel,again,cancelled:!s.interactionActive()&&d.affinity===value&&!s.toys.dog.root.isEnabled()};});console.log('Physical pet interaction and cancellation',JSON.stringify(toyQA));assert(toyQA.started&&toyQA.shown&&toyQA.completed&&toyQA.travel>.05&&toyQA.again&&toyQA.cancelled);
 const collisionAudit=await page.evaluate(()=>{const q=cvQA,s=q.petSystem;const fixtures=q.worldFixtures.map(f=>({id:f.id,blocked:q.blocked(f.x,f.z)}));const animals=s.pets.map(p=>{const pos=p.rig.root.position.clone(),prior=p.inShelter;p.inShelter=false;p.rig.root.position.copyFrom(p.out);const c=p.rig.root.position,center=s.bodyBlocked(c.x,c.z),escape=!s.bodyBlocked(c.x+.10,c.z,{x:c.x,z:c.z}),enter=s.bodyBlocked(c.x,c.z,{x:c.x+.9,z:c.z});p.rig.root.position.copyFrom(pos);p.inShelter=prior;return {id:p.id,center,escape,enter};});return {fixtures,animals,porch:q.porchFixtures.map(p=>{const v=q.home.C(p.x,.53,p.z);return {kind:p.kind,blocked:q.blocked(v.x,v.z)};}),apertures:q.windowApertures.map(a=>({name:a.name,width:a.w,height:a.h}))};});console.log('World collision inventory',JSON.stringify(collisionAudit));assert(collisionAudit.fixtures.every(f=>f.blocked)&&collisionAudit.animals.every(a=>a.center&&a.escape&&a.enter)&&collisionAudit.porch.every(p=>p.blocked));fs.writeFileSync('qa/collision-audit.json',JSON.stringify(collisionAudit,null,2));
 const shelters=await page.evaluate(()=>{const s=cvQA.petSystem,out=[];for(const p of s.pets){p.rig.root.position.copyFrom(p.out);p.inShelter=false;const planned=s.plan(p,p.out,'sleep',true);for(let i=0;i<180&&p.state==='walk';i++)s.update(.05);const slept=p.state==='sleep'&&p.inShelter&&p.rig.root.position.subtract(p.bed).length()<.05;s.leave(p);for(let i=0;i<180&&p.state==='walk';i++)s.update(.05);out.push({id:p.id,planned,slept,left:!p.inShelter&&p.rig.root.position.subtract(p.out).length()<.05});}return out;});
 console.log('Pet shelter entry and exit',JSON.stringify(shelters));assert(shelters.every(p=>p.planned&&p.slept&&p.left));
 // Validate real meal approach and resource consumption for each species.
 const meals=await page.evaluate(()=>{
  const s=cvQA.petSystem,out=[];for(const p of s.pets){
   for(const kind of ['drink','eat']){
    const d=s.data[p.id],key=kind==='drink'?'water':'food',need=kind==='drink'?'thirst':'hunger',b=p[key].point;
    p.rig.root.position.copyFrom(p.out);p.inShelter=false;p.path=[];d[key]=1;d[need]=.85;
    const planned=s.mealPlan(p,kind);for(let i=0;i<600&&p.state==='walk';i++)s.update(.05,false);
    const arrived=p.state===kind,root=p.rig.root,stand=Math.hypot(root.position.x-b.x,root.position.z-b.z);
    for(let i=0;i<20;i++)s.update(.05,false);
    const target=Math.atan2(root.position.x-b.x,root.position.z-b.z),facing=Math.abs(Math.atan2(Math.sin(root.rotation.y-target),Math.cos(root.rotation.y-target)));
    for(let i=0;i<90&&p.state===kind;i++)s.update(.05,false);
    out.push({id:p.id,kind,planned,arrived,stand,facing,consumed:d[key]<1,needReduced:d[need]<.6});
   }
  }return out;
 });
 console.log('Pet meals from beside bowls',JSON.stringify(meals));assert(meals.every(m=>m.planned&&m.arrived&&Math.abs(m.stand-(m.id==='dog'?.68:.49))<.04&&m.facing<.08&&m.consumed&&m.needReduced));
 // Both pets must cross the actual central door portal and return, with the main door closed.
 const portal=await page.evaluate(()=>{
  const q=cvQA,s=q.petSystem,result=[];q.entry.door=0;for(const p of s.pets){s.data[p.id].hunger=.1;s.data[p.id].thirst=.1;}
  for(const p of s.pets){
   p.rig.root.position.copyFrom(s.houseOut);p.inShelter=false;p.inHouse=false;p.path=[];p.state='idle';p.timer=100;
   const planned=s.visitHouse(p);let open=0;for(let i=0;i<220&&p.state==='walk';i++){s.update(.05,false);open=Math.max(open,Math.abs(q.home.petFlap.rotation.x));}
   const entered=p.inHouse&&p.rig.root.position.subtract(s.houseIn).length()<.05;const leaving=s.exitHouse(p);
   for(let i=0;i<220&&p.state==='walk';i++)s.update(.05,false);
   const returned=!p.inHouse&&p.rig.root.position.subtract(s.houseOut).length()<.05;result.push({id:p.id,planned,entered,leaving,returned,open});
  }
  return {result,leftBenchRemoved:q.benches.length===1&&q.benches[0].id==='bench-right',catLeft:s.catHome.x<0,playerBlocked:q.homeBlocked(q.home.C(0,.53,-q.home.d/2).x,q.home.C(0,.53,-q.home.d/2).z)};
 });
 console.log('Functional pet main door',JSON.stringify(portal));assert(portal.leftBenchRemoved&&portal.catLeft&&portal.playerBlocked&&portal.result.every(p=>p.planned&&p.entered&&p.leaving&&p.returned&&p.open>.8));
 // Exercise autonomous preemption, not only forced meal routes.
 const preventive=await page.evaluate(()=>{
  const s=cvQA.petSystem,results=[];
  for(const p of s.pets){
   for(const kind of ['eat','drink']){
    const d=s.data[p.id],need=kind==='eat'?'hunger':'thirst',supply=kind==='eat'?'food':'water';
    p.rig.root.position.copyFrom(p.out);p.inShelter=false;p.inHouse=false;p.path=[];p.state='sit';p.timer=100;p.brain.memory.clear();p.needCheck=0;
    d.hunger=.1;d.thirst=.1;d.food=1;d.water=1;d[need]=.29;
    const early=s.reconsiderCare(p);d[need]=.30;p.needCheck=.5;s.update(.05,false);
    const planned=p.state==='walk'&&p.after===kind;
    const untouched=d[supply]===1;
    for(let i=0;i<800&&p.state==='walk';i++)s.update(.05,false);
    const arrived=p.state===kind;
    for(let i=0;i<100&&p.state===kind;i++)s.update(.05,false);
    results.push({id:p.id,kind,early,planned,untouched,arrived,recovered:d[need]<.10,consumed:d[supply]<1});
    p.state='idle';p.timer=100;p.path=[];p.rig.root.position.copyFrom(p.out);d.hunger=.1;d.thirst=.1;
   }
  }return results;
 });
 const routePerf=await page.evaluate(()=>({...cvQA.petSystem.stats}));console.log('Cooperative AI route slices',JSON.stringify(routePerf));assert(routePerf.routeSlices>0&&routePerf.routeCompleted>0&&Number.isFinite(routePerf.routeMaxSliceMs));
 console.log('Autonomous preventive care',JSON.stringify(preventive));assert(preventive.every(p=>!p.early&&p.planned&&p.untouched&&p.arrived&&p.recovered&&p.consumed));
 fs.writeFileSync('qa/pets.json',JSON.stringify({petQA,care,shelters,meals,portal,preventive},null,2));await capture('pets-residencia','close',await page.evaluate(()=>cvQA.scene.activeCamera.beta*180/Math.PI));await page.evaluate(v=>cvQA.avatar.position.copyFromFloats(...v),petQA.old);
 // QA-only closeups, not a permanent camera control.
 await page.evaluate(()=>{const q=cvQA,p=q.wheatPlots.at(-1);q.avatar.position.set(p.x,q.surfaceHeight(p.x,p.z),p.z);for(let i=0;i<160;i++)q.updateEntry(.05);});
 for(const id of ['dog','cat']){
  await page.evaluate(id=>{const q=cvQA,p=q.petSystem.pets.find(p=>p.id===id);p.rig.root.position.copyFrom(p.out);p.path=[];p.inShelter=false;p.state='idle';p.timer=100;const focus=p.out.clone();focus.y+=.8;q.setView(12,focus,false);},id);
  await capture('pet-detalhe-'+id,null,48);
 }
 await page.evaluate(v=>{const q=cvQA;q.avatar.position.copyFromFloats(...v);document.getElementById('wide').click();},petQA.old);
 // Test actual day/night lighting on a disposable page state, after all daytime visual checks.
 // Exercise fence placement, rotation, reversible stock and animated dismantling.
 const worldFeatures=await page.evaluate(()=>{const q=cvQA,old=q.avatar.position.clone(),f=[...q.editableFences.values()].find(p=>p.kind==='field');q.avatar.position.copyFrom(f.a);const paint=q.paintFence(f.id,'post',1)&&q.paintFence(f.id,'rail',2),repair=q.maintainFence(f.id,'repair'),condition=q.fenceCondition(f.id);const savedPaint=JSON.parse(localStorage.getItem('cv.fenceCare.v1')).items[f.id];if(savedPaint.post!==1||savedPaint.rail!==2||f.meshes.some(m=>!m.isEnabled()||m.material.alpha!==1))throw Error('Fence paint must be independent and opaque');const gates=q.gates.map(g=>{g.open=0;q.gatePose(g);const closed=q.gateBlocked(g.center.x,g.center.z);g.open=1;q.gatePose(g);return {closed,open:!q.gateBlocked(g.center.x,g.center.z)};});q.avatar.position.copyFrom(q.arch);const named=q.setRanchName('Rancho do Vale'),saved=JSON.parse(localStorage.getItem('cv.ranch.v1')).name;assertHudName();function assertHudName(){if(document.getElementById('ranch-hud').textContent!=='Rancho do Vale')throw Error('Ranch HUD did not update');}q.avatar.position.copyFrom(old);return {field:!!f,paint,repair,condition,gates,named,saved};});console.log('World interaction maintenance and gates',JSON.stringify(worldFeatures));assert(worldFeatures.field&&worldFeatures.paint&&worldFeatures.repair&&worldFeatures.condition>.999&&worldFeatures.gates.every(g=>g.closed&&g.open)&&worldFeatures.named&&worldFeatures.saved==='Rancho do Vale');
 const windAndMap=await page.evaluate(()=>{const q=cvQA,old=q.avatar.position.clone(),oldYaw=q.avatar.rotation.y;
 const wind=q.windAt(0,'sun'),storm=q.windAt(0,'storm'),sameDirection=Math.abs(wind.angle-storm.angle)<1e-9;
 const sample=(v)=>{q.signMotion.angle=0;q.signMotion.velocity=0;q.signMotion.peak=0;for(let i=0;i<180;i++)q.updateWindObjects(.025,v);return {peak:q.signMotion.peak,angle:q.signMotion.angle,yaw:q.signMotion.vaneYaw};};
 const weak=sample({x:wind.x,z:wind.z,speed:wind.speed}),strong=sample({x:storm.x,z:storm.z,speed:storm.speed}),error=Math.abs(Math.atan2(Math.sin(strong.yaw-Math.atan2(-storm.x,-storm.z)),Math.cos(strong.yaw-Math.atan2(-storm.x,-storm.z))));
 const clear=!q.archBlocked(q.arch.x,q.arch.z),roof=q.archRainSurface(q.arch.x,q.arch.z)?.kind;
 const headings=[];for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){q.avatar.rotation.y=a;q.drawMinimap(.1,true);headings.push(q.mapQA.heading);if(!document.getElementById('map-heading').textContent.includes('°'))throw Error('Compass bearing missing');}
 q.avatar.rotation.y=oldYaw;q.avatar.position.copyFrom(old);q.drawMinimap(.1,true);return {weak,strong,error,clear,roof,sameDirection,headings,wind:wind.speed,storm:storm.speed};});
 console.log('Wind hinge, vane and compass',JSON.stringify(windAndMap));assert(windAndMap.sameDirection&&windAndMap.storm>windAndMap.wind*2&&windAndMap.strong.peak>=windAndMap.weak.peak&&windAndMap.strong.peak<=.33001&&windAndMap.error<.001&&windAndMap.clear&&windAndMap.roof==='roof'&&windAndMap.headings[1]===Math.PI/2&&windAndMap.headings[2]===Math.PI);
 const arcLayout=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#fence-context .context-circles button')],parent=document.querySelector('#fence-context');parent.hidden=false;const styles=nodes.map(n=>({x:parseFloat(getComputedStyle(n).left),y:parseFloat(getComputedStyle(n).top),round:getComputedStyle(n).borderRadius}));parent.hidden=true;return {styles,linked:!!parent.querySelector('.fence-arc path')};});assert(arcLayout.linked&&arcLayout.styles.length===4&&arcLayout.styles[0].y>arcLayout.styles[1].y&&arcLayout.styles[3].y>arcLayout.styles[2].y&&arcLayout.styles.every(x=>x.round==='50%'));console.log('Fence radial arc',JSON.stringify(arcLayout));
 await page.evaluate(()=>{document.getElementById('tool-toggle').click();if(!document.getElementById('tool-items').hidden)throw Error('Toolbar failed to collapse');document.getElementById('tool-toggle').click();document.getElementById('tool-build').click();if(document.getElementById('tool-arc').hidden)throw Error('Construction arc not open');document.getElementById('tool-fence').click();if(!cvQA.build.open)throw Error('Global construction unavailable');cvQA.closeBuild();});
 const construction=await page.evaluate(()=>{const q=cvQA,old=q.avatar.position.clone(),stock=q.buildData.stock;let spot=null;
  for(let x=-15;x<25&&!spot;x+=.65)for(let z=-9;z<14&&!spot;z+=.65){if(q.blocked(x,z)||q.inWheat(x,z))continue;q.avatar.position.set(x,q.surfaceHeight(x,z),z);q.openBuild();for(const a of [0,Math.PI/2]){q.build.angle=a;q.build.x=x+1.6;q.build.z=z;const [u,v]=q.buildEnds();if(q.canBuild(u,v)){spot={x,z,a};break;}}if(!spot)q.closeBuild();}
  if(!spot){q.avatar.position.copyFrom(old);return {found:false};}q.refreshBuild();const before=q.editableFences.size,placed=q.placeBuild(),id=q.buildData.placed.at(-1)?.id,p=q.editableFences.get(id),collider=!!p&&q.blocked((p.a.x+p.b.x)/2,(p.a.z+p.b.z)/2),charged=q.buildData.stock===stock-1;const anchor=p&&q.build.anchor&&q.buildEnds()[0].subtract(p.b).length()<.00001;q.build.angle+=Math.PI/2;const pivot=p&&q.buildEnds()[0].subtract(p.b).length()<.00001;if(!anchor||!pivot)throw Error('Connected fence must retain its anchor after rotation');
  if(p){q.build.x=(p.a.x+p.b.x)/2;q.build.z=(p.a.z+p.b.z)/2;q.build.mode='remove';q.refreshBuild();}
  const started=q.confirmBuild();for(let i=0;i<30;i++)q.tickBuild(.05,false);
  const restored=q.buildData.stock===stock&&q.editableFences.size===before&&!q.editableFences.has(id),saved=JSON.parse(localStorage.getItem('cv.build.v1')).stock===stock;const links=q.bridgeFenceLinks.length;q.closeBuild();q.avatar.position.copyFrom(old);return {found:true,placed,collider,charged,started,restored,saved,links,strokes:q.buildStats.hammerStrokes};});
 console.log('Editable fence and inventory transaction',JSON.stringify(construction));assert(construction.found&&construction.placed&&construction.collider&&construction.charged&&construction.started&&construction.restored&&construction.saved&&construction.links>=2&&construction.strokes>=2);fs.writeFileSync('qa/construcao.json',JSON.stringify(construction,null,2));
 const lighting=await page.evaluate(()=>{const q=cvQA,anchor=q.worldClock.anchor;const day=Math.ceil(q.worldElapsed()/7200000);const lights=()=>q.nightLights.map(p=>({id:p.id,on:p.light.isEnabled(),intensity:p.light.intensity,range:p.light.range}));q.updateWorldClock(anchor+day*7200000+16*300000,true);const night={...q.daylight,label:document.getElementById('world-phase').textContent,lights:lights()};q.updateWorldClock(anchor+day*7200000+28*300000,true);return {night,day:{...q.daylight,label:document.getElementById('world-phase').textContent,lights:lights()},glass:q.windowPane.alpha,apertures:q.windowApertures.length};});assert(lighting.night.lights.length===6&&lighting.night.lights.every(l=>l.on&&l.intensity>0&&l.range>0)&&lighting.day.lights.every(l=>!l.on&&l.intensity===0)&&lighting.glass<.5&&lighting.apertures===10);
 assert(lighting.night.sun<.2&&lighting.day.sun>.45&&lighting.night.label.includes('Noite')&&lighting.day.label.includes('Dia'));
 fs.writeFileSync('qa/calendario.json',JSON.stringify({clockBefore,clockAfter,lighting,monthDays:DAYS_PER_MONTH,realMsPerDay:REAL_MS_PER_GAME_DAY},null,2));console.log('PASS persistent world calendar, seasonal wheat duration and lighting',JSON.stringify(lighting));
 await page.close();
 // Emulated Android viewport validates the DPR bug; not a hardware benchmark.
 const mobile=await browser.newPage({viewport:{width:834,height:375},deviceScaleFactor:3.25,isMobile:true,hasTouch:true});
 mobile.setDefaultTimeout(90000);const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/');
 await mobile.waitForFunction(()=>window.cvQA?.ready,null,{timeout:120000});
 await mobile.locator('#calendar-toggle').tap();await mobile.waitForFunction(()=>document.getElementById('world-calendar').getBoundingClientRect().width<=182);const compactMobile=await mobile.evaluate(()=>{const p=document.getElementById('world-calendar').getBoundingClientRect(),h=document.getElementById('hud').getBoundingClientRect(),j=document.getElementById('joy').getBoundingClientRect();return {clear:p.right<h.left&&p.bottom<j.top,inside:p.left>=0&&p.top>=48,width:p.width,height:p.height};});assert(compactMobile.clear&&compactMobile.inside&&compactMobile.width<=225&&compactMobile.height<90);await mobile.screenshot({path:'qa/hud-mobile-recolhido.png'});await mobile.locator('#calendar-toggle').tap();console.log('Mobile ranch HUD',JSON.stringify(compactMobile));
 await mobile.evaluate(()=>cvQA.selectCameraProfile('ampla'));const mapLayout=await mobile.evaluate(()=>{cvQA.layoutMinimap();const e=document.getElementById('minimap'),m=e.getBoundingClientRect(),r=document.getElementById('run-action').getBoundingClientRect(),h=document.getElementById('hud').getBoundingClientRect();return {right:m.right,top:m.top,bottom:m.bottom,clear:m.bottom<r.top,belowHud:m.top>=h.bottom+7,visible:getComputedStyle(e).visibility==='visible',atRight:m.right>innerWidth-30};});assert(mapLayout.clear&&mapLayout.belowHud&&mapLayout.visible&&mapLayout.atRight);await mobile.screenshot({path:'qa/minimapa-superior.png'});console.log('Upper-right map geometry',JSON.stringify(mapLayout));const profileRead=()=>mobile.evaluate(()=>({quality:cvQA.quality,w:cvQA.engine.getRenderWidth(),h:cvQA.engine.getRenderHeight(),cssW:document.getElementById('view').clientWidth,cssH:document.getElementById('view').clientHeight,dpr:devicePixelRatio}));
 const compactBuild=await mobile.evaluate(()=>{const q=cvQA;q.openBuild();q.layoutMinimap();const el=document.getElementById('build-panel'),b=el.getBoundingClientRect(),m=document.getElementById('minimap').getBoundingClientRect(),confirm=document.getElementById('build-confirm').getBoundingClientRect();const result={height:b.height,width:b.width,bottom:b.bottom,mapTop:m.top,confirmVisible:confirm.top>=b.top&&confirm.bottom<=b.bottom,viewportHeight:innerHeight};q.closeBuild();return result;});assert(compactBuild.height<=compactBuild.viewportHeight*.41&&compactBuild.bottom>=compactBuild.viewportHeight-12&&compactBuild.confirmVisible&&Math.abs(compactBuild.mapTop-mapLayout.top)<1);console.log('Compact construction panel',JSON.stringify(compactBuild));
 const profiles=[await profileRead()];
 assert.equal(profiles[0].quality,'equilibrado');assert(Math.abs(profiles[0].h-720)<=2,'mobile default resolution');
 for(const [key,target] of [['economico',540],['alto',1080],['equilibrado',720]]){
  await mobile.evaluate(key=>document.getElementById('quality-'+key).click(),key);
  const info=await profileRead();profiles.push(info);assert.equal(info.quality,key);assert(Math.abs(info.h-target)<=2,'profile '+key+' height');assert(Math.abs(info.w/info.h-info.cssW/info.cssH)<.015,'aspect ratio');
 }
 assert.equal(await mobile.evaluate(()=>getComputedStyle(document.getElementById('hud')).userSelect),'none');
 assert(await mobile.locator('#hud-panel').isHidden());
 await mobile.locator('#menu-open').tap();assert(await mobile.locator('#player-menu').isVisible());
 await mobile.locator('#controls-open').tap();assert(await mobile.locator('#controls-menu').isVisible()&&await mobile.locator('#player-menu').isHidden());
 await mobile.locator('#controls-close').tap();assert(await mobile.locator('#controls-menu').isHidden());
 await mobile.evaluate(()=>document.getElementById('hud-toggle').click());assert(await mobile.locator('#hud-panel').isVisible());
 await mobile.evaluate(()=>document.getElementById('hud-toggle').click());assert(await mobile.locator('#hud-panel').isHidden());
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
 // Multi-touch: independent right-hand sprint pointer and left-hand stick pointer.
 const runRect=await mobile.locator('#run-action').boundingBox();
 const runTap={x:runRect.x+runRect.width/2,y:runRect.y+runRect.height/2,id:22};
 const stickTap={x:touchStart.cx,y:touchStart.cy,id:11};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stickTap]});
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stickTap,runTap]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...stickTap,x:stickTap.x+touchStart.dx,y:stickTap.y+touchStart.dy},runTap]});
  await mobile.waitForFunction(()=>cvQA.sprint.held&&Math.hypot(cvQA.joy.x,cvQA.joy.z)>.2,null,{timeout:10000});
  assert(await mobile.locator('#run-action').getAttribute('aria-pressed')==='true');
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}
 assert(await mobile.evaluate(()=>!cvQA.sprint.held&&cvQA.joy.x===0&&cvQA.joy.z===0),'both pointers must release on cancel');
 console.log('PASS simultaneous native touch on sprint and joystick');
 // Native floating touch from the canvas, not the existing fixed pad.
 await mobile.locator('#menu-open').tap();await mobile.locator('#controls-open').tap();await mobile.locator('#stick-floating').tap();await mobile.locator('#controls-close').tap();
 const floating=await mobile.evaluate(()=>({x:innerWidth*.28,y:innerHeight*.69,mode:cvQA.controls.mode,saved:JSON.parse(localStorage.getItem('cv.controls.v1')).mode}));
 assert.equal(floating.mode,'floating');assert.equal(floating.saved,'floating');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:floating.x,y:floating.y}]});
 try{
  const center=await mobile.evaluate(()=>({center:cvQA.stickCenter,joy:{...cvQA.joy}}));assert(center.center&&Math.abs(center.center.x-floating.x)<2&&Math.hypot(center.joy.x,center.joy.z)<.01);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:floating.x+60,y:floating.y}]});
  await mobile.waitForFunction(()=>cvQA.joy.x>.9&&cvQA.stickCenter.x>innerWidth*.28+10,null,{timeout:10000});
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 assert(await mobile.evaluate(()=>cvQA.stickCenter===null&&cvQA.joy.x===0&&cvQA.joy.z===0));
 await mobile.evaluate(()=>cvQA.setStickMode('fixed'));console.log('PASS native floating joystick and saved mode');
 // Hold a real touch while crossing different camera zones. The world direction,
 // screen axes and player tracking must remain stable until release.
 await mobile.evaluate(()=>{const q=cvQA,H=q.home;q.engine.stopRenderLoop();const p=H.C(0,0,H.d/2+5);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<180;i++)q.updateEntry(.05);});
 const heldStick=await mobile.locator('#joy').boundingBox(),hx=heldStick.x+heldStick.width/2,hy=heldStick.y+heldStick.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hx,y:hy}]});
 let locked;
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:hx+heldStick.width*.25,y:hy}]});
  locked=await mobile.evaluate(()=>{const q=cvQA,H=q.home,c=q.scene.activeCamera,alpha=c.alpha,dir=q.worldInput(q.joy.x,q.joy.z),results=[];
   for(const [x,z] of [[0,H.d/2+1],[H.w/2+1,0],[0,-H.d/2-1]]){
    const p=H.C(x,0,z);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);
    for(let i=0;i<100;i++)q.updateEntry(.05);
    const d=q.worldInput(q.joy.x,q.joy.z);results.push({alphaError:Math.abs(Math.atan2(Math.sin(c.alpha-alpha),Math.cos(c.alpha-alpha))),inputError:Math.hypot(d.x-dir.x,d.z-dir.z),tracking:Math.hypot(c.target.x-p.x,c.target.z-p.z),gesture:q.cameraStability.gesture,occluded:q.cameraStability.occluded,opacity:q.cameraStability.houseOpacity});
   }
   return {dir,results};});
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 console.log('Held touch camera and visibility',JSON.stringify(locked));assert(Math.hypot(locked.dir.x,locked.dir.z)>.2&&locked.results.every(v=>v.gesture&&v.alphaError<.001&&v.inputError<.001&&v.tracking<.12));assert(locked.results.some(v=>v.occluded&&v.opacity<.2));
 const resumed=await mobile.evaluate(()=>{const q=cvQA,H=q.home,c=q.scene.activeCamera,p=H.C(0,0,H.d/2+1);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<180;i++)q.updateEntry(.05);const z=q.exteriorCameraZone(p.x,p.z);return {gesture:q.cameraStability.gesture,error:Math.abs(Math.atan2(Math.sin(c.alpha-z.alpha),Math.cos(c.alpha-z.alpha))),opacity:q.cameraStability.houseOpacity};});
 assert(!resumed.gesture&&resumed.error<.08&&resumed.opacity>.95);console.log('PASS automatic orbit resumes after releasing native touch',JSON.stringify(resumed));
 // Render loop remains paused for the existing native door test below.


 // Physical input path in an emulated mobile browser, not a programmatic button.click().
 // Set up a known start on the porch; actual door input and traversal use touch events.
 // Isolate actual native touch from SwiftShader render throughput; step the same
 // production door state machine after confirming the real gesture started it.
 await mobile.evaluate(()=>{const q=cvQA,H=q.home;q.engine.stopRenderLoop();const p=H.C(0,0,-H.d/2-.9);q.avatar.position.copyFrom(p);q.avatar.position.y=q.surfaceHeight(p.x,p.z);for(let i=0;i<120;i++)q.updateEntry(.05);window.doorTouchTrace=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','click'])document.getElementById('door-action').addEventListener(type,e=>window.doorTouchTrace.push({type,trusted:e.isTrusted,pointerType:e.pointerType,detail:e.detail}),true);});
 await mobile.locator('#door-action').waitFor({state:'visible'});
 await mobile.evaluate(()=>{cvQA.updateWheat(Date.now(),true);cvQA.updateGarden(Date.now());cvQA.layoutContextActions();});
 const doorRect=await mobile.locator('#door-action').boundingBox();
 const contextQA=await mobile.evaluate(()=>{const ids=['door-action','seat-action','garden-action','pet-action','pet-context','world-quick','fence-context','wheat-expand','minimap','joy','run-action','hud','world-calendar','inventory-open'];const visible=ids.map(id=>document.getElementById(id)).filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden'&&e.offsetWidth>0);const pairs=[];for(const e of visible.filter(e=>['door-action','seat-action','garden-action','pet-action','pet-context','world-quick','fence-context','wheat-expand'].includes(e.id))){const a=e.getBoundingClientRect();for(const f of visible){if(f===e)continue;const b=f.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)pairs.push([e.id,f.id]);}}const door=document.getElementById('door-action');return {pairs,round:getComputedStyle(door).borderRadius,width:door.offsetWidth,height:door.offsetHeight,label:door.getAttribute('aria-label')};});assert.deepEqual(contextQA.pairs,[]);assert(contextQA.round==='50%'&&contextQA.width===contextQA.height&&contextQA.label);console.log('Contextual interaction geometry',JSON.stringify(contextQA));await mobile.screenshot({path:'qa/interacoes-contextuais.png'});
 const tap={x:doorRect.x+doorRect.width/2,y:doorRect.y+doorRect.height/2};
 assert.equal(await mobile.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,tap),'door-action','door touch must hit its own control');
 await mobile.touchscreen.tap(tap.x,tap.y);
 const doorGesture=await mobile.evaluate(()=>({trace:window.doorTouchTrace,started:!!cvQA.entry.action,phase:cvQA.entry.action?.phase,local:cvQA.homeLocal(cvQA.avatar.position.x,cvQA.avatar.position.z)}));
 console.log('Native door gesture diagnostic',JSON.stringify(doorGesture));
 assert(doorGesture.trace.some(e=>e.type==='pointerdown'&&e.trusted&&e.pointerType==='touch')&&doorGesture.trace.some(e=>e.type==='pointerup'&&e.trusted&&e.pointerType==='touch'),'door must receive actual native touch');
 assert(doorGesture.started,'native door gesture must start production animation');
 const doorCompletion=await mobile.evaluate(()=>{const q=cvQA;for(let i=0;i<160&&q.entry.action;i++)q.updateEntry(.05);return {open:q.entry.open,door:q.entry.door,action:q.entry.action?.phase,last:q.entry.lastAction};});
 console.log('Native door animation diagnostic',JSON.stringify(doorCompletion));
 assert(doorCompletion.open&&doorCompletion.door>.95&&!doorCompletion.action&&doorCompletion.last?.success,'native gesture must finish opening the actual articulated door');
 await mobile.evaluate(()=>cvQA.engine.runRenderLoop(()=>cvQA.scene.render()));
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
