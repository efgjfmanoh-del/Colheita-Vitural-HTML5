import {Engine,Scene,ArcRotateCamera,Vector3,Color3,Color4,Mesh,MeshBuilder,StandardMaterial,HemisphericLight,DirectionalLight,PointLight,ShadowGenerator,VertexData,Quaternion,Matrix,DynamicTexture,Texture,VertexBuffer,Frustum} from '@babylonjs/core';
import layout from '../layout.json';
import {assignRooms,roomPlan,roomGender,freshLife,advanceLife,workAllowed,humanGait,KITNET,KIT_FIXTURES,KIT_STANDS,kitBlocked,kitPath} from './worker-life.js';
import {identity,dialogueFor,dialogueTopics,candidateFor,staffStyle,STAFF_SHIRTS,STAFF_SKIN,STAFF_HAIR} from './worker-dialogue.js';
import {findRoute} from './ecosystem-ai.js';
import {JOBS,WORKER_TIERS,SELL_KEYS,MAX_WORKERS,freshWorkers,validWorkers,contract,wage,workerStep} from './workers.js';
import {STAIR,UPPER_Y,LANDING_Y,STAIR_HOLES,STAIR_RAILS,stairZone,stairHeight,upperStairTransition,stairMotionLimited,upperFloorVisible,upperRailBlend,railTargets,treadHeight,residenceStep,GROUND_DIVIDER,groundWallSegments,groundDividerBlocked,UPPER_WALLS,INTERIOR_DOORS,upperWallBlocked,doorLeaf,doorLeafBlocked,fixtureBlocked,BALCONY,upperSupport,upperBalconyAt,balconyRailBlocked,gardenGrowth,waterGardenCrop,KITCHEN_FIXTURES,kitchenAccessDistance,kitchenAccessNearby} from './residence-levels.js';
import {FRUITS,MAX_ORCHARD,freshOrchard,validOrchard,upgradeOrchard,buyFruitSeed,plantFruit,harvestFruit,sellFruit,orchardStage} from './orchard.js';
import {GOODS,RECIPES,freshHome,validHome,craftGood,wash,sellGood,recipeLabel,queueGood,collectGood,WORKSHOP_MINUTES,kitchenStock,fridgeStock,transferFridge,FRIDGE_CAPACITY} from './household.js';
import {spatialIndex,boundsVisible,prefetchBounds,createResidency} from './world-stream.js';
import {ZONES,zoneAt,stageOf,validInstallations,advanceInstallation,canHouse,stageCost,prebuiltInstallations,validExtraPens,extraPenSpec,addExtraPen,animalPenId,MAX_EXTRA_PENS,ready as installationReady} from './rural-zones.js';
import {SKILLS,ACTIVE_SKILLS,EVENTS,LAND,PERKS,freshProgress,validProgress,rank,threshold,title,points,reputationTitle,hasPerk,offers,accept,record,claim,unlock,buyLand,achievements} from './progression.js';
import {freshHusbandry,validHusbandry,settleHusbandry,husbandryAction,SPECIES,PRODUCTS,MAX_ANIMALS,MAX_SUPPLY,FEED_PRICE} from './husbandry.js';
import {freshFishery,validFishery,fishingReady,landFish,sellFish,FISH_PRICE,createFishingTiming} from './fishing.js';
import {freshNature,validNature,natureStage,natureAction,plantTree,treeSpecies,seedKey,MAX_PLANTED,RESOURCE_LABELS,RESOURCE_PRICES,resourceTrade,transferResources} from './nature.js';
import {DEFAULT_APPEARANCE,PALETTES,validAppearance,withAppearance} from './appearance.js';
import {archiveAvailable,scheduleWorldRestart,applyWorldRestart} from './world-restart.js';
import {craftFence,commitCraft,recoverCraft,FENCE_RECIPE} from './resource-craft.js';
// Recover a partially written resource transaction before any world loads.
let craftRecoveryError='';try{recoverCraft(localStorage);}catch(e){craftRecoveryError=e.message;}
// Do not apply a world swap on top of an unresolved transaction.
if(!craftRecoveryError)applyWorldRestart(localStorage);
import {createPets} from './pets.js';
import {createFarmAudio} from './audio.js';
import {validWarehouse,transferWarehouse} from './warehouse.js';
import {WAREHOUSE_SIZE,validWarehousePlacement,worldOffset,localOffset,warehouseFootprint,placementClear} from './warehouse-placement.js';
import {inventorySnapshot,cropIcons,TOOL_CATALOG,equippedTool,equipTool} from './inventory.js';
import {PRICES,SUPPLIES,INITIAL_COINS,validBalance,commitTrade,quoteTrade,quoteSupply,commitSupply} from './economy.js';
import {weatherAt,WEATHER_INTERVAL,newSoil,validSoil,simulatePlot,harvestInfo,prepareSpecies,cropAdvice,windAt} from './farm-simulation.js';
import {calendarAt,cropSchedule,daylightAt,CROP_CALENDAR,REAL_MS_PER_GAME_MINUTE,DAYS_PER_MONTH,MONTH_NAMES,newWorldClock,elapsedWorldClock,upgradeWorldClock} from './world-calendar.js';
const $=id=>document.getElementById(id),canvas=$('view'),inventoryDialog=$('inventory-dialog'),progressDialog=$('progress-dialog'),ruralDialog=$('rural-dialog');
let regionalOpen=false,livestockPen=null,workerDorm=null;const staffBridges=[];const livestockAgents=new Map(),livestockRails=[],ruralZones=[],orchardModels=[];
window.cvBootStage='engine';const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,adaptToDeviceRatio:false});
// Render in physical pixels rather than downscaling the CSS viewport on high-DPR phones.
const qualityProfiles=Object.freeze({economico:540,equilibrado:720,alto:1080});
const qualityNames={economico:'Econômico',equilibrado:'Equilibrado',alto:'Alta definição'};
let quality='equilibrado';
try{const stored=localStorage.getItem('cv.renderQuality.v1');if(Object.hasOwn(qualityProfiles,stored))quality=stored;}catch{}
function resizeRender(){
 const cssShort=Math.max(1,Math.min(canvas.clientWidth||innerWidth,canvas.clientHeight||innerHeight));
 const dpr=Math.max(1,window.devicePixelRatio||1);
 const pixelRatio=Math.min(dpr,qualityProfiles[quality]/cssShort);
 engine.setHardwareScalingLevel(1/pixelRatio);engine.resize(true);
}
resizeRender();
const scene=new Scene(engine);scene.clearColor=new Color4(.36,.56,.29,1);scene.ambientColor=new Color3(.08,.08,.065);scene.imageProcessingConfiguration.exposure=.94;scene.imageProcessingConfiguration.contrast=1.10;
const V=(x,y,z)=>new Vector3(x,y,z), X=u=>(u-400)/8,Z=v=>-(v-145)/6.553;const P=(u,v,y=2.6)=>V(X(u),y,Z(v));
const random=(()=>{let s=23011;return()=>((s=Math.imul(1664525,s)+1013904223|0)>>>0)/4294967296})();
const mat=(n,c,shine=0)=>{let m=new StandardMaterial(n,scene);m.diffuseColor=Color3.FromHexString(c);m.specularColor=new Color3(shine,shine,shine);return m};
const M={grass:mat('grass','#ffffff'),stone:mat('stone','#8e8b77'),stoneLight:mat('stone light','#b9ad90'),earth:mat('earth','#886743'),sand:mat('path','#b78a58'),wood:mat('oak','#84502b'),woodLight:mat('oak golden','#c48a46'),woodDark:mat('dark timber','#563722'),plaster:mat('warm cream','#f2d5a1'),roof:mat('terracotta','#ad482a'),tile:mat('roof highlights','#d56a37'),tile2:mat('roof shadow','#923d23'),glass:mat('golden windows','#f7ae38'),leaf:mat('forest green','#397c31'),leaf2:mat('leaf light','#73a938'),leaf3:mat('leaf shade','#275c2b'),pink:mat('blossom','#e97eb0'),pink2:mat('blossom light','#ffb5cd'),pink3:mat('blossom dark','#bd467b'),water:mat('river turquoise','#258baa',.28),fall:mat('cascade blue','#a0e8ef',.14),foam:mat('foam','#e6ffff'),red:mat('flowers','#d94136'),yellow:mat('flowers yellow','#f5ca45'),white:mat('flowers ivory','#fff0cb'),black:mat('iron','#332c23')};
M.glass.emissiveColor=new Color3(.20,.085,.012);M.water.alpha=1;M.fall.alpha=1;M.fall.emissiveColor=new Color3(.025,.09,.11);M.foam.emissiveColor=new Color3(.045,.075,.075);M.grass.diffuseColor=Color3.White();M.grass.specularColor=Color3.Black();
// Local material swatches. No image of the farm is read or embedded.
function swatch(name,kind,size=128){
 const tex=new DynamicTexture(name,{width:size,height:size},scene,true,Texture.TRILINEAR_SAMPLINGMODE);
 const c=tex.getContext();c.fillStyle='#e1d9c7';c.fillRect(0,0,size,size);
 let seed=kind.length*971+7;const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 if(kind==='wood'){for(let i=0;i<65;i++){let x=rnd()*size;c.strokeStyle='rgba(77,50,26,'+(.035+rnd()*.15)+')';c.lineWidth=.5+rnd()*1.8;c.beginPath();c.moveTo(x,0);for(let y=0;y<=size;y+=8)c.lineTo(x+Math.sin(y*.09+i)*1.8,y);c.stroke()}for(let i=0;i<5;i++){let x=rnd()*size,y=rnd()*size;c.strokeStyle='#b9a17f';c.lineWidth=.8;c.beginPath();c.ellipse(x,y,2+rnd()*4,8+rnd()*10,0,0,Math.PI*2);c.stroke()}}
 else if(kind==='roof'){c.fillStyle='#e2bd9a';c.fillRect(0,0,size,size);for(let y=0;y<size;y+=32){for(let x=-32;x<size;x+=32){const a=x+((y/32)%2)*16;c.fillStyle='rgba(81,35,16,'+rnd()*.20+')';c.fillRect(a,y,30,30);c.fillStyle='#94765d';c.fillRect(a,y+30,32,2);c.fillRect(a,y,2,32);c.fillStyle='rgba(255,244,216,.35)';c.fillRect(a+2,y+2,28,3)}}}
 else if(kind==='grass'){c.fillStyle='#e4e3cc';c.fillRect(0,0,size,size);for(let i=0;i<2500;i++){const v=135+Math.floor(rnd()*110);c.fillStyle='rgba('+v+','+(v+8)+','+Math.max(0,v-12)+',.22)';c.fillRect(rnd()*size,rnd()*size,.8+rnd()*3,.8+rnd()*2)}}
 else{for(let i=0;i<2100;i++){const v=130+Math.floor(rnd()*120);c.fillStyle='rgba('+v+','+v+','+Math.max(0,v-8)+',.11)';c.fillRect(rnd()*size,rnd()*size,.7+rnd()*2,.7+rnd()*2)}}
 tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;return tex;
}
const woodTex=swatch('wood grain','wood'),stoneTex=swatch('stone grain','stone'),roofTex=swatch('ceramic microtexture','roof'),grassTex=swatch('meadow detail','grass');
for(const m of [M.wood,M.woodLight,M.woodDark])m.diffuseTexture=woodTex;
for(const m of [M.stone,M.stoneLight])m.diffuseTexture=stoneTex;
// Limewashed stucco: low-contrast, isotropic mineral texture, no repeated hatch marks.
const stuccoTex=new DynamicTexture('limewash plaster',{width:256,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);
const stuccoCtx=stuccoTex.getContext(),stuccoPixels=stuccoCtx.createImageData(256,256);
let plasterSeed=12051;
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 plasterSeed=(Math.imul(1664525,plasterSeed)+1013904223)|0;
 const grain=((plasterSeed>>>0)/4294967296-.5)*8;
 const wave=2.8*Math.sin(x*Math.PI/64)*Math.cos(y*Math.PI/64)+1.6*Math.sin((x+y)*Math.PI/32);
 const i=(y*256+x)*4;stuccoPixels.data[i]=244+grain+wave;stuccoPixels.data[i+1]=241+grain+wave;stuccoPixels.data[i+2]=231+grain+wave;stuccoPixels.data[i+3]=255;
}
stuccoCtx.putImageData(stuccoPixels,0,0);stuccoTex.update();stuccoTex.wrapU=stuccoTex.wrapV=Texture.WRAP_ADDRESSMODE;
M.plaster.diffuseTexture=stuccoTex;M.plaster.specularColor=Color3.Black();
const facadeCraft={exposedGrid:0,plinths:0,sideFlowerBoxes:0,upperWindows:[],sideWindows:[],atticWindow:null,porchRoofHigh:3.65+.17};
M.roof.diffuseTexture=roofTex;M.grass.diffuseTexture=grassTex;
M.plaster.diffuseColor=Color3.FromHexString('#fffdf6');
M.blueJoinery=mat('painted rural blue','#245b83');M.blueTrim=mat('weathered blue edge','#397ca4');M.windowPane=mat('cool reflected window','#668fa4',.12);
M.windowPane.alpha=.24;M.windowPane.backFaceCulling=false;M.windowPane.disableDepthWrite=true;M.windowPane.emissiveColor=new Color3(.015,.025,.030);
const windowApertures=[],nightLights=[];let nightPower=0;
function addNightLight(id,p,range,strength){
 const l=new PointLight(id,p,scene);l.diffuse=new Color3(1,.76,.44);l.specular=new Color3(.18,.12,.06);l.range=range;l.intensity=nightPower*strength;l.setEnabled(nightPower>.01);nightLights.push({id,light:l,strength});return l;
}
function updateNightLighting(daylight){
 nightPower=Math.max(0,Math.min(1,(.32-daylight)/.32));
 M.glass.emissiveColor.set(.80*nightPower,.45*nightPower,.12*nightPower);
 M.windowPane.emissiveColor.set(.015+.32*nightPower,.025+.16*nightPower,.030+.035*nightPower);
 for(const p of nightLights){p.light.intensity=nightPower*p.strength;p.light.setEnabled(nightPower>.01);}
}
const ceramicMat=mat('individual curved terracotta tiles','#ffffff');ceramicMat.backFaceCulling=false;
const roofCraft={fields:0,tiles:0,vertices:0,triangles:0,flowerBoxes:0,flowerHeads:0};
// Curved tile shells in a single mesh per roof slope.
function ceramicField(label,length,width,surface){
 const rows=Math.ceil(length/.58),cols=Math.ceil(width/.35),pos=[],indices=[],colors=[],normals=[];
 const clay=['#a94628','#bc532d','#d66b38','#c15b31','#a94a2a','#cc6133'].map(Color3.FromHexString);
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
  const a=i/rows,b=Math.min(1,(i+1.10)/rows),start=j/cols,end=(j+1)/cols;
  const k=pos.length/3,c=clay[(i*17+j*11)%clay.length];
  for(let t=0;t<2;t++)for(let q=0;q<=6;q++){
   const s=q/6,arch=.075*Math.sin(s*Math.PI),p=surface(t?b:a,start+(end-start)*s);
   p.y+=.065+arch+(t?.025:0);pos.push(...p.asArray());
   const shade=.84+.16*Math.sin(s*Math.PI);colors.push(c.r*shade,c.g*shade,c.b*shade,1);
  }
  for(let q=0;q<6;q++)indices.push(k+q,k+q+1,k+q+7,k+q+1,k+q+8,k+q+7);
  roofCraft.tiles++;
 }
 VertexData.ComputeNormals(pos,indices,normals);
 if(normals[1]<0){for(let k=0;k<indices.length;k+=3){const t=indices[k+1];indices[k+1]=indices[k+2];indices[k+2]=t;}VertexData.ComputeNormals(pos,indices,normals);}
 const mesh=new Mesh(label,scene),data=new VertexData();data.positions=pos;data.indices=indices;data.colors=colors;data.normals=normals;data.applyToMesh(mesh);own(mesh,ceramicMat,true);
 roofCraft.fields++;roofCraft.vertices+=pos.length/3;roofCraft.triangles+=indices.length/3;
 return mesh;
}
const waterTex=new DynamicTexture('local water ripples',{width:256,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);const wc=waterTex.getContext();const depthGradient=wc.createLinearGradient(0,0,256,0);for(const [a,b] of [[0,'#b8dfc8'],[.12,'#a0d5d4'],[.33,'#87b8c8'],[.5,'#75a8bf'],[.67,'#87b8c8'],[.88,'#a0d5d4'],[1,'#b8dfc8']])depthGradient.addColorStop(a,b);wc.fillStyle=depthGradient;wc.fillRect(0,0,256,256);for(let i=0;i<145;i++){const x=random()*256,y=random()*256,len=12+random()*70;wc.strokeStyle=i%4===0?'rgba(248,255,251,.52)':'rgba(38,106,126,.14)';wc.lineWidth=.6+random()*1.3;for(let k=-1;k<=1;k++){wc.beginPath();wc.moveTo(x+k*256,y);wc.quadraticCurveTo(x+k*256+len*.5,y+Math.sin(i)*3,x+k*256+len,y);wc.stroke()}}waterTex.update();waterTex.wrapU=waterTex.wrapV=Texture.WRAP_ADDRESSMODE;M.water.diffuseTexture=waterTex;M.water.diffuseColor=Color3.FromHexString('#438e9e');
const light=new HemisphericLight('sky',V(.2,1,-.15),scene);light.intensity=.85;light.groundColor=new Color3(.37,.39,.27);
const sun=new DirectionalLight('sun',V(-.6,-1,.45),scene);sun.position=V(40,65,-40);sun.intensity=.90;sun.diffuse=new Color3(1,.91,.78);sun.autoCalcShadowZBounds=true;sun.shadowOrthoScale=.2;
const shadow=new ShadowGenerator(1536,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.00035;shadow.normalBias=.015;shadow.darkness=.32;
// A lower, still orthographic view exposes walls, entrances and river elevations.
const CAMERA_PROFILES={rural:{span:36,beta:56,alpha:-70},ampla:{span:54,beta:48,alpha:-90}};
let cameraProfile='rural';
try{const p=localStorage.getItem('cv.cameraProfile.v1');if(Object.hasOwn(CAMERA_PROFILES,p))cameraProfile=p;}catch{}
const cameraBase=()=>CAMERA_PROFILES[cameraProfile],CAMERA_BETA=cameraBase().beta*Math.PI/180;
const camera=new ArcRotateCamera('camera',cameraBase().alpha*Math.PI/180,CAMERA_BETA,100,V(0,2.8,0),scene);
camera.mode=1;camera.lowerBetaLimit=.3;camera.upperBetaLimit=1.25;camera.lowerRadiusLimit=35;camera.upperRadiusLimit=180;camera.panningSensibility=0;camera.inputs.clear();scene.activeCamera=camera;
// setTarget recalculates spherical orbit parameters in Babylon. Preserve the approved view.
function retarget(p,beta=cameraBase().beta*Math.PI/180){const alpha=camera.alpha,radius=camera.radius;camera.setTarget(p);camera.alpha=alpha;camera.beta=beta;camera.radius=radius;}
let span=60,orbit=0;function fit(){const a=engine.getRenderWidth()/Math.max(1,engine.getRenderHeight());const h=Math.max(span/a,14);camera.orthoLeft=-h*a/2;camera.orthoRight=h*a/2;camera.orthoTop=h/2;camera.orthoBottom=-h/2}fit();
window.addEventListener('resize',()=>{resizeRender();fit();resetPerf()});
function updateQualityUI(){for(const key of Object.keys(qualityProfiles))$('quality-'+key).setAttribute('aria-pressed',String(key===quality));$('quality-label').textContent=qualityNames[quality];}
function selectQuality(key){if(!Object.hasOwn(qualityProfiles,key))return;quality=key;try{localStorage.setItem('cv.renderQuality.v1',key)}catch{}resizeRender();fit();updateQualityUI();resetPerf();}
for(const key of Object.keys(qualityProfiles))$('quality-'+key).addEventListener('click',()=>selectQuality(key));
updateQualityUI();
$('hud-toggle').addEventListener('click',()=>{const panel=$('hud-panel');panel.hidden=!panel.hidden;$('hud-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
for(const event of ['contextmenu','selectstart'])document.addEventListener(event,e=>e.preventDefault());
const groups={};let active='terrain';const entity=id=>{active=id;groups[id]??=[]};
const own=(m,material,cast=true)=>{m.material=material;m.receiveShadows=true;m.isPickable=false;if(cast&&material!==M.windowPane)shadow.addShadowCaster(m);(groups[active]??=[]).push(m);return m};
const box=(name,x,y,z,w,h,d,m,rot=0,cast=true)=>{const b=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);b.position=V(x,y,z);b.rotation.y=rot;return own(b,m,cast)};
const sphere=(name,x,y,z,rx,ry,rz,m,cast=true)=>{const b=MeshBuilder.CreateSphere(name,{diameter:2,segments:7},scene);b.position=V(x,y,z);b.scaling=V(rx,ry,rz);return own(b,m,cast)};
const cyl=(name,x,y,z,r,h,m,top=r,cast=true)=>{const b=MeshBuilder.CreateCylinder(name,{diameterTop:top*2,diameterBottom:r*2,height:h,tessellation:12},scene);b.position=V(x,y,z);return own(b,m,cast)};
const beam=(name,a,b,w,m,depth=w,cast=true)=>{const d=b.subtract(a);const obj=box(name,...a.add(b).scale(.5).asArray(),w,d.length(),depth,m,0,cast);const n=d.normalize(),axis=Vector3.Cross(Vector3.Up(),n),dot=Vector3.Dot(Vector3.Up(),n);obj.rotationQuaternion=dot<-.99999?Quaternion.RotationAxis(Vector3.Right(),Math.PI):new Quaternion(axis.x,axis.y,axis.z,1+dot).normalize();return obj};
const quad=(name,pts,m,cast=false)=>{const q=new Mesh(name,scene),v=new VertexData();v.positions=pts.flatMap(p=>p.asArray());const u=Vector3.Distance(pts[0],pts[1]),vv=Vector3.Distance(pts[1],pts[2]);v.uvs=[0,0,u/2,0,u/2,vv/2,0,vv/2];v.indices=[0,1,2,0,2,3];v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);if(v.normals[1]<-0.001){v.indices=[0,2,1,0,3,2];VertexData.ComputeNormals(v.positions,v.indices,v.normals);}m.backFaceCulling=false;v.applyToMesh(q);return own(q,m,cast)};
// Preserve every face and every UV. The old helper discarded all but the
// first triangle, leaving half of each gable patch absent.
const polyQA=[];
const poly=(name,pts,indices,m,cast=true)=>{
 const q=new Mesh(name,scene),v=new VertexData(),seen=new Set(),faces=[];
 for(let i=0;i+2<indices.length;i+=3){const tri=indices.slice(i,i+3),key=tri.slice().sort((a,b)=>a-b).join(':');if(seen.has(key))continue;seen.add(key);faces.push(...tri);}
 const origin=pts[0],u=pts[1].subtract(origin).normalize(),n=Vector3.Cross(u,pts[2].subtract(origin)).normalize(),w=Vector3.Cross(n,u).normalize();
 v.positions=pts.flatMap(p=>p.asArray());v.uvs=pts.flatMap(p=>{const d=p.subtract(origin);return [Vector3.Dot(d,u)/2,Vector3.Dot(d,w)/2];});
 v.indices=faces;v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);m.backFaceCulling=false;v.applyToMesh(q);
 polyQA.push({name,vertices:pts.length,triangles:faces.length/3,uvs:v.uvs.length/2,area:faces.reduce((sum,_,i)=>i%3?sum:sum+Vector3.Cross(pts[faces[i+1]].subtract(pts[faces[i]]),pts[faces[i+2]].subtract(pts[faces[i]])).length()/2,0)});
 return own(q,m,cast);
};
const rawChannel=layout.water.channels[0].points.filter(p=>p[0]<=925).map(([u,v,y,w])=>({p:P(u,v,y),w:w/8}));
const channel=[];for(let i=0;i<rawChannel.length-1;i++){const a=rawChannel[i],b=rawChannel[i+1],p0=rawChannel[Math.max(0,i-1)].p,p3=rawChannel[Math.min(rawChannel.length-1,i+2)].p;
 const n=Math.max(6,Math.ceil(Vector3.Distance(a.p,b.p)/.85)),fall=i===1||i===3;const ts=Array.from({length:n},(_,j)=>j/n).filter(t=>!fall||t<.45||t>.55);if(fall)ts.push(.45,.47,.49,.51,.53,.55);ts.sort((a,b)=>a-b);for(const t of ts){const p=Vector3.CatmullRom(p0,a.p,b.p,p3,t);let ht=t;if(fall)ht=Math.max(0,Math.min(1,(t-.47)/.06));p.y=a.p.y+(b.p.y-a.p.y)*ht;channel.push({p,w:a.w+(b.w-a.w)*t,fall});}}
channel.push(rawChannel.at(-1));

// Static river geometry: cache exact repeated queries and compare squared distances.
const riverSegments=channel.slice(1).map((b,i)=>{const a=channel[i],dx=b.p.x-a.p.x,dz=b.p.z-a.p.z;return {x:a.p.x,z:a.p.z,y:a.p.y,w:a.w,dx,dz,dy:b.p.y-a.p.y,dw:b.w-a.w,den:dx*dx+dz*dz};}).filter(a=>a.den>0);
const riverStats={queries:0,scans:0,cacheHits:0};
let riverCache=null;
function nearRiver(x,z){
 riverStats.queries++;
 if(riverCache&&riverCache.x===x&&riverCache.z===z){riverStats.cacheHits++;return riverCache.result;}
 riverStats.scans++;let best=1e18,y=1.8,w=4;
 for(const a of riverSegments){
  const px=x-a.x,pz=z-a.z,t=Math.max(0,Math.min(1,(px*a.dx+pz*a.dz)/a.den)),ex=px-t*a.dx,ez=pz-t*a.dz,d2=ex*ex+ez*ez;
  if(d2<best){best=d2;y=a.y+a.dy*t;w=a.w+a.dw*t;}
 }
 const result={dist:Math.sqrt(best),y,w};riverCache={x,z,result};return result;
}
// Separate eastern water network: original river samples and existing save
// coordinates remain unchanged. Index channel segments with a local shore halo.
const eastChannels=[],eastWaterCells=new Map(),eastCell=8;
const eastWaterKey=(x,z)=>Math.floor(x/eastCell)+':'+Math.floor(z/eastCell);
const eastPolygons=['lake','sea'].map(id=>({id,y:layout.water[id].surfaceY,points:layout.water[id].polygon.map(p=>P(...p))}));
function addEastIndex(entry,x0,z0,x1,z1){for(let i=Math.floor(x0/eastCell);i<=Math.floor(x1/eastCell);i++)for(let j=Math.floor(z0/eastCell);j<=Math.floor(z1/eastCell);j++){const key=i+':'+j,list=eastWaterCells.get(key);if(list)list.push(entry);else eastWaterCells.set(key,[entry]);}}
for(const [k,spec] of layout.water.channels.entries()){
 const raw=spec.points.map(([u,v,y,w])=>({p:P(u,v,y),w:w/8})),start=k===0?spec.points.findIndex(p=>p[0]===925):0,curve=[];
 for(let i=start;i<raw.length-1;i++){const a=raw[i],b=raw[i+1],n=Math.max(6,Math.ceil(Vector3.Distance(a.p,b.p)/.65)),fall=a.p.y-b.p.y>.35;
 for(let j=0;j<n;j++){const t=j/n,p=Vector3.CatmullRom(raw[Math.max(0,i-1)].p,a.p,b.p,raw[Math.min(i+2,raw.length-1)].p,t),h=fall?Math.max(0,Math.min(1,(t-.35)/.30)):t;p.y=a.p.y+(b.p.y-a.p.y)*h;curve.push({p,w:a.w+(b.w-a.w)*t});}}
 curve.push(raw.at(-1));eastChannels.push({id:spec.id,curve});
 for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i],margin=Math.max(a.w,b.w)/2+3;addEastIndex({a,b},Math.min(a.p.x,b.p.x)-margin,Math.min(a.p.z,b.p.z)-margin,Math.max(a.p.x,b.p.x)+margin,Math.max(a.p.z,b.p.z)+margin);}
}
for(const polygon of eastPolygons){const p=polygon.points;addEastIndex({polygon},Math.min(...p.map(v=>v.x))-3,Math.min(...p.map(v=>v.z))-3,Math.max(...p.map(v=>v.x))+3,Math.max(...p.map(v=>v.z))+3);}
let eastCache=null;
function eastWaterAt(x,z){
 if(eastCache&&eastCache.x===x&&eastCache.z===z)return eastCache.value;
 let edge=Infinity,y=0,id=null;
 for(const entry of eastWaterCells.get(eastWaterKey(x,z))||[]){
  if(entry.polygon){const f=entry.polygon,p=f.points;let d=Infinity;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));d=Math.min(d,Math.hypot(x-a.x-u*dx,z-a.z-u*dz));}if(insidePolygon(p,x,z))d=-d;if(d<edge){edge=d;y=f.y;id=f.id;}}
  else{const {a,b}=entry,dx=b.p.x-a.p.x,dz=b.p.z-a.p.z,u=Math.max(0,Math.min(1,((x-a.p.x)*dx+(z-a.p.z)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-a.p.x-u*dx,z-a.p.z-u*dz)-(a.w+(b.w-a.w)*u)/2;if(d<edge){edge=d;y=a.p.y+(b.p.y-a.p.y)*u;id='river';}}
 }
 const value={edge,y,id};eastCache={x,z,value};return value;
}
function height(x,z){let a=nearRiver(x,z),edge=a.dist-a.w/2;const east=eastWaterAt(x,z);if(x>X(896)&&east.edge<edge&&east.edge<2){a={y:east.y};edge=east.edge;}const u=Math.max(0,Math.min(1,(-20-x)/7)),west=u*u*(3-2*u)*Math.max(0,Math.min(1,(z-5)/16))*2.2;const ramp=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},outside=ramp((-z-37)/20)*ramp((14-x)/24),hill=.62*outside*(.5+.5*Math.sin(x*.075-z*.047))*(.5+.5*Math.cos(z*.09+x*.031));const ridge=ramp((X(20)-x-32)/14)*(1.1+2.6*(.5+.5*Math.sin(z*.115+x*.07)));const flat=2.65+west+hill+ridge+.035*Math.sin(x*.24+Math.sin(z*.19))*Math.cos(z*.31);if(edge<0)return a.y-.44;if(edge<1.5){let t=edge/1.5;t=t*t*(3-2*t);return (a.y-.44)*(1-t)+Math.max(flat,a.y+.35)*t}return Math.max(flat,a.y+.35*Math.max(0,1-(edge-1.5)/6))}
entity('terrain');const originalMinX=X(20),minX=originalMinX-48,oldMaxX=X(896),oldMinZ=Z(365),maxX=X(1665),minZ=Z(1370),maxZ=Z(-20),nx=332,nz=281,pos=[],idx=[],colors=[],uvs=[];
const axis=(a,b,n)=>Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
const terrainXs=[...axis(minX,originalMinX,48).slice(0,-1),...axis(originalMinX,oldMaxX,204),...axis(oldMaxX,maxX,80).slice(1)],terrainZs=[...axis(minZ,Z(950),64),...axis(Z(950),oldMinZ,96).slice(1),...axis(oldMinZ,maxZ,121).slice(1)];
const expansionQA={originalVertices:205*122,terrainVertices:(nx+1)*(nz+1),roads:[],sectors:[],activeSector:null};
for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){let x=terrainXs[i],z=terrainZs[j],y=height(x,z),n=nearRiver(x,z),d=Math.min(n.dist-n.w/2,eastWaterAt(x,z).edge);pos.push(x,y,z);uvs.push(x/2.7,z/2.7);const v=.94+.09*Math.sin(x*.39+Math.sin(z*.52))*Math.cos(z*.43+Math.sin(x*.21))+.025*Math.sin(x*1.71+z*.91);const patch=.5+.5*Math.sin(x*.17+Math.sin(z*.29))*Math.cos(z*.23+x*.07);const c=d<.9?[.57,.44,.27]:d<1.65?[.55,.62,.30]:[.37+.13*patch,.53+.14*patch,.19+.09*patch];colors.push(c[0]*v,c[1]*v,c[2]*v,1)}
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2)}
// Keep a single authoritative height grid, but submit independently culled patches.
// Shared border samples and global normals eliminate height, color and lighting seams.
// Do not create a full-map GPU mesh: the original plot is kept exactly as before.
const terrainNormals=[];VertexData.ComputeNormals(pos,idx,terrainNormals);const terrainFlip=terrainNormals[1]<0;if(terrainFlip)for(let i=0;i<terrainNormals.length;i++)terrainNormals[i]*=-1;
const terrainPatches=[];
function terrainPatchData(i0,i1,j0,j1){
 const p=[],uv=[],co=[],no=[],ix=[],w=i1-i0+1;
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*(nx+1)+i;p.push(...pos.slice(k*3,k*3+3));uv.push(...uvs.slice(k*2,k*2+2));co.push(...colors.slice(k*4,k*4+4));no.push(...terrainNormals.slice(k*3,k*3+3));}
 for(let j=0;j<j1-j0;j++)for(let i=0;i<i1-i0;i++){const a=j*w+i,b=a+w;if(terrainFlip)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,a+1,b,b+1);}
 return {positions:p,uvs:uv,colors:co,normals:no,indices:ix};
}
function uploadTerrainPatch(p){const vd=new VertexData();Object.assign(vd,terrainPatchData(p.i0,p.i1,p.j0,p.j1));vd.applyToMesh(p.mesh);p.mesh.refreshBoundingInfo();p.mesh.computeWorldMatrix(true);p.mesh.freezeWorldMatrix();}
function terrainPatch(name,i0,i1,j0,j1){const mesh=new Mesh(name,scene),p={id:'terrain:'+i0+':'+j0,mesh,i0,i1,j0,j1};uploadTerrainPatch(p);own(mesh,M.grass,false);const b=mesh.getBoundingInfo().boundingBox;p.bounds={minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minY:b.minimumWorld.y,maxY:b.maximumWorld.y,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z};terrainPatches.push(p);return mesh;
}
const ground=terrainPatch('sculpted terrain mesh',48,252,160,281);
function tileTerrain(i0,i1,j0,j1){for(let j=j0;j<j1;j+=24)for(let i=i0;i<i1;i+=24)terrainPatch('countryside terrain patch '+i+' '+j,i,Math.min(i1,i+24),j,Math.min(j1,j+24));}
tileTerrain(48,252,0,160);tileTerrain(252,nx,0,nz);tileTerrain(0,48,0,nz);
expansionQA.terrainPatches=terrainPatches.length;expansionQA.patchCells=terrainPatches.reduce((n,p)=>n+(p.i1-p.i0)*(p.j1-p.j0),0);
expansionQA.maxPatchVertices=Math.max(...terrainPatches.slice(1).map(p=>p.mesh.getTotalVertices()));
const terrainSkirtStats={rings:0,vertices:0,margin:64,maxJoinGap:0};
{
 const boundary=[];for(let i=0;i<=nx;i++)boundary.push(i);
 for(let j=1;j<=nz;j++)boundary.push(j*(nx+1)+nx);
 for(let i=nx-1;i>=0;i--)boundary.push(nz*(nx+1)+i);
 for(let j=nz-1;j>0;j--)boundary.push(j*(nx+1));
 const pv=[],pi=[],pc=[],pu=[],n=boundary.length,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,hx=(maxX-minX)/2,hz=(maxZ-minZ)/2;
 const margins=[0,2,5,10,18,30,45,64];
 for(let ring=0;ring<margins.length;ring++){
  const m=margins[ring];
  for(const k of boundary){
   const ox=pos[k*3],oz=pos[k*3+2],x=cx+(ox-cx)*(1+m/hx),z=cz+(oz-cz)*(1+m/hz);
   const py=ring===0?pos[k*3+1]:height(x,z);
   pv.push(x,py,z);pu.push(x/2.7,z/2.7);
   if(ring===0){pc.push(...colors.slice(k*4,k*4+4));terrainSkirtStats.maxJoinGap=Math.max(terrainSkirtStats.maxJoinGap,Math.hypot(x-ox,z-oz,py-pos[k*3+1]));}
   else{const v=.94+.09*Math.sin(x*.39+Math.sin(z*.52))*Math.cos(z*.43+Math.sin(x*.21))+.025*Math.sin(x*1.71+z*.91),patch=.5+.5*Math.sin(x*.17+Math.sin(z*.29))*Math.cos(z*.23+x*.07),nr=nearRiver(x,z),dist=nr.dist-nr.w/2,c=dist<.9?[.57,.44,.27]:dist<1.65?[.55,.62,.30]:[.37+.13*patch,.53+.14*patch,.19+.09*patch];pc.push(c[0]*v,c[1]*v,c[2]*v,1);}
  }
  if(ring)for(let k=0;k<n;k++){const a=(ring-1)*n+k,b=(ring-1)*n+(k+1)%n,c=ring*n+k,dd=ring*n+(k+1)%n;pi.push(a,c,b,b,c,dd);}
 }
 const mesh=new Mesh('seamless distant countryside terrain',scene),v=new VertexData();v.positions=pv;v.indices=pi;v.colors=pc;v.uvs=pu;v.normals=[];VertexData.ComputeNormals(pv,pi,v.normals);if(v.normals[1]<0){for(let i=0;i<pi.length;i+=3)[pi[i+1],pi[i+2]]=[pi[i+2],pi[i+1]];VertexData.ComputeNormals(pv,pi,v.normals);}
 v.applyToMesh(mesh);own(mesh,M.grass,false);terrainSkirtStats.rings=margins.length-1;terrainSkirtStats.vertices=pv.length/3;
}
const waterMotion=[],waterSections=[],riverMotionMetrics={joins:0,maxGap:0,fallSegments:0,maxSlope:0,foamArcs:0,fallGroups:0};
const bankStats={blocks:0,boulders:0,understory:0,understoryVertices:0};
// Physical rock footprints remain available after static mesh batching.
const rockColliders=[];
function rock(name,p,rx,ry,rz,m,bank=false){
 const obj=MeshBuilder.CreateIcoSphere(name,{radius:1,subdivisions:bank&&name==='rounded masonry river edge'?1:2,flat:false,updatable:true},scene);const data=obj.getVerticesData(VertexBuffer.PositionKind);
 for(let i=0;i<data.length;i+=3){const x=data[i],y=data[i+1],z=data[i+2],f=1+.12*Math.sin(x*11+z*7)+.07*Math.cos(y*9+x*5);const round=q=>Math.sign(q)*Math.pow(Math.abs(q),bank?.79:1);data[i]=round(x)*f;data[i+1]=round(y)*f;data[i+2]=round(z)*f;}
 obj.updateVerticesData(VertexBuffer.PositionKind,data);const normals=[];VertexData.ComputeNormals(data,obj.getIndices(),normals);obj.updateVerticesData(VertexBuffer.NormalKind,normals);obj.position=p;obj.scaling=V(rx,ry,rz);obj.rotation.y=bank?(random()-.5)*.55:random()*Math.PI;if(bank){bankStats.blocks++;rockColliders.push({x:p.x,z:p.z,y:p.y,rx,ry,rz,mesh:obj});}return own(obj,m);
}
for(let i=0;i<channel.length;i++){const a=channel[Math.max(0,i-1)].p,b=channel[Math.min(channel.length-1,i+1)].p,d=b.subtract(a);d.y=0;d.normalize();const side=V(-d.z,0,d.x),p=channel[i].p,w=channel[i].w;waterSections.push({left:p.add(side.scale(w*.54)),right:p.subtract(side.scale(w*.54)),side});}
entity('river');
const fallTex=new DynamicTexture('cascade flow material',{width:128,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);const fc=fallTex.getContext();fc.fillStyle='#8bcbd5';fc.fillRect(0,0,128,256);for(let i=0;i<120;i++){const x=random()*128,y=random()*256;fc.strokeStyle=i%4===0?'rgba(241,255,249,.6)':'rgba(202,240,239,.23)';fc.lineWidth=.6+random()*2;fc.beginPath();fc.moveTo(x,y);fc.bezierCurveTo(x+Math.sin(i)*2,y+14,x-2,y+31,x+Math.sin(i)*3,y+48+random()*30);fc.stroke()}fallTex.update();fallTex.wrapU=fallTex.wrapV=Texture.WRAP_ADDRESSMODE;M.fall.diffuseTexture=fallTex;M.fall.diffuseColor=Color3.FromHexString('#82c4d4');M.fall.emissiveColor=new Color3(.015,.035,.045);
let lastRock=[null,null],previousWaterVertices=null,riverUV=0;const fallFeet=[];
for(let i=1;i<channel.length;i++){
 const a=channel[i-1],b=channel[i],aa=waterSections[i-1],bb=waterSections[i],drop=a.p.y-b.p.y;

 const steep=drop>.13;const horizontal=Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z);if(steep&&b.fall){riverMotionMetrics.maxSlope=Math.max(riverMotionMetrics.maxSlope,drop/Math.max(.001,horizontal));const last=fallFeet.at(-1);if(last&&last.index===i-1){last.index=i;last.b=b;last.bb=bb;last.a=a;}else fallFeet.push({index:i,b,bb,a});}entity(steep?'waterfalls':'river');const q=quad(steep?'cascade water face':'continuous river panel',[aa.left,aa.right,bb.right,bb.left],steep?M.fall:M.water);const pv=q.getVerticesData(VertexBuffer.PositionKind);if(previousWaterVertices){const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));riverMotionMetrics.joins++;riverMotionMetrics.maxGap=Math.max(riverMotionMetrics.maxGap,gap(previousWaterVertices.slice(9,12),pv.slice(0,3)),gap(previousWaterVertices.slice(6,9),pv.slice(3,6)));}previousWaterVertices=Array.from(pv);const nextUV=riverUV+Vector3.Distance(a.p,b.p)/6;q.setVerticesData(VertexBuffer.UVKind,[0,riverUV,1,riverUV,1,nextUV,0,nextUV]);riverUV=nextUV;
 if(steep){riverMotionMetrics.fallSegments++;const startUV=nextUV-Vector3.Distance(a.p,b.p)/6;q.setVerticesData(VertexBuffer.UVKind,[0,startUV*4,1,startUV*4,1,nextUV*4,0,nextUV*4]);/* Foam is built once at the foot of each contiguous drop. */}
 entity('river');for(let k=0;k<2;k++){const p=k===0?bb.left:bb.right;if(!lastRock[k]||Vector3.Distance(lastRock[k],p)>.95){let pp=p.clone();pp.y+=.14+random()*.10;const stone=rock('rounded masonry river edge',pp,.48+random()*.25,.30+random()*.20,.52+random()*.23,i%4===0?M.stoneLight:M.stone,true);stone.rotation.y+=Math.atan2(b.p.x-a.p.x,b.p.z-a.p.z);lastRock[k]=p.clone();}}
 if(i%3===0&&!steep){let t=random(),side=bb.side.scale((random()-.5)*b.w*.7),p=Vector3.Lerp(a.p,b.p,t).add(side);let f=sphere('flow glint',p.x,p.y+.035,p.z,.06,.014,.33+random()*.17,M.foam,false);f.rotation.y=Math.atan2(b.p.x-a.p.x,b.p.z-a.p.z);waterMotion.push({m:f,a:a.p,b:b.p,side,phase:t,speed:.15+random()*.16});}
}
entity('waterfalls');riverMotionMetrics.fallGroups=fallFeet.length;for(const {a,b,bb} of fallFeet){const forward=b.p.subtract(a.p);forward.y=0;forward.normalize();const pp=[],ii=[],nn=[],cc=[];for(let row=0;row<3;row++)for(let j=0;j<12;j++){const lateral=(j+.5)/12*2-1,center=b.p.add(bb.side.scale(lateral*b.w*.45)).add(forward.scale(.18+row*.34));const rad=.18+row*.08+.12*random(),start=(random()-.5)*Math.PI;for(let k=0;k<8;k++){const ang=start+k*Math.PI/5,base=pp.length/3;for(const [r,phi] of [[rad,ang],[rad+.045,ang],[rad+.045,ang+Math.PI/5],[rad,ang+Math.PI/5]]){const p=center.add(bb.side.scale(Math.cos(phi)*r)).add(forward.scale(Math.sin(phi)*r));pp.push(p.x,nearRiver(p.x,p.z).y+.035,p.z);nn.push(0,1,0);cc.push(.8,.96,1,1);}ii.push(base,base+1,base+2,base,base+2,base+3);}riverMotionMetrics.foamArcs++;}const foam=new Mesh('cascade foot foam arcs',scene),fv=new VertexData();fv.positions=pp;fv.indices=ii;fv.normals=nn;fv.colors=cc;fv.applyToMesh(foam);M.foam.backFaceCulling=false;own(foam,M.foam,false);foam.receiveShadows=false;}
entity('waterfall rocks');for(const [u,v] of [[181,42],[159,143]]){let p=P(u,v),a=nearRiver(p.x,p.z);for(let j=0;j<15;j++){let side=j%2?-1:1,xx=p.x+side*(a.w*.55+random()*2.5),zz=p.z+(random()-.5)*5.8,yy=height(xx,zz);if(nearRiver(xx,zz).dist<nearRiver(xx,zz).w*.53)continue;rock('cascade boulder',V(xx,yy+.3,zz),.8+random()*.8,.65+random()*.9,.85+random()*.7,j%3?M.stone:M.stoneLight,true);bankStats.boulders++;}}
// Eastern channels and water bodies use the same material and ground profile.
function eastWaterMesh(id,p,ix,uv){entity('expanded water '+id);const mesh=new Mesh('expanded water '+id,scene),vd=new VertexData();vd.positions=p;vd.indices=ix;vd.uvs=uv;vd.normals=Array.from({length:p.length},(_,i)=>i%3===1?1:0);vd.applyToMesh(mesh);own(mesh,M.water,false);mesh.receiveShadows=false;mesh.freezeWorldMatrix();return mesh;}
for(const {id,curve} of eastChannels){for(let first=0;first<curve.length-1;first+=40){const last=Math.min(curve.length-1,first+40),p=[],ix=[],uv=[];for(let i=first;i<=last;i++){const q=curve[i],dir=curve[Math.min(curve.length-1,i+1)].p.subtract(curve[Math.max(0,i-1)].p);dir.y=0;dir.normalize();const side=V(-dir.z,0,dir.x);for(const k of [-1,1]){const v=q.p.add(side.scale(k*q.w*.53));p.push(v.x,v.y,v.z);uv.push(v.x/9,v.z/9);}if(i>first){const a=(i-first-1)*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}}eastWaterMesh(id+' '+first,p,ix,uv);}}
function waterTriangles(poly){const ring=poly.map((_,i)=>i),out=[],cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),area=poly.reduce((a,p,i)=>a+p.x*poly[(i+1)%poly.length].z-poly[(i+1)%poly.length].x*p.z,0),sign=Math.sign(area)||1;const inside=(p,a,b,c)=>sign*cross(a,b,p)>=-1e-8&&sign*cross(b,c,p)>=-1e-8&&sign*cross(c,a,p)>=-1e-8;while(ring.length>3){let found=false;for(let i=0;i<ring.length;i++){const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length];if(sign*cross(poly[a],poly[b],poly[c])<=1e-8||ring.some(k=>k!==a&&k!==b&&k!==c&&inside(poly[k],poly[a],poly[b],poly[c])))continue;out.push(a,b,c);ring.splice(i,1);found=true;break;}if(!found)throw Error('Invalid water polygon');}out.push(...ring);return out;}
for(const f of eastPolygons){const p=f.points,positions=p.flatMap(v=>[v.x,f.y,v.z]),uv=p.flatMap(v=>[v.x/12,v.z/12]);eastWaterMesh(f.id,positions,waterTriangles(p),uv);}
const HOUSE={u:409,v:137,w:14.5,d:9,h:5.6,angle:-.30,porchRatio:.77,porchDepth:3.65};
const porchExtension=HOUSE.porchDepth-2.8;
const houseXZ=(x,z)=>V(X(HOUSE.u)+x*Math.cos(HOUSE.angle)+z*Math.sin(HOUSE.angle),0,Z(HOUSE.v)-x*Math.sin(HOUSE.angle)+z*Math.cos(HOUSE.angle));
let gateBlocked=()=>false,archBlocked=()=>false,archRainSurface=()=>null;const fenceColliders=[];const fencePoints=layout.residence.boundary.map(([u,v])=>{let p=P(u,v);if(v<=115&&u>=278&&u<=533){const candidate=P(u,v-4);const n=nearRiver(candidate.x,candidate.z);if(n.dist>n.w/2+1.0)p=candidate;}const center=P(430,153);for(let n=0;n<25&&nearRiver(p.x,p.z).dist<nearRiver(p.x,p.z).w/2+.8;n++)p=Vector3.Lerp(p,center,.045);p.y=height(p.x,p.z);return p});
// Preserve random sequence for unchanged scenery; replace only the residence walkway.
const oldPath=layout.residence.path.map(p=>P(...p));
for(let i=1;i<oldPath.length;i++)for(let k=0;k<Math.ceil(Vector3.Distance(oldPath[i-1],oldPath[i])/.72)*2;k++)random();
const stairFoot=houseXZ(0,-HOUSE.d/2-3.725-porchExtension),bridgeEntry=P(...layout.bridges[0].ends[0],2.85),bridgeExit=P(...layout.bridges[0].ends[1],2.85);
const bridgeAxis=bridgeExit.subtract(bridgeEntry);bridgeAxis.y=0;bridgeAxis.normalize();const bridgeSide=V(-bridgeAxis.z,0,bridgeAxis.x),bridgeHalf=1.575;
const wheatSpec=layout.fields.find(f=>f.id==='trigo'),wheatGate=P(...wheatSpec.gate.at);
const pathControls=[stairFoot,houseXZ(0,-HOUSE.d/2-4.20-porchExtension),P(466,185),P(496,190),P(515,195),bridgeEntry];
const pathPoints=[];
for(let i=1;i<pathControls.length;i++){
 const a=pathControls[i-1],b=pathControls[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.28));
 for(let j=0;j<n;j++){
  const p=Vector3.CatmullRom(pathControls[Math.max(0,i-2)],a,b,pathControls[Math.min(pathControls.length-1,i+1)],j/n);p.y=height(p.x,p.z);pathPoints.push(p);
 }
}
const endpoint=bridgeEntry.clone();endpoint.y=height(endpoint.x,endpoint.z);pathPoints.push(endpoint);
const pathRows=[],pathFlowerPositions=[];
const pathDistance=(x,z)=>{let best=Infinity;for(let i=1;i<pathPoints.length;i++)best=Math.min(best,segDist(x,z,pathPoints[i-1],pathPoints[i]));return best;};
entity('stone walkway');
const pathVertices=[],pathIndices=[],pathUV=[],pathColors=[];
// Match the rendered terrain triangles, not only the continuous height function.
function renderedTerrainY(x,z){
 const coord=(a,x)=>{let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m]<=x)lo=m;else hi=m;}return lo+Math.max(0,Math.min(1-1e-8,(x-a[lo])/(a[hi]-a[lo])));};const u=coord(terrainXs,x),v=coord(terrainZs,z);
 const i=Math.floor(u),j=Math.floor(v),fx=u-i,fz=v-j,k=j*(nx+1)+i;
 const a=pos[k*3+1],b=pos[(k+1)*3+1],c=pos[(k+nx+1)*3+1],dd=pos[(k+nx+2)*3+1];
 return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:dd+(c-dd)*(1-fx)+(b-dd)*(1-fz);
}
const pavingMaterial=mat('individual natural stone paving','#ffffff');pavingMaterial.backFaceCulling=false;
pavingMaterial.twoSidedLighting=false;
pavingMaterial.ambientColor=Color3.FromHexString('#ad9e80');
// Keep a small reflected-light component so the stone never reads as black soil.
pavingMaterial.emissiveColor=new Color3(.065,.055,.04);
pavingMaterial.specularColor=Color3.Black();
const pavingStats={residence:0,approach:0,colors:new Set(),maxStoneSize:0};
let pathLengthHome=0;
for(let i=0;i<pathPoints.length;i++){
 const p=pathPoints[i],dir=i===0?houseXZ(0,-1).subtract(houseXZ(0,0)):pathPoints[Math.min(i+1,pathPoints.length-1)].subtract(pathPoints[i-1]);dir.y=0;dir.normalize();
 const endBlend=Math.max(0,1-(pathPoints.length-1-i)/5),side=Vector3.Lerp(V(-dir.z,0,dir.x),bridgeSide,endBlend).normalize(),half=(1.10+.14*Math.min(1,i/8))*(1-endBlend)+bridgeHalf*endBlend;if(i)pathLengthHome+=Math.hypot(p.x-pathPoints[i-1].x,p.z-pathPoints[i-1].z);
 const row=[];
 for(const k of [-1,0,1]){
  const v=p.add(side.scale(k*half));v.y=Math.max(renderedTerrainY(v.x,v.z),height(v.x,v.z))+.095;
  if(i===pathPoints.length-1)v.y=2.945;
  row.push(v);pathVertices.push(...v.asArray());pathUV.push((k+1)/2,pathLengthHome);pathColors.push(.35,.30,.23,1);
 }
 pathRows.push(row);
 if(i)for(let k=0;k<2;k++){const n=(i-1)*3+k;pathIndices.push(n,n+3,n+1,n+1,n+3,n+4);}
}
// Separate beveled stone volumes, with natural staggered joints. All geometry is
// batched into one mesh per road; no per-stone meshes or texture downloads.
function makeStoneRoad(name,rows,positions,indices,uvs,colors,kind){
 const distances=[0];for(let i=1;i<rows.length;i++)distances.push(distances[i-1]+Math.hypot(rows[i][1].x-rows[i-1][1].x,rows[i][1].z-rows[i-1][1].z));
 const length=distances.at(-1);
 function sample(at,u){
  const v=Math.max(0,Math.min(length,at));let i=1;while(i<distances.length-1&&distances[i]<v)i++;
  const k=(v-distances[i-1])/Math.max(.00001,distances[i]-distances[i-1]);
  const p=Vector3.Lerp(Vector3.Lerp(rows[i-1][0],rows[i-1][2],u),Vector3.Lerp(rows[i][0],rows[i][2],u),k);
  const fade=Math.min(1,(length-v)/.65);p.y=p.y+(Math.max(p.y,renderedTerrainY(p.x,p.z)+.095,height(p.x,p.z)+.095)-p.y)*fade;return p;
 }
 // deterministic local hash, independent of other map assets
 const noise=(a,b,c)=>{const v=Math.sin(a*73.23+b*31.19+c*19.13)*43758.5453;return v-Math.floor(v);};
 const palette=['#b7ad92','#aaa38e','#c3b79b','#9d9788','#c9bda4','#b1a38d','#a9a08b'];
 function vertex(p,col){const n=positions.length/3;positions.push(...p.asArray());colors.push(col.r,col.g,col.b,1);uvs.push(p.x,p.z);return n;}
 function face(a,b,c){indices.push(a,b,c);}
 for(let lane=0;lane<3;lane++){
  let at=0,serial=0;
  while(at<length-.001){
   let step=(serial===0&&lane%2)?.36:.57+.24*noise(lane,serial,1);
   let next=Math.min(length,at+step);if(length-next<.24)next=length;
   const gap=Math.min(.024,(next-at)*.11),a=at+(at===0?0:gap),b=next-(next===length?0:gap),u0=lane/3+.010,u1=(lane+1)/3-.010;
   const cut=Math.min(.075,(b-a)*.16),ch=.035+.018*noise(lane,serial,2);
   const shape=[[a+cut,u0],[b-cut,u0],[b,u0+ch],[b,u1-ch],[b-cut,u1],[a+cut,u1],[a,u1-ch],[a,u0+ch]];
   const col=Color3.FromHexString(palette[Math.floor(noise(lane,serial,3)*palette.length)]),edge=col.scale(.72);
   pavingStats.colors.add(palette[Math.floor(noise(lane,serial,3)*palette.length)]);pavingStats[kind]++;pavingStats.maxStoneSize=Math.max(pavingStats.maxStoneSize,b-a);
   const relief=x=>Math.max(0,Math.min(1,(length-x)/.65));
   const outer=shape.map(([x,u])=>{const p=sample(x,u);p.y+=.017*relief(x);return vertex(p,edge);});
   const inner=shape.map(([x,u])=>{const xx=x+((a+b)/2-x)*.07,p=sample(xx,u+((u0+u1)/2-u)*.08);p.y+=(.065+noise(lane,serial,4)*.019)*relief(xx);return vertex(p,col);});
   const center=sample((a+b)/2,(u0+u1)/2);center.y+=(.073+noise(lane,serial,4)*.019)*relief((a+b)/2);const c=vertex(center,col);
   for(let k=0;k<8;k++){const n=(k+1)%8;face(c,inner[k],inner[n]);face(inner[k],outer[k],outer[n]);face(inner[k],outer[n],inner[n]);}
   at=next;serial++;
  }
 }
 const mesh=new Mesh(name,scene),v=new VertexData();v.positions=positions;v.indices=indices;v.uvs=uvs;v.colors=colors;v.normals=[];
 VertexData.ComputeNormals(positions,indices,v.normals);
 for(let i=0;i<v.normals.length;i+=3){if(v.normals[i+1]<0){v.normals[i]*=-1;v.normals[i+1]*=-1;v.normals[i+2]*=-1;}if(v.normals[i+1]<.25){v.normals[i]=0;v.normals[i+1]=1;v.normals[i+2]=0;}}
 v.applyToMesh(mesh);return own(mesh,pavingMaterial,false);
}
const pathMesh=makeStoneRoad('residential individual stone paving',pathRows,pathVertices,pathIndices,pathUV,pathColors,'residence');
// Clearance measured against interpolated road half-width, not an arbitrary radius around the gate.
function roadClearance(rows,x,z){
 let best=Infinity;for(let i=1;i<rows.length;i++){const a=rows[i-1][1],b=rows[i][1],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),widthA=Math.hypot(rows[i-1][0].x-a.x,rows[i-1][0].z-a.z),widthB=Math.hypot(rows[i][0].x-b.x,rows[i][0].z-b.z);best=Math.min(best,Math.hypot(x-a.x-u*dx,z-a.z-u*dz)-widthA-(widthB-widthA)*u);}return best;
}
const residenceRails=[],bridgeFenceLinks=[],editableFences=new Map();
function fencePiece(id,p,q,kind='original'){
 entity('residence fence');const before=groups['residence fence'].length,collider=[p.clone(),q.clone()];
 for(const v of [p,q]){box('fence post',v.x,v.y+.61,v.z,.20,1.22,.20,M.woodDark);box('post cap',v.x,v.y+1.25,v.z,.28,.12,.28,M.woodLight);}
 for(const y of [.40,.89])beam('fence rail',p.add(V(0,y,0)),q.add(V(0,y,0)),.13,M.woodLight,.13);
 // Merge within a single editable piece, never across pieces.
 const raw=groups['residence fence'].splice(before),meshes=[];
 for(const part of ['post','cap','rail']){const role=part==='rail'?'rail':'post',list=raw.filter(v=>(v.name==='fence rail'?'rail':v.name==='post cap'?'cap':'post')===part),m=part==='post'?M.woodDark:M.woodLight;if(!list.length)continue;for(const v of list)v.computeWorldMatrix(true);
  const merged=Mesh.MergeMeshes(list,false,true);if(!merged){for(const v of list)v.metadata={fenceRole:role};meshes.push(...list);continue;}
  merged.name='editable fence '+id+' '+part;merged.metadata={fenceRole:role};merged.material=m;merged.receiveShadows=true;merged.isPickable=false;for(const v of list){shadow.removeShadowCaster(v,false);v.dispose(false,false);}shadow.addShadowCaster(merged,false);merged.freezeWorldMatrix();meshes.push(merged);
 }
 groups['residence fence'].push(...meshes);fenceColliders.push(collider);
 if(kind==='original')residenceRails.push(collider);else if(kind==='bridge')bridgeFenceLinks.push(collider);else if(kind==='field')fieldRails.push(collider);
 const piece={id,kind,a:p.clone(),b:q.clone(),meshes,collider};editableFences.set(id,piece);return piece;
}
entity('residence fence');
for(let i=0;i<fencePoints.length;i++){
 const a=fencePoints[i],b=fencePoints[(i+1)%fencePoints.length],n=Math.ceil(Vector3.Distance(a,b)/1.9);
 for(let j=0;j<n;j++){const p=Vector3.Lerp(a,b,j/n),q=Vector3.Lerp(a,b,(j+1)/n);
  const clear=Array.from({length:13},(_,k)=>Vector3.Lerp(p,q,k/12)).every(v=>roadClearance(pathRows,v.x,v.z)>.38&&Math.hypot(v.x-bridgeEntry.x,v.z-bridgeEntry.z)>1.85);
  if(!clear)continue;
  p.y=height(p.x,p.z);q.y=height(q.x,q.z);fencePiece('base-'+i+'-'+j,p,q);
 }
}
// Join the existing fence ends to the actual bridge railing without closing the walkway.
for(const side of [-1,1]){
 const end=bridgeEntry.add(bridgeSide.scale(side*1.48));end.y=bridgeEntry.y;
 const candidates=residenceRails.flat().filter(p=>side*Vector3.Dot(p.subtract(bridgeEntry),bridgeSide)>1.30).sort((a,b)=>Math.hypot(a.x-end.x,a.z-end.z)-Math.hypot(b.x-end.x,b.z-end.z));
 const start=candidates.find(p=>Math.hypot(p.x-end.x,p.z-end.z)<7&&Array.from({length:20},(_,i)=>Vector3.Lerp(p,end,i/20)).every(v=>side*Vector3.Dot(v.subtract(bridgeEntry),bridgeSide)>1.30));
 if(start&&Math.hypot(start.x-end.x,start.z-end.z)>.12){const n=Math.ceil(Math.hypot(start.x-end.x,start.z-end.z)/1.9);for(let i=0;i<n;i++){const p=Vector3.Lerp(start,end,i/n),q=Vector3.Lerp(start,end,(i+1)/n);fencePiece('bridge-'+side+'-'+i,p,q,'bridge');}}
}
// Exterior approach is a physical ground-following ribbon, not a painted road.
entity('bridge approach');const approach=[[575,248],[596,258],[615,275],[624,293],[630,310],[645,326],[667,326],[699,321],[731,318],[744,316],[752.5,310],[752.5,302],[752.5,296]].map(p=>P(...p));
const approachCurve=[];for(let i=1;i<approach.length;i++){const a=approach[i-1],b=approach[i],n=Math.ceil(Vector3.Distance(a,b)/.42);for(let j=0;j<n;j++)approachCurve.push(Vector3.CatmullRom(approach[Math.max(0,i-2)],a,b,approach[Math.min(approach.length-1,i+1)],j/n));}approachCurve.push(approach.at(-1));
const rp=[],ri=[],rc=[],ru=[],sections=[];let pathLength=0;
for(let i=0;i<approachCurve.length;i++){const p=approachCurve[i],d=approachCurve[Math.min(i+1,approachCurve.length-1)].subtract(approachCurve[Math.max(0,i-1)]);d.y=0;d.normalize();if(i)pathLength+=Vector3.Distance(p,approachCurve[i-1]);const joinBlend=Math.max(0,1-i/5),side=Vector3.Lerp(V(-d.z,0,d.x),bridgeSide,joinBlend).normalize(),gateBlend=Math.max(0,1-Math.hypot(p.x-wheatGate.x,p.z-wheatGate.z)/3.5),half=(1.53*(1-joinBlend)+bridgeHalf*joinBlend)*(1-gateBlend)+1.20*gateBlend;
 const row=[];for(const offset of [-1.65,-1.35,-.75,0,.75,1.35,1.65]){const q=p.add(side.scale(offset*half/1.65));q.y=i===0?2.945:Math.max(renderedTerrainY(q.x,q.z),height(q.x,q.z))+.095;row.push(q);rp.push(...q.asArray());ru.push((offset+1.65)/3.3,pathLength/3);const edge=Math.abs(offset)/1.65,shade=.96+.045*Math.sin(i*.47+offset*2.1);rc.push(.84*shade*(1-.13*edge),.66*shade*(1-.12*edge),.46*shade*(1-.10*edge),1);}
 sections.push(row);
 if(i)for(let j=0;j<6;j++){const k=(i-1)*7+j;ri.push(k,k+7,k+1,k+1,k+7,k+8);}
}
// Fine gravel is baked into a small tile: no extra meshes or collider cost.
const dirtGravelTex=new DynamicTexture('fine pebbles in light earth',{width:256,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);
{
 const c=dirtGravelTex.getContext();let seed=89127;const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 c.fillStyle='#e5d1ad';c.fillRect(0,0,256,256);
 for(let i=0;i<4600;i++){const x=rnd()*256,y=rnd()*256,v=120+Math.floor(rnd()*110);c.fillStyle='rgba('+v+','+(v-12)+','+(v-24)+',.14)';c.fillRect(x,y,.5+rnd()*2.1,.5+rnd()*1.8);}
 for(let i=0;i<280;i++){const x=rnd()*256,y=rnd()*256,r=.6+rnd()*1.8,angle=rnd()*Math.PI;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#9c896e';c.beginPath();c.ellipse(.4,.6,r*1.2,r*.8,0,0,Math.PI*2);c.fill();c.fillStyle=['#d3c7b0','#a99f8b','#ece0c7'][i%3];c.beginPath();c.ellipse(0,0,r,r*.63,0,0,Math.PI*2);c.fill();c.restore();}
 dirtGravelTex.update();dirtGravelTex.wrapU=dirtGravelTex.wrapV=Texture.WRAP_ADDRESSMODE;
}
const dirtRoadMaterial=mat('light compacted farm dirt with fine gravel','#ffffff');dirtRoadMaterial.diffuseTexture=dirtGravelTex;dirtRoadMaterial.backFaceCulling=false;dirtRoadMaterial.specularColor=Color3.Black();dirtRoadMaterial.emissiveColor=new Color3(.025,.017,.009);
const road=new Mesh('continuous compacted farm dirt road',scene),dirtRoadData=new VertexData();dirtRoadData.positions=rp;dirtRoadData.indices=ri;dirtRoadData.colors=rc;dirtRoadData.uvs=ru;dirtRoadData.normals=Array.from({length:rp.length},(_,i)=>i%3===1?1:0);dirtRoadData.applyToMesh(road);own(road,dirtRoadMaterial,false);
const roadMetrics={sections:sections.length,vertices:road.getTotalVertices(),indices:road.getTotalIndices(),segments:approachCurve.length-1,material:'dirt',fineGravel:true,textureSize:256,stones:pavingStats.approach,stoneColors:pavingStats.colors.size,maxStoneSize:pavingStats.maxStoneSize};
// Curved centerlines are joined into a single raster union, projected onto
// the exact terrain triangles. No crossing ribbons, no grass poking through.
const expansionRoads=[],roadMaskSize=2048,roadMask=new DynamicTexture('continuous farm road union',{width:roadMaskSize,height:roadMaskSize},scene,true,Texture.TRILINEAR_SAMPLINGMODE),roadCtx=roadMask.getContext();
const roadPixel=(x,z)=>[(x-minX)/(maxX-minX)*roadMaskSize,(maxZ-z)/(maxZ-minZ)*roadMaskSize],roadSx=roadMaskSize/(maxX-minX),roadSz=roadMaskSize/(maxZ-minZ);
function paintRoad(points,width){if(points.length<2)return;roadCtx.save();roadCtx.scale(roadSx,roadSz);roadCtx.translate(-minX,maxZ);roadCtx.beginPath();points.forEach((p,i)=>i?roadCtx.lineTo(p.x,-p.z):roadCtx.moveTo(p.x,-p.z));roadCtx.lineWidth=width;roadCtx.lineCap='round';roadCtx.lineJoin='round';roadCtx.stroke();roadCtx.restore();}
for(const spec of [...layout.roads,{id:'western_rural_link',width:18,points:[[70,527],[-20,527],[-48,520],[-48,185]]},{id:'western_south_lane',width:18,points:[[-48,520],[-48,760],[-48,1010],[-48,1210]]}]){
 const points=spec.points.map(p=>P(...p)),curve=[];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(2,Math.ceil(Vector3.Distance(a,b)/.45));for(let j=0;j<n;j++)curve.push(Vector3.CatmullRom(points[Math.max(0,i-2)],a,b,points[Math.min(points.length-1,i+1)],j/n));}
 curve.push(points.at(-1));expansionRoads.push({id:spec.id,curve,width:spec.width/8});expansionQA.roads.push({id:spec.id,samples:curve.length,triangles:0});
}
// Connect near-miss endpoints to other roads instead of leaving square dead ends.
// Intentional exits, pen entry and shoreline crossings retain their destinations.
const roadJoins=[];
for(const f of expansionRoads)for(const p of [f.curve[0],f.curve.at(-1)]){
 if(['north_exit','northeast_exit','pen_access'].includes(f.id)&&p===f.curve.at(-1)||f.id==='spine'&&p===f.curve[0])continue;
 let best=null,dist=6;for(const g of expansionRoads)if(g!==f)for(let i=1;i<g.curve.length;i++){const a=g.curve[i-1],b=g.curve[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1))),q=Vector3.Lerp(a,b,u),d=Math.hypot(p.x-q.x,p.z-q.z);if(d<dist){best=q;dist=d;}}
 if(best&&dist>.10){roadJoins.push({curve:[p,best],width:f.width});}
}
roadCtx.strokeStyle='#ffffff';for(const f of [...expansionRoads,...roadJoins])paintRoad(f.curve,f.width);
paintRoad(approachCurve,3.0);
// Small direct links from each gate to the nearest existing road; no new grid.
for(const f of layout.fields){const p=P(...f.gate.at);let best=null,dist=7;for(const road of expansionRoads)for(const q of road.curve){const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<dist){best=q;dist=d;}}if(best){const link={curve:[p,best],width:Math.min(2.2,f.gate.width/8)};roadJoins.push(link);paintRoad(link.curve,link.width);}}
// Water is an exclusion mask, not a second surface covering the roads.
roadCtx.globalCompositeOperation='destination-out';for(let i=1;i<channel.length;i++)paintRoad([channel[i-1].p,channel[i].p],Math.max(channel[i-1].w,channel[i].w)*1.12+.35);
for(const {curve} of eastChannels)for(let i=1;i<curve.length;i++)paintRoad([curve[i-1].p,curve[i].p],Math.max(curve[i-1].w,curve[i].w)*1.12+.35);
for(const f of eastPolygons){roadCtx.beginPath();f.points.forEach((p,i)=>{const q=roadPixel(p.x,p.z);i?roadCtx.lineTo(...q):roadCtx.moveTo(...q);});roadCtx.closePath();roadCtx.fill();}
roadCtx.globalCompositeOperation='source-in';roadCtx.fillStyle='#b88d60';roadCtx.fillRect(0,0,roadMaskSize,roadMaskSize);
roadCtx.globalCompositeOperation='source-atop';{let seed=1173;const rand=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;for(let i=0;i<46000;i++){const x=rand()*roadMaskSize,y=rand()*roadMaskSize;roadCtx.fillStyle=i%3?'rgba(101,70,42,.13)':'rgba(246,218,165,.20)';roadCtx.fillRect(x,y,.7+rand()*1.6,.7+rand()*1.6);}}
roadCtx.globalCompositeOperation='source-over';
const roadAlpha=roadCtx.getImageData(0,0,roadMaskSize,roadMaskSize).data;roadMask.hasAlpha=true;roadMask.wrapU=roadMask.wrapV=Texture.CLAMP_ADDRESSMODE;roadMask.update();
const roadUnionMaterial=mat('seamless compacted dirt network','#ffffff');roadUnionMaterial.diffuseTexture=roadMask;roadUnionMaterial.useAlphaFromDiffuseTexture=true;roadUnionMaterial.transparencyMode=1;roadUnionMaterial.alphaCutOff=.42;roadUnionMaterial.backFaceCulling=false;roadUnionMaterial.specularColor=Color3.Black();
function roadMaskAt(x,z){const [u,v]=roadPixel(x,z);return u>=0&&v>=0&&u<roadMaskSize&&v<roadMaskSize?roadAlpha[(Math.floor(v)*roadMaskSize+Math.floor(u))*4+3]/255:0;}
const roadUnionQA={patches:0,triangles:0,joins:roadJoins.length,atlas:roadMaskSize};
for(const patch of terrainPatches){const {i0,i1,j0,j1}=patch,p=[],ix=[],uv=[],norm=[],ids=new Map();function vert(i,j){const key=j*(nx+1)+i;if(ids.has(key))return ids.get(key);const k=p.length/3,x=pos[key*3],z=pos[key*3+2];p.push(x,pos[key*3+1]+.065,z);uv.push((x-minX)/(maxX-minX),(z-minZ)/(maxZ-minZ));norm.push(...terrainNormals.slice(key*3,key*3+3));ids.set(key,k);return k;}
 for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++){const [u0,v1]=roadPixel(terrainXs[i],terrainZs[j]),[u1,v0]=roadPixel(terrainXs[i+1],terrainZs[j+1]);let hit=false;for(let v=Math.max(0,Math.floor(v0));v<=Math.min(roadMaskSize-1,Math.ceil(v1))&&!hit;v+=2)for(let u=Math.max(0,Math.floor(u0));u<=Math.min(roadMaskSize-1,Math.ceil(u1));u+=2)if(roadAlpha[(v*roadMaskSize+u)*4+3]>100){hit=true;break;}if(!hit)continue;const a=vert(i,j),b=vert(i,j+1),c=vert(i+1,j),d=vert(i+1,j+1);if(terrainFlip)ix.push(a,c,b,c,d,b);else ix.push(a,b,c,c,b,d);}
 if(ix.length){entity('farm road union '+i0+' '+j0);const m=new Mesh('continuous road surface '+i0+' '+j0,scene),v=new VertexData();v.positions=p;v.indices=ix;v.uvs=uv;v.normals=norm;v.applyToMesh(m);own(m,roadUnionMaterial,false);m.freezeWorldMatrix();roadUnionQA.patches++;roadUnionQA.triangles+=ix.length/3;}
}
road.isVisible=false; // Retain original QA geometry metadata, never render a competing ribbon.
entity('bridge home');const [ba,bb]=layout.bridges[0].ends.map(p=>P(...p,2.85));const bd=bb.subtract(ba),bl=bd.length(),ang=Math.atan2(bd.x,bd.z),bs=V(Math.cos(ang),0,-Math.sin(ang));
const bridgePlankCount=Math.ceil(bl/.36),bridgePlankDepth=bl/bridgePlankCount;
for(let k=0;k<bridgePlankCount;k++){let p=Vector3.Lerp(ba,bb,(k+.5)/bridgePlankCount);box('bridge plank',p.x,p.y,p.z,3.15,.19,bridgePlankDepth,k%3?M.woodLight:M.wood,ang);for(let s of [-1,1]){let q=p.add(bs.scale(s*1.48));if(k%4===0){box('bridge rail post',q.x,q.y+.55,q.z,.20,1.1,.20,M.woodDark);box('bridge pier',q.x,q.y-.75,q.z,.27,1.6,.27,M.woodDark)}}}for(let s of [-1,1])beam('bridge railing',ba.add(bs.scale(s*1.48)).add(V(0,.91,0)),bb.add(bs.scale(s*1.48)).add(V(0,.91,0)),.14,M.woodLight);
// Stage 2A: first agricultural sector from the traced reference.
const wheatPolygon=wheatSpec.polygon.map(p=>P(...p));
const wheatBounds={minX:Math.min(...wheatPolygon.map(p=>p.x)),maxX:Math.max(...wheatPolygon.map(p=>p.x)),minZ:Math.min(...wheatPolygon.map(p=>p.z)),maxZ:Math.max(...wheatPolygon.map(p=>p.z))};
const wheatBeds=[],fieldRails=[],wheatPlots=[];let fieldFenceSerial=0;
function inWheat(x,z){let inside=false;for(let i=0,k=wheatPolygon.length-1;i<wheatPolygon.length;k=i++){const a=wheatPolygon[i],b=wheatPolygon[k];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
entity('wheat sector fence');
function fieldRail(a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.65));for(let i=0;i<n;i++){const p=Vector3.Lerp(a,b,i/n),q=Vector3.Lerp(a,b,(i+1)/n);p.y=height(p.x,p.z);q.y=height(q.x,q.z);fencePiece('field-'+fieldFenceSerial++,p,q,'field');}
}
for(let i=0;i<wheatPolygon.length;i++){
 const a=wheatPolygon[i],b=wheatPolygon[(i+1)%wheatPolygon.length],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),u=((wheatGate.x-a.x)*dx+(wheatGate.z-a.z)*dz)/(l*l);
 if(u>0&&u<1&&Math.hypot(wheatGate.x-a.x-u*dx,wheatGate.z-a.z-u*dz)<.05){const gap=wheatSpec.gate.width/8/2/l;fieldRail(a,Vector3.Lerp(a,b,u-gap));fieldRail(Vector3.Lerp(a,b,u+gap),b);}else fieldRail(a,b);
}
entity('wheat prepared soil');
const bedSurfaceStats={continuousBeds:0,vertices:0,plotGaps:0,minWidth:Infinity,maxWidth:0,maxBoundaryGap:0};
const bedPlots=new Map();
function bedHeightAt(x,z,bed){return .065;}
for(const side of [-1,1]){
 const x1=side<0?wheatBounds.minX+1.15:wheatGate.x+1.65,x2=side<0?wheatGate.x-1.65:wheatBounds.maxX-1.15;
 for(let z=wheatBounds.minZ+1.65;z+1.35<wheatBounds.maxZ-1.1;z+=2.25){
  const bed={id:'trigo-'+wheatBeds.length,x1,x2,z1:z,z2:z+1.35};wheatBeds.push(bed);
  // Keep precisely the old number and IDs of plots; redistribute the entire bed.
  let count=0;for(let x=x1;x<x2-.45;x+=1.18){if(Math.min(x+1.12,x2)-x<.45)break;count++;}
  const parts=[],width=(x2-x1)/count;
  for(let i=0;i<count;i++){
   const a=x1+(x2-x1)*i/count,b=x1+(x2-x1)*(i+1)/count;
   const p={id:'trigo-'+(wheatBeds.length-1)+'-'+wheatPlots.length,x1:a,x2:b,z1:z,z2:z+1.35,x:(a+b)/2,z:z+.675,bedId:bed.id};wheatPlots.push(p);parts.push(p);
   bedSurfaceStats.minWidth=Math.min(bedSurfaceStats.minWidth,width);bedSurfaceStats.maxWidth=Math.max(bedSurfaceStats.maxWidth,width);
   bedSurfaceStats.maxBoundaryGap=Math.max(bedSurfaceStats.maxBoundaryGap,Math.abs(a-(parts[i-1]?.x2??bed.x1)));
  }
  bedSurfaceStats.maxBoundaryGap=Math.max(bedSurfaceStats.maxBoundaryGap,Math.abs(parts.at(-1).x2-bed.x2));bedPlots.set(bed.id,parts);bedSurfaceStats.continuousBeds++;
 }
}
bedSurfaceStats.plotGaps=bedSurfaceStats.maxBoundaryGap>1e-8?1:0;
entity('wheat sector sign');
const fieldSignCollider={x:wheatGate.x+2.2,z:wheatGate.z-.65};
{
 const x=fieldSignCollider.x,z=fieldSignCollider.z,y=height(x,z);
 for(const side of [-1,1])box('field sign leg',x+side*.64,y+.62,z,.12,1.24,.12,M.woodDark);
 box('field sign board',x,y+1.25,z,1.85,.63,.12,M.woodLight);
 const tex=new DynamicTexture('local field sign trigo',{width:256,height:96},scene,true),ctx=tex.getContext();ctx.fillStyle='#c38b50';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#805631';ctx.lineWidth=7;ctx.strokeRect(5,5,246,86);ctx.fillStyle='#372718';ctx.font='bold 43px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 25px sans-serif';ctx.fillText('GUIA DE CULTIVOS',128,34);ctx.font='22px sans-serif';ctx.fillText(`${Object.keys(CROP_CALENDAR).length} CULTURAS · CONSULTE AQUI`,128,69,230);tex.update();
 const material=mat('field sign text','#ffffff');material.diffuseTexture=tex;material.emissiveColor=new Color3(.15,.12,.08);material.backFaceCulling=false;for(const side of [-1,1]){const sign=MeshBuilder.CreatePlane('crop guide label '+side,{width:1.72,height:.53},scene);sign.position=V(x,y+1.25,z+side*.067);sign.rotation.y=side===1?Math.PI:0;own(sign,material,false);}
}
// All reference sectors receive real beds, stable IDs, a curved perimeter and a physical sign.
// Existing wheat IDs, rails and geometry are never renumbered.
const farmSectors=[{id:'trigo',name:'Trigo',polygon:wheatPolygon,beds:wheatBeds,plots:wheatPlots,gate:wheatGate,sign:fieldSignCollider,preferred:'wheat'}],extraFarmRails=[];
const sectorCrop={milho:'corn',arroz:'rice',tomate:'tomato',alface:'lettuce',cenoura:'carrot',ervilha:'pea',ervas:'basil'};
function insidePolygon(points,x,z){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
function sectorAt(x,z){const cell=sectorCells.get(farmCellKey(x,z));return cell?.find(f=>insidePolygon(f.polygon,x,z));}
for(const spec of layout.fields.filter(f=>f.id!=='trigo')){
 const polygon=spec.polygon.map(p=>P(...p)),gate=P(...spec.gate.at),beds=[],plots=[],sign={x:gate.x+2.2,z:gate.z-.65};
 const f={id:spec.id,name:spec.name,polygon,gate,beds,plots,sign,preferred:sectorCrop[spec.id]||null};farmSectors.push(f);
 const minx=Math.min(...polygon.map(p=>p.x)),maxx=Math.max(...polygon.map(p=>p.x)),minz=Math.min(...polygon.map(p=>p.z)),maxz=Math.max(...polygon.map(p=>p.z));
 for(const side of [-1,1]){const x1=side<0?minx+1.5:gate.x+1.65,x2=side<0?gate.x-1.65:maxx-1.5;
 for(let z=minz+1.65;z+1.35<maxz-1.1;z+=2.25){if(x2-x1<1.2)continue;const bed={id:spec.id+'-'+beds.length,x1,x2,z1:z,z2:z+1.35};if(![[x1,z],[x2,z],[x1,z+1.35],[x2,z+1.35]].every(([x,y])=>insidePolygon(polygon,x,y)))continue;
 beds.push(bed);const parts=[],count=Math.max(1,Math.floor((x2-x1)/1.18));for(let i=0;i<count;i++){const a=x1+(x2-x1)*i/count,b=x1+(x2-x1)*(i+1)/count;const p={id:bed.id+'-'+plots.length,bedId:bed.id,x1:a,x2:b,z1:z,z2:z+1.35,x:(a+b)/2,z:z+.675};plots.push(p);parts.push(p);}bedPlots.set(bed.id,parts);
 }}
 entity('agricultural fence '+spec.id);
 // Round each polygon corner without shifting the gate opening.
 const rounded=[];for(let i=0;i<polygon.length;i++){const prev=polygon[(i+polygon.length-1)%polygon.length],p=polygon[i],next=polygon[(i+1)%polygon.length],a=Vector3.Lerp(p,prev,.22),b=Vector3.Lerp(p,next,.22);for(let j=0;j<=3;j++){const t=j/3;rounded.push(a.scale((1-t)**2).add(p.scale(2*t*(1-t))).add(b.scale(t*t)));}}
 for(let i=0;i<rounded.length;i++){const a=rounded[i],b=rounded[(i+1)%rounded.length],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));for(let k=0;k<n;k++){const p=Vector3.Lerp(a,b,k/n),q=Vector3.Lerp(a,b,(k+1)/n),m=Vector3.Lerp(p,q,.5);if(Math.hypot(m.x-gate.x,m.z-gate.z)<spec.gate.width/16+.4)continue;p.y=Math.max(height(p.x,p.z),renderedTerrainY(p.x,p.z));q.y=Math.max(height(q.x,q.z),renderedTerrainY(q.x,q.z));extraFarmRails.push([p,q]);box('field post',p.x,p.y+.48,p.z,.14,.96,.14,M.woodDark,0,false);for(const y of [.32,.72])beam('field rail',p.add(V(0,y,0)),q.add(V(0,y,0)),.10,M.woodLight,.10,false);}}
 entity('agricultural sign '+spec.id);const {x,z}=sign,y=Math.max(height(x,z),renderedTerrainY(x,z));
 for(const side of [-1,1])box('sign post',x+side*.64,y+.62,z,.12,1.24,.12,M.woodDark,0,false);box('sign board',x,y+1.25,z,1.85,.63,.12,M.woodLight,0,false);
 const tex=new DynamicTexture('field label '+spec.id,{width:256,height:96},scene,true),c=tex.getContext();c.fillStyle='#c38b50';c.fillRect(0,0,256,96);c.strokeStyle='#805631';c.lineWidth=6;c.strokeRect(5,5,246,86);c.fillStyle='#372718';c.textAlign='center';c.textBaseline='middle';c.font='bold 29px sans-serif';c.fillText(spec.name.toUpperCase(),128,34,232);c.font='17px sans-serif';c.fillText(f.preferred?'GUIA DE CULTIVO':'CULTIVO LIVRE',128,70,230);tex.update();
 const material=mat('field label '+spec.id,'#ffffff');material.diffuseTexture=tex;material.emissiveColor=new Color3(.15,.12,.08);material.backFaceCulling=false;for(const side of [-1,1]){const m=MeshBuilder.CreatePlane('field label '+spec.id+' '+side,{width:1.72,height:.53},scene);m.position=V(x,y+1.25,z+side*.067);m.rotation.y=side===1?Math.PI:0;own(m,material,false);}
}
// Immutable broad phase for expanded static fences and field polygons.
// Keep the exact polygon/segment tests as narrow phase; index all covered cells
// including fence clearance, so a point close to a cell edge cannot miss a rail.
const farmCellSize=4,sectorCells=new Map(),farmRailCells=new Map();
const farmCellKey=(x,z)=>Math.floor(x/farmCellSize)+':'+Math.floor(z/farmCellSize);
function indexFarmBounds(map,x0,z0,x1,z1,value){for(let i=Math.floor(x0/farmCellSize);i<=Math.floor(x1/farmCellSize);i++)for(let j=Math.floor(z0/farmCellSize);j<=Math.floor(z1/farmCellSize);j++){const k=i+':'+j,list=map.get(k);if(list)list.push(value);else map.set(k,[value]);}}
for(const f of farmSectors)indexFarmBounds(sectorCells,Math.min(...f.polygon.map(p=>p.x)),Math.min(...f.polygon.map(p=>p.z)),Math.max(...f.polygon.map(p=>p.x)),Math.max(...f.polygon.map(p=>p.z)),f);
for(const rail of extraFarmRails){const [a,b]=rail;indexFarmBounds(farmRailCells,Math.min(a.x,b.x)-.24,Math.min(a.z,b.z)-.24,Math.max(a.x,b.x)+.24,Math.max(a.z,b.z)+.24,rail);}
const nearbyFarmRails=(x,z)=>farmRailCells.get(farmCellKey(x,z))||[];
const allFarmPlots=farmSectors.flatMap(f=>f.plots),allFarmBeds=farmSectors.flatMap(f=>f.beds),farmPlotById=new Map(allFarmPlots.map(p=>[p.id,p])),farmBedById=new Map(allFarmBeds.map(b=>[b.id,b]));
expansionQA.sectors=farmSectors.map(f=>({id:f.id,beds:f.beds.length,plots:f.plots.length,gate:[f.gate.x,f.gate.z],preferred:f.preferred}));
const approachRows=sections.map(r=>[r[0],r[3],r[6]]);
const connectionQA={bridgeEntryRow:pathRows.at(-1),bridgeExitRow:approachRows[0],bridgePlankDepth,bridgePlankCount,bridgeHalf,bridgeAxis,bridgeSide,deckLength:bl,deckTop:2.945,fieldEnd:approachCurve.at(-1),fieldGate:wheatGate};
function house(id,u,v,w,d,h,angle,small=false){entity(id);const x=X(u),z=Z(v),y=height(x,z),C=(a,b,c)=>V(x+a*Math.cos(angle)+c*Math.sin(angle),y+b,z-a*Math.sin(angle)+c*Math.cos(angle));const B=(n,a,b,c,ww,hh,dd,m)=>{let p=C(a,b,c);return box(n,p.x,p.y,p.z,ww,hh,dd,m,angle)};const L=(n,a,b,ww,m)=>beam(n,C(...a),C(...b),ww,m);
 const doorW=small?w*.47:1.35,doorH=small?h*.65:2.2,wall=.22;let doorRoot=null,petFlap=null;const handles={};
 B('stone foundation',0,.22,0,w+.25,.44,d+.25,M.stoneLight);
 if(small){
 B('doghouse floor',0,.46,0,w-.12,.10,d-.12,M.woodLight);
 B('doghouse rear wall',0,.50+h/2,d/2-.10,w,h,.20,M.woodLight);
 for(const k of [-1,1]){
  B('doghouse side wall',k*(w/2-.10),.50+h/2,0,.20,h,d-.20,M.woodLight);
  B('doghouse entrance jamb',k*(w+doorW)/4,.50+h/2,-d/2+.10,(w-doorW)/2,h,.20,M.woodLight);
 }
 B('doghouse lintel',0,.50+doorH+(h-doorH)/2,-d/2+.10,doorW,h-doorH,.20,M.woodLight);
 for(let i=0;i<3;i++){const top=.17*(i+1);B('doghouse step',0,top/2,-d/2-.60+i*.23,doorW,top,.23,M.woodLight);}
 }
 else{
  B('walkable wooden floor',0,.485,0,w-.06,.09,d-.06,M.woodLight);
  for(let j=0;j<24;j++)B('interior plank seam',-w*.47+j*w*.04,.532,0,.025,.008,d-.3,M.woodDark);
  B('rear wall',0,.53+h/2,d/2-wall/2,w,h,wall,M.plaster);
  // Partition masonry around actual rectangular apertures; no hidden solid wall behind glazing.
  function wallWithHoles(name,axis,plane,lo,hi,bottom,top,holes){
   const xs=[lo,hi,...holes.flatMap(a=>[a.x-a.w/2,a.x+a.w/2])].sort((a,b)=>a-b),ys=[bottom,top,...holes.flatMap(a=>[a.y-a.h/2,a.y+a.h/2])].sort((a,b)=>a-b);
   for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){
    const width=xs[i]-xs[i-1],height=ys[j]-ys[j-1],x=(xs[i]+xs[i-1])/2,y=(ys[j]+ys[j-1])/2;
    if(width<.001||height<.001||holes.some(a=>Math.abs(x-a.x)<a.w/2&&Math.abs(y-a.y)<a.h/2))continue;
    if(axis==='front')B(name,x,y,plane,width,height,wall,M.plaster);else B(name,plane,y,x,wall,height,width,M.plaster);
   }
   for(const a of holes.filter(a=>a.window))windowApertures.push({name,axis,plane,x:a.x,y:a.y,w:a.w,h:a.h,center:axis==='front'?C(a.x,a.y,plane):C(plane,a.y,a.x)});
  }
  for(const k of [-1,1])wallWithHoles('side wall masonry','side',k*(w/2-wall/2),-d/2+wall,d/2-wall,.53,.53+h,[-d*.22,d*.22].map(x=>({x,y:h*.85,w:1.07,h:1.08,window:true})));
  entity('house-front');
  const openings=[{x:0,y:.53+doorH/2,w:doorW,h:doorH},{x:0,y:UPPER_Y+BALCONY.openingHeight/2,w:BALCONY.half*2,h:BALCONY.openingHeight}];
  for(const x of [-w*.3,w*.3])for(const y of [1.8,h*.85])openings.push({x,y,w:1.11,h:1.17,window:true});
  wallWithHoles('front wall masonry','front',-d/2+wall/2,-w/2,w/2,.53,.53+h,openings);
  entity(id);
 }
 if(small){
 for(let xx of [-w/2+.05,w/2-.05])for(let zz of [-d/2+.05,d/2-.05])B('corner framing',xx,h/2+.44,zz,.23,h,.23,M.woodDark);
 // Back wall retains its timber grid. The front trim must leave the real aperture clear.
 {const zz=d/2+.03;for(let xx of [-w*.25,0,w*.25])B('vertical timber',xx,h/2+.44,zz,.18,h,.17,M.wood);for(let yy of [.5,h*.53,h+.40])B('horizontal timber',0,yy,zz,w,.19,.2,M.woodDark);}
 {const zz=-d/2-.03;for(const k of [-1,1]){
  const jamb=k*(doorW/2+.08),sideW=(w-doorW)/2;
  B('doghouse open doorway trim',jamb,h/2+.50,zz,.14,h,.15,M.woodDark);
  for(const yy of [.50,h*.53])B('doghouse side-only timber',k*(doorW/2+sideW/2),yy,zz,sideW,.15,.15,M.woodDark);
 }B('doghouse overhead timber',0,.50+doorH+.10,zz,w,.16,.15,M.woodDark);}
 for(let xx of [-w/2-.03,w/2+.03]){for(let zz of [-d*.25,0,d*.25])B('side timber',xx,h/2+.44,zz,.18,h,.18,M.wood);for(let yy of [.5,h*.53,h+.40])B('side horizontal',xx,yy,0,.19,.19,d,M.woodDark);}
 }else{
  // The reference is masonry, not a half-timbered facade. Keep only the base and eaves.
  entity('house-front');
  for(const k of [-1,1]){B('limewash stone plinth',k*(w+doorW)/4,.67,-d/2-.065,(w-doorW)/2,.28,.12,M.stoneLight);facadeCraft.plinths++;}
  entity(id);
  B('rear masonry plinth',0,.67,d/2+.065,w,.28,.12,M.stoneLight);facadeCraft.plinths++;
  for(const k of [-1,1]){B('side masonry plinth',k*(w/2+.065),.67,0,.12,.28,d,M.stoneLight);facadeCraft.plinths++;}
 }
 if(!small)entity('house-roof');
 const e=h+.5,r=h+.5+w*.26,ow=w/2+.55,od=d/2+.65;
 for(let s of [-1,1]){
  let ps=[C(0,r,-od),C(0,r,od),C(s*ow,e,od),C(s*ow,e,-od)];quad('sloping roof panel',ps,M.roof,true);
  if(!small)ceramicField('curved colonial roof tiles '+s,Math.hypot(ow,r-e),od*2,(u,v)=>C(s*ow*u,r+(e-r)*u,-od+od*2*v));
  else for(let row=0;row<Math.ceil(ow/.62);row++){let t=(row+.55)/Math.ceil(ow/.62),xx=s*ow*t,yy=r+(e-r)*t+.07;L('raised ceramic tile seam',[xx,yy,-od],[xx,yy,od],.09,row%3===0?M.tile2:M.tile);}
 }
 for(let zz of [-d/2,d/2]){
 if(!small&&zz<0){
  const y0=h+1.45-1.17/2,y1=h+1.45+1.17/2,a=.555,x0=w/2*(r-y0)/(r-e),x1=w/2*(r-y1)/(r-e);
  const patch=(name,pts)=>{const v=pts.map(([x,y])=>C(x,y,zz));poly(name,v,[0,1,2,0,2,3,2,1,0,3,2,0],M.plaster);};
  patch('gable below attic window',[[-w/2,e],[w/2,e],[x0,y0],[-x0,y0]]);
  patch('gable left jamb',[[-x0,y0],[-a,y0],[-a,y1],[-x1,y1]]);
  patch('gable right jamb',[[a,y0],[x0,y0],[x1,y1],[a,y1]]);
  poly('gable above attic window',[C(-x1,y1,zz),C(x1,y1,zz),C(0,r,zz)],[0,1,2,2,1,0],M.plaster);
  windowApertures.push({name:'attic',axis:'front',plane:zz,x:0,y:h+1.45,w:1.11,h:1.17,center:C(0,h+1.45,zz)});
 }else poly('gable plaster',[C(-w/2,e,zz),C(w/2,e,zz),C(0,r,zz)],[0,1,2,2,1,0],small?M.woodLight:M.plaster);L('gable trim',[-ow,e,zz],[0,r,zz],.22,M.woodDark);L('gable trim',[0,r,zz],[ow,e,zz],.22,M.woodDark)}
 L('ridge tiles',[0,r+.11,-od],[0,r+.11,od],.28,M.tile);
 if(!small){
  // Projecting dormer on the visible roof slope, modeled in local house coordinates.
  const side=-1,z0=-.85,dw=2.35,front=side*ow*.78,back=side*ow*.26,baseY=e+(r-e)*.22,topY=e+(r-e)*.73;
  const crest=topY+1.03,edge=topY-.05;
  const wy=baseY+(edge-baseY)*.57,wh=.98,ww=.86,lo=wy-wh/2,hi=wy+wh/2;
  for(const k of [-1,1])B('dormer masonry jamb',front,baseY+(edge-baseY)/2,z0+k*(dw+ww)/4,.18,edge-baseY,(dw-ww)/2,M.plaster);
  if(lo>baseY)B('dormer masonry below',front,(baseY+lo)/2,z0,.18,lo-baseY,ww,M.plaster);
  if(edge>hi)B('dormer masonry above',front,(edge+hi)/2,z0,.18,edge-hi,ww,M.plaster);
  windowApertures.push({name:'dormer',axis:'side',plane:front,x:z0,y:wy,w:ww,h:wh,center:C(front,wy,z0)});
  for(const dz of [-dw/2,dw/2]){
   quad('dormer cheek',[C(front,baseY,z0+dz),C(back,topY-.13,z0+dz),C(back,edge,z0+dz),C(front,edge,z0+dz)],M.plaster,true);
   L('dormer corner trim',[front,baseY,z0+dz],[front,edge,z0+dz],.12,M.woodDark);
  }
  poly('dormer front gable',[C(front,edge,z0-dw/2),C(front,edge,z0+dw/2),C(front,crest,z0)],[0,1,2],M.plaster);
  for(const dz of [-1,1]){
   quad('dormer ceramic roof',[C(front-.32,crest,z0),C(back+.26,crest,z0),C(back+.26,edge,z0+dz*(dw/2+.25)),C(front-.32,edge,z0+dz*(dw/2+.25))],M.roof,true);
   for(let k=0;k<5;k++){const a=k/5;L('dormer tile seam',[front-.32,crest+(edge-crest)*a+.055,z0+dz*(dw/2+.25)*a],[back+.26,crest+(edge-crest)*a+.055,z0+dz*(dw/2+.25)*a],.065,M.tile);}
   L('dormer fascia',[front-.35,crest,z0],[front-.35,edge,z0+dz*(dw/2+.25)],.14,M.woodDark);
  }
  for(const k of [-1,1]){B('dormer frame stile',front-.14,wy,z0+k*.495,.16,1.25,.13,M.woodDark);B('dormer frame rail',front-.14,wy+k*.557, z0,.16,.135,.86,M.woodDark);}
  B('dormer clear glass',front-.25,wy,z0,.035,.98,.86,M.windowPane);
  B('dormer mullion',front-.31,wy,z0,.06,.98,.085,M.woodDark);
  B('dormer crossbar',front-.31,wy,z0,.06,.075,.86,M.woodDark);
  B('dormer window sill',front-.27,wy-.66,z0,.35,.12,1.33,M.woodLight);
 }
 entity(id);
 // The doghouse doorway is a genuine opening, not a dark solid face.
 if(!small){
 entity('house-door');
 for(const k of [-1,1])B('door jamb',k*(doorW/2+.065),.53+doorH/2,-d/2-.045,.13,doorH,.30,M.blueJoinery);
 B('door header',0,.53+doorH+.065,-d/2-.045,doorW+.26,.13,.30,M.blueJoinery);
 doorRoot=new Mesh('door hinge pivot',scene);doorRoot.position=C(-doorW/2+.035,.53,-d/2-.055);doorRoot.rotation.y=angle;
 const leaf=(n,x,y,z,ww,hh,dd,m)=>{const q=box(n,x,y,z,ww,hh,dd,m);q.parent=doorRoot;return q;};
 const leafW=doorW-.07,flapW=.88,flapH=1.02,flapBottom=.035,flapTop=flapBottom+flapH,flapSide=(leafW-flapW)/2;
 // The actual door leaf surrounds a cut-out, rather than placing a decal on a solid door.
 leaf('solid swinging door',leafW/2,(doorH+flapTop)/2,0,leafW,doorH-flapTop,.095,M.blueJoinery);
 for(const k of [-1,1])leaf('pet door side stile',leafW/2+k*(flapW/2+flapSide/2),(flapTop+flapBottom)/2,0,flapSide,flapTop-flapBottom,.095,M.blueJoinery);
 leaf('pet door low sill',leafW/2,flapBottom/2,0,leafW,flapBottom,.095,M.blueJoinery);
 for(const k of [-1,1])leaf('pet flap frame',leafW/2+k*(flapW/2+.025),(flapTop+flapBottom)/2,-.068,.05,flapH,.08,M.blueTrim);
 leaf('pet flap header',leafW/2,flapTop+.025,-.068,flapW+.10,.05,.08,M.blueTrim);
 petFlap=new Mesh('main pet flap hinge',scene);petFlap.parent=doorRoot;petFlap.position=V(leafW/2,flapTop,0);
 const flapMat=mat('smoky translucent pet flap','#91b4ae');flapMat.alpha=.76;
 const panel=box('main pet flexible flap',0,-flapH/2,0,flapW-.045,flapH-.035,.035,flapMat,0,false);panel.parent=petFlap;
 for(const x of [.13,leafW-.13])leaf('door vertical trim',x,doorH/2,-.07,.075,doorH-.11,.05,M.blueTrim);
 for(const y of [doorH-.2])leaf('door cross trim',leafW/2,y,-.07,leafW-.13,.09,.05,M.blueTrim);
 // Both sides have independent real lever geometry and a grip anchor.
 for(const side of [-1,1]){
  const pivot=new Mesh('handle spindle '+side,scene);pivot.parent=doorRoot;pivot.position=V(leafW-.19,1.01,side*.115);
  const plate=leaf('handle backplate',leafW-.19,1.01,side*.065,.14,.23,.045,M.black);
  const hub=box('handle hub',0,0,side*.035,.11,.11,.075,M.black);hub.parent=pivot;
  const lever=box('handle lever',-.105,0,side*.075,.24,.065,.075,M.black);lever.parent=pivot;
  const grip=new Mesh('handle grip '+side,scene);grip.parent=pivot;grip.position=V(-.145,0,side*.075);
  handles[side]={pivot,grip};
 }
 entity('house-front');
 const window=(xx,yy)=>{for(const k of [-1,1]){B('window frame stile',xx+k*.62,yy,-d/2-.12,.13,1.43,.20,M.blueJoinery);B('window frame rail',xx,yy+k*.65,-d/2-.12,1.11,.13,.20,M.blueJoinery);}B('window clear glass',xx,yy,-d/2-.24,1.11,1.17,.035,M.windowPane);B('window vertical bar',xx,yy,-d/2-.30,.10,1.2,.08,M.blueJoinery);B('window horizontal bar',xx,yy,-d/2-.30,1.17,.10,.08,M.blueJoinery);B('window sill',xx,yy-.73,-d/2-.33,1.55,.14,.42,M.blueTrim)};
 const upperY=h*.85,atticY=h+1.45;
 for(let xx of [-w*.3,w*.3]){window(xx,1.8);window(xx,upperY);facadeCraft.upperWindows.push({x:xx,y:upperY,bottom:upperY-.715,top:upperY+.715});}
 entity('house-roof');window(0,atticY);facadeCraft.atticWindow={x:0,y:atticY,bottom:atticY-.715};entity(id);for(let xx of [-w/2-.10,w/2+.10])for(let zz of [-d*.22,d*.22]){facadeCraft.sideWindows.push({x:xx,z:zz,y:upperY});for(const k of [-1,1]){B('side frame stile',xx,upperY,zz+k*.607,.18,1.34,.145,M.blueJoinery);B('side frame rail',xx,upperY+k*.605,zz,.18,.13,1.07,M.blueJoinery);}B('side window glass',xx+Math.sign(xx)*.11,upperY,zz,.035,1.08,1.07,M.windowPane);B('side mullion',xx+Math.sign(xx)*.17,upperY,zz,.08,1.09,.09,M.blueJoinery);B('side window sill',xx+Math.sign(xx)*.22,upperY-.73,zz,.35,.13,1.55,M.blueTrim)}for(let side of [-1,1]){for(let i=0;i<5;i++){let yy=.55+i*.18;B('foundation stone trim',side*(w/2+.02),yy,d*.36,.13,.13,1.15,i%2?M.stone:M.stoneLight);}}
 // Side window flower boxes, above the walkable ground and outside the wall.
 for(const k of [-1,1])for(const zz of [-d*.22,d*.22]){
  const yy=upperY-.88,xx=k*(w/2+.27);
  B('side window flower trough',xx,yy,zz,.40,.24,1.42,M.woodLight);
  B('side flower trough soil',xx,yy+.13,zz,.31,.035,1.29,M.earth);
  for(let j=0;j<7;j++){
   const p=C(xx+k*.035,yy+.26+(j%3)*.04,zz-.51+j*.17);
   sphere('side flower foliage',p.x,p.y,p.z,.12,.14,.13,j%2?M.leaf:M.leaf2,false);
   const f=C(xx+k*.10,yy+.40+(j%3)*.04,zz-.51+j*.17);
   sphere('side pink blossoms',f.x,f.y,f.z,.085,.065,.095,j%2?M.pink:M.red,false);
  }
  facadeCraft.sideFlowerBoxes++;
 }
 // Ornamental window boxes are independent from saved interactive planters.
 entity('house-front');
 for(const xx of [-w*.30,w*.30]){
  B('window flower trough',xx,.95,-d/2-.32,1.38,.28,.40,M.woodLight);
  B('window trough soil',xx,1.11,-d/2-.32,1.24,.035,.31,M.earth);
  for(let j=0;j<9;j++){
   const px=xx-.54+j*.135,pz=-d/2-.35+(j%2)*.075;
   const leafPoint=C(px,1.20+(j%3)*.04,pz);
   sphere('window box leaves',leafPoint.x,leafPoint.y,leafPoint.z,.12,.13,.11,j%2?M.leaf:M.leaf2,false);
   const flower=C(px,1.36+(j%3)*.06,pz-.03);
   sphere('window box flower',flower.x,flower.y,flower.z,.087,.063,.087,j%3===0?M.pink2:j%3===1?M.red:M.pink,false);
   roofCraft.flowerHeads++;
  }
  roofCraft.flowerBoxes++;
 }
 entity(id);
 B('porch deck',0,.37,-d/2-(HOUSE.porchDepth+.1)/2,w*HOUSE.porchRatio,.32,HOUSE.porchDepth,M.woodLight);for(let j=0;j<20;j++)B('porch deck board seam',-w*HOUSE.porchRatio/2+.25+j*(w*HOUSE.porchRatio-.5)/19, .54,-d/2-(HOUSE.porchDepth+.1)/2,.035,.012,HOUSE.porchDepth-.1,M.woodDark);for(const k of [-1,1]){B('porch lantern bracket',k*w*.18,2.55,-d/2-.23,.12,.15,.42,M.woodDark);B('porch lantern',k*w*.18,2.35,-d/2-.49,.26,.36,.25,M.glass);B('porch lantern cap',k*w*.18,2.55,-d/2-.49,.34,.10,.34,M.black);}for(let s of [-1,1]){B('porch support',s*(w*HOUSE.porchRatio/2-.22),1.83,-d/2-2.4-porchExtension,.27,2.8,.27,M.woodDark);}
 entity('house-porch-roof');
 const porchRoofHalf=w*(HOUSE.porchRatio/2+.035),cut=BALCONY.half+.12;
 for(const [left,right] of [[-porchRoofHalf,-cut],[cut,porchRoofHalf]]){
  quad('porch roof side wing',[C(left,3.65,-d/2),C(right,3.65,-d/2),C(right,3.12,-d/2-3-porchExtension),C(left,3.12,-d/2-3-porchExtension)],M.roof,true);
  ceramicField('curved colonial veranda side tiles',Math.hypot(3+porchExtension,.53),right-left,(u,v)=>C(left+(right-left)*v,3.65-.53*u,-d/2-(3+porchExtension)*u));
 }
 entity(id);for(let i=0;i<3;i++){const top=[.18,.35,.53][i];B('stone entry step',0,top/2,-d/2-3.55-porchExtension+i*.35,2.2,top,.35,M.stoneLight);}
 entity('house-roof');B('chimney',w*.29,h+1.75,d*.26,.86,3.5,.86,M.stoneLight);for(let i=0;i<7;i++)B('chimney course',w*.29,h+.42+i*.48,d*.26,.89,.045,.89,M.stone);B('chimney cap',w*.29,h+3.55,d*.26,1.1,.20,1.1,M.woodDark);
 }else{B('doghouse name plaque',0,h*.84,-d/2-.11,.59,.24,.09,M.woodDark);for(let xx of [-.19,.19])B('paw mark',xx,h*.85,-d/2-.17,.07,.08,.035,M.woodLight)}
 entity(id);return {x,z,w,d,angle,y,C,doorW,doorRoot,handles,petFlap};
}
const home=house('house',HOUSE.u,HOUSE.v,HOUSE.w,HOUSE.d,HOUSE.h,HOUSE.angle);
function buildResidenceLevels(){const s=STAIR,B=(n,x,y,z,w,h,d,mat)=>{const q=home.C(x,y,z);return box(n,q.x,q.y,q.z,w,h,d,mat,home.angle);};const L=s.x-s.half,R=s.x+s.half,Z=s.mid+s.half;
 entity('house-stairs');for(let i=0;i<s.steps;i++){const z=s.lo+(i+.5)*.4,x=R+(i+.5)*.4,a=treadHeight(z),b=treadHeight(x,2);B('L stair lower tread '+i,s.x,a-.08,z,2*s.half,.16,.4,M.woodLight);B('L stair lower riser '+i,s.x,a-s.rise/2,z-.16,2*s.half,s.rise,.08,M.woodDark);B('L stair upper tread '+i,x,b-.08,s.mid,.4,.16,2*s.half,M.woodLight);B('L stair upper riser '+i,x-.16,b-s.rise/2,s.mid,.08,s.rise,2*s.half,M.woodDark);}
 B('quarter turn landing',s.x,LANDING_Y-.09,s.mid,2*s.half,.18,2*s.half,M.woodLight);
 for(const [a,b] of STAIR_RAILS){beam('L stair continuous handrail',home.C(...a),home.C(...b),.09,M.wood);const n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.65);for(let i=0;i<=n;i++){const u=i/n,x=a[0]+u*(b[0]-a[0]),z=a[2]+u*(b[2]-a[2]),y=a[1]+u*(b[1]-a[1]);B('L stair baluster',x,y-.48,z,.075,.96,.075,M.woodDark);}}
 entity('house-upper-floor');const x0=-home.w/2+.22,x1=home.w/2-.22,z0=-home.d/2+.22,z1=home.d/2-.22;
 const xs=[x0,L,R,s.exit,x1],zs=[z0,s.lo,s.turn,Z,z1];for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const a=xs[i-1],b=xs[i],c=zs[j-1],d=zs[j],x=(a+b)/2,z=(c+d)/2;if(STAIR_HOLES.some(h=>x>h[0]&&x<h[1]&&z>h[2]&&z<h[3]))continue;B('upper walkable wood floor',x,UPPER_Y-.09,z,b-a,.18,d-c,M.woodLight);}
 const rail=(x1,z1,x2,z2)=>{beam('upper opening guard',home.C(x1,UPPER_Y+.96,z1),home.C(x2,UPPER_Y+.96,z2),.09,M.woodDark);const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/.65);for(let i=0;i<=n;i++)B('upper opening baluster',x1+(x2-x1)*i/n,UPPER_Y+.48,z1+(z2-z1)*i/n,.07,.96,.07,M.woodDark);};
 rail(L,s.lo,R,s.lo);rail(L,s.lo,L,Z);rail(L,Z,s.exit,Z);rail(R,s.lo,R,s.turn);rail(R,s.turn,s.exit,s.turn);
 // Real open portal at the upper landing; no trigger or load transition.
 for(const side of [-1,1])B('upper passage timber jamb',s.exit+.08,UPPER_Y+1.05,s.mid+side*(s.half-.055),.18,2.10,.11,M.woodDark);
 B('upper passage timber lintel',s.exit+.08,UPPER_Y+2.10,s.mid,.18,.14,2*s.half,M.woodDark);
}
buildResidenceLevels();
// Real ground-floor partition with masonry, timber doorway and continuous headwall.
function buildGroundDivider(){const d=GROUND_DIVIDER,B=(n,x,y,w,h,depth,material)=>{const p=home.C(x,y,d.z);return box(n,p.x,p.y,p.z,w,h,depth,material,home.angle);};entity('house-ground-divider');for(const [a,b] of groundWallSegments()){B('living kitchen masonry',(a+b)/2,STAIR.ground+d.height/2,b-a,d.height,d.thickness,M.plaster);B('living kitchen skirting',(a+b)/2,STAIR.ground+.07,b-a,.14,d.thickness+.055,M.woodDark);}const w=d.doorRight-d.doorLeft,mid=(d.doorLeft+d.doorRight)/2;B('kitchen doorway masonry lintel',mid,STAIR.ground+(d.doorHeight+d.height)/2,w,d.height-d.doorHeight,d.thickness,M.plaster);for(const x of [d.doorLeft-.035,d.doorRight+.035])B('kitchen door jamb',x,STAIR.ground+d.doorHeight/2,.07,d.doorHeight,d.thickness+.07,M.wood);B('kitchen door header',mid,STAIR.ground+d.doorHeight+.055,w+.14,.11,d.thickness+.07,M.wood);}
buildGroundDivider();
const interiorDoors=[],upperFixtures=[];
function buildUpperRooms(){entity('house-upper-rooms');const H=2.55,B=(n,x,y,z,w,h,d,mat)=>{const q=home.C(x,y,z);return box(n,q.x,q.y,q.z,w,h,d,mat,home.angle);};for(const w of UPPER_WALLS){const mid=(w.from+w.to)/2,len=w.to-w.from;B('upper room plaster wall',w.axis==='x'?mid:w.fixed,UPPER_Y+H/2,w.axis==='x'?w.fixed:mid,w.axis==='x'?len:.18,H,w.axis==='x'?.18:len,M.plaster);}for(const d of INTERIOR_DOORS.filter(d=>d.floor===2)){const mid=(d.from+d.to)/2,len=d.to-d.from;B('upper doorway lintel',d.fixed,UPPER_Y+2.39,mid,.18,.32,len,M.plaster);for(const z of [d.from-.035,d.to+.035])B('upper doorway timber jamb',d.fixed,UPPER_Y+1.125,z,.24,2.25,.07,M.wood);B('upper doorway timber header',d.fixed,UPPER_Y+2.30,mid,.24,.10,len+.14,M.wood);} }
buildUpperRooms();
function buildUpperBalcony(){const a=BALCONY,B=(n,x,y,z,w,h,d,mat)=>{const q=home.C(x,y,z);return box(n,q.x,q.y,q.z,w,h,d,mat,home.angle);};entity('house-upper-balcony');
 const mid=(a.front+a.back)/2,depth=a.back-a.front;
 B('projecting upper veranda timber deck',0,UPPER_Y-.12,mid,a.half*2,.24,depth,M.woodLight);
 B('upper veranda front fascia',0,UPPER_Y-.24,a.front+.10,a.half*2+.10,.28,.20,M.woodDark);
 for(const k of [-1,1]){B('upper veranda side fascia',k*(a.half-.08),UPPER_Y-.24,mid,.20,.28,depth,M.woodDark);B('upper veranda underfloor beam',k*(a.half-.22),UPPER_Y-.34,mid,.25,.20,depth,M.woodDark);beam('upper veranda diagonal support',home.C(k*(a.half-.23),UPPER_Y-.31,a.front+.32),home.C(k*(a.half-.23),UPPER_Y-1.25,a.back-.05),.20,M.woodDark);}
 for(let i=1;i<Math.ceil(a.half*2/.32);i++)B('upper veranda plank seam',-a.half+i*.32,UPPER_Y+.006,mid,.018,.012,depth-.05,M.woodDark);
 const rail=(x,z,xx,zz)=>{const n=Math.ceil(Math.hypot(xx-x,zz-z)/.42);for(let i=0;i<=n;i++){const u=i/n;B('upper veranda timber baluster',x+(xx-x)*u,UPPER_Y+a.railHeight/2,z+(zz-z)*u,.095,a.railHeight,.095,M.woodDark);}beam('upper veranda continuous guardrail',home.C(x,UPPER_Y+a.railHeight,z),home.C(xx,UPPER_Y+a.railHeight,zz),.13,M.woodLight);};
 rail(-a.half,a.railZ,a.half,a.railZ);for(const side of [-1,1]){rail(side*a.half,a.railZ,side*a.half,a.back);B('upper veranda frame column',side*(a.half-.075),UPPER_Y+a.openingHeight/2,a.back,.15,a.openingHeight,.20,M.woodDark);}B('upper veranda opening header',0,UPPER_Y+a.openingHeight-.08,a.back,a.half*2,.16,.20,M.woodDark);
}
buildUpperBalcony();
function positionInteriorDoor(d){const leaf=doorLeaf(d,d.open),mid=(leaf.from+leaf.to)/2,base=d.floor===2?UPPER_Y:STAIR.ground;d.mesh.position.copyFrom(home.C(d.axis==='x'?mid:leaf.fixed,base+1.10,d.axis==='x'?leaf.fixed:mid));d.mesh.computeWorldMatrix(true);}
for(const spec of INTERIOR_DOORS){const d={...spec,open:1,target:1,kind:'interior-door',icon:'🚪'},base=d.floor===2?UPPER_Y:STAIR.ground,mid=(d.from+d.to)/2,p=home.C(d.axis==='x'?mid:d.fixed,base,d.axis==='x'?d.fixed:mid);Object.assign(d,{x:p.x,y:p.y,z:p.z,hx:d.axis==='x'?(d.to-d.from)/2:.12,hz:d.axis==='x'?.12:(d.to-d.from)/2,yaw:home.angle});entity('interior-door '+d.id);d.mesh=box('sliding timber '+d.id,p.x,p.y+1.10,p.z,d.axis==='x'?d.to-d.from:.09,2.20,d.axis==='x'?.09:d.to-d.from,M.wood,home.angle);positionInteriorDoor(d);interiorDoors.push(d);}
function internalDoorNearby(d){return stationNearby(d);}
function toggleInteriorDoor(d){if(!interiorDoors.includes(d)||!internalDoorNearby(d)||!ruralDialog.open)return false;const next=d.target>.5?0:1,p=homeLocal(avatar.position.x,avatar.position.z);if(next===0&&doorLeafBlocked(p,d,0,.27))return false;d.target=next;farmAudio.action('hammer');return true;}
function tickInteriorDoors(dt){for(const d of interiorDoors){if(d.open===d.target)continue;const p=homeLocal(avatar.position.x,avatar.position.z),next=d.open+Math.sign(d.target-d.open)*Math.min(Math.abs(d.target-d.open),dt*2.8),sameFloor=Math.abs(avatar.position.y-d.y)<.8;if(sameFloor&&doorLeafBlocked(p,d,next,.22)){d.target=1;continue;}d.open=next;positionInteriorDoor(d);shadowMap.resetRefreshCounter();}}
function upperResidenceBlocked(x,z){const p=homeLocal(x,z);return balconyRailBlocked(p)||upperWallBlocked(p)||interiorDoors.some(d=>d.floor===2&&doorLeafBlocked(p,d,d.open))||upperFixtures.some(f=>fixtureBlocked(p,f.local));}
for(const k of [-1,1])addNightLight('veranda lantern '+k,home.C(k*home.w*.18,2.32,-home.d/2-.65),6,.75);
addNightLight('warm interior',home.C(0,3.0,-.9),11,.90);
addNightLight('warm loft',home.C(0,HOUSE.h+.9,0),7,.55);
// Six reusable, locally textured smoke puffs. No external files or particle allocation per frame.
entity('chimney smoke');
const smokeOrigin=home.C(home.w*.29, HOUSE.h+3.69,home.d*.26);
const smokeTex=new DynamicTexture('soft chimney smoke',{width:64,height:64},scene,true,Texture.TRILINEAR_SAMPLINGMODE);
smokeTex.hasAlpha=true;const smokeCtx=smokeTex.getContext();
smokeCtx.clearRect(0,0,64,64);
for(const [x,y,r] of [[29,32,28],[39,26,21],[21,24,17],[33,43,18]]){
 const g=smokeCtx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,'rgba(242,239,229,.44)');g.addColorStop(.45,'rgba(225,222,214,.23)');g.addColorStop(1,'rgba(218,216,207,0)');
 smokeCtx.fillStyle=g;smokeCtx.fillRect(0,0,64,64);
}
smokeTex.update();smokeTex.wrapU=smokeTex.wrapV=Texture.CLAMP_ADDRESSMODE;
const smokeMat=mat('chimney translucent smoke','#ffffff');smokeMat.diffuseTexture=smokeTex;smokeMat.useAlphaFromDiffuseTexture=true;smokeMat.disableLighting=true;smokeMat.emissiveColor=Color3.White();smokeMat.backFaceCulling=false;smokeMat.disableDepthWrite=true;
const smokePuffs=Array.from({length:6},(_,i)=>{
 const mesh=MeshBuilder.CreatePlane('chimney smoke puff '+i,{size:1},scene);
 own(mesh,smokeMat,false);mesh.receiveShadows=false;mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;
 return {mesh,phase:i/6};
});
function updateChimneySmoke(dt,visible=!entry.inside){
 for(let i=0;i<smokePuffs.length;i++){
  const p=smokePuffs[i];p.phase=(p.phase+Math.max(0,Math.min(dt,.1))*.24)%1;
  const a=p.phase,s=.37+a*1.03;
  p.mesh.setEnabled(visible&&(quality!=='economico'||i%2===0));
  p.mesh.position.set(smokeOrigin.x+a*.88+Math.sin(a*6+i)*.12*a,smokeOrigin.y+.14+a*2.65,smokeOrigin.z+a*.37);
  p.mesh.scaling.set(s,s,s);p.mesh.visibility=.72*Math.sin(Math.PI*a);
 }
}

// The rendered architectural surfaces and the movement surfaces share local coordinates.
const homeLocal=(x,z)=>{const dx=x-home.x,dz=z-home.z,c=Math.cos(home.angle),s=Math.sin(home.angle);return {x:dx*c-dz*s,z:dx*s+dz*c};};
const entry={open:false,door:0,mode:'exterior',blend:0,cameraWeight:0,previous:null,inside:false,upperVisible:false,action:null,lastAction:null};
// Porch fixtures share their dimensions with physical collision volumes.
const porchFront=-home.d/2-2.75-porchExtension,porchHalf=(home.w*HOUSE.porchRatio/2);
const porchFixtures=[],porchRails=[],benches=[];
const seating={phase:'idle',bench:null,elapsed:0,blend:0,last:null};
const porchBox=(n,x,y,z,w,h,d,m)=>{const p=home.C(x,y,z);return box(n,p.x,p.y,p.z,w,h,d,m,home.angle);};
const addRail=(x1,z1,x2,z2)=>{
 const length=Math.hypot(x2-x1,z2-z1),steps=Math.ceil(length/.46);
 porchRails.push({x1,z1,x2,z2});
 for(let i=0;i<=steps;i++){
  const u=i/steps;porchBox('porch railing upright',x1+(x2-x1)*u,1.00,z1+(z2-z1)*u,.10,.94,.10,i===0||i===steps?M.woodDark:M.wood);
 }
 for(const y of [.78,1.48])beam('continuous porch guardrail',home.C(x1,y,z1),home.C(x2,y,z2),.13,M.woodLight);
};
entity('porch guardrails');
for(const side of [-1,1]){
 const x=side*(porchHalf-.11);
 addRail(x,porchFront,x,-home.d/2-.10);
 addRail(side*1.1,porchFront,x,porchFront);
}
entity('porch seating');
for(const side of [1]){
 const x=side*2.45,z=-home.d/2-.62;
 const bench={kind:'bench',id:side<0?'bench-left':'bench-right',x,z,hx:1.02,hz:.37,seatY:1.10};benches.push(bench);porchFixtures.push(bench);
 for(const a of [-.77,.77])for(const b of [-.26,.26])porchBox('bench foot',x+a,.78,z+b,.14,.50,.14,M.woodDark);
 for(let i=0;i<4;i++)porchBox('bench seat slat',x,1.05,z-.26+i*.17,1.94,.10,.16,M.woodLight);
 for(const a of [-.80,.80])porchBox('bench back support',x+a,1.36,z+.30,.12,.85,.12,M.woodDark);
 for(const y of [1.31,1.54])porchBox('bench back slat',x,y,z+.30,1.94,.17,.09,M.woodLight);
 for(const a of [-.93,.93])porchBox('bench armrest',x+a,1.30,z,.12,.10,.72,M.wood);
}
// Independent containers and a catalog, reusable by future garden beds.
const flowerCatalog=Object.freeze({
 rose:{name:'Rosa',color:'#d84868',center:'#9d2343',petals:8,height:.55,spread:.11},
 daisy:{name:'Margarida',color:'#fff4dc',center:'#e7ad27',petals:7,height:.39,spread:.14},
 lavender:{name:'Lavanda',color:'#9768c8',center:'#7151ad',petals:5,height:.66,spread:.065}
});
const planterTypes=Object.freeze({
 ceramic:{name:'Vaso de cerâmica',hx:.39,hz:.39,soilY:1.00,slots:[[-.14,0],[.14,0]]},
 wooden:{name:'Jardineira de madeira',hx:.58,hz:.31,soilY:.92,slots:[[-.34,0],[0,0],[.34,0]]}
});
const planterSpecs=[{id:'porch-ceramic',type:'ceramic',x:-4.40,z:-home.d/2-2.02,floor:1},{id:'porch-wooden',type:'wooden',x:4.40,z:-home.d/2-2.02,floor:1},...BALCONY.planters];
const GROW_MS=90000,SAVE_KEY='cv.ornamentalGarden.v1';
let gardenSave={};let gardenError='';
try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))gardenSave=saved;}catch{}
const potMat=mat('warm terracotta pottery','#ad633e'),potRim=mat('ceramic lip','#d08a59'),soilMat=mat('potting soil','#523b2b'),flowerMat=mat('cultivated flower vertex colors','#ffffff');
flowerMat.backFaceCulling=false;flowerMat.specularColor=Color3.Black();
const planters=planterSpecs.map(spec=>{
 const type=planterTypes[spec.type],lift=spec.floor===2?UPPER_Y-.53:0,p=home.C(spec.x,.53+lift,spec.z),potBox=(n,x,y,z,w,h,d,mat)=>porchBox(n,x,y+lift,z,w,h,d,mat);
 entity(spec.floor===2?'house-upper-balcony':'porch planters');
 if(spec.type==='ceramic'){
  cyl('tapered ceramic pot',p.x,p.y+.22,p.z,.26,.44,potMat,.38);
  cyl('ceramic pot lip',p.x,p.y+.455,p.z,.40,.095,potRim);
  cyl('exposed ceramic pot soil',p.x,p.y+.48,p.z,.34,.018,soilMat);
  cyl('pot saucer',p.x,p.y+.038,p.z,.38,.075,potRim);
 }else{
  potBox('wooden planter base',spec.x,.61,spec.z,1.16,.15,.62,M.woodDark);
  potBox('planter soil',spec.x,.90,spec.z,1.04,.12,.50,soilMat);
  for(const k of [-1,1]){
   potBox('planter long side',spec.x,.76,spec.z+k*.275,1.16,.44,.10,M.woodLight);
   potBox('planter short side',spec.x+k*.53,.76,spec.z,.10,.44,.62,M.wood);
  }
 }
 const footprint={x:spec.x,z:spec.z,hx:type.hx,hz:type.hz};if(spec.floor===2)upperFixtures.push({local:footprint});else porchFixtures.push({kind:'planter',...footprint});
 entity('porch cultivated flowers');
 const mesh=new Mesh('cultivated '+spec.id,scene);own(mesh,flowerMat,false);mesh.receiveShadows=false;mesh.position=home.C(spec.x,type.soilY+lift,spec.z);mesh.rotation.y=home.angle;mesh.setEnabled(false);
 const saved=gardenSave[spec.id];const crop=saved&&Object.hasOwn(flowerCatalog,saved.species)&&Number.isFinite(saved.plantedAt)&&saved.plantedAt>=0&&saved.plantedAt<=Date.now()?{species:saved.species,plantedAt:saved.plantedAt,...(spec.floor===2&&Number.isFinite(saved.wateredAt)&&saved.wateredAt>=saved.plantedAt&&saved.wateredAt<=Date.now()?{wateredAt:saved.wateredAt}:{})}:null;
 return {...spec,config:type,mesh,crop,stage:0};
});
function rebuildCrop(p){
 if(!p.crop){p.mesh.setEnabled(false);p.stage=0;return;}
 const f=flowerCatalog[p.crop.species],positions=[],indices=[],colors=[];
 const triangle=(a,b,c,color)=>{const k=positions.length/3;positions.push(...a,...b,...c);indices.push(k,k+1,k+2);for(let n=0;n<3;n++)colors.push(color.r,color.g,color.b,1);};
 const diamond=(x,y,z,rx,ry,rz,color)=>{const u=[x,y+ry,z],b=[x,y-ry,z],ring=[[x+rx,y,z],[x,y,z+rz],[x-rx,y,z],[x,y,z-rz]];for(let i=0;i<4;i++){triangle(u,ring[i],ring[(i+1)%4],color);triangle(b,ring[(i+1)%4],ring[i],color);}};
 const green=Color3.FromHexString('#43813e'),leaf=Color3.FromHexString('#6a9e45'),petal=Color3.FromHexString(f.color),center=Color3.FromHexString(f.center);
 p.config.slots.forEach(([sx,sz],i)=>{
  const height=f.height*(.88+.09*i),r=.022;
  for(let k=0;k<6;k++){const a=k*Math.PI/3,b=(k+1)*Math.PI/3,A=[sx+Math.cos(a)*r,0,sz+Math.sin(a)*r],B=[sx+Math.cos(b)*r,0,sz+Math.sin(b)*r],C=[B[0],height,B[2]],D=[A[0],height,A[2]];triangle(A,B,C,green);triangle(A,C,D,green);}
  for(let k=0;k<4;k++){const a=k*2.4+i,cy=height*(.24+k*.12),dx=Math.cos(a),dz=Math.sin(a);triangle([sx,cy,sz],[sx+dx*.16-dz*.045,cy+.05,sz+dz*.16+dx*.045],[sx+dx*.24,cy+.11,sz+dz*.24],leaf);triangle([sx,cy,sz],[sx+dx*.24,cy+.11,sz+dz*.24],[sx+dx*.16+dz*.045,cy+.04,sz+dz*.16-dx*.045],green);}
  const layers=p.crop.species==='lavender'?4:p.crop.species==='rose'?2:1;
  for(let layer=0;layer<layers;layer++){
   const yy=height-layer*(p.crop.species==='lavender'?.075:.035),spread=f.spread*(layer===0?.72:1);
   diamond(sx,yy,sz,.045,.04,.045,center);
   for(let k=0;k<f.petals;k++){const a=k*Math.PI*2/f.petals+layer*.45;diamond(sx+Math.cos(a)*spread*.67,yy,sz+Math.sin(a)*spread*.67,spread*.59,.039,spread*.59,petal);}
  }
 });
 const v=new VertexData();v.positions=positions;v.indices=indices;v.colors=colors;v.normals=[];VertexData.ComputeNormals(positions,indices,v.normals);v.applyToMesh(p.mesh,true);p.mesh.setEnabled(true);
}
function updateCrop(p,now=Date.now()){
 if(!p.crop)return;
 p.stage=gardenGrowth(p.crop,now,p.floor===2,GROW_MS);
 const scale=.18+.82*p.stage;p.mesh.scaling.setAll(scale);
}
function writeGarden(){
 const data={...gardenSave};for(const p of planters){if(p.crop)data[p.id]=p.crop;else delete data[p.id];}
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));gardenSave=data;gardenError='';return true;}catch{gardenError='Não foi possível salvar as flores. Tente novamente.';return false;}
}
function nearbyPlanter(){const staff=planters.filter(p=>p.staff&&Math.abs(p.y-avatar.position.y)<.35&&Math.hypot(p.x-avatar.position.x,p.z-avatar.position.z)<1.05).sort((a,b)=>Math.hypot(a.x-avatar.position.x,a.z-avatar.position.z)-Math.hypot(b.x-avatar.position.x,b.z-avatar.position.z))[0];if(staff&&!entry.action&&seating.phase==='idle')return staff;const pos=homeLocal(avatar.position.x,avatar.position.z),height=avatar.position.y-home.y;if(entry.action||seating.phase!=='idle')return null;const upper=upperBalconyAt(pos,height);const lower=Math.abs(height-STAIR.ground)<.20&&!entry.inside&&pos.z<=-home.d/2+.10&&pos.z>=porchFront-.12;if(!upper&&!lower)return null;return planters.filter(p=>!p.staff&&p.floor===(upper?2:1)).map(p=>({p,dist:Math.hypot(pos.x-p.x,pos.z-p.z)})).filter(x=>x.dist<1.34).sort((a,b)=>a.dist-b.dist)[0]?.p||null;}
let selectedPlanter=null,lastGardenTick=0;
const gardenPanel=$('garden-panel'),gardenAction=$('garden-action');
function renderGarden(){
 if(!selectedPlanter)return;const p=selectedPlanter;
 $('garden-title').textContent=p.config.name+(p.staff?' · kitnet '+(Number(p.id.split('-').at(-1))+1):p.floor===2?' · varanda superior':'');
 $('garden-portrait').textContent=p.crop?({rose:'🌹',daisy:'🌼',lavender:'🪻'})[p.crop.species]||'🌱':'🪴';$('garden-state').textContent=gardenError||(p.crop?flowerCatalog[p.crop.species].name+' · '+(p.floor===2&&!Number.isFinite(p.crop.wateredAt)?'Precisa regar':p.stage>=1?(p.pollinated?'Floresceu · visitada por abelhas':'Floresceu'):Math.floor(p.stage*100)+'% de crescimento'):'Vazio · escolha uma espécie');
 for(const button of $('garden-species').querySelectorAll('button'))button.disabled=!!p.crop;
 $('garden-remove').disabled=!p.crop;$('garden-water').hidden=p.floor!==2;$('garden-water').disabled=!p.crop||Number.isFinite(p.crop.wateredAt);$('garden-growth-hint').textContent=p.floor===2?'Regue para iniciar o crescimento':'Crescimento: 90 s no teste';
}
function changeCrop(species){
 const p=selectedPlanter;if(!p||nearbyPlanter()!==p||entry.action)return false;
 if(species!==null&&(!Object.hasOwn(flowerCatalog,species)||p.crop))return false;
 if(species===null&&!p.crop)return false;
 const prior=p.crop;p.crop=species===null?null:{species,plantedAt:Date.now()};
 if(!writeGarden()){p.crop=prior;renderGarden();return false;}
 rebuildCrop(p);updateCrop(p);renderGarden();return true;
}
function waterSelectedGarden(){const p=selectedPlanter;if(!p||p.floor!==2||nearbyPlanter()!==p||entry.action)return false;const next=waterGardenCrop(p.crop,Date.now());if(!next)return false;const prior=p.crop;p.crop=next;if(!writeGarden()){p.crop=prior;renderGarden();return false;}updateCrop(p);renderGarden();return true;}
$('garden-water').addEventListener('click',waterSelectedGarden);
for(const [id,f] of Object.entries(flowerCatalog)){
 const b=document.createElement('button');b.textContent=f.name;b.dataset.flower=id;b.dataset.icon=({rose:'🌹',daisy:'🌼',lavender:'🪻'})[id]||'🌱';b.addEventListener('click',()=>changeCrop(id));$('garden-species').append(b);
}
gardenAction.addEventListener('click',()=>{selectedPlanter=nearbyPlanter();if(selectedPlanter){gardenPanel.hidden=false;renderGarden();}});
function closeGarden(){gardenPanel.hidden=true;selectedPlanter=null;}
$('garden-close').addEventListener('click',closeGarden);$('garden-remove').addEventListener('click',()=>changeCrop(null));
for(const p of planters){rebuildCrop(p);updateCrop(p);}
function updateGarden(now=Date.now()){
 const near=nearbyPlanter();if(selectedPlanter&&selectedPlanter!==near)closeGarden();const hide=!near||!gardenPanel.hidden||buildModeActive||!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden;if(gardenAction.hidden!==hide)gardenAction.hidden=hide;
 if(selectedPlanter&&(selectedPlanter!==near||buildModeActive||!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden))closeGarden();
 if(now-lastGardenTick>=250){lastGardenTick=now;for(const p of planters)updateCrop(p,now);if(selectedPlanter)renderGarden();}
}

// Independent, transactional wheat save. The existing ornamental garden key is untouched.
// Independent world clock. No changes to existing flower, quality or wheat keys.
const WORLD_KEY='cv.worldCalendar.v1',clockBoot=Date.now();
let worldClock=newWorldClock(clockBoot),clockLocked=false,clockError='',clockLastSave=clockBoot,lastClockRender=-Infinity,lastCalendarLabel='',lastLightMinute=-1,lastWeatherSlot=-1;
try{
 const raw=localStorage.getItem(WORLD_KEY);
 if(raw!==null){const previous=JSON.parse(raw);worldClock=upgradeWorldClock(previous,clockBoot);if(previous.schema!==worldClock.schema)localStorage.setItem(WORLD_KEY,JSON.stringify(worldClock));}
 else localStorage.setItem(WORLD_KEY,JSON.stringify(worldClock));
}catch{clockLocked=true;clockError='Relógio local indisponível';}
function worldElapsed(now=Date.now()){return elapsedWorldClock(worldClock,now);}
function saveWorldClock(now=Date.now()){
 if(clockLocked)return false;
 const next={...worldClock,floor:worldElapsed(now)};
 try{localStorage.setItem(WORLD_KEY,JSON.stringify(next));worldClock=next;clockLastSave=now;clockError='';return true;}catch{clockError='Relógio: falha ao salvar';return false;}
}
// The simulation's rain flag is unchanged; sunny showers are a visual subtype.
let weatherVisual={kind:'sun',rain:false,night:false,showers:false};let worldWind=windAt(0);
function weatherPresentation(w,daylight,hour){
 const night=daylight.daylight<.20,showers=w.kind==='rain'&&!night&&hour>=7&&hour<18&&w.slot%3===1;
 const icon=night?({sun:'🌙',cloud:'☁️',rain:'🌙🌧️',storm:'⛈️'}[w.kind]):({sun:'☀️',cloud:'🌤️',rain:showers?'🌦️':'🌧️',storm:'⛈️'}[w.kind]);
 return {kind:w.kind,rain:w.rain,night,showers,icon:night&&w.kind==='cloud'?'🌙☁️':icon,label:showers?'Sol e chuva':w.kind==='sun'&&night?'Noite limpa':w.kind==='cloud'&&!night?'Sol e nuvens':w.label};
}
function updateWorldClock(now=Date.now(),force=false){
 if(!force&&now>=lastClockRender&&now-lastClockRender<500)return;
 lastClockRender=now;const elapsed=worldElapsed(now),c=calendarAt(elapsed);
 worldClock.floor=elapsed;
 if(now-clockLastSave>=30000)saveWorldClock(now);
 const daylight=daylightAt(c.hour,c.minute);
 const pad=n=>String(n).padStart(2,'0'),label=pad(c.hour)+':'+pad(c.minute)+' · '+daylight.phase+' | '+c.weekday+', '+pad(c.day)+'/'+pad(c.month)+' · Ano '+c.year+' · '+c.season;
 if(label!==lastCalendarLabel){
  $('world-clock').textContent=pad(c.hour)+':'+pad(c.minute);$('world-date').textContent=pad(c.day)+'/'+pad(c.month);
  $('world-date-detail').textContent=c.weekday+', '+pad(c.day)+'/'+pad(c.month)+' · Ano '+c.year+' · '+c.season;$('world-full-time').textContent=pad(c.hour)+':'+pad(c.minute);
  $('world-phase').textContent=daylight.phase;
  const icon=({'Noite':'🌙','Amanhecer':'🌅','Dia':c.hour>=12?'🌤️':'☀️','Entardecer':'🌇'})[daylight.phase]||'☀️';
  $('world-phase-icon').textContent=icon;$('world-phase-icon').setAttribute('aria-label',daylight.phase);
  lastCalendarLabel=label;
 }
 if($('world-clock-error').textContent!==clockError)$('world-clock-error').textContent=clockError;
 const minute=c.hour*60+c.minute,w=weatherAt(elapsed);
 if(minute!==lastLightMinute||w.slot!==lastWeatherSlot){
  lastWeatherSlot=w.slot;weatherVisual=weatherPresentation(w,daylight,c.hour);const weatherLabel=weatherVisual.label+' · '+w.temperature+' °C';$('world-weather').textContent=weatherVisual.label;$('weather-icon').textContent=weatherVisual.icon;$('world-temp').textContent=w.temperature.toFixed(1)+' °C';$('world-full-temp').textContent=w.temperature.toFixed(1)+' °C';document.body.dataset.weather=w.kind;
  lastLightMinute=minute;const k=daylight.daylight;
  // Maintain the existing daytime art. At night keep paths and controls readable.
  const cloud=w.kind==='sun'?1:w.kind==='cloud'?.80:w.kind==='rain'?(weatherVisual.showers?.87:.65):.50;light.intensity=.38+.47*k*cloud;sun.intensity=.09+.81*k*cloud;const shadowsOn=k>.18;if(sun.shadowEnabled!==shadowsOn){sun.shadowEnabled=shadowsOn;shadow.getShadowMap().resetRefreshCounter();}
  scene.clearColor=new Color4(.08+.28*k,.13+.43*k,.19+.10*k,1);updateNightLighting(k);
 }
}
// HUD preference is independent from world and farm saves.
const CALENDAR_HUD_KEY='cv.calendarHUD.v1',calendarHUD=$('world-calendar'),calendarToggle=$('calendar-toggle');
let calendarCompact=false;
try{calendarCompact=localStorage.getItem(CALENDAR_HUD_KEY)==='compact';}catch{}
function setCalendarCompact(value,persist=true){
 calendarCompact=!!value;calendarHUD.classList.toggle('compact',calendarCompact);
 calendarToggle.setAttribute('aria-expanded',String(!calendarCompact));
 calendarToggle.setAttribute('aria-label',calendarCompact?'Expandir informações da fazenda':'Recolher informações da fazenda');
 for(const detail of calendarHUD.querySelectorAll('.calendar-extra'))detail.setAttribute('aria-hidden',String(calendarCompact));
 if(persist)try{localStorage.setItem(CALENDAR_HUD_KEY,calendarCompact?'compact':'expanded');}catch{}
}
calendarToggle.addEventListener('click',()=>setCalendarCompact(!calendarCompact));setCalendarCompact(calendarCompact,false);
window.addEventListener('pagehide',()=>saveWorldClock());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorldClock();else updateWorldClock(Date.now(),true);});
const WHEAT_SAVE='cv.wheat.v1',LEGACY_WHEAT_GROW=90000;
const wheatDuration=p=>Number.isFinite(p?.durationMs)&&p.durationMs>0?p.durationMs:LEGACY_WHEAT_GROW;
function wheatSchedule(now=Date.now(),crop='wheat'){return cropSchedule(crop,calendarAt(worldElapsed(now)).month);}
updateWorldClock(Date.now(),true);
window.cvBootStage='save';const freshWheat=()=>({schema:1,coins:INITIAL_COINS,progress:freshProgress(),appearance:{...DEFAULT_APPEARANCE},nature:freshNature(),fishery:freshFishery(),husbandry:freshHusbandry(),installations:prebuiltInstallations({}),extraPens:[],workers:freshWorkers(),ponds:{},household:freshHome(),orchard:freshOrchard(),warehouse:{},seeds:24,grain:0,plots:{},stocks:Object.fromEntries(Object.keys(CROP_CALENDAR).filter(id=>id!=='wheat').map(id=>[id,{seeds:['corn','rice','strawberry'].includes(id)?12:0,grain:0}])),compost:24,treatments:24,quality:{}});
let wheatState=freshWheat(),wheatSaveError='',wheatSaveLocked=false;
try{
 const raw=localStorage.getItem(WHEAT_SAVE);
 if(raw!==null){const v=JSON.parse(raw);if(v.schema!==1||!Number.isSafeInteger(v.seeds)||v.seeds<0||!Number.isSafeInteger(v.grain)||v.grain<0||!v.plots||typeof v.plots!=='object'||Array.isArray(v.plots))throw Error('invalid wheat save');
 for(const [id,p] of Object.entries(v.plots)){if(!p||!farmPlotById.has(id)||!['raw','tilled','sown','watered'].includes(p.state)||(p.state==='watered'&&(!Number.isFinite(p.wateredAt)||p.wateredAt<0))||(p.durationMs!==undefined&&(!Number.isFinite(p.durationMs)||p.durationMs<LEGACY_WHEAT_GROW||p.durationMs>3600000)))throw Error('invalid plot');}
 for(const p of Object.values(v.plots)){if(p.crop!==undefined&&!Object.hasOwn(CROP_CALENDAR,p.crop)||p.soil!==undefined&&!validSoil(p.soil))throw Error('invalid agricultural state');}
 if(v.orchard!==undefined&&!validOrchard(v.orchard))throw Error('invalid orchard');
 if(v.workers!==undefined&&!validWorkers(v.workers))throw Error('invalid workers');if(v.ponds!==undefined&&(!v.ponds||typeof v.ponds!=='object'||Array.isArray(v.ponds)||Object.entries(v.ponds).some(([k,p])=>!/^duck$|^extra-[1-5]$/.test(k)||!p||!Number.isSafeInteger(p.cleaned)||p.cleaned<0)))throw Error('invalid ponds');
 if(v.household!==undefined&&!validHome(v.household))throw Error('invalid household');
 if(v.warehouse!==undefined&&!validWarehouse(v.warehouse))throw Error('invalid warehouse');
 if(v.progress!==undefined&&!validProgress(v.progress))throw Error('invalid progression');
 if(v.appearance!==undefined&&!validAppearance(v.appearance))throw Error('invalid appearance');
 if(v.nature!==undefined&&!validNature(v.nature))throw Error('invalid natural resources');
 if(v.fishery!==undefined&&!validFishery(v.fishery))throw Error('invalid fishing');
 if(v.husbandry!==undefined&&!validHusbandry(v.husbandry))throw Error('invalid livestock');if(v.installations!==undefined&&!validInstallations(v.installations))throw Error('invalid installations');if(v.extraPens!==undefined&&!validExtraPens(v.extraPens))throw Error('invalid extra pens');if(v.husbandry?.animals.some(a=>a.penId&&!v.extraPens?.some(p=>p.id===a.penId&&p.species===a.species)))throw Error('invalid animal habitat');
 if(v.coins!==undefined&&!validBalance(v.coins))throw Error('invalid economy balance');
 const defaults=freshWheat();for(const id of Object.keys(CROP_CALENDAR).filter(id=>id!=='wheat')){const stock=v.stocks?.[id];if(stock&&(!Number.isSafeInteger(stock.seeds)||stock.seeds<0||!Number.isSafeInteger(stock.grain)||stock.grain<0))throw Error('invalid stock');}
 for(const k of ['compost','treatments'])if(v[k]!==undefined&&(!Number.isSafeInteger(v[k])||v[k]<0))throw Error('invalid farm resources');
 wheatState={...defaults,...v,workers:{...(v.workers??defaults.workers),items:assignRooms((v.workers??defaults.workers).items)},installations:prebuiltInstallations(v.installations??{}),orchard:v.orchard===undefined?defaults.orchard:upgradeOrchard(v.orchard),appearance:{...DEFAULT_APPEARANCE,...v.appearance},stocks:{...defaults.stocks,...v.stocks}};}
}catch{wheatSaveLocked=true;wheatSaveError='Dados de trigo indisponíveis; cultivo bloqueado para preservar o save.';}
if(craftRecoveryError){wheatSaveLocked=true;wheatSaveError=craftRecoveryError;}
// Upgrade old partial tillage to coherent beds without deleting existing crops,
// harvest counts, seed stocks or soil properties. Commit atomically.
function migrateWholeBeds(){
 if(wheatSaveLocked)return;
 const next=JSON.parse(JSON.stringify(wheatState));let changed=false;
 for(const parts of bedPlots.values()){
  if(!parts.some(p=>next.plots[p.id]&&next.plots[p.id].state!=='raw'))continue;
  for(const p of parts)if(!next.plots[p.id]||next.plots[p.id].state==='raw'){
   next.plots[p.id]={...(next.plots[p.id]||{}),state:'tilled',crop:next.plots[p.id]?.crop||'wheat'};changed=true;
  }
 }
 if(changed)try{localStorage.setItem(WHEAT_SAVE,JSON.stringify(next));wheatState=next;}catch{wheatSaveLocked=true;wheatSaveError='Falha na migração; dados originais preservados.';}
}
migrateWholeBeds();
let tillWork=null,buildModeActive=false;
let farmCache=new Map(),farmCacheTime=-1;
function progressCommit(mutator){if(wheatSaveLocked)return false;const next=JSON.parse(JSON.stringify(wheatState));if(!mutator(next))return false;try{localStorage.setItem(WHEAT_SAVE,JSON.stringify(next));}catch{wheatSaveError='Falha ao salvar progressão.';return false;}const old=rank(wheatState.progress.xp);wheatState=next;progressNotice(old);return true;}
function progressEvent(event,info={}){return progressCommit(next=>record(next.progress,event,info));}
function progressNotice(old){refreshMissionTracker();refreshProfile();const current=rank(wheatState.progress.xp);if(current>old){const n=$('progress-notice');n.textContent='Nível '+current+' · '+title(current);n.hidden=false;clearTimeout(progressNotice.timer);progressNotice.timer=setTimeout(()=>n.hidden=true,4500);}}

function evaluatedPlot(id,now=Date.now()){
 const elapsed=worldElapsed(now),bucket=Math.floor(elapsed/1000);
 if(bucket!==farmCacheTime){farmCacheTime=bucket;farmCache.clear();}
 if(!farmCache.has(id))farmCache.set(id,simulatePlot(wheatState.plots[id],elapsed));
 return farmCache.get(id);
}
const wheatStatus=(id,now=Date.now())=>{const p=evaluatedPlot(id,now);return !p?'raw':p.state==='watered'&&(p.soil?p.soil.progress>=1:now-p.wateredAt>=wheatDuration(p))?'ripe':p.state;};
function wheatProgress(id,now=Date.now()){const p=evaluatedPlot(id,now);return p?.state==='watered'?(p.soil?p.soil.progress:Math.max(0,Math.min(1,(now-p.wateredAt)/wheatDuration(p)))):0;}
const selectedSpecies=()=>$('crop-select').value||'wheat';
const stockFor=(state,id)=>id==='wheat'?{seeds:state.seeds,grain:state.grain}:state.stocks[id];
function nearestWheat(){
 if(entry.action||seating.phase!=='idle'||entry.inside||!gardenPanel.hidden||buildModeActive )return null;
 const sector=sectorAt(avatar.position.x,avatar.position.z);if(!sector)return null;
 let best=null,dist=1.20;for(const p of sector.plots){const n=Math.hypot(avatar.position.x-p.x,avatar.position.z-p.z);if(n<dist){best=p;dist=n;}}return best;
}
function applyWheatAction(action,id,now=Date.now()){
 if(wheatSaveLocked||tillWork||nearestWheat()?.id!==id)return false;
 if(action==='till')return beginTill(id);
 if(action==='undo')return commitBed(farmPlotById.get(id).bedId,false,now);
 const status=wheatStatus(id,now),next=JSON.parse(JSON.stringify(wheatState)),elapsed=worldElapsed(now);
 let p=simulatePlot(next.plots[id],elapsed)||{state:'raw',crop:'wheat',soil:newSoil(elapsed)};
 // Existing saved crops keep their original countdown, not a new growth penalty.
 const legacy=p.state==='watered'&&!p.soil;
 if(!p.soil&&!legacy)p.soil=newSoil(elapsed);
 const crop=p.crop||'wheat',stock=stockFor(next,crop),selected=selectedSpecies(),takeSeed=id=>{if(id==='wheat')next.seeds--;else next.stocks[id].seeds--;};
 if(action==='plant'&&status==='tilled'&&Object.hasOwn(CROP_CALENDAR,selected)&&stockFor(next,selected).seeds>0){takeSeed(selected);p=prepareSpecies(p,selected,elapsed);}
 else if(action==='water'&&status==='sown'){p={...p,state:'watered',wateredAt:now,durationMs:p.durationMs??wheatSchedule(now,crop).realMs};if(p.soil)p.soil.moisture=.92;}
 else if(action==='water'&&status==='watered'&&!legacy){p.soil.moisture=.92;}
 else if(action==='irrigate'&&!legacy){p.soil.irrigated=!p.soil.irrigated;if(p.soil.irrigated){p.soil.moisture=Math.max(p.soil.moisture,CROP_CALENDAR[crop].moisture+.1);if(p.state==='sown'){p.state='watered';p.wateredAt=now;}}}
 else if(action==='fertilize'&&!legacy&&next.compost>0&&p.soil.fertility<.99){next.compost--;p.soil.fertility=Math.min(1,p.soil.fertility+.24+(hasPerk(next.progress,'solo')?.08:0));}
 else if(action==='treat'&&!legacy&&next.treatments>0&&p.soil.pest>.01){next.treatments--;p.soil.pest=Math.max(0,p.soil.pest-.65);}
 else if(action==='weed'&&!legacy&&status!=='raw'&&(p.soil.weeds??0)>.01){p.soil.weeds=0;}
 else if(action==='harvest'&&status==='ripe'){
  const result=legacy?{units:CROP_CALENDAR[crop].yield,quality:'Boa'}:harvestInfo(p);if(hasPerk(next.progress,'colheita'))result.units++;record(next.progress,'harvest',{units:result.units,species:crop,quality:result.quality,now});
  if(!Number.isSafeInteger(stock.grain+result.units)||!Number.isSafeInteger(stock.seeds+1))return false;
  if(crop==='wheat'){next.grain+=result.units;next.seeds++;}else{next.stocks[crop].grain+=result.units;next.stocks[crop].seeds++;}
  next.quality[result.quality]=(next.quality[result.quality]||0)+result.units;
  const soil=p.soil||newSoil(elapsed);soil.fertility=Math.max(.2,soil.fertility-.14);soil.lastCrop=crop;soil.progress=0;
  p=CROP_CALENDAR[crop].regrow?{...p,state:'watered',wateredAt:now,durationMs:CROP_CALENDAR[crop].regrow*300000,soil}:{state:'tilled',crop,soil};
 }else return false;
 // Legacy watering dates are wall timestamps; simulated crops use soil.at in world elapsed time.
 if(p.soil&&p.state==='watered'&&!Number.isFinite(p.wateredAt))p.wateredAt=now;
 next.plots[id]=p;
 if(action==='plant'||action==='weed'||(action==='water'&&status==='sown'))record(next.progress,action,{now});const oldRank=rank(wheatState.progress.xp);
 try{localStorage.setItem(WHEAT_SAVE,JSON.stringify(next));}catch{wheatSaveError='Falha ao salvar. Nenhuma alteração aplicada.';return false;}
 wheatState=next;farmCache.clear();wheatSaveError='';wheatVisualKey='';updateWheat(now,true);farmAudio.action(action);progressNotice(oldRank);return true;
}
// Rebuild only on a visual stage transition; one mesh for furrows and one for wheat.
entity('wheat dynamic cultivation');
const wheatSoil=mat('continuous fertile earth','#ffffff');wheatSoil.backFaceCulling=false;wheatSoil.emissiveColor=new Color3(.018,.011,.007);wheatSoil.specularColor=Color3.Black();wheatSoil.diffuseTexture=swatch('fine tilled soil grain','soil',128);
const wheatPlants=mat('wheat plants','#ffffff');wheatPlants.backFaceCulling=false;wheatPlants.emissiveColor=new Color3(.04,.035,.012);wheatPlants.specularColor=Color3.Black();
const wheatFurrows=own(new Mesh('one continuous surface per agricultural bed',scene),wheatSoil,false),wheatStalks=own(new Mesh('batched real wheat stalks and ears',scene),wheatPlants,false);
const selectionMat=mat('wheat selection','#e7d5a0');selectionMat.emissiveColor=Color3.FromHexString('#e7d5a0');selectionMat.disableLighting=true;
const plotOutline=MeshBuilder.CreateLines('selected wheat plot',{points:[V(-.28,0,-.73),V(0,0,-.66),V(.28,0,-.73)]},scene);plotOutline.color=Color3.FromHexString('#f7e5ac');plotOutline.isPickable=false;plotOutline.setEnabled(false);
let wheatVisualKey='',lastWheatTick=0,renderFarmSector=farmSectors[0];
// Distant beds use a single low-poly soil mesh per sector. Only the active
// sector receives detailed mutable furrow/plant geometry.
for(const f of farmSectors){entity('wheat dynamic cultivation');const m=new Mesh('distant agricultural beds '+f.id,scene),p=[],ix=[],uv=[],co=[];
 for(const b of f.beds){const k=p.length/3;for(const [x,z] of [[b.x1,b.z1],[b.x2,b.z1],[b.x1,b.z2],[b.x2,b.z2]]){p.push(x,Math.max(height(x,z),renderedTerrainY(x,z))+.065,z);uv.push(x/1.2,z/1.2);co.push(.48,.32,.20,1);}ix.push(k,k+2,k+1,k+1,k+2,k+3);}
 if(ix.length){const v=new VertexData();v.positions=p;v.indices=ix;v.uvs=uv;v.colors=co;v.normals=Array.from({length:p.length},(_,i)=>i%3===1?1:0);v.applyToMesh(m);own(m,wheatSoil,false);m.freezeWorldMatrix();}f.low=m;m.setEnabled(f!==renderFarmSector);}
function chooseRenderSector(){const f=sectorAt(avatar.position.x,avatar.position.z);if(!f||f===renderFarmSector||tillWork)return false;renderFarmSector.low.setEnabled(true);renderFarmSector=f;f.low.setEnabled(false);moundState.clear();wheatVisualKey='';return true;}

const moundPeaks={raw:0,tilled:.15,sown:.15,sprout:.15,green:.15,ripe:.15};
const moundState=new Map();let moundVertices=[],moundPositions=null,moundTimer=0,moundDirty=false;
const moundQA={active:0,updates:0,peak:0};
function moundHeight(id){return moundState.get(id)?.current||0;}
function bedBlend(bed,x){
 const parts=bedPlots.get(bed.id),n=parts.length,width=(bed.x2-bed.x1)/n;
 const f=Math.max(0,Math.min(n-1e-9,(x-bed.x1)/width)),i=Math.floor(f),u=f-i,edge=.18/width;
 let a=parts[i],b=a,t=0;
 if(i>0&&u<edge){a=parts[i-1];b=parts[i];t=.5+.5*u/edge;}
 else if(i<n-1&&u>1-edge){a=parts[i];b=parts[i+1];t=.5*(u-1+edge)/edge;}
 t=t*t*(3-2*t);return {a:a.id,b:b.id,t};
}
function ridgeProfile(bed,x,z){
 const k=Math.max(0,Math.min(2,Math.round((z-bed.z1-.21)/.41))),center=bed.z1+.21+k*.41;
 const cross=Math.max(0,Math.cos(Math.PI/2*Math.min(1,Math.abs(z-center)/.195)));
 const end=Math.max(0,Math.min(1,(x-bed.x1)/.24,(bed.x2-x)/.24));
 return Math.pow(cross,1.35)*end*(1+.035*Math.sin(x*9+k));
}
function blendedMound(a,b,t){return moundHeight(a)*(1-t)+moundHeight(b)*t;}
function soilTone(stage,moisture){
 const dry=Color3.FromHexString(stage==='raw'?'#795336':'#936741'),wet=Color3.FromHexString(stage==='raw'?'#63442d':'#785035');
 const m=Math.max(0,Math.min(1,(moisture-.20)/.72));
 return Color3.Lerp(dry,wet,m);
}
function tickMounds(dt){
 let active=false;for(const m of moundState.values()){if(Math.abs(m.target-m.current)>.0005){const delta=m.target-m.current,step=Math.sign(delta)*Math.min(Math.abs(delta),dt*.44);m.current+=step;active=true;}}
 moundQA.active=[...moundState.values()].filter(m=>Math.abs(m.target-m.current)>.0005).length;
 moundDirty||=active;moundTimer+=dt;if(!moundDirty||!moundPositions||(moundTimer<.075&&moundQA.active>0))return;moundTimer=0;moundDirty=false;
 for(const v of moundVertices)moundPositions[v.index]=v.base+v.profile*blendedMound(v.a,v.b,v.t);
 wheatFurrows.updateVerticesData(VertexBuffer.PositionKind,moundPositions,true,false);moundQA.updates++;
 if(moundQA.active===0){const normals=[];VertexData.ComputeNormals(moundPositions,wheatFurrows.getIndices(),normals);for(let i=0;i<normals.length;i+=3)if(normals[i+1]<0){normals[i]*=-1;normals[i+1]*=-1;normals[i+2]*=-1;}wheatFurrows.updateVerticesData(VertexBuffer.NormalKind,normals);}
}
function wheatStage(p,now){const state=wheatStatus(p.id,now);return state==='watered'?(wheatProgress(p.id,now)<.35?'sprout':'green'):state;}
function rebuildWheat(now){
 const {plots:localPlots,beds:localBeds}=renderFarmSector;expansionQA.activeSector=renderFarmSector.id;const key=renderFarmSector.id+'|'+localPlots.map(p=>{const v=evaluatedPlot(p.id,now);return [wheatStage(p,now),v?.crop,v?.soil?.irrigated,v?.soil?Math.floor(v.soil.moisture*4):0,Math.floor((v?.soil?.weeds??0)*5)].join(':');}).join('|');if(key===wheatVisualKey)return;wheatVisualKey=key;
 const soil={p:[],i:[],c:[],uv:[]},plants={p:[],i:[],c:[]};moundVertices=[];
 const plotLook=new Map();
 function tri(buf,a,b,c,col){const i=buf.p.length/3;buf.p.push(...a,...b,...c);buf.i.push(i,i+1,i+2);for(let k=0;k<3;k++)buf.c.push(col.r,col.g,col.b,1);}
 function quad(buf,a,b,c,d,col){tri(buf,a,b,c,col);tri(buf,a,c,d,col);}
 const green=Color3.FromHexString('#548b32'),leaf=Color3.FromHexString('#8dab3c'),gold=Color3.FromHexString('#d4ad48'),ear=Color3.FromHexString('#e7c66a');
 for(const p of localPlots){
  const stage=wheatStage(p,now),data=evaluatedPlot(p.id,now),target=moundPeaks[stage]||0;
  const prior=moundState.get(p.id);if(!prior)moundState.set(p.id,{current:target,target});else if(!tillWork||p.bedId!==tillWork.bed.id)prior.target=target;
  const moisture=data?.soil?.moisture??(['sprout','green','ripe'].includes(stage)?.88:.38);
  plotLook.set(p.id,{stage,data,target,color:soilTone(stage,moisture)});
 }
 // Each bed has a single indexed surface, not stacked base and per-plot patches.
 for(const bed of localBeds){
  const parts=bedPlots.get(bed.id),cols=parts.length*8,rows=24,start=soil.p.length/3;
  for(let k=0;k<=cols;k++)for(let l=0;l<=rows;l++){
   const x=bed.x1+(bed.x2-bed.x1)*k/cols,z=bed.z1+(bed.z2-bed.z1)*l/rows;
   const blend=bedBlend(bed,x),profile=ridgeProfile(bed,x,z),base=Math.max(height(x,z),renderedTerrainY(x,z))+bedHeightAt(x,z,bed);
   const index=soil.p.length+1;soil.p.push(x,base+profile*blendedMound(blend.a,blend.b,blend.t),z);moundVertices.push({index,base,profile,...blend});
   const color=Color3.Lerp(plotLook.get(blend.a).color,plotLook.get(blend.b).color,blend.t),shade=.96+.025*Math.sin(x*3.1+z*4.7)+.02*profile;
   soil.c.push(color.r*shade,color.g*shade,color.b*shade,1);soil.uv.push(x/1.2,z/1.2);
  }
  for(let k=0;k<cols;k++)for(let l=0;l<rows;l++){const a=start+k*(rows+1)+l,b=a+rows+1;soil.i.push(a,b,a+1,b,b+1,a+1);}
 }
 if(renderFarmSector.id==='trigo')bedSurfaceStats.vertices=soil.p.length/3;
 for(const p of localPlots){
  const {stage,data,target}=plotLook.get(p.id),crop=data?.crop||'wheat',bed=farmBedById.get(p.bedId);
  const y=(x,z,rise)=>Math.max(height(x,z),renderedTerrainY(x,z))+bedHeightAt(x,z,bed)+rise;
  const weeds=Math.floor((data?.soil?.weeds??0)*5);for(let n=0;n<weeds;n++){const x=p.x1+(p.x2-p.x1)*(.14+n*.17),z=p.z1+.1+(n%3)*.45,b=y(x,z,target+.015);for(const side of [-1,1])tri(plants,[x,b,z],[x+side*.08,b+.12,z+.02],[x,b+.19,z],Color3.FromHexString('#577744'));}
  if(!['sprout','green','ripe'].includes(stage))continue;
  for(let row=0;row<3;row++)for(let k=0;k<4;k++){
   const x=p.x1+(p.x2-p.x1)*(.12+k*.25),z=p.z1+.21+row*.41,b=y(x,z,target+.015),ripe=stage==='ripe',hh=(stage==='sprout'?.16:stage==='green'?.48:.76)*(crop==='corn'?1.65:crop==='strawberry'?.40:crop==='rice'?.88:1)*(1+.07*Math.sin(k*4+row));
   const col=ripe&&crop==='wheat'||ripe&&crop==='rice'?gold:green,r=crop==='corn'?.026:.015;
   quad(plants,[x-r,b,z],[x+r,b,z],[x+r,b+hh,z],[x-r,b+hh,z],col);
   quad(plants,[x,b,z-r],[x,b,z+r],[x,b+hh,z+r],[x,b+hh,z-r],col);
   for(const side of [-1,1])tri(plants,[x,b+hh*.25,z],[x+side*hh*.36,b+hh*.48,z+.035],[x,b+hh*.45,z],ripe?gold:leaf);
   if(crop==='strawberry'){for(const side of [-1,1]){tri(plants,[x,b+.05,z],[x+side*.16,b+.10,z-.08],[x+side*.09,b+hh,z+.07],leaf);if(ripe)tri(plants,[x+side*.09,b+.07,z],[x+side*.15,b+.17,z-.03],[x+side*.03,b+.17,z+.03],Color3.FromHexString('#d64142'));}}
   if(!['wheat','corn','rice','strawberry'].includes(crop)){
    const low=['lettuce','carrot','turnip','broccoli','basil'].includes(crop),cy=b+hh*(low?.40:.65),radius=low?.12:.085;
    const leafColor=Color3.FromHexString(crop==='broccoli'?'#285c39':crop==='basil'?'#43834b':'#75a743');
    for(let n=0;n<5;n++){const a=n*1.2566,dx=Math.cos(a)*radius,dz=Math.sin(a)*radius;tri(plants,[x,cy,z],[x+dx-dz*.5,cy+.065,z+dz+dx*.5],[x+dx+dz*.5,cy+.02,z+dz-dx*.5],leafColor);}
    if(ripe){const fruit={carrot:'#e58a37',turnip:'#e9d7b3',tomato:'#cf4038',pea:'#83ad42',broccoli:'#356b39',sunflower:'#e8b839',lettuce:'#a8c65c',basil:'#4e9b52'}[crop],cc=Color3.FromHexString(fruit),yy=low?cy:b+hh*.86,rr=crop==='sunflower'?.11:.07;
      for(let n=0;n<4;n++){const a=n*Math.PI/2,d=Math.PI/2;tri(plants,[x,yy+.08,z],[x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr],[x+Math.cos(a+d)*rr,yy,z+Math.sin(a+d)*rr],cc);tri(plants,[x,yy-.05,z],[x+Math.cos(a+d)*rr,yy,z+Math.sin(a+d)*rr],[x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr],cc);}
    }
   }
   if(ripe&&crop==='corn'){for(const side of [-1,1])quad(plants,[x,b+hh*.42,z],[x+side*.075,b+hh*.45,z],[x+side*.075,b+hh*.75,z],[x,b+hh*.78,z],ear);}
   if(ripe&&(crop==='wheat'||crop==='rice'))for(let n=0;n<4;n++){const yy=b+hh-.03+n*.041,side=n%2?1:-1;tri(plants,[x,yy-.035,z],[x+side*.058,yy+.04,z],[x,yy+.065,z],ear);tri(plants,[x,yy-.035,z],[x,yy+.04,z+side*.058],[x,yy+.065,z],gold);}
  }
 }
 for(const [mesh,b] of [[wheatFurrows,soil],[wheatStalks,plants]]){
  if(!b.i.length){mesh.setEnabled(false);if(mesh===wheatFurrows)moundPositions=null;continue;}
  const v=new VertexData();v.positions=b.p;v.indices=b.i;v.colors=b.c;if(b.uv?.length)v.uvs=b.uv;v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);if(mesh===wheatFurrows){for(let k=0;k<v.normals.length;k+=3)if(v.normals[k+1]<0){v.normals[k]*=-1;v.normals[k+1]*=-1;v.normals[k+2]*=-1;}moundPositions=b.p.slice();}v.applyToMesh(mesh,true);mesh.setEnabled(true);
  moundQA.peak=Math.max(0,...Array.from(moundState.values(),m=>m.target));
 }
}
const wheatPanel=$('wheat-panel'),wheatAction=$('wheat-action'),wheatUndo=$('wheat-undo');let wheatCollapsed=false;$('wheat-close').onclick=()=>{wheatCollapsed=true;updateWheat(Date.now(),true);layoutContextActions();};$('wheat-expand').onclick=()=>{wheatCollapsed=false;updateWheat(Date.now(),true);};
const wheatNames={raw:'Terra por preparar',tilled:'Terra arada',sown:'Sementes · precisa regar',watered:'Crescendo',ripe:'Pronto para colher'};
const wheatActions={raw:'till',tilled:'plant',sown:'water',ripe:'harvest'};
const wheatLabels={till:'Arar',plant:'Plantar trigo',water:'Regar',harvest:'Colher'};
let wheatSelected=null;
function updateWheat(now=Date.now(),force=false){
 force=chooseRenderSector()||force;const p=tillWork?bedPlots.get(tillWork.bed.id)[0]:nearestWheat();if(!p)wheatCollapsed=false;if(p!==wheatSelected||force){wheatSelected=p;plotOutline.setEnabled(!!p);if(p){plotOutline.position.copyFromFloats(p.x,Math.max(height(p.x,p.z),renderedTerrainY(p.x,p.z))+.11,p.z);plotOutline.scaling.x=.62;}}
 const expanded=!!p&&!wheatCollapsed;wheatPanel.hidden=!expanded;$('wheat-expand').hidden=!p||expanded;
 // Keep the runner reachable when the farm panel is displayed.
 if(document.body.classList.contains('wheat-near')!==!!p)document.body.classList.toggle('wheat-near',!!p);
 if(force||now-lastWheatTick>=250){lastWheatTick=now;rebuildWheat(now);}
 if(!p)return;
 const status=wheatStatus(p.id,now),action=wheatActions[status],data=evaluatedPlot(p.id,now),crop=status==='raw'||status==='tilled'?selectedSpecies():data?.crop||'wheat',stock=stockFor(wheatState,crop),soil=data?.soil||newSoil(worldElapsed(now)),legacy=status==='watered'&&!data?.soil,label=action==='plant'?'Plantar '+CROP_CALENDAR[crop].name.toLowerCase():action?wheatLabels[action]:('Crescendo '+Math.floor(wheatProgress(p.id,now)*100)+'%');
 // Shared crop icons from inventory catalog.
 $('wheat-portrait').textContent=cropIcons[crop];$('wheat-title').textContent=CROP_CALENDAR[crop].name;
 $('crop-options').hidden=!['raw','tilled'].includes(status);
 for(const button of $('crop-options').querySelectorAll('button')){const selected=button.dataset.crop===crop;if(button.getAttribute('aria-pressed')!==String(selected))button.setAttribute('aria-pressed',String(selected));}
 wheatAction.dataset.icon=({till:'⛏',plant:'🌱',water:'💧',harvest:'🧺'})[action]||'🌿';
 $('crop-select').hidden=!['raw','tilled'].includes(status);
 if(wheatAction.textContent!==label)wheatAction.textContent=label;
 wheatAction.disabled=!!tillWork||!action||wheatSaveLocked||(action==='plant'&&stock.seeds===0);
 if(tillWork)wheatAction.textContent='Arando '+Math.round(tillWork.progress*100)+'%';
 wheatUndo.hidden=status!=='tilled'||bedPlots.get(p.bedId).some(v=>!['raw','tilled'].includes(wheatStatus(v.id,now)));wheatUndo.disabled=!!tillWork||wheatSaveLocked;
 const text=wheatSaveError||CROP_CALENDAR[crop].name+' · '+wheatNames[status]+' · Sementes '+stock.seeds+' · Colhido '+stock.grain;
 const schedule=wheatSchedule(now,crop),duration=data?.durationMs??schedule.realMs;
 const hint=status==='watered'?'Estimativa base: '+Math.ceil(Math.max(0,duration*(1-wheatProgress(p.id,now)))/60000)+' min reais · condições podem alterar':status==='ripe'?'Qualidade: '+harvestInfo(data).quality:(schedule.preferred?'Época favorável':'Fora de época · cresce mais devagar')+' · '+(duration/60000)+' min base';
 const soilText='Umidade '+Math.round(soil.moisture*100)+'% · Fertilidade '+Math.round(soil.fertility*100)+'% · Pragas '+Math.round(soil.pest*100)+'% · Ervas '+Math.round((soil.weeds??0)*100)+'%';if($('soil-status').textContent!==soilText)$('soil-status').textContent=soilText;
 $('farm-water').disabled=wheatSaveLocked||legacy||status!=='watered';$('farm-irrigate').disabled=wheatSaveLocked||legacy;$('farm-irrigate').textContent=soil.irrigated?'Desligar irrigação':'Irrigar automaticamente';$('farm-fertilize').disabled=wheatSaveLocked||legacy||!wheatState.compost||soil.fertility>=.99;$('farm-treat').disabled=wheatSaveLocked||legacy||!wheatState.treatments||soil.pest<=.01;$('farm-weed').disabled=wheatSaveLocked||legacy||status==='raw'||(soil.weeds??0)<=.01;
 if($('wheat-season').textContent!==hint)$('wheat-season').textContent=hint;
 if($('wheat-status').textContent!==text)$('wheat-status').textContent=text;
}
wheatAction.addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction(wheatActions[wheatStatus(p.id)],p.id);});
wheatUndo.addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction('undo',p.id);});
$('crop-select').addEventListener('change',()=>updateWheat(Date.now(),true));
for(const button of $('crop-options').querySelectorAll('button'))button.onclick=()=>{$('crop-select').value=button.dataset.crop;updateWheat(Date.now(),true);};
for(const [id,action] of [['farm-water','water'],['farm-irrigate','irrigate'],['farm-fertilize','fertilize'],['farm-treat','treat'],['farm-weed','weed']])$(id).addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction(action,p.id);});
const farmCenter=$('farm-center');let guideCrop='wheat';const guideIcons=cropIcons;
let lastFarmCenter=-Infinity;
function farmCard(parent,icon,title,detail){
 const el=document.createElement('div');el.className='farm-card';
 const picture=document.createElement('span');picture.className='farm-icon';picture.textContent=icon;
 const body=document.createElement('div'),name=document.createElement('strong'),info=document.createElement('small');
 name.textContent=title;info.textContent=detail;body.append(name,info);el.append(picture,body);parent.append(el);return el;
}
function refreshFarmCenter(now=Date.now(),force=false){
 if(farmCenter.hidden||!force&&now>=lastFarmCenter&&now-lastFarmCenter<1000)return;lastFarmCenter=now;
 const elapsed=worldElapsed(now),c=calendarAt(elapsed),w=weatherAt(elapsed),a=cropAdvice(guideCrop,elapsed),crop=a.crop,stock=stockFor(wheatState,guideCrop);
 $('farm-overview').textContent=c.day+' de '+c.monthName+' · Ano '+c.year+' · '+c.season;
 const overview=$('farm-summary');overview.replaceChildren();farmCard(overview,'🌤️',w.label,w.temperature+' °C agora');farmCard(overview,'🌱',allFarmPlots.length+' parcelas','Adubo '+wheatState.compost+' · Tratamentos '+wheatState.treatments);
 const forecast=$('farm-forecast');forecast.replaceChildren();
 for(let i=1;i<=4;i++){const at=(w.slot+i)*WEATHER_INTERVAL,v=weatherAt(at),d=calendarAt(at);farmCard(forecast,({sun:'☀️',cloud:'☁️',rain:'🌧️',storm:'⛈️'})[v.kind],String(d.hour).padStart(2,'0')+':00 · '+d.day+'/'+d.month,v.label+' · '+v.temperature+' °C');}
 for(const b of $('farm-catalog').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.guide===guideCrop));
 $('guide-title').textContent=crop.name;$('guide-portrait').textContent=guideIcons[guideCrop];$('guide-today').textContent=a.days[0].label;
 const facts=$('guide-facts');facts.replaceChildren();
 farmCard(facts,'📅','Época ideal',crop.preferredMonths.map(m=>MONTH_NAMES[m-1].slice(0,3)).join(' · '));
 farmCard(facts,'🌡️','Temperatura ideal',crop.temperature+' °C · tolerância de 5 °C sem redução');
 farmCard(facts,'💧','Umidade de referência',Math.round(crop.moisture*100)+'% · ajuste com rega');
 farmCard(facts,'🌿','Adubo orgânico','+24 pontos de fertilidade por uso · acima de 90%: +1 unidade');
 farmCard(facts,'🧺','Produção base',crop.yield+' unidades por colheita · '+stock.seeds+' sementes');
 farmCard(facts,'⏳','Crescimento',a.schedule.realMs/60000+' min reais de referência'+(crop.regrow?' · rebrota '+crop.regrow+'h no jogo':''));
 const days=$('guide-days');days.replaceChildren();
 for(const day of a.days){const card=farmCard(days,day.storm?'⛈️':day.preferred?'🌱':'🍂',day.date.day+'/'+day.date.month+' · '+day.date.weekday,day.label+' · '+day.temperature+' °C');if(day===a.best)card.classList.add('guide-best');}
 $('guide-tip').textContent='Melhor previsão: '+a.best.date.day+'/'+a.best.date.month+' · '+a.best.label+'. '+(!a.schedule.preferred?'Fora da estação, o crescimento base leva 50% a mais. ': '')+'Previsão estimada; umidade, fertilidade e pragas também influenciam.';
 $('farm-quality').textContent='Qualidade da colheita · '+Object.entries(wheatState.quality).map(([k,v])=>k+' '+v).join(' · ');
}
function openCropGuide(id=nearbyFarmSign()?.preferred||'wheat'){if(!boardNearby())return false;guideCrop=id;closeGarden();cancelInput();playerMenu.hidden=true;farmCenter.hidden=false;refreshFarmCenter(Date.now(),true);return true;}
$('farm-open').addEventListener('click',()=>openCropGuide());
$('farm-close').addEventListener('click',()=>{farmCenter.hidden=true;});
for(const b of $('farm-catalog').querySelectorAll('button'))b.onclick=()=>{guideCrop=b.dataset.guide;refreshFarmCenter(Date.now(),true);};
rebuildWheat(Date.now());
function surfaceHeight(x,z){
 const dh=staffHeight(x,z,workerDorm?.y??0);if(dh!==null)return dh;
 const p=homeLocal(x,z),f=-home.d/2;
 if(Math.abs(p.x)<=home.w/2&&Math.abs(p.z)<=home.d/2)return home.y+.53;
 if(Math.abs(p.x)<=(home.w*HOUSE.porchRatio/2)&&p.z>=f-2.85-porchExtension&&p.z<=f)return home.y+.53;
 if(Math.abs(p.x)<=1.1&&p.z>=f-3.725-porchExtension&&p.z<f-2.85-porchExtension){const i=Math.max(0,Math.min(2,Math.floor((p.z-f+3.725+porchExtension)/.35)));return home.y+[.18,.35,.53][i];}
 const deck=staffBridgeAt(x,z);if(deck)return deck.y;
 if(onBridge(x,z))return 2.945;
 let groundY=renderedTerrainY(x,z);const sector=sectorAt(x,z);if(sector){const bed=sector.beds.find(b=>x>=b.x1&&x<=b.x2&&z>=b.z1&&z<=b.z2);if(bed){const b=bedBlend(bed,x);groundY=Math.max(height(x,z),groundY)+bedHeightAt(x,z,bed)+ridgeProfile(bed,x,z)*blendedMound(b.a,b.b,b.t);}}
 let closest=Infinity,roadY=groundY;
 for(const [rows,half,relief] of [[pathRows,1.24,.08],[approachRows,1.65,0]]){
 if(x<Math.min(rows[0][1].x,rows.at(-1)[1].x)-4||x>Math.max(rows[0][1].x,rows.at(-1)[1].x)+4)continue;
 for(let i=1;i<rows.length;i++){const a=rows[i-1][1],b=rows[i][1],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),dist=Math.hypot(x-a.x-u*dx,z-a.z-u*dz);if(dist<half&&dist<closest){closest=dist;roadY=Math.max(groundY,a.y+(b.y-a.y)*u+relief*(rows===pathRows?Math.min(1,(rows.length-i+1-u)*.28/.65):1));}}}
 return roadY;
}
function homeBlocked(x,z,interacting=false){
 const p=homeLocal(x,z),f=-home.d/2,half=home.w/2,r=.20,wall=.22;
 if(groundDividerBlocked(p,r)||interiorDoors.some(d=>d.floor===1&&doorLeafBlocked(p,d,d.open,r)))return true;
 // Real perimeter walls, with a front opening that only permits passage when the door is open.
 if(Math.abs(p.z)<=home.d/2+r&&Math.abs(Math.abs(p.x)-half)<wall+r)return true;
 if(Math.abs(p.x)<half+r&&Math.abs(p.z-home.d/2)<wall+r)return true;
 if(Math.abs(p.x)<half+r&&Math.abs(p.z-f)<wall+r&&(Math.abs(p.x)>home.doorW/2-r||(!interacting&&entry.door<.88)))return true;
 const theta=-entry.door*Math.PI*.49,hx=-home.doorW/2+.035,hz=f-.055,dx=Math.cos(theta)*(home.doorW-.07),dz=-Math.sin(theta)*(home.doorW-.07),u=Math.max(0,Math.min(1,((p.x-hx)*dx+(p.z-hz)*dz)/(dx*dx+dz*dz)));
 if(Math.hypot(p.x-hx-dx*u,p.z-hz-dz*u)<r+.055)return true;
 // Guardrails use exactly the segments rendered above; the only front gap is the stair.
 for(const rail of porchRails){const dx=rail.x2-rail.x1,dz=rail.z2-rail.z1,u=Math.max(0,Math.min(1,((p.x-rail.x1)*dx+(p.z-rail.z1)*dz)/(dx*dx+dz*dz)));if(Math.hypot(p.x-rail.x1-u*dx,p.z-rail.z1-u*dz)<r+.075)return true;}
 for(const item of porchFixtures)if(Math.abs(p.x-item.x)<item.hx+r&&Math.abs(p.z-item.z)<item.hz+r)return true;
 for(const k of [-1,1])if(Math.hypot(p.x-k*(porchHalf-.22),p.z-(f-2.4-porchExtension))<.33)return true;
 return false;
}
const dogHome=house('doghouse',280,166,3.3,3.0,2.0,-.22,true);
entity('cistern');const well=P(572,156);well.y=height(well.x,well.z);for(let i=0;i<3;i++)for(let j=0;j<14;j++){let a=j*Math.PI*2/14+i*.12;box('well masonry block',well.x+Math.cos(a)*.97,well.y+.18+i*.31,well.z+Math.sin(a)*.97,.46,.29,.38,j%4?M.stoneLight:M.stone,-a+Math.PI/2)}cyl('well water',well.x,well.y+.49,well.z,.76,.04,M.water);for(let s of [-1,1])box('well post',well.x+s*1.04,well.y+1.68,well.z,.19,2.9,.2,M.woodDark);
for(let s of [-1,1])quad('well tile roof',[V(well.x-1.4,well.y+3.2,well.z),V(well.x+1.4,well.y+3.2,well.z),V(well.x+1.4,well.y+2.64,well.z+s*1.0),V(well.x-1.4,well.y+2.64,well.z+s*1.0)],M.roof,true);
for(let s of [-1,1])for(let i=0;i<5;i++)beam('well tile seam',V(well.x-1.4,well.y+3.23-i*.11,well.z+s*i*.21),V(well.x+1.4,well.y+3.23-i*.11,well.z+s*i*.21),.07,M.tile);beam('well ridge',V(well.x-1.42,well.y+3.28,well.z),V(well.x+1.42,well.y+3.28,well.z),.13,M.woodDark);
entity('bench');const bench=P(532,173);bench.y=height(bench.x,bench.z);for(let j=0;j<3;j++)box('bench slat',bench.x,bench.y+.62,bench.z+j*.18,2.1,.1,.17,M.woodLight);for(let s of [-1,1])box('bench leg',bench.x+s*.78,bench.y+.28,bench.z+.18,.17,.56,.5,M.woodDark);
entity('lamp');const lamp=P(529,111);lamp.y=height(lamp.x,lamp.z);box('lamp post',lamp.x,lamp.y+1.55,lamp.z,.15,3.1,.15,M.woodDark);box('lamp glass',lamp.x,lamp.y+2.9,lamp.z,.35,.55,.35,M.glass);box('lamp cap',lamp.x,lamp.y+3.22,lamp.z,.47,.12,.47,M.black);box('lamp base',lamp.x,lamp.y+2.57,lamp.z,.43,.12,.43,M.black);
addNightLight('garden lamp',V(lamp.x,lamp.y+2.9,lamp.z),8,1.05);
entity('cistern');
box('well hanging lantern bracket',well.x,well.y+2.79,well.z,.11,.35,.11,M.woodDark);
box('well lantern glass',well.x,well.y+2.46,well.z,.28,.35,.28,M.glass,0,false);
box('well lantern cap',well.x,well.y+2.68,well.z,.36,.075,.36,M.black);
box('well lantern base',well.x,well.y+2.25,well.z,.34,.075,.34,M.black);
addNightLight('well lantern',V(well.x,well.y+2.43,well.z),4.7,.70);
const yardBench={kind:'backless-bench',id:'bench-yard',x:bench.x,z:bench.z+.18,y:bench.y,angle:0,world:true,hx:1.05,hz:.27};
const worldFixtures=[{id:'bench-yard',x:yardBench.x,z:yardBench.z,hx:yardBench.hx,hz:yardBench.hz},{id:'lamp',x:lamp.x,z:lamp.z,hx:.105,hz:.105}];
const allBenches=[...benches,yardBench];
const trunkColliders=[],natureNodes=[],fishingSpots=[];
const canopyStats={trees:0,leaves:0,petals:0,vertices:0,triangles:0};
function tree(id,u,v,pink=false,size=1){
 entity(id);const x=X(u),z=Z(v),y=height(x,z);const collider={x,z,r:.36*size,active:true};trunkColliders.push(collider);natureNodes.push({id,kind:'tree',x,z,y,hx:.36*size,hz:.36*size,size,pink,collider,label:'Árvore',icon:'🪓'});
 // Each tree owns a deterministic, independent crown and its own collider.
 let seed=(Math.round(u*137)+Math.round(v*719)+19)|0;
 const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 const bend=V((rnd()-.5)*.48*size,0,(rnd()-.5)*.48*size);
 const root=V(x,y,z),fork=root.add(V(bend.x,2.15*size,bend.z));
 beam('tapered trunk base',root.add(V(0,.05,0)),fork,.47*size,M.woodDark,.43*size);
 for(let j=0;j<5;j++){const a=j*2.399;beam('root',root.add(V(Math.cos(a)*.68*size,.045,Math.sin(a)*.68*size)),root.add(V(0,.31*size,0)),.13*size,M.wood);}
 const positions=[],indices=[],colors=[],normals=[];
 const green=['#325822','#527d2d','#719b37','#96b94b','#b3c95e'].map(c=>Color3.FromHexString(c));
 const pinks=['#a94471','#d46794','#eb96ba','#f9bad2','#ffe0e9'].map(c=>Color3.FromHexString(c));
 // Curved botanical blades: six perimeter/ridge vertices, no billboard or sphere crown.
 function blade(p,a,len,width,rise,color,petal=false){
  const dx=Math.cos(a),dz=Math.sin(a),k=positions.length/3;
  const shape=[[0,0,0],[.30,-.72,.35],[.72,-1,.68],[1,0,1],[.72,1,.68],[.30,.72,.35],[.52,0,.95]];
  for(let i=0;i<shape.length;i++){const [f,w,h]=shape[i];positions.push(p.x+dx*len*f-dz*width*w,p.y+rise*h,p.z+dz*len*f+dx*width*w);
   const n=V(-dx*.22,1,-dz*.22).normalize();normals.push(...n.asArray());const shade=i===0?.66:i===6?1.06:i===3?1.02:.88;colors.push(Math.min(1,color.r*shade),Math.min(1,color.g*shade),Math.min(1,color.b*shade),1);}
  for(let i=0;i<6;i++)indices.push(k+i,k+(i+1)%6,k+6);
  if(petal)canopyStats.petals++;else canopyStats.leaves++;
 }
 // Two uneven, overlapping levels of leaf rosettes, with small upper shoots.
 for(let j=0;j<25;j++){
  const a=j*2.399+(rnd()-.5)*.35,layer=j<12?0:j<21?1:2,rad=(layer===0?1.05+rnd()*.36:layer===1?.57+rnd()*.42:.08+rnd()*.32)*size;
  const center=root.add(V(Math.cos(a)*rad+bend.x,(layer===0?2.47:layer===1?3.03:3.58)*size+(rnd()-.5)*.32*size,Math.sin(a)*rad+bend.z));
  if(j<12&&j%2===0)beam('tapered limb',fork,center.add(V(0,-.12*size,0)),.10*size,M.wood);
  for(let k=0;k<12;k++){const angle=k*Math.PI*2/12+a+(rnd()-.5)*.30;const p=center.add(V(Math.cos(angle)*.08*size,(rnd()-.5)*.19*size,Math.sin(angle)*.08*size));
   const col=green[Math.min(4,Math.floor(rnd()*3)+layer)];
   blade(p,angle,(.44+rnd()*.39)*size,(.13+rnd()*.08)*size,(.09+rnd()*.28)*size,col);
  }
  if(pink){for(let f=0;f<4;f++){const angle=a+f*1.57,p=center.add(V(Math.cos(angle)*.35*size,(.16+rnd()*.15)*size,Math.sin(angle)*.35*size));
   for(let k=0;k<5;k++)blade(p,angle+k*1.2566,(.21+rnd()*.11)*size,(.088+rnd()*.038)*size,(.10+rnd()*.09)*size,pinks[Math.min(4,Math.floor(rnd()*3)+layer)],true);
  }}
 }
 const crown=new Mesh('layered botanical crown',scene),vd=new VertexData();vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.normals=normals;vd.applyToMesh(crown);own(crown,canopyMat,true);crown.receiveShadows=false;
 canopyStats.trees++;canopyStats.vertices+=positions.length/3;canopyStats.triangles+=indices.length/3;
 return {x,z};
}
const canopyMat=mat('botanical crown vertex colors','#ffffff');canopyMat.backFaceCulling=false;canopyMat.emissiveColor=new Color3(.16,.16,.12);
const foliageDetailMat=mat('foliage detail','#ffffff');foliageDetailMat.backFaceCulling=false;foliageDetailMat.emissiveColor=new Color3(.11,.12,.08);
tree('sakura residence',607,102,true,1.65);tree('sakura west',99,79,true,1.8);tree('sakura lower',104,202,true,1.15);tree('residence green tree',245,117,false,1);
// Independent placement RNG: changing roof or water details cannot reshuffle woodland.
let placementSeed=91823;const placeRnd=()=>((placementSeed=Math.imul(1664525,placementSeed)+1013904223|0)>>>0)/4294967296;
const treePositions=[[607,102],[99,79],[104,202],[245,117]];
const segDist=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};
const roadSegments=layout.roads.flatMap(r=>r.points.slice(1).map((p,i)=>[P(...r.points[i]),P(...p),r.width/16]));
const treeZones=[[35,0,195,235],[210,0,740,70],[40,270,160,325],[655,70,737,195],[35,470,95,880],[45,970,95,1320],[590,960,665,1300],[1400,1050,1490,1290]];
let planted=0;for(let i=0;i<650&&planted<41;i++){const a=treeZones[i%treeZones.length],u=a[0]+placeRnd()*(a[2]-a[0]),v=a[1]+placeRnd()*(a[3]-a[1]),x=X(u),z=Z(v),nr=nearRiver(x,z);
 if(nr.dist<nr.w*.54+1.5||eastWaterAt(x,z).edge<2||sectorAt(x,z)||treePositions.some(p=>Math.hypot((u-p[0])/8,(v-p[1])/6.553)<3.5)||roadSegments.some(([a,b,w])=>segDist(x,z,a,b)<w+1.5))continue;
 treePositions.push([u,v]);tree('forest '+planted,u,v,planted%11===0,.90+placeRnd()*.54);planted++;
}
for(let i=0;i<12;i++){const x=-89+(i%2)*1.7,z=-169+i*15;tree('ridge-'+i,x*8+400,145-z*6.553,false,.9+(i%3)*.12);}
// Low-growing woodland vegetation, grouped into one real vertex-colored mesh.
// Do not put shrubs in river, roads, the residence, or the bridge approach.
entity('woodland understory');{
 const p=[],ind=[],cols=[],norm=[];let seed=4179;const rand=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 const palette=['#315b27','#537f2e','#76973b','#a4bd50','#d0cf64'].map(c=>Color3.FromHexString(c));
 for(let i=0;i<600&&bankStats.understory<230;i++){
  const zone=treeZones[i%treeZones.length],u=zone[0]+rand()*(zone[2]-zone[0]),v=zone[1]+rand()*(zone[3]-zone[1]),x=X(u),z=Z(v),nr=nearRiver(x,z);
  if(nr.dist<nr.w*.54+.75||eastWaterAt(x,z).edge<1||sectorAt(x,z)||roadSegments.some(([a,b,w])=>segDist(x,z,a,b)<w+1.1)||treePositions.some(q=>Math.hypot((u-q[0])/8,(v-q[1])/6.553)<.65))continue;
  const y=height(x,z),size=.45+rand()*.78,offset=rand()*Math.PI*2;
  for(let j=0;j<12;j++){
   const a=offset+j*2.399,dx=Math.cos(a),dz=Math.sin(a),len=size*(.36+rand()*.55),w=len*.28,h=size*(.28+rand()*.45),r=size*(rand()*.27),px=x+dx*r,pz=z+dz*r,k=p.length/3,c=palette[Math.floor(rand()*palette.length)];
   for(const q of [[px,y+.07,pz],[px+dx*len*.45-dz*w,y+h*.65,pz+dz*len*.45+dx*w],[px+dx*len,y+h,pz+dz*len],[px+dx*len*.45+dz*w,y+h*.65,pz+dz*len*.45-dx*w],[px+dx*len*.52,y+h*.82,pz+dz*len*.52]]){p.push(...q);cols.push(c.r,c.g,c.b,1);norm.push(0,1,0);}
   ind.push(k,k+1,k+4,k+1,k+2,k+4,k+2,k+3,k+4,k+3,k,k+4);
  }
  bankStats.understory++;
 }
 if(p.length){const mesh=new Mesh('woodland leaves',scene),data=new VertexData();data.positions=p;data.indices=ind;data.colors=cols;data.normals=norm;data.applyToMesh(mesh);own(mesh,canopyMat,false);mesh.receiveShadows=false;bankStats.understoryVertices=p.length/3;}
}
function flowerbed(id,u,v,n,r,discard=false,explicit=null){
 entity(id);let p=P(u,v);const points=[],indices=[],colors=[],normals=[];
 function leaf(cx,cy,cz,a,len,width,col){const dx=Math.cos(a),dz=Math.sin(a),k=points.length/3;for(const q of [[cx,cy,cz],[cx+dx*len*.55-dz*width,cy+.10,cz+dz*len*.55+dx*width],[cx+dx*len,cy+.12,cz+dz*len],[cx+dx*len*.55+dz*width,cy+.10,cz+dz*len*.55-dx*width]]){points.push(...q);colors.push(col.r,col.g,col.b,1);normals.push(0,1,0)}indices.push(k,k+1,k+2,k,k+2,k+3)}
 const greens=['#355c26','#548236','#82a34b'].map(Color3.FromHexString),blooms=['#c93030','#e45b76','#f6bc35','#fff1ce'].map(Color3.FromHexString);
 for(let i=0;i<n;i++){
  let a=random()*Math.PI*2,rad=Math.sqrt(random())*r,x=explicit?explicit[i].x:p.x+Math.cos(a)*rad,z=explicit?explicit[i].z:p.z+Math.sin(a)*rad,y=height(x,z),h=.22+random()*.22;
  if(nearRiver(x,z).dist<nearRiver(x,z).w*.54+.3)continue;
  for(let j=0;j<5;j++)leaf(x,y+.05,z,j*1.256+a,.21+random()*.20,.065,greens[j%3]);
  for(let j=0;j<5;j++)leaf(x,y+h,z,j*1.256+a,.105+random()*.025,.045,blooms[Math.floor(i/8)%4]);
  leaf(x-.027,y+h+.018,z-.027,0,.06,.035,blooms[2]);
 }
 if(discard||!points.length)return;
 const mesh=new Mesh('individual garden leaves and petals',scene),gardenData=new VertexData();gardenData.positions=points;gardenData.indices=indices;gardenData.colors=colors;gardenData.normals=normals;gardenData.applyToMesh(mesh);own(mesh,foliageDetailMat,false);
}
flowerbed('front garden',449,188,110,2.7,true);flowerbed('well garden',616,165,72,1.8);flowerbed('house side garden',339,183,74,1.7);flowerbed('doghouse garden',265,192,35,1.2);flowerbed('residential north flowers',480,92,45,1.9);
// Seed flowers along both sides of the stone path, not in the walking strip.
for(const side of [-1,1]){
 const flowers=[];
 for(let i=5;i<pathPoints.length-8;i+=2){
  const p=pathPoints[i],dir=pathPoints[i+1].subtract(pathPoints[i-1]);dir.y=0;dir.normalize();
  for(const offset of [1.75,2.15]){
   const v=p.add(V(-dir.z,0,dir.x).scale(side*offset)),local=homeLocal(v.x,v.z),nr=nearRiver(v.x,v.z);
   if(local.z> -home.d/2-3.82-porchExtension&&Math.abs(local.x)<porchHalf+.35)continue;
   if(pathDistance(v.x,v.z)<1.66||nr.dist<nr.w*.54+.45||fenceColliders.some(([a,b])=>segDist(v.x,v.z,a,b)<.35))continue;
   flowers.push(v);pathFlowerPositions.push({x:v.x,z:v.z,side});
  }
 }
 // independent deterministic seed: do not perturb the original garden/scenery sequence
 flowerbed('walkway flowers '+side,0,0,flowers.length,0,false,flowers);
}
// Companion entities are created after world collision and input initialization.
entity('garden border');for(let k=0;k<30;k++){const u=350+k*4.1,v=181+3*Math.sin(k*.5),p=P(u,v);p.y=height(p.x,p.z)+.07;if(pathDistance(p.x,p.z)>1.55)rock('garden edging',p,.20,.13,.17,M.stoneLight)}
entity('grass details');const grassBase=MeshBuilder.CreateCylinder('grass tuft', {diameterTop:0,diameterBottom:.10,height:.36,tessellation:3},scene);grassBase.material=M.leaf2;grassBase.isPickable=false;const mats=[];for(let i=0;i<1800;i++){let u=35+random()*700,v=8+random()*310,x=X(u),z=Z(v),nr=nearRiver(x,z);if(nr.dist<nr.w/2+1.5||(u>320&&u<490&&v>96&&v<183)||(pathPoints.some(p=>Math.hypot(x-p.x,z-p.z)<1.4)||approachCurve.some(p=>Math.hypot(x-p.x,z-p.z)<1.8)||inWheat(x,z)||roadMaskAt(x,z)>.10))continue;let y=height(x,z)+.13;let matrix=Matrix.Compose(V(.7+random()*.8,.55+random()*.75,.7+random()*.8),Quaternion.RotationYawPitchRoll(random()*6.28,0,(random()-.5)*.4),V(x,y,z));mats.push(...matrix.asArray())}grassBase.thinInstanceSetBuffer('matrix',new Float32Array(mats),16,true);grassBase.receiveShadows=false;groups['grass details'].push(grassBase);
window.cvBootStage='avatar';entity('farm visitor');const player=P(538,205);player.y=surfaceHeight(player.x,player.z);const avatar=new Mesh('visitor root',scene);avatar.position=player.clone();const bodyParts=[];for(const [n,x,y,z,w,h,d,m] of [['body',0,.97,0,.42,.63,.30,M.woodLight],['leg L',-.13,.36,0,.15,.62,.17,M.woodDark],['leg R',.13,.36,0,.15,.62,.17,M.woodDark],['arm L',-.29,.95,0,.14,.52,.16,M.plaster],['arm R',.29,.95,0,.14,.52,.16,M.plaster]]){let p=box(n,x,y,z,w,h,d,m);p.parent=avatar;bodyParts.push(p)}let head=sphere('head',0,1.5,0,.22,.25,.22,M.plaster);head.parent=avatar;let hat=cyl('straw hat',0,1.72,0,.37,.09,M.sand);hat.parent=avatar;let hatTop=cyl('hat crown',0,1.82,0,.21,.20,M.woodLight);hatTop.parent=avatar;
// Articulated arm used for grasping: two segments, elbow and a separate hand.
const reachUpper=box('interaction upper arm',0,0,0,.145,1,.155,M.plaster),reachLower=box('interaction forearm',0,0,0,.125,1,.135,M.plaster),reachHand=sphere('interaction hand',0,0,0,.085,.085,.09,M.plaster);
const reachMeshes=[reachUpper,reachLower,reachHand];for(const m of reachMeshes){m.parent=avatar;m.setEnabled(false);}
// Independent materials: personal colors must never recolor the house or scenery.
// Babylon DynamicTexture.clone() creates a new, not-uploaded texture. Share the already uploaded immutable swatches; keep material colors independent.
function avatarMaterial(name,source){const m=new StandardMaterial(name,scene);m.diffuseColor=source.diffuseColor.clone();m.specularColor=source.specularColor.clone();m.ambientColor=source.ambientColor.clone();m.emissiveColor=source.emissiveColor.clone();m.specularPower=source.specularPower;m.alpha=source.alpha;m.diffuseTexture=source.diffuseTexture;return m;}
const avatarAppearanceMaterials={skin:avatarMaterial('avatar skin',M.plaster),shirt:avatarMaterial('avatar shirt',M.woodLight),trousers:avatarMaterial('avatar trousers',M.woodDark)};
const originalAppearanceMaterials={skin:M.plaster,shirt:M.woodLight,trousers:M.woodDark};
const avatarDetailMaterials={hair:avatarMaterial('avatar hair',M.woodDark),eyes:avatarMaterial('avatar eyes',M.black),beard:avatarMaterial('avatar beard',M.woodDark),boots:avatarMaterial('avatar boots',M.woodDark),hat:avatarMaterial('avatar hat',M.sand)};
entity('farm visitor');const avatarDetails={hair:[sphere('hair cap',0,1.64,-.018,.225,.145,.22,avatarDetailMaterials.hair)],eyes:[-1,1].map(x=>sphere('eye',x*.085,1.52,.204,.038,.047,.028,avatarDetailMaterials.eyes)),beard:[sphere('beard',0,1.385,.105,.155,.093,.12,avatarDetailMaterials.beard)],boots:[-1,1].map(x=>box('work boot',x*.13,.095,.045,.17,.16,.25,avatarDetailMaterials.boots))};for(const parts of Object.values(avatarDetails))for(const mesh of parts)mesh.parent=avatar;avatarDetails.boots.forEach((mesh,i)=>{mesh.parent=bodyParts[i+1];mesh.position.set(0,-.265,.045);});
function applyAvatarAppearance(a){for(const part of ['skin','shirt','trousers']){const original=originalAppearanceMaterials[part],material=avatarAppearanceMaterials[part],color=PALETTES[part][a[part]];material.diffuseColor=color?Color3.FromHexString(color):original.diffuseColor.clone();material.diffuseTexture=color?null:original.diffuseTexture;}for(const mesh of [head,bodyParts[3],bodyParts[4],...reachMeshes])mesh.material=avatarAppearanceMaterials.skin;bodyParts[0].material=avatarAppearanceMaterials.shirt;for(const mesh of [bodyParts[1],bodyParts[2]])mesh.material=avatarAppearanceMaterials.trousers;hat.setEnabled(a.hat!=='sem');hatTop.setEnabled(a.hat!=='sem');const hatColor=PALETTES.hat[a.hat];hat.material=hatColor?avatarDetailMaterials.hat:M.sand;hatTop.material=hatColor?avatarDetailMaterials.hat:M.woodLight;if(hatColor)avatarDetailMaterials.hat.diffuseColor=Color3.FromHexString(hatColor);for(const [part,parts] of Object.entries(avatarDetails)){const id=a[part]??'original',color=PALETTES[part][id];if(color)avatarDetailMaterials[part].diffuseColor=Color3.FromHexString(color);for(const mesh of parts)mesh.setEnabled(!!color);}}
applyAvatarAppearance(wheatState.appearance);window.cvBootStage='avatar-ready';
const restingHand=V(.29,.69,0),shoulder=V(.29,1.19,0);
function poseSegment(m,a,b){const delta=b.subtract(a),n=delta.normalizeToNew(),axis=Vector3.Cross(Vector3.Up(),n),dot=Vector3.Dot(Vector3.Up(),n);m.position.copyFrom(a.add(b).scale(.5));m.scaling.y=Math.max(.001,delta.length());m.rotationQuaternion=dot<-.99999?Quaternion.RotationAxis(Vector3.Right(),Math.PI):new Quaternion(axis.x,axis.y,axis.z,1+dot).normalize();}
function handPose(world,blend,shoulderPoint=shoulder,restPoint=restingHand,side=1){
 avatar.computeWorldMatrix(true);const local=Vector3.TransformCoordinates(world,Matrix.Invert(avatar.getWorldMatrix()));
 const hand=Vector3.Lerp(restPoint,local,blend),elbow=Vector3.Lerp(shoulderPoint,hand,.48).add(V(.075,-.095,-.045));
 for(const m of reachMeshes)m.setEnabled(true);bodyParts[3].setEnabled(side!==-1);bodyParts[4].setEnabled(side!==1);
 poseSegment(reachUpper,shoulderPoint,elbow);poseSegment(reachLower,elbow,hand);reachHand.position.copyFrom(hand);reachHand.computeWorldMatrix(true);
 return {error:Vector3.Distance(reachHand.getAbsolutePosition(),world),reach:Vector3.Distance(shoulderPoint,local)};
}
function releaseHand(){for(const m of reachMeshes)m.setEnabled(false);bodyParts[3].setEnabled(true);bodyParts[4].setEnabled(true);}
const stairGripQA={frames:0,maxError:0,maxReach:0,zone:null};let stairGripActive=false;
function syncStairGrip(){const p=homeLocal(avatar.position.x,avatar.position.z),zone=stairZone(p),y=avatar.position.y-home.y;stairGripQA.zone=zone;if((!zone&&!upperStairTransition(p,y))||y<=STAIR.ground+.10||entry.action||seating.phase!=='idle'){if(stairGripActive){releaseHand();stairGripActive=false;}return;}avatar.computeWorldMatrix(true);const inv=Matrix.Invert(avatar.getWorldMatrix());let best=null;for(const r of railTargets(p)){const world=home.C(r.x,r.y,r.z),local=Vector3.TransformCoordinates(world,inv);const side=local.x<0?-1:1,sh=V(side*.29,1.19,0),reach=Vector3.Distance(sh,local);if(reach<=.64&&(!best||reach<best.reach))best={world,sh,side,reach};}const blend=upperRailBlend(p,y);if(!best||blend<=.001){if(stairGripActive){releaseHand();stairGripActive=false;}return;}const q=handPose(best.world,blend,best.sh,V(best.side*.29,.69,0),best.side);stairGripActive=true;if(blend>=.999){stairGripQA.frames++;stairGripQA.maxError=Math.max(stairGripQA.maxError,q.error);stairGripQA.maxReach=Math.max(stairGripQA.maxReach,q.reach);}}
// Pose the actual 3D limbs around hip and shoulder pivots, driven by distance walked.
const gait={phase:0,distance:0,moving:false,stride:0};
const WALK_SPEED=5,RUN_SPEED=8.4;
const sprint={held:false,speed:WALK_SPEED,active:false,wasRunning:false,brake:0,coast:false,dx:0,dz:0,lean:0,bursts:0};
entity('run dust');
const dustMaterial=mat('soft warm earth dust','#d9c39a');dustMaterial.alpha=.60;dustMaterial.disableLighting=true;dustMaterial.emissiveColor=Color3.FromHexString('#b29b72');
const dustPool=Array.from({length:8},(_,i)=>{
 const mesh=sphere('foot dust '+i,0,0,0,.1,.1,.1,dustMaterial,false);mesh.receiveShadows=false;mesh.setEnabled(false);
 return {mesh,life:0,max:.5,dx:0,dz:0};
});
function dustAllowed(x,z){
 // Decide by the physical surface, not by a potentially stale camera/entry state.
 const p=homeLocal(x,z),f=-home.d/2;
 if(Math.abs(p.x)<=home.w/2&&Math.abs(p.z)<=home.d/2)return false;
 if(Math.abs(p.x)<=(home.w*HOUSE.porchRatio/2)&&p.z>=f-2.85-porchExtension&&p.z<=f)return false;
 if(Math.abs(p.x)<=1.1&&p.z>=f-3.725-porchExtension&&p.z<f-2.85-porchExtension)return false;
 if(onBridge(x,z))return false;
 const river=nearRiver(x,z);return river.dist>river.w*.54+.12;
}
function emitBrakeDust(){
 if(!dustAllowed(avatar.position.x,avatar.position.z))return;
 sprint.bursts++;
 for(let i=0;i<dustPool.length;i++){
  const d=dustPool[i],side=(i%2?1:-1)*(.10+.045*(i%4)),back=.04+.065*Math.floor(i/2);
  d.mesh.position.copyFromFloats(avatar.position.x-sprint.dx*back+sprint.dz*side,avatar.position.y+.085,avatar.position.z-sprint.dz*back-sprint.dx*side);
  d.life=d.max=.40+.035*i;d.dx=-sprint.dx*(.42+.07*i)+sprint.dz*side;d.dz=-sprint.dz*(.42+.07*i)-sprint.dx*side;
  d.mesh.scaling.copyFromFloats(.12,.075,.12);d.mesh.setEnabled(true);
 }
}
function updateDust(dt){
 for(const p of dustPool){if(p.life<=0)continue;p.life=Math.max(0,p.life-dt);if(p.life===0){p.mesh.setEnabled(false);continue;}
  const age=1-p.life/p.max,size=(.13+.25*age)*Math.min(1,p.life/.16);
  p.mesh.position.x+=p.dx*dt;p.mesh.position.z+=p.dz*dt;p.mesh.position.y+=dt*.21;
  p.mesh.scaling.copyFromFloats(size,size*.62,size);
 }
}
function resetSprint(){
 sprint.speed=WALK_SPEED;sprint.active=false;sprint.wasRunning=false;sprint.brake=0;sprint.coast=false;sprint.lean=0;avatar.rotation.x=0;
}

const limbRest=bodyParts.map(m=>m.position.clone());
entity('seated articulated legs');
const seatLegs=[-.13,.13].map(x=>{
 const thigh=box('seated thigh',0,0,0,.15,1,.17,M.woodDark),shin=box('seated shin',0,0,0,.14,1,.15,M.woodDark),foot=box('seated foot',0,0,0,.15,.10,.25,M.woodDark);
 for(const m of [thigh,shin,foot]){m.parent=avatar;m.setEnabled(false);}return {x,thigh,shin,foot};
});
const seatButton=$('seat-action');
function nearbyBench(){
 if(entry.action||!gardenPanel.hidden)return null;
 const local=homeLocal(avatar.position.x,avatar.position.z),inside=Math.abs(local.x)<home.w/2-.12&&local.z>-home.d/2+.12&&local.z<home.d/2-.12;
 return allBenches.filter(b=>b.kind==='sofa'?inside&&Math.abs(avatar.position.y-home.y-STAIR.ground)<.22:!inside).flatMap(b=>(b.kind==='backless-bench'?[-1,1]:[-1]).map(side=>{const p=seatStand(b,side);return {b:{...b,seatSide:side},d:Math.hypot(avatar.position.x-p.x,avatar.position.z-p.z),dy:Math.abs(avatar.position.y-p.y),free:!blocked(p.x,p.z)};})).filter(x=>x.free&&x.d<1.12&&x.dy<.65).sort((a,b)=>a.d-b.d)[0]?.b||null;
}
function setSeatPose(blend,lean=0){
 seating.blend=blend;
 const drop=(seating.bench?.kind==='sofa'?0:.10)*blend;
 bodyParts[0].position.copyFromFloats(0,.97-drop,.04*blend);
 bodyParts[0].rotation.x=lean;
 head.position.copyFromFloats(0,1.50-drop,.09*blend);hat.position.copyFromFloats(0,1.72-drop,.09*blend);hatTop.position.copyFromFloats(0,1.82-drop,.09*blend);
 for(let i=3;i<5;i++){const m=bodyParts[i],r=limbRest[i];m.position.copyFromFloats(r.x,r.y-drop,.12*blend);m.rotation.x=-.65*blend+lean;}
 for(let i=0;i<seatLegs.length;i++){
  const l=seatLegs[i],x=l.x;
  const hip=V(x,.68-drop,0),knee=V(x,.37+.17*blend,.39*blend),ankle=V(x,.075,.43*blend);
  for(const m of [l.thigh,l.shin,l.foot])m.setEnabled(blend>0);
  bodyParts[i+1].setEnabled(blend===0);bodyParts[i+1].rotation.x=0;bodyParts[i+1].position.copyFrom(limbRest[i+1]);
  poseSegment(l.thigh,hip,knee);poseSegment(l.shin,knee,ankle);l.foot.position.copyFromFloats(x,.06,.075+.43*blend);
 }
}
function seatStand(b,side=b.seatSide??-1){if(!b.world)return home.C(b.x,.53,b.z-(b.kind==='sofa'?.91:.77));const p=V(b.x+Math.sin(b.angle)*.73*side,0,b.z+Math.cos(b.angle)*.73*side);p.y=surfaceHeight(p.x,p.z);return p;}
function seatTarget(b){const side=b.seatSide??-1;return b.world?V(b.x+Math.sin(b.angle)*.11*side,b.y+.025,b.z+Math.cos(b.angle)*.11*side):home.C(b.x,.53,b.z-.13);}
const seatYaw=b=>(b.world?b.angle:home.angle)+((b.seatSide??-1)<0?Math.PI:0);
function seatIcon(b){return b?.kind==='backless-bench'?'backless-bench':b?.kind==='bench'?'bench':'chair';}
function finishSeat(success){
 const b=seating.bench;setSeatPose(0);avatar.rotation.x=0;seating.last={success,bench:b?.id};seating.bench=null;seating.phase='idle';seating.elapsed=0;
}
function toggleSeat(){
 if(seating.phase==='seated'){
  seating.phase='rise';seating.elapsed=0;return true;
 }
 if(seating.phase!=='idle'||entry.action)return false;
 const b=nearbyBench();if(!b)return false;
 const stand=seatStand(b);if(blocked(stand.x,stand.z))return false;
 cancelInput();seating.bench=b;seating.phase='approach';seating.elapsed=0;seating.last=null;return true;
}
seatButton.addEventListener('click',toggleSeat);
function updateSeating(dt){
 const b=seating.bench,phase=seating.phase;
 if(phase!=='idle'&&b){
  seating.elapsed+=dt;const stand=seatStand(b),sit=seatTarget(b),yaw=seatYaw(b);
  if(phase==='approach'){
   const dx=stand.x-avatar.position.x,dz=stand.z-avatar.position.z,dist=Math.hypot(dx,dz);
   if(dist>.025){const k=Math.min(1,dt*1.7/dist);moveAvatar(dx*k,dz*k,dt,true);}
   else{seating.phase='turn';seating.elapsed=0;seating.yawFrom=avatar.rotation.y;walkPose(0,dt);}
   if(seating.elapsed>3)finishSeat(false);
  }else if(phase==='turn'){
   const u=smooth01(seating.elapsed/.35);avatar.rotation.y=seating.yawFrom+angleDelta(seating.yawFrom,yaw)*u;walkPose(0,dt);
   if(u>=1){seating.phase='lower';seating.elapsed=0;seating.start=avatar.position.clone();}
  }else if(phase==='lower'){
   const u=smooth01(seating.elapsed/.62);avatar.position.copyFrom(Vector3.Lerp(seating.start,sit,u));setSeatPose(u,.19*Math.sin(Math.PI*u));
   if(u>=1){seating.phase='seated';seating.elapsed=0;setSeatPose(1);}
  }else if(phase==='seated'){setSeatPose(1);}
  else if(phase==='rise'){
   const u=smooth01(seating.elapsed/.62);avatar.position.copyFrom(Vector3.Lerp(sit,stand,u));setSeatPose(1-u,.23*Math.sin(Math.PI*u));
   if(u>=1)finishSeat(true);
  }
 }
 const visible=seating.phase!=='idle'||!!nearbyBench(),label=seating.phase==='seated'?'Levantar':seating.phase==='idle'?'Sentar':seating.phase==='rise'?'Levantando…':'Sentando…';
 if(seatButton.hidden===visible)seatButton.hidden=!visible;
 const icon=seatIcon(seating.bench||nearbyBench());if(seatButton.dataset.seatKind!==icon)seatButton.dataset.seatKind=icon;
 if(seatButton.textContent!==label)seatButton.textContent=label;
 seatButton.disabled=seating.phase!=='idle'&&seating.phase!=='seated';
}

function applyHumanPose(parts,rest,pose){for(let i=1;i<5;i++){const limb=parts[i],r=rest[i],pivot=i<=2?.29:.22,angle=pose.angles[i-1];limb.rotation.x=angle;limb.position.y=r.y+pivot*(1-Math.cos(angle));limb.position.z=r.z-pivot*Math.sin(angle);}parts[0].position.y=rest[0].y+pose.bob;}
function walkPose(distance,dt){const runStyle=entry.action?0:Math.max(0,Math.min(1,(sprint.speed-WALK_SPEED)/(RUN_SPEED-WALK_SPEED))),pose=humanGait(gait,distance,dt,runStyle);applyHumanPose(bodyParts,limbRest,pose);head.position.y=1.5+pose.bob;hat.position.y=1.72+pose.bob;hatTop.position.y=1.82+pose.bob;}
let joy={x:0,z:0},keys=new Set(),follow=true;
let pointer=null,stickCenter=null;const pad=$('joy'),knob=$('knob'),runButton=$('run-action');
let runPointer=null;
function setRunHeld(held){sprint.held=held;runButton.setAttribute('aria-pressed',String(held));}
function releaseRun(){
 const old=runPointer;runPointer=null;setRunHeld(false);
 if(old!==null&&runButton.hasPointerCapture(old))try{runButton.releasePointerCapture(old);}catch{}
}
runButton.addEventListener('pointerdown',e=>{
 if(runPointer!==null||e.button!==0||entry.action||seating.phase!=='idle')return;
 if(selectedTreeSpecies&&resourceInputFree()){e.preventDefault();confirmTreePlant();return;}
 const target=directNatureTarget();if(target){e.preventDefault();beginResourceSwing(target);return;}
 if(resourceSwing){e.preventDefault();return;}
 runPointer=e.pointerId;runButton.setPointerCapture(e.pointerId);setRunHeld(true);e.preventDefault();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])runButton.addEventListener(name,e=>{if(e.pointerId===runPointer)releaseRun();});

const motion={manualFrames:0,blockedFrames:0,steps:0,requested:0,travelled:0,peakDeltaMs:0};
let controls={mode:'fixed',deadzone:.08,sensitivity:1.25};
try{const v=JSON.parse(localStorage.getItem('cv.controls.v1')||'null');if(v&&['fixed','floating'].includes(v.mode)){controls.mode=v.mode;controls.deadzone=Math.max(.05,Math.min(.25,Number(v.deadzone)||.08));controls.sensitivity=Math.max(.8,Math.min(1.6,Number(v.sensitivity)||1.25));}}catch{}
let movementBasis=null,captureTarget=null;
function shapeStick(x,z){const len=Math.hypot(x,z),dead=controls.deadzone;if(len<=dead)return {x:0,z:0};const strength=Math.pow(Math.max(0,Math.min(1,(len-dead)/(1-dead))),.84);return {x:x/len*strength,z:z/len*strength};}
function worldInput(x,z,alpha=camera.alpha){
 const n=Math.hypot(x,z);if(n<1e-6){if(pointer===null)movementBasis=null;return {x:0,z:0};}
 if(movementBasis===null)movementBasis=alpha+Math.PI/2;
 const a=movementBasis,k=1/Math.max(1,n);return {x:(x*Math.cos(a)-z*Math.sin(a))*k,z:(x*Math.sin(a)+z*Math.cos(a))*k};
}
const controlsMenu=$('controls-menu'),playerMenu=$('player-menu');
const titleScreen=$('title-screen'),photoExit=$('photo-exit');let titleMode=true,photoMode=false,titleOptions=false,restartChoice=null,titleReady=false;
const titleBootQA={readyTransitions:0,earlyClicks:0,opens:1};
function refreshTitle(){if(craftRecoveryError){$('title-new').disabled=true;$('title-swap').hidden=true;$('title-feedback').textContent=craftRecoveryError;return;}let archived=false;try{archived=archiveAvailable(localStorage);$('title-new').disabled=archived;$('title-swap').hidden=!archived;}catch{$('title-new').disabled=true;$('title-swap').hidden=true;$('title-feedback').textContent='Arquivo de progresso indisponível. Seus dados não foram alterados.';} }
function setTitle(active){if(!titleReady&&!active){titleBootQA.earlyClicks++;return;}if(active&&!titleMode)titleBootQA.opens++;cancelInput();titleMode=active;titleOptions=false;restartChoice=null;document.body.classList.toggle('title-mode',active);titleScreen.hidden=!active;playerMenu.hidden=true;controlsMenu.hidden=true;$('restart-confirm').hidden=true;if(active){$('title-feedback').textContent='';refreshTitle();syncUpdateStatus();}}
function setPhoto(active){cancelInput();photoMode=active;document.body.classList.toggle('photo-mode',active);photoExit.hidden=!active;playerMenu.hidden=true;}
function requestRestart(mode){restartChoice=mode;$('restart-message').textContent=mode==='new'?'Seu mundo atual será arquivado. O novo começará do zero, mantendo suas configurações.':'Trocar o mundo atual pelo arquivado. Ambos serão preservados.';$('restart-confirm').hidden=false;}
$('title-continue').onclick=()=>setTitle(false);
$('title-options').onclick=()=>{titleOptions=true;titleScreen.hidden=true;controlsMenu.hidden=false;};
$('title-new').onclick=()=>requestRestart('new');$('title-swap').onclick=()=>requestRestart('swap');
$('restart-cancel').onclick=()=>{restartChoice=null;$('restart-confirm').hidden=true;};
$('restart-accept').onclick=()=>{if(!restartChoice)return;try{const results=[saveWorldClock(),writeGarden(),petSystem.save(),saveBuild(buildData),saveFenceCare()];if(!results.every(Boolean))throw Error('Não foi possível salvar o mundo atual.');scheduleWorldRestart(localStorage,restartChoice);location.reload();}catch(e){$('title-feedback').textContent=e.message;$('restart-confirm').hidden=true;restartChoice=null;}};
photoExit.onclick=()=>setPhoto(false);

const farmAudio=createFarmAudio({storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},AudioContext:window.AudioContext||window.webkitAudioContext,hidden:()=>document.hidden});
function syncAudio(){const s=farmAudio.settings;$('audio-effects').setAttribute('aria-pressed',String(s.effects));$('audio-ambient').setAttribute('aria-pressed',String(s.ambient));$('audio-music').setAttribute('aria-pressed',String(s.music));$('audio-volume').value=s.volume;$('audio-volume-value').textContent=s.volume+'%';}
$('audio-effects').onclick=()=>{farmAudio.set({effects:!farmAudio.settings.effects});syncAudio();};
$('audio-ambient').onclick=()=>{farmAudio.set({ambient:!farmAudio.settings.ambient});syncAudio();};
$('audio-music').onclick=()=>{farmAudio.set({music:!farmAudio.settings.music});syncAudio();};
$('audio-volume').oninput=e=>{farmAudio.set({volume:Number(e.target.value)});syncAudio();};
document.addEventListener('pointerdown',()=>{void farmAudio.unlock();},{passive:true});
document.addEventListener('click',e=>{if(e.isTrusted&&e.target.closest('button:not(:disabled)'))farmAudio.click();});
document.addEventListener('visibilitychange',()=>farmAudio.visibility());
syncAudio();
$('menu-open').onclick=()=>{if(buildModeActive)closeBuild();cancelInput();playerMenu.hidden=false;};
$('menu-close').onclick=()=>{cancelInput();playerMenu.hidden=true;};
$('menu-resume').onclick=()=>{cancelInput();playerMenu.hidden=true;$('menu-title').textContent='Menu do jogo';};
$('menu-save').onclick=()=>{const results=[saveWorldClock(),writeGarden(),petSystem.save(),saveBuild(buildData),saveFenceCare()];$('menu-feedback').textContent=results.every(Boolean)?'Progresso salvo.':'Alguns dados não puderam ser salvos.';};
$('menu-title-screen').onclick=()=>{cancelInput();saveWorldClock();petSystem.save();saveFenceCare();setTitle(true);};
$('menu-photo').onclick=()=>setPhoto(true);

function syncControls(){
 $('stick-fixed').setAttribute('aria-pressed',String(controls.mode==='fixed'));$('stick-floating').setAttribute('aria-pressed',String(controls.mode==='floating'));
 $('stick-deadzone').value=String(Math.round(controls.deadzone*100));$('deadzone-value').textContent=Math.round(controls.deadzone*100)+'%';
 $('stick-sensitivity').value=String(Math.round(controls.sensitivity*100));$('sensitivity-value').textContent=Math.round(controls.sensitivity*100)+'%';
 pad.dataset.mode=controls.mode;
}
function saveControls(){try{localStorage.setItem('cv.controls.v1',JSON.stringify(controls));}catch{}syncControls();}
function setStickMode(mode){if(!['fixed','floating'].includes(mode))return false;reset();controls.mode=mode;saveControls();return true;}
$('controls-open').onclick=()=>{cancelInput();playerMenu.hidden=true;controlsMenu.hidden=false;};
$('controls-close').onclick=()=>{cancelInput();controlsMenu.hidden=true;if(titleOptions){titleOptions=false;titleScreen.hidden=false;}};
$('stick-fixed').onclick=()=>setStickMode('fixed');$('stick-floating').onclick=()=>setStickMode('floating');
$('stick-deadzone').oninput=e=>{controls.deadzone=Number(e.target.value)/100;saveControls();};
$('stick-sensitivity').oninput=e=>{controls.sensitivity=Number(e.target.value)/100;saveControls();};
$('stick-default').onclick=()=>{cancelInput();controls={mode:'fixed',deadzone:.08,sensitivity:1.25};saveControls();};
syncControls();
function reset(){
 const old=pointer,target=captureTarget;pointer=null;captureTarget=null;stickCenter=null;movementBasis=null;joy.x=joy.z=0;knob.style.transform='';pad.style.transform='';
 if(old!==null&&target?.hasPointerCapture(old))try{target.releasePointerCapture(old);}catch{}
}
function cancelInput(){keys.clear();reset();releaseRun();resetSprint();}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&photoMode){setPhoto(false);return;}if(titleMode||photoMode||regionalOpen||inventoryDialog.open||progressDialog.open||ruralDialog.open||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;keys.add(e.key.toLowerCase());if(e.key.startsWith('Arrow'))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',cancelInput);window.addEventListener('resize',cancelInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelInput()});
function move(e){
 if(e.pointerId!==pointer||!stickCenter)return;
 let dx=e.clientX-stickCenter.x,dy=e.clientY-stickCenter.y;const r=stickCenter.r,len=Math.hypot(dx,dy);
 if(controls.mode==='floating'&&len>r){
  const shift=(len-r)/len;stickCenter.x+=dx*shift;stickCenter.y+=dy*shift;dx=e.clientX-stickCenter.x;dy=e.clientY-stickCenter.y;
  pad.style.transform='translate('+(stickCenter.x-stickCenter.baseX)+'px,'+(stickCenter.y-stickCenter.baseY)+'px)';
 }
 const k=Math.min(1,r/Math.max(1,Math.hypot(dx,dy))),v=shapeStick(dx/r*controls.sensitivity,-dy/r*controls.sensitivity);
 joy.x=v.x;joy.z=v.z; // Keep the same directional basis until this touch is released.
 knob.style.transform='translate('+dx*k+'px,'+dy*k+'px)';
}
function startStick(e){
 if(titleMode||photoMode||regionalOpen||inventoryDialog.open||progressDialog.open||ruralDialog.open||pointer!==null||e.button!==0||!controlsMenu.hidden||!playerMenu.hidden||!gardenPanel.hidden||!farmCenter.hidden)return;
 if(e.currentTarget===canvas&&(controls.mode!=='floating'||e.clientX>innerWidth*.47||e.clientY<innerHeight*.42))return;
 const r=pad.getBoundingClientRect(),baseX=r.left+r.width/2,baseY=r.top+r.height/2,free=controls.mode==='floating';
 stickCenter={x:free?e.clientX:baseX,y:free?e.clientY:baseY,baseX,baseY,r:Math.max(12,(r.width-knob.offsetWidth)/2-2)};
 if(free)pad.style.transform='translate('+(stickCenter.x-baseX)+'px,'+(stickCenter.y-baseY)+'px)';
 pointer=e.pointerId;captureTarget=e.currentTarget;captureTarget.setPointerCapture(pointer);movementBasis=camera.alpha+Math.PI/2;move(e);e.preventDefault();
}
for(const target of [pad,canvas]){
 target.addEventListener('pointerdown',startStick);target.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
}

const rockCells=new Map(),rockCellSize=3;
for(const r of rockColliders){
 r.angle=r.mesh.rotation.y;delete r.mesh;
 const extent=Math.max(r.rx,r.rz)*1.15+.24;
 for(let ix=Math.floor((r.x-extent)/rockCellSize);ix<=Math.floor((r.x+extent)/rockCellSize);ix++)for(let iz=Math.floor((r.z-extent)/rockCellSize);iz<=Math.floor((r.z+extent)/rockCellSize);iz++){
  const key=ix+':'+iz,list=rockCells.get(key)||[];list.push(r);rockCells.set(key,list);
 }
}
function rockClearance(r,x,z){
 const dx=x-r.x,dz=z-r.z,c=Math.cos(r.angle),s=Math.sin(r.angle),a=r.rx*1.08+.20,b=r.rz*1.08+.20;
 return (Math.hypot((dx*c-dz*s)/a,(dx*s+dz*c)/b)-1)*Math.min(a,b);
}
function rockBlocked(x,z,from=null){
 if(onBridge(x,z))return false;
 const list=rockCells.get(Math.floor(x/rockCellSize)+':'+Math.floor(z/rockCellSize))||[];
 return list.some(r=>obstacleEntered(rockClearance(r,x,z),from?rockClearance(r,from.x,from.z):null));
}
// A previously overlapping actor may move out, never farther into the same collider.
function obstacleEntered(next,prev=null){return next<0&&!(prev!==null&&prev<0&&next>prev+1e-6);}
function onBridge(x,z){if(staffBridgeAt(x,z))return true;const a=ba,b=bb,dx=b.x-a.x,dz=b.z-a.z,t=((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz);return t>=0&&t<=1&&Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<1.28}
function blocked(x,z,interacting=false,from=null,ignoreFences=false){
 const check=fn=>obstacleEntered(fn(x,z),from?fn(from.x,from.z):null);
 if(check((a,b)=>Math.min(a-minX-1,maxX-1-a,b-minZ-1,maxZ-1-b)))return true;
 const bridge=onBridge(x,z);if(staffBridgeRailBlocked(x,z,from))return true;if(gateBlocked(x,z,from)||archBlocked(x,z,from))return true;
 if(!bridge&&check((a,b)=>{const n=nearRiver(a,b);return n.dist-n.w*.54-.12;}))return true;
 if(!bridge&&check((a,b)=>eastWaterAt(a,b).edge-.15))return true;
 if(rockBlocked(x,z,from))return true;
 if(livestockRails.some(([a,b])=>check((u,v)=>segDist(u,v,a,b)-.24)))return true;
 if(trunkColliders.some(t=>t.active!==false&&check((a,b)=>Math.hypot(a-t.x,b-t.z)-t.r-.18)))return true;
 if(!ignoreFences&&!bridge&&fenceColliders.some(([a,b])=>check((u,v)=>segDist(u,v,a,b)-.24)))return true;
 if(homeBlocked(x,z,interacting))return true;
 const dc=Math.cos(dogHome.angle),ds=Math.sin(dogHome.angle);
 if(check((a,b)=>{const dx=a-dogHome.x,dz=b-dogHome.z;return Math.max(Math.abs(dx*dc-dz*ds)-dogHome.w/2-.18,Math.abs(dx*ds+dz*dc)-dogHome.d/2-.18);}))return true;
 if(check((a,b)=>Math.hypot(a-well.x,b-well.z)-1.34))return true;
 if(farmSectors.some(f=>check((a,b)=>Math.max(Math.abs(a-f.sign.x)-1.08,Math.abs(b-f.sign.z)-.26))))return true;
 if(!ignoreFences&&!bridge&&nearbyFarmRails(x,z).some(([a,b])=>check((u,v)=>segDist(u,v,a,b)-.24)))return true;
 if(workerDorm&&staffWallContact(x,z,from))return true;
 if(worldFixtures.some(f=>f.active!==false&&check((a,b)=>{const p=localOffset(f.x,f.z,f.yaw||0,a,b);return Math.max(Math.abs(p.x)-f.hx-.18,Math.abs(p.z)-f.hz-.18);})))return true;
 return false;
}
// Track original shadow membership after batching; avoid stale shadows of hidden
// walls and transparent roofs. Change membership only when the state changes.
const residenceShadowState={members:new Map(),changes:0,insideSwitches:0};
function syncHouseShadows(){
 for(const [mesh,state] of residenceShadowState.members){
  const opaque=mesh.visibility>.98&&mesh.isEnabled(),cast=state.cast&&opaque,receive=state.receive&&opaque;
  if(mesh.receiveShadows!==receive)mesh.receiveShadows=receive;
  if(cast===state.active)continue;
  if(cast)shadow.addShadowCaster(mesh,false);else shadow.removeShadowCaster(mesh,false);
  state.active=cast;residenceShadowState.changes++;shadow.getShadowMap().resetRefreshCounter();
 }
}
function setHouseGroup(id,visible){for(const mesh of groups[id]||[])if(mesh.isEnabled()!==visible)mesh.setEnabled(visible);}
// Interaction state owns the leaf: proximity and the button never drive it directly.
const doorAngle=()=>home.angle-entry.door*Math.PI*.49;
function setDoorPose(turn=0){
 home.doorRoot.rotation.y=doorAngle();home.doorRoot.computeWorldMatrix(true);
 for(const side of [-1,1]){const h=home.handles[side];h.pivot.rotation.z=turn*.72;h.pivot.computeWorldMatrix(true);h.grip.computeWorldMatrix(true);}
}
function gripPoint(side){return home.handles[side].grip.getAbsolutePosition().clone();}
function stance(side){
 const yaw=doorAngle()+(side===1?Math.PI:0),grip=gripPoint(side);
 const forward=V(Math.sin(yaw),0,Math.cos(yaw)),right=V(Math.cos(yaw),0,-Math.sin(yaw));
 const p=grip.subtract(right.scale(.29)).subtract(forward.scale(.46));p.y=surfaceHeight(p.x,p.z);return {p,yaw};
}
function doorNearby(){if(avatar.position.y>home.y+STAIR.ground+.10)return false;const p=homeLocal(avatar.position.x,avatar.position.z);return Math.abs(p.x)<2.25&&Math.abs(p.z+home.d/2)<2.55;}
function toggleDoor(){
 if(entry.action||seating.phase!=='idle'||!doorNearby())return false;
 releaseRun();resetSprint();
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2;
 const side=p.z>f+.23?1:-1,target=entry.door>.5?0:1;
 setDoorPose(0);
 const action={phase:'approach',elapsed:0,from:entry.door,target,side,waypoints:[],gripped:false,turn:0,maxGripError:0,maxReach:0,gripFrames:0,turnBeforeSwing:false,swingDistance:0,start:avatar.position.clone()};
 // If the open leaf separates the player from the desired side, walk around its free edge.
 const theta=-entry.door*Math.PI*.49,hx=-home.doorW/2+.035,hz=f-.055,rx=Math.cos(theta),rz=-Math.sin(theta),nx=Math.sin(theta),nz=Math.cos(theta);
 const currentSide=(p.x-hx)*nx+(p.z-hz)*nz>=0?1:-1;
 if(entry.door>.85&&currentSide!==side){
  const tip=home.doorW-.07+.58;
  for(const k of [currentSide,side])action.waypoints.push(home.C(hx+rx*tip+nx*k*.53,0,hz+rz*tip+nz*k*.53));
 }
 entry.action=action;entry.lastAction=null;return true;
}
function finishDoorAction(a,success){
 setDoorPose(0);releaseHand();
 entry.open=entry.door>=.999;
 entry.lastAction={success,target:a.target,gripFrames:a.gripFrames,maxGripError:a.maxGripError,maxReach:a.maxReach,turnBeforeSwing:a.turnBeforeSwing,swingDistance:a.swingDistance,door:entry.door};
 entry.action=null;
}
function updateDoorAction(dt){
 const a=entry.action;if(!a)return;
 a.elapsed+=dt;
 const advance=phase=>{a.phase=phase;a.elapsed=0;};
 if(a.phase==='approach'){
  const dest=a.waypoints[0]||stance(a.side).p,dx=dest.x-avatar.position.x,dz=dest.z-avatar.position.z,dist=Math.hypot(dx,dz);
  if(dist>.035){const k=Math.min(1,2.2*dt/dist);moveAvatar(dx*k,dz*k,dt,true);}
  else if(a.waypoints.length){a.waypoints.shift();a.elapsed=0;}
  else{avatar.rotation.y=stance(a.side).yaw;walkPose(0,dt);advance('reach');}
  if(a.elapsed>5)finishDoorAction(a,false);return;
 }
 if(a.phase==='reach'){
  avatar.rotation.y=stance(a.side).yaw;const p=handPose(gripPoint(a.side),smooth01(a.elapsed/.32));
  if(a.elapsed>=.32){if(p.reach>.78){finishDoorAction(a,false);return;}a.gripped=true;advance('turn');}return;
 }
 if(a.phase==='turn'){
  a.turn=smooth01(a.elapsed/.27);setDoorPose(a.turn);const p=handPose(gripPoint(a.side),1);
  a.maxGripError=Math.max(a.maxGripError,p.error);a.maxReach=Math.max(a.maxReach,p.reach);a.gripFrames++;
  if(a.elapsed>=.27){a.turnBeforeSwing=a.gripped&&entry.door===a.from&&a.turn>.99;advance('swing');}return;
 }
 if(a.phase==='swing'){
  const old=entry.door,next=a.from+(a.target-a.from)*smooth01(a.elapsed/1.15);entry.door=next;setDoorPose(1);
  const target=stance(a.side),delta=target.p.subtract(avatar.position),dist=Math.hypot(delta.x,delta.z);
  if(blocked(target.p.x,target.p.z,true)||Math.abs(delta.y)>.34||dist>.20){
   entry.door=old;setDoorPose(0);finishDoorAction(a,false);return;
  }
  avatar.position.copyFrom(target.p);avatar.rotation.y=target.yaw;walkPose(dist,dt);a.swingDistance+=dist;
  const p=handPose(gripPoint(a.side),1);a.maxGripError=Math.max(a.maxGripError,p.error);a.maxReach=Math.max(a.maxReach,p.reach);a.gripFrames++;
  if(a.elapsed>=1.15){entry.door=a.target;entry.open=a.target===1;advance('release');}return;
 }
 if(a.phase==='release'){
  const u=smooth01(a.elapsed/.30);setDoorPose(1-u);handPose(gripPoint(a.side),1-u);
  if(a.elapsed>=.30)finishDoorAction(a,true);
 }
}
// A single pointer gesture invokes the action once, even during joystick input.
// Do not rely on the browser synthesizing a click after a touch gesture.
const doorAction=$('door-action');let doorPointer=null;
doorAction.addEventListener('pointerdown',e=>{
 if(doorPointer!==null||!e.isPrimary&&e.pointerType==='mouse'||e.button!==0)return;
 doorPointer=e.pointerId;doorAction.setPointerCapture(e.pointerId);e.preventDefault();
});
doorAction.addEventListener('pointerup',e=>{
 if(e.pointerId!==doorPointer)return;
 doorPointer=null;const r=doorAction.getBoundingClientRect();
 if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)toggleDoor();
 e.preventDefault();
});
for(const name of ['pointercancel','lostpointercapture'])doorAction.addEventListener(name,e=>{if(e.pointerId===doorPointer)doorPointer=null;});
doorAction.addEventListener('click',e=>{if(e.detail===0)toggleDoor();});

window.addEventListener('keydown',e=>{if(!inventoryDialog.open&&!progressDialog.open&&!ruralDialog.open&&e.key.toLowerCase()==='e'&&!e.repeat)toggleDoor()});
const smooth01=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// Camera influence is spatial and continuous, independent of the door/roof state.
function entryInfluence(p,inside,porch){
 if(inside||porch)return 1;
 const f=-home.d/2;
 if(p.z>f+.25)return 0;
 return smooth01((p.z-f+6.2+porchExtension)/3.25)*smooth01((3.0-Math.abs(p.x))/1.8);
}
// Register major buildings once, using their actual footprint and orientation.
const cameraBuildings=[{id:'house',x:home.x,z:home.z,w:home.w,d:home.d,angle:home.angle}];
function registerCameraBuilding(b){
 if(!b||typeof b.id!=='string'||![b.x,b.z,b.w,b.d,b.angle].every(Number.isFinite)||b.w<5||b.d<4||cameraBuildings.some(q=>q.id===b.id))return false;
 cameraBuildings.push({...b});return true;
}
function exteriorCameraZone(x,z){
 let best=null;
 for(const b of cameraBuildings){
  const dx=x-b.x,dz=z-b.z,c=Math.cos(b.angle),s=Math.sin(b.angle),lx=dx*c-dz*s,lz=dx*s+dz*c;
  const ox=Math.max(0,Math.abs(lx)-b.w/2),oz=Math.max(0,Math.abs(lz)-b.d/2);
  if(!ox&&!oz)continue;
  // The residence's existing front door/porch owns its own camera.
  if(b.id==='house'&&lz< -b.d/2&&ox<.25)continue;
  const dist=Math.hypot(ox,oz),weight=smooth01((4.0-dist)/3.15);
  if(weight<=.001||best&&best.weight>=weight)continue;
  const nx=Math.sign(lx)*ox,nz=Math.sign(lz)*oz,len=Math.hypot(nx,nz);
  const wx=(nx*c+nz*s)/len,wz=(-nx*s+nz*c)/len;
  best={id:b.id,side:oz>=ox?(lz>0?'rear':'front'):(lx>0?'right':'left'),weight,alpha:Math.atan2(wz,wx),outX:wx,outZ:wz};
 }
 return best;
}
const cameraStability={zone:null,hold:0,switches:0,maxTurnRate:0,gesture:false,quiet:1,occluded:false,houseOpacity:1};
function cameraGesture(dt,active){
 if(active){cameraStability.gesture=true;cameraStability.quiet=0;}
 else{cameraStability.quiet+=dt;if(cameraStability.quiet>=.20)cameraStability.gesture=false;}
 return cameraStability.gesture;
}
// Exterior occlusion is tested from the actual avatar toward the camera.
// Fade the residence only if its volume obscures the player; never alter collisions.
function avatarOccludedByHouse(alpha,beta){
 const p=avatar.position,dx=Math.cos(alpha),dz=Math.sin(alpha),rise=1/Math.tan(Math.max(.1,beta));
 for(let d=.25;d<=15;d+=.25){
  const y=p.y+1.05+d*rise;if(y>home.y+8.6)break;
  const l=homeLocal(p.x+dx*d,p.z+dz*d);
  if(Math.abs(l.x)<home.w/2+.20&&Math.abs(l.z)<home.d/2+.20&&y>home.y+.45)return true;
 }
 return false;
}
function updateAvatarVisibility(dt,inside){
 // The entrance has its own roof cutaway; exterior occlusion must not compete
 // with it. Preserve the approved rear/side transparency outside the porch.
 const occluded=!inside&&entry.mode==='exterior'&&avatarOccludedByHouse(camera.alpha,camera.beta),target=occluded?.15:1;
 cameraStability.occluded=occluded;
 const opacity=cameraStability.houseOpacity+(target-cameraStability.houseOpacity)*(1-Math.exp(-dt*14));
 const next=Math.abs(opacity-target)<.015?target:opacity;
 if(next!==cameraStability.houseOpacity){
  cameraStability.houseOpacity=next;
  for(const id of ['house','house-roof','house-front','house-porch-roof','house-door'])for(const mesh of groups[id]||[]){mesh.visibility=next;}
 }
}
function stableCameraZone(front,external,near,dt){
 const prior=cameraStability.zone;
 const f=front>.001?{kind:'front',weight:front}:null;
 const e=external?{kind:'exterior',weight:external.weight,exterior:external}:null;
 let next=near&&f?f:!f?e:!e?f:(e.weight>f.weight+.12?e:f);
 if(!near&&prior&&f&&e&&Math.abs(f.weight-e.weight)<.12)next=prior.kind==='front'?f:e;
 if(next&&next.weight>=.045){cameraStability.hold=.22;}
 else if(prior&&cameraStability.hold>0&&!near){cameraStability.hold=Math.max(0,cameraStability.hold-dt);next={...prior,weight:Math.max(next?.weight||0,prior.weight*Math.exp(-dt*5))};}
 else if(!next||next.weight<.045){next=null;cameraStability.hold=0;}
 if((prior?.kind||null)!==(next?.kind||null))cameraStability.switches++;
 cameraStability.zone=next;return next;
}
function updateEntry(dt){
 updateDoorAction(dt);updateSeating(dt);tickInteriorDoors(dt);
 const steering=pointer!==null||['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>keys.has(k));
 const gesture=cameraGesture(dt,steering);
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2,upperDeck=upperBalconyAt(p,avatar.position.y-home.y);
 const inside=Math.abs(p.x)<home.w/2-.12&&p.z>f+(entry.inside?.08:.34)&&p.z<home.d/2-.12;
 if(inside!==entry.inside)residenceShadowState.insideSwitches++;
 const porch=upperDeck||Math.abs(p.x)<(home.w*HOUSE.porchRatio/2)+.15&&p.z>=f-2.9-porchExtension&&p.z<=f+.25;
 const stairs=Math.abs(p.x)<1.25&&p.z>=f-3.95-porchExtension&&p.z<f-2.8-porchExtension;
 const near=inside||porch||stairs;
 const next=upperDeck?'varanda-superior':inside?'interior':near?'entrada':'exterior';
 const frontWeight=entryInfluence(p,inside,porch);
 const zone=stableCameraZone(frontWeight,exteriorCameraZone(avatar.position.x,avatar.position.z),inside||porch,dt);
 const exterior=zone?.exterior||null,weight=zone?.weight||0;entry.cameraWeight=weight;entry.cameraSide=exterior?.side||(zone?.kind==='front'?'front':null);entry.cameraBuilding=exterior?.id||(zone?.kind==='front'?'house':null);
 if(weight>.001&&!entry.previous)entry.previous={alpha:camera.alpha,beta:camera.beta,span,target:camera.target.clone(),follow};
 if(next!==entry.mode){entry.mode=next;setHouseGroup('house-porch-roof',!near);setHouseGroup('house-roof',!inside&&!upperDeck);setHouseGroup('house-front',!inside);shadowMap.resetRefreshCounter();}
 entry.inside=inside;entry.upperVisible=upperFloorVisible(entry.upperVisible,inside,avatar.position.y-home.y);const showUpper=!inside||entry.upperVisible;setHouseGroup('house-upper-floor',showUpper);setHouseGroup('house-ground-divider',!inside||!entry.upperVisible);setHouseGroup('house-upper-rooms',showUpper);const showBalcony=upperDeck||entry.upperVisible||(!inside&&!near);setHouseGroup('house-upper-balcony',showBalcony);for(const p of planters)if(!p.staff&&p.floor===2&&p.mesh.isEnabled()!==!!(showBalcony&&p.crop))p.mesh.setEnabled(!!(showBalcony&&p.crop));for(const f of ruralFixtures)setHouseGroup('interior '+f.id,f.floor===2?showUpper:!inside||!showUpper);for(const d of interiorDoors)setHouseGroup('interior-door '+d.id,d.floor===2?showUpper:!inside||!showUpper);updateChimneySmoke(dt,!inside);
 const nearDoor=seating.phase==='idle'&&(doorNearby()||!!entry.action),doorLabel=entry.action?(entry.action.target?'Abrindo…':'Fechando…'):(entry.door>.5?'Fechar porta':'Abrir porta');
 if(doorAction.disabled!==!!entry.action)doorAction.disabled=!!entry.action;
 if(doorAction.hidden===nearDoor)doorAction.hidden=!nearDoor;
 if(doorAction.textContent!==doorLabel)doorAction.textContent=doorLabel;
 const status=$('entry-status'),statusText=upperDeck?'Varanda superior':inside?(avatar.position.y>=home.y+UPPER_Y-.08?'Segundo andar':avatar.position.y>home.y+STAIR.ground+.10?'Escada interna':'Interior'):near?'Entrada da casa':'';
 if(status.textContent!==statusText)status.textContent=statusText;
 const factor=1-Math.exp(-dt*4);
 if(entry.previous){
  const saved=entry.previous;
  entry.blend+=(weight-entry.blend)*factor;
  const b=entry.blend;
  // The actor, not the building centre, is the tracking anchor. Look slightly
  // ahead along the entrance axis, keeping the actor below the visual centre.
  const forward=home.C(0,0,1).subtract(home.C(0,0,0));
  const aim=avatar.position.add(V(0,inside?1.25:1.45,0)).add(exterior?V(-exterior.outX*.65,0,-exterior.outZ*.65):forward.scale(inside?.65:1.65));
  const baseAim=saved.follow?explorationAim():saved.target;
  // While a real steering gesture is active, keep screen axes fixed. Resume
  // the automatic orbit after release; do not fight an ongoing directional command.
  const desiredAlpha=gesture?camera.alpha:exterior?(weight>=.65?exterior.alpha:saved.alpha+angleDelta(saved.alpha,exterior.alpha)*smooth01(weight/.65)):weight>0?saved.alpha+angleDelta(saved.alpha,-Math.PI/2-home.angle)*b:saved.alpha;
  const turn=angleDelta(camera.alpha,desiredAlpha)*factor,maxTurn=1.15*dt;
  const applied=Math.max(-maxTurn,Math.min(maxTurn,turn));camera.alpha+=applied;
  if(dt>0)cameraStability.maxTurnRate=Math.max(cameraStability.maxTurnRate,Math.abs(applied)/dt);
  const betaTarget=gesture&&!inside?camera.beta:saved.beta+((inside?48*Math.PI/180:(exterior?57:65)*Math.PI/180)-saved.beta)*b;
  const beta=camera.beta+(betaTarget-camera.beta)*factor;
  const desiredSpan=saved.span+((inside?24:exterior?(saved.follow?Math.min(saved.span,cameraBase().span):37):34)-saved.span)*b;
  span+=(desiredSpan-span)*factor;
  const trackingAim=saved.follow?avatar.position.add(V(0,inside?1.25:1.10,0)):Vector3.Lerp(baseAim,aim,b);
  retarget(Vector3.Lerp(camera.target,trackingAim,1-Math.exp(-dt*10)),beta);fit();
  if(!gesture&&weight===0&&b<.004&&Math.abs(angleDelta(camera.alpha,saved.alpha))<.008){camera.alpha=saved.alpha;span=saved.span;retarget(baseAim,saved.beta);fit();entry.previous=null;entry.blend=0;follow=saved.follow;}
 }else if(follow)retarget(Vector3.Lerp(camera.target,explorationAim(),1-Math.exp(-dt*10)));
 updateAvatarVisibility(dt,inside);syncHouseShadows();
}
// The ordinary gameplay camera follows the actor across the entire map.
const EXPLORATION_SPAN=cameraBase().span;
function explorationAim(){return avatar.position.add(V(0,1,0));}
function setView(newSpan,target,tracking){
 if(entry.previous){Object.assign(entry.previous,{span:newSpan,target,follow:tracking});return;}
 span=newSpan;follow=tracking;retarget(target);fit();
}
function selectCameraProfile(key){
 if(!Object.hasOwn(CAMERA_PROFILES,key))return false;
 cameraProfile=key;try{localStorage.setItem('cv.cameraProfile.v1',key);}catch{}
 const p=cameraBase(),alpha=p.alpha*Math.PI/180,beta=p.beta*Math.PI/180;
 if(entry.previous){Object.assign(entry.previous,{alpha,beta,span:p.span,target:explorationAim(),follow:true});}
 else{camera.alpha=alpha;span=p.span;follow=true;retarget(explorationAim(),beta);fit();}
 for(const id of Object.keys(CAMERA_PROFILES))$('camera-'+id).setAttribute('aria-pressed',String(id===key));
 return true;
}
for(const id of Object.keys(CAMERA_PROFILES)){$('camera-'+id).onclick=()=>selectCameraProfile(id);$('camera-'+id).setAttribute('aria-pressed',String(id===cameraProfile));}
$('wide').onclick=()=>setView(cameraBase().span,explorationAim(),true);
$('close').onclick=()=>setView(66,V(0,3.5,0),false);
$('follow').onclick=()=>setView(27,avatar.position.add(V(0,1,0)),true);
$('field-view').onclick=()=>setView(45,V(wheatGate.x,3.5,wheatGate.z+5),false);
$('rotate').onclick=()=>{orbit=(orbit+1)%4;const alpha=cameraBase().alpha*Math.PI/180+orbit*Math.PI/2;if(entry.previous)entry.previous.alpha=alpha;else camera.alpha=alpha;};
// Use the rendered triangulated terrain for contact, and distinguish a smooth
// walkable grade from an abrupt drop or wall. Built stairs keep their step limit.
const terrainContactStats={steps:0,rejectedSlope:0,maxFootError:0};
function terrainMotionAllowed(x0,z0,x1,z1,y0,y1){
 const run=Math.hypot(x1-x0,z1-z0),rise=Math.abs(y1-y0);
 if(rise>.34)return false;
 const natural=Math.abs(y0-renderedTerrainY(x0,z0))<.045&&Math.abs(y1-renderedTerrainY(x1,z1))<.045;
 if(natural&&y1>y0&&rise>run*1.20+.018){terrainContactStats.rejectedSlope++;return false;}
 return true;
}
let petBodyBlocked=()=>false;
function livestockBodyBlocked(x,z,from=null){return [...livestockAgents.values()].some(a=>{const p=a.root.position,r=a.radius+.20;return obstacleEntered(Math.hypot(x-p.x,z-p.z)-r,from?Math.hypot(from.x-p.x,from.z-p.z)-r:null);});}
function playerBlocked(x,z,from=null){return blocked(x,z,false,from)||petBodyBlocked(x,z,from)||livestockBodyBlocked(x,z,from);}
function moveAvatar(dx,dz,dt,interacting=false){
 if(Math.abs(dx)+Math.abs(dz)<1e-8){walkPose(0,dt);return 0;}
 const oldX=avatar.position.x,oldZ=avatar.position.z;
 const localStart=homeLocal(oldX,oldZ),localTarget=homeLocal(oldX+dx,oldZ+dz),startHeight=stairHeight(localStart),onStair=startHeight!==null&&Math.abs(avatar.position.y-home.y-startHeight)<=.04;let floor=(onStair||avatar.position.y>home.y+STAIR.ground+.10&&upperSupport(localStart,home.w,home.d))?avatar.position.y:surfaceHeight(oldX,oldZ);const staffFloor=staffHeight(oldX,oldZ,avatar.position.y);if(staffFloor!==null)floor=staffFloor;
 if(!interacting&&(stairMotionLimited(localStart,avatar.position.y-home.y)||stairZone(localTarget)||upperStairTransition(localTarget,avatar.position.y-home.y))){const length=Math.hypot(dx,dz),limit=2.25*Math.max(0,dt);if(length>limit){dx*=limit/length;dz*=limit/length;}}
 const attempt=(x,z)=>{
  const from={x:avatar.position.x,z:avatar.position.z};const sh=staffHeight(x,z,floor);if(sh!==null){if(staffBlocked(x,z,sh)&&!(staffFloor!==null&&staffBlocked(from.x,from.z,floor)&&staffClearance(x,z,sh)>staffClearance(from.x,from.z,floor)+1e-6)||Math.abs(sh-floor)>.34)return false;avatar.position.x=x;avatar.position.z=z;floor=sh;return true;}if(staffFloor!==null&&Math.abs(floor-(workerDorm.y+.26))>.35)return false;if(staffWallContact(x,z,from))return false;const level=residenceStep(homeLocal(from.x,from.z),homeLocal(x,z),floor-home.y,home.w,home.d);if(level?.blocked)return false;if(!level&&(blocked(x,z,interacting,from)||petBodyBlocked(x,z,from)||livestockBodyBlocked(x,z,from)))return false;
  const next=level?home.y+level.height:surfaceHeight(x,z);if(level&&next>=home.y+UPPER_Y-.08&&upperResidenceBlocked(x,z))return false;if(!terrainMotionAllowed(avatar.position.x,avatar.position.z,x,z,floor,next))return false;
  avatar.position.x=x;avatar.position.z=z;floor=next;return true;
 };
 if(!attempt(oldX+dx,oldZ+dz)){
  // Slide along obstacles without multiplying speed or moving backwards.
  const length=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
  for(const offset of [Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3]){
   const a=angle+offset,s=length*Math.cos(offset);
   if(attempt(oldX+Math.cos(a)*s,oldZ+Math.sin(a)*s))break;
  }
 }
 const mx=avatar.position.x-oldX,mz=avatar.position.z-oldZ,travel=Math.hypot(mx,mz);
 avatar.position.y=floor;terrainContactStats.steps++;terrainContactStats.maxFootError=Math.max(terrainContactStats.maxFootError,Math.abs(avatar.position.y-(staffHeight(avatar.position.x,avatar.position.z,floor)??(residenceStep(homeLocal(avatar.position.x,avatar.position.z),homeLocal(avatar.position.x,avatar.position.z),floor-home.y,home.w,home.d)?.height!=null?home.y+residenceStep(homeLocal(avatar.position.x,avatar.position.z),homeLocal(avatar.position.x,avatar.position.z),floor-home.y,home.w,home.d).height:surfaceHeight(avatar.position.x,avatar.position.z)))));
 if(travel>.0001){
  const target=Math.atan2(mx,mz);
  avatar.rotation.y=interacting?target:avatar.rotation.y+angleDelta(avatar.rotation.y,target)*(1-Math.exp(-dt*22));
 }
 walkPose(travel,dt);syncStairGrip();return travel;
}
// Preserve movement speed through moderately late frames without tunneling.
// Door actions keep their own existing bounded animation clock.
function advanceManual(x,z,dt,speed=WALK_SPEED){
 const duration=Math.max(0,Math.min(.12,dt)),len=Math.hypot(x,z);
 if(len<1e-8||duration===0){walkPose(0,Math.min(.05,duration));return 0;}
 const n=Math.ceil(duration/(1/60)),step=duration/n;
 let total=0;motion.manualFrames++;motion.requested+=len*speed*duration;motion.steps+=n;
 for(let i=0;i<n;i++)total+=moveAvatar(x*step*speed,z*step*speed,step);
 motion.travelled+=total;if(total<1e-4)motion.blockedFrames++;
 return total;
}
// The run modifier is independent of joystick input; coast is bounded and collision-tested.
function updateLocomotion(x,z,rawDt,held=sprint.held||keys.has('shift')){
 const dt=Math.max(0,Math.min(.12,rawDt)),len=Math.hypot(x,z),moving=len>1e-5;
 if(domesticRun||titleMode||photoMode||regionalOpen||inventoryDialog.open||progressDialog.open||ruralDialog.open||seating.phase!=='idle'||!farmCenter.hidden||!controlsMenu.hidden||!playerMenu.hidden)return 0;
 if(entry.action||!gardenPanel.hidden){resetSprint();walkPose(0,Math.min(.05,dt));return 0;}
 const local=homeLocal(avatar.position.x,avatar.position.z),onStairs=stairMotionLimited(local,avatar.position.y-home.y);if(onStairs){sprint.brake=0;sprint.coast=false;sprint.wasRunning=false;sprint.speed=Math.min(sprint.speed,WALK_SPEED);}
 const running=held&&moving&&!onStairs;
 if(running){sprint.brake=0;sprint.coast=false;}
 else if(!onStairs&&sprint.wasRunning&&sprint.active&&sprint.speed>WALK_SPEED+.65){
  sprint.brake=.24;sprint.coast=!moving;emitBrakeDust();
 }
 if(moving){sprint.dx=x/len;sprint.dz=z/len;sprint.coast=false;}
 const target=running?RUN_SPEED:WALK_SPEED;
 sprint.speed+=(target-sprint.speed)*(1-Math.exp(-dt*13));
 if(Math.abs(sprint.speed-target)<.015)sprint.speed=target;
 let travel=0;
 if(moving)travel=advanceManual(x,z,dt,sprint.speed);
 else if(sprint.coast&&sprint.brake>0){
  const before=sprint.brake,used=Math.min(dt,before),after=before-used;
  // integrate the linear deceleration exactly, with a max total coast of .30m
  const coastSpeed=2.5*(before+after)/(.48);
  travel=advanceManual(sprint.dx,sprint.dz,used,coastSpeed);
 }else walkPose(0,Math.min(.05,dt));
 sprint.active=running&&travel>1e-5;sprint.wasRunning=running;
 const braking=sprint.brake>0;
 const leanTarget=braking?-.20*Math.sin(Math.PI*Math.min(1,sprint.brake/.24)):sprint.active?.14:0;
 sprint.lean+=(leanTarget-sprint.lean)*(1-Math.exp(-dt*20));if(Math.abs(sprint.lean)<.001)sprint.lean=0;
 avatar.rotation.x=sprint.lean;
 sprint.brake=Math.max(0,sprint.brake-dt);if(sprint.brake===0)sprint.coast=false;
 return travel;
}
// Local 3D precipitation. Each droplet travels in world coordinates to a surface,
// with a pooled impact ring and two small airborne splash droplets. No screen overlay.
entity('world precipitation');
const rainStats={capacity:420,active:0,impacts:{ground:0,roof:0,river:0,deck:0},runoff:0,wetness:0,puddles:0};
let rainSeed=76531;const rainRnd=()=>((rainSeed=Math.imul(1664525,rainSeed)+1013904223|0)>>>0)/4294967296;
const rainMaterial=mat('world rain droplet','#c6e4ee');rainMaterial.disableLighting=true;rainMaterial.emissiveColor=Color3.FromHexString('#91c4d8');rainMaterial.alpha=.56;rainMaterial.disableDepthWrite=true;
const rippleMaterial=mat('water impact ripples','#c1e6ed');rippleMaterial.disableLighting=true;rippleMaterial.emissiveColor=Color3.FromHexString('#80b9ce');rippleMaterial.alpha=.52;rippleMaterial.disableDepthWrite=true;
const rainDropMesh=MeshBuilder.CreateSphere('world falling drops',{diameter:2,segments:5},scene);
const splashMesh=MeshBuilder.CreateSphere('world splash beads',{diameter:2,segments:4},scene);
const rainRingMesh=MeshBuilder.CreateTorus('horizontal rain impact rings',{diameter:2,thickness:.055,tessellation:12},scene);
const rainPool=Array.from({length:rainStats.capacity},()=>({life:0,x:0,y:0,z:0,speed:0,target:null,runoff:false}));
const impactPool=Array.from({length:96},()=>({life:0,x:0,y:0,z:0,kind:'ground'}));
const dropMatrices=new Float32Array(rainPool.length*16),ringMatrices=new Float32Array(impactPool.length*16),splashMatrices=new Float32Array(impactPool.length*2*16);
for(const [mesh,material,buffer] of [[rainDropMesh,rainMaterial,dropMatrices],[splashMesh,rainMaterial,splashMatrices],[rainRingMesh,rippleMaterial,ringMatrices]]){
 own(mesh,material,false);mesh.receiveShadows=false;mesh.alwaysSelectAsActiveMesh=true;mesh.thinInstanceSetBuffer('matrix',buffer,16,false);mesh.setEnabled(false);
}
function rainMatrix(buffer,i,x,y,z,sx,sy,sz,leanX=0,leanZ=0){
 const o=i*16;buffer[o]=sx;buffer[o+4]=leanX*sy;buffer[o+5]=sy;buffer[o+6]=leanZ*sy;buffer[o+10]=sz;buffer[o+12]=x;buffer[o+13]=y;buffer[o+14]=z;buffer[o+15]=1;
}
function rainSurface(x,z){
 const archSurface=archRainSurface(x,z);if(archSurface)return archSurface;
 const p=homeLocal(x,z),ow=home.w/2+.55,od=home.d/2+.65,e=HOUSE.h+.5,r=e+home.w*.26;
 if(Math.abs(p.x)<=ow&&Math.abs(p.z)<=od){
  let y=home.y+r+(e-r)*Math.abs(p.x)/ow+.13;
  const side=-1,z0=-.85,dw=2.35,front=side*ow*.78,back=side*ow*.26;
  if(p.x>=front-.32&&p.x<=back+.26&&Math.abs(p.z-z0)<=dw/2+.25){const top=e+(r-e)*.73,edge=top-.05,crest=top+1.03;y=Math.max(y,home.y+crest+(edge-crest)*Math.abs(p.z-z0)/(dw/2+.25));}
  return {y,kind:'roof',hidden:entry.inside};
 }
 const depth=3+porchExtension,half=home.w*(HOUSE.porchRatio/2+.035);
 if(Math.abs(p.x)<=half&&p.z<=-home.d/2&&p.z>=-home.d/2-depth)return {y:home.y+3.65-.53*(-home.d/2-p.z)/depth+.13,kind:'roof',hidden:entry.mode!=='exterior'};
 const staffDeck=staffBridgeAt(x,z);if(staffDeck)return {y:staffDeck.y,kind:'deck',hidden:false};if(onBridge(x,z))return {y:2.945,kind:'deck',hidden:false};
 const nr=nearRiver(x,z);if(nr.dist<nr.w*.49)return {y:nr.y+.025,kind:'river',hidden:false};const east=eastWaterAt(x,z);if(east.edge<0)return {y:east.y+.025,kind:'river',hidden:false};
 const dh=dogHome,dx=x-dh.x,dz=z-dh.z,lx=dx*Math.cos(dh.angle)-dz*Math.sin(dh.angle),lz=dx*Math.sin(dh.angle)+dz*Math.cos(dh.angle);
 if(Math.abs(lx)<dh.w/2+.55&&Math.abs(lz)<dh.d/2+.65)return {y:dh.y+2.5+dh.w*.26*(1-Math.abs(lx)/(dh.w/2+.55))+.08,kind:'roof',hidden:false};
 return {y:Math.max(surfaceHeight(x,z),renderedTerrainY(x,z))+.025,kind:'ground',hidden:false};
}
const puddleMat=mat('shallow accumulated rainwater','#58747a',.30);puddleMat.alpha=.55;puddleMat.backFaceCulling=false;puddleMat.disableDepthWrite=true;
const puddles=[];
for(let i=0;i<180&&puddles.length<12;i++){
 const x=home.x+(rainRnd()-.5)*46,z=home.z+(rainRnd()-.5)*32,r=.38+rainRnd()*.45;
 if(x<minX+2||x>maxX-2||z<minZ+2||z>maxZ-2||blocked(x,z)||nearRiver(x,z).dist<nearRiver(x,z).w*.6+1||rainSurface(x,z).kind!=='ground'||pathDistance(x,z)<1.65||inWheat(x,z))continue;
 if(puddles.some(p=>Math.hypot(p.x-x,p.z-z)<2.1))continue;
 const y=renderedTerrainY(x,z),pts=[x,y+.035,z],ind=[],norm=[];
 let valid=true;for(let j=0;j<16;j++){const a=j*Math.PI/8,rr=r*(.76+.24*rainRnd()),px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr*.65,py=renderedTerrainY(px,pz);
 if(Math.abs(py-y)>.09||blocked(px,pz)||rainSurface(px,pz).kind!=='ground'){valid=false;break;}pts.push(px,py+.035,pz);ind.push(0,1+j,1+(j+1)%16);}
 if(!valid)continue;
 const mesh=new Mesh('irregular shallow rain puddle',scene),data=new VertexData();data.positions=pts;data.indices=ind;VertexData.ComputeNormals(pts,ind,norm);data.normals=norm;data.applyToMesh(mesh);own(mesh,puddleMat,false);mesh.receiveShadows=false;mesh.setEnabled(false);puddles.push({x,z,mesh});
}
rainStats.puddles=puddles.length;
const wetMaterials=[M.grass,M.earth,M.wood,M.woodLight,ceramicMat,road.material,].filter(Boolean).map(m=>({m,dry:m.diffuseColor.clone(),shine:m.specularColor.clone()}));
let impactCursor=0,wasRaining=false,wetTick=0;
function respawnRain(p,i,initial=false){
 const runoff=i<12;let x,z,y;
 if(runoff){
  const local=home.C((i-5.5)/5.5*home.w*.39,3.17,-home.d/2-(3+porchExtension)-.12);
  x=local.x;z=local.z;y=local.y;
 }else if(i<55){
  const local=home.C((rainRnd()-.5)*home.w*1.1,0,(rainRnd()-.5)*(home.d+5)-1.5);x=local.x;z=local.z;
 }else if(i<95){
  const k=Math.floor(channel.length*(.33+.38*rainRnd())),p=channel[Math.min(k,channel.length-1)].p;x=p.x;z=p.z;
 }else{
  const a=Math.max(1,engine.getRenderWidth()/Math.max(1,engine.getRenderHeight())),w=span,h=span/a;
  x=Math.max(minX+.5,Math.min(maxX-.5,camera.target.x+(rainRnd()-.5)*w));z=Math.max(minZ+.5,Math.min(maxZ-.5,camera.target.z+(rainRnd()-.5)*Math.max(h*1.6,26)));
 }
 p.x=x;p.z=z;p.target=rainSurface(x,z);p.runoff=runoff;p.speed=runoff?7+rainRnd()*3:13+rainRnd()*9;p.radius=.021+rainRnd()*.009;p.length=.075+rainRnd()*.12;
 p.y=runoff?Math.max(p.target.y+.2,y):p.target.y+9+rainRnd()*9;
 if(initial)p.y=p.target.y+(p.y-p.target.y)*rainRnd();
 p.life=1;
}
function updateRain(dt,weather=weatherVisual){
 dt=Math.max(0,Math.min(dt,.10));const raining=!!weather.rain,storm=weather.kind==='storm';
 rainStats.wetness=Math.max(0,Math.min(1,rainStats.wetness+dt*(raining?(storm?.075:.045):-.006)));
 wetTick+=dt;if(wetTick>=.15||raining!==wasRaining){wetTick=0;const w=rainStats.wetness;
  for(const {m,dry,shine} of wetMaterials){m.diffuseColor.set(dry.r*(1-.28*w),dry.g*(1-.23*w),dry.b*(1-.17*w));const gloss=m===M.grass||m===M.earth?0:.055*w;m.specularColor.set(shine.r+gloss,shine.g+gloss,shine.b+gloss);}
  wheatSoil.diffuseColor.set(1-.20*w,1-.20*w,1-.20*w);wheatSoil.specularColor.set(0,0,0);for(const p of puddles){p.mesh.setEnabled(w>.32);p.mesh.visibility=Math.max(0,Math.min(1,(w-.32)/.48));}
 }
 const count=raining?Math.min(rainPool.length,({economico:145,equilibrado:255,alto:340}[quality]||255)+(storm?65:0)):0;
 rainStats.active=count;rainDropMesh.setEnabled(count>0);
 for(let i=0;i<rainPool.length;i++){
  const p=rainPool[i];if(i>=count){p.life=0;rainMatrix(dropMatrices,i,0,0,0,0,0,0);continue;}
  if(!p.life||!wasRaining)respawnRain(p,i,true);
  p.y-=p.speed*dt;
  if(p.y<=p.target.y){
   const k=p.target.kind;if(!p.target.hidden&&!(p.runoff&&entry.mode!=='exterior')){
    const f=impactPool[impactCursor++%impactPool.length];f.life=.52;f.x=p.x;f.z=p.z;f.y=p.target.y+.035;f.kind=k;rainStats.impacts[k]++;if(p.runoff)rainStats.runoff++;
   }
   respawnRain(p,i,false);
  }
  // Invisible roofs still shelter interior/porch; never draw through their cutaway.
  const hidden=p.target.kind==='roof'&&(p.target.hidden||entry.inside&&Math.abs(homeLocal(p.x,p.z).x)<home.w/2)||p.runoff&&entry.mode!=='exterior';
  // Short variable droplets, inclined and displaced by the same wind
  // field. p.x/z are the actual landing coordinates used by the splashes.
  const len=p.runoff?.08:p.length,fall=Math.max(0,p.y-p.target.y),wx=p.runoff?0:worldWind.x*.24/p.speed,wz=p.runoff?0:worldWind.z*.24/p.speed;
  rainMatrix(dropMatrices,i,p.x-wx*fall,p.y,p.z-wz*fall,hidden?0:p.radius,hidden?0:len,hidden?0:p.radius,-wx,-wz);
 }
 let visible=0;
 for(let i=0;i<impactPool.length;i++){
  const p=impactPool[i];p.life=Math.max(0,p.life-dt);const a=1-p.life/.52,alive=p.life>0,hideRoof=p.kind==='roof'&&entry.mode!=='exterior',s=alive&&!hideRoof?(.07+a*(p.kind==='river'?.39:.19)):0;
  if(s)visible++;rainMatrix(ringMatrices,i,p.x,p.y,p.z,s,s*.26,s);
  for(let j=0;j<2;j++){const sign=j?1:-1,b=alive&&!hideRoof&&a<.70?.026*(1-a):0;rainMatrix(splashMatrices,i*2+j,p.x+sign*a*.17,p.y+.18*Math.sin(a*Math.PI),p.z+sign*a*.11,b,b,b);}
 }
 rainRingMesh.setEnabled(visible>0);splashMesh.setEnabled(visible>0);
 if(count||wasRaining)rainDropMesh.thinInstanceBufferUpdated('matrix');if(visible||wasRaining){rainRingMesh.thinInstanceBufferUpdated('matrix');splashMesh.thinInstanceBufferUpdated('matrix');}wasRaining=raining;
}
// The pet interaction uses the same articulated hand as the door, without changing
// camera or locomotion rules. Manual input cancels the action before movement.
let petPlayerActive=false;
function finishPetPlayer(){
 if(!petPlayerActive)return;petPlayerActive=false;releaseHand();
 for(let i=0;i<bodyParts.length;i++){bodyParts[i].position.copyFrom(limbRest[i]);bodyParts[i].rotation.x=0;}
 head.position.set(0,1.5,0);hat.position.set(0,1.72,0);hatTop.position.set(0,1.82,0);
}
function petPlayerPose(target,blend,dt){
 petPlayerActive=true;const dx=target.x-avatar.position.x,dz=target.z-avatar.position.z;
 if(Math.hypot(dx,dz)>.05)avatar.rotation.y+=angleDelta(avatar.rotation.y,Math.atan2(dx,dz))*(1-Math.exp(-dt*16));
 const drop=.25*blend,lean=.20*blend;
 bodyParts[0].position.y=limbRest[0].y-drop;bodyParts[0].rotation.x=lean;
 head.position.y=1.5-drop;hat.position.y=1.72-drop;hatTop.position.y=1.82-drop;
 for(let i=1;i<=2;i++){bodyParts[i].position.y=limbRest[i].y-drop*.40;bodyParts[i].rotation.x=(i===1?.24:-.24)*blend;}
 const shoulderPoint=V(.29,1.19-drop,.08*blend),restPoint=V(.29,.69-drop,0);
 return handPose(target,blend,shoulderPoint,restPoint);
}
// Hoe preparation is one atomic bed operation. The avatar walks to an end,
// then works along the row; the tool and arm move together in 3D.
entity('hoe tool');
const hoeRoot=new Mesh('hoe grip pivot',scene);hoeRoot.parent=avatar;
const HOE_LENGTH=1.24;
const hoeHandle=box('hoe wooden shaft',0,-HOE_LENGTH/2,0,.055,HOE_LENGTH,.055,M.woodLight,0,false);hoeHandle.parent=hoeRoot;
const hoeHead=box('hoe iron blade',0,-HOE_LENGTH,0,.30,.055,.24,M.black,0,false);hoeHead.parent=hoeRoot;hoeRoot.setEnabled(false);
entity('hoe soil effects');const hoeDust=Array.from({length:8},(_,i)=>{const m=sphere('hoe loose soil '+i,0,0,0,.04,.032,.04,M.woodDark,false);m.setEnabled(false);return {m,age:1,x:0,y:0,z:0,dx:0,dz:0};});
function hoeImpact(p){farmAudio.action('hoe');for(let i=0;i<hoeDust.length;i++){const d=hoeDust[i],a=i*2.399;Object.assign(d,{age:0,x:p.x,y:p.y,z:p.z,dx:Math.cos(a)*.36,dz:Math.sin(a)*.36});d.m.setEnabled(true);}}
function tickHoeDust(dt){for(const d of hoeDust){if(!d.m.isEnabled())continue;d.age+=dt;if(d.age>.33){d.m.setEnabled(false);continue;}d.m.position.set(d.x+d.dx*d.age,d.y+.055+Math.sin(d.age/.33*Math.PI)*.16,d.z+d.dz*d.age);}}
function aimHoe(blade,dt){
 avatar.computeWorldMatrix(true);const inv=Matrix.Invert(avatar.getWorldMatrix()),localBlade=Vector3.TransformCoordinates(blade,inv),localShoulder=V(.23,1.13,.13);
 const axis=localShoulder.subtract(localBlade).normalize();const grip=localBlade.add(axis.scale(HOE_LENGTH));
 hoeRoot.position.copyFrom(grip);const up=Vector3.Up(),dot=Vector3.Dot(up,axis),cross=Vector3.Cross(up,axis);
 hoeRoot.rotationQuaternion=dot<-.99999?Quaternion.RotationAxis(Vector3.Right(),Math.PI):new Quaternion(cross.x,cross.y,cross.z,1+dot).normalize();
 const worldGrip=Vector3.TransformCoordinates(grip,avatar.getWorldMatrix());handPose(worldGrip,1,localShoulder,V(.29,.69,0));
 hoeRoot.computeWorldMatrix(true);hoeHead.computeWorldMatrix(true);
 return Vector3.Distance(hoeHead.getAbsolutePosition(),blade);
}
const tillStats={completed:0,cancelled:0,strokes:0,travel:0,sideSamples:0,insideSamples:0,maxBladeError:0,impacts:0};
function commitBed(id,prepared,now=Date.now()){
 const parts=bedPlots.get(id);if(!parts||wheatSaveLocked||parts.some(p=>!['raw','tilled'].includes(wheatStatus(p.id,now))))return false;
 const next=JSON.parse(JSON.stringify(wheatState)),elapsed=worldElapsed(now);
 const oldRank=rank(wheatState.progress.xp);if(prepared&&parts.some(p=>wheatStatus(p.id,now)==='raw'))record(next.progress,'till',{now,key:id});
 for(const p of parts){const d=simulatePlot(next.plots[p.id],elapsed)||{crop:'wheat',soil:newSoil(elapsed)};next.plots[p.id]={...d,state:prepared?'tilled':'raw'};}
 try{localStorage.setItem(WHEAT_SAVE,JSON.stringify(next));}catch{wheatSaveError='Falha ao salvar. Nenhuma alteração aplicada.';return false;}
 wheatState=next;farmCache.clear();wheatVisualKey='';updateWheat(now,true);progressNotice(oldRank);return true;
}
function beginTill(id){
 const p=farmPlotById.get(id),bed=farmBedById.get(p?.bedId);
 if(!bed||tillWork||wheatSaveLocked||wheatStatus(id)!=='raw'||bedPlots.get(bed.id).some(p=>!['raw','tilled'].includes(wheatStatus(p.id))))return false;
 const dir=avatar.position.x<(bed.x1+bed.x2)/2?1:-1,start=dir===1?bed.x1+.18:bed.x2-.18,end=dir===1?bed.x2-.18:bed.x1+.18;
 const sides=[bed.z1-.30,bed.z2+.30].sort((a,b)=>Math.abs(a-avatar.position.z)-Math.abs(b-avatar.position.z));
 const z=sides.find(z=>Array.from({length:30},(_,i)=>start+(end-start)*i/29).every(x=>!blocked(x,z)));
 if(z===undefined)return false;
 cancelInput();tillWork={bed,dir,start,end,z,phase:'exit',elapsed:0,progress:0,lastStroke:-1};hoeRoot.setEnabled(true);updateWheat(Date.now(),true);return true;
}
function endTill(done){
 const w=tillWork;if(!w)return;tillWork=null;hoeRoot.setEnabled(false);releaseHand();
 bodyParts[0].rotation.x=0;walkPose(0,.05);
 if(done&&commitBed(w.bed.id,true)){tillStats.completed++;}
 else{tillStats.cancelled++;wheatVisualKey='';updateWheat(Date.now(),true);}
}
function tickTill(dt){
 tickHoeDust(dt);const w=tillWork;if(!w)return;
 dt=Math.min(.05,Math.max(0,dt));w.elapsed+=dt;
 const x=w.phase==='exit'?avatar.position.x:w.phase==='approach'?w.start:w.end,dx=x-avatar.position.x,dz=w.z-avatar.position.z,dd=Math.hypot(dx,dz);
 if(dd>.045){const k=Math.min(1,(w.phase==='work'?2.7:4.0)*dt/dd),m=moveAvatar(dx*k,dz*k,dt);tillStats.travel+=m;}
 else if(w.phase==='exit'){w.phase='approach';w.elapsed=0;}
 else if(w.phase==='approach'){w.phase='work';w.elapsed=0;}
 else{endTill(true);return;}
 if(w.elapsed>12){endTill(false);return;}
 if(w.phase==='work'){
  const side=w.z<w.bed.z1?1:-1,face=side>0?0:Math.PI;
  avatar.rotation.y=face;const swing=(1-Math.cos(w.elapsed*2*Math.PI*3))/2;
  const bx=Math.max(w.bed.x1+.12,Math.min(w.bed.x2-.12,avatar.position.x+.08*w.dir)),bz=(w.bed.z1+w.bed.z2)/2;
  const groundY=Math.max(height(bx,bz),renderedTerrainY(bx,bz))+.028;
  const blade=V(bx,groundY+.065+.48*(1-swing),bz-side*.22*(1-swing));
  tillStats.maxBladeError=Math.max(tillStats.maxBladeError,aimHoe(blade,dt));bodyParts[0].rotation.x=.18*swing;
  tillStats.sideSamples++;if(avatar.position.z>w.bed.z1&&avatar.position.z<w.bed.z2)tillStats.insideSamples++;
  w.progress=Math.max(w.progress,Math.min(1,Math.abs(avatar.position.x-w.start)/Math.abs(w.end-w.start)));
  const stroke=Math.floor(w.elapsed*3);if(swing>.92&&stroke!==w.lastStroke){w.lastStroke=stroke;tillStats.strokes++;hoeImpact(blade);tillStats.impacts++;}
  for(const p of bedPlots.get(w.bed.id)){const passed=w.dir===1?p.x<=avatar.position.x+.55:p.x>=avatar.position.x-.55;if(passed){const m=moundState.get(p.id);if(m)m.target=.15;}}
 }else{hoeRoot.rotationQuaternion=null;hoeRoot.position.set(.29,.98,.24);hoeRoot.rotation.x=-.38;avatar.computeWorldMatrix(true);handPose(Vector3.TransformCoordinates(hoeRoot.position,avatar.getWorldMatrix()),1);}
}
// Persistent construction inventory and independent item controls.
const BUILD_SAVE='cv.build.v1',buildDefaults=()=>({version:1,stock:12,next:1,removed:[],placed:[]});
let buildData=buildDefaults(),buildError='';
try{const raw=JSON.parse(localStorage.getItem(BUILD_SAVE)||'null');if(raw){
 if(raw.version!==1||!Number.isSafeInteger(raw.stock)||raw.stock<0||raw.stock>10000||!Number.isSafeInteger(raw.next)||raw.next<1||!Array.isArray(raw.removed)||!Array.isArray(raw.placed)||raw.placed.length>250||raw.removed.some(id=>typeof id!=='string'||!editableFences.has(id))||new Set(raw.removed).size!==raw.removed.length||new Set(raw.placed.map(p=>p.id)).size!==raw.placed.length||raw.placed.some(p=>!/^custom-[0-9]+$/.test(p.id)||!Array.isArray(p.a)||!Array.isArray(p.b)||p.a.length!==2||p.b.length!==2||![...p.a,...p.b].every(Number.isFinite)||[p.a,p.b].some(v=>v[0]<minX+1||v[0]>maxX-1||v[1]<minZ+1||v[1]>maxZ-1)||Math.abs(Math.hypot(p.a[0]-p.b[0],p.a[1]-p.b[1])-1.8)>.65))throw Error('invalid build save');if(raw.warehouse!=null&&!validWarehousePlacement(raw.warehouse,{minX,maxX,minZ,maxZ}))throw Error('invalid warehouse placement');buildData=raw;
 }}catch{buildError='Inventário de construção indisponível; save protegido.';}
if(craftRecoveryError)buildError=craftRecoveryError;
function eraseFence(id){const p=editableFences.get(id);if(!p)return false;for(const m of p.meshes){shadow.removeShadowCaster(m,false);m.dispose(false,false);}
 groups['residence fence']=groups['residence fence'].filter(m=>!p.meshes.includes(m));
 for(const list of [fenceColliders,residenceRails,bridgeFenceLinks,fieldRails]){const i=list.indexOf(p.collider);if(i>=0)list.splice(i,1);}
 editableFences.delete(id);return true;}
const groundPoint=(x,z)=>V(x,height(x,z),z);
for(const id of buildData.removed)eraseFence(id);
for(const p of buildData.placed)fencePiece(p.id,groundPoint(...p.a),groundPoint(...p.b),'custom');
function saveBuild(next){if(buildError)return false;try{localStorage.setItem(BUILD_SAVE,JSON.stringify(next));buildData=next;return true;}catch{buildError='Falha ao salvar construção.';return false;}}
const build={open:false,species:'chicken',kind:'fence',mode:'place',x:0,z:0,angle:0,anchor:null,selected:null,work:null,pointer:null};
const buildStats={placed:0,removed:0,hammerStrokes:0};
entity('construction preview');const ghostMat=mat('construction valid','#b89a63'),badMat=mat('construction invalid','#ce6a58');for(const m of [ghostMat,badMat]){m.alpha=.58;m.disableLighting=true;m.emissiveColor=m.diffuseColor.scale(.45);}
const ghost=Array.from({length:4},(_,i)=>box('fence placement preview '+i,0,0,0,i<2?.20:1.8,i<2?1.22:.13,.13,ghostMat,0,false));for(const m of ghost){m.receiveShadows=false;m.setEnabled(false);}
const warehouseGhost=[box('warehouse footprint preview',0,0,0,WAREHOUSE_SIZE.hx*2,.10,WAREHOUSE_SIZE.hz*2,ghostMat,0,false),box('warehouse body preview',0,0,0,2.9,2.3,2.1,ghostMat,0,false)];for(const m of warehouseGhost){m.receiveShadows=false;m.setEnabled(false);}
const penGhost=box('animal habitat placement preview',0,0,0,10,.10,10,ghostMat,0,false);penGhost.setEnabled(false);penGhost.receiveShadows=false;
const penChooser=document.createElement('select');penChooser.id='build-animal-species';penChooser.setAttribute('aria-label','Construir recinto adicional');penChooser.style.cssText='max-width:100%;margin:4px 0;background:#304b35;color:#f5e7be;border:1px solid #c1ce9d;border-radius:6px;padding:5px';penChooser.append(new Option('Recintos adicionais…',''));for(const [id,p] of Object.entries(SPECIES))penChooser.append(new Option(p.icon+' '+p.name,id));$('build-panel').append(penChooser);penChooser.onchange=()=>{if(!penChooser.value){openBuild();return;}build.kind='animal-pen';build.species=penChooser.value;build.anchor=null;build.x=avatar.position.x+Math.cos(camera.alpha)*7.5;build.z=avatar.position.z+Math.sin(camera.alpha)*7.5;refreshBuild();};
entity('construction tools');const hammerRoot=new Mesh('hammer grip',scene);hammerRoot.parent=avatar;
const hammerShaft=box('hammer shaft',0,.22,0,.045,.44,.045,M.woodLight,0,false);hammerShaft.parent=hammerRoot;
const hammerHead=box('hammer head',0,.46,0,.23,.10,.10,M.black,0,false);hammerHead.parent=hammerRoot;hammerRoot.setEnabled(false);
function buildEnds(){
 const dx=Math.cos(build.angle)*.90,dz=Math.sin(build.angle)*.90;
 if(build.mode==='place'&&build.anchor){const a=build.anchor.clone();return [a,groundPoint(a.x+2*dx,a.z+2*dz)];}
 let a=groundPoint(build.x-dx,build.z-dz),b=groundPoint(build.x+dx,build.z+dz);
 // Snap one endpoint to existing posts; retain exact length and angle.
 let best=null,dd=.45;for(const p of editableFences.values())for(const e of [p.a,p.b])for(const [i,v] of [[0,a],[1,b]]){const d=Math.hypot(e.x-v.x,e.z-v.z);if(d<dd){best={e,i};dd=d;}}
 if(best){if(best.i===0){a=best.e.clone();b=groundPoint(a.x+2*dx,a.z+2*dz);}else{b=best.e.clone();a=groundPoint(b.x-2*dx,b.z-2*dz);}}
 return [a,b];
}
function canBuild(a,b){
 if(Math.abs(a.y-b.y)>.70)return false;
 for(let i=0;i<=18;i++){
  const p=Vector3.Lerp(a,b,i/18);if(livestockReserved(p.x,p.z)||!landBuildAllowed(p.x,p.z)||blocked(p.x,p.z,false,null,true)||onBridge(p.x,p.z)||petBodyBlocked(p.x,p.z)||Math.hypot(p.x-avatar.position.x,p.z-avatar.position.z)<.48)return false;
  for(const [u,v] of fenceColliders){if(segDist(p.x,p.z,u,v)<.22){const endpoint=[a,b].some(e=>Math.hypot(e.x-p.x,e.z-p.z)<.30)&&[u,v].some(e=>Math.hypot(e.x-p.x,e.z-p.z)<.30);if(!endpoint)return false;}}
 }
 return true;
}
function selectFence(){let best=null,d=.9;for(const p of editableFences.values()){const n=segDist(build.x,build.z,p.a,p.b);if(n<d){d=n;best=p;}}return best;}
function refreshBuild(){
 const panel=$('build-panel'),warehouseMode=build.kind==='warehouse',penMode=build.kind==='animal-pen';panel.hidden=!build.open;penChooser.value=penMode?build.species:'';penGhost.setEnabled(build.open&&penMode);for(const m of ghost)m.setEnabled(build.open&&!warehouseMode&&!penMode);for(const m of warehouseGhost)m.setEnabled(build.open&&warehouseMode);$('build-title').textContent=warehouseMode?'Construção · Armazém':'Construção · Cercas';$('build-remove').hidden=warehouseMode||penMode;$('build-place').hidden=warehouseMode||penMode;if(!build.open)return;
 if(penMode){const ok=canPlaceExtraPen(build.species,build.x,build.z)&&!wheatSaveLocked,z=ZONES.find(q=>q.species===build.species);penGhost.position.set(build.x,surfaceHeight(build.x,build.z)+.15,build.z);penGhost.material=ok?ghostMat:badMat;$('build-title').textContent='Construção · '+z.name;$('build-stock').textContent=z.cost[0]+' madeira · '+z.cost[1]+' pedra · '+wheatState.extraPens.length+'/'+MAX_EXTRA_PENS+' adicionais';$('build-hint').textContent=ok?'Local livre · confirme o recinto':'Sem materiais, área ocupada ou desnível';$('build-confirm').textContent='Construir recinto';$('build-confirm').disabled=!ok;$('build-detach').hidden=true;return;}
 if(warehouseMode){const p=warehouseCandidate(),ok=!buildError&&!buildData.warehouse&&canPlaceWarehouse(p),y=height(p.x,p.z);warehouseGhost.forEach((m,i)=>{m.position.set(p.x,y+(i?1.25:.12),p.z);m.rotation.y=p.yaw;m.material=ok?ghostMat:badMat;});$('build-stock').textContent='Armazém único · projeto experimental sem custo';$('build-hint').textContent=buildError||(buildData.warehouse?'Armazém já construído.':ok?'Posição livre · confirme para construir':'Terreno ocupado, desnível ou passagem bloqueada');$('build-confirm').textContent='Construir';$('build-confirm').disabled=!ok;$('build-detach').hidden=true;return;}
 let [a,b]=buildEnds();const target=build.mode==='remove'?selectFence():null;build.selected=target?.id??null;
 if(target){a=target.a;b=target.b;}
 const ok=build.mode==='place'?buildData.stock>0&&canBuild(a,b):!!target&&segDist(avatar.position.x,avatar.position.z,a,b)<1.8;
 const m=ok?ghostMat:badMat,center=a.add(b).scale(.5);if(build.mode==='place'&&build.anchor){build.x=center.x;build.z=center.z;}$('build-detach').hidden=!build.anchor||build.mode!=='place';const yaw=Math.atan2(b.z-a.z,b.x-a.x),length=Math.hypot(b.x-a.x,b.z-a.z);
 for(let i=0;i<4;i++){const g=ghost[i];g.material=m;if(i<2){const p=i===0?a:b;g.position.set(p.x,p.y+.61,p.z);g.scaling.set(1,1,1);}else{g.position.set(center.x,center.y+(i===2?.40:.89),center.z);g.rotation.y=-yaw;g.scaling.x=length/1.8;}}
 $('build-stock').textContent='Cercas no inventário: '+buildData.stock;
 $('build-hint').textContent=buildError||(build.work?'Retirando os pregos…':build.mode==='place'?(ok?'Posição livre · encaixe automático':'Obstáculo físico, desnível ou sem peças'):(ok?'Peça selecionada · retirar com martelo':'Aproxime-se e selecione a cerca'));
 $('build-confirm').textContent=build.mode==='place'?'Colocar':'Retirar';
 $('build-confirm').disabled=!ok||!!buildError||!!build.work;
 $('build-place').setAttribute('aria-pressed',String(build.mode==='place'));$('build-remove').setAttribute('aria-pressed',String(build.mode==='remove'));
}
function openBuild(){build.kind='fence';if(tillWork||entry.action||seating.phase!=='idle')return false;cancelInput();playerMenu.hidden=true;build.open=true;buildModeActive=true;build.mode='place';build.anchor=null;closeToolArc();build.x=avatar.position.x+Math.cos(camera.alpha)*1.6;build.z=avatar.position.z+Math.sin(camera.alpha)*1.6;build.angle=0;$('build-angle').value='0';refreshBuild();return true;}
function openWarehouseBuild(){if(buildData.warehouse||!openBuild())return false;build.kind='warehouse';build.anchor=null;build.x=avatar.position.x+Math.cos(camera.alpha)*3.2;build.z=avatar.position.z+Math.sin(camera.alpha)*3.2;refreshBuild();return true;}
function closeBuild(){if(build.pointer!==null){const id=build.pointer;build.pointer=null;try{canvas.releasePointerCapture(id);}catch{}}build.open=false;buildModeActive=false;build.anchor=null;build.work=null;hammerRoot.setEnabled(false);releaseHand();refreshBuild();}
function nudgeBuild(x,z){build.anchor=null;const a=camera.alpha+Math.PI/2;build.x+=(x*Math.cos(a)-z*Math.sin(a))*.35;build.z+=(x*Math.sin(a)+z*Math.cos(a))*.35;refreshBuild();}
function placeBuild(){if(build.kind==='animal-pen')return placeExtraPen();if(build.kind==='warehouse')return placeWarehouse();const [a,b]=buildEnds();if(!build.open||build.mode!=='place'||buildData.stock<=0||buildData.placed.length>=250||!canBuild(a,b))return false;const next=JSON.parse(JSON.stringify(buildData)),id='custom-'+next.next++;next.stock--;next.placed.push({id,a:[a.x,a.z],b:[b.x,b.z]});if(!saveBuild(next))return false;fencePiece(id,a,b,'custom');build.anchor=b.clone();build.x=b.x+Math.cos(build.angle)*.9;build.z=b.z+Math.sin(build.angle)*.9;buildStats.placed++;progressEvent('build',{key:id});shadowMap.resetRefreshCounter();refreshBuild();return true;}
function removeBuild(id){const p=editableFences.get(id);if(!p||segDist(avatar.position.x,avatar.position.z,p.a,p.b)>=1.8||buildData.stock>=10000)return false;
 const next=JSON.parse(JSON.stringify(buildData));if(p.kind==='custom')next.placed=next.placed.filter(v=>v.id!==id);else next.removed.push(id);next.stock++;if(!saveBuild(next))return false;eraseFence(id);buildStats.removed++;shadowMap.resetRefreshCounter();refreshBuild();return true;}
function confirmBuild(){if(build.mode==='place')return placeBuild();const p=selectFence();if(!p||build.work||segDist(avatar.position.x,avatar.position.z,p.a,p.b)>=1.8)return false;build.work={id:p.id,elapsed:0,stroke:-1};hammerRoot.setEnabled(true);refreshBuild();return true;}
function tickBuild(dt,moving=false){
 if(!build.open&&!build.work)return;
 if(build.work){const p=editableFences.get(build.work.id);if(moving||!p||segDist(avatar.position.x,avatar.position.z,p.a,p.b)>=1.8){build.work=null;hammerRoot.setEnabled(false);releaseHand();}
 else{const w=build.work;w.elapsed+=dt;const target=p.a.add(p.b).scale(.5),dx=target.x-avatar.position.x,dz=target.z-avatar.position.z;avatar.rotation.y=Math.atan2(dx,dz);hammerRoot.position.set(.29,.98,.26);hammerRoot.rotation.x=-.7+Math.sin(w.elapsed*19)*.55;avatar.computeWorldMatrix(true);handPose(Vector3.TransformCoordinates(hammerRoot.position,avatar.getWorldMatrix()),1);const stroke=Math.floor(w.elapsed*3);if(stroke!==w.stroke){w.stroke=stroke;buildStats.hammerStrokes++;farmAudio.action('hammer');}if(w.elapsed>=1.05){if(w.action==='repair'||w.action==='paint')maintainFence(w.id,w.action);else removeBuild(w.id);build.work=null;hammerRoot.setEnabled(false);releaseHand();}}
 }
 refreshBuild();
}
$('build-open').onclick=openBuild;$('build-close').onclick=closeBuild;
const toolBar=$('tool-bar'),toolArc=$('tool-arc');
const equipmentStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};let activeTool=equippedTool(equipmentStorage);
function selectTool(id){if(!equipTool(equipmentStorage,id))return false;activeTool=id;syncToolBar();return true;}
let toolsCollapsed=false,toolHintTimer;
try{toolsCollapsed=localStorage.getItem('cv.toolBar.v1')==='collapsed';}catch{}
function closeToolArc(){toolArc.hidden=true;$('tool-build').setAttribute('aria-expanded','false');}
function syncToolBar(){$('tool-items').hidden=toolsCollapsed;$('tool-toggle').textContent=toolsCollapsed?'•':'⌄';$('tool-toggle').setAttribute('aria-expanded',String(!toolsCollapsed));if(toolsCollapsed)closeToolArc();for(const [id,button] of [['hammer','tool-build'],['hoe','tool-hoe'],['water','tool-water']])$(button).setAttribute('aria-pressed',String(activeTool===id));}
$('tool-toggle').onclick=()=>{toolsCollapsed=!toolsCollapsed;try{localStorage.setItem('cv.toolBar.v1',toolsCollapsed?'collapsed':'expanded');}catch{}syncToolBar();};
$('tool-build').onclick=()=>{selectTool('hammer');toolArc.hidden=!toolArc.hidden;$('tool-build').setAttribute('aria-expanded',String(!toolArc.hidden));layoutContextActions();};
$('tool-fence').onclick=openBuild;$('tool-warehouse').onclick=openWarehouseBuild;
$('tool-seeds').onclick=()=>{closeToolArc();openInventory();};
$('tool-hoe').onclick=()=>{selectTool('hoe');closeToolArc();if(nearestWheat()){$('wheat-expand').click();}else{$('tool-hint').textContent='Aproxime-se de um canteiro para arar.';clearTimeout(toolHintTimer);toolHintTimer=setTimeout(()=>$('tool-hint').textContent='',2200);}};
$('tool-water').onclick=()=>{selectTool('water');closeToolArc();const p=nearestWheat();if(p){$('wheat-expand').click();if(!applyWheatAction('water',p.id))$('tool-hint').textContent='Canteiro não precisa de rega agora.';}else $('tool-hint').textContent='Aproxime-se de um canteiro para regar.';clearTimeout(toolHintTimer);toolHintTimer=setTimeout(()=>$('tool-hint').textContent='',2200);};
syncToolBar();
function syncToolVisibility(){$('tool-warehouse').disabled=!!buildData.warehouse||!!buildError;const hide=build.open||!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden||!gardenPanel.hidden||!$('pet-panel').hidden||!$('ranch-panel').hidden||inventoryDialog.open||progressDialog.open||ruralDialog.open||!wheatPanel.hidden;toolBar.hidden=hide;if(hide)closeToolArc();}

$('build-place').onclick=()=>{build.mode='place';build.anchor=null;refreshBuild();};$('build-remove').onclick=()=>{build.mode='remove';build.anchor=null;refreshBuild();};$('build-detach').onclick=()=>{build.anchor=null;refreshBuild();};
$('build-rotate').onclick=()=>{build.angle=(build.angle+Math.PI/12)%(2*Math.PI);$('build-angle').value=String(Math.round(build.angle*180/Math.PI)%360);refreshBuild();};$('build-angle').oninput=e=>{build.angle=Number(e.target.value)*Math.PI/180;refreshBuild();};
$('build-confirm').onclick=confirmBuild;
for(const [id,x,z] of [['build-up',0,1],['build-down',0,-1],['build-left',-1,0],['build-right',1,0]])$(id).onclick=()=>nudgeBuild(x,z);
// Right-side gesture moves the object on the terrain independently of the joystick.
function buildPoint(clientX,clientY){
 const rect=canvas.getBoundingClientRect(),w=engine.getRenderWidth(),h=engine.getRenderHeight(),x=(clientX-rect.left)*w/rect.width,y=(clientY-rect.top)*h/rect.height;
 const unproject=z=>Vector3.Unproject(V(x,y,z),w,h,Matrix.Identity(),scene.getViewMatrix(),scene.getProjectionMatrix());
 const a=unproject(0),b=unproject(1),d=b.subtract(a);if(Math.abs(d.y)<1e-6)return null;
 let level=2.65,pos=null;for(let i=0;i<5;i++){pos=a.add(d.scale((level-a.y)/d.y));level=height(pos.x,pos.z);}
 return pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z)?pos:null;
}
function moveBuildTouch(e){if(!build.open||build.pointer!==e.pointerId)return;const v=buildPoint(e.clientX,e.clientY);if(v){build.anchor=null;build.x=v.x;build.z=v.z;refreshBuild();}e.preventDefault();}
canvas.addEventListener('pointerdown',e=>{if(!build.open||build.work||build.pointer!==null||e.button!==0||e.clientX<innerWidth*.48)return;build.pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);moveBuildTouch(e);});
canvas.addEventListener('pointermove',moveBuildTouch);for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===build.pointer)build.pointer=null;});
const FENCE_CARE='cv.fenceCare.v1',careDefault=()=>({version:1,items:{},exposure:0,last:worldElapsed()});
let fenceCare=careDefault(),fenceCareError='',lastCareRefresh=-Infinity;
try{const raw=JSON.parse(localStorage.getItem(FENCE_CARE)||'null');if(raw){if(raw.version!==1||!Number.isFinite(raw.exposure)||raw.exposure<0||!Number.isFinite(raw.last)||raw.last<0||!raw.items||typeof raw.items!=='object'||Object.values(raw.items).some(v=>!v||!Number.isFinite(v.at)||v.at<0||v.at>raw.exposure||!Number.isInteger(v.paint)||v.paint<0||v.paint>3||['post','rail'].some(k=>v[k]!==undefined&&(!Number.isInteger(v[k])||v[k]<0||v[k]>3))))throw Error('invalid');fenceCare=raw;}}catch{fenceCareError='Manutenção indisponível: dados protegidos.';}
const woodColors=['#a6814e','#e0d6bc','#738b5d','#925a42'],woodNames=['Natural','Branco','Verde','Terracota'],fenceMaterials=new Map();
const fenceYear=REAL_MS_PER_GAME_MINUTE*60*24*DAYS_PER_MONTH*12;
function accrueFence(now=worldElapsed()){
 if(now<=fenceCare.last||fenceCareError)return;const span=now-fenceCare.last,n=Math.min(96,Math.max(1,Math.ceil(span/WEATHER_INTERVAL)));let exposure=0;
 for(let i=0;i<n;i++){const w=weatherAt(fenceCare.last+span*(i+.5)/n);exposure+=span/n*(w.rain?2.2:1);}fenceCare.exposure+=exposure;fenceCare.last=now;
}
function fenceCondition(id){const a=fenceCare.items[id];return Math.max(.15,1-(fenceCare.exposure-(a?.at??0))/(fenceYear*3));}
function fenceLook(piece){
 const item=fenceCare.items[piece.id],post=item?.post??item?.paint??0,rail=item?.rail??item?.paint??0,step=Math.min(3,Math.floor((1-fenceCondition(piece.id))*4)),key=post+':'+rail+':'+step;if(piece.look===key)return;piece.look=key;
 if(!piece.originalMaterials)piece.originalMaterials=piece.meshes.map(m=>m.material);
 for(let i=0;i<piece.meshes.length;i++){const mesh=piece.meshes[i],source=piece.originalMaterials[i],role=mesh.metadata?.fenceRole||'post',paint=role==='rail'?rail:post;if(!paint&&!step){mesh.material=source;continue;}const k=paint+':'+step+':'+role;let material=fenceMaterials.get(k);if(!material){material=mat('fence finish '+k,woodColors[paint]);material.alpha=1;material.backFaceCulling=false;material.diffuseColor.scaleInPlace((role==='post'?.80:1)*(1-step*.13));material.maxSimultaneousLights=8;fenceMaterials.set(k,material);}mesh.material=material;}
}
function saveFenceCare(){if(fenceCareError)return false;try{localStorage.setItem(FENCE_CARE,JSON.stringify(fenceCare));return true;}catch{fenceCareError='Falha ao salvar manutenção.';return false;}}
function maintainFence(id,action){
 const piece=editableFences.get(id);if(!piece||fenceCareError||segDist(avatar.position.x,avatar.position.z,piece.a,piece.b)>=1.8)return false;
 accrueFence();const previous=fenceCare.items[id],old=previous||{at:0,paint:0},next={...old};
 if(action==='repair')next.at=fenceCare.exposure;else if(action==='paint'){next.paint=(old.paint+1)%woodColors.length;delete next.post;delete next.rail;}else return false;
 fenceCare.items[id]=next;if(!saveFenceCare()){if(previous)fenceCare.items[id]=previous;else delete fenceCare.items[id];return false;}fenceLook(piece);return true;
}
function nearbyFence(){let piece=null,d=1.8;for(const p of editableFences.values()){const n=segDist(avatar.position.x,avatar.position.z,p.a,p.b);if(n<d){piece=p;d=n;}}return piece;}
let nearFence=null,contextClock=0;
function startFenceCare(action){const piece=nearbyFence();if(!piece||build.work||build.open||tillWork||entry.action||seating.phase!=='idle')return false;cancelInput();build.work={id:piece.id,action,elapsed:0,stroke:-1};hammerRoot.setEnabled(true);return true;}
for(const [id,action] of [['fence-repair','repair'],['fence-take','remove']])$(id).onclick=()=>startFenceCare(action);
let paintTarget=null,paintRole='both';
function closePaint(){paintTarget=null;$('fence-colors').hidden=true;}
function paintFence(id,role,color){const piece=editableFences.get(id);if(!piece||!['both','post','rail'].includes(role)||!Number.isInteger(color)||color<0||color>3||fenceCareError||segDist(avatar.position.x,avatar.position.z,piece.a,piece.b)>=1.8)return false;accrueFence();const prev=fenceCare.items[id],old=prev||{at:0,paint:0},next={...old};if(role==='both'){next.paint=color;delete next.post;delete next.rail;}else next[role]=color;fenceCare.items[id]=next;if(!saveFenceCare()){if(prev)fenceCare.items[id]=prev;else delete fenceCare.items[id];return false;}fenceLook(piece);if(JSON.stringify(old)!==JSON.stringify(next))progressEvent('paint',{key:id});shadowMap.resetRefreshCounter();return true;}
$('fence-paint').onclick=()=>{const piece=nearbyFence();if(!piece)return;if(paintTarget===piece.id){closePaint();return;}paintTarget=piece.id;paintRole='both';$('fence-colors').hidden=false;for(const b of $('fence-colors').querySelectorAll('[data-role]'))b.setAttribute('aria-pressed',String(b.dataset.role===paintRole));layoutContextActions();};
for(const b of $('fence-colors').querySelectorAll('[data-role]'))b.onclick=()=>{paintRole=b.dataset.role;for(const x of $('fence-colors').querySelectorAll('[data-role]'))x.setAttribute('aria-pressed',String(x===b));};
for(const b of $('fence-colors').querySelectorAll('[data-paint]'))b.onclick=()=>{if(paintTarget&&paintFence(paintTarget,paintRole,Number(b.dataset.paint))){$('fence-paint-status').textContent='Cor aplicada';}};
$('fence-paint-close').onclick=closePaint;
const gates=[];entity('bridge gates');
for(const [index,center] of [bridgeExit.add(bridgeAxis.scale(1.25))].entries()){
 const gate={id:'gate-'+index,center:center.clone(),open:1,target:1,leaves:[]};
 for(const side of [-1,1]){const hinge=center.add(bridgeSide.scale(side*1.48));hinge.y=height(hinge.x,hinge.z);const root=new Mesh('gate hinge '+index+' '+side,scene);root.position.copyFrom(hinge);
 const closed=Math.atan2(side*bridgeSide.z,-side*bridgeSide.x);
 for(const y of [.35,.80]){const m=box('gate horizontal rail',.72,y,0,1.44,.13,.12,M.woodLight);m.parent=root;}
 for(const x of [.09,1.35]){const m=box('gate vertical stile',x,.57,0,.14,1.14,.14,M.woodDark);m.parent=root;}
 const diagonal=box('gate diagonal brace',.72,.57,0,1.57,.10,.11,M.woodLight);diagonal.rotation.z=.63;diagonal.parent=root;const inward=Vector3.Dot(V(Math.cos(closed+Math.PI/2),0,-Math.sin(closed+Math.PI/2)),bridgeAxis)>0?1:-1;gate.leaves.push({root,hinge,closed,side:inward});}gates.push(gate);
}
function gatePose(g){for(const leaf of g.leaves){leaf.root.rotation.y=leaf.closed+leaf.side*g.open*Math.PI/2;leaf.root.computeWorldMatrix(true);}}
for(const g of gates)gatePose(g);
gateBlocked=(x,z,from)=>gates.some(g=>g.leaves.some(l=>{const a=l.hinge,b=V(a.x+Math.cos(l.root.rotation.y)*1.44,a.y,a.z-Math.sin(l.root.rotation.y)*1.44);return obstacleEntered(segDist(x,z,a,b)-.20,from?segDist(from.x,from.z,a,b)-.20:null);}));
function nearGate(){return gates.filter(g=>Math.hypot(avatar.position.x-g.center.x,avatar.position.z-g.center.z)<2.1).sort((a,b)=>Math.hypot(avatar.position.x-a.center.x,avatar.position.z-a.center.z)-Math.hypot(avatar.position.x-b.center.x,avatar.position.z-b.center.z))[0]||null;}
let gateWork=null;
function toggleGate(g=nearGate()){if(!g||gateWork||build.work||build.open||Math.hypot(avatar.position.x-g.center.x,avatar.position.z-g.center.z)>2.1||entry.action||tillWork)return false;const closing=g.open>.5;if(closing&&Math.abs(Vector3.Dot(avatar.position.subtract(g.center),bridgeAxis))<.55)return false;cancelInput();g.target=closing?0:1;gateWork=g;return true;}
function tickGates(dt,moving){
 if(!gateWork)return;const g=gateWork;if(moving)g.target=g.open>=.5?1:0;const delta=g.target-g.open;g.open+=Math.sign(delta)*Math.min(Math.abs(delta),dt*1.25);gatePose(g);shadow.getShadowMap().resetRefreshCounter();
 const l=g.leaves.reduce((a,b)=>Math.hypot(avatar.position.x-a.hinge.x,avatar.position.z-a.hinge.z)<Math.hypot(avatar.position.x-b.hinge.x,avatar.position.z-b.hinge.z)?a:b),hand=V(l.hinge.x+Math.cos(l.root.rotation.y)*1.20,l.hinge.y+.80,l.hinge.z-Math.sin(l.root.rotation.y)*1.20);
 if(!moving&&Math.hypot(hand.x-avatar.position.x,hand.z-avatar.position.z)<1.0){avatar.rotation.y=Math.atan2(hand.x-avatar.position.x,hand.z-avatar.position.z);handPose(hand,.85);}
 if(Math.abs(g.target-g.open)<1e-5){gateWork=null;releaseHand();}
}
const RANCH_KEY='cv.ranch.v1';let ranchName='Meu Rancho',ranchLocked=false;
try{const raw=localStorage.getItem(RANCH_KEY);if(raw!==null){const v=JSON.parse(raw);if(typeof v.name!=='string'||!v.name.trim()||v.name.length>32)throw Error('invalid');ranchName=v.name;}}catch{ranchLocked=true;}
entity('ranch arch');const arch=bridgeExit.add(bridgeAxis.scale(1.25));arch.y=height(arch.x,arch.z);const archAngle=Math.atan2(bridgeAxis.x,bridgeAxis.z);
for(const k of [-1,1]){const v=arch.add(bridgeSide.scale(k*1.95));box('ranch arch post',v.x,arch.y+1.95,v.z,.30,3.9,.30,M.woodDark,archAngle);worldFixtures.push({id:'ranch-arch-'+k,x:v.x,z:v.z,hx:.13,hz:.13});}
// Crossbeam is fixed, while the board and both text faces share a top hinge.
box('ranch fixed crossbeam',arch.x,arch.y+3.71,arch.z,4.10,.24,.30,M.woodDark,archAngle);
entity('ranch sign moving');const signSupport=new Mesh('ranch sign support',scene);signSupport.position=V(arch.x,arch.y+3.54,arch.z);signSupport.rotation.y=archAngle;
const signPivot=new Mesh('ranch sign hanging hinge',scene);signPivot.parent=signSupport;
const ranchRopes=[];const ropeMat=mat('natural twisted hemp','#d9bb87');
for(const x of [-1.36,1.36]){const rope=cyl('visible hemp suspension rope',x,-.25,0,.052,.50,ropeMat);rope.parent=signPivot;ranchRopes.push(rope);for(let i=0;i<7;i++){const knot=MeshBuilder.CreateTorus('hemp rope twist',{diameter:.115,thickness:.018,tessellation:8},scene);knot.position=V(x,-.035-i*.068,0);knot.parent=signPivot;own(knot,ropeMat,false);}}
const nameBoard=box('ranch hanging name board',0,-.82,0,3.48,.64,.15,M.woodLight);nameBoard.parent=signPivot;
for(const x of [-1.36,1.36]){const knot=sphere('rope tie at sign',x,-.51,0,.085,.09,.085,ropeMat,false);knot.parent=signPivot;}
entity('ranch arch');
for(const k of [-1,1]){const v=arch.add(bridgeAxis.scale(k*.38)),roof=box('ranch arch roof',v.x,arch.y+3.98,v.z,4.42,.14,.89,M.roof,archAngle);roof.rotation.x=k*.29;}
const ranchTex=new DynamicTexture('ranch personalized sign',{width:512,height:96},scene,true),ranchMat=mat('ranch name sign','#ffffff');ranchMat.diffuseTexture=ranchTex;ranchMat.backFaceCulling=false;ranchMat.emissiveColor=new Color3(.12,.10,.06);
entity('ranch sign moving');
for(const k of [-1,1]){const plane=MeshBuilder.CreatePlane('ranch name face',{width:3.36,height:.56},scene);plane.parent=signPivot;plane.position=V(0,-.82,k*.081);plane.rotation.y=k===1?Math.PI:0;own(plane,ranchMat,false);}
ranchMat.maxSimultaneousLights=8;ranchMat.emissiveColor=new Color3(.26,.22,.16);
entity('ranch wind vane');
cyl('wind vane fixed mast',arch.x,arch.y+4.36,arch.z,.043,.65,M.black);
const vane=new Mesh('wind vane rotating head',scene);vane.position=V(arch.x,arch.y+4.69,arch.z);
// Arrow points toward the source of wind (local +Z).
const vanePart=(name,mesh)=>{mesh.name=name;mesh.parent=vane;return mesh;};
vanePart('wind arrow shaft',box('arrow',0,0,0,.055,.055,1.18,M.black));
const headArrow=cyl('wind arrow head',0,0,.65,.13,.30,M.black,0);headArrow.rotation.x=Math.PI/2;headArrow.parent=vane;
vanePart('vane tail',box('tail',0,.12,-.53,.045,.32,.32,M.black));
vanePart('rooster body',sphere('rooster body',0,.27,-.10,.052,.18,.25,M.black));
vanePart('rooster head',sphere('rooster head',0,.48,.085,.048,.10,.11,M.black));
vanePart('rooster beak',box('rooster beak',0,.48,.22,.055,.05,.13,M.woodLight));
for(let i=0;i<3;i++)vanePart('rooster comb',sphere('comb',0,.58+.026*(i===1),.015+i*.06,.035,.052,.045,M.roof));
for(let i=0;i<3;i++){const feather=vanePart('rooster tail feather',box('feather',0,.34+i*.08,-.35-i*.04,.04,.08,.31,M.black));feather.rotation.x=-.6-i*.2;}
for(const x of [-.09,.09])vanePart('rooster foot',box('foot',x*.15,.09,-.10+x,.035,.22,.035,M.black));
const signMotion={angle:0,velocity:0,vaneYaw:0,peak:0,contacts:0};
function updateWindObjects(dt,wind=worldWind){
 dt=Math.max(0,Math.min(.10,dt));
 const pressure=wind.z*Math.cos(archAngle)+wind.x*Math.sin(archAngle),target=Math.max(-.30,Math.min(.30,pressure*.045));
 // Damped hinge with angular hard stops, stable even after a frame delay.
 const steps=Math.max(1,Math.ceil(dt/.012)),step=dt/steps;
 for(let i=0;i<steps;i++){signMotion.velocity+=(target-signMotion.angle)*22*step-signMotion.velocity*5.2*step;signMotion.angle+=signMotion.velocity*step;if(Math.abs(signMotion.angle)>.33){signMotion.angle=Math.sign(signMotion.angle)*.33;signMotion.velocity*=-.20;signMotion.contacts++;}}
 signMotion.peak=Math.max(signMotion.peak,Math.abs(signMotion.angle));signPivot.rotation.x=signMotion.angle;
 const desired=Math.atan2(-wind.x,-wind.z);signMotion.vaneYaw+=angleDelta(signMotion.vaneYaw,desired)*(1-Math.exp(-dt*4));vane.rotation.y=signMotion.vaneYaw;
 signSupport.computeWorldMatrix(true);signPivot.computeWorldMatrix(true);vane.computeWorldMatrix(true);
}
function archLocal(x,z){const dx=x-arch.x,dz=z-arch.z;return {x:dx*Math.cos(archAngle)-dz*Math.sin(archAngle),z:dx*Math.sin(archAngle)+dz*Math.cos(archAngle)};}
archRainSurface=(x,z)=>{const p=archLocal(x,z);return Math.abs(p.x)<2.22&&Math.abs(p.z)<.83?{y:arch.y+4.12-.29*Math.abs(p.z),kind:'roof',hidden:false}:null;};
archBlocked=(x,z,from)=>{
 const clearance=(a,b)=>{const p=archLocal(a,b),bottom=arch.y+3.54-1.15*Math.cos(signMotion.angle)-.08*Math.abs(Math.sin(signMotion.angle)),head=surfaceHeight(a,b)+1.94;if(head<bottom-.02)return 1;return Math.max(Math.abs(p.x)-1.92,Math.abs(p.z-.82*Math.sin(signMotion.angle))-.24);};
 return obstacleEntered(clearance(x,z),from?clearance(from.x,from.z):null);
};

function drawRanch(){const c=ranchTex.getContext();c.fillStyle='#b58650';c.fillRect(0,0,512,96);c.strokeStyle='#69482d';c.lineWidth=5;c.strokeRect(4,4,504,88);c.fillStyle='#38281b';c.font='bold 39px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(ranchName,256,48,470);ranchTex.update();$('ranch-hud').textContent=ranchName;}
function ranchNearby(){return Math.hypot(avatar.position.x-arch.x,avatar.position.z-arch.z)<3.0;}
function setRanchName(name){name=String(name).trim().slice(0,32);if(!name||!ranchNearby()||ranchLocked)return false;try{localStorage.setItem(RANCH_KEY,JSON.stringify({name}));ranchName=name;drawRanch();return true;}catch{return false;}}
drawRanch();$('ranch-open').onclick=()=>{if(!ranchNearby())return;$('ranch-name').value=ranchName;$('ranch-panel').hidden=false;};$('ranch-close').onclick=()=>{$('ranch-panel').hidden=true;};$('ranch-save').onclick=()=>{if(setRanchName($('ranch-name').value))$('ranch-panel').hidden=true;};
function nearbyFarmSign(){return farmSectors.find(f=>Math.hypot(avatar.position.x-f.sign.x,avatar.position.z-f.sign.z)<2.3);}
function boardNearby(){return !!nearbyFarmSign();}
// Small physical access points for the same authoritative trade and warehouse.
// Place only on clear ground, outside crop beds and paths; never move existing objects.
const farmStations=[];
function locateFarmStation(id,hx,hz){
 const clear=(x,z)=>!blocked(x,z)&&!inWheat(x,z)&&!onBridge(x,z)&&roadClearance(pathRows,x,z)>.38&&roadClearance(approachRows,x,z)>.38;
 for(let r=4.6;r<=24;r+=.8)for(let k=0;k<32;k++){
  const a=k*Math.PI/16,x=fieldSignCollider.x+Math.cos(a)*r,z=fieldSignCollider.z+Math.sin(a)*r,y=height(x,z);
  if(farmStations.some(f=>Math.abs(f.x-x)<f.hx+hx+2&&Math.abs(f.z-z)<f.hz+hz+2))continue;
  let valid=true;for(const dx of [-hx-.25,0,hx+.25])for(const dz of [-hz-.25,0,hz+.25])if(!clear(x+dx,z+dz)||Math.abs(height(x+dx,z+dz)-y)>.30)valid=false;
  if(!valid)continue;
  for(const [dx,dz] of [[0,-1],[0,1],[-1,0],[1,0]]){
   const sx=x+dx*(hx+.65),sz=z+dz*(hz+.65);
   if(blocked(sx,sz)||inWheat(sx,sz)||Math.hypot(sx-fieldSignCollider.x,sz-fieldSignCollider.z)<2.5)continue;
   const f={id,x,z,y,hx,hz,stand:V(sx,surfaceHeight(sx,sz),sz)};farmStations.push(f);worldFixtures.push({id,x,z,hx,hz});return f;
  }
 }
 return null;
}
const marketStation=locateFarmStation('farm-market',1.05,.68);
// No warehouse is placed by the game. Future construction catalog owns placement and persistence.
let warehouseStation=null;
function stationSign(f,label,y,width){const tex=new DynamicTexture('station sign '+f.id,{width:256,height:64},scene,true),c=tex.getContext();c.fillStyle='#ba8e58';c.fillRect(0,0,256,64);c.strokeStyle='#68482b';c.lineWidth=5;c.strokeRect(3,3,250,58);c.fillStyle='#30261b';c.font='bold 29px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,128,32,240);tex.update();const m=mat('station label '+f.id,'#ffffff');m.diffuseTexture=tex;m.emissiveColor=new Color3(.12,.10,.07);m.backFaceCulling=false;for(const d of [-1,1]){const face=MeshBuilder.CreatePlane(f.id+' sign face',{width,height:.27},scene);const p=worldOffset(f.x,f.z,f.yaw||0,0,d*(f.hz+.065));face.position=V(p.x,f.y+y,p.z);face.rotation.y=(f.yaw||0)+(d===1?Math.PI:0);own(face,m,false);}}
if(marketStation){const f=marketStation,B=(n,x,y,z,w,h,d,m)=>box(n,f.x+x,f.y+y,f.z+z,w,h,d,m);entity('farm market stall');B('stall counter',0,.87,0,2.1,.16,1.36,M.woodLight);B('stall cabinet',0,.4,0,1.95,.72,1.18,M.wood);for(const x of [-.92,.92])for(const z of [-.55,.55])B('stall timber support',x,1.12,z,.10,2.24,.10,M.woodDark);for(let k=0;k<8;k++)B('stall striped awning',-.94+k*.27,2.26,0,.27,.09,1.48,k%2?M.plaster:M.roof);for(let k=0;k<3;k++){B('produce crate',-.65+k*.65,1.02,0,.50,.16,.45,M.woodDark);for(const x of [-.13,.13])for(const z of [-.09,.09])sphere('market produce',f.x-.65+k*.65+x,f.y+1.16,f.z+z,.11,.11,.11,[M.red,M.leaf2,M.yellow][k]);}stationSign(f,'FEIRA',1.78,1.4);}
function createWarehouseVisual(f){
 const B=(n,x,y,z,w,h,d,m)=>{const p=worldOffset(f.x,f.z,f.yaw,x,z);return box(n,p.x,f.y+y,p.z,w,h,d,m,f.yaw);};
 entity('farm warehouse building');
 B('warehouse foundation',0,.13,0,3.10,.26,2.30,M.stoneLight);
 B('warehouse back',0,1.27,.98,2.90,2.28,.16,M.wood);
 for(const d of [-1,1]){
  B('warehouse side',d*1.40,1.27,0,.16,2.28,1.96,M.wood);
  for(const z of [-.98,.98])B('warehouse timber corner',d*1.4,1.28,z,.17,2.40,.17,M.woodDark);
  B('warehouse front planks',d*.96,1.27,-.98,.85,2.28,.16,M.woodLight);
  B('warehouse sliding door',d*.43,1.16,-1.03,.85,2.04,.13,M.wood);
  B('warehouse door brace',d*.43,1.16,-1.11,.67,.08,.05,M.woodDark);
  B('warehouse door handle',d*.12,1.13,-1.13,.07,.21,.07,M.black);
  const roof=B('warehouse sloped roof',0,2.68,d*.57,3.26,.16,1.28,M.roof);roof.rotation.x=d*.37;
 }
 B('warehouse ridge',0,2.93,0,3.30,.12,.14,M.woodDark);
 B('warehouse lintel',0,2.32,-1.02,2.90,.17,.19,M.woodDark);
 stationSign(f,'ARMAZÉM',2.16,1.52);
}
function stationNearby(f){if(!f||Math.abs(avatar.position.y-f.y)>=.8)return false;if(Object.hasOwn(KITCHEN_FIXTURES,f.id))return kitchenAccessNearby(homeLocal(avatar.position.x,avatar.position.z),f.id);const p=localOffset(f.x,f.z,f.yaw||0,avatar.position.x,avatar.position.z);return Math.hypot(Math.max(0,Math.abs(p.x)-f.hx),Math.max(0,Math.abs(p.z)-f.hz))<1.0;}
function warehouseCandidate(){return {x:build.x,z:build.z,yaw:((build.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2)};}
function warehouseStand(p){const {hz}=WAREHOUSE_SIZE;const front=worldOffset(p.x,p.z,p.yaw,0,-hz-.65);return V(front.x,surfaceHeight(front.x,front.z),front.z);}
function canPlaceWarehouse(p,restore=false){const clear=(x,z)=>!livestockReserved(x,z)&&!blocked(x,z)&&!onBridge(x,z)&&!sectorAt(x,z)&&landBuildAllowed(x,z)&&!petBodyBlocked(x,z)&&(restore||Math.hypot(x-avatar.position.x,z-avatar.position.z)>.48);if(!placementClear(p,{minX,maxX,minZ,maxZ},clear,height))return false;const stand=warehouseStand(p);return !blocked(stand.x,stand.z)&&!petBodyBlocked(stand.x,stand.z)&&Math.abs(stand.y-height(p.x,p.z))<.45;}
function activateWarehouse(p){if(warehouseStation)return false;const f={id:'farm-warehouse',...p,y:height(p.x,p.z),...WAREHOUSE_SIZE,stand:warehouseStand(p)};createWarehouseVisual(f);warehouseStation=f;worldFixtures.push(f);farmStations.push(f);return true;}
function placeWarehouse(){const p=warehouseCandidate();if(!build.open||build.kind!=='warehouse'||buildData.warehouse||!canPlaceWarehouse(p))return false;const next={...buildData,warehouse:p};if(!saveBuild(next))return false;activateWarehouse(p);progressEvent('build',{key:'warehouse'});shadowMap.resetRefreshCounter();farmAudio.action('hammer');closeBuild();drawMinimap(0,true);return true;}
function restoreWarehouse(){if(buildData.warehouse&&!buildError){if(canPlaceWarehouse(buildData.warehouse,true))activateWarehouse(buildData.warehouse);else buildError='Local do armazém salvo em conflito; dados preservados.';}}

const missionStation=(()=>{const polygon=layout.residence.boundary.map(p=>P(...p)),hx=.85,hz=.24;const preferred=home.C(home.w/2+2.2,0,-home.d/2-1);const candidates=[];for(let r=0;r<=18;r+=.5)for(let k=0;k<Math.max(1,Math.ceil(r*8));k++){const a=k*2*Math.PI/Math.max(1,Math.ceil(r*8)),x=preferred.x+Math.cos(a)*r,z=preferred.z+Math.sin(a)*r,l=homeLocal(x,z);if(x>home.x+5&&l.x>home.w/2+.5&&l.z<1)candidates.push({x,z});}for(const inside of [true,false])for(const {x,z} of candidates){const y=height(x,z);if(inside!==insidePolygon(polygon,x,z))continue;if(roadClearance(pathRows,x,z)<.7||roadClearance(approachRows,x,z)<.7)continue;let ok=true;for(const dx of [-1.1,0,1.1])for(const dz of [-.5,0,.5])if(blocked(x+dx,z+dz)||sectorAt(x+dx,z+dz)||Math.abs(height(x+dx,z+dz)-y)>.25)ok=false;if(!ok)continue;const stand=[-1,1].map(d=>V(x,surfaceHeight(x,z+d*.9),z+d*.9)).find(p=>!blocked(p.x,p.z)&&inside===insidePolygon(polygon,p.x,p.z));if(!stand)continue;const f={id:'mission-board',x,z,y,hx,hz,stand};worldFixtures.push({id:f.id,x,z,hx,hz});entity('mission board');for(const dx of [-.68,.68])box('mission board post',x+dx,y+.91,z,.13,1.82,.16,M.woodDark);box('mission board panel',x,y+1.28,z,1.7,1.02,.15,M.woodLight);box('mission board roof',x,y+1.90,z,1.96,.13,.60,M.woodDark);for(const dx of [-.48,0,.48])box('mission notice',x+dx,y+1.23,z-.09,.35,.45,.025,M.plaster);stationSign(f,'MISSÕES',1.68,1.45);return f;}return null;})();
function openFarmStation(f,category){if(!stationNearby(f)||!openInventory())return false;inventoryCategory=category;inventoryKey='';$('inventory-message').textContent=category==='market'?'Feira do rancho · compre sementes e venda colheitas.':'Armazém do rancho · guarde e retire seus produtos.';renderInventory(true);return true;}
$('market-open').onclick=()=>openFarmStation(marketStation,'market');$('warehouse-open').onclick=()=>openFarmStation(warehouseStation,'warehouse');

$('gate-action').onclick=()=>toggleGate();
function projectWorld(p){const v=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight())),rect=canvas.getBoundingClientRect();return {x:rect.left+v.x*rect.width/engine.getRenderWidth(),y:rect.top+v.y*rect.height/engine.getRenderHeight(),z:v.z};}
// All small world actions share one collision-aware placement pass.
const contextActionIds=['door-action','seat-action','garden-action','wheat-expand','world-quick','pet-action','pet-context','fence-context'];
function contextOverlap(a,b,pad=6){return a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;}
function layoutContextActions(){
 if(!contextActionIds.some(id=>!$(id).hidden))return;
 const avatarHead=projectWorld(avatar.position.add(V(0,1.95,0))),feet=projectWorld(avatar.position);
 const visibleRect=e=>{if(!e||e.hidden)return null;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display==='none'||s.visibility==='hidden'||!r.width||!r.height?null:r;};
 const obstacles=['profile-hud','inventory-open','world-calendar','hud','joy','run-action','minimap','wheat-panel','pet-panel','garden-panel','farm-center','ranch-panel','player-menu','pet-notice','mission-tracker','tool-bar','tool-arc'].map(id=>visibleRect($(id))).filter(Boolean);
 if([avatarHead.x,avatarHead.y,feet.x,feet.y].every(Number.isFinite))obstacles.push({left:Math.min(avatarHead.x,feet.x)-19,right:Math.max(avatarHead.x,feet.x)+19,top:Math.min(avatarHead.y,feet.y)-10,bottom:Math.max(avatarHead.y,feet.y)+8});
 const modal=!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden||!gardenPanel.hidden||!$('pet-panel').hidden||!$('ranch-panel').hidden||build.open||inventoryDialog.open||progressDialog.open||ruralDialog.open;
 const nearest=(list,point)=>list.slice().sort((a,b)=>Vector3.Distance(avatar.position,point(a))-Vector3.Distance(avatar.position,point(b)))[0];
 const petHome=nearest(petSystem.pets.filter(petSystem.uiHomeNear),p=>p.out),animal=nearest(petSystem.pets.filter(petSystem.animalNear),p=>p.rig.root.position);
 const gate=nearGate(),bench=seating.bench||nearbyBench(),planter=nearbyPlanter();
 const anchor={
 'door-action':home.C(0,1.5,-home.d/2),
 'seat-action':bench?seatStand(bench).add(V(0,.65,0)):avatar.position,
 'garden-action':planter?home.C(planter.x,1.0+(planter.floor===2?UPPER_Y-.53:0),planter.z):avatar.position,
 'wheat-expand':wheatSelected?V(wheatSelected.x,surfaceHeight(wheatSelected.x,wheatSelected.z)+.7,wheatSelected.z):avatar.position,
 'world-quick':ruralNearby()?V(ruralNearby().x,ruralNearby().y+1.2,ruralNearby().z):stationNearby(missionStation)?V(missionStation.x,missionStation.y+1.9,missionStation.z):stationNearby(marketStation)?V(marketStation.x,marketStation.y+1.5,marketStation.z):stationNearby(warehouseStation)?V(warehouseStation.x,warehouseStation.y+1.9,warehouseStation.z):boardNearby()?V(nearbyFarmSign().sign.x,surfaceHeight(nearbyFarmSign().sign.x,nearbyFarmSign().sign.z)+1.5,nearbyFarmSign().sign.z):gate?gate.center:ranchNearby()?V(arch.x,surfaceHeight(arch.x,arch.z)+1.5,arch.z):avatar.position,
 'pet-action':petHome?petHome.threshold.add(V(0,.65,0)):avatar.position,
 'pet-context':animal?animal.rig.root.position.add(V(0,.5,0)):avatar.position,
 'fence-context':nearFence?Vector3.Lerp(nearFence.a,nearFence.b,.5).add(V(0,1.35,0)):avatar.position};
 for(const id of contextActionIds){
  const el=$(id);if(!el||el.hidden)continue;
  if(modal||(id==='door-action'&&!doorNearby()&&!entry.action)||(id==='seat-action'&&!bench)||(id==='garden-action'&&!planter)||(id==='pet-action'&&!petHome)||(id==='pet-context'&&!animal)){el.style.visibility='hidden';continue;}
  const w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)continue;
  if(el.tagName==='BUTTON'){el.title=el.textContent.trim();el.setAttribute('aria-label',el.title);}
  const p=projectWorld(anchor[id]),margin=8;
  const x=Number.isFinite(p.x)&&p.x>=0&&p.x<=innerWidth?p.x:innerWidth/2,y=Number.isFinite(p.y)&&p.y>=0&&p.y<=innerHeight?p.y:innerHeight/2;
  const candidates=[[x-w/2,y-h-12],[x+12,y-h/2],[x-w-12,y-h/2],[x-w/2,y+12]];
  // Search nearby free positions before suppressing a control; never cover an occupied rectangle.
  for(const d of [48,88,128,176])for(const [dx,dy] of [[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]])candidates.push([x-w/2+dx*d,y-h/2+dy*d]);
  let chosen=null;
  for(const [cx,cy] of candidates){const left=Math.max(margin,Math.min(innerWidth-w-margin,cx)),top=Math.max(margin,Math.min(innerHeight-h-margin,cy));const r={left,top,right:left+w,bottom:top+h};if(r.right>innerWidth-margin||r.bottom>innerHeight-margin||obstacles.some(o=>contextOverlap(r,o)))continue;chosen=r;break;}
  if(!chosen){el.style.visibility='hidden';continue;}
  el.style.left=Math.round(chosen.left)+'px';el.style.top=Math.round(chosen.top)+'px';el.style.visibility='visible';obstacles.push({left:Math.round(chosen.left),top:Math.round(chosen.top),right:Math.round(chosen.left)+w,bottom:Math.round(chosen.top)+h});
 }
}
function positionWorldContext(){layoutContextActions();}
function updateWorldActions(dt,place=true){if(!farmCenter.hidden&&!boardNearby())farmCenter.hidden=true;contextClock+=dt;if(contextClock<.15){if(place)layoutContextActions();return;}contextClock=0;const now=worldElapsed();if(now-lastCareRefresh>REAL_MS_PER_GAME_MINUTE*10){lastCareRefresh=now;accrueFence(now);for(const piece of editableFences.values())fenceLook(piece);saveFenceCare();}
 nearFence=nearbyFence();syncToolVisibility();if(paintTarget&&nearFence?.id!==paintTarget)closePaint();const free=!domesticRun&&!titleMode&&!photoMode&&!regionalOpen&&!inventoryDialog.open&&!progressDialog.open&&!ruralDialog.open&&!build.open&&!build.work&&!entry.action&&seating.phase==='idle'&&!tillWork&&playerMenu.hidden&&controlsMenu.hidden&&farmCenter.hidden&&gardenPanel.hidden&&$('pet-panel').hidden&&$('ranch-panel').hidden;
 const direct=free?directNatureTarget():null;syncResourceHUD(direct);const rural=ruralNearby(),gate=nearGate(),board=boardNearby(),ranch=ranchNearby(),market=stationNearby(marketStation),warehouse=stationNearby(warehouseStation),mission=stationNearby(missionStation),other=board||ranch||!!gate||market||warehouse||mission||!!rural,petNear=petSystem.pets.some(p=>petSystem.homeNear(p)||petSystem.animalNear(p));
 $('fence-context').hidden=!free||!nearFence||other||petNear||!wheatPanel.hidden||!$('wheat-expand').hidden;if($('fence-context').hidden)closePaint();if(nearFence){$('fence-condition').textContent='Madeira '+Math.round(fenceCondition(nearFence.id)*100)+'% · '+woodNames[fenceCare.items[nearFence.id]?.paint??0];$('fence-repair').disabled=!!fenceCareError||fenceCondition(nearFence.id)>.995;$('fence-paint').disabled=!!fenceCareError;}
 $('gate-action').hidden=!free||!gate;$('gate-action').disabled=!!gateWork;if(gate){$('gate-action').title=gate.target>.5?'Fechar portão':'Abrir portão';$('gate-action').setAttribute('aria-label',$('gate-action').title);$('gate-action').querySelector('.context-icon').textContent=gate.target>.5?'⇥':'⇤';}$('ranch-open').hidden=!free||!ranch;$('farm-open').hidden=!free||!board;$('market-open').hidden=!free||!market;$('warehouse-open').hidden=!free||!warehouse;$('mission-open').hidden=!free||!mission;$('rural-open').hidden=!free||!rural;if(rural){$('rural-open').querySelector('.context-icon').textContent=rural.icon;$('rural-open').querySelector('small').textContent=rural.label;$('rural-open').setAttribute('aria-label',rural.label);$('rural-open').title=rural.label;}$('world-quick').hidden=!free||!other;if(place)layoutContextActions();if(!ranch)$('ranch-panel').hidden=true;
}
accrueFence();for(const piece of editableFences.values())fenceLook(piece);window.addEventListener('pagehide',()=>{accrueFence();saveFenceCare();});
// Draw actual world geometry on a cached north-up map; no second 3D camera.
// World coordinates +X east, +Z north. Player yaw follows the model.
const mapCanvas=$('minimap-canvas'),mapCtx=mapCanvas.getContext('2d'),mapBase=document.createElement('canvas');mapBase.width=mapBase.height=512;const baseCtx=mapBase.getContext('2d'),mapScale=512/Math.max(maxX-minX,maxZ-minZ);
const mapXY=(x,z)=>[(x-minX)*mapScale,(maxZ-z)*mapScale];
function mapLine(points,color,width,close=false){if(points.length<2)return;baseCtx.beginPath();for(const [i,p] of points.entries()){const q=mapXY(p.x,p.z);i?baseCtx.lineTo(...q):baseCtx.moveTo(...q);}if(close)baseCtx.closePath();baseCtx.strokeStyle=color;baseCtx.lineWidth=width*mapScale;baseCtx.lineJoin='round';baseCtx.lineCap='round';baseCtx.stroke();}
function mapPoly(points,color){baseCtx.beginPath();points.forEach((p,i)=>{const q=mapXY(p.x,p.z);i?baseCtx.lineTo(...q):baseCtx.moveTo(...q);});baseCtx.closePath();baseCtx.fillStyle=color;baseCtx.fill();}
baseCtx.fillStyle='#435d37';baseCtx.fillRect(0,0,512,512);
for(const seg of riverSegments){mapLine([V(seg.x,0,seg.z),V(seg.x+seg.dx,0,seg.z+seg.dz)],'#357f94',seg.w);}
for(const f of eastPolygons)mapPoly(f.points,'#357f94');for(const {curve} of eastChannels)for(let i=1;i<curve.length;i++)mapLine([curve[i-1].p,curve[i].p],'#357f94',(curve[i-1].w+curve[i].w)/2);
mapLine(pathRows.map(row=>row[1]),'#c6b38a',2.3);mapLine(approachRows.map(row=>row[1]),'#b89664',2.6);mapLine([bridgeEntry,bridgeExit],'#c6a273',3.0);
mapPoly([home.C(-home.w/2,0,-home.d/2),home.C(home.w/2,0,-home.d/2),home.C(home.w/2,0,home.d/2),home.C(-home.w/2,0,home.d/2)],'#a96342');
for(const f of farmStations)mapPoly([V(f.x-f.hx,0,f.z-f.hz),V(f.x+f.hx,0,f.z-f.hz),V(f.x+f.hx,0,f.z+f.hz),V(f.x-f.hx,0,f.z+f.hz)],f.id==='farm-warehouse'?'#9a724c':'#c99e70');
for(const road of [...expansionRoads,...roadJoins])mapLine(road.curve,'#b89664',road.width);for(const f of farmSectors)mapPoly(f.polygon,'#73824d');for(const b of allFarmBeds)mapPoly([V(b.x1,0,b.z1),V(b.x2,0,b.z1),V(b.x2,0,b.z2),V(b.x1,0,b.z2)],'#967450');
// Resource dots are drawn from live geometry, not the original static map.
function layoutMinimap(){
 const el=$('minimap'),head=$('hud').getBoundingClientRect(),control=$('run-action').getBoundingClientRect();
 const top=Math.ceil(head.bottom+8);el.style.setProperty('--map-top',top+'px');
 el.dataset.fit=String(Math.min(innerHeight,control.top)-top>=el.getBoundingClientRect().height+6);
}
const mapLayoutObserver=new ResizeObserver(layoutMinimap);for(const id of ['hud','minimap','run-action'])mapLayoutObserver.observe($(id));window.addEventListener('resize',layoutMinimap);layoutMinimap();
let mapClock=0,lastMapKey='';const compassCanvas=$('compass-canvas'),compassCtx=compassCanvas.getContext('2d');const mapQA={heading:0,frames:0,terrainFrames:0,north:'+Z',east:'+X'};
function drawMinimap(dt,force=false){
 mapClock+=dt;if(!force&&mapClock<.10)return;mapClock=0;
 let c=mapCtx;const W=mapCanvas.width,H=mapCanvas.height,mid=W/2,rad=mid-17;
 const centerX=avatar.position.x,centerZ=avatar.position.z,[mx,my]=mapXY(centerX,centerZ),fixedScale=(rad-5)/24;
 const screen=p=>[mid+(p.x-centerX)*fixedScale,mid-(p.z-centerZ)*fixedScale],marker=screen(avatar.position);
 const mapKey=JSON.stringify([[centerX,centerZ],fishingSpots.length,JSON.stringify(wheatState.installations),drawMinimap.resourceRevision??0,fenceColliders.map(([a,b])=>[a.x,a.z,b.x,b.z]),gates.map(g=>[g.center.x,g.center.z,g.open>.9])]);
 if(mapKey!==lastMapKey){lastMapKey=mapKey;mapQA.terrainFrames++;c.clearRect(0,0,W,H);c.save();c.beginPath();c.arc(mid,mid,rad,0,Math.PI*2);c.clip();c.fillStyle='#364a31';c.fillRect(0,0,W,H);
 // drawImage clips source bounds correctly; padded base is drawn through a transform.
 c.drawImage(mapBase,mid-mx*fixedScale/mapScale,mid-my*fixedScale/mapScale,512*fixedScale/mapScale,512*fixedScale/mapScale);
 c.lineWidth=1.6;c.strokeStyle='#d6c095';c.beginPath();for(const [a,b] of fenceColliders){c.moveTo(...screen(a));c.lineTo(...screen(b));}c.stroke();
 for(const g of gates){const p=screen(g.center);c.fillStyle=g.open>.9?'#bcd893':'#e2ac70';c.fillRect(p[0]-2,p[1]-2,4,4);}
 for(const f of natureNodes){if(f.active===false||f.collider?.active===false)continue;const [x,y]=screen(f);c.fillStyle=f.kind==='stone'?'#a7a08b':f.pink?'#df9abb':'#264b30';c.beginPath();c.arc(x,y,f.kind==='stone'?1.5:2.1,0,Math.PI*2);c.fill();}
 for(const f of fishingSpots){const [x,y]=screen(f);c.beginPath();c.arc(x,y,5.5,0,Math.PI*2);c.fillStyle='#22647b';c.fill();c.strokeStyle='#d6f0de';c.lineWidth=1;c.stroke();c.fillStyle='#e2f8f5';c.beginPath();c.ellipse(x+.6,y,2.7,1.6,0,0,Math.PI*2);c.moveTo(x-1.6,y);c.lineTo(x-4,y-2);c.lineTo(x-4,y+2);c.closePath();c.fill();c.fillStyle='#22647b';c.fillRect(x+1.8,y-.6,.7,.7);}
 for(const f of orchardModels){const [x,y]=screen(f);c.fillStyle='#d99854';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}
 for(const z of ruralZones){const [x,y]=screen(z);c.fillStyle=(z.extra||installationReady(wheatState.installations,z.id))?'#c0d88e':'#d5bc83';c.fillRect(x-3,y-3,6,6);}
 for(const b of staffBridges){c.strokeStyle='#dfbb83';c.lineWidth=4;c.beginPath();c.moveTo(...screen(b.a));c.lineTo(...screen(b.b));c.stroke();}
 // Recognizable house icon, anchored to the actual footprint.
 const hp=screen(V(home.x,0,home.z));c.save();c.translate(hp[0],hp[1]);c.fillStyle='#ead7ae';c.fillRect(-7,-1,14,9);c.fillStyle='#a8502d';c.beginPath();c.moveTo(-10,0);c.lineTo(0,-9);c.lineTo(10,0);c.closePath();c.fill();c.fillStyle='#355b70';c.fillRect(-2,3,4,5);c.restore();
 c.beginPath();c.arc(marker[0],marker[1],4.5,0,Math.PI*2);c.fillStyle='#ffe9b0';c.fill();c.strokeStyle='#203722';c.lineWidth=1.7;c.stroke();c.restore();}
 c=compassCtx;c.clearRect(0,0,W,H);
 // Approved aged olive band belongs only to the independent compass overlay.
 c.beginPath();c.arc(mid,mid,mid-1,0,Math.PI*2);c.arc(mid,mid,rad+1,0,Math.PI*2,true);c.fillStyle='#5f6e4e';c.fill('evenodd');
 c.beginPath();c.arc(mid,mid,rad,0,Math.PI*2);c.strokeStyle='#c5c59d';c.lineWidth=1.5;c.stroke();
 // Independent compass ring; terrain stays fixed north-up.
 for(let i=0;i<72;i++){const a=i*Math.PI/36-avatar.rotation.y,major=i%9===0,outer=rad+5,inner=rad+(major?0:3);c.beginPath();c.moveTo(mid+Math.sin(a)*inner,mid-Math.cos(a)*inner);c.lineTo(mid+Math.sin(a)*outer,mid-Math.cos(a)*outer);c.strokeStyle=major?'#e7ddb0':'#a9b28a';c.lineWidth=major?1.3:.7;c.stroke();}
 c.fillStyle='#f4e8c4';c.font='bold 13px system-ui';c.textAlign='center';c.textBaseline='middle';for(const [label,angle] of [['N',0],['L',Math.PI/2],['S',Math.PI],['O',-Math.PI/2]]){const a=angle-avatar.rotation.y;c.fillText(label,mid+Math.sin(a)*(mid-9),mid-Math.cos(a)*(mid-9));}const degrees=Math.round(((avatar.rotation.y*180/Math.PI)%360+360)%360)%360;$('map-heading').textContent=degrees+'° '+['N','NE','L','SE','S','SO','O','NO'][Math.round(degrees/45)%8];
 mapQA.heading=avatar.rotation.y;mapQA.frames++;mapQA.center=[centerX,centerZ];mapQA.scale=fixedScale;mapQA.marker=marker;mapQA.mapRotation=0;mapQA.compassRotation=-avatar.rotation.y;const windLabel=['N','NE','L','SE','S','SO','O','NO'][Math.round(((Math.atan2(-worldWind.x,-worldWind.z)+Math.PI*2)%(Math.PI*2))/(Math.PI/4))%8];$('map-wind').textContent='Vento de '+windLabel+' · '+worldWind.speed.toFixed(1)+' m/s';
}
drawMinimap(0,true);

const petSystem=createPets({V,Mesh,MeshBuilder,scene,entity,own,box,sphere,cyl,mat,M,home,dogHome,porchFixtures,fencePoints,blocked,surfaceHeight,homeLocal,angleDelta,avatar,weather:()=>weatherVisual,doorState:()=>({open:entry.door,active:!!entry.action}),ui:$,cancelInput,playerPose:petPlayerPose,playerFinish:finishPetPlayer,playerMove:(dx,dz,dt)=>moveAvatar(dx,dz,dt),playerBlocked,layoutActions:layoutContextActions,onCareSound:id=>farmAudio.action(id),onCareComplete:(id,action)=>progressEvent('care',{key:id+':'+action}),affinityBonus:()=>hasPerk(wheatState.progress,'afinidade')?1.2:1,project:p=>{const v=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight())),rect=canvas.getBoundingClientRect();return {x:rect.left+v.x*rect.width/engine.getRenderWidth(),y:rect.top+v.y*rect.height/engine.getRenderHeight(),z:v.z};}});
petBodyBlocked=petSystem.bodyBlocked;
// Five local lights plus sky and sun; limit light selection to local range and leave them disabled by day.
for(const m of scene.materials)if(m instanceof StandardMaterial)m.maxSimultaneousLights=8;
let t=0,frames=0;const shadowMap=shadow.getShadowMap();const shadowCache={refreshes:0,lastSignature:null,lastRefreshMs:-Infinity};shadowMap.refreshRate=0;scene.onBeforeRenderObservable.add(()=>{if(regionalOpen)return;const rawDt=Math.max(0,engine.getDeltaTime()/1000),dt=Math.min(.05,rawDt);motion.peakDeltaMs=Math.max(motion.peakDeltaMs,rawDt*1000);t+=dt;waterTex.vOffset=-(t*.035)%1;fallTex.vOffset=-(t*.27)%1;for(let i=0;i<waterMotion.length;i++){const f=waterMotion[i],p=Vector3.Lerp(f.a,f.b,(f.phase+t*f.speed)%1).add(f.side);p.y+=.035;Matrix.Compose(f.scale,f.rotation,p).copyToArray(flowMatrices,i*16);}if(flowBatch)flowBatch.thinInstanceBufferUpdated('matrix');let x=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=joy.z+(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);let len=Math.hypot(x,z);if(len>1){x/=len;z/=len}const input=worldInput(x,z);if(petSystem.interactionActive()&&(Math.hypot(input.x,input.z)>.03||entry.action||seating.phase!=='idle'||!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden||!gardenPanel.hidden||build.open))petSystem.cancelInteraction();if(tillWork&&(Math.hypot(input.x,input.z)>.03||!playerMenu.hidden||!controlsMenu.hidden||!farmCenter.hidden))endTill(false);if(resourceSwing)tickResourceSwing(dt);else if(tillWork)tickTill(dt);else if(!petSystem.interactionActive())updateLocomotion(input.x,input.z,rawDt);updateDust(Math.min(.12,rawDt));updateEntry(dt);updateGarden();updateWheat();tickMounds(dt);tickBuild(dt,Math.hypot(input.x,input.z)>.03);tickGates(dt,Math.hypot(input.x,input.z)>.03);updateWorldClock();farmAudio.tick(dt,weatherVisual);worldWind=windAt(worldElapsed(),weatherVisual.kind);updateWindObjects(dt);drawMinimap(dt);updateWorldActions(dt,false);updateRain(rawDt);petSystem.update(rawDt,!entry.inside&&!entry.action&&seating.phase==='idle'&&playerMenu.hidden&&controlsMenu.hidden&&gardenPanel.hidden&&farmCenter.hidden&&!tillWork&&!build.open&&wheatPanel.hidden&&$('wheat-expand').hidden&&$('ranch-panel').hidden&&$('world-quick').hidden&&$('fence-context').hidden);refreshFarmCenter();
 const sig=[Math.round(avatar.position.x*4),Math.round(avatar.position.z*4),Math.round(avatar.rotation.y*4),Math.round(avatar.rotation.x*20),Math.round(seating.blend*20),seating.phase,Math.round(gait.stride*Math.sin(gait.phase)*4),Math.round(entry.door*20),Math.round(signMotion.angle*8),Math.round(signMotion.vaneYaw*3),entry.action?.phase||'',Math.round((entry.action?.turn||0)*10),entry.mode,Math.round(camera.target.x/3),Math.round(camera.target.z/3),...petSystem.pets.map(p=>Math.round(p.rig.root.position.x*2)+':'+Math.round(p.rig.root.position.z*2))].join('|');const now=performance.now();if(sig!==shadowCache.lastSignature&&now-shadowCache.lastRefreshMs>=1000/(entry.blend>.02?20:30)){shadowCache.lastSignature=sig;shadowCache.lastRefreshMs=now;shadowMap.resetRefreshCounter();shadowCache.refreshes++;}frames++});
// Measure elapsed real time between completed render callbacks, not the engine's startup estimate.
const perf={fps:null,p95Ms:null,maxMs:null,slowFrames:0,frames:0,last:null,windowStart:null,samples:[]};
scene.onAfterRenderObservable.add(()=>{const now=performance.now();if(perf.last!==null)perf.samples.push(now-perf.last);perf.last=now;if(perf.windowStart===null)perf.windowStart=now;const elapsed=now-perf.windowStart;if(elapsed>=4000&&perf.samples.length>=2){const a=perf.samples.slice().sort((x,y)=>x-y);perf.frames=perf.samples.length;perf.fps=1000*perf.frames/Math.max(1,a.reduce((x,y)=>x+y,0));perf.p95Ms=a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];perf.maxMs=a.at(-1);perf.slowFrames=a.filter(ms=>ms>33.33).length;$('fps').textContent=perf.fps.toFixed(1)+' FPS';$('metrics').textContent='P95 '+perf.p95Ms.toFixed(1)+' ms · '+engine.getRenderWidth()+'×'+engine.getRenderHeight()+' · '+perf.frames+' quadros · pico '+perf.maxMs.toFixed(1)+' ms · lentos '+perf.slowFrames;perf.samples=[];perf.windowStart=now;}});
function resetPerf(){perf.samples=[];perf.last=null;perf.windowStart=null;perf.fps=null;perf.p95Ms=null;perf.maxMs=null;perf.slowFrames=0;perf.frames=0;$('fps').textContent='Medindo…';$('metrics').textContent='Nova janela de medição';}
document.addEventListener('visibilitychange',resetPerf);
span=cameraBase().span;follow=true;fit();retarget(explorationAim());
// Keep entity boundaries and material boundaries. Only static pieces are batched.
// Logical component counts remain available for regression checks.
const componentCounts=Object.fromEntries(Object.entries(groups).map(([id,parts])=>[id,parts.length]));componentCounts.house+=['house-roof','house-front','house-porch-roof','house-door'].reduce((n,id)=>n+(componentCounts[id]||0),0);
window.cvBootStage='batching';const batching={before:scene.meshes.length,after:0,merged:0};
const flowMatrices=new Float32Array(waterMotion.length*16);let flowBatch=null;
const flowInstancing={before:waterMotion.length,after:0,instances:0};
if(waterMotion.length){
 flowBatch=MeshBuilder.CreateSphere('animated water glints instanced',{diameter:2,segments:7},scene);flowBatch.material=M.foam;flowBatch.isPickable=false;flowBatch.receiveShadows=false;
 const originals=new Set(waterMotion.map(f=>f.m));
 for(let i=0;i<waterMotion.length;i++){const f=waterMotion[i];f.scale=f.m.scaling.clone();f.rotation=Quaternion.RotationYawPitchRoll(f.m.rotation.y,0,0);Matrix.Compose(f.scale,f.rotation,f.m.position).copyToArray(flowMatrices,i*16);f.m.dispose(false,false);delete f.m;}
 for(const [id,parts] of Object.entries(groups))groups[id]=parts.filter(m=>!originals.has(m));
 groups.river.push(flowBatch);flowBatch.thinInstanceSetBuffer('matrix',flowMatrices,16,false);flowBatch.alwaysSelectAsActiveMesh=true;
 flowInstancing.after=1;flowInstancing.instances=waterMotion.length;
}
const animated=new Set(flowBatch?[flowBatch]:[]);
const casters=new Set(shadow.getShadowMap().renderList||[]);
for(const [id,parts] of Object.entries(groups)){
 if(['staff movable furnishings','terrain','grass details','farm visitor','porch cultivated flowers','run dust','seated articulated legs','wheat dynamic cultivation','residence fence','hoe soil effects','construction preview','construction tools','bridge gates','ranch sign moving','ranch wind vane','chimney smoke','world precipitation','dog','cat','pet bowls','pet toys','hoe tool'].includes(id))continue;
 const buckets=new Map(),kept=[];
 for(const m of parts){
  if(animated.has(m)||m.parent||!m.material||m.getTotalVertices()===0||m.hasThinInstances){kept.push(m);continue}
  const key=[m.material.uniqueId,casters.has(m),m.receiveShadows,m.getVerticesDataKinds().sort().join(',')].join('|');
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(m);
 }
 for(const list of buckets.values()){
  if(list.length<2){kept.push(...list);continue}
  const cast=casters.has(list[0]);let merged=null;
  try{for(const m of list)m.computeWorldMatrix(true);merged=Mesh.MergeMeshes(list,false,true);}catch(e){console.warn('Batch fallback',id,e.message)}
  if(!merged){kept.push(...list);continue}
  merged.name=id+' material batch';merged.material=list[0].material;merged.receiveShadows=list[0].receiveShadows;merged.isPickable=false;
  for(const m of list){if(cast)shadow.removeShadowCaster(m,false);m.dispose(false,false)}
  if(cast)shadow.addShadowCaster(merged,false);
  merged.freezeWorldMatrix();kept.push(merged);batching.merged+=list.length-1;
 }
 groups[id]=kept;
}
if(workerDorm){workerDorm.roof=groups['staff roof']||[];workerDorm.ground=[...(groups['staff floor 0']||[]),...workerDorm.rooms.filter(r=>r.floor===0).map(r=>r.blanket)];workerDorm.upper=[...(groups['staff floor 1']||[]),...workerDorm.rooms.filter(r=>r.floor===1).map(r=>r.blanket)];}
batching.after=scene.meshes.length;
// Stream visibility explicitly after the current camera matrices are available.
// The original terrain, original cultivation, all simulation and collision
// data remain independent of visibility. Only new non-shadow-casting artwork
// is eligible; use a conservative padded frustum for smooth transitions.
const streamedTerrain=terrainPatches.slice(1),streamIndex=spatialIndex(streamedTerrain),terrainStream=createResidency(streamedTerrain,{load:uploadTerrainPatch,unload:p=>{p.mesh.setEnabled(false);p.mesh.geometry?.releaseForMesh(p.mesh,true);}});
const expansionStaticMeshes=[...Object.entries(groups).filter(([id])=>id.startsWith('farm road ')||id.startsWith('agricultural fence ')||id.startsWith('agricultural sign ')||id.startsWith('expanded water ')).flatMap(([,m])=>m)];
const expansionVisibility={total:streamedTerrain.length+expansionStaticMeshes.length+farmSectors.length,enabled:0,disabled:0,changes:0,activeVertices:0,scans:0,cacheHits:0};
let expansionLastMatrix=null,expansionLastSector=null,streamPlan={required:[],prefetch:[]},streamPlayer='';
function terrainStreamDiagnostics(){return {...terrainStream.stats,total:streamedTerrain.length,residentVertices:streamedTerrain.reduce((n,p)=>n+(terrainStream.isResident(p.id)?p.mesh.getTotalVertices():0),0),totalVertices:streamedTerrain.reduce((n,p)=>n+(p.i1-p.i0+1)*(p.j1-p.j0+1),0)};}
for(const mesh of [...expansionStaticMeshes,...farmSectors.map(f=>f.low)])mesh.computeWorldMatrix(true);
function syncExpansionVisibility(){
 const cam=regionalOpen?regionalCamera:camera,matrix=cam.getViewMatrix().multiply(cam.getProjectionMatrix()),values=matrix.m;
 // Exact reuse only: no quantization or delayed enabling on a moving camera.
 const key=[Math.floor(avatar.position.x/4),Math.floor(avatar.position.z/4),Math.floor(avatar.rotation.y*4),regionalOpen].join(':');if(expansionLastSector===renderFarmSector&&expansionLastMatrix&&values.every((v,i)=>v===expansionLastMatrix[i])&&streamPlayer===key){expansionVisibility.cacheHits++;terrainStream.step(streamPlan.required,streamPlan.prefetch,performance.now());return;}streamPlayer=key;
 expansionLastMatrix=Array.from(values);expansionLastSector=renderFarmSector;expansionVisibility.scans++;
 const planes=Frustum.GetPlanes(matrix);for(const plane of planes)plane.d+=4;
 streamPlan={required:streamedTerrain.filter(p=>boundsVisible(p.bounds,planes)).map(p=>p.id),prefetch:regionalOpen?[]:streamIndex.query(prefetchBounds(avatar.position.x,avatar.position.z,avatar.rotation.y)).map(p=>p.id)};terrainStream.step(streamPlan.required,streamPlan.prefetch,performance.now());const required=new Set(streamPlan.required);
 let enabled=0,activeVertices=0;for(const p of streamedTerrain){const next=required.has(p.id)&&terrainStream.isResident(p.id);if(p.mesh.isEnabled()!==next){p.mesh.setEnabled(next);expansionVisibility.changes++;}if(next){enabled++;activeVertices+=p.mesh.getTotalVertices();}}
 const visit=(mesh,allowed=true)=>{const next=allowed&&mesh.isInFrustum(planes);if(mesh.isEnabled()!==next){mesh.setEnabled(next);expansionVisibility.changes++;}if(next){enabled++;activeVertices+=mesh.getTotalVertices();}};
 for(const mesh of expansionStaticMeshes)visit(mesh);
 for(const f of farmSectors)visit(f.low,!regionalOpen&&f!==renderFarmSector);
 expansionVisibility.enabled=enabled;expansionVisibility.disabled=expansionVisibility.total-enabled;expansionVisibility.activeVertices=activeVertices;
}
scene.onBeforeActiveMeshesEvaluationObservable.add(syncExpansionVisibility);
syncExpansionVisibility();
const residenceCasters=new Set(shadow.getShadowMap().renderList||[]);for(const id of ['house','house-roof','house-front','house-porch-roof','house-door','house-stairs','house-upper-floor','house-ground-divider','house-upper-rooms','house-upper-balcony',...interiorDoors.map(d=>'interior-door '+d.id)])for(const mesh of groups[id]||[]){const cast=residenceCasters.has(mesh);residenceShadowState.members.set(mesh,{cast,active:cast,receive:mesh.receiveShadows});}
// Assign interior emitters to interior surfaces, not the outside façade/roof.
for(const {id,light:l} of nightLights){if(id==='warm interior'||id==='warm loft')l.includedOnlyMeshes=[...(groups.house||[]),...(groups['house-stairs']||[]),...(groups['house-upper-floor']||[]),...(groups['house-ground-divider']||[]),...(groups['house-upper-rooms']||[]),...interiorDoors.flatMap(d=>groups['interior-door '+d.id]||[]),...(groups['farm visitor']||[]),...(groups.dog||[]),...(groups.cat||[])];}

// First unification slice: one bag over the existing authoritative balances.
let inventoryCategory='all',inventoryKey='';
let tradeQuantity=1;
const inventoryItems=()=>inventorySnapshot(wheatState,buildData,{farmLocked:wheatSaveLocked,constructionLocked:!!buildError});
function applyTrade(id,action,quantity){
 if(wheatSaveLocked||!inventoryDialog.open||inventoryCategory!=='market')return {ok:false,error:'Comércio indisponível.'};
 const oldRank=rank(wheatState.progress.xp),q=commitTrade(wheatState,id,action,quantity,json=>localStorage.setItem(WHEAT_SAVE,json));
 if(q.ok){wheatState=q.next;farmCache.clear();wheatSaveError='';updateWheat(Date.now(),true);farmAudio.action('trade');progressNotice(oldRank);}
 return q;
}
function renderAnimalMarket(grid){const card=document.createElement('article');card.className='market-card';card.dataset.animalMarket='true';const content=ruralSection(card,'market:animals','🐄','Produtos da criação',false);for(const [id,p] of Object.entries(PRODUCTS)){const line=document.createElement('small');line.textContent=p.icon+' '+p.name+' · '+wheatState.husbandry.products[id];const b=document.createElement('button');b.type='button';b.textContent='Vender · '+p.price*tradeQuantity+' 🪙';b.disabled=wheatSaveLocked||!stationNearby(marketStation)||wheatState.husbandry.products[id]<tradeQuantity;b.onclick=()=>{if(!inventoryDialog.open||inventoryCategory!=='market'||!stationNearby(marketStation)||wheatSaveLocked)return;const ok=progressCommit(next=>{const q=husbandryAction(next,'sell',id,Math.floor(worldElapsed()),tradeQuantity);if(!q)return false;Object.assign(next,q.next);record(next.progress,'sell',{units:tradeQuantity,value:p.price*tradeQuantity});return true;});if(ok)farmAudio.action('trade');$('inventory-message').textContent=ok?'Venda salva.':'Não foi possível vender.';renderInventory(true);};content.append(line,b);}grid.append(card);}
function renderFishMarket(grid){const card=document.createElement('article');card.className='market-card';card.dataset.fishMarket='true';const name=document.createElement('strong');name.textContent='🐟 Peixe de rio';const count=document.createElement('small');count.textContent='Mochila: '+wheatState.fishery.fish;const b=document.createElement('button');b.type='button';b.textContent='Vender · '+FISH_PRICE*tradeQuantity+' 🪙';b.disabled=wheatSaveLocked||!stationNearby(marketStation)||wheatState.fishery.fish<tradeQuantity;b.onclick=()=>{if(!inventoryDialog.open||inventoryCategory!=='market'||!stationNearby(marketStation)||wheatSaveLocked)return;const q=sellFish(wheatState,tradeQuantity,json=>localStorage.setItem(WHEAT_SAVE,json));if(q.ok){wheatState=q.next;farmAudio.action('trade');}$('inventory-message').textContent=q.ok?'Venda salva.':q.error;renderInventory(true);};card.append(name,count,b);grid.append(card);}
function renderResourceStock(grid,category){
 const station=category==='market'?marketStation:warehouseStation,near=stationNearby(station),card=document.createElement('article');card.className='market-card';card.dataset.resources=category;
 const content=ruralSection(card,'resources:'+category,'🪵','Recursos naturais');
 for(const [id,name] of Object.entries(RESOURCE_LABELS)){const held=wheatState.warehouse?.resources?.[id]??0,count=wheatState.nature[id]??0,label=document.createElement('small');label.textContent=resourceIcons[id]+' '+name+' · Mochila '+count+(category==='warehouse'?' · Armazém '+held:'');content.append(label);
 const buttons=document.createElement('div');buttons.className='market-buttons';
 for(const [dir,caption] of category==='market'?[['sell','🪙 Vender · '+RESOURCE_PRICES[id]*tradeQuantity]]:[['deposit','↓ Guardar '+tradeQuantity],['withdraw','↑ Retirar '+tradeQuantity]]){
 const b=document.createElement('button');b.type='button';b.textContent=caption;b.dataset.resource=id+':'+dir;b.disabled=!near||wheatSaveLocked||(dir==='withdraw'?held:count)<tradeQuantity;
 b.onclick=()=>{if(!inventoryDialog.open||inventoryCategory!==category||!stationNearby(station)||wheatSaveLocked)return;const write=json=>localStorage.setItem(WHEAT_SAVE,json),q=category==='market'?resourceTrade(wheatState,id,tradeQuantity,write):transferResources(wheatState,id,dir,tradeQuantity,write);
 if(q.ok){wheatState=q.next;farmAudio.action('trade');}
 $('inventory-message').textContent=q.ok?(category==='market'?'Venda salva.':'Transferência salva.'):q.error;renderInventory(true);};buttons.append(b);
 }content.append(buttons);
 }grid.append(card);
}
function renderMarket(){
 const grid=$('inventory-items');grid.replaceChildren();renderResourceStock(grid,'market');renderFishMarket(grid);renderAnimalMarket(grid);const goodsCard=document.createElement('article');goodsCard.className='market-card';const goodsPanel=ruralSection(goodsCard,'market:artisan','🧺','Produtos preparados',false);for(const [id,g] of Object.entries(GOODS)){const count=wheatState.household.goods[id]??0;goodsPanel.append(progressEl('small',g.name+' · '+count),progressButton('Vender · '+g.price*tradeQuantity+' moedas',()=>{const ok=householdAction('sell',id,tradeQuantity);$('inventory-message').textContent=ok?'Venda salva.':'Venda indisponível.';renderInventory(true);},wheatSaveLocked||!stationNearby(marketStation)||count<tradeQuantity));}grid.append(goodsCard);const fruitCard=document.createElement('article');fruitCard.className='market-card';const fruitPanel=ruralSection(fruitCard,'market:orchard','🍎','Pomar · mudas e frutos',false);for(const [id,p] of Object.entries(FRUITS)){fruitPanel.append(progressEl('small',p.icon+' '+p.tree+' · mudas '+wheatState.orchard.seeds[id]+' · frutos '+wheatState.orchard.fruit[id]),progressButton('Comprar muda · '+p.seedPrice*tradeQuantity+' moedas',()=>{const ok=orchardAction('buy',id,tradeQuantity);$('inventory-message').textContent=ok?'Muda comprada. Selecione em Sementes.':'Compra indisponível.';renderInventory(true);},wheatSaveLocked||!stationNearby(marketStation)||wheatState.coins<p.seedPrice*tradeQuantity),progressButton('Vender fruto · '+p.price*tradeQuantity+' moedas',()=>{const ok=orchardAction('sell',id,tradeQuantity);$('inventory-message').textContent=ok?'Venda salva.':'Venda indisponível.';renderInventory(true);},wheatSaveLocked||!stationNearby(marketStation)||wheatState.orchard.fruit[id]<tradeQuantity));}grid.append(fruitCard);
 for(const [id,supply] of Object.entries(SUPPLIES)){const card=document.createElement('article');card.className='market-card';card.dataset.supply=id;const name=document.createElement('strong');name.textContent=supply.name;const balance=document.createElement('small');balance.textContent=wheatSaveLocked?'Estoque indisponível':'Mochila: '+wheatState[id];const b=document.createElement('button');b.type='button';b.dataset.trade='buy';b.textContent='Comprar · '+supply.buy*tradeQuantity+' 🪙';b.disabled=wheatSaveLocked||!quoteSupply(wheatState,id,tradeQuantity).ok;b.onclick=()=>{if(wheatSaveLocked||!inventoryDialog.open||inventoryCategory!=='market')return;const res=commitSupply(wheatState,id,tradeQuantity,json=>localStorage.setItem(WHEAT_SAVE,json));if(res.ok){wheatState=res.next;farmCache.clear();updateWheat(Date.now(),true);farmAudio.action('trade');}$('inventory-message').textContent=res.ok?'Compra realizada: '+supply.name:res.error;renderInventory(true);};card.append(name,balance,b);grid.append(card);}
 for(const [id,price] of Object.entries(PRICES)){
  const stock=stockFor(wheatState,id),card=document.createElement('article');card.className='market-card';card.dataset.market=id;
  const name=document.createElement('strong');name.textContent=CROP_CALENDAR[id].name;
  const balance=document.createElement('small');balance.textContent=wheatSaveLocked?'Estoque indisponível':stock.seeds+' sementes · '+stock.grain+' colhidos';
  const buttons=document.createElement('div');buttons.className='market-buttons';
  for(const [action,label] of [['buy','Comprar sementes'],['sell','Vender colheita']]){
   const b=document.createElement('button'),q=quoteTrade(wheatState,id,action,tradeQuantity);b.type='button';b.dataset.trade=action;b.textContent=label+' · '+price[action]*tradeQuantity+' 🪙';b.disabled=wheatSaveLocked||!q.ok;
   b.onclick=()=>{const res=applyTrade(id,action,tradeQuantity);$('inventory-message').textContent=res.ok?(action==='buy'?'Compra realizada: ':'Venda realizada: ')+tradeQuantity+' × '+CROP_CALENDAR[id].name+' · '+res.total+' moedas.':res.error;renderInventory(true);};buttons.append(b);
  }card.append(name,balance,buttons);grid.append(card);
 }
}
function craftConstruction(qty=1){
 if(!inventoryDialog.open||inventoryCategory!=='warehouse'||!stationNearby(warehouseStation)||wheatSaveLocked||buildError)return {ok:false,error:'Aproxime-se do armazém.'};
 const q=commitCraft(localStorage,wheatState,buildData,qty);if(q.ok){wheatState=q.farm;buildData=q.build;farmAudio.action('hammer');}
 else if(q.pending){wheatSaveLocked=true;buildError=q.error;craftRecoveryError=q.error;wheatSaveError=q.error;}
 return q;
}
function renderCrafting(grid){
 const card=document.createElement('article');card.className='market-card';card.dataset.craft='fence';const content=ruralSection(card,'warehouse:craft','🔨','Oficina · peças de cerca');const cost=document.createElement('small');cost.textContent=FENCE_RECIPE.wood+' madeira + '+FENCE_RECIPE.stone+' pedra por peça · estoque '+buildData.stock;const b=document.createElement('button');b.type='button';const qty=Math.min(99,tradeQuantity);b.textContent='🔨 Fabricar '+qty+' peça(s)';b.disabled=wheatSaveLocked||!!buildError||!stationNearby(warehouseStation)||!craftFence(wheatState,buildData,qty);b.onclick=()=>{const q=craftConstruction(qty);$('inventory-message').textContent=q.ok?'Peças fabricadas e salvas.':q.error;renderInventory(true);};content.append(cost,b);grid.append(card);
 const artisan=document.createElement('article');artisan.className='market-card';const panel=ruralSection(artisan,'warehouse:artisan','⚒','Oficina · beneficiamento',false);renderHomeRecipes(panel,'workshop',ok=>{$('inventory-message').textContent=ok?'Operação da oficina salva.':'Materiais insuficientes, fila cheia ou oficina distante.';renderInventory(true);});grid.append(artisan);
}
function renderWarehouse(){
 const grid=$('inventory-items');grid.replaceChildren();const canTransfer=stationNearby(warehouseStation);renderResourceStock(grid,'warehouse');renderCrafting(grid);
 if(!canTransfer){const notice=document.createElement('p');notice.className='market-card';notice.textContent=warehouseStation?'Consulta de estoque. Vá ao armazém do rancho para guardar ou retirar itens.':'Armazém ainda não construído. Estoque preservado; as transferências serão liberadas quando você construir o armazém.';grid.append(notice);}
 const supplies=document.createElement('article');supplies.className='market-card';supplies.dataset.warehouse='supplies';const heading=document.createElement('strong');heading.textContent='Insumos agrícolas';supplies.append(heading);for(const [kind,info] of Object.entries(SUPPLIES)){const held=wheatState.warehouse?.supplies?.[kind]??0,label=document.createElement('small');label.textContent=info.name+' · Mochila '+wheatState[kind]+' · Armazém '+held;supplies.append(label);const buttons=document.createElement('div');buttons.className='market-buttons';for(const [dir,name] of [['deposit','Guardar'],['withdraw','Retirar']]){const b=document.createElement('button');b.type='button';b.dataset.transfer=kind+':'+dir;b.textContent=name+' '+tradeQuantity;b.disabled=!canTransfer||wheatSaveLocked||(dir==='deposit'?wheatState[kind]:held)<tradeQuantity;b.onclick=()=>{if(!stationNearby(warehouseStation)||wheatSaveLocked||!inventoryDialog.open||inventoryCategory!=='warehouse')return;const q=transferWarehouse(wheatState,'supplies',kind,dir,tradeQuantity,json=>localStorage.setItem(WHEAT_SAVE,json));if(q.ok){wheatState=q.next;farmCache.clear();updateWheat(Date.now(),true);}$('inventory-message').textContent=q.ok?'Transferência salva.':q.error;renderInventory(true);};buttons.append(b);}supplies.append(buttons);}grid.append(supplies);
 for(const [id,crop] of Object.entries(CROP_CALENDAR)){const stock=stockFor(wheatState,id),stored=wheatState.warehouse?.[id]??{seeds:0,grain:0},card=document.createElement('article');card.className='market-card';card.dataset.warehouse=id;
 const title=document.createElement('strong');title.textContent=crop.name;card.append(title);
 for(const [kind,name] of [['seeds','Sementes'],['grain','Colheita']]){const label=document.createElement('small');label.textContent=name+' · Mochila '+stock[kind]+' · Armazém '+stored[kind];card.append(label);const buttons=document.createElement('div');buttons.className='market-buttons';
 for(const [direction,label] of [['deposit','Guardar'],['withdraw','Retirar']]){const b=document.createElement('button');b.type='button';b.dataset.transfer=kind+':'+direction;b.textContent=label+' '+tradeQuantity;b.disabled=!canTransfer||wheatSaveLocked||(direction==='deposit'?stock[kind]:stored[kind])<tradeQuantity;b.onclick=()=>{if(!stationNearby(warehouseStation)||wheatSaveLocked||!inventoryDialog.open||inventoryCategory!=='warehouse')return;const result=transferWarehouse(wheatState,id,kind,direction,tradeQuantity,json=>localStorage.setItem(WHEAT_SAVE,json));if(result.ok){wheatState=result.next;farmCache.clear();updateWheat(Date.now(),true);}$('inventory-message').textContent=result.ok?'Transferência salva.':result.error;renderInventory(true);};buttons.append(b);}card.append(buttons);}
 grid.append(card);}
}
function renderInventory(force=false){
 if(!inventoryDialog.open)return;
 const items=inventoryItems(),selected=selectedSpecies(),key=JSON.stringify([inventoryCategory,selected,selectedTreeSpecies,items,wheatState.coins,wheatState.warehouse,tradeQuantity,activeTool,stationNearby(warehouseStation)]);
 if(!force&&key===inventoryKey)return;inventoryKey=key;
 const grid=$('inventory-items');grid.replaceChildren();
 for(const button of inventoryDialog.querySelectorAll('[data-inventory-category]'))button.setAttribute('aria-pressed',String(button.dataset.inventoryCategory===inventoryCategory));
 $('inventory-coins').textContent=wheatSaveLocked?'Saldo indisponível':wheatState.coins+' moedas';$('inventory-market-qty').hidden=!['market','warehouse'].includes(inventoryCategory);grid.classList.toggle('market-grid',['market','warehouse'].includes(inventoryCategory));
 if(inventoryCategory==='market'){renderMarket();return;}if(inventoryCategory==='warehouse'){renderWarehouse();return;}if(inventoryCategory==='tools'){for(const [id,tool] of Object.entries(TOOL_CATALOG)){const card=document.createElement('button');card.type='button';card.className='inventory-item';card.dataset.tool=id;card.setAttribute('aria-pressed',String(activeTool===id));const icon=document.createElement('span');icon.className='inventory-icon';icon.textContent=tool.icon;const title=document.createElement('strong');title.textContent=tool.name;const note=document.createElement('small');note.textContent=activeTool===id?'Equipado':tool.use;card.append(icon,title,note);card.onclick=()=>{$('inventory-message').textContent=selectTool(id)?tool.name+' equipado. Use a barra de ferramentas.':'Não foi possível salvar o equipamento.';renderInventory(true);};grid.append(card);}return;}
 for(const item of items.filter(i=>inventoryCategory==='all'||i.category===inventoryCategory)){
  const card=document.createElement(item.crop||item.treeSpecies||item.fruitSpecies?'button':'article');card.className='inventory-item';card.dataset.item=item.id;
  const icon=document.createElement('span');icon.className='inventory-icon';icon.textContent=item.icon;icon.setAttribute('aria-hidden','true');
  const label=document.createElement('strong');label.textContent=item.name;
  const count=document.createElement('span');count.className='inventory-count';count.textContent=item.count===null?'Indisponível':String(item.count);count.dataset.count=item.count===null?'unavailable':String(item.count);
  card.append(icon,label,count);
  if(item.crop){card.type='button';card.disabled=item.count===null||item.count===0;card.setAttribute('aria-pressed',String(selected===item.crop));card.onclick=()=>{if(card.disabled)return;cancelTreePlant();$('crop-select').value=item.crop;updateWheat(Date.now(),true);$('inventory-message').textContent='Semente selecionada: '+CROP_CALENDAR[item.crop].name+'. Aproxime-se do canteiro para plantar.';renderInventory(true);};}
  if(item.treeSpecies){card.type='button';card.disabled=item.count===null||item.count===0;card.setAttribute('aria-pressed',String(selectedTreeSpecies===item.treeSpecies));card.onclick=()=>{if(!card.disabled){selectTreePlant(item.treeSpecies);inventoryDialog.close();}};}
  if(item.fruitSpecies){card.type='button';card.disabled=item.count===null||item.count===0;card.onclick=()=>{if(!card.disabled&&selectFruitPlant(item.fruitSpecies))inventoryDialog.close();};}
  grid.append(card);
 }
 $('inventory-selected').textContent='Semente selecionada: '+CROP_CALENDAR[selected].name;
}
function openInventory(){
 if(inventoryDialog.open||ruralDialog.open||progressDialog.open||tillWork||entry.action||seating.phase!=='idle'||build.work||gateWork)return false;
 if(build.open)closeBuild();closeGarden();farmCenter.hidden=true;playerMenu.hidden=true;controlsMenu.hidden=true;$('ranch-panel').hidden=true;
 if(petSystem.interactionActive())petSystem.cancelInteraction();cancelInput();
 inventoryCategory='all';inventoryKey='';tradeQuantity=1;$('market-quantity').value='1';$('inventory-message').textContent='Selecione uma semente para preparar seu próximo plantio.';
 inventoryDialog.showModal();renderInventory(true);return true;
}
$('inventory-open').onclick=openInventory;$('inventory-close').onclick=()=>inventoryDialog.close();
inventoryDialog.addEventListener('close',()=>{cancelInput();updateWheat(Date.now(),true);});
for(const b of inventoryDialog.querySelectorAll('[data-inventory-category]'))b.onclick=()=>{inventoryCategory=b.dataset.inventoryCategory;$('inventory-message').textContent=inventoryCategory==='market'?'Feira agrícola · estoque e moedas reais.':'Selecione uma semente para preparar seu próximo plantio.';renderInventory(true);};
$('market-quantity').onchange=()=>{tradeQuantity=Number($('market-quantity').value);renderInventory(true);};
// Six new construction concessions outside the currently used agricultural sectors.
function landRect(a){const [u,v,u2,v2]=a.rect;return {x1:X(u),x2:X(u2),z1:Z(v2),z2:Z(v)};}
function landAt(x,z){return LAND.find(a=>{const r=landRect(a);return x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2;});}
function landBuildAllowed(x,z){const a=landAt(x,z);return !a||wheatState.progress.land.includes(a.id);}
const cycleNames={daily:'Diárias',weekly:'Semanais',monthly:'Mensais'},skillIcons={cultivo:'🌱',manejo:'🐾',floresta:'🌳',pesca:'🎣',construcao:'🔨',comercio:'🪙',mineracao:'⛏'},eventIcons={till:'⛏',plant:'🌱',water:'💧',harvest:'🌾',weed:'🌿',build:'🔨',paint:'🎨',care:'🐾',sell:'🪙',chop:'🪓',mine:'⛏',fish:'🎣',animalcollect:'🐄'};
let progressTab='summary',trackerKey='',missionCycle='daily';
const profileName=()=>String(wheatState.progress.profileName||'Meu personagem').slice(0,32),medal=l=>l>=50?'👑':l>=30?'🏆':l>=20?'🏅':l>=10?'🌻':l>=5?'🌾':'🌱';
function refreshProfile(){const p=wheatState.progress,l=rank(p.xp),xp=p.xp-threshold(l),max=threshold(l+1)-threshold(l);$('profile-name').textContent=profileName();$('profile-rank').textContent='Nv. '+l+' · '+title(l);$('profile-medal').textContent=medal(l);$('profile-fill').style.width=Math.min(100,100*xp/max)+'%';$('profile-xp-text').textContent=xp+' / '+max+' XP';}

function refreshMissionTracker(){
 const p=wheatState.progress,n=$('mission-tracker'),now=Math.max(Date.now(),p.lastReal);const calendar=$('world-calendar').getBoundingClientRect(),inv=$('inventory-open').getBoundingClientRect();n.style.top=Math.ceil(Math.max(calendar.bottom,inv.bottom)+5)+'px';
 const m=Object.values(p.missions).filter(m=>!m.claimed&&(m.end>now||m.done===m.target));
 const key=JSON.stringify(m.map(x=>[x.id,x.done,x.target]));if(key===trackerKey)return;trackerKey=key;n.replaceChildren();n.hidden=!m.length;if(!m.length)return;
 const heading=document.createElement('strong');heading.textContent='Missões ativas';n.append(heading);
 for(const a of m.slice(0,3)){const row=document.createElement('small');row.textContent=eventIcons[a.event]+' '+EVENTS[a.event][2]+' · '+a.done+'/'+a.target+(a.done===a.target?' ✓':'');n.append(row);}
 if(m.length>3){const row=document.createElement('small');row.textContent='+'+(m.length-3)+' no mural';n.append(row);}
}
function progressEl(tag,txt,cls){const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n;}
function progressButton(txt,fn,disabled=false){const b=progressEl('button',txt);b.type='button';b.disabled=disabled;b.onclick=fn;return b;}
function progressLine(root,name,xp){const l=rank(xp),row=progressEl('article',''),bar=document.createElement('progress');bar.max=threshold(l+1)-threshold(l);bar.value=Math.max(0,xp-threshold(l));row.append(progressEl('strong',name+' · Nv. '+l),bar,progressEl('small',xp+' XP total'));root.append(row);}
function progressAction(fn){const ok=progressCommit(fn);renderProgress();$('progress-status').textContent=ok?'Salvo.':'Ação indisponível ou falha ao salvar.';return ok;}
function statCard(root,icon,label,value){const c=progressEl('article','','rural-stat'),b=progressEl('b',value);c.append(progressEl('small',icon+' '+label),b);root.append(c);}
function sectionHeading(root,label){root.append(progressEl('div',label,'section-heading'));}
function renderProgress(){
 const p=wheatState.progress,root=$('progress-content'),now=Math.max(Date.now(),p.lastReal),missions=progressTab==='missions';root.replaceChildren();$('progress-tabs').hidden=missions;$('mission-tabs').hidden=!missions;$('progress-title').textContent=missions?'Mural de missões':'Perfil & Progressão';$('progress-emblem').textContent=missions?'📋':'🌿';
 for(const b of $('progress-tabs').querySelectorAll('[data-progress-tab]'))b.setAttribute('aria-pressed',String(b.dataset.progressTab===progressTab));
 for(const b of $('mission-tabs').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.cycle===missionCycle));
 if(wheatSaveLocked){root.append(progressEl('p','Save indisponível. Nenhuma alteração realizada.','wide'));return;}
 if(progressTab==='summary'){const l=rank(p.xp),hero=progressEl('article','','profile-card wide'),img=$('profile-portrait').cloneNode();img.removeAttribute('id');img.className='profile-large';const info=progressEl('div','','profile-info'),bar=document.createElement('progress');bar.max=threshold(l+1)-threshold(l);bar.value=p.xp-threshold(l);info.append(progressEl('strong',profileName()),progressEl('small',title(l)+' · Nível '+l),bar,progressEl('small',(p.xp-threshold(l))+' / '+bar.max+' XP · '+p.xp+' total'));hero.append(img,info,progressEl('span',medal(l),'medal-large'));root.append(hero);const name=document.createElement('input');name.maxLength=32;name.value=profileName();name.setAttribute('aria-label','Nome do personagem');const edit=progressEl('article','','wide');edit.append(name,progressButton('Salvar nome',()=>progressAction(n=>{const v=name.value.trim();if(!v)return false;n.progress.profileName=v.slice(0,32);return true;})));root.append(edit);statCard(root,'✦','Pontos de especialização',String(points(p)));statCard(root,'🤝','Reputação',reputationTitle(p.reputation));statCard(root,'🪙','Saldo',wheatState.coins+' moedas');statCard(root,'🏆','Conquistas',achievements(p).filter(x=>x[1]).length+' / '+achievements(p).length);}
 if(progressTab==='abilities'){for(const [id,name] of Object.entries(SKILLS)){progressLine(root,skillIcons[id]+' '+name,p.skills[id]);if(!ACTIVE_SKILLS.includes(id))root.lastChild.append(progressEl('small','Aguardando sistema correspondente'));}}
 if(progressTab==='skills'){sectionHeading(root,'✦ '+points(p)+' pontos disponíveis');for(const a of PERKS){const card=progressEl('article','');card.append(progressEl('strong',skillIcons[a.skill]+' '+a.name),progressEl('small',SKILLS[a.skill]+' · grau '+a.level),progressEl('small',a.description+(a.requires?' · requer '+PERKS.find(b=>b.id===a.requires).name:'')));const owned=p.perks.includes(a.id);card.append(progressButton(owned?'✓ Aprendida':'Aprender · 1 ponto',()=>progressAction(n=>unlock(n.progress,a.id)),owned||points(p)<1||rank(p.skills[a.skill])<a.level||!!a.requires&&!p.perks.includes(a.requires)));root.append(card);}}
 if(progressTab==='land'){sectionHeading(root,'🪙 '+wheatState.coins+' moedas · '+p.land.length+'/'+LAND.length+' terrenos');for(const [i,a] of LAND.entries()){const owned=p.land.includes(a.id),card=progressEl('article','');card.append(progressEl('strong',['🍎','🐄','💧','🌳','🌾','⛰'][i]+' '+a.name),progressEl('small',a.price+' moedas · nível '+a.level),progressButton(owned?'✓ Adquirido':'Comprar terreno',()=>progressAction(n=>buyLand(n,a.id)),owned||rank(p.xp)<a.level||wheatState.coins<a.price));root.append(card);}}
 if(progressTab==='diary'){for(const [id,ev] of Object.entries(EVENTS))statCard(root,eventIcons[id]||'✦',ev[2],String(p.stats[id]||0));statCard(root,'🌱','Espécies colhidas',String(p.species.length));statCard(root,'🪙','Receita',String(p.stats.revenue||0));sectionHeading(root,'Histórico');for(const item of p.history.slice().reverse())root.append(progressEl('small',new Date(item.at).toLocaleDateString('pt-BR')+' · '+item.text,'wide'));}
 if(progressTab==='achievements'){sectionHeading(root,'🏆 Marcos da propriedade');for(const [name,done] of achievements(p)){const card=progressEl('article','');card.append(progressEl('strong',(done?'🏆 ':'◇ ')+name),progressEl('small',done?'Conquistado':'Em progresso'));root.append(card);}}
 if(progressTab==='reputation'){statCard(root,'🤝',reputationTitle(p.reputation),p.reputation+' pontos');sectionHeading(root,'Reconhecimento rural');for(const [name,n] of [['Produtor local',50],['Produtor confiável',200],['Referência regional',500],['Excelência rural',1000]]){const card=progressEl('article','');card.append(progressEl('strong',(p.reputation>=n?'✓ ':'◇ ')+name),progressEl('small',Math.min(p.reputation,n)+' / '+n+' pontos'));root.append(card);}root.append(progressEl('small','Evolua com vendas, colheitas especiais, cuidado dos pets e missões.','wide'));}
 if(missions){const available=offers(p,now),active=Object.values(p.missions).filter(m=>!m.claimed&&(m.end>now||m.done===m.target)),all=[...available.map(m=>p.missions[m.id]||m),...active.filter(m=>!available.some(a=>a.id===m.id))];sectionHeading(root,cycleNames[missionCycle]+' · calendário real');
 for(const m of all.filter(m=>m.cycle===missionCycle)){const started=!!p.missions[m.id],card=progressEl('article','','mission-card'),info=progressEl('div','','mission-info');info.append(progressEl('strong',EVENTS[m.event][2]+' · '+m.target),progressEl('small','🪙 '+m.reward+' moedas · até '+new Date(m.end-1).toLocaleDateString('pt-BR')),progressEl('small',m.claimed?'✓ Resgatada':started?m.done+'/'+m.target:'Disponível','mission-state'));card.append(progressEl('span',eventIcons[m.event]||'📋','mission-icon'),info);
 if(m.claimed)card.append(progressEl('small','✓'));else if(started&&m.done>=m.target)card.append(progressButton('Resgatar',()=>{if(stationNearby(missionStation))progressAction(n=>claim(n,m.id));}));else if(started)card.append(progressEl('small','Em andamento'));else card.append(progressButton('Aceitar',()=>{if(stationNearby(missionStation))progressAction(n=>accept(n.progress,m.id));}));if(started){const bar=document.createElement('progress');bar.max=m.target;bar.value=m.done;card.append(bar);}root.append(card);}}
}
function openProgress(tab='summary'){if(regionalOpen||titleMode||photoMode||progressDialog.open||ruralDialog.open||inventoryDialog.open||tillWork||entry.action||seating.phase!=='idle'||build.work||gateWork||tab==='missions'&&!stationNearby(missionStation))return false;if(build.open)closeBuild();if(petSystem.interactionActive())petSystem.cancelInteraction();cancelInput();playerMenu.hidden=true;controlsMenu.hidden=true;closeGarden();farmCenter.hidden=true;progressTab=tab;missionCycle='daily';$('progress-status').textContent='';progressDialog.showModal();renderProgress();return true;}
$('profile-hud').onclick=()=>openProgress();$('mission-open').onclick=()=>openProgress('missions');$('progress-close').onclick=()=>progressDialog.close();progressDialog.addEventListener('close',cancelInput);
for(const b of $('progress-tabs').querySelectorAll('[data-progress-tab]'))b.onclick=()=>{progressTab=b.dataset.progressTab;renderProgress();};
$('progress-collapse').onclick=()=>{const nav=$('progress-tabs'),collapsed=nav.classList.toggle('collapsed');$('progress-collapse').setAttribute('aria-expanded',String(!collapsed));$('progress-collapse').setAttribute('aria-label',collapsed?'Expandir categorias':'Recolher categorias');$('progress-collapse').querySelector('span').textContent=collapsed?'›':'‹';};
for(const b of $('mission-tabs').querySelectorAll('[data-cycle]'))b.onclick=()=>{missionCycle=b.dataset.cycle;renderProgress();};
function showUpdateStatus(value,available){const label=String(value).slice(0,60);for(const id of ['updates-state','title-update-state']){const node=$(id);if(node.textContent!==label)node.textContent=label;}if(typeof available==='boolean'){for(const id of ['menu-open','title-updates'])$(id).dataset.update=String(available);}}
function syncUpdateStatus(){try{if(window.CVAndroid?.updateStatus){const status=JSON.parse(window.CVAndroid.updateStatus());if(typeof status.text==='string'&&typeof status.available==='boolean')showUpdateStatus(status.text,status.available);}}catch{}}
function openUpdateCenter(feedback){try{if(typeof window.CVAndroid?.openUpdates==='function'){window.CVAndroid.openUpdates();return;}$(feedback).textContent='Central de atualizações disponível no aplicativo Android.';}catch{$(feedback).textContent='Não foi possível abrir a central de atualizações. Tente novamente.';}}
$('menu-open').addEventListener('click',syncUpdateStatus);$('title-updates').onclick=()=>openUpdateCenter('title-feedback');$('updates-open').onclick=()=>openUpdateCenter('menu-feedback');syncUpdateStatus();setInterval(syncUpdateStatus,1000);
window.cvUpdateStatus=value=>{showUpdateStatus(value);};
refreshProfile();refreshMissionTracker();setInterval(()=>{refreshProfile();refreshMissionTracker();if(progressDialog.open&&progressTab==='missions'&&!stationNearby(missionStation))progressDialog.close();},1000);
// Regional atlas uses the live Babylon scene. No baked landscape image or second render loop.
const regionalCamera=new ArcRotateCamera('regional live north-up',-Math.PI/2,.012,300,V((minX+maxX)/2,0,(minZ+maxZ)/2),scene);regionalCamera.mode=1;regionalCamera.inputs.clear();
let regionalZoom=1,regionalCenter=V((minX+maxX)/2,0,(minZ+maxZ)/2),regionalRoof=[],regionalCrop=null,regionalMark=false,regionalDrag=null,regionalLabelKey='';
const regionalQA={opens:0,closes:0,cropPlots:0};
function regionalFit(){const aspect=engine.getRenderWidth()/Math.max(1,engine.getRenderHeight()),wide=Math.max(maxX-minX,(maxZ-minZ)*aspect)*1.08/regionalZoom;regionalCamera.setTarget(regionalCenter);regionalCamera.alpha=-Math.PI/2;regionalCamera.beta=.012;regionalCamera.radius=300;regionalCamera.orthoLeft=-wide/2;regionalCamera.orthoRight=wide/2;regionalCamera.orthoTop=wide/aspect/2;regionalCamera.orthoBottom=-wide/aspect/2;regionalLabelKey='';}
function regionalCrops(){if(regionalCrop)regionalCrop.dispose();const pos=[],idx=[],co=[],uv=[];const now=Date.now();regionalQA.cropPlots=0;for(const p of allFarmPlots){if(!p||!p.id)continue;const stage=wheatStatus(p.id,now),saved=evaluatedPlot(p.id,now);if(renderFarmSector.plots.includes(p)||stage==='raw')continue;const color=stage==='tilled'?[.50,.32,.19]:stage==='ripe'?[.76,.64,.20]:[.28,.53,.20],k=pos.length/3;for(const [x,z] of [[p.x1,p.z1],[p.x2,p.z1],[p.x1,p.z2],[p.x2,p.z2]]){pos.push(x,Math.max(height(x,z),renderedTerrainY(x,z))+.075,z);co.push(...color,1);uv.push(x,z);}idx.push(k,k+2,k+1,k+1,k+2,k+3);if(saved&&stage!=='raw')regionalQA.cropPlots++;}
 if(!idx.length)return;regionalCrop=new Mesh('regional live plot state',scene);const d=new VertexData();d.positions=pos;d.indices=idx;d.colors=co;d.uvs=uv;d.normals=Array.from({length:pos.length},(_,i)=>i%3===1?1:0);d.applyToMesh(regionalCrop);regionalCrop.material=wheatSoil;regionalCrop.isPickable=false;}
const regionalLayers={crops:true,poi:true,land:false,zones:true,markers:true,fishing:true};let regionalInfoKey='',selectedFishingId=null;
function selectFishingPoint(f){if(!regionalOpen||!fishingSpots.includes(f))return false;selectedFishingId=f.id;regionalLayers.fishing=true;const panel=$('regional-info');panel.hidden=false;$('regional-info-toggle').setAttribute('aria-expanded','true');panel.querySelector('[data-map-layer=fishing]').checked=true;regionalCenter=V(f.x,0,f.z);regionalZoom=4;regionalFit();regionalInfoKey='';regionalInfo();return true;}
function regionalInfo(){if(!regionalOpen||$('regional-info').hidden)return;const p=wheatState.progress,now=Math.max(Date.now(),p.lastReal),c=calendarAt(worldElapsed(now)),current=offers(p,now),accepted=Object.values(p.missions).filter(m=>!m.claimed&&(m.end>now||m.done===m.target)),key=JSON.stringify([c.day,c.month,c.year,c.hour,c.minute,current.map(m=>m.id),accepted.map(m=>[m.id,m.done]),p.land.length,fishingSpots.map(f=>fishingReady(wheatState.fishery,f.id,Math.floor(worldElapsed(now))))]);if(key===regionalInfoKey)return;regionalInfoKey=key;$('regional-calendar').textContent='☀ '+c.weekday+' · '+c.day+'/'+c.month+' · Ano '+c.year+' · '+c.season;$('regional-real-date').textContent='▦ Calendário real: '+new Date(now).toLocaleDateString('pt-BR');for(const cycle of ['daily','weekly','monthly']){const m=accepted.filter(m=>m.cycle===cycle),ready=m.filter(m=>m.done===m.target).length,available=current.filter(x=>x.cycle===cycle&&!p.missions[x.id]).length;$('regional-'+cycle).textContent=cycleNames[cycle]+': '+available+' disponíveis · '+m.length+' aceitas · '+ready+' prontas';}$('regional-land-info').textContent='▧ '+p.land.length+'/'+LAND.length+' terrenos adquiridos · '+farmSectors.length+' setores agrícolas';const list=$('regional-fishing-list');list.replaceChildren();for(const f of fishingSpots){const ready=fishingReady(wheatState.fishery,f.id,Math.floor(worldElapsed(now))),b=progressButton('🎣 '+f.name+' · '+(ready?'Disponível':'Recuperando'),()=>selectFishingPoint(f));b.dataset.fishingPoint=f.id;b.setAttribute('aria-pressed',String(f.id===selectedFishingId));list.append(b);}const selected=fishingSpots.find(f=>f.id===selectedFishingId);$('regional-selected').textContent=selected?selected.name+' · '+Math.round(Math.hypot(selected.x-avatar.position.x,selected.z-avatar.position.z))+' m em linha reta · '+(fishingReady(wheatState.fishery,selected.id,Math.floor(worldElapsed(now)))?'Ponto disponível':'Aguarde recuperação'):'Escolha um ponto para centralizar.';}
function regionalLabels(){if(!regionalOpen)return;regionalInfo();const el=$('regional-labels'),key=[regionalCenter.x,regionalCenter.z,regionalZoom,innerWidth,innerHeight,wheatState.progress.markers.length,JSON.stringify(regionalLayers),selectedFishingId,JSON.stringify(wheatState.installations),JSON.stringify(wheatState.extraPens),$('regional-info').hidden].join(':');if(key===regionalLabelKey)return;regionalLabelKey=key;el.replaceChildren();const occupied=[],panel=$('regional-info').hidden?null:$('regional-info').getBoundingClientRect();const add=(x,z,label,kind,point=null)=>{const v=projectWorld(V(x,height(x,z)+.2,z));if(v.x<12||v.x>innerWidth-12||v.y<44||v.y>innerHeight-48)return;const e=progressEl('span',label);e.dataset.kind=kind;if(point){e.dataset.fishingPin=point.id;e.setAttribute('role','button');e.tabIndex=0;e.setAttribute('aria-label','Localizar '+point.name);e.setAttribute('aria-pressed',String(point.id===selectedFishingId));e.onclick=()=>selectFishingPoint(point);e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectFishingPoint(point);}};}el.append(e);const w=e.offsetWidth+4,h=e.offsetHeight+3;for(const [dx,dy] of [[0,0],[0,-22],[0,22],[-w/2,-18],[w/2,18],[0,-44],[0,44]]){const a={left:v.x+dx-w/2,right:v.x+dx+w/2,top:v.y+dy-h/2,bottom:v.y+dy+h/2};const hit=q=>a.left<q.right&&a.right>q.left&&a.top<q.bottom&&a.bottom>q.top;if(a.left<3||a.right>innerWidth-3||a.top<44||a.bottom>innerHeight-48||panel&&hit(panel)||occupied.some(hit))continue;e.style.left=(v.x+dx)+'px';e.style.top=(v.y+dy)+'px';occupied.push(a);return;}e.remove();};add(avatar.position.x,avatar.position.z,'● Você','player');if(regionalLayers.fishing)for(const f of fishingSpots)add(f.x,f.z,'🎣 '+f.name,'fishing',f);if(regionalLayers.poi){if(warehouseStation)add(warehouseStation.x,warehouseStation.z,'📦 Armazém','poi');if(livestockPen)add(livestockPen.station.x,livestockPen.station.z,'🐔 Piquete inicial','poi');for(const f of orchardModels)add(f.x,f.z,f.icon+' '+f.label,'poi');for(const z of ruralZones)add(z.x,z.z,z.icon+' '+z.name+(installationReady(wheatState.installations,z.id)?' ✓':' · projeto'),'zones');add(home.x,home.z,'⌂ '+ranchName,'poi');if(missionStation)add(missionStation.x,missionStation.z,'📋 Missões','poi');if(marketStation)add(marketStation.x,marketStation.z,'🪙 Feira','poi');}if(regionalLayers.markers)for(const m of wheatState.progress.markers)add(m.x,m.z,'⚑ '+m.name,'markers');if(regionalLayers.crops)for(const f of farmSectors){const x=f.polygon.reduce((n,p)=>n+p.x,0)/f.polygon.length,z=f.polygon.reduce((n,p)=>n+p.z,0)/f.polygon.length;add(x,z,'🌱 '+f.name,'crops');}if(regionalLayers.zones)for(const zone of layout.territory.zones){const [a,b,c,d]=zone.rect;add(X((a+c)/2),Z((b+d)/2),zone.icon+' '+zone.name,'zones');}if(regionalLayers.land)for(const a of LAND){const q=landRect(a);add((q.x1+q.x2)/2,(q.z1+q.z2)/2,(wheatState.progress.land.includes(a.id)?'✓ ':'▧ ')+a.name,'land');}}
$('regional-info-toggle').onclick=()=>{const e=$('regional-info');e.hidden=!e.hidden;$('regional-info-toggle').setAttribute('aria-expanded',String(!e.hidden));regionalInfoKey='';regionalLabelKey='';regionalInfo();};
for(const input of $('regional-info').querySelectorAll('[data-map-layer]'))input.onchange=()=>{regionalLayers[input.dataset.mapLayer]=input.checked;regionalLabelKey='';regionalBoundaries();};
let regionBounds=[];function regionalBoundaries(){for(const m of regionBounds)m.dispose();regionBounds=[];if(!regionalOpen||!regionalLayers.land)return;for(const a of LAND){const q=landRect(a),pts=[[q.x1,q.z1],[q.x2,q.z1],[q.x2,q.z2],[q.x1,q.z2],[q.x1,q.z1]].map(([x,z])=>V(x,height(x,z)+.23,z));const m=MeshBuilder.CreateLines('regional property '+a.id,{points:pts},scene);m.color=Color3.FromHexString(wheatState.progress.land.includes(a.id)?'#b4df83':'#e0bd73');m.isPickable=false;regionBounds.push(m);}}
function openRegional(){if(regionalOpen||titleMode||photoMode||inventoryDialog.open||progressDialog.open||ruralDialog.open||tillWork||resourceSwing||entry.action||build.work||gateWork)return false;if(build.open)closeBuild();if(petSystem.interactionActive())petSystem.cancelInteraction();cancelInput();playerMenu.hidden=true;controlsMenu.hidden=true;closeGarden();farmCenter.hidden=true;regionalOpen=true;regionalQA.opens++;regionalZoom=1;regionalCenter=V((minX+maxX)/2,0,(minZ+maxZ)/2);regionalRoof=[];for(const id of ['house','house-roof','house-front','house-porch-roof','house-door'])for(const m of groups[id]||[]){regionalRoof.push([m,m.isEnabled(),m.visibility]);m.setEnabled(true);m.visibility=1;}regionalCrops();$('regional-title').textContent='Mapa regional · '+ranchName;document.body.classList.add('regional-mode');$('regional-map').hidden=false;scene.activeCamera=regionalCamera;regionalFit();regionalBoundaries();syncExpansionVisibility();shadowMap.resetRefreshCounter();return true;}
function closeRegional(){if(!regionalOpen)return false;regionalOpen=false;selectedFishingId=null;regionalInfoKey='';regionalBoundaries();$('regional-info').hidden=true;$('regional-info-toggle').setAttribute('aria-expanded','false');regionalQA.closes++;scene.activeCamera=camera;for(const [m,on,visibility] of regionalRoof){m.setEnabled(on);m.visibility=visibility;}regionalRoof=[];if(regionalCrop){regionalCrop.dispose();regionalCrop=null;}$('regional-map').hidden=true;document.body.classList.remove('regional-mode');$('regional-marker-list').hidden=true;regionalDrag=null;regionalMark=false;$('regional-marker-name').hidden=true;$('regional-help').textContent='Norte ↑ · arraste para explorar';syncExpansionVisibility();shadowMap.resetRefreshCounter();cancelInput();resetPerf();return true;}
const mapButton=$('minimap').querySelector('.map-layers');mapButton.onclick=openRegional;mapButton.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRegional();}};
$('regional-close').onclick=closeRegional;$('regional-plus').onclick=()=>{regionalZoom=Math.min(5,regionalZoom*1.35);regionalFit();};$('regional-minus').onclick=()=>{regionalZoom=Math.max(1,regionalZoom/1.35);regionalFit();};$('regional-center').onclick=()=>{regionalCenter=V((minX+maxX)/2,0,(minZ+maxZ)/2);regionalZoom=1;regionalFit();};
$('regional-mark').onclick=()=>{regionalMark=!regionalMark;$('regional-marker-name').hidden=!regionalMark;$('regional-help').textContent=regionalMark?'Toque no terreno para salvar um marcador':'Norte ↑ · arraste para explorar';};
function showRegionalMarks(){const root=$('regional-marker-list');root.replaceChildren();for(const [i,m] of wheatState.progress.markers.entries())root.append(progressButton('Remover '+m.name,()=>{progressCommit(n=>{n.progress.markers.splice(i,1);return true;});regionalLabelKey='';showRegionalMarks();}));if(!root.children.length)root.textContent='Nenhum marcador.';}
$('regional-marks').onclick=()=>{const p=$('regional-marker-list');p.hidden=!p.hidden;if(!p.hidden)showRegionalMarks();};const drag=$('regional-drag');drag.onpointerdown=e=>{if(regionalDrag)return;regionalDrag={id:e.pointerId,x:e.clientX,y:e.clientY,total:0};drag.setPointerCapture(e.pointerId);};drag.onpointermove=e=>{if(regionalDrag?.id!==e.pointerId)return;const dx=e.clientX-regionalDrag.x,dy=e.clientY-regionalDrag.y;regionalDrag.x=e.clientX;regionalDrag.y=e.clientY;regionalDrag.total+=Math.hypot(dx,dy);if(regionalMark)return;const scale=(regionalCamera.orthoRight-regionalCamera.orthoLeft)/innerWidth;regionalCenter.x=Math.max(minX,Math.min(maxX,regionalCenter.x-dx*scale));regionalCenter.z=Math.max(minZ,Math.min(maxZ,regionalCenter.z+dy*scale));regionalFit();};drag.onpointerup=e=>{if(regionalDrag?.id!==e.pointerId)return;const was=regionalDrag;regionalDrag=null;if(regionalMark&&was.total<10){const scale=(regionalCamera.orthoRight-regionalCamera.orthoLeft)/innerWidth,x=regionalCenter.x+(e.clientX-innerWidth/2)*scale,z=regionalCenter.z-(e.clientY-innerHeight/2)*scale;if(x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ)progressCommit(n=>{if(n.progress.markers.length>=20)return false;n.progress.markers.push({x,z,name:$('regional-marker-name').value.trim().slice(0,32)||'Marcador '+(n.progress.markers.length+1)});return true;});regionalMark=false;$('regional-marker-name').hidden=true;$('regional-marker-name').value='';regionalLabelKey='';$('regional-help').textContent='Norte ↑ · arraste para explorar';}};drag.onpointercancel=()=>regionalDrag=null;
window.addEventListener('resize',()=>{if(regionalOpen)regionalFit();});window.addEventListener('keydown',e=>{if(regionalOpen&&e.key==='Escape')closeRegional();});scene.onAfterRenderObservable.add(regionalLabels);
// Ground-floor functional furnishings: preserve the approved shell and central circulation.
const ruralFixtures=[],pondStations=[];let domesticRun=null;const domesticQA={completed:0,last:null};
function roomFixture(id,label,icon,x,z,hx,hz,craft,floor=1){
 const base=floor===2?UPPER_Y:STAIR.ground,p=home.C(x,base,z),f={id,label,icon,x:p.x,z:p.z,y:p.y,hx,hz,yaw:home.angle,floor,local:{x,z,hx,hz}};
 entity('interior '+id);const B=(n,a,b,c,w,h,d,m)=>{const q=home.C(x+a,base+b,z+c);const mesh=box(id+' '+n,q.x,q.y,q.z,w,h,d,m,home.angle);const cast=(shadow.getShadowMap().renderList||[]).includes(mesh);residenceShadowState.members.set(mesh,{cast,active:cast,receive:mesh.receiveShadows});return mesh;};
 craft(B);if(floor===2)upperFixtures.push(f);else worldFixtures.push(f);ruralFixtures.push(f);return f;
}
const bedFixture=roomFixture('bed','Dormir','🌙',5.7,3.05,.85,1.1,B=>{B('timber frame',0,.24,0,1.66,.36,2.12,M.woodDark);B('mattress',0,.51,0,1.52,.22,1.96,M.plaster);B('quilt',0,.65,-.28,1.50,.07,1.3,M.leaf2);B('pillow',0,.69,.69,.70,.16,.38,M.white);B('headboard',0,.72,1.03,1.7,1.0,.13,M.wood);},2);
const wardrobeFixture=roomFixture('wardrobe','Guarda-roupa','👕',5.8,1.40,.62,.48,B=>{B('cabinet',0,1.05,0,1.16,2.10,.9,M.wood);for(const d of [-1,1]){B('door',d*.29,1.05,-.47,.56,1.98,.06,M.woodLight);B('handle',d*.10,1.05,-.52,.045,.17,.05,M.black);}},2);
roomFixture('kitchen','Cozinha','🍳',KITCHEN_FIXTURES.kitchen.x,KITCHEN_FIXTURES.kitchen.z,KITCHEN_FIXTURES.kitchen.hx,KITCHEN_FIXTURES.kitchen.hz,B=>{B('counter',0,.45,0,2.65,.90,1.06,M.wood);B('stone worktop',0,.95,0,2.75,.14,1.13,M.stoneLight);B('stove',-.78,1.06,0,.83,.08,.78,M.black);for(const d of [-1,1])B('burner',-.78+d*.18,1.12,0,.20,.035,.20,M.stone);B('sink',.73,1.05,0,.80,.08,.62,M.stone);});
const sofaFixture=roomFixture('sofa','Sofá','🪑',5.5,-.6,1.05,.55,B=>{B('base',0,.27,0,2.1,.40,1.05,M.woodDark);B('seat',0,.56,-.05,1.8,.24,.86,M.leaf);B('back',0,.85,.44,2.1,.72,.22,M.leaf);for(const d of [-1,1])B('armrest',d*.94,.72,0,.22,.38,.98,M.leaf);});
allBenches.push({kind:'sofa',id:sofaFixture.id,x:sofaFixture.local.x,z:sofaFixture.local.z,hx:sofaFixture.hx,hz:sofaFixture.hz,world:false});
roomFixture('bath','Lavar as mãos','💧',5.5,-3.2,.64,.65,B=>{B('vanity',0,.45,0,1.16,.90,1.13,M.woodLight);B('basin',0,.96,0,.93,.16,.73,M.white);B('tap',0,1.14,.27,.10,.34,.10,M.stone);},2);
// Complementary furniture uses real floor-aware footprints, not scenery-only decals.
roomFixture('shower','Tomar banho','🚿',4.15,-3.35,.46,.62,B=>{B('ceramic tray',0,.065,0,.90,.13,1.22,M.white);B('back tiled panel',0,1.05,-.55,.90,2.10,.09,M.white);B('side tile panel',-.41,1.02,0,.08,2.04,1.12,M.plaster);B('metal shower pipe',0,1.47,-.45,.065,.94,.065,M.stone);B('shower arm',0,1.94,-.27,.065,.065,.38,M.stone);B('shower head',0,1.87,-.09,.24,.075,.24,M.stoneLight);B('drain',0,.145,0,.16,.025,.16,M.black);},2);
roomFixture('toilet','Usar banheiro','🚽',6.35,-1.0,.38,.48,B=>{B('ceramic pedestal',0,.22,.08,.46,.43,.55,M.white);B('bowl',0,.47,-.07,.66,.21,.74,M.white);B('seat rim',0,.59,-.07,.61,.07,.68,M.plaster);B('water tank',0,.81,.30,.59,.64,.31,M.white);B('flush button',.14,1.15,.30,.10,.04,.09,M.stoneLight);B('hinged lid',0,.65,-.07,.62,.055,.68,M.white);},2);
roomFixture('fridge','Geladeira','🧊',KITCHEN_FIXTURES.fridge.x,KITCHEN_FIXTURES.fridge.z,KITCHEN_FIXTURES.fridge.hx,KITCHEN_FIXTURES.fridge.hz,B=>{B('cabinet',0,.99,0,.72,1.98,.80,M.stoneLight);B('lower door',0,.67,-.425,.69,1.20,.07,M.white);B('upper door',0,1.64,-.425,.69,.66,.07,M.white);B('lower handle',-.24,.86,-.49,.07,.27,.08,M.stone);B('upper handle',-.24,1.54,-.49,.07,.20,.08,M.stone);});
roomFixture('coffee-table','Mesa de centro','🪵',5.45,-2.27,.65,.40,B=>{B('tabletop',0,.58,0,1.30,.12,.80,M.woodLight);for(const x of [-.53,.53])for(const z of [-.28,.28])B('leg',x,.26,z,.11,.52,.11,M.woodDark);B('book',.18,.67,.04,.27,.055,.20,M.leaf2);});
roomFixture('living-shelf','Estante','📚',6.50,-3.45,.36,.46,B=>{B('back panel',0,.91,.38,.70,1.82,.08,M.wood);for(const x of [-.32,.32])B('upright',x,.91,0,.08,1.82,.86,M.woodDark);for(const y of [.10,.65,1.20,1.78])B('shelf',0,y,0,.72,.09,.86,M.woodLight);for(let i=0;i<4;i++)B('book',-.21+i*.12,1.36,.08,.09,.28,.32,i%2?M.leaf2:M.roof);});
roomFixture('dining-table','Mesa de jantar','🍽️',1.80,2.82,.68,.53,B=>{B('tabletop',0,.84,0,1.36,.13,1.06,M.woodLight);for(const x of [-.55,.55])for(const z of [-.40,.40])B('table leg',x,.38,z,.13,.76,.13,M.woodDark);B('table runner',0,.915,0,.29,.025,.91,M.plaster);});
function ruralNearby(){const p=homeLocal(avatar.position.x,avatar.position.z),distance=f=>Object.hasOwn(KITCHEN_FIXTURES,f.id)?kitchenAccessDistance(p,f.id):Math.hypot(f.x-avatar.position.x,f.z-avatar.position.z);return [...ruralFixtures.filter(f=>['bed','wardrobe','kitchen','bath','shower','toilet','fridge'].includes(f.id)),...interiorDoors,...fishingSpots,...ruralZones.map(z=>z.station),...pondStations,...(workerBoard?[workerBoard]:[]),...orchardModels,...nearbyWorkers()].filter(f=>stationNearby(f)).sort((a,b)=>distance(a)-distance(b))[0]||null;}
function sleepAtBed(minutes){if(![30,60,360].includes(minutes)||!stationNearby(bedFixture)||clockLocked)return false;const now=Date.now(),elapsed=worldElapsed(now)+minutes*REAL_MS_PER_GAME_MINUTE,next={...worldClock,anchor:now,offset:elapsed,floor:elapsed};try{localStorage.setItem(WORLD_KEY,JSON.stringify(next));}catch{return false;}worldClock=next;clockLastSave=now;farmCache.clear();updateWorldClock(now,true);updateWheat(now,true);updateGarden();return true;}
function ruralCard(root,label,detail,fn,disabled=false){const c=progressEl('article','','rural-action-card');c.append(progressEl('strong',label),progressEl('small',detail),progressButton('Confirmar',fn,disabled));root.append(c);return c;}
function changeAppearance(part,id){if(!ruralDialog.open||ruralNearby()?.id!=='wardrobe'||wheatSaveLocked)return false;const next=withAppearance(wheatState.appearance,part,id);if(!next)return false;if(!progressCommit(state=>{state.appearance=next;return true;}))return false;applyAvatarAppearance(next);return true;}
const appearanceLabels={skin:'Tom de pele',shirt:'Camisa',trousers:'Calça',hat:'Chapéu',hair:'Cabelo',eyes:'Olhos',beard:'Barba',boots:'Botas'};
// Shared rural UI: native disclosure, accessible title and stable state on rerender.
const ruralDisclosureState=new Map(),resourceIcons={wood:'🪵',stone:'🪨',saplings:'🌱',pinkSaplings:'🌸'},appearanceIcons={skin:'👤',shirt:'👕',trousers:'👖',hat:'👒',hair:'💇',eyes:'👁️',beard:'🧔',boots:'🥾'};
function ruralSection(root,key,icon,label,initial=true){
 const details=document.createElement('details');details.className='cv-rural-section';details.dataset.ruralSection=key;details.open=ruralDisclosureState.get(key)??initial;
 const summary=document.createElement('summary'),mark=progressEl('span',icon,'cv-section-icon');mark.setAttribute('aria-hidden','true');summary.append(mark,progressEl('span',label,'cv-section-title'));
 const content=progressEl('div','','cv-section-content');details.append(summary,content);
 details.addEventListener('toggle',()=>{if(details.isConnected)ruralDisclosureState.set(key,details.open);});root.append(details);return content;
}
function ruralMetrics(root,items){const group=progressEl('div','','cv-rural-metrics');for(const [icon,label,value] of items){const cell=progressEl('div','','cv-rural-metric');cell.append(progressEl('small',icon+' '+label),progressEl('strong',String(value)));group.append(cell);}root.append(group);return group;}
function renderWardrobe(root){const labels={original:'Original',clara:'Claro',media:'Médio',morena:'Moreno',escura:'Escuro',verde:'Verde',azul:'Azul',vinho:'Vinho',creme:'Creme',jeans:'Jeans',oliva:'Oliva',carvao:'Carvão',marrom:'Marrom',sem:'Sem chapéu',curto:'Curto',castanho:'Castanho',loiro:'Loiro',preto:'Preto',curta:'Curta',barba:'Barba cheia'};for(const [part,options] of Object.entries(PALETTES)){const card=ruralSection(root,'appearance:'+part,appearanceIcons[part],appearanceLabels[part],part==='shirt');const row=document.createElement('div');row.className='cv-choice-grid';for(const [id,color] of Object.entries(options)){const b=progressButton(labels[id],()=>{if(changeAppearance(part,id)){renderRural(wardrobeFixture);$('rural-status').textContent='Aparência salva.';}else $('rural-status').textContent='Não foi possível salvar a aparência.';},wheatSaveLocked);b.dataset.appearance=part+':'+id;b.setAttribute('aria-pressed',String(wheatState.appearance[part]===id));if(color){b.style.borderLeft='8px solid '+color;}if(wheatState.appearance[part]===id)b.style.outline='2px solid #c4db9b';row.append(b);}card.append(row);}root.append(progressEl('small','As alterações são aplicadas ao personagem atual e salvas neste mundo.'));}
function householdAction(action,id,qty=1){if(wheatSaveLocked)return false;const nearby=ruralNearby();const station=ruralDialog.open&&nearby?.id==='kitchen'?'kitchen':inventoryDialog.open&&inventoryCategory==='warehouse'&&stationNearby(warehouseStation)?'workshop':null;const next=['fridge-store','fridge-take'].includes(action)&&ruralDialog.open&&nearby?.id==='fridge'?transferFridge(wheatState,id,qty,action==='fridge-store'?'store':'take'):action==='craft'&&station==='workshop'?queueGood(wheatState,id,qty,Math.floor(worldElapsed())):action==='collect'&&station==='workshop'?collectGood(wheatState,id,Math.floor(worldElapsed())):action==='craft'&&station==='kitchen'?craftGood(wheatState,id,qty,station):action==='wash'&&ruralDialog.open&&['bath','shower','toilet'].includes(nearby?.id)?wash(wheatState,Math.floor(worldElapsed()),nearby.id==='bath'?'sink':nearby.id):action==='sell'&&inventoryDialog.open&&inventoryCategory==='market'&&stationNearby(marketStation)?sellGood(wheatState,id,qty):null;if(!next)return false;const ok=progressCommit(s=>{Object.assign(s,JSON.parse(JSON.stringify(next)));if(action==='sell')record(s.progress,'sell',{units:qty,value:GOODS[id].price*qty});return true;});if(ok){farmCache.clear();farmAudio.action(action==='wash'?'water':action==='sell'?'trade':'harvest');}return ok;}
function renderHomeRecipes(root,station,refresh){const workshop=station==='workshop',now=Math.floor(worldElapsed()),near=workshop?stationNearby(warehouseStation):true;if(workshop){const queue=ruralSection(root,'workshop:queue','⏳','Fila de produção',true);const jobs=wheatState.household.queue??[];queue.append(progressEl('small',jobs.length+'/8 pedidos · produção sequencial, inclusive fora do jogo'));for(const j of jobs){const row=progressEl('article','','rural-action-card'),label=GOODS[j.recipe]?.name||'Adubo orgânico',status=progressEl('small','');status.dataset.workshopEnd=String(j.end);const collect=progressButton('Recolher',()=>refresh(householdAction('collect',j.id)),wheatSaveLocked||!near||now<j.end);collect.dataset.workshopCollect=String(j.id);row.append(progressEl('strong',label+' × '+j.qty),status,collect);queue.append(row);}if(!jobs.length)queue.append(progressEl('small','Nenhum pedido ativo.'));}for(const [id,r] of Object.entries(RECIPES)){if(r.station!==station)continue;const qty=workshop?Math.min(99,tradeQuantity):1,card=progressEl('article','','rural-action-card');card.append(progressEl('strong',GOODS[id]?.name||'Adubo orgânico'),progressEl('small',recipeLabel(id)+' · '+qty+' lote(s) · estoque '+(id==='compost'?wheatState.compost:wheatState.household.goods[id]??0)+(workshop?' · '+WORKSHOP_MINUTES[id]*qty+' min rurais':'')),progressButton(workshop?'Adicionar à fila':'Produzir',()=>{const ok=householdAction('craft',id,qty);refresh(ok);},wheatSaveLocked||!near||!(workshop?queueGood(wheatState,id,qty,now):craftGood(wheatState,id,qty,station))));root.append(card);}if(workshop)refreshWorkshopQueue();}
function refreshWorkshopQueue(){if(!inventoryDialog.open||inventoryCategory!=='warehouse')return;const now=Math.floor(worldElapsed()),near=stationNearby(warehouseStation);for(const node of document.querySelectorAll('[data-workshop-end]')){const end=Number(node.dataset.workshopEnd),left=Math.max(0,Math.ceil((end-now)/5000));node.textContent=left?'Disponível em '+left+' min rurais':'Pronto para recolher';}for(const b of document.querySelectorAll('[data-workshop-collect]')){const j=(wheatState.household.queue??[]).find(x=>x.id===Number(b.dataset.workshopCollect));b.disabled=wheatSaveLocked||!near||!j||now<j.end;}}
setInterval(refreshWorkshopQueue,1000);
function renderRural(f){const root=$('rural-content');root.replaceChildren();ruralDialog.classList.toggle('staff-dialog',f.kind==='workers');root.scrollTop=0;$('rural-title').textContent=f.label;$('rural-emblem').textContent=f.icon;root.dataset.system=f.kind||f.id;if(wheatSaveLocked){root.append(progressEl('p','🔒 Dados indisponíveis. Seu progresso está protegido.'));return;}if(f.kind==='worker-talk'){renderWorkerTalk(f,root);}else if(f.kind==='workers'){renderWorkers(root);}else if(f.kind==='pond'){root.append(progressButton('Trocar água',()=>{ruralDialog.close();startDomestic(f);}));}else if(f.kind==='interior-door'){root.append(progressButton(f.target>.5?'Fechar porta':'Abrir porta',()=>{const ok=toggleInteriorDoor(f);if(ok)ruralDialog.close();else $('rural-status').textContent='Afaste-se um pouco da passagem.';}));}else if(f.id==='bed'){const panel=ruralSection(root,'bed:rest','🌙','Duração do descanso');for(const [minutes,label] of [[30,'30 minutos'],[60,'1 hora'],[360,'6 horas']])ruralCard(panel,'🌙 '+label,'Avança o relógio rural e os cultivos.',()=>{ruralDialog.close();startDomestic(f,minutes);});}else if(f.id==='wardrobe'){renderWardrobe(root);}else if(f.id==='kitchen'){renderHomeRecipes(root,'kitchen',ok=>{renderRural(f);$('rural-status').textContent=ok?'Receita preparada e guardada na mochila.':'Ingredientes insuficientes.';});}else if(f.id==='fridge'){const items=fridgeStock(wheatState),used=items.reduce((a,b)=>a+b.stored,0),panel=ruralSection(root,'fridge:stock','🧊','Geladeira · '+used+'/'+FRIDGE_CAPACITY+' unidades',true);panel.append(progressEl('small','Guarde e retire ingredientes. Retire para cozinhar; os itens não são duplicados.'));for(const item of items){const card=progressEl('article','','rural-action-card'),actions=document.createElement('div');actions.className='cv-choice-grid';const move=(direction)=>{const ok=householdAction('fridge-'+direction,item.key);renderRural(f);$('rural-status').textContent=ok?'Transferência salva.':'Sem espaço ou ingrediente indisponível.';};const put=progressButton('Guardar 1',()=>move('store'),item.bag<1||used>=FRIDGE_CAPACITY),take=progressButton('Retirar 1',()=>move('take'),item.stored<1);put.dataset.fridgeStore=item.key;take.dataset.fridgeTake=item.key;actions.append(put,take);card.append(progressEl('strong',item.label),progressEl('small','Mochila: '+item.bag+' · Geladeira: '+item.stored),actions);panel.append(card);}}else if(['bath','shower','toilet'].includes(f.id)){const field=f.id==='shower'?'lastShower':f.id==='toilet'?'lastToilet':'lastWash',last=wheatState.household[field],label=f.id==='shower'?'Tomar banho':f.id==='toilet'?'Usar vaso sanitário':'Lavar-se na pia';root.append(progressEl('small',last==null?'Ainda não utilizado.':'Último uso: '+calendarAt(last).day+'/'+calendarAt(last).month),progressButton(label,()=>{const ok=householdAction('wash');renderRural(f);$('rural-status').textContent=ok?'Uso registrado.':'Ação indisponível.';}));}else if(f.kind==='fishing'){renderFishing(f,root);}else if(f.kind==='livestock'){renderLivestock(root,f);}else if(f.kind==='installation'){renderInstallation(f.zone,root);}else if(f.kind==='orchard'){const t=wheatState.orchard.trees.find(t=>t.id===f.treeId),p=FRUITS[t.species],st=orchardStage(t,Math.floor(worldElapsed()));ruralMetrics(root,[[p.icon,'Frutífera',p.tree],['🌱','Crescimento',Math.round(st.growth*100)+'%'],['🧺','Estado',st.phase==='ripe'?'Frutos maduros':st.phase==='flower'?'Floração / renovação':'Crescendo']]);root.append(progressButton('Colher '+p.name,()=>{const ok=orchardAction('harvest',f.treeId);renderRural(f);$('rural-status').textContent=ok?'Frutos guardados na mochila.':'Colheita indisponível.';},st.phase!=='ripe'));}}
function openRural(){const f=ruralNearby();if(domesticRun||!f||resourceSwing||titleMode||photoMode||regionalOpen||inventoryDialog.open||progressDialog.open||ruralDialog.open||build.open||tillWork||entry.action||gateWork||seating.phase!=='idle')return false;cancelInput();if(petSystem.interactionActive())petSystem.cancelInteraction();$('rural-status').textContent='';renderRural(f);ruralDialog.showModal();return true;}
$('rural-open').onclick=()=>{const f=ruralNearby();if(f&&(['bath','shower','toilet'].includes(f.id)||f.kind==='pond'))return startDomestic(f);return openRural();};$('rural-close').onclick=()=>ruralDialog.close();ruralDialog.addEventListener('close',cancelInput);
// Depleted and relocated legacy trees must not block restoration of buildings.
for(const f of natureNodes){const s=wheatState.nature.nodes[f.id];if(s&&(s.phase!=='ready'||s.site&&(s.site.x!==f.x||s.site.z!==f.z)))f.collider.active=false;}
window.cvBootStage='restore-orchard';restoreOrchard();window.cvBootStage='restore-warehouse';restoreWarehouse();
let natureLastTick=-Infinity;
function initNature(){
 // Keep river masonry structural; all existing trees are resources. Place
 // independent mineral deposits after restoration of the existing warehouse.
 const trees=natureNodes.filter(f=>f.id.startsWith('forest ')&&!f.pink);
 for(let i=0;i<trees.length;i+=3){const t=trees[i];for(const a of [0,1.57,3.14,4.71]){
  const x=t.x+Math.cos(a)*2.4,z=t.z+Math.sin(a)*2.4,y=height(x,z);
  if(blocked(x,z)||sectorAt(x,z)||roadMaskAt(x,z)>.10||onBridge(x,z)||Math.hypot(x-avatar.position.x,z-avatar.position.z)<2||nearRiver(x,z).dist<nearRiver(x,z).w*.54+1||eastWaterAt(x,z).edge<1||!landBuildAllowed(x,z))continue;
  const id='stone-'+i,f={id,kind:'stone',x,z,y,hx:.52,hz:.48,label:'Afloramento',icon:'⛏'};
  entity(id);const b=MeshBuilder.CreateIcoSphere(id,{radius:1,subdivisions:1,flat:true},scene);b.position=V(x,y+.37,z);b.scaling=V(.52,.48,.48);own(b,M.stone);f.visual=b;f.base=sphere(id+' base',x,y+.09,z,.54,.14,.49,M.stoneLight);worldFixtures.push(f);natureNodes.push(f);break;
 }}
 for(const f of natureNodes)initResourcePivot(f);
 syncNature(true);
}
// Direct resource interaction uses the existing run control, not a modal.
let resourceSwing=null,selectedTreeSpecies=null,resourceMapRevision=0;const resourceFalls=new Map(),resourceFX=[];
const resourceStats={swings:0,impacts:0,falls:0,settled:0,failed:0};
entity('resource tools');
const resourceTool=new Mesh('resource grip',scene);resourceTool.parent=avatar;
const resourceHandle=box('axe and pick handle',0,.34,0,.052,.68,.052,M.woodLight,0,false);resourceHandle.parent=resourceTool;
const axeBlade=box('axe iron blade',0,.72,.075,.12,.23,.29,M.stoneLight,0,false);axeBlade.parent=resourceTool;
const pickBlade=box('pickaxe iron head',0,.72,0,.10,.10,.54,M.stoneLight,0,false);pickBlade.parent=resourceTool;resourceTool.setEnabled(false);
for(let i=0;i<10;i++){const mesh=box('resource impact fragment '+i,0,0,0,.075,.065,.09,M.woodLight,0,false);mesh.setEnabled(false);resourceFX.push({mesh,age:1});}
function resourceInputFree(){return !titleMode&&!photoMode&&!regionalOpen&&!inventoryDialog.open&&!progressDialog.open&&!ruralDialog.open&&!build.open&&!build.work&&!entry.action&&!gateWork&&!tillWork&&seating.phase==='idle'&&playerMenu.hidden&&controlsMenu.hidden&&farmCenter.hidden&&gardenPanel.hidden&&$('pet-panel').hidden&&$('ranch-panel').hidden&&wheatPanel.hidden;}
function initResourcePivot(f){f.origin={x:f.x,z:f.z};if(f.kind!=='tree')return;f.pivot=new Mesh('tree fall pivot '+f.id,scene);f.pivot.position.set(f.x,f.y,f.z);f.pivot.computeWorldMatrix(true);for(const mesh of groups[f.id]||[]){mesh.unfreezeWorldMatrix();mesh.setParent(f.pivot);mesh.computeWorldMatrix(true);}}
function createPlantedTree(id,site){if(natureNodes.some(f=>f.id===id))return null;tree(id,site.x*8+400,145-site.z*6.553,treeSpecies(id)==='pink',.9);const f=natureNodes.at(-1);initResourcePivot(f);setResourceVisible(f,false);return f;}
function selectFruitPlant(species){if(!Object.hasOwn(FRUITS,species)||wheatSaveLocked||wheatState.orchard.seeds[species]<1)return false;selectedTreeSpecies=species;$('tree-plant-cancel').textContent='✕ Cancelar plantio';$('tree-plant-cancel').hidden=false;releaseRun();return true;}
function selectTreePlant(species){$('tree-plant-cancel').textContent='✕ Cancelar plantio';if(!['green','pink'].includes(species)||wheatSaveLocked||(wheatState.nature[seedKey(species)]??0)<1)return false;selectedTreeSpecies=species;$('tree-plant-cancel').hidden=false;releaseRun();return true;}
function cancelTreePlant(){selectedTreeSpecies=null;$('tree-plant-cancel').hidden=true;}
$('tree-plant-cancel').onclick=()=>{cancelTreePlant();syncResourceHUD(directNatureTarget());};
function createOrchardModel(t){const p=FRUITS[t.species],y=height(t.x,t.z),f={id:'fruit-'+t.id,treeId:t.id,kind:'orchard',label:p.tree,icon:p.icon,x:t.x,z:t.z,y,hx:.36,hz:.36,stage:''};entity(f.id);const root=new Mesh(f.id+' root',scene);root.position.set(t.x,y,t.z);const palm=t.species==='coconut',banana=t.species==='banana',bush=t.species==='acerola',wide=t.species==='mango',heightScale=palm?1.65:bush?.68:wide?1.12:1,base=1.65*heightScale,crown=wide?1.25:bush?.8:1;const trunk=box('fruit trunk',0,base/2,0,palm?.27:.22,base,palm?.27:.22,M.woodDark);trunk.parent=root;const parts=[trunk];for(let i=0;i<(palm?9:banana?7:5);i++){const a=i*2.399,x=Math.cos(a)*.59*crown,z=Math.sin(a)*.59*crown,leaf=sphere('fruit foliage',x,base+(i%2)*.30*heightScale,z,palm?.21:banana?.30:.69*crown,palm?.07:banana?.10:.63*crown,palm?1.35:banana?1.18:.69*crown,i%2?M.leaf2:M.leaf);leaf.rotation.y=a;if(palm)leaf.rotation.x=.18+(i%3)*.13;leaf.parent=root;parts.push(leaf);}f.fruit=[];const fruitMat=({apple:M.red,banana:M.yellow,orange:M.tile,mango:M.yellow,guava:M.leaf2,coconut:M.wood,acerola:M.red})[t.species];for(let i=0;i<5;i++){const a=i*2.399,r=palm?.27:.68*crown,size=palm?.19:bush?.09:.14,fruit=sphere('fruit '+t.species,Math.cos(a)*r,base-.10+(i%2)*.25*heightScale,Math.sin(a)*r,size,banana?.24:t.species==='mango'?.23:size,size,fruitMat);fruit.parent=root;f.fruit.push(fruit);parts.push(fruit);}f.root=root;f.parts=parts;worldFixtures.push(f);orchardModels.push(f);return f;}
function restoreOrchard(){for(const t of wheatState.orchard.trees)createOrchardModel(t);}
let orchardLast=-Infinity;
function syncOrchard(force=false){const now=Math.floor(worldElapsed());if(!force&&now-orchardLast<1000)return;orchardLast=now;for(const f of orchardModels){const t=wheatState.orchard.trees.find(t=>t.id===f.treeId);if(!t)continue;const stage=orchardStage(t,now),key=stage.phase+':'+Math.round(stage.growth*20);if(f.stage===key)continue;f.stage=key;f.root.scaling.setAll(stage.growth);for(const v of f.fruit)v.setEnabled(stage.phase==='ripe');shadowMap.resetRefreshCounter();}}
function orchardAction(action,id,qty){if(wheatSaveLocked)return false;let next=null;const now=Math.floor(worldElapsed());if(action==='plant'&&resourceInputFree()&&!resourceSwing&&selectedTreeSpecies===id&&qty&&Math.hypot(qty.x-avatar.position.x,qty.z-avatar.position.z)<=2&&validResourceGround(null,qty.x,qty.z))next=plantFruit(wheatState,id,qty,now);else if(action==='harvest'&&ruralDialog.open&&ruralNearby()?.treeId===id)next=harvestFruit(wheatState,id,now);else if(inventoryDialog.open&&inventoryCategory==='market'&&stationNearby(marketStation)){if(action==='buy')next=buyFruitSeed(wheatState,id,qty);if(action==='sell')next=sellFruit(wheatState,id,qty);}if(!next)return false;const ok=progressCommit(s=>{Object.assign(s,JSON.parse(JSON.stringify(next)));if(action==='plant')record(s.progress,'plant',{species:id,key:'fruit:'+s.orchard.next});if(action==='harvest')record(s.progress,'harvest',{units:FRUITS[s.orchard.trees.find(t=>t.id===id).species].yield,key:'fruit:'+id+':'+now});if(action==='sell')record(s.progress,'sell',{units:qty,value:FRUITS[id].price*qty});return true;});if(ok){if(action==='plant'){createOrchardModel(wheatState.orchard.trees.at(-1));drawMinimap.resourceRevision=(drawMinimap.resourceRevision??0)+1;}syncOrchard(true);farmAudio.action(action==='plant'?'plant':action==='harvest'?'harvest':'trade');regionalLabelKey='';}return ok;}
function treePlantTarget(){const x=Math.round((avatar.position.x+Math.sin(avatar.rotation.y)*1.8)*100)/100,z=Math.round((avatar.position.z+Math.cos(avatar.rotation.y)*1.8)*100)/100;return {x,z};}
function confirmTreePlant(){if(!selectedTreeSpecies||!resourceInputFree()||resourceSwing||wheatSaveLocked)return false;const site=treePlantTarget();if(!validResourceGround(null,site.x,site.z)){ $('tree-plant-cancel').textContent='✕ Solo ocupado · cancelar';return false;}if(Object.hasOwn(FRUITS,selectedTreeSpecies)){const ok=orchardAction('plant',selectedTreeSpecies,site);if(!ok){$('tree-plant-cancel').textContent='✕ Sem espaço / muda · cancelar';return false;}cancelTreePlant();syncResourceHUD(directNatureTarget());return true;}const q=plantTree(wheatState.nature,selectedTreeSpecies,site,Math.floor(worldElapsed()));if(!q){$('tree-plant-cancel').textContent='✕ Sem mudas ou limite atingido';return false;}if(!progressCommit(next=>{next.nature=q.next;return true;}))return false;const f=createPlantedTree(q.id,site);if(f){f.stage=0;f.phase='planted';f.hits=3;f.pivot.scaling.setAll(.22);setResourceVisible(f,true);f.pivot.computeWorldMatrix(true);shadowMap.resetRefreshCounter();}farmAudio.action('plant');cancelTreePlant();syncResourceHUD(directNatureTarget());return true;}
function directNatureTarget(){if(!resourceInputFree()||wheatSaveLocked||selectedTreeSpecies)return null;if(resourceSwing)return resourceSwing.f;return natureNodes.filter(f=>f.active!==false&&f.stage===3&&!resourceFalls.has(f.id)&&landBuildAllowed(f.x,f.z)&&stationNearby(f)).sort((a,b)=>Math.hypot(a.x-avatar.position.x,a.z-avatar.position.z)-Math.hypot(b.x-avatar.position.x,b.z-avatar.position.z))[0]||null;}
function syncResourceHUD(f){const b=runButton,kind=selectedTreeSpecies&&resourceInputFree()?'plant':f?.kind||'run',label=kind==='plant'?'Plantar':kind==='tree'?'Cortar':kind==='stone'?'Quebrar':'Correr';if(b.dataset.action!==kind){if(kind!=='run')releaseRun();b.dataset.action=kind;b.querySelector('svg').style.display=kind==='run'?'':'none';$('resource-action-icon').hidden=kind==='run';$('resource-action-icon').textContent=kind==='plant'?(selectedTreeSpecies==='pink'?'🌸':'🌱'):kind==='tree'?'🪓':kind==='stone'?'⛏':'';b.querySelector('.run-label').textContent=label;b.setAttribute('aria-label',kind==='run'?'Segure para correr':kind==='plant'?'Plantar muda à frente':label+' '+(kind==='tree'?'árvore':'pedra'));}const hint=$('resource-action-hits');hint.hidden=!f&&kind!=='plant';hint.textContent=kind==='plant'?String(Object.hasOwn(FRUITS,selectedTreeSpecies)?wheatState.orchard.seeds[selectedTreeSpecies]:wheatState.nature[seedKey(selectedTreeSpecies)]??0)+' mudas':f?Math.min(3,(f.hits||0))+' / 3':'';b.setAttribute('aria-busy',String(!!resourceSwing));}
function validResourceGround(f,x,z){
 if(!landBuildAllowed(x,z)||onBridge(x,z)||sectorAt(x,z)||roadMaskAt(x,z)>.10||livestockReserved(x,z)||blocked(x,z)||fishingSpots.some(p=>Math.hypot(x-p.x,z-p.z)<2)||natureNodes.some(p=>p!==f&&p.active!==false&&Math.hypot(x-p.x,z-p.z)<2.1)||Math.abs(surfaceHeight(x,z)-height(x,z))>.5)return false;
 return [[0,0],[.7,0],[-.7,0],[0,.7],[0,-.7]].every(([dx,dz])=>!blocked(x+dx,z+dz)&&Math.abs(height(x+dx,z+dz)-height(x,z))<.4);
}
function nextResourceSite(f,now){
 const angle=(Math.floor(now/1000)+[...f.id].reduce((a,c)=>a+c.charCodeAt(0),0))*2.399963;
 for(const radius of [3,4.5,6,8,10])for(let i=0;i<12;i++){const a=angle+i*Math.PI/6,x=Math.round((f.origin.x+Math.cos(a)*radius)*100)/100,z=Math.round((f.origin.z+Math.sin(a)*radius)*100)/100;if(Math.hypot(x-f.x,z-f.z)>2&&validResourceGround(f,x,z))return {x,z};}
 return {x:f.x,z:f.z};
}
function placeResource(f,x,z){if(f.x===x&&f.z===z)return;f.x=x;f.z=z;f.y=height(x,z);if(f.collider){f.collider.x=x;f.collider.z=z;}if(f.pivot){f.pivot.position.set(x,f.y,z);f.pivot.computeWorldMatrix(true);}else{f.visual.position.set(x,f.y+.37,z);f.base.position.set(x,f.y+.09,z);}}
function setResourceVisible(f,on){if(f.active!==on){resourceMapRevision++;drawMinimap.resourceRevision=resourceMapRevision;}f.active=on;if(f.collider)f.collider.active=on;if(f.kind==='tree'){for(const mesh of groups[f.id]||[])mesh.setEnabled(on);}else{f.visual.setEnabled(on);f.base.setEnabled(on);}if(!on&&f.mark){f.mark.dispose();f.mark=null;}}
function resourceMark(f){if(f.mark){f.mark.dispose();f.mark=null;}if(f.stage!==3||!f.hits)return;const angle=f.impactAngle??0,dx=Math.sin(angle),dz=Math.cos(angle),r=f.kind==='tree'?f.hx*.72:.45,at=V(f.x+dx*r,f.y+(f.kind==='tree'?.72:.39),f.z+dz*r),side=V(dz,0,-dx);const lines=[];for(let i=0;i<f.hits;i++){const c=at.add(V(0,i*.11,0));lines.push([c.add(side.scale(-.17)),c.add(side.scale(-.05)).add(V(0,.055,0)),c.add(side.scale(.04)).add(V(0,-.035,0)),c.add(side.scale(.18))]);}f.mark=MeshBuilder.CreateLineSystem('resource cut or crack '+f.id,{lines},scene);f.mark.color=Color3.FromHexString(f.kind==='tree'?'#e8ba72':'#443e38');f.mark.isPickable=false;}
function syncNature(force=false){
 const now=Math.floor(worldElapsed());if(!force&&now-natureLastTick<1000)return;natureLastTick=now;
 for(const f of natureNodes){if(resourceFalls.has(f.id))continue;const s=natureStage(wheatState.nature,f.id,f.kind,now),ready=s.phase==='ready'||!!s.mature,next=ready?3:s.stage,hits=s.mature?0:s.hits;
 if(s.phase==='planted'&&!s.mature){if(f.active===false){if(!validResourceGround(f,f.x,f.z))continue;setResourceVisible(f,true);}if(f.stage!==next||f.phase!==s.phase){f.stage=next;f.phase=s.phase;f.hits=3;f.pivot.scaling.setAll([.22,.46,.72][Math.min(2,next)]);f.pivot.computeWorldMatrix(true);shadowMap.resetRefreshCounter();}continue;}
 if(f.stage===next&&f.phase===s.phase&&f.hits===hits)continue;
 const saved=wheatState.nature.nodes[f.id],requiresPlacement=!!saved&&(f.active===false||f.stage===undefined&&(saved.phase!=='ready'||saved.site&&(saved.site.x!==f.x||saved.site.z!==f.z)));
 if(requiresPlacement&&f.stage===undefined){setResourceVisible(f,false);f.stage=0;f.phase='depleted';f.hits=3;}
 if(ready&&requiresPlacement){
  let site=s.site||{x:f.x,z:f.z};if(!validResourceGround(f,site.x,site.z))site=nextResourceSite(f,now);
  if(!validResourceGround(f,site.x,site.z)||Math.hypot(avatar.position.x-site.x,avatar.position.z-site.z)<2.2||petSystem.pets.some(p=>Math.hypot(p.rig.root.position.x-site.x,p.rig.root.position.z-site.z)<1.5))continue;
  if(!s.site||s.site.x!==site.x||s.site.z!==site.z){if(!progressCommit(p=>{p.nature.nodes[f.id].site=site;return true;}))continue;}
  placeResource(f,site.x,site.z);
 }
 f.stage=next;f.phase=s.phase;f.hits=hits;setResourceVisible(f,ready);if(f.pivot){f.pivot.rotationQuaternion=null;f.pivot.rotation.setAll(0);f.pivot.scaling.setAll(1);f.pivot.computeWorldMatrix(true);}if(f.kind==='stone'){const scale=1-hits*.10;f.visual.scaling.set(.52*scale,.48*scale,.48*scale);f.visual.position.y=f.y+.37*scale;}resourceMark(f);shadowMap.resetRefreshCounter();
 }
}
function emitResourceFX(f){const dx=avatar.position.x-f.x,dz=avatar.position.z-f.z,angle=Math.atan2(dx,dz);f.impactAngle=angle;for(let i=0;i<resourceFX.length;i++){const q=resourceFX[i],a=angle+(i-4.5)*.34;Object.assign(q,{age:0,x:f.x+Math.sin(angle)*f.hx*.7,y:f.y+(f.kind==='tree'?.76:.42),z:f.z+Math.cos(angle)*f.hz*.7,dx:Math.sin(a)*(1.4+i*.09),dz:Math.cos(a)*(1.4+i*.09),vy:1.5+i*.11});q.mesh.material=f.kind==='tree'?M.woodLight:M.stoneLight;q.mesh.position.set(q.x,q.y,q.z);q.mesh.setEnabled(true);}}
function impactResource(f){
 if(!natureNodes.includes(f)||!stationNearby(f)||wheatSaveLocked||!landBuildAllowed(f.x,f.z)||f.stage!==3||resourceFalls.has(f.id))return false;
 const now=Math.floor(worldElapsed()),state=natureStage(wheatState.nature,f.id,f.kind,now),site=state.hits===2?nextResourceSite(f,now):undefined,q=natureAction(wheatState.nature,f.id,f.kind,'strike',now,site);if(!q)return false;
 if(!progressCommit(next=>{next.nature=q.next;if(q.event&&!record(next.progress,q.event))return false;return true;}))return false;
 resourceStats.impacts++;emitResourceFX(f);farmAudio.action(f.kind==='tree'?'chop':'mine');
 if(q.event){const dx=f.x-avatar.position.x,dz=f.z-avatar.position.z,len=Math.hypot(dx,dz)||1;resourceFalls.set(f.id,{f,age:0,axis:V(dz/len,0,-dx/len)});f.hits=3;resourceMark(f);resourceStats.falls++;}else syncNature(true);return true;
}
function beginResourceSwing(f){if(resourceSwing||directNatureTarget()!==f||!selectTool(f.kind==='tree'?'axe':'pickaxe'))return false;cancelInput();if(petSystem.interactionActive())petSystem.cancelInteraction();resourceSwing={f,age:0,impact:false};avatar.rotation.y=Math.atan2(f.x-avatar.position.x,f.z-avatar.position.z);resourceTool.setEnabled(true);axeBlade.setEnabled(f.kind==='tree');pickBlade.setEnabled(f.kind==='stone');resourceStats.swings++;syncResourceHUD(f);return true;}
function finishResourceSwing(){resourceSwing=null;resourceTool.setEnabled(false);releaseHand();bodyParts[0].rotation.x=0;walkPose(0,.05);syncResourceHUD(directNatureTarget());}
function tickResourceSwing(dt){const w=resourceSwing;if(!w)return;if(document.hidden||!resourceInputFree()){finishResourceSwing();return;}w.age+=Math.min(.05,Math.max(0,dt));const u=Math.min(1,w.age/.82),s=u<.52?u/.52:1-(u-.52)/.48;
 const f=w.f;resourceTool.position.set(.28,1.07+.18*(1-s),.12+.35*s);resourceTool.rotation.x=-1.15+2.85*s;avatar.computeWorldMatrix(true);handPose(Vector3.TransformCoordinates(resourceTool.position,avatar.getWorldMatrix()),1);bodyParts[0].rotation.x=.17*s;
 if(!w.impact&&u>=.52){w.impact=true;if(!impactResource(f))resourceStats.failed++;}
 if(u>=1)finishResourceSwing();
}
function tickResourceEffects(dt){dt=Math.min(.05,Math.max(0,dt));for(const q of resourceFX){if(!q.mesh.isEnabled())continue;q.age+=dt;const y=q.y+q.vy*q.age-4.9*q.age*q.age,x=q.x+q.dx*q.age,z=q.z+q.dz*q.age;q.mesh.position.set(x,y,z);q.mesh.rotation.x+=dt*9;if(q.age>.65||y<height(x,z)+.04)q.mesh.setEnabled(false);}
 for(const [id,a] of resourceFalls){const f=a.f;a.age+=dt;if(f.kind==='tree'){const t=Math.min(1,a.age/1.05);f.pivot.rotationQuaternion=Quaternion.RotationAxis(a.axis,t*t*Math.PI/2);f.pivot.computeWorldMatrix(true);if(f.mark){f.mark.dispose();f.mark=null;}}else{const s=Math.max(.04,1-a.age/.55);f.visual.scaling.set(.52*s,.48*s,.48*s);f.visual.position.y=f.y+.37*s;}shadowMap.resetRefreshCounter();if(a.age>=(f.kind==='tree'?1.65:.65)){resourceFalls.delete(id);setResourceVisible(f,false);f.stage=0;f.phase='depleted';resourceStats.settled++;syncNature(true);}}
}
// Retain explicit QA entry point; normal input always goes through the swing.
function interactNature(f,action){return action==='strike'&&beginResourceSwing(f);}
window.cvBootStage='nature';initNature();
// Restore manually planted trees from their authoritative saved coordinates.
for(const [id,s] of Object.entries(wheatState.nature.nodes))if(id.startsWith('planted-'))createPlantedTree(id,s.site);
syncNature(true);
let fishingSession=null;
function initFishing(){
 const stride=Math.max(1,Math.floor(riverSegments.length/12));
 for(let i=stride;i<riverSegments.length-1&&fishingSpots.length<5;i+=stride){
 const seg=riverSegments[i],length=Math.hypot(seg.dx,seg.dz);if(length<.001)continue;
 const wx=seg.x+seg.dx*.5,wz=seg.z+seg.dz*.5,water=nearRiver(wx,wz);
 for(const side of [-1,1]){for(const extra of [1.3,1.8,2.3,2.8]){
 const x=wx-seg.dz/length*(water.w*.55+extra)*side,z=wz+seg.dx/length*(water.w*.55+extra)*side,y=surfaceHeight(x,z);
 if(blocked(x,z)||sectorAt(x,z)||roadMaskAt(x,z)>.10||!landBuildAllowed(x,z)||onBridge(x,z)||fishingSpots.some(f=>Math.hypot(x-f.x,z-f.z)<5)||natureNodes.some(f=>Math.hypot(x-f.x,z-f.z)<1.4)||Math.abs(y-water.y)>2.2)continue;
 fishingSpots.push({id:'river-fish-'+i,kind:'fishing',x,z,y,hx:.23,hz:.23,label:'Pescar',name:'Pesca '+String(fishingSpots.length+1).padStart(2,'0'),icon:'🎣',water:V(wx,water.y+.06,wz)});break;
 }if(fishingSpots.at(-1)?.id==='river-fish-'+i)break;}
 }
}
function stopFishing(){if(!fishingSession)return;const a=fishingSession;fishingSession=null;a.timing.stop();for(const mesh of a.meshes)mesh.dispose(false,false);}
function castFishing(f){
 if(!fishingSpots.includes(f)||!ruralDialog.open||ruralNearby()!==f||wheatSaveLocked||!fishingReady(wheatState.fishery,f.id,Math.floor(worldElapsed()))||fishingSession||!selectTool('rod'))return false;
 const bob=MeshBuilder.CreateSphere('fishing float',{diameter:.16,segments:6},scene);bob.position.copyFrom(f.water);bob.material=M.white;bob.isPickable=false;
 const line=MeshBuilder.CreateLines('fishing line',{points:[avatar.position.add(V(0,1.05,0)),f.water]},scene);line.color=Color3.FromHexString('#e7d9b6');line.isPickable=false;
 const a={f,meshes:[bob,line],timing:null};a.timing=createFishingTiming({onPhase:phase=>{
 if(fishingSession!==a)return;
 if(document.hidden||!ruralDialog.open||ruralNearby()!==f){stopFishing();return;}
 if(phase==='missed'){stopFishing();renderRural(f);$('rural-status').textContent='O peixe escapou. Lance novamente.';}
 else{bob.position.y=f.water.y-.05;renderRural(f);$('rural-status').textContent='Fisgada! Recolha a linha.';}
 }});fishingSession=a;a.timing.start();farmAudio.action('water');return true;
}
function reelFishing(f){
 const a=fishingSession;if(!a||a.f!==f||!ruralDialog.open||ruralNearby()!==f||wheatSaveLocked||document.hidden||a.timing.phase!=='bite')return false;
 const next=landFish(wheatState.fishery,f.id,Math.floor(worldElapsed()));if(!next)return false;
 if(!progressCommit(s=>{s.fishery=next;return record(s.progress,'fish');}))return false;
 stopFishing();farmAudio.action('harvest');return true;
}
function renderFishing(f,root){
 const live=fishingSession?.f===f,phase=live?fishingSession.timing.phase:null,ready=fishingReady(wheatState.fishery,f.id,Math.floor(worldElapsed()));
 const panel=progressEl('article','','rural-action-card cv-fishing-live');root.append(panel);panel.append(progressEl('small','Lance a linha e recolha quando houver uma fisgada.'));
 const status=progressEl('p',phase==='waiting'?'Aguardando a fisgada…':phase==='bite'?'Fisgou! Recolha agora.':ready?'Ponto disponível.':'O ponto está se recuperando. Aguarde uma hora rural.');status.id='fishing-status';status.setAttribute('role','status');status.dataset.phase=phase||'idle';panel.append(status);
 const b=progressButton(live?'🎣 Recolher linha':'🎣 Lançar linha',()=>{const ok=live?reelFishing(f):castFishing(f);renderRural(f);$('rural-status').textContent=ok?(live?'Peixe capturado e salvo.':'Linha lançada.'):'Ação indisponível.';},wheatSaveLocked||(live?phase!=='bite':!ready));b.id='fishing-action';panel.append(b);ruralMetrics(ruralSection(root,'fishing:stock','🎒','Mochila'),[['🐟','Peixes',wheatState.fishery.fish]]);
}
function tickFishing(){
 const a=fishingSession;if(a&&(!ruralDialog.open||ruralNearby()!==a.f))stopFishing();
}
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden||!fishingSession)return;
 const f=fishingSession.f;stopFishing();if(ruralDialog.open&&ruralNearby()===f){renderRural(f);$('rural-status').textContent='Pesca cancelada ao sair do jogo.';}
});
window.cvBootStage='fishing';initFishing();
// Small world signs sit beside (not on) the interactable standing area.
for(const f of fishingSpots){const dx=f.x-f.water.x,dz=f.z-f.water.z,len=Math.hypot(dx,dz)||1;for(const side of [-1,1]){const x=f.x+side*dz/len*.85,z=f.z-side*dx/len*.85;if(blocked(x,z)||sectorAt(x,z)||Math.abs(surfaceHeight(x,z)-f.y)>.5)continue;const sign={id:f.id+'-sign',x,z,y:surfaceHeight(x,z),hx:.08,hz:.06,yaw:Math.atan2(dx,dz)};entity('fishing site sign '+f.id);box('fishing sign post',x,sign.y+.48,z,.11,.96,.11,M.woodDark);box('fishing sign board',x,sign.y+.92,z,.72,.31,.10,M.woodLight,sign.yaw);stationSign(sign,f.name.toUpperCase(),.92,.66);worldFixtures.push(sign);break;}}
function livestockReserved(x,z){return !!zoneAt(x,z)||ruralZones.some(q=>q.extra&&Math.abs(x-q.x)<q.hx+1&&Math.abs(z-q.z)<q.hz+1);}
function createRuralZone(spec){const z={...spec,h:Math.min(spec.hx,spec.hz),meshes:[],fixtures:[],rails:[]};const x=z.x+z.hx+.9,pz=z.z;z.station={id:'zone-'+z.id,kind:'installation',zone:z,label:z.name,icon:z.icon,x,z:pz,y:surfaceHeight(x,pz),hx:.38,hz:.18};entity('zone sign '+z.id);box('project post',x,z.station.y+.55,pz,.12,1.1,.12,M.woodDark);box('project sign',x,z.station.y+1.05,pz,.95,.32,.13,M.woodLight);stationSign(z.station,z.name.toUpperCase(),1.05,.88);worldFixtures.push(z.station);ruralZones.push(z);refreshInstallation(z);return z;}
function createRuralZones(){for(const spec of [...ZONES,...wheatState.extraPens.map(extraPenSpec)])createRuralZone(spec);livestockPen=ruralZones.find(z=>z.id==='chicken');}
function zoneReady(z){return !!z&&(z.extra||installationReady(wheatState.installations,z.id));}
function canPlaceExtraPen(species,x,z){if(!addExtraPen(wheatState,species,x,z)||Math.hypot(avatar.position.x-x,avatar.position.z-z)<6.5)return false;const y=surfaceHeight(x,z);for(let dx=-6;dx<=6;dx+=1)for(let dz=-6;dz<=6;dz+=1){const a=x+dx,b=z+dz;if(a<minX+1||a>maxX-1||b<minZ+1||b>maxZ-1||livestockReserved(a,b)||!landBuildAllowed(a,b)||sectorAt(a,b)||roadMaskAt(a,b)>.10||blocked(a,b)||onBridge(a,b)||Math.abs(surfaceHeight(a,b)-y)>.65||natureNodes.some(f=>f.active!==false&&Math.hypot(f.x-a,f.z-b)<1.1)||fishingSpots.some(f=>Math.hypot(f.x-a,f.z-b)<1.5))return false;}return true;}
function placeExtraPen(){if(!build.open||build.kind!=='animal-pen'||!canPlaceExtraPen(build.species,build.x,build.z)||wheatSaveLocked)return false;const ok=progressCommit(next=>{const n=addExtraPen(next,build.species,build.x,build.z);if(!n)return false;Object.assign(next,n);record(next.progress,'build',{key:n.extraPens.at(-1).id});return true;});if(!ok)return false;createRuralZone(extraPenSpec(wheatState.extraPens.at(-1)));regionalLabelKey='';farmAudio.action('hammer');closeBuild();drawMinimap(0,true);return true;}
const habitatMaterials={mud:mat('wet pig mud','#705038',.16),dirt:mat('chicken scratched dry earth','#a78055'),duckClean:mat('pond clean turquoise','#3699a6',.22),duckDirty:mat('pond used water','#75825b',.08)};habitatMaterials.dirt.diffuseTexture=wheatSoil.diffuseTexture;habitatMaterials.mud.diffuseTexture=wheatSoil.diffuseTexture;
function habitatGround(z,material){const nx=Math.ceil(z.hx*2),nz=Math.ceil(z.hz*2),pos=[],idx=[],uv=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=z.x-z.hx+.12+i*(2*z.hx-.24)/nx,t=z.z-z.hz+.12+j*(2*z.hz-.24)/nz;pos.push(x,Math.max(height(x,t),renderedTerrainY(x,t))+.075,t);uv.push(x/3,t/3);}for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}const v=new VertexData();v.positions=pos;v.indices=idx;v.uvs=uv;v.normals=[];VertexData.ComputeNormals(pos,idx,v.normals);const m=new Mesh(z.id+' full habitat ground',scene);v.applyToMesh(m);own(m,material,false);return m;}
function refreshInstallation(z){for(const mesh of z.meshes){shadow.removeShadowCaster(mesh,false);mesh.dispose(false,false);}for(const f of z.fixtures)f.active=false;for(const rail of z.rails){const i=livestockRails.indexOf(rail);if(i>=0)livestockRails.splice(i,1);}z.meshes=[];z.fixtures=[];z.rails=[];const stage=z.extra?3:stageOf(wheatState.installations,z.id);if(!stage)return;entity('installation '+z.id);const made=groups['installation '+z.id]=[];if(z.species==='pig'||z.species==='chicken')habitatGround(z,z.species==='pig'?habitatMaterials.mud:habitatMaterials.dirt);const x=z.x,z0=z.z+z.hz-2.35,y=height(x,z0),w=z.id==='barn'?7:z.extra?3.4:z.species==='cow'?6.4:z.species==='sheep'?6:z.species==='chicken'?4.4:5,h=z.id==='barn'?3.4:z.species==='cow'?3:z.species==='pig'?1.85:z.species==='chicken'?2.15:2.5;const B=(n,dx,dy,dz,a,b,c,mat)=>box(n,x+dx,y+dy,z0+dz,a,b,c,mat);B('stone foundation',0,.11,0,w,.22,4,M.stone);if(stage>=2){for(const dx of [-w/2+.12,w/2-.12])for(const dz of [-1.8,1.8])B('timber pillar',dx,h/2,dz,.18,h,.18,M.woodDark);B('rear timber wall',0,h/2,1.9,w,h,.16,z.species==='chicken'?M.woodLight:z.species==='pig'?M.stoneLight:M.wood);for(const dx of [-w/2+.08,w/2-.08])B('side timber wall',dx,h/2,0,.16,h,3.8,M.wood);const f={id:'shelter-'+z.id,x,z:z0,y,hx:w/2,hz:2};z.fixtures.push(f);worldFixtures.push(f);}if(stage>=3){const a=B('roof west',-w/4,h+.38,0,w/2+.4,.20,4.7,z.species==='chicken'?M.roof:z.species==='duck'?M.woodLight:z.species==='pig'?M.tile2:M.woodDark),b=B('roof east',w/4,h+.38,0,w/2+.4,.20,4.7,z.species==='chicken'?M.roof:z.species==='duck'?M.woodLight:z.species==='pig'?M.tile2:M.woodDark);a.rotation.z=.22;b.rotation.z=-.22;for(const [dx,dz,material] of [[-2,-3,M.woodLight],[2,-3,M.water]]){const px=x+dx,pz=z0+dz,py=height(px,pz);box('trough',px,py+.2,pz,1.2,.4,.7,M.woodDark);box('trough contents',px,py+.42,pz,1.04,.05,.54,material);const f={id:'equipment-'+z.id+dx,x:px,z:pz,y:py,hx:.6,hz:.35};z.fixtures.push(f);worldFixtures.push(f);}if(z.species){const rail=(ax,az,bx,bz)=>{const a=V(x+ax,height(x+ax,z.z+az),z.z+az),b=V(x+bx,height(x+bx,z.z+bz),z.z+bz),pair=[a,b];livestockRails.push(pair);z.rails.push(pair);for(const h of [.4,.86])beam('exclusive paddock rail',a.add(V(0,h,0)),b.add(V(0,h,0)),.09,M.wood);box('paddock post',a.x,a.y+.55,a.z,.15,1.1,.15,M.woodDark);};for(const side of [-1,1]){for(let j=-z.hz;j<z.hz;j+=2){if(side===1&&j<1&&j+2>-1)continue;rail(side*z.hx,j,side*z.hx,Math.min(j+2,z.hz));}for(let i=-z.hx;i<z.hx;i+=2)rail(i,side*z.hz,Math.min(i+2,z.hx),side*z.hz);}if(z.species==='duck')buildDuckPond(z);if(z.species==='cow'||z.species==='sheep'){for(let i=0;i<4;i++){const px=x-2.3+i*1.3,pz=z0-2.1,py=height(px,pz);box('hay bale',px,py+.36,pz,1.05,.72,.76,M.sand);}}if(z.species==='pig'){for(let i=0;i<5;i++){const px=x-2+i*.9,pz=z.z-1.8,py=height(px,pz);const p=sphere('mud puddle',px,py+.08,pz,.56,.035,.41,habitatMaterials.mud,false);}}if(z.species==='chicken'){for(let i=0;i<3;i++){const px=x-1.2+i*1.2,pz=z0-1.2,py=height(px,pz);box('nesting box',px,py+.32,pz,.8,.45,.65,M.woodLight);box('nest straw',px,py+.56,pz,.65,.08,.48,M.sand);}}}}z.meshes=[...made];shadowMap.resetRefreshCounter();}
function buildDuckPond(z){const x=z.x-1.7,t=z.z-2.1,rx=z.extra?1.65:2.65,rz=z.extra?1.35:2.05,y=height(x,t)+.16;const base=cyl('pond stone basin',x,y-.10,t,1,.28,M.stone);base.scaling.x=rx;base.scaling.z=rz;const water=cyl('pond water level',x,y+.07,t,1,.035,habitatMaterials.duckClean);water.scaling.x=rx*.92;water.scaling.z=rz*.92;for(let i=0;i<20;i++){const a=i*Math.PI/10,px=x+Math.cos(a)*rx,pz=t+Math.sin(a)*rz;sphere('rounded pond border stone',px,Math.max(y+.04,height(px,pz)+.15),pz,.40,.24,.33,i%3?M.stone:M.stoneLight,false);}const tx=x+rx+.18,tz=t,y0=height(tx,tz);box('pond tap pipe',tx,y0+.51,tz,.10,1.02,.10,M.stone);box('pond tap spout',tx-.18,y0+1.01,tz,.45,.10,.10,M.stoneLight);const handle=box('pond tap handle',tx,y0+1.13,tz,.34,.07,.08,M.woodDark);const f={id:'pond-'+z.id,kind:'pond',label:'Trocar água do lago',icon:'💧',x:tx,z:tz,y:y0,hx:.25,hz:.25,zone:z,water,handle,stream:V(tx-.38,y0+.96,tz),baseY:y+.07};z.pond=f;pondStations.push(f);worldFixtures.push(f);z.fixtures.push(f);}
function tickPonds(){const now=worldElapsed();for(const f of pondStations){if(f.active===false||domesticRun?.f===f)continue;const cleaned=wheatState.ponds[f.zone.id]?.cleaned??0;f.water.material=now-cleaned>REAL_MS_PER_GAME_MINUTE*1440?habitatMaterials.duckDirty:habitatMaterials.duckClean;}}
function advanceRuralConstruction(z){if(!ruralDialog.open||ruralNearby()!==z.station||wheatSaveLocked)return false;const ok=progressCommit(next=>{const n=advanceInstallation(next,z.id);if(!n)return false;Object.assign(next,n);record(next.progress,'build',{key:'installation:'+z.id+':'+stageOf(n.installations,z.id)});return true;});if(ok){refreshInstallation(z);syncLivestockModels();farmAudio.action('hammer');regionalLabelKey='';}return ok;}
function renderInstallation(z,root){const stage=z.extra?3:stageOf(wheatState.installations,z.id),names=['Projeto','Fundação','Estrutura','Concluída'];ruralMetrics(root,[[z.icon,'Instalação',names[stage]],['🔨','Progresso',stage+' / 3']]);if(stage<3){const cost=stageCost(z.id,stage),panel=ruralSection(root,'construction:'+z.id,'🔨','Obra');panel.append(progressEl('small','Próxima fase: '+names[stage+1]+' · '+cost[0]+' madeira · '+cost[1]+' pedra'),progressButton('🔨 Construir etapa',()=>{const ok=advanceRuralConstruction(z);renderRural(z.station);$('rural-status').textContent=ok?'Etapa salva.':'Materiais insuficientes ou local indisponível.';},wheatState.nature.wood<cost[0]||wheatState.nature.stone<cost[1]));}else if(z.species)renderLivestock(root,z.station);else root.append(progressEl('small',z.id==='horse'?'Estábulo reservado ao futuro cavalo pessoal.':'Celeiro de apoio; armazenamento de ração específico será integrado posteriormente.'));}
// All owned livestock use their exclusive habitat, never the obsolete mixed paddock.
const animalColors={ivory:mat('animal creamy coat','#f6e7d1'),charcoal:mat('animal charcoal coat','#4b423a'),muzzle:mat('animal soft muzzle','#d69f93'),hoof:mat('animal rounded hooves','#51423a'),gold:mat('bird warm bill','#e7a249'),pig:mat('pig warm peach','#e9a8a7'),pigInner:mat('pig inner ear','#c87e84'),wool:mat('sheep wool cream','#eee2ca'),face:mat('sheep face','#8a7664'),chest:mat('hen cream chest','#e9c69c'),hen:mat('hen chestnut feathers','#b77944'),duck:mat('duck white feathers','#fff4df'),eye:mat('animal glossy eyes','#241c18',.45),shine:mat('animal eye highlights','#ffffff')};
function makeLivestockModel(a){
 const root=new Mesh('livestock '+a.id,scene);entity('livestock animal '+a.id);
 const sp=a.species,bird=sp==='chicken'||sp==='duck',cow=sp==='cow',sheep=sp==='sheep',pig=sp==='pig',duck=sp==='duck',size=bird?.66:cow?1.25:.91,C=animalColors,coat=cow?C.ivory:pig?C.pig:sheep?C.wool:duck?C.duck:C.hen;
 const B=(n,x,y,z,rx,ry,rz,m=coat,parent=root)=>{const part=sphere(sp+' '+n,x*size,y*size,z*size,rx*size,ry*size,rz*size,m,false);part.parent=parent;return part;};
 const pivot=(n,x,y,z,parent=root)=>{const p=new Mesh(sp+' '+n,scene);p.parent=parent;p.position.set(x*size,y*size,z*size);return p;};
 const legs=[],head=pivot('head joint',0,bird?.68:1.01,bird?.30:.59),tail=pivot('tail joint',0,bird?.52:.85,bird?-.39:-.66);
 B('rounded torso',0,bird?.47:.78,0,bird?.36:.48,bird?.35:.41,bird?.53:.73);
 B('chest',0,bird?.51:.79,bird?.20:.40,bird?.30:.40,bird?.27:.33,bird?.34:.32,bird?(duck?C.duck:C.chest):coat);
 if(bird){B('neck',0,.14,.09,.16,duck?.25:.19,.17,coat,head);B('round head',0,duck?.36:.26,.16,duck?.23:.22,.22,.24,coat,head);B('upper bill',0,duck?.32:.22,.39,duck?.16:.11,.065,duck?.22:.14,C.gold,head);B('lower bill',0,duck?.27:.17,.39,.12,.037,.16,C.gold,head);for(const s of [-1,1]){const w=B('layered wing',s*.31,.49,-.02,.14,.23,.38,duck?C.ivory:C.chest);w.rotation.x=-.17;B('wing feather',s*.35,.46,-.13,.07,.13,.25,coat);}B('tail feathers',0,.02,-.12,.20,.17,.26,coat,tail);if(!duck){for(let i=0;i<3;i++)B('rounded comb',0,.48-i*.018,.08+i*.08,.063,.095,.071,M.red,head);B('wattle',0,.06,.27,.085,.095,.05,M.red,head);}for(const s of [-1,1]){B('eye',s*.177,duck?.39:.29,.306,.055,.066,.04,C.eye,head);B('eye glint',s*.196,duck?.41:.31,.332,.017,.019,.012,C.shine,head);}}
 else{B('neck',0,-.16,-.17,.29,.32,.30,coat,head);B('rounded head',0,.04,.11,cow?.33:.29,.30,.34,sheep?C.face:coat,head);B('muzzle',0,-.14,.38,cow?.32:pig?.25:.23,cow?.17:.15,.19,cow?C.muzzle:pig?C.pigInner:C.face,head);
 for(const s of [-1,1]){const ear=B('soft ear',s*.31,.20,.02,cow?.20:.15,pig?.19:.105,.105,coat,head);ear.rotation.z=s*(pig?-.48:.40);B('ear inner',s*.36,.20,.085,.10,.07,.05,pig?C.pigInner:C.muzzle,head);B('eye',s*.225,.09,.34,.058,.071,.043,C.eye,head);B('eye glint',s*.245,.115,.367,.018,.019,.012,C.shine,head);B('nostril',s*.104,-.12,.54,.039,.029,.018,C.hoof,head);if(cow){const horn=B('short curved horn',s*.20,.34,-.02,.075,.13,.075,C.ivory,head);horn.rotation.z=s*-.31;}}
 if(cow){for(const [x,y,z,rx,ry,rz] of [[-.38,.83,-.25,.14,.28,.29],[.40,.77,.19,.13,.28,.28],[.08,1.12,-.22,.26,.065,.25]])B('coat marking',x,y,z,rx,ry,rz,C.charcoal);B('udder',0,.43,-.27,.23,.13,.24,C.muzzle);for(const s of [-1,1])for(const z of [-.39,-.16])B('udder teat',s*.09,.31,z,.045,.085,.045,C.muzzle);}
 if(sheep){for(let i=0;i<10;i++){const t=i*Math.PI*2/10;B('rounded wool curl',Math.cos(t)*.30,.81+.19*Math.sin(t*2),Math.sin(t)*.49,.27,.25,.29,C.wool);}B('wool cap',0,.26,.10,.29,.17,.28,C.wool,head);}
 B('tail',0,-.13,-.15,pig?.055:.06,pig?.12:.25,.075,pig?C.pig:C.hoof,tail);if(pig)B('curled tail tip',0,-.08,-.23,.09,.08,.07,C.pig,tail);else if(cow)B('tail tuft',0,-.36,-.19,.10,.12,.08,C.charcoal,tail);}
 for(const s of [-1,1])for(const z of bird?[0]:[-.43,.40]){const top=bird?.30:.53,p=pivot('leg pivot',s*(bird?.14:.28),top,z);if(bird){B('rounded shank',0,-.13,0,.043,.13,.045,C.gold,p);if(duck)B('webbed foot',0,-.26,.09,.105,.038,.16,C.gold,p);else for(const toe of [-1,0,1]){const t=B('rounded toe',toe*.047,-.265,.08,.025,.025,.10,C.gold,p);t.rotation.y=toe*.35;}}else{B('upper leg',0,-.09,0,.115,.17,.12,coat,p);B('lower leg',0,-.31,0,.078,.16,.084,coat,p);B('rounded hoof',0,-.47,.026,.104,.062,.13,C.hoof,p);}legs.push({pivot:p,phase:(s===1?1:0)+(z>0?1:0)});}
 const pen=penFor(a),angle=a.id*2.399,rad=1.2+(a.id%3)*.7;root.position=V(pen.x+Math.cos(angle)*rad,0,pen.z+Math.sin(angle)*rad);root.position.y=surfaceHeight(root.position.x,root.position.z);
 return {root,legs,head,tail,species:sp,radius:bird?.36:cow?.68:.49,phase:a.id,angle,target:null,elapsed:0,motion:0};
}
function penFor(a){return ruralZones.find(z=>z.id===animalPenId(a)&&z.species===a.species&&zoneReady(z))||ruralZones.find(z=>z.id===a.species);}
function syncLivestockModels(){
 if(!livestockPen)return;
 for(const a of wheatState.husbandry.animals){let model=livestockAgents.get(a.id);if(!model){model=makeLivestockModel(a);livestockAgents.set(a.id,model);}const pen=penFor(a);if(!pen)continue;if(model.pen!==pen){model.pen=pen;const angle=a.id*2.399,rad=1.2+(a.id%3)*.7;model.root.position.set(pen.x+Math.cos(angle)*rad,0,pen.z+Math.sin(angle)*rad);model.root.position.y=surfaceHeight(model.root.position.x,model.root.position.z);model.target=null;}const scale=.65+.35*Math.min(1,a.age/SPECIES[a.species].adult);model.root.scaling.setAll(scale);}
}
let livestockClock=-Infinity;
function settleLivestock(force=false){
 const now=Math.floor(worldElapsed());if(!force&&now-livestockClock<30000)return;livestockClock=now;if(wheatSaveLocked||!wheatState.husbandry.animals.length)return;
 const h=settleHusbandry(wheatState.husbandry,now);if(h&&h!==wheatState.husbandry&&progressCommit(next=>{next.husbandry=h;return true;}))syncLivestockModels();
}
function tickLivestock(){
 if(!livestockPen)return;settleLivestock();const dt=Math.min(.05,Math.max(0,engine.getDeltaTime()/1000));
 for(const a of wheatState.husbandry.animals){const m=livestockAgents.get(a.id),pen=penFor(a);if(!m||!pen)continue;if(Math.hypot(avatar.position.x-pen.x,avatar.position.z-pen.z)>42)continue;const p=m.root.position;m.elapsed+=dt;
 if(!m.target||m.elapsed>5||Math.hypot(m.target.x-p.x,m.target.z-p.z)<.35){m.elapsed=0;const angle=m.phase+=2.399,rad=Math.min(pen.h-1.5,2.0+(a.id%5)*1.4);const hungry=a.condition<70;m.target={x:pen.x+(hungry?-1.7:Math.cos(angle)*rad),z:pen.z+(weatherVisual.night?1.2:Math.sin(angle)*rad)};}
 const dx=m.target.x-p.x,dz=m.target.z-p.z,len=Math.hypot(dx,dz);let moving=false;
 if(len>.25&&!weatherVisual.night){const speed=m.species==='chicken'||m.species==='duck'?.72:.48,step=Math.min(len,dt*speed),x=p.x+dx/len*step,z=p.z+dz/len*step;
 if(Math.abs(x-pen.x)<pen.h-.65&&Math.abs(z-pen.z)<pen.h-.65&&!blocked(x,z)&&Math.hypot(x-avatar.position.x,z-avatar.position.z)>m.radius+.35&&![...livestockAgents.values()].some(o=>o!==m&&Math.hypot(o.root.position.x-x,o.root.position.z-z)<o.radius+m.radius)){p.set(x,surfaceHeight(x,z),z);m.root.rotation.y=Math.atan2(dx,dz);moving=true;}else m.target=null;}
 m.motion+=dt*(moving?8:1);for(const leg of m.legs)leg.pivot.rotation.x=moving?Math.sin(m.motion+leg.phase*Math.PI)*.30:0;m.head.rotation.x=moving?.045*Math.sin(m.motion):.09*Math.sin(m.motion*1.4)+(m.species==='chicken'?.14*Math.max(0,Math.sin(m.motion*2.5)):0);m.tail.rotation.y=.17*Math.sin(m.motion*1.7);if(m.species==='duck'&&pen.pond&&Math.hypot(p.x-(pen.x-1.7),p.z-(pen.z-2.1))<1.2){p.y=Math.max(p.y,pen.pond.water.position.y-.12);for(const leg of m.legs)leg.pivot.rotation.x=.25*Math.sin(m.motion*2+leg.phase*Math.PI);}
 }
}
function interactLivestock(action,id){
 const f=ruralNearby(),zone=f?.zone,species=zone?.species;if(!ruralDialog.open||!f||wheatSaveLocked||!species||!zoneReady(zone))return false;
 const animals=wheatState.husbandry.animals.filter(a=>animalPenId(a)===zone.id);
 if((action==='buy'||action==='breed')&&(id!==species||animals.length>=zone.capacity))return false;
 if(action==='care'&&!animals.some(a=>a.id===id))return false;
 const extra=zone.extra&&['buy','breed'].includes(action)?zone.id:null;
 const ok=progressCommit(next=>{const q=husbandryAction(next,action,action==='collect'?species:id,Math.floor(worldElapsed()),1,extra);if(!q)return false;Object.assign(next,q.next);if(q.event)record(next.progress,q.event);return true;});
 if(ok){syncLivestockModels();farmAudio.action(action==='collect'?'harvest':action==='water'?'water':'trade');}return ok;
}
function renderLivestock(root,f=livestockPen.station){
 settleLivestock(true);const h=wheatState.husbandry,species=f.zone?.species||'chicken',animals=h.animals.filter(a=>animalPenId(a)===f.zone?.id);
 ruralMetrics(root,[['🐾','Animais',animals.length+' / '+(f.zone?.capacity||MAX_ANIMALS)],['🌾','Ração',h.feed],['💧','Água',h.water]]);
 const act=(action,id,label,disabled=false)=>{const b=progressButton(label,()=>{const ok=interactLivestock(action,id);renderRural(f);$('rural-status').textContent=ok?'Ação salva.':'Ação indisponível.';},wheatSaveLocked||disabled);b.dataset.livestock=action+(id?':'+id:'');return b;};
 const supply=ruralSection(root,'livestock:supply','🌾','Alimentação e água');supply.append(progressEl('small','Consumo e produção a cada dia rural.'),act('feed',null,'🌾 Ração +10 · '+FEED_PRICE+' moedas',h.feed+10>MAX_SUPPLY||wheatState.coins<FEED_PRICE),act('water',null,'💧 Abastecer água +10',h.water+10>MAX_SUPPLY));const buy=ruralSection(root,'livestock:buy','🪙','Adquirir animais',false),catalog=progressEl('div','','cv-animal-grid');buy.append(catalog);
 for(const [id,p] of Object.entries(SPECIES).filter(([id])=>id===species)){const card=progressEl('article','','rural-action-card');card.append(progressEl('strong',p.icon+' '+p.name),progressEl('small','Ração '+p.feed+' · água '+p.water+' por dia · '+p.adult+' dias para adulto'),act('buy',id,'🪙 Adquirir · '+p.price+' moedas',h.animals.length>=MAX_ANIMALS||animals.length>=f.zone.capacity||wheatState.coins<p.price));catalog.append(card);}
 const herd=ruralSection(root,'livestock:herd','🐾','Meus animais',false);if(!animals.length)herd.append(progressEl('small','Nenhum animal adquirido.'));for(const a of animals){const row=progressEl('article','','rural-action-card'),bar=document.createElement('progress');bar.max=100;bar.value=a.condition;bar.setAttribute('aria-label','Bem-estar');row.append(progressEl('strong',SPECIES[a.species].icon+' '+SPECIES[a.species].name+' #'+a.id),progressEl('small',(a.age>=SPECIES[a.species].adult?'Adulto':'Jovem')+' · bem-estar '+a.condition+'%'),bar,act('care',a.id,'Cuidar individualmente',a.condition>=100));herd.append(row);}herd.append(act('breed',species,'Reprodução do rebanho',animals.length<2));const production=ruralSection(root,'livestock:production','🥚','Produção disponível');ruralMetrics(production,Object.entries(PRODUCTS).filter(([id])=>id===SPECIES[species].product).map(([id,p])=>[p.icon,p.name,h.pending[id]]));production.append(act('collect',null,'🧺 Recolher produção',!h.pending[SPECIES[species].product]));
}
window.cvBootStage='livestock';createRuralZones();syncLivestockModels();window.cvBootStage='orchard-sync';syncOrchard(true);
const wildlife=[],wildlifeQA={visits:0,beeVisits:0,butterflyVisits:0,active:0,limit:12}; 
function initWildlife(){const colors=[mat('butterfly amber','#e9a33a'),mat('butterfly violet','#a78cde'),mat('bee gold','#e4b941'),mat('bird blue gray','#7c9ba8')];for(let i=0;i<wildlifeQA.limit;i++){const kind=i<5?'butterfly':i<9?'bee':'bird',r=new Mesh('wildlife '+kind+' '+i,scene);entity('ambient wildlife');const size=kind==='bird'?.24:kind==='bee'?.065:.10,body=sphere(kind+' body',0,0,0,size*.45,size*.48,size,kind==='bird'?colors[3]:kind==='bee'?colors[2]:M.black,false);body.parent=r;const wings=[];for(const side of [-1,1]){const pivot=new Mesh(kind+' wing joint',scene);pivot.parent=r;const w=sphere(kind+' wing',side*size*.75,0,0,size*.85,size*.09,size*.72,kind==='butterfly'?colors[i%2]:kind==='bee'?M.white:colors[3],false);w.parent=pivot;wings.push({pivot,side});if(kind==='butterfly'){const lower=sphere('butterfly hindwing',side*size*.65,0,-size*.60,size*.62,size*.08,size*.52,colors[i%2],false);lower.parent=pivot;}}if(kind==='bee')for(const z of [-.035,.025]){const b=sphere('bee stripe',0,0,z,size*.47,size*.5,.014,M.black,false);b.parent=r;}if(kind==='bird'){for(const [n,x,y,z,rx,ry,rz,m] of [['head',0,.09,.17,.12,.12,.12,colors[3]],['bill',0,.07,.29,.045,.035,.085,M.yellow],['tail',0,-.01,-.24,.08,.025,.16,colors[3]]]){const p=sphere('wild bird '+n,x,y,z,rx,ry,rz,m,false);p.parent=r;}}r.setEnabled(false);wildlife.push({kind,r,wings,phase:i*2.399,wait:0,anchor:null,visited:false});}}
function tickWildlife(dt){wildlifeQA.active=0;const flowers=pathFlowerPositions.filter((_,i)=>i%7===0).map(p=>({x:p.x,z:p.z,y:surfaceHeight(p.x,p.z)+.48}));for(const p of planters)if(p.crop&&p.stage>=.8){const v=p.mesh.position;flowers.push({x:v.x,z:v.z,y:v.y+.38,planter:p});}const nearby=flowers.filter(p=>Math.hypot(p.x-avatar.position.x,p.z-avatar.position.z)<22);const t=performance.now()/1000;for(let i=0;i<wildlife.length;i++){const a=wildlife[i],bird=a.kind==='bird',enabled=!weatherVisual.rain&&!weatherVisual.night&&(bird?Math.hypot(avatar.position.x-home.x,avatar.position.z-home.z)<42:nearby.length>0);a.r.setEnabled(enabled);if(!enabled){a.anchor=null;a.wait=0;continue;}wildlifeQA.active++;if(!a.anchor||a.wait<=0||Math.hypot(a.anchor.x-avatar.position.x,a.anchor.z-avatar.position.z)>24){a.anchor=bird?{x:home.x+Math.cos(a.phase)*10,z:home.z+Math.sin(a.phase)*9,y:home.y+3.8}:nearby[(i+Math.floor(t/7))%nearby.length];a.wait=5+i%3;a.visited=false;}a.wait-=dt;const p=a.anchor,land=!bird&&a.wait<1.5,angle=t*(bird?.65:1.8)+a.phase,radius=bird?3:land?.06:.45;const target=V(p.x+Math.cos(angle)*radius,p.y+(bird?.9+Math.sin(angle)*.4:land?.04:.22+Math.sin(angle*2)*.12),p.z+Math.sin(angle)*radius);if(!a.r.position.lengthSquared())a.r.position.copyFrom(target);else a.r.position.copyFrom(Vector3.Lerp(a.r.position,target,Math.min(1,dt*5)));a.r.rotation.y=-angle;for(const w of a.wings)w.pivot.rotation.z=w.side*(land?.18:Math.sin(t*(bird?10:a.kind==='bee'?42:15)+a.phase)*.82);if(land&&!a.visited&&Vector3.Distance(a.r.position,target)<.20){a.visited=true;wildlifeQA.visits++;if(a.kind==='bee')wildlifeQA.beeVisits++;else wildlifeQA.butterflyVisits++;if(p.planter&&p.planter.crop&&a.kind==='bee')p.planter.pollinated=true;}}}
initWildlife();

const workerBoard=(()=>{if(!missionStation)return null;const m=missionStation;for(const dx of [2.8,-2.8,3.8,-3.8]){const x=m.x+dx,z=m.z,y=surfaceHeight(x,z);if(blocked(x,z)||blocked(x+.7,z)||blocked(x,z+.85)||Math.abs(y-m.y)>.6)continue;const f={id:'workers-board',kind:'workers',label:'Contratar funcionários',icon:'👥',x,z,y,hx:.85,hz:.24};entity('worker recruitment board');for(const d of [-.68,.68])box('worker notice post',x+d,y+.91,z,.13,1.82,.16,M.woodDark);box('worker notice board',x,y+1.28,z,1.7,1.02,.15,M.woodLight);box('worker board roof',x,y+1.9,z,1.96,.13,.60,M.roof);stationSign(f,'FUNCIONÁRIOS',1.68,1.45);worldFixtures.push(f);return f;}return null;})();
const workerModels=new Map(),workerTasks=new Map(),workerPlotSets=new Map(Object.keys(CROP_CALENDAR).map(id=>[id,farmSectors.flatMap(f=>f.plots.map(p=>({...p,preferred:f.preferred}))).filter(p=>p.preferred===id)]));
const workerNotice=document.createElement('div');workerNotice.id='worker-notice';workerNotice.hidden=true;workerNotice.setAttribute('role','status');workerNotice.style.cssText='position:fixed;top:12%;left:50%;transform:translateX(-50%);z-index:20;max-width:58%;background:#304b35;color:#f6e6bf;padding:8px 12px;border:1px solid #c1ce9d;border-radius:8px;font-size:12px;pointer-events:none';document.body.append(workerNotice);let workerNoticeKey='',workerLast=0,workerCursor=0;
function workerCommand(action,job,tier,id,product,reserve){if(!ruralDialog.open||ruralNearby()!==workerBoard||wheatSaveLocked)return false;const ok=progressCommit(s=>{const n=contract(s,action,job,tier,Math.floor(worldElapsed()),id,product,reserve);if(!n)return false;Object.assign(s,n);return true;});if(ok)syncWorkerModels();return ok;}
function workerName(w){return identity(w).name;}
function workerPortrait(w){const p=staffStyle(w),g=identity(w),c=document.createElement('canvas');c.width=96;c.height=96;c.className='staff-portrait';c.setAttribute('role','img');c.setAttribute('aria-label',g.name+', '+(p.hat?'boné':p.bald?'careca':'cabelo'));const x=c.getContext('2d');x.fillStyle='#294332';x.fillRect(0,0,96,96);const ellipse=(a,b,rx,ry,color)=>{x.fillStyle=color;x.beginPath();x.ellipse(a,b,rx,ry,0,0,Math.PI*2);x.fill();};if(!p.bald&&g.gender==='female')ellipse(48,45,26,33,STAFF_HAIR[p.hair]);ellipse(48,86,33,28,STAFF_SHIRTS[p.shirt]);ellipse(48,46,23,27,STAFF_SKIN[p.skin]);if(!p.bald){x.fillStyle=STAFF_HAIR[p.hair];x.beginPath();x.ellipse(48,31,24,15,0,Math.PI,2*Math.PI);x.fill();x.fillRect(24,30,48,9);}for(const a of [39,57])ellipse(a,46,4.2,5.1,'#332c23');if(p.hat){ellipse(48,24,29,9,'#b78a58');x.fillStyle='#b78a58';x.fillRect(27,14,42,12);ellipse(58,29,29,4,'#b78a58');}return c;}
let workersTab='hire',workersJob='crop:wheat';
function renderWorkers(root){const w=wheatState.workers,now=Math.floor(worldElapsed());ruralMetrics(root,[['👥','Funcionários',w.items.length+'/'+MAX_WORKERS],['🪙','Saldo',wheatState.coins+' moedas']]);const tabs=progressEl('nav','','staff-tabs');for(const [key,label] of [['hire','👥 Contratar'],['hired','📋 Funcionários e salários']]){const b=progressButton(label,()=>{workersTab=key;renderRural(workerBoard);});b.setAttribute('aria-pressed',String(workersTab===key));tabs.append(b);}root.append(tabs);if(workersTab==='hire'){const controls=progressEl('div','','staff-filter'),select=document.createElement('select');select.setAttribute('aria-label','Serviço');for(const [key,j] of Object.entries(JOBS)){const icon=j.kind==='crop'?(cropIcons[j.id]||'🌱'):j.kind==='fruit'?(FRUITS[j.id]?.icon||'🍎'):j.kind==='animal'?(SPECIES[j.id]?.icon||'🐾'):'🪙';select.append(new Option(icon+' '+j.label+' · '+w.items.filter(a=>a.job===key).length+'/'+j.cap,key));}select.value=workersJob;select.onchange=()=>{workersJob=select.value;renderRural(workerBoard);};controls.append(progressEl('strong','Especialidade'),select);root.append(controls);const job=JOBS[workersJob],count=w.items.filter(a=>a.job===workersJob).length,list=progressEl('div','','staff-candidate-list');for(const [tier,t] of Object.entries(WORKER_TIERS)){const a=candidateFor(w.items,w.next,workersJob,tier);if(!a)continue;const p=identity(a),s=staffStyle(a),price=wage(a.job,a.tier),card=progressEl('article','','staff-candidate'),details=progressEl('div','','staff-details');card.style.borderLeftColor=t.color;card.dataset.candidate=String(a.candidate);details.append(progressEl('strong',p.name+' · '+s.age+' anos'),progressEl('small',job.label+' · '+t.label),progressEl('small',(s.hat?'Boné · ':s.bald?'Careca · ':'Cabelo · ')+p.origin),progressEl('small','🪙 '+price+' / mês · bônus '+t.quality+'%'));const reason=count>=job.cap?'Limite do serviço':w.items.length>=MAX_WORKERS?'Alojamento lotado':wheatState.coins<price?'Saldo insuficiente':'';const b=progressButton(reason||'Contratar',()=>{const ok=workerCommand('hire',a.job,a.tier,a.candidate);renderRural(workerBoard);$('rural-status').textContent=ok?p.name+' contratado.':'Candidato mudou ou saldo insuficiente.';},!!reason);b.dataset.hireCandidate=String(a.candidate);card.append(workerPortrait(a),details,b);list.append(card);}root.append(list);if(!list.children.length)root.append(progressEl('p','Todos os 24 quartos estão ocupados.'));}else{if(!w.items.length)root.append(progressEl('p','Nenhum funcionário contratado.'));for(const a of w.items){const t=WORKER_TIERS[a.tier],card=progressEl('article','','staff-candidate'),detail=progressEl('div','','staff-details'),actions=progressEl('div','','staff-actions');card.style.borderLeftColor=t.color;detail.append(progressEl('strong',workerName(a)+' · '+staffStyle(a).age+' anos'),progressEl('small',JOBS[a.job].label+' · '+t.label+' · quarto '+(a.room+1)),progressEl('small',wage(a.job,a.tier)+' moedas/mês · '+(a.paidUntil<=now?'Pagamento vencido':'Pago até '+calendarAt(a.paidUntil).day+'/'+calendarAt(a.paidUntil).month)+' · tarefas '+a.completed));actions.append(progressButton('Pagar mês',()=>{workerCommand('pay',null,null,a.id);renderRural(workerBoard);},a.paidUntil>now||wheatState.coins<wage(a.job,a.tier)),progressButton('Encerrar contrato',()=>{workerCommand('fire',null,null,a.id);renderRural(workerBoard);}));card.append(workerPortrait(a),detail,actions);if(a.job==='seller'){const select=document.createElement('select'),reserve=document.createElement('input');select.setAttribute('aria-label','Produto de venda');for(const k of SELL_KEYS){const [kind,id]=k.split(':');select.append(new Option(kind==='crop'?CROP_CALENDAR[id].name:kind==='fruit'?FRUITS[id].name:PRODUCTS[id].name,k));}select.value=a.product;reserve.type='number';reserve.min='0';reserve.max='999';reserve.value=String(a.reserve);reserve.setAttribute('aria-label','Reserva mínima');const cfg=progressEl('div','','staff-seller');cfg.append(progressEl('small','Produto e reserva de estoque'),select,reserve,progressButton('Salvar regra',()=>{workerCommand('configure',null,null,a.id,select.value,Number(reserve.value));renderRural(workerBoard);}));card.append(cfg);}root.append(card);}for(const msg of Object.values(w.alerts))root.append(progressEl('small','⚠ '+msg));}}

const workerPalette=STAFF_SHIRTS.map((c,i)=>mat('worker shirt '+i,c)),workerSkin=STAFF_SKIN.map((c,i)=>mat('worker skin '+i,c)),workerHair=STAFF_HAIR.map((c,i)=>mat('worker hair '+i,c)),workerRarity=Object.fromEntries(Object.entries(WORKER_TIERS).map(([k,t])=>[k,mat('worker contract '+k,t.color)]));
function workerHome(w){const job=JOBS[w.job];if(job.kind==='crop'){const p=workerPlotSets.get(job.id)?.[w.id%Math.max(1,workerPlotSets.get(job.id)?.length??0)];if(p)return {x:p.x,z:p.z};}if(job.kind==='animal'){const p=ruralZones.find(z=>z.species===job.id);if(p)return {x:p.x,z:p.z};}if(job.kind==='fruit'){const t=wheatState.orchard.trees.find(t=>t.species===job.id);if(t)return t;}return marketStation||workerBoard||home;}

function staffHeight(x,z,y){if(!workerDorm)return null;const d=workerDorm,lx=x-d.x,lz=z-d.z;if(lx>=d.w/2&&lx<=d.w/2+1.85&&Math.abs(lz)<=.42&&y>=d.y+1.7)return d.y+.26+KITNET.h;if(Math.abs(lx-(d.w/2+1.05))<=.70&&lz>=-7.2&&lz<=0){const u=Math.max(0,Math.min(1,(lz+7.2)/7.2));return d.y+.26+Math.floor(u*17+1e-6)*KITNET.h/17;}if(lx>d.w/2&&lx<d.w/2+1.8&&Math.abs(lz)<.42&&y>=d.y+1.7)return d.y+.26+KITNET.h;if(Math.abs(lx)<=d.w/2+.01&&Math.abs(lz)<=d.d/2+.01)return d.y+.26+(y>=d.y+1.7?KITNET.h:0);return null;}
function staffClearance(x,z,y){const d=workerDorm;if(!d)return 1;const lx=x-d.x,lz=z-d.z,k=Math.max(0,Math.min(5,Math.floor((lx+d.w/2)/KITNET.pitch))),dx=lx-(-11+k*KITNET.pitch),v=Math.abs(lz)-KITNET.corridor/2;let c=Math.min(d.d/2-Math.abs(lz),d.w/2-Math.abs(lx));if(v>=-.2)c=Math.min(c,KITNET.pitch/2-Math.abs(dx),...KIT_FIXTURES.map(f=>Math.max(Math.abs(dx-f.x)-f.w/2,Math.abs(v-f.v)-f.d/2)));return c;}
function staffWallContact(x,z,from=null){const d=workerDorm;if(!d)return false;const f=(x,z)=>{const lx=x-d.x,lz=z-d.z;if(Math.abs(lz)<.68&&lx<0)return 1;return Math.abs(Math.max(Math.abs(lx)-d.w/2,Math.abs(lz)-d.d/2))-.32;};if(staffHeight(x,z,d.y)===null)return obstacleEntered(f(x,z),from?f(from.x,from.z):null);return staffBlocked(x,z,d.y+.26)&&!(from&&staffBlocked(from.x,from.z,d.y+.26)&&staffClearance(x,z,d.y+.26)>staffClearance(from.x,from.z,d.y+.26)+1e-6);}
function staffBlocked(x,z,y,r=.20){const d=workerDorm;if(!d)return false;const lx=x-d.x,lz=z-d.z,floor=y>=d.y+1.7?1:0;if(lx>d.w/2&&lx<d.w/2+1.85)return false;if(Math.abs(lz)>d.d/2-r)return true;if(Math.abs(lx)>d.w/2-r&&!(floor===0&&lx<0&&Math.abs(lz)<.65||floor===1&&lx>0&&Math.abs(lz)<.60))return true;if(Math.abs(lz)<KITNET.corridor/2-r)return false;const k=Math.max(0,Math.min(5,Math.floor((lx+d.w/2)/KITNET.pitch))),rx=-11+k*KITNET.pitch,dx=lx-rx,v=Math.abs(lz)-KITNET.corridor/2;if(Math.abs(dx)>KITNET.pitch/2-r||v<r&&Math.abs(dx)>.53-r)return true;return kitBlocked(dx,v,r);}
function buildWorkerDorm(){const {w,d,h}=KITNET;let site=null;const candidates=[];for(let x=17;x<=104;x+=2)for(let z=-61;z<=17;z+=2)candidates.push({x,z,score:Math.hypot(x-home.x,z-home.z)});candidates.sort((a,b)=>a.score-b.score);outer:for(const {x,z} of candidates){const y=height(x,z);for(let dx=-w/2-1.8;dx<=w/2+2.5;dx+=1.6)for(let dz=-d/2-1.2;dz<=d/2+1.2;dz+=1.6){const a=x+dx,b=z+dz;if(a<minX+1||a>maxX-1||b<minZ+1||b>maxZ-1||Math.abs(height(a,b)-y)>.65||blocked(a,b)||sectorAt(a,b)||roadMaskAt(a,b)>.13||nearRiver(a,b).dist<nearRiver(a,b).w/2+1.1)continue outer;}site={x,z,y};break;}if(!site)return null;
 const {x,z,y}=site,rooms=[],roof=[],upper=[],ground=[],C=(a,b,c)=>V(x+a,y+b,z+c),B=(n,a,b,c,ww,hh,dd,m,list=ground)=>{const p=C(a,b,c),mesh=box('staff '+n,p.x,p.y,p.z,ww,hh,dd,m,0,false);list.push(mesh);return mesh;};const palettes=['#a4b78d','#a1b6cc','#d5a39d','#c9b18a','#b0a2c5','#a6c8b7'].map((c,i)=>mat('kitnet textile '+i,c));
 entity('worker residence');B('foundation',0,.13,0,w,.26,d,M.stone);const entrance=C(-w/2-.5,.26,0),stairA=C(w/2+1.05,.26,-7.2),stairB=C(w/2+1.05,.26+h,0);
 for(let floor=0;floor<2;floor++){entity('staff floor '+floor);const f=.26+floor*h,list=floor?upper:ground;B('floor '+floor,0,f-.05,0,w,.10,d,M.woodLight,list);for(const side of [-1,1]){B('outer wall '+floor,0,f+1.15,side*d/2,w,2.30,.15,M.plaster,list);for(let k=0;k<7;k++)B('private wall '+floor+' '+side+' '+k,-w/2+k*4.4,f+1.12,side*3.85,.13,2.24,5.5,M.plaster,list);
 for(let k=0;k<6;k++){const slot=floor*12+(side<0?0:6)+k,r=roomPlan(slot),rx=r.x,accent=palettes[(slot*5+floor)%palettes.length],R=(a,b,v)=>C(rx+a,f+b,side*(1.1+v)),F=(n,a,b,v,ww,hh,dd,m)=>B(n+' '+slot,rx+a,f+b,side*(1.1+v),ww,hh,dd,m,list);
 F('entry wall L',-1.40,1.1,0,1.6,2.2,.12,accent);F('entry wall R',1.40,1.1,0,1.6,2.2,.12,accent);F('entry header',0,2.15,0,1.2,.24,.12,M.woodDark);F('door open',-.60,.92,.53,.08,1.84,1.0,M.woodLight);
 for(const o of KIT_FIXTURES){const {id,a}=o,xx=o.x,v=o.v;if(id.startsWith('bath-wall')){F(id,xx,1.08,v,o.w,2.16,o.d,M.plaster);continue;}if(id==='bed'){F('bed frame',xx,.21,v,o.w,.38,o.d,M.woodDark);F('mattress',xx,.46,v,o.w-.07,.14,o.d-.08,M.white);F('pillow',xx,.58,v+.70,.83,.14,.34,M.plaster);}else if(id==='wardrobe'){F(id,xx,.87,v,o.w,1.74,o.d,M.wood);F('wardrobe handle',xx+.19,.88,v-.45,.05,.14,.04,M.stone);}else if(id==='fridge'){F(id,xx,.76,v,o.w,1.52,o.d,M.stoneLight);F('fridge upper panel',xx,.1+1.03,v-.32,.71,.65,.045,M.white);F('fridge lower panel',xx,.40,v-.32,.71,.77,.045,M.white);}else if(id==='stove'){F(id,xx,.43,v,o.w,.86,o.d,M.woodDark);F('cooktop',xx,.89,v,.75,.08,.68,M.black);for(const a of [-.17,.17])F('burner',xx+a,.95,v,.23,.03,.23,M.stone);}else if(id==='table'){F(id,xx,.75,v,o.w,.10,o.d,accent);for(const a of [-.25,.25])F('table leg',xx+a,.35,v,.09,.70,.12,M.woodDark);}else if(id==='toilet'){F('toilet pedestal',xx,.23,v,.38,.46,.45,M.white);F('toilet bowl',xx,.49,v,o.w,.19,o.d,M.white);F('toilet cistern',xx,.75,v+.22,.58,.57,.20,M.white);}else if(id==='sink'){F('sink cabinet',xx,.41,v,o.w,.82,o.d,M.woodLight);F('sink basin',xx,.87,v,.59,.14,.50,M.white);F('tap',xx,1.03,v+.13,.09,.23,.09,M.stone);}else if(id==='shower'){F('shower tray',xx,.06,v,o.w,.12,o.d,M.white);F('shower pipe',xx,1.37,v+.29,.06,1.12,.06,M.stone);F('shower head',xx,1.93,v+.13,.20,.08,.20,M.stoneLight);}else if(id==='planter'){F('plant pot',xx,.23,v,o.w,.46,o.d,accent);F('pot soil',xx,.47,v,.43,.04,.43,M.earth);}}
 F('bathroom door open',.57,1.01,3.64,.09,2.02,.81,M.woodLight);entity('staff movable furnishings');const blanket=F('blanket',-1.38,.58,3.72,1.04,.075,1.34,accent),pot=KIT_FIXTURES.find(f=>f.id==='planter'),plantPos=R(pot.x,.50,pot.v),plantMesh=own(new Mesh('staff live flower '+slot,scene),flowerMat,false);plantMesh.position.copyFrom(plantPos);list.push(plantMesh);const id='staff-pot-'+slot,saved=gardenSave[id],crop=saved&&Object.hasOwn(flowerCatalog,saved.species)&&Number.isFinite(saved.plantedAt)&&saved.plantedAt>=0&&saved.plantedAt<=Date.now()?{species:saved.species,plantedAt:saved.plantedAt,...(Number.isFinite(saved.wateredAt)&&saved.wateredAt>=saved.plantedAt&&saved.wateredAt<=Date.now()?{wateredAt:saved.wateredAt}:{})}:null,p={id,staff:true,type:'ceramic',floor:floor+1,x:plantPos.x,z:plantPos.z,y:y+f,mesh:plantMesh,crop,stage:0,config:planterTypes.ceramic};planters.push(p);rebuildCrop(p);updateCrop(p);rooms.push({slot,floor,gender:r.gender,door:R(0,0,-.4),bed:R(-1.38,.55,3.94),blanket,planter:p,fixtures:KIT_FIXTURES,stand:goal=>{const q=KIT_STANDS[goal];return q?R(q.x,0,q.v):null;},path:goal=>kitPath(goal).map(q=>R(q.x,0,q.v))});entity('staff floor '+floor);}}
 const doorZ=0,side=floor?1:-1;for(const e of [-1,1]){if(e!==side){B('solid end '+floor,e*w/2,f+1.15,0,.15,2.3,d,M.plaster,list);continue;}for(const [a,b] of [[-d/2,doorZ-.7],[doorZ+.7,d/2]])if(b>a)B('end wall '+floor,e*w/2,f+1.15,(a+b)/2,.15,2.3,b-a,M.plaster,list);}}
 entity('staff stairs');for(let i=0;i<17;i++){const q=Vector3.Lerp(stairA,stairB,(i+.5)/17);box('staff stair tread '+i,q.x,y+.26+(i+1)*h/17-.08,q.z,1.5,.16,.45,M.woodDark,0,false);}for(const side of [-1,1])beam('staff stair rail',stairA.add(V(side*.72,.86,0)),stairB.add(V(side*.72,.86,0)),.08,M.woodDark);entity('staff floor 1');B('upper landing',w/2+.55,.26+h-.05,0,1.5,.10,.84,M.woodLight,upper);
 entity('staff roof');for(const side of [-1,1]){const r=B('roof slope',0,6.30,side*d/4,w+.7,.18,d/2+.6,M.roof,roof);r.rotation.x=side*.13;}
 entity('staff fence');const fx=w/2+2.6,fz=d/2+1.5;for(const edge of [-1,1])for(const axis of [0,1]){const span=axis?fz:fx;for(let a=-span;a<span;a+=1.8){if(axis&&edge===-1&&a<1.2&&a+1.8>-.9)continue;const p=axis?C(edge*fx,0,a):C(a,0,edge*fz),q=axis?C(edge*fx,0,Math.min(span,a+1.8)):C(Math.min(span,a+1.8),0,edge*fz);p.y=height(p.x,p.z);q.y=height(q.x,q.z);livestockRails.push([p,q]);for(const hh of [.4,.85])beam('staff fence rail',p.add(V(0,hh,0)),q.add(V(0,hh,0)),.09,M.wood);box('staff fence post',p.x,p.y+.52,p.z,.14,1.04,.14,M.woodDark);}}
 registerCameraBuilding({id:'staff-residence',x,z,w,d,angle:0});return {x,z,y,w,d,rooms,roof,upper,ground,entrance,stairA,stairB,service:{eat:true,drink:true,toilet:true,idle:entrance},C};}
workerDorm=buildWorkerDorm();

function bridgeCoords(b,x,z){const dx=x-b.a.x,dz=z-b.a.z;return {u:dx*b.ux+dz*b.uz,v:dx*b.uz-dz*b.ux};}
function staffBridgeAt(x,z){for(const b of staffBridges){const q=bridgeCoords(b,x,z);if(q.u>=0&&q.u<=b.length&&Math.abs(q.v)<=b.half-.22)return {bridge:b,y:q.u<b.ramp?b.a.y+(b.deck-b.a.y)*q.u/b.ramp:q.u>b.length-b.ramp?b.deck+(b.b.y-b.deck)*(q.u-b.length+b.ramp)/b.ramp:b.deck};}return null;}
function staffBridgeRailBlocked(x,z,from){for(const b of staffBridges){const clear=(x,z)=>{const q=bridgeCoords(b,x,z);return Math.max(-q.u,q.u-b.length,Math.abs(Math.abs(q.v)-b.half)-.23);};if(obstacleEntered(clear(x,z),from?clear(from.x,from.z):null))return true;}return false;}
function addStaffBridge(id,a0,b0){let dx=b0.x-a0.x,dz=b0.z-a0.z,len=Math.hypot(dx,dz);if(len<.5)return null;const ux=dx/len,uz=dz/len,wet=p=>{const r=nearRiver(p.x,p.z);return r.dist<r.w/2+1.1||eastWaterAt(p.x,p.z).edge<1.1;};let a=a0.clone(),b=b0.clone();for(let i=0;i<32&&wet(a);i++)a.subtractInPlace(V(ux*.45,0,uz*.45));for(let i=0;i<32&&wet(b);i++)b.addInPlace(V(ux*.45,0,uz*.45));if(wet(a)||wet(b))return null;const center=Vector3.Lerp(a,b,.5),r=nearRiver(center.x,center.z);if(r.dist>r.w*.7&&eastWaterAt(center.x,center.z).edge>0)return null;
 a.y=surfaceHeight(a.x,a.z);b.y=surfaceHeight(b.x,b.z);len=Math.hypot(b.x-a.x,b.z-a.z);const deck=Math.max(a.y,b.y,r.y+.60),half=1.58,ramp=Math.min(len*.30,Math.max(1.4,Math.abs(a.y-deck)*3,Math.abs(b.y-deck)*3));const q={id,a,b,ux,uz,length:len,half,deck,ramp};staffBridges.push(q);
 entity('staff bridge '+id);const side=V(uz,0,-ux),angle=Math.atan2(ux,uz),N=Math.ceil(len/.34),at=t=>{const p=Vector3.Lerp(a,b,t);p.y=staffBridgeAt(p.x,p.z)?.y??deck;return p;};for(let i=0;i<N;i++){const p=at((i+.5)/N);box('staff crossing deck',p.x,p.y-.09,p.z,half*2,.18,len/N+.014,i%3?M.woodLight:M.wood,angle,false);for(const s of [-1,1])if(i%4===0){const v=p.add(side.scale(s*half));box('staff bridge post',v.x,v.y+.51,v.z,.15,1.02,.15,M.woodDark,0,false);if(i%8===0)box('staff bridge support',v.x,v.y-1,v.z,.25,2,.25,M.woodDark,0,false);}}
 for(const s of [-1,1])for(const h of [.52,.96])for(const [t,u] of [[0,ramp/len],[ramp/len,1-ramp/len],[1-ramp/len,1]])beam('staff bridge railing',at(t).add(side.scale(s*half)).add(V(0,h,0)),at(u).add(side.scale(s*half)).add(V(0,h,0)),.11,M.woodDark);return q;}
function buildStaffBridges(){for(const spec of layout.bridges.slice(1))addStaffBridge(spec.id,...spec.ends.map(p=>P(...p)));if(!workerDorm)return;const d=workerDorm,center=V(d.x,0,d.z);let best=null;for(const seg of riverSegments){const t=Math.max(0,Math.min(1,((center.x-seg.x)*seg.dx+(center.z-seg.z)*seg.dz)/seg.den)),x=seg.x+t*seg.dx,z=seg.z+t*seg.dz,l=Math.hypot(seg.dx,seg.dz),r=nearRiver(x,z);if(l<.01||Math.hypot(x-ba.x,z-ba.z)<8)continue;const n=V(-seg.dz/l,0,seg.dx/l),a=V(x,0,z).add(n.scale(r.w/2+2.5)),b=V(x,0,z).subtract(n.scale(r.w/2+2.5));if(blocked(a.x,a.z)||blocked(b.x,b.z)||sectorAt(a.x,a.z)||sectorAt(b.x,b.z)||Math.abs(height(a.x,a.z)-height(b.x,b.z))>.65)continue;const score=Math.hypot(x-center.x,z-center.z);if(!best||score<best.score)best={a,b,score};}if(best)addStaffBridge('staff-direct',best.a,best.b);}
function staffRiverCrosses(a,b){const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/1.2);for(let i=1;i<n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,r=nearRiver(x,z);if(r.dist<r.w*.5||eastWaterAt(x,z).edge<0)return true;}return false;}
function workerBridgeRoute(a,b){if(!staffRiverCrosses(a,b))return [];let best=null;for(const q of [...staffBridges,{id:'home',a:ba,b:bb}])for(const [entry,exit] of [[q.a,q.b],[q.b,q.a]]){if(staffRiverCrosses(a,entry)||staffRiverCrosses(exit,b))continue;const cost=Math.hypot(a.x-entry.x,a.z-entry.z)+Math.hypot(entry.x-exit.x,entry.z-exit.z)+Math.hypot(exit.x-b.x,exit.z-b.z);if(!best||cost<best.cost)best={cost,points:[entry,exit]};}return best?.points||[];}

buildStaffBridges();
function dormGoal(w,goal){const r=workerDorm?.rooms.find(r=>r.slot===w.room);return goal==='idle'?workerDorm?.entrance:r?.stand(goal);}

function workerTalkStation(w,m){return {id:'talk-'+w.id,kind:'worker-talk',workerId:w.id,label:'Conversar · '+workerName(w),icon:'💬',x:m.root.position.x,z:m.root.position.z,y:m.root.position.y,hx:.25,hz:.25};}
function nearbyWorkers(){return wheatState.workers.items.flatMap(w=>{const m=workerModels.get(w.id);return m&&m.root.isEnabled()&&w.life?.goal!=='sleep'&&w.life?.goal!=='toilet'?[workerTalkStation(w,m)]:[];});}
function renderWorkerTalk(f,root){const w=wheatState.workers.items.find(a=>a.id===f.workerId);if(!w)return;const p=identity(w),m=workerModels.get(w.id),lines=dialogueFor(w,JOBS[w.job].label,WORKER_TIERS[w.tier].label);root.append(progressEl('strong',p.name),progressEl('small','De '+p.origin+' · '+JOBS[w.job].label+' · quarto '+(w.room+1)),progressEl('small','Passatempo: '+p.hobby));const answer=progressEl('p','Olá! O que gostaria de conversar?','rural-action-card');answer.setAttribute('role','status');root.append(answer);for(const topic of dialogueTopics){const section=ruralSection(root,'talk:'+topic,'💬',topic,false);for(const line of lines.filter(v=>v.topic===topic))section.append(progressButton(line.question,()=>{if(!m||Math.hypot(m.root.position.x-avatar.position.x,m.root.position.z-avatar.position.z)>2.2)return;answer.textContent=line.answer;m.talkUntil=performance.now()+4200;m.talk=true;}));}}

function syncWorkerModels(){for(const [id,m] of workerModels)if(!wheatState.workers.items.some(w=>w.id===id)){m.root.dispose(false,false);workerModels.delete(id);workerTasks.delete(id);}for(const w of wheatState.workers.items){if(workerModels.has(w.id))continue;const root=new Mesh('employee '+w.id,scene);entity('employee '+w.id);const style=staffStyle(w),skin=workerSkin[style.skin],shirt=workerPalette[style.shirt],hair=workerHair[style.hair],female=roomGender(w.room)==='female',parts=[],B=(name,x,y,z,a,b,c,m)=>{const p=box('employee '+name,x,y,z,a,b,c,m,0,false);p.parent=root;return p;};parts.push(B('shirt',0,.97,0,female?.39:.42,.63,.30,shirt));for(const d of [-1,1])parts.push(B('trouser leg',d*.13,.36,0,.15,.62,.17,w.id%3?M.woodDark:M.black));for(const d of [-1,1])parts.push(B('sleeve',d*.29,.95,0,.14,.52,.16,skin));for(let i=0;i<2;i++){const b=B('boot',0,0,0,.17,.16,.24,style.boots?M.wood:M.black);b.parent=parts[i+1];b.position.set(0,-.265,.045);}const H=sphere('employee face',0,1.50,0,.22,.25,.22,skin,false);H.parent=root;const faceParts=[H];for(const d of [-1,1]){const eye=sphere('employee eye',d*.085,1.52,.204,.038,.047,.028,M.black,false);eye.parent=root;faceParts.push(eye);}if(!style.bald){const h=sphere('employee hair',0,1.65,-.025,.23,female?.19:.13,.23,hair,false);h.parent=root;faceParts.push(h);if(female){const h=sphere('employee long hair',0,1.36,-.17,.18,.30,.13,hair,false);h.parent=root;faceParts.push(h);}}if(style.hat){const h=cyl('employee hat',0,1.75,0,.34,.09,M.sand);h.parent=root;faceParts.push(h);const brim=B('cap brim',0,1.72,.22,.38,.045,.26,M.sand);faceParts.push(brim);}B('rarity badge',.10,1.15,.17,.09,.11,.035,workerRarity[w.tier]);const p=workerHome(w);root.position.set(p.x,surfaceHeight(p.x,p.z),p.z);workerModels.set(w.id,{root,style,parts,rest:parts.map(p=>p.position.clone()),faceParts,faceRest:faceParts.map(p=>p.position.y),gait:{},goal:'work',route:[],routeAt:0,arrived:null,talkUntil:0});}}
function employeeFruitSite(id){if(wheatState.orchard.seeds[id]<1)return null;const base=wheatState.orchard.trees.find(t=>t.species===id)||marketStation;for(let r=4;r<=14;r+=2)for(let i=0;i<12;i++){const a=i*Math.PI/6,x=base.x+Math.cos(a)*r,z=base.z+Math.sin(a)*r;if(validResourceGround(null,x,z))return {x,z};}return null;}
let lifeTick=0;
function tickWorkers(dt){const now=Math.floor(worldElapsed()),real=performance.now();if(real-lifeTick>4000&&!wheatSaveLocked&&wheatState.workers.items.length&&!ruralDialog.open){lifeTick=real;progressCommit(s=>{s.workers.items=assignRooms(s.workers.items).map(w=>({...w,life:advanceLife(w.life,now,w.paidUntil>now,workerModels.get(w.id)?.arrived)}));return true;});}if(real-workerLast>1000&&!wheatSaveLocked&&wheatState.workers.items.length&&!ruralDialog.open&&!domesticRun){workerLast=real;const due=wheatState.workers.items.filter(w=>w.nextAt<=now&&workAllowed(w.life,now));const w=due.length?due[workerCursor++%due.length]:null;if(w){const job=JOBS[w.job],site=workerHome(w),ctx={plots:job.kind==='crop'?[...(workerPlotSets.get(job.id)||[]),...allFarmPlots.filter(p=>wheatState.plots[p.id]?.crop===job.id&&!workerPlotSets.get(job.id)?.some(q=>q.id===p.id))]:[],fruitSite:job.kind==='fruit'?employeeFruitSite(job.id):null,animalSite:site,marketSite:marketStation};const q=workerStep(wheatState,w.id,now,Date.now(),ctx);if(q&&progressCommit(s=>{Object.assign(s,q.next);return true;})){if(q.task){workerTasks.set(w.id,{...q.task,until:real+8000});farmCache.clear();wheatVisualKey='';if(q.task.kind==='plant'&&job.kind==='fruit')syncOrchard(true);}}}}
 const messages=Object.values(wheatState.workers.alerts),key=messages.join(' · ');if(key!==workerNoticeKey){workerNoticeKey=key;workerNotice.textContent=key;workerNotice.hidden=!key;if(key){clearTimeout(workerNotice.timer);workerNotice.timer=setTimeout(()=>workerNotice.hidden=true,7000);}}
 for(const w of wheatState.workers.items){const m=workerModels.get(w.id);if(!m)continue;const p=m.root.position,goal=w.life?.goal||'work',talk=real<m.talkUntil,near=Math.hypot(p.x-avatar.position.x,p.z-avatar.position.z)<45;m.root.setEnabled(near);if(goal!==m.goal){m.goal=goal;m.arrived=null;m.route=[];m.routeAt=0;m.crossing=[];m.crossKey=null;}const task=workerTasks.get(w.id),room=workerDorm?.rooms.find(r=>r.slot===w.room),target=goal==='work'?(task||workerHome(w)):dormGoal(w,goal);if(!target)continue;
 if(talk){m.root.rotation.y=Math.atan2(avatar.position.x-p.x,avatar.position.z-p.z);applyHumanPose(m.parts,m.rest,humanGait(m.gait,0,dt));m.parts[4].rotation.x=-.40+.17*Math.sin(real*.005);continue;}
 // Off-screen routing still progresses, bounded to one small movement step per frame.
 const inside=workerDorm&&Math.abs(p.x-workerDorm.x)<workerDorm.w/2+.05&&Math.abs(p.z-workerDorm.z)<workerDorm.d/2+.05;
 const needs=['sleep','eat','drink','toilet'].includes(goal)&&room;const key=goal+':'+(room?.slot??-1);const onUpper=workerDorm&&p.y>workerDorm.y+1.7;const at=(v,t=.30)=>Math.hypot(p.x-v.x,p.z-v.z)<(v===workerDorm?.stairB? .08:t)&&Math.abs(p.y-v.y)<(v===workerDorm?.stairB? .08:.30);
 if(m.root.rotation.x!==0&&goal!=='sleep'){m.root.rotation.x=0;const stand=room?.stand('sleep');if(stand)p.copyFrom(stand);if(room)room.blanket.scaling.y=1;}
 if(m.arrived===goal&&needs){if(goal==='sleep'){m.root.rotation.x=Math.PI/2;p.copyFrom(room.bed);room.blanket.scaling.y=2.2;}else{m.parts[4].rotation.x=goal==='toilet'?-.28:-1.1+.22*Math.sin(real*.006);m.parts[3].rotation.x=goal==='eat'?-.65:0;}continue;}
 if(m.navKey!==key){m.navKey=key;m.nav=[];m.navIndex=0;if(needs){if(!inside){if(room.floor){m.nav.push(workerDorm.stairA,workerDorm.stairB,workerDorm.C(workerDorm.w/2-.45,.26+KITNET.h,0));}else m.nav.push(workerDorm.entrance,workerDorm.C(-workerDorm.w/2+.35,.26,0));}else if(Math.abs(p.z-workerDorm.z)>1.0){const oldGoal=m.lastNeed||'sleep';m.nav.push(...room.path(oldGoal).slice().reverse(),room.door);}m.nav.push(room.door,...room.path(goal));m.lastNeed=goal;}else if(inside||onUpper){if(room){m.nav.push(...room.path(m.lastNeed||'sleep').slice().reverse(),room.door);}if(onUpper)m.nav.push(workerDorm.C(workerDorm.w/2-.45,.26+KITNET.h,0),workerDorm.stairB,workerDorm.stairA);else m.nav.push(workerDorm.C(-workerDorm.w/2+.35,.26,0),workerDorm.entrance);}}
 while(m.navIndex<m.nav.length&&at(m.nav[m.navIndex]))m.navIndex++;
 let dest=m.nav[m.navIndex]||target;const crossKey=m.navKey+':'+m.navIndex+':'+dest.x.toFixed(1)+':'+dest.z.toFixed(1);if(m.crossKey!==crossKey){m.crossKey=crossKey;m.crossing=staffHeight(p.x,p.z,p.y)===null?workerBridgeRoute(p,dest):[];m.route=[];m.routeAt=0;}while(m.crossing?.length&&Math.hypot(p.x-m.crossing[0].x,p.z-m.crossing[0].z)<.30)m.crossing.shift();if(m.crossing?.length)dest=m.crossing[0];let interior=!!workerDorm&&(inside||staffHeight(dest.x,dest.z,dest.y??p.y)!==null&&Math.hypot(dest.x-p.x,dest.z-p.z)<1.8);
 const dx=dest.x-p.x,dz=dest.z-p.z,len=Math.hypot(dx,dz),dy=(dest.y??surfaceHeight(dest.x,dest.z))-p.y;
 if(len<.30&&Math.abs(dy)<.30){if(m.crossing?.length){m.crossing.shift();continue;}if(needs&&m.navIndex>=m.nav.length){m.arrived=goal;if(goal==='sleep'){p.copyFrom(room.bed);m.root.rotation.x=Math.PI/2;m.root.rotation.y=room.door.z<workerDorm.z?Math.PI:0;}}else if(goal==='work'&&task){m.parts[4].rotation.x=-.7+.35*Math.sin(real*.007);if(real>task.until)workerTasks.delete(w.id);}else if(goal==='idle')m.arrived=goal;continue;}
 let aim=dest;if(!interior){const directX=p.x+dx/Math.max(.001,len)*.8,directZ=p.z+dz/Math.max(.001,len)*.8;if(blocked(directX,directZ)&&real>m.routeAt){m.routeAt=real+2500;const grid=q=>({x:Math.round(q.x),z:Math.round(q.z)}),a=grid(p),b=grid(dest),key=q=>q.x+':'+q.z,dist=(u,v)=>Math.hypot(u.x-v.x,u.z-v.z);m.route=(findRoute(a,b,q=>[[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>({x:q.x+x,z:q.z+z})).filter(v=>!blocked(v.x,v.z)),dist,key,1400)||[]).slice(1);}while(m.route.length&&Math.hypot(m.route[0].x-p.x,m.route[0].z-p.z)<.65)m.route.shift();if(m.route.length)aim=m.route[0];}
 const ax=aim.x-p.x,az=aim.z-p.z,al=Math.hypot(ax,az),step=Math.min(al,dt*2.2),nx=p.x+ax/Math.max(.001,al)*step,nz=p.z+az/Math.max(.001,al)*step;let travelled=0;const sh=staffHeight(nx,nz,p.y);if(interior&&sh!==null?!staffBlocked(nx,nz,sh):!blocked(nx,nz,false,{x:p.x,z:p.z})){p.set(nx,sh??surfaceHeight(nx,nz),nz);m.root.rotation.y=Math.atan2(ax,az);travelled=step;}const pose=humanGait(m.gait,travelled,dt);applyHumanPose(m.parts,m.rest,pose);m.faceParts.forEach((part,i)=>part.position.y=m.faceRest[i]+pose.bob);}
 if(workerDorm){const cut=Math.hypot(avatar.position.x-workerDorm.x,avatar.position.z-workerDorm.z)<12;for(const m of workerDorm.roof)m.setEnabled(!cut);const lower=cut&&avatar.position.y<workerDorm.y+1.7;for(const m of workerDorm.upper)m.setEnabled(!lower);for(const r of workerDorm.rooms)r.planter.mesh.setEnabled(!!r.planter.crop&&!(lower&&r.floor===1));}
}
entity('domestic animated effects');const domesticFX={drops:Array.from({length:18},(_,i)=>sphere('domestic water drop '+i,0,0,0,.027,.12,.027,M.fall,false)),soap:Array.from({length:8},(_,i)=>sphere('soap bubble '+i,0,0,0,.065,.065,.065,M.white,false)),cover:box('animated sleep blanket',0,0,0,1.43,.12,1.25,M.leaf2,0,false),privacy:box('opaque bathroom privacy mosaic',0,0,0,.72,.56,.45,M.stoneLight,0,false)};for(const m of [...domesticFX.drops,...domesticFX.soap,domesticFX.cover,domesticFX.privacy])m.setEnabled(false);
function startDomestic(f,minutes=30){if(domesticRun||!f||!stationNearby(f)||wheatSaveLocked||titleMode||photoMode||regionalOpen||build.open||entry.action||seating.phase!=='idle'||resourceSwing||tillWork||!['bath','shower','toilet','bed'].includes(f.id)&&f.kind!=='pond')return false;cancelInput();if(petSystem.interactionActive())petSystem.cancelInteraction();const p=avatar.position.clone(),yaw=avatar.rotation.y,kind=f.kind==='pond'?'pond':f.id,local=f.local,stand=kind==='shower'?home.C(local.x,UPPER_Y+.13,local.z):kind==='bed'?home.C(local.x,UPPER_Y+.70,local.z-.69):p.clone();const lid=kind==='toilet'?groups['interior toilet'].find(m=>m.name==='toilet hinged lid'):null;domesticRun={f,kind,minutes,p,yaw,stand,elapsed:0,lid,lidRotation:lid?.rotation.x??0,baseY:f.water?.position.y};return true;}
function finishDomestic(a,success){for(const m of [...domesticFX.drops,...domesticFX.soap,domesticFX.cover,domesticFX.privacy])m.setEnabled(false);avatar.position.copyFrom(a.p);avatar.rotation.set(0,a.yaw,0);releaseHand();walkPose(0,.1);for(let i=1;i<5;i++){bodyParts[i].rotation.x=0;bodyParts[i].position.copyFrom(limbRest[i]);}if(a.lid)a.lid.rotation.x=a.lidRotation;if(a.kind==='pond'){a.f.water.position.y=a.baseY;a.f.water.scaling.y=1;a.f.handle.rotation.y=0;}domesticRun=null;if(!success)return;let ok=false;if(a.kind==='bed')ok=sleepAtBed(a.minutes);else if(a.kind==='pond')ok=progressCommit(s=>{s.ponds[a.f.zone.id]={cleaned:Math.floor(worldElapsed())};return true;});else ok=progressCommit(s=>{const n=wash(s,Math.floor(worldElapsed()),a.kind==='bath'?'sink':a.kind);if(!n)return false;Object.assign(s,n);return true;});domesticQA.last={kind:a.kind,success:ok};if(ok){domesticQA.completed++;farmAudio.action(a.kind==='bed'?'harvest':'water');}updateWorldActions(.2);}
function tickDomestic(dt){const a=domesticRun;if(!a)return;a.elapsed+=Math.max(0,Math.min(.1,dt));const t=a.elapsed,duration=a.kind==='bed'?6:a.kind==='pond'?8:6.5,u=Math.min(1,t/duration),f=a.f;const enter=Math.min(1,t/.9),leave=Math.max(0,(t-duration+.9)/.9),blend=enter*(1-leave);if(a.kind==='shower'||a.kind==='bed'){avatar.position.copyFrom(Vector3.Lerp(a.p,a.stand,blend));avatar.rotation.y=home.angle;avatar.rotation.x=a.kind==='bed'?Math.PI/2*blend:0;}else avatar.rotation.y=Math.atan2(f.x-a.p.x,f.z-a.p.z);
 const active=t>1.2&&t<duration-1.1,water=active&&a.kind!=='bed'&&(a.kind!=='toilet'||t>3.7),soap=active&&(a.kind==='shower'||a.kind==='bath')&&t>2&&t<4.8,origin=a.kind==='pond'?f.stream:a.kind==='shower'?home.C(f.local.x,UPPER_Y+1.87,f.local.z-.09):a.kind==='bath'?home.C(f.local.x,UPPER_Y+1.23,f.local.z+.12):home.C(f.local.x,UPPER_Y+.61,f.local.z-.05);
 for(let i=0;i<domesticFX.drops.length;i++){const m=domesticFX.drops[i];m.setEnabled(water);if(water){const q=(t*2.2+i*.137)%1,r=a.kind==='shower'?.27:a.kind==='pond'?.045:.06;m.position.set(origin.x+Math.sin(i*2.4)*r,origin.y-q*(a.kind==='shower'?1.58:a.kind==='pond'?.83:.25),origin.z+Math.cos(i*2.4)*r);}}
 for(let i=0;i<domesticFX.soap.length;i++){const m=domesticFX.soap[i];m.setEnabled(soap);if(soap){const p=avatar.position;m.position.set(p.x+Math.sin(t*4+i)*.24,p.y+(a.kind==='shower'?1.05: .92)+Math.sin(i)*.16,p.z+Math.cos(t*4+i)*.20);}}
 if(a.kind==='bed'){domesticFX.cover.setEnabled(blend>.8);const p=home.C(f.local.x,UPPER_Y+.83,f.local.z-.18);domesticFX.cover.position.copyFrom(p);domesticFX.cover.rotation.y=home.angle;domesticFX.cover.scaling.z=Math.max(.1,Math.min(1,(t-1.3)/1.0));}else{const arms=bodyParts.slice(3);for(let i=0;i<arms.length;i++)arms[i].rotation.x=active?-.8+.35*Math.sin(t*7+i*Math.PI):-.42*Math.sin(Math.PI*enter);}
 if(a.kind==='toilet'){if(a.lid)a.lid.rotation.x=-Math.PI*.47*blend;domesticFX.privacy.setEnabled(t>1&&t<3.9);domesticFX.privacy.position.copyFrom(avatar.position.add(V(0,.65,0)));domesticFX.privacy.rotation.y=avatar.rotation.y;}
 if(a.kind==='pond'){f.handle.rotation.y=Math.PI*.5*blend;const level=u<.35?1-u/.35*.9:Math.min(1,.1+(u-.35)/.48*.9);f.water.scaling.y=Math.max(.05,level);f.water.position.y=a.baseY-.16*(1-level);f.water.material=u<.5?habitatMaterials.duckDirty:habitatMaterials.duckClean;}
 if(t>=duration)finishDomestic(a,true);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&domesticRun)finishDomestic(domesticRun,false);});
syncWorkerModels();

ruralDialog.addEventListener('close',stopFishing);
scene.onBeforeRenderObservable.add(()=>{if(!regionalOpen){tickResourceEffects(Math.min(.05,engine.getDeltaTime()/1000));syncNature();syncOrchard();tickFishing();tickLivestock();tickWildlife(Math.min(.05,engine.getDeltaTime()/1000));tickDomestic(Math.min(.05,engine.getDeltaTime()/1000));tickWorkers(Math.min(.05,engine.getDeltaTime()/1000));tickPonds();}});
window.cvBootStage='render-ready-pending';window.cvQA={scene,engine,staffBridges,staffBridgeAt,staffBridgeRailBlocked,workerBridgeRoute,workerDorm,staffBlocked,staffHeight,nearbyWorkers,workerBoard,workerCommand,workerModels,tickWorkers,domesticQA,startDomestic,tickDomestic,get domesticRun(){return domesticRun},pondStations,wildlife,wildlifeQA,tickWildlife,canPlaceExtraPen,placeExtraPen,penFor,STAIR,UPPER_Y,LANDING_Y,stairGripQA,residenceStep,stairHeight,GROUND_DIVIDER,BALCONY,nearbyPlanter,waterSelectedGarden,interiorDoors,upperResidenceBlocked,toggleInteriorDoor,tickInteriorDoors,orchardModels,orchardAction,selectFruitPlant,syncOrchard,avatarDetails,householdAction,craftConstruction,ruralZones,advanceRuralConstruction,get livestockPen(){return livestockPen},livestockAgents,interactLivestock,settleLivestock,get husbandry(){return wheatState.husbandry},fishingSpots,castFishing,reelFishing,get fishery(){return wheatState.fishery},natureNodes,interactNature,syncNature,selectTreePlant,confirmTreePlant,cancelTreePlant,treePlantTarget,validResourceGround,directNatureTarget,beginResourceSwing,tickResourceSwing,tickResourceEffects,resourceStats,get resourceSwing(){return resourceSwing},resourceFalls,get nature(){return wheatState.nature},changeAppearance,avatarAppearanceMaterials,get appearance(){return {...wheatState.appearance}},ruralFixtures,bedFixture,wardrobeFixture,ruralNearby,openRural,sleepAtBed,openWarehouseBuild,canPlaceWarehouse,placeWarehouse,missionStation,openProgress,openRegional,closeRegional,regionalQA,regionalCamera,get regionalOpen(){return regionalOpen},landAt,landBuildAllowed,get progression(){return wheatState.progress},titleBootQA,roadUnionQA,roadMaskAt,roadJoins,ranchRopes,nearbyBench,seatIcon,eastChannels,eastPolygons,eastWaterAt,terrainPatches,terrainPatchData,terrainStream,terrainStreamDiagnostics,expansionQA,expansionVisibility,syncExpansionVisibility,extraFarmRails,nearbyFarmRails,insidePolygon,farmSectors,allFarmPlots,allFarmBeds,sectorAt,nearbyFarmSign,expansionRoads,roofCraft,facadeCraft,petSystem,inventoryItems,openInventory,renderInventory,applyTrade,farmStations,marketStation,get warehouseStation(){return warehouseStation},stationNearby,CAMERA_PROFILES,selectCameraProfile,get cameraProfile(){return cameraProfile},positionWorldContext,layoutContextActions,windAt,updateWindObjects,signMotion,signPivot,vane,nameBoard,archBlocked,archRainSurface,mapQA,drawMinimap,layoutMinimap,projectWorld,cropAdvice,openCropGuide,updateGarden,gates,gatePose,toggleGate,tickGates,gateBlocked,buildPoint,nearbyFence,fenceCondition,accrueFence,maintainFence,paintFence,updateWorldActions,boardNearby,fieldSignCollider,arch,setRanchName,get ranchName(){return ranchName},polyQA,residenceShadowState,syncHouseShadows,editableFences,bridgeFenceLinks,build,buildStats,buildEnds,canBuild,openBuild,closeBuild,refreshBuild,placeBuild,confirmBuild,tickBuild,get buildData(){return buildData},tickTill,tillStats,hoeRoot,get tillWork(){return tillWork},windowApertures,nightLights,get nightPower(){return nightPower},windowPane:M.windowPane,worldFixtures,allBenches,seatYaw,playerBlocked,cameraStability,stableCameraZone,cameraGesture,avatarOccludedByHouse,setView,explorationAim,get cameraFollow(){return entry.previous?.follow??follow},rockColliders,rockBlocked,rockClearance,obstacleEntered,worldInput,setStickMode,get controls(){return {...controls}},get stickCenter(){return stickCenter&&{...stickCenter}},bedPlots,bedBlend,ridgeProfile,soilTone,cameraBuildings,registerCameraBuilding,exteriorCameraZone,terrainContactStats,terrainMotionAllowed,rainStats,rainSurface,rainPool,impactPool,puddles,updateRain,weatherPresentation,get weatherVisual(){return {...weatherVisual}},smokePuffs,smokeOrigin,updateChimneySmoke,qualityProfiles,selectQuality,get quality(){return quality},groups,componentCounts,batching,ground,terrainSkirtStats,bedSurfaceStats,moundQA,moundHeight,tickMounds,avatar,blocked,onBridge,nearRiver,layout,riverMotionMetrics,perf,shadowCache,treePositions,fenceColliders,flowInstancing,roadMetrics,canopyStats,bankStats,gait,bodyParts,entry,entryInfluence,homeLocal,surfaceHeight,homeBlocked,nearRiver,riverSegments,riverStats,shapeStick,joy,motion,advanceManual,sprint,updateLocomotion,updateDust,resetSprint,dustPool,dustAllowed,emitBrakeDust,porchRails,porchFixtures,porchHalf,benches,seating,seatLegs,seatStand,seatTarget,updateSeating,pathPoints,pathRows,pathFlowerPositions,pathDistance,stairFoot,bridgeEntry,pathMesh,road,pavingStats,connectionQA,roadClearance,residenceRails,wheatBounds,wheatBeds,wheatPlots,wheatStatus,wheatProgress,wheatDuration,wheatSchedule,evaluatedPlot,weatherAt,WEATHER_INTERVAL,applyWheatAction,updateWheat,calendarAt,worldElapsed,updateWorldClock,daylightAt,get worldClock(){return {...worldClock}},get daylight(){return {sky:light.intensity,sun:sun.intensity}},get wheatState(){return wheatState},wheatStalks,wheatFurrows,wheatGate,wheatPolygon,fieldRails,inWheat,approachCurve,approachRows,porchExtension,porchDepth:HOUSE.porchDepth,renderedTerrainY,projectPoint:p=>Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight())),planters,flowerCatalog,updateGarden,updateCrop,moveAvatar,updateEntry,reachHand,gripPoint,bridgeEnds:[ba.asArray(),bb.asArray()],home,dogHome,well:well.asArray(),ready:false};engine.runRenderLoop(()=>scene.render());scene.executeWhenReady(()=>{if(titleReady)return;titleReady=true;titleBootQA.readyTransitions++;$('loading').remove();refreshTitle();$('title-continue').disabled=false;$('title-options').disabled=false;$('title-boot-status').hidden=true;window.cvQA.ready=true;window.cvBootStage='ready';});
