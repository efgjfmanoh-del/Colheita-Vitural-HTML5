import {Engine,Scene,ArcRotateCamera,Vector3,Color3,Color4,Mesh,MeshBuilder,StandardMaterial,HemisphericLight,DirectionalLight,ShadowGenerator,VertexData,Quaternion,Matrix,DynamicTexture,Texture,VertexBuffer} from '@babylonjs/core';
import layout from '../layout.json';
import {weatherAt,WEATHER_INTERVAL,newSoil,validSoil,simulatePlot,harvestInfo,prepareSpecies} from './farm-simulation.js';
import {calendarAt,cropSchedule,daylightAt,CROP_CALENDAR,REAL_MS_PER_GAME_MINUTE,DAYS_PER_MONTH,newWorldClock,elapsedWorldClock,upgradeWorldClock} from './world-calendar.js';
const $=id=>document.getElementById(id),canvas=$('view');
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,adaptToDeviceRatio:false});
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
M.windowPane.emissiveColor=new Color3(.035,.050,.060);
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
const waterTex=new DynamicTexture('local water ripples',{width:256,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);const wc=waterTex.getContext();const depthGradient=wc.createLinearGradient(0,0,256,0);for(const [a,b] of [[0,'#b8dfc8'],[.12,'#a0d5d4'],[.33,'#87b8c8'],[.5,'#75a8bf'],[.67,'#87b8c8'],[.88,'#a0d5d4'],[1,'#b8dfc8']])depthGradient.addColorStop(a,b);wc.fillStyle=depthGradient;wc.fillRect(0,0,256,256);for(let i=0;i<145;i++){const x=random()*256,y=random()*256,len=12+random()*70;wc.strokeStyle=i%4===0?'rgba(248,255,251,.52)':'rgba(38,106,126,.14)';wc.lineWidth=.6+random()*1.3;for(let k=-1;k<=1;k++){wc.beginPath();wc.moveTo(x+k*256,y);wc.quadraticCurveTo(x+k*256+len*.5,y+Math.sin(i)*3,x+k*256+len,y);wc.stroke()}}waterTex.update();waterTex.wrapU=waterTex.wrapV=Texture.WRAP_ADDRESSMODE;M.water.diffuseTexture=waterTex;M.water.diffuseColor=Color3.FromHexString('#399ab4');
const light=new HemisphericLight('sky',V(.2,1,-.15),scene);light.intensity=.85;light.groundColor=new Color3(.37,.39,.27);
const sun=new DirectionalLight('sun',V(-.6,-1,.45),scene);sun.position=V(40,65,-40);sun.intensity=.90;sun.diffuse=new Color3(1,.91,.78);sun.autoCalcShadowZBounds=true;sun.shadowOrthoScale=.2;
const shadow=new ShadowGenerator(1536,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.bias=.00035;shadow.normalBias=.015;shadow.darkness=.32;
// A lower, still orthographic view exposes walls, entrances and river elevations.
const CAMERA_BETA=48*Math.PI/180;
const camera=new ArcRotateCamera('camera',-Math.PI/2,CAMERA_BETA,100,V(0,2.8,0),scene);
camera.mode=1;camera.lowerBetaLimit=.3;camera.upperBetaLimit=1.25;camera.lowerRadiusLimit=35;camera.upperRadiusLimit=180;camera.panningSensibility=0;camera.inputs.clear();scene.activeCamera=camera;
// setTarget recalculates spherical orbit parameters in Babylon. Preserve the approved view.
function retarget(p,beta=CAMERA_BETA){const alpha=camera.alpha,radius=camera.radius;camera.setTarget(p);camera.alpha=alpha;camera.beta=beta;camera.radius=radius;}
let span=60,orbit=0;function fit(){const a=engine.getRenderWidth()/Math.max(1,engine.getRenderHeight());const h=Math.max(span/a,14);camera.orthoLeft=-h*a/2;camera.orthoRight=h*a/2;camera.orthoTop=h/2;camera.orthoBottom=-h/2}fit();
window.addEventListener('resize',()=>{resizeRender();fit();resetPerf()});
function updateQualityUI(){for(const key of Object.keys(qualityProfiles))$('quality-'+key).setAttribute('aria-pressed',String(key===quality));$('quality-label').textContent=qualityNames[quality];}
function selectQuality(key){if(!Object.hasOwn(qualityProfiles,key))return;quality=key;try{localStorage.setItem('cv.renderQuality.v1',key)}catch{}resizeRender();fit();updateQualityUI();resetPerf();}
for(const key of Object.keys(qualityProfiles))$('quality-'+key).addEventListener('click',()=>selectQuality(key));
updateQualityUI();
$('hud-toggle').addEventListener('click',()=>{const panel=$('hud-panel');panel.hidden=!panel.hidden;$('hud-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
for(const event of ['contextmenu','selectstart'])document.addEventListener(event,e=>e.preventDefault());
const groups={};let active='terrain';const entity=id=>{active=id;groups[id]??=[]};
const own=(m,material,cast=true)=>{m.material=material;m.receiveShadows=true;m.isPickable=false;if(cast)shadow.addShadowCaster(m);(groups[active]??=[]).push(m);return m};
const box=(name,x,y,z,w,h,d,m,rot=0,cast=true)=>{const b=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);b.position=V(x,y,z);b.rotation.y=rot;return own(b,m,cast)};
const sphere=(name,x,y,z,rx,ry,rz,m,cast=true)=>{const b=MeshBuilder.CreateSphere(name,{diameter:2,segments:7},scene);b.position=V(x,y,z);b.scaling=V(rx,ry,rz);return own(b,m,cast)};
const cyl=(name,x,y,z,r,h,m,top=r,cast=true)=>{const b=MeshBuilder.CreateCylinder(name,{diameterTop:top*2,diameterBottom:r*2,height:h,tessellation:12},scene);b.position=V(x,y,z);return own(b,m,cast)};
const beam=(name,a,b,w,m,depth=w,cast=true)=>{const d=b.subtract(a);const obj=box(name,...a.add(b).scale(.5).asArray(),w,d.length(),depth,m,0,cast);const n=d.normalize(),axis=Vector3.Cross(Vector3.Up(),n),dot=Vector3.Dot(Vector3.Up(),n);obj.rotationQuaternion=dot<-.99999?Quaternion.RotationAxis(Vector3.Right(),Math.PI):new Quaternion(axis.x,axis.y,axis.z,1+dot).normalize();return obj};
const quad=(name,pts,m,cast=false)=>{const q=new Mesh(name,scene),v=new VertexData();v.positions=pts.flatMap(p=>p.asArray());const u=Vector3.Distance(pts[0],pts[1]),vv=Vector3.Distance(pts[1],pts[2]);v.uvs=[0,0,u/2,0,u/2,vv/2,0,vv/2];v.indices=[0,1,2,0,2,3];v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);if(v.normals[1]<-0.001){v.indices=[0,2,1,0,3,2];VertexData.ComputeNormals(v.positions,v.indices,v.normals);}m.backFaceCulling=false;v.applyToMesh(q);return own(q,m,cast)};
const poly=(name,pts,indices,m,cast=true)=>{const q=new Mesh(name,scene),v=new VertexData();v.positions=pts.flatMap(p=>p.asArray());v.uvs=[0,0,2,0,1,1];v.indices=indices.slice(0,3);v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);m.backFaceCulling=false;v.applyToMesh(q);return own(q,m,cast)};
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
function height(x,z){let a=nearRiver(x,z),edge=a.dist-a.w/2;const west=x<-20?Math.max(0,Math.min(1,(z-5)/16))*2.2:0;const flat=2.65+west+.035*Math.sin(x*.24+Math.sin(z*.19))*Math.cos(z*.31);if(edge<0)return a.y-.44;if(edge<1.5){let t=edge/1.5;t=t*t*(3-2*t);return (a.y-.44)*(1-t)+Math.max(flat,a.y+.35)*t}return Math.max(flat,a.y+.35*Math.max(0,1-(edge-1.5)/6))}
entity('terrain');const minX=X(20),maxX=X(20+730*204/170),minZ=Z(-20+350*121/110),maxZ=Z(-20),nx=204,nz=121,pos=[],idx=[],colors=[],uvs=[];
for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){let x=minX+(maxX-minX)*i/nx,z=minZ+(maxZ-minZ)*j/nz,y=height(x,z),n=nearRiver(x,z),d=n.dist-n.w/2;pos.push(x,y,z);uvs.push(x/2.7,z/2.7);const v=.94+.09*Math.sin(x*.39+Math.sin(z*.52))*Math.cos(z*.43+Math.sin(x*.21))+.025*Math.sin(x*1.71+z*.91);const patch=.5+.5*Math.sin(x*.17+Math.sin(z*.29))*Math.cos(z*.23+x*.07);const c=d<.9?[.57,.44,.27]:d<1.65?[.55,.62,.30]:[.37+.13*patch,.53+.14*patch,.19+.09*patch];colors.push(c[0]*v,c[1]*v,c[2]*v,1)}
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2)}
const ground=new Mesh('sculpted terrain mesh',scene),gd=new VertexData();gd.positions=pos;gd.indices=idx;gd.colors=colors;gd.uvs=uvs;gd.normals=[];VertexData.ComputeNormals(pos,idx,gd.normals);if(gd.normals[1]<0){for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];gd.indices=idx;VertexData.ComputeNormals(pos,idx,gd.normals);}gd.applyToMesh(ground);own(ground,M.grass,false);
const terrainSkirtStats={rings:0,vertices:0,margin:64,maxJoinGap:0};
{
 const boundary=[];for(let i=0;i<=nx;i++)boundary.push(i);
 for(let j=1;j<=nz;j++)boundary.push(j*(nx+1)+nx);
 for(let i=nx-1;i>=0;i--)boundary.push(nz*(nx+1)+i);
 for(let j=nz-1;j>0;j--)boundary.push(j*(nx+1));
 const pv=[],pi=[],pc=[],pu=[],n=boundary.length,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,hx=(maxX-minX)/2,hz=(maxZ-minZ)/2;
 const margins=[0,1,3,6,11,18,28,42,64];
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
function rock(name,p,rx,ry,rz,m,bank=false){
 const obj=MeshBuilder.CreateIcoSphere(name,{radius:1,subdivisions:bank&&name==='rounded masonry river edge'?1:2,flat:false,updatable:true},scene);const data=obj.getVerticesData(VertexBuffer.PositionKind);
 for(let i=0;i<data.length;i+=3){const x=data[i],y=data[i+1],z=data[i+2],f=1+.12*Math.sin(x*11+z*7)+.07*Math.cos(y*9+x*5);const round=q=>Math.sign(q)*Math.pow(Math.abs(q),bank?.79:1);data[i]=round(x)*f;data[i+1]=round(y)*f;data[i+2]=round(z)*f;}
 obj.updateVerticesData(VertexBuffer.PositionKind,data);const normals=[];VertexData.ComputeNormals(data,obj.getIndices(),normals);obj.updateVerticesData(VertexBuffer.NormalKind,normals);obj.position=p;obj.scaling=V(rx,ry,rz);obj.rotation.y=bank?(random()-.5)*.55:random()*Math.PI;if(bank)bankStats.blocks++;return own(obj,m);
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
const HOUSE={u:409,v:137,w:14.5,d:9,h:5.6,angle:-.30,porchRatio:.77,porchDepth:3.65};
const porchExtension=HOUSE.porchDepth-2.8;
const houseXZ=(x,z)=>V(X(HOUSE.u)+x*Math.cos(HOUSE.angle)+z*Math.sin(HOUSE.angle),0,Z(HOUSE.v)-x*Math.sin(HOUSE.angle)+z*Math.cos(HOUSE.angle));
const fenceColliders=[];const fencePoints=layout.residence.boundary.map(([u,v])=>{let p=P(u,v);const center=P(430,153);for(let n=0;n<25&&nearRiver(p.x,p.z).dist<nearRiver(p.x,p.z).w/2+.8;n++)p=Vector3.Lerp(p,center,.045);p.y=height(p.x,p.z);return p});
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
 const u=Math.max(0,Math.min(nx-1e-8,(x-minX)/(maxX-minX)*nx)),v=Math.max(0,Math.min(nz-1e-8,(z-minZ)/(maxZ-minZ)*nz));
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
const residenceRails=[];
entity('residence fence');
for(let i=0;i<fencePoints.length;i++){
 const a=fencePoints[i],b=fencePoints[(i+1)%fencePoints.length],n=Math.ceil(Vector3.Distance(a,b)/1.9);
 for(let j=0;j<n;j++){const p=Vector3.Lerp(a,b,j/n),q=Vector3.Lerp(a,b,(j+1)/n);
  const clear=Array.from({length:13},(_,k)=>Vector3.Lerp(p,q,k/12)).every(v=>roadClearance(pathRows,v.x,v.z)>.38&&Math.hypot(v.x-bridgeEntry.x,v.z-bridgeEntry.z)>1.85);
  if(!clear)continue;
  p.y=height(p.x,p.z);q.y=height(q.x,q.z);residenceRails.push([p.clone(),q.clone()]);fenceColliders.push([p.clone(),q.clone()]);
  box('fence post',p.x,p.y+.61,p.z,.20,1.22,.20,M.woodDark);box('post cap',p.x,p.y+1.25,p.z,.28,.12,.28,M.woodLight);
  for(const y of [.40,.89])beam('fence rail',p.add(V(0,y,0)),q.add(V(0,y,0)),.13,M.woodLight,.13);
 }
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
entity('bridge home');const [ba,bb]=layout.bridges[0].ends.map(p=>P(...p,2.85));const bd=bb.subtract(ba),bl=bd.length(),ang=Math.atan2(bd.x,bd.z),bs=V(Math.cos(ang),0,-Math.sin(ang));
const bridgePlankCount=Math.ceil(bl/.36),bridgePlankDepth=bl/bridgePlankCount;
for(let k=0;k<bridgePlankCount;k++){let p=Vector3.Lerp(ba,bb,(k+.5)/bridgePlankCount);box('bridge plank',p.x,p.y,p.z,3.15,.19,bridgePlankDepth,k%3?M.woodLight:M.wood,ang);for(let s of [-1,1]){let q=p.add(bs.scale(s*1.48));if(k%4===0){box('bridge rail post',q.x,q.y+.55,q.z,.20,1.1,.20,M.woodDark);box('bridge pier',q.x,q.y-.75,q.z,.27,1.6,.27,M.woodDark)}}}for(let s of [-1,1])beam('bridge railing',ba.add(bs.scale(s*1.48)).add(V(0,.91,0)),bb.add(bs.scale(s*1.48)).add(V(0,.91,0)),.14,M.woodLight);
// Stage 2A: first agricultural sector from the traced reference.
const wheatPolygon=wheatSpec.polygon.map(p=>P(...p));
const wheatBounds={minX:Math.min(...wheatPolygon.map(p=>p.x)),maxX:Math.max(...wheatPolygon.map(p=>p.x)),minZ:Math.min(...wheatPolygon.map(p=>p.z)),maxZ:Math.max(...wheatPolygon.map(p=>p.z))};
const wheatBeds=[],fieldRails=[],wheatPlots=[];
function inWheat(x,z){let inside=false;for(let i=0,k=wheatPolygon.length-1;i<wheatPolygon.length;k=i++){const a=wheatPolygon[i],b=wheatPolygon[k];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
entity('wheat sector fence');
function fieldRail(a,b){
 const len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(len/1.65));
 for(let i=0;i<n;i++){const p=Vector3.Lerp(a,b,i/n),q=Vector3.Lerp(a,b,(i+1)/n);p.y=height(p.x,p.z);q.y=height(q.x,q.z);fieldRails.push([p.clone(),q.clone()]);fenceColliders.push([p.clone(),q.clone()]);box('wheat fence post',p.x,p.y+.59,p.z,.16,1.18,.16,M.woodDark);for(const y of [.38,.83])beam('wheat fence rail',p.add(V(0,y,0)),q.add(V(0,y,0)),.12,M.woodLight);}
 const q=b.clone();q.y=height(q.x,q.z);box('wheat fence end post',q.x,q.y+.59,q.z,.16,1.18,.16,M.woodDark);
}
for(let i=0;i<wheatPolygon.length;i++){
 const a=wheatPolygon[i],b=wheatPolygon[(i+1)%wheatPolygon.length],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),u=((wheatGate.x-a.x)*dx+(wheatGate.z-a.z)*dz)/(l*l);
 if(u>0&&u<1&&Math.hypot(wheatGate.x-a.x-u*dx,wheatGate.z-a.z-u*dz)<.05){const gap=wheatSpec.gate.width/8/2/l;fieldRail(a,Vector3.Lerp(a,b,u-gap));fieldRail(Vector3.Lerp(a,b,u+gap),b);}else fieldRail(a,b);
}
entity('wheat prepared soil');
const bedSurfaceStats={continuousBeds:0,vertices:0,plotGaps:0};
function bedHeightAt(x,z,bed){
 const across=Math.max(0,Math.min(1,(z-bed.z1)/(bed.z2-bed.z1))),along=Math.max(0,Math.min(1,Math.min(x-bed.x1,bed.x2-x)/.30));
 return .025+.060*Math.sin(Math.PI*across)*along;
}
{
 const pv=[],pi=[],pc=[],pu=[];
 for(const side of [-1,1]){
  const x1=side<0?wheatBounds.minX+1.15:wheatGate.x+1.65,x2=side<0?wheatGate.x-1.65:wheatBounds.maxX-1.15;
  for(let z=wheatBounds.minZ+1.65;z+1.35<wheatBounds.maxZ-1.1;z+=2.25){
   const bed={id:'trigo-'+wheatBeds.length,x1,x2,z1:z,z2:z+1.35};wheatBeds.push(bed);
   for(let x=x1;x<x2-.45;x+=1.18){const end=Math.min(x+1.12,x2);if(end-x<.45)break;wheatPlots.push({id:'trigo-'+(wheatBeds.length-1)+'-'+wheatPlots.length,x1:x,x2:end,z1:z,z2:z+1.35,x:(x+end)/2,z:z+.675,bedId:bed.id});}
   const cols=Math.ceil((x2-x1)/.30),rows=8,start=pv.length/3;
   for(let k=0;k<=cols;k++)for(let l=0;l<=rows;l++){
    const x=x1+(x2-x1)*k/cols,zz=z+1.35*l/rows,base=Math.max(height(x,zz),renderedTerrainY(x,zz));
    pv.push(x,base+bedHeightAt(x,zz,bed),zz);pu.push(x/1.2,zz/1.2);const shade=.93+.07*Math.sin(x*3.1+zz*4.7);pc.push(.46*shade,.30*shade,.19*shade,1);
   }
   for(let k=0;k<cols;k++)for(let l=0;l<rows;l++){const a=start+k*(rows+1)+l,b=a+rows+1;pi.push(a,b,a+1,b,b+1,a+1);}
   bedSurfaceStats.continuousBeds++;
  }
 }
 const mesh=new Mesh('continuous rounded agricultural soil beds',scene),data=new VertexData();data.positions=pv;data.indices=pi;data.colors=pc;data.uvs=pu;data.normals=[];VertexData.ComputeNormals(pv,pi,data.normals);for(let k=0;k<data.normals.length;k+=3)if(data.normals[k+1]<0){data.normals[k]*=-1;data.normals[k+1]*=-1;data.normals[k+2]*=-1;}data.applyToMesh(mesh);
 const soil=mat('continuous fertile earth','#ffffff');soil.diffuseTexture=swatch('fine tilled soil grain','soil',128);soil.backFaceCulling=false;soil.emissiveColor=new Color3(.025,.018,.01);own(mesh,soil,false);bedSurfaceStats.vertices=pv.length/3;
}
entity('wheat sector sign');
const fieldSignCollider={x:wheatGate.x+2.2,z:wheatGate.z-.65};
{
 const x=fieldSignCollider.x,z=fieldSignCollider.z,y=height(x,z);
 for(const side of [-1,1])box('field sign leg',x+side*.64,y+.62,z,.12,1.24,.12,M.woodDark);
 box('field sign board',x,y+1.25,z,1.85,.63,.12,M.woodLight);
 const tex=new DynamicTexture('local field sign trigo',{width:256,height:96},scene,true),ctx=tex.getContext();ctx.fillStyle='#c38b50';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#805631';ctx.lineWidth=7;ctx.strokeRect(5,5,246,86);ctx.fillStyle='#372718';ctx.font='bold 43px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('TRIGO',128,48);tex.update();
 const material=mat('field sign text','#ffffff');material.diffuseTexture=tex;material.emissiveColor=new Color3(.15,.12,.08);material.backFaceCulling=false;const sign=MeshBuilder.CreatePlane('trigo label',{width:1.72,height:.53},scene);sign.position=V(x,y+1.25,z-.067);own(sign,material,false);
}
const approachRows=sections.map(r=>[r[0],r[3],r[6]]);
const connectionQA={bridgeEntryRow:pathRows.at(-1),bridgeExitRow:approachRows[0],bridgePlankDepth,bridgePlankCount,bridgeHalf,bridgeAxis,bridgeSide,deckLength:bl,deckTop:2.945,fieldEnd:approachCurve.at(-1),fieldGate:wheatGate};
function house(id,u,v,w,d,h,angle,small=false){entity(id);const x=X(u),z=Z(v),y=height(x,z),C=(a,b,c)=>V(x+a*Math.cos(angle)+c*Math.sin(angle),y+b,z-a*Math.sin(angle)+c*Math.cos(angle));const B=(n,a,b,c,ww,hh,dd,m)=>{let p=C(a,b,c);return box(n,p.x,p.y,p.z,ww,hh,dd,m,angle)};const L=(n,a,b,ww,m)=>beam(n,C(...a),C(...b),ww,m);
 const doorW=small?w*.47:1.35,doorH=small?h*.65:2.2,wall=.22;let doorRoot=null;const handles={};
 B('stone foundation',0,.22,0,w+.25,.44,d+.25,M.stoneLight);
 if(small)B('plaster walls',0,.45+h/2,0,w,h,d,M.woodLight);
 else{
  B('walkable wooden floor',0,.485,0,w-.06,.09,d-.06,M.woodLight);
  for(let j=0;j<24;j++)B('interior plank seam',-w*.47+j*w*.04,.532,0,.025,.008,d-.3,M.woodDark);
  B('rear wall',0,.53+h/2,d/2-wall/2,w,h,wall,M.plaster);
  for(const k of [-1,1])B('side wall',k*(w/2-wall/2),.53+h/2,0,wall,h,d-wall*2,M.plaster);
  entity('house-front');
  const sideW=(w-doorW)/2;
  for(const k of [-1,1])B('front wall beside doorway',k*(doorW/2+sideW/2),.53+h/2,-d/2+wall/2,sideW,h,wall,M.plaster);
  B('door lintel',0,.53+doorH+(h-doorH)/2,-d/2+wall/2,doorW,h-doorH,wall,M.plaster);
  entity(id);
 }
 if(small){
 for(let xx of [-w/2+.05,w/2-.05])for(let zz of [-d/2+.05,d/2-.05])B('corner framing',xx,h/2+.44,zz,.23,h,.23,M.woodDark);
 for(let zz of [-d/2-.03,d/2+.03]){for(let xx of [-w*.25,0,w*.25])B('vertical timber',xx,h/2+.44,zz,.18,h,.17,M.wood);for(let yy of [.5,h*.53,h+.40])B('horizontal timber',0,yy,zz,w,.19,.2,M.woodDark);}
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
 for(let zz of [-d/2,d/2]){poly('gable plaster',[C(-w/2,e,zz),C(w/2,e,zz),C(0,r,zz)],[0,1,2,2,1,0],small?M.woodLight:M.plaster);L('gable trim',[-ow,e,zz],[0,r,zz],.22,M.woodDark);L('gable trim',[0,r,zz],[ow,e,zz],.22,M.woodDark)}
 L('ridge tiles',[0,r+.11,-od],[0,r+.11,od],.28,M.tile);
 if(!small){
  // Projecting dormer on the visible roof slope, modeled in local house coordinates.
  const side=-1,z0=-.85,dw=2.35,front=side*ow*.78,back=side*ow*.26,baseY=e+(r-e)*.22,topY=e+(r-e)*.73;
  const crest=topY+1.03,edge=topY-.05;
  B('dormer facade',front,baseY+(edge-baseY)/2,z0,.18,edge-baseY,dw,M.plaster);
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
  const wy=baseY+(edge-baseY)*.57;
  B('dormer window frame',front-.14,wy,z0,.16,1.25,1.12,M.woodDark);
  B('dormer golden glass',front-.25,wy,z0,.08,.98,.86,M.glass);
  B('dormer mullion',front-.31,wy,z0,.06,.98,.085,M.woodDark);
  B('dormer crossbar',front-.31,wy,z0,.06,.075,.86,M.woodDark);
  B('dormer window sill',front-.27,wy-.66,z0,.35,.12,1.33,M.woodLight);
 }
 entity(id);
 if(small)B('door opening',0,.44+doorH/2,-d/2-.06,doorW,doorH,.14,M.woodDark);
 if(!small){
 entity('house-door');
 for(const k of [-1,1])B('door jamb',k*(doorW/2+.065),.53+doorH/2,-d/2-.045,.13,doorH,.30,M.blueJoinery);
 B('door header',0,.53+doorH+.065,-d/2-.045,doorW+.26,.13,.30,M.blueJoinery);
 doorRoot=new Mesh('door hinge pivot',scene);doorRoot.position=C(-doorW/2+.035,.53,-d/2-.055);doorRoot.rotation.y=angle;
 const leaf=(n,x,y,z,ww,hh,dd,m)=>{const q=box(n,x,y,z,ww,hh,dd,m);q.parent=doorRoot;return q;};
 const leafW=doorW-.07;leaf('solid swinging door',leafW/2,doorH/2,0,leafW,doorH-.04,.095,M.blueJoinery);
 for(const x of [.13,leafW-.13])leaf('door vertical trim',x,doorH/2,-.07,.075,doorH-.11,.05,M.blueTrim);
 for(const y of [.2,doorH-.2])leaf('door cross trim',leafW/2,y,-.07,leafW-.13,.09,.05,M.blueTrim);
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
 const window=(xx,yy)=>{B('window frame',xx,yy,-d/2-.12,1.37,1.43,.20,M.blueJoinery);B('window amber glass',xx,yy,-d/2-.24,1.11,1.17,.09,M.windowPane);B('window vertical bar',xx,yy,-d/2-.30,.10,1.2,.08,M.blueJoinery);B('window horizontal bar',xx,yy,-d/2-.30,1.17,.10,.08,M.blueJoinery);B('window sill',xx,yy-.73,-d/2-.33,1.55,.14,.42,M.blueTrim)};
 const upperY=h*.85,atticY=h+1.45;
 for(let xx of [-w*.3,w*.3]){window(xx,1.8);window(xx,upperY);facadeCraft.upperWindows.push({x:xx,y:upperY,bottom:upperY-.715,top:upperY+.715});}
 entity('house-roof');window(0,atticY);facadeCraft.atticWindow={x:0,y:atticY,bottom:atticY-.715};entity(id);for(let xx of [-w/2-.10,w/2+.10])for(let zz of [-d*.22,d*.22]){facadeCraft.sideWindows.push({x:xx,z:zz,y:upperY});B('side window frame',xx,upperY,zz,.18,1.34,1.36,M.blueJoinery);B('side window glass',xx+Math.sign(xx)*.11,upperY,zz,.10,1.08,1.07,M.windowPane);B('side mullion',xx+Math.sign(xx)*.17,upperY,zz,.08,1.09,.09,M.blueJoinery);B('side window sill',xx+Math.sign(xx)*.22,upperY-.73,zz,.35,.13,1.55,M.blueTrim)}for(let side of [-1,1]){for(let i=0;i<5;i++){let yy=.55+i*.18;B('foundation stone trim',side*(w/2+.02),yy,d*.36,.13,.13,1.15,i%2?M.stone:M.stoneLight);}}
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
 quad('porch roof',[C(-w*(HOUSE.porchRatio/2+.035),3.65,-d/2),C(w*(HOUSE.porchRatio/2+.035),3.65,-d/2),C(w*(HOUSE.porchRatio/2+.035),3.12,-d/2-3-porchExtension),C(-w*(HOUSE.porchRatio/2+.035),3.12,-d/2-3-porchExtension)],M.roof,true);
 const porchRoofHalf=w*(HOUSE.porchRatio/2+.035);
 ceramicField('curved colonial veranda tiles',Math.hypot(3+porchExtension,.53),porchRoofHalf*2,(u,v)=>C(-porchRoofHalf+2*porchRoofHalf*v,3.65-.53*u,-d/2-(3+porchExtension)*u));
 entity(id);for(let i=0;i<3;i++){const top=[.18,.35,.53][i];B('stone entry step',0,top/2,-d/2-3.55-porchExtension+i*.35,2.2,top,.35,M.stoneLight);}
 entity('house-roof');B('chimney',w*.29,h+1.75,d*.26,.86,3.5,.86,M.stoneLight);for(let i=0;i<7;i++)B('chimney course',w*.29,h+.42+i*.48,d*.26,.89,.045,.89,M.stone);B('chimney cap',w*.29,h+3.55,d*.26,1.1,.20,1.1,M.woodDark);
 }else{B('doghouse name plaque',0,h*.84,-d/2-.11,.59,.24,.09,M.woodDark);for(let xx of [-.19,.19])B('paw mark',xx,h*.85,-d/2-.17,.07,.08,.035,M.woodLight)}
 entity(id);return {x,z,w,d,angle,y,C,doorW,doorRoot,handles};
}
const home=house('house',HOUSE.u,HOUSE.v,HOUSE.w,HOUSE.d,HOUSE.h,HOUSE.angle);
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
const entry={open:false,door:0,mode:'exterior',blend:0,cameraWeight:0,previous:null,inside:false,action:null,lastAction:null};
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
for(const side of [-1,1]){
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
const planterSpecs=[{id:'porch-ceramic',type:'ceramic',x:-4.40,z:-home.d/2-2.02},{id:'porch-wooden',type:'wooden',x:4.40,z:-home.d/2-2.02}];
const GROW_MS=90000,SAVE_KEY='cv.ornamentalGarden.v1';
let gardenSave={};let gardenError='';
try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))gardenSave=saved;}catch{}
const potMat=mat('warm terracotta pottery','#ad633e'),potRim=mat('ceramic lip','#d08a59'),soilMat=mat('potting soil','#523b2b'),flowerMat=mat('cultivated flower vertex colors','#ffffff');
flowerMat.backFaceCulling=false;flowerMat.specularColor=Color3.Black();
const planters=planterSpecs.map(spec=>{
 const type=planterTypes[spec.type],p=home.C(spec.x,.53,spec.z);
 entity('porch planters');
 if(spec.type==='ceramic'){
  cyl('tapered ceramic pot',p.x,p.y+.22,p.z,.26,.44,potMat,.38);
  cyl('ceramic pot lip',p.x,p.y+.455,p.z,.40,.095,potRim);
  cyl('exposed ceramic pot soil',p.x,p.y+.48,p.z,.34,.018,soilMat);
  cyl('pot saucer',p.x,p.y+.038,p.z,.38,.075,potRim);
 }else{
  porchBox('wooden planter base',spec.x,.61,spec.z,1.16,.15,.62,M.woodDark);
  porchBox('planter soil',spec.x,.90,spec.z,1.04,.12,.50,soilMat);
  for(const k of [-1,1]){
   porchBox('planter long side',spec.x,.76,spec.z+k*.275,1.16,.44,.10,M.woodLight);
   porchBox('planter short side',spec.x+k*.53,.76,spec.z,.10,.44,.62,M.wood);
  }
 }
 porchFixtures.push({kind:'planter',x:spec.x,z:spec.z,hx:type.hx,hz:type.hz});
 entity('porch cultivated flowers');
 const mesh=new Mesh('cultivated '+spec.id,scene);own(mesh,flowerMat,false);mesh.receiveShadows=false;mesh.position=home.C(spec.x,type.soilY,spec.z);mesh.rotation.y=home.angle;mesh.setEnabled(false);
 const saved=gardenSave[spec.id];const crop=saved&&Object.hasOwn(flowerCatalog,saved.species)&&Number.isFinite(saved.plantedAt)&&saved.plantedAt>=0&&saved.plantedAt<=Date.now()?{species:saved.species,plantedAt:saved.plantedAt}:null;
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
 p.stage=Math.max(0,Math.min(1,(now-p.crop.plantedAt)/GROW_MS));
 const scale=.18+.82*p.stage;p.mesh.scaling.setAll(scale);
}
function writeGarden(){
 const data=Object.fromEntries(planters.filter(p=>p.crop).map(p=>[p.id,p.crop]));
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));gardenError='';return true;}catch{gardenError='Não foi possível salvar as flores. Tente novamente.';return false;}
}
function nearbyPlanter(){const pos=homeLocal(avatar.position.x,avatar.position.z);if(entry.inside||entry.action||seating.phase!=='idle'||pos.z> -home.d/2+.10||pos.z<porchFront-.12)return null;return planters.map(p=>({p,dist:Math.hypot(pos.x-p.x,pos.z-p.z)})).filter(x=>x.dist<1.34).sort((a,b)=>a.dist-b.dist)[0]?.p||null;}
let selectedPlanter=null,lastGardenTick=0;
const gardenPanel=$('garden-panel'),gardenAction=$('garden-action');
function renderGarden(){
 if(!selectedPlanter)return;const p=selectedPlanter;
 $('garden-title').textContent=p.config.name;
 $('garden-state').textContent=gardenError||(p.crop?flowerCatalog[p.crop.species].name+' · '+(p.stage>=1?'Floresceu':Math.floor(p.stage*100)+'% de crescimento'):'Vazio · escolha uma espécie');
 for(const button of $('garden-species').querySelectorAll('button'))button.disabled=!!p.crop;
 $('garden-remove').disabled=!p.crop;
}
function changeCrop(species){
 const p=selectedPlanter;if(!p||nearbyPlanter()!==p||entry.action)return false;
 if(species!==null&&(!Object.hasOwn(flowerCatalog,species)||p.crop))return false;
 if(species===null&&!p.crop)return false;
 const prior=p.crop;p.crop=species===null?null:{species,plantedAt:Date.now()};
 if(!writeGarden()){p.crop=prior;renderGarden();return false;}
 rebuildCrop(p);updateCrop(p);renderGarden();return true;
}
for(const [id,f] of Object.entries(flowerCatalog)){
 const b=document.createElement('button');b.textContent=f.name;b.dataset.flower=id;b.addEventListener('click',()=>changeCrop(id));$('garden-species').append(b);
}
gardenAction.addEventListener('click',()=>{selectedPlanter=nearbyPlanter();if(selectedPlanter){gardenPanel.hidden=false;renderGarden();}});
function closeGarden(){gardenPanel.hidden=true;selectedPlanter=null;}
$('garden-close').addEventListener('click',closeGarden);$('garden-remove').addEventListener('click',()=>changeCrop(null));
for(const p of planters){rebuildCrop(p);updateCrop(p);}
function updateGarden(now=Date.now()){
 const near=nearbyPlanter(),hide=!near||!gardenPanel.hidden;if(gardenAction.hidden!==hide)gardenAction.hidden=hide;
 if(selectedPlanter&&selectedPlanter!==near)closeGarden();
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
let weatherVisual={kind:'sun',rain:false,night:false,showers:false};
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
 if(label!==lastCalendarLabel){$('world-clock').textContent=label;lastCalendarLabel=label;}
 if($('world-clock-error').textContent!==clockError)$('world-clock-error').textContent=clockError;
 const minute=c.hour*60+c.minute,w=weatherAt(elapsed);
 if(minute!==lastLightMinute||w.slot!==lastWeatherSlot){
  lastWeatherSlot=w.slot;weatherVisual=weatherPresentation(w,daylight,c.hour);const weatherLabel=weatherVisual.label+' · '+w.temperature+' °C';$('world-weather').textContent=weatherLabel;$('weather-icon').textContent=weatherVisual.icon;document.body.dataset.weather=w.kind;
  lastLightMinute=minute;const k=daylight.daylight;
  // Maintain the existing daytime art. At night keep paths and controls readable.
  const cloud=w.kind==='sun'?1:w.kind==='cloud'?.80:w.kind==='rain'?(weatherVisual.showers?.87:.65):.50;light.intensity=.38+.47*k*cloud;sun.intensity=.09+.81*k*cloud;
  scene.clearColor=new Color4(.08+.28*k,.13+.43*k,.19+.10*k,1);
 }
}
window.addEventListener('pagehide',()=>saveWorldClock());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorldClock();else updateWorldClock(Date.now(),true);});
const WHEAT_SAVE='cv.wheat.v1',LEGACY_WHEAT_GROW=90000;
const wheatDuration=p=>Number.isFinite(p?.durationMs)&&p.durationMs>0?p.durationMs:LEGACY_WHEAT_GROW;
function wheatSchedule(now=Date.now(),crop='wheat'){return cropSchedule(crop,calendarAt(worldElapsed(now)).month);}
updateWorldClock(Date.now(),true);
const freshWheat=()=>({schema:1,seeds:24,grain:0,plots:{},stocks:{corn:{seeds:12,grain:0},rice:{seeds:12,grain:0},strawberry:{seeds:12,grain:0}},compost:24,treatments:24,quality:{}});
let wheatState=freshWheat(),wheatSaveError='',wheatSaveLocked=false;
try{
 const raw=localStorage.getItem(WHEAT_SAVE);
 if(raw!==null){const v=JSON.parse(raw);if(v.schema!==1||!Number.isSafeInteger(v.seeds)||v.seeds<0||!Number.isSafeInteger(v.grain)||v.grain<0||!v.plots||typeof v.plots!=='object'||Array.isArray(v.plots))throw Error('invalid wheat save');
 for(const [id,p] of Object.entries(v.plots)){if(!p||!wheatPlots.some(q=>q.id===id)||!['raw','tilled','sown','watered'].includes(p.state)||(p.state==='watered'&&(!Number.isFinite(p.wateredAt)||p.wateredAt<0))||(p.durationMs!==undefined&&(!Number.isFinite(p.durationMs)||p.durationMs<LEGACY_WHEAT_GROW||p.durationMs>3600000)))throw Error('invalid plot');}
 for(const p of Object.values(v.plots)){if(p.crop!==undefined&&!Object.hasOwn(CROP_CALENDAR,p.crop)||p.soil!==undefined&&!validSoil(p.soil))throw Error('invalid agricultural state');}
 const defaults=freshWheat();for(const id of ['corn','rice','strawberry']){const stock=v.stocks?.[id];if(stock&&(!Number.isSafeInteger(stock.seeds)||stock.seeds<0||!Number.isSafeInteger(stock.grain)||stock.grain<0))throw Error('invalid stock');}
 for(const k of ['compost','treatments'])if(v[k]!==undefined&&(!Number.isSafeInteger(v[k])||v[k]<0))throw Error('invalid farm resources');
 wheatState={...defaults,...v,stocks:{...defaults.stocks,...v.stocks}};}
}catch{wheatSaveLocked=true;wheatSaveError='Dados de trigo indisponíveis; cultivo bloqueado para preservar o save.';}
let farmCache=new Map(),farmCacheTime=-1;
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
 if(entry.action||seating.phase!=='idle'||entry.inside||!gardenPanel.hidden||!inWheat(avatar.position.x,avatar.position.z))return null;
 let best=null,dist=1.20;for(const p of wheatPlots){const n=Math.hypot(avatar.position.x-p.x,avatar.position.z-p.z);if(n<dist){best=p;dist=n;}}return best;
}
function applyWheatAction(action,id,now=Date.now()){
 if(wheatSaveLocked||nearestWheat()?.id!==id)return false;
 const status=wheatStatus(id,now),next=JSON.parse(JSON.stringify(wheatState)),elapsed=worldElapsed(now);
 let p=simulatePlot(next.plots[id],elapsed)||{state:'raw',crop:'wheat',soil:newSoil(elapsed)};
 // Existing saved crops keep their original countdown, not a new growth penalty.
 const legacy=p.state==='watered'&&!p.soil;
 if(!p.soil&&!legacy)p.soil=newSoil(elapsed);
 const crop=p.crop||'wheat',stock=stockFor(next,crop),selected=selectedSpecies(),takeSeed=id=>{if(id==='wheat')next.seeds--;else next.stocks[id].seeds--;};
 if(action==='till'&&status==='raw')p={...p,state:'tilled'};
 else if(action==='undo'&&status==='tilled')p={...p,state:'raw'};
 else if(action==='plant'&&status==='tilled'&&Object.hasOwn(CROP_CALENDAR,selected)&&stockFor(next,selected).seeds>0){takeSeed(selected);p=prepareSpecies(p,selected,elapsed);}
 else if(action==='water'&&status==='sown'){p={...p,state:'watered',wateredAt:now,durationMs:p.durationMs??wheatSchedule(now,crop).realMs};if(p.soil)p.soil.moisture=.92;}
 else if(action==='water'&&status==='watered'&&!legacy){p.soil.moisture=.92;}
 else if(action==='irrigate'&&!legacy){p.soil.irrigated=!p.soil.irrigated;if(p.soil.irrigated){p.soil.moisture=Math.max(p.soil.moisture,CROP_CALENDAR[crop].moisture+.1);if(p.state==='sown'){p.state='watered';p.wateredAt=now;}}}
 else if(action==='fertilize'&&!legacy&&next.compost>0&&p.soil.fertility<.99){next.compost--;p.soil.fertility=Math.min(1,p.soil.fertility+.24);}
 else if(action==='treat'&&!legacy&&next.treatments>0&&p.soil.pest>.01){next.treatments--;p.soil.pest=Math.max(0,p.soil.pest-.65);}
 else if(action==='harvest'&&status==='ripe'){
  const result=legacy?{units:CROP_CALENDAR[crop].yield,quality:'Boa'}:harvestInfo(p);
  if(!Number.isSafeInteger(stock.grain+result.units)||!Number.isSafeInteger(stock.seeds+1))return false;
  if(crop==='wheat'){next.grain+=result.units;next.seeds++;}else{next.stocks[crop].grain+=result.units;next.stocks[crop].seeds++;}
  next.quality[result.quality]=(next.quality[result.quality]||0)+result.units;
  const soil=p.soil||newSoil(elapsed);soil.fertility=Math.max(.2,soil.fertility-.14);soil.lastCrop=crop;soil.progress=0;
  p=CROP_CALENDAR[crop].regrow?{...p,state:'watered',wateredAt:now,durationMs:CROP_CALENDAR[crop].regrow*300000,soil}:{state:'tilled',crop,soil};
 }else return false;
 // Legacy watering dates are wall timestamps; simulated crops use soil.at in world elapsed time.
 if(p.soil&&p.state==='watered'&&!Number.isFinite(p.wateredAt))p.wateredAt=now;
 next.plots[id]=p;
 try{localStorage.setItem(WHEAT_SAVE,JSON.stringify(next));}catch{wheatSaveError='Falha ao salvar. Nenhuma alteração aplicada.';return false;}
 wheatState=next;farmCache.clear();wheatSaveError='';wheatVisualKey='';updateWheat(now,true);return true;
}
// Rebuild only on a visual stage transition; one mesh for furrows and one for wheat.
entity('wheat dynamic cultivation');
const wheatSoil=mat('wheat tilled soil','#ffffff');wheatSoil.backFaceCulling=false;wheatSoil.emissiveColor=new Color3(.035,.022,.015);
const wheatPlants=mat('wheat plants','#ffffff');wheatPlants.backFaceCulling=false;wheatPlants.emissiveColor=new Color3(.04,.035,.012);wheatPlants.specularColor=Color3.Black();
const wheatFurrows=own(new Mesh('individual tilled and watered plots',scene),wheatSoil,false),wheatStalks=own(new Mesh('batched real wheat stalks and ears',scene),wheatPlants,false);
const selectionMat=mat('wheat selection','#e7d5a0');selectionMat.emissiveColor=Color3.FromHexString('#e7d5a0');selectionMat.disableLighting=true;
const plotOutline=MeshBuilder.CreateLines('selected wheat plot',{points:[V(-.28,0,-.73),V(0,0,-.66),V(.28,0,-.73)]},scene);plotOutline.color=Color3.FromHexString('#f7e5ac');plotOutline.isPickable=false;plotOutline.setEnabled(false);
let wheatVisualKey='',lastWheatTick=0;
const moundPeaks={raw:0,tilled:.15,sown:.18,sprout:.20,green:.22,ripe:.23};
const moundState=new Map();let moundVertices=[],moundPositions=null,moundTimer=0;
const moundQA={active:0,updates:0,peak:0};
function moundHeight(id){return moundState.get(id)?.current||0;}
function tickMounds(dt){
 let active=false;for(const m of moundState.values()){if(Math.abs(m.target-m.current)>.0005){const delta=m.target-m.current,step=Math.sign(delta)*Math.min(Math.abs(delta),dt*.44);m.current+=step;active=true;}}
 moundQA.active=[...moundState.values()].filter(m=>Math.abs(m.target-m.current)>.0005).length;
 moundTimer+=dt;if(!active||!moundPositions||moundTimer<.075)return;moundTimer=0;
 for(const v of moundVertices)moundPositions[v.index]=v.base+v.profile*moundHeight(v.id);
 wheatFurrows.updateVerticesData(VertexBuffer.PositionKind,moundPositions,true,false);moundQA.updates++;
 if(moundQA.active===0){const normals=[];VertexData.ComputeNormals(moundPositions,wheatFurrows.getIndices(),normals);for(let i=0;i<normals.length;i+=3)if(normals[i+1]<0){normals[i]*=-1;normals[i+1]*=-1;normals[i+2]*=-1;}wheatFurrows.updateVerticesData(VertexBuffer.NormalKind,normals);}
}
function wheatStage(p,now){const state=wheatStatus(p.id,now);return state==='watered'?(wheatProgress(p.id,now)<.35?'sprout':'green'):state;}
function rebuildWheat(now){
 const key=wheatPlots.map(p=>{const v=evaluatedPlot(p.id,now);return [wheatStage(p,now),v?.crop,v?.soil?.irrigated,v?.soil?Math.floor(v.soil.moisture*4):0].join(':');}).join('|');if(key===wheatVisualKey)return;wheatVisualKey=key;
 const soil={p:[],i:[],c:[]},plants={p:[],i:[],c:[]};moundVertices=[];
 const byBed=new Map(wheatBeds.map(b=>[b.id,wheatPlots.filter(p=>p.bedId===b.id)]));
 function tri(buf,a,b,c,col){const i=buf.p.length/3;buf.p.push(...a,...b,...c);buf.i.push(i,i+1,i+2);for(let k=0;k<3;k++)buf.c.push(col.r,col.g,col.b,1);}
 function quad(buf,a,b,c,d,col){tri(buf,a,b,c,col);tri(buf,a,c,d,col);}
 const earth=Color3.FromHexString('#9a7048'),wet=Color3.FromHexString('#594332'),green=Color3.FromHexString('#548b32'),leaf=Color3.FromHexString('#8dab3c'),gold=Color3.FromHexString('#d4ad48'),ear=Color3.FromHexString('#e7c66a');
 for(const p of wheatPlots){
  const stage=wheatStage(p,now),data=evaluatedPlot(p.id,now),crop=data?.crop||'wheat',target=moundPeaks[stage]||0;
 const prior=moundState.get(p.id);if(!prior)moundState.set(p.id,{current:wheatVisualKey&&target?0:target,target});else prior.target=target;
 const m=moundState.get(p.id);if(stage==='raw'&&m.current<.001&&!data?.soil?.irrigated)continue;
 const bed=wheatBeds.find(b=>b.id===p.bedId),neighbors=byBed.get(p.bedId),at=neighbors.indexOf(p),left=neighbors[at-1],right=neighbors[at+1],leftActive=left&&wheatStage(left,now)!=='raw',rightActive=right&&wheatStage(right,now)!=='raw';
  const color=data?.soil?.moisture>.65||!data?.soil&&['sprout','green','ripe'].includes(stage)?wet:earth;
  const y=(x,z,rise)=>Math.max(height(x,z),renderedTerrainY(x,z))+bedHeightAt(x,z,bed)+rise;
  const x1=leftActive?(left.x2+p.x1)/2:p.x1,x2=rightActive?(p.x2+right.x1)/2:p.x2;
  for(let row=0;row<3;row++){
   const center=p.z1+.21+row*.41,cols=Math.max(5,Math.ceil((x2-x1)/.19)),cross=6,start=soil.p.length/3;
   for(let k=0;k<=cols;k++)for(let l=0;l<=cross;l++){
    const x=x1+(x2-x1)*k/cols,z=center-.195+.39*l/cross,end=Math.min(1,leftActive?1:(x-x1)/.22,rightActive?1:(x2-x)/.22),profile=Math.pow(Math.sin(Math.PI*l/cross),1.35)*Math.max(0,end)*(1+.05*Math.sin(x*9+row));
    const base=y(x,z,.004),index=soil.p.length+1;soil.p.push(x,base+profile*m.current,z);moundVertices.push({index,base,profile,id:p.id});const shade=.85+.15*profile;soil.c.push(color.r*shade,color.g*shade,color.b*shade,1);
   }
   for(let k=0;k<cols;k++)for(let l=0;l<cross;l++){const a=start+k*(cross+1)+l,b=a+cross+1;soil.i.push(a,b,a+1,b,b+1,a+1);}
  }
  if(data?.soil?.irrigated){const z=p.z1+.04;quad(soil,[p.x1,y(p.x1,z,.14),z],[p.x2,y(p.x2,z,.14),z],[p.x2,y(p.x2,z+.06,.14),z+.06],[p.x1,y(p.x1,z+.06,.14),z+.06],Color3.FromHexString('#30494b'));}
  if(!['sprout','green','ripe'].includes(stage))continue;
  for(let row=0;row<3;row++)for(let k=0;k<4;k++){
   const x=p.x1+(p.x2-p.x1)*(.12+k*.25),z=p.z1+.21+row*.41,b=y(x,z,target+.015),ripe=stage==='ripe',hh=(stage==='sprout'?.16:stage==='green'?.48:.76)*(crop==='corn'?1.65:crop==='strawberry'?.40:crop==='rice'?.88:1)*(1+.07*Math.sin(k*4+row));
   const col=ripe&&crop==='wheat'||ripe&&crop==='rice'?gold:green,r=crop==='corn'?.026:.015;
   quad(plants,[x-r,b,z],[x+r,b,z],[x+r,b+hh,z],[x-r,b+hh,z],col);
   quad(plants,[x,b,z-r],[x,b,z+r],[x,b+hh,z+r],[x,b+hh,z-r],col);
   for(const side of [-1,1])tri(plants,[x,b+hh*.25,z],[x+side*hh*.36,b+hh*.48,z+.035],[x,b+hh*.45,z],ripe?gold:leaf);
   if(crop==='strawberry'){for(const side of [-1,1]){tri(plants,[x,b+.05,z],[x+side*.16,b+.10,z-.08],[x+side*.09,b+hh,z+.07],leaf);if(ripe)tri(plants,[x+side*.09,b+.07,z],[x+side*.15,b+.17,z-.03],[x+side*.03,b+.17,z+.03],Color3.FromHexString('#d64142'));}}
   if(ripe&&crop==='corn'){for(const side of [-1,1])quad(plants,[x,b+hh*.42,z],[x+side*.075,b+hh*.45,z],[x+side*.075,b+hh*.75,z],[x,b+hh*.78,z],ear);}
   if(ripe&&(crop==='wheat'||crop==='rice'))for(let n=0;n<4;n++){const yy=b+hh-.03+n*.041,side=n%2?1:-1;tri(plants,[x,yy-.035,z],[x+side*.058,yy+.04,z],[x,yy+.065,z],ear);tri(plants,[x,yy-.035,z],[x,yy+.04,z+side*.058],[x,yy+.065,z],gold);}
  }
 }
 for(const [mesh,b] of [[wheatFurrows,soil],[wheatStalks,plants]]){
  if(!b.i.length){mesh.setEnabled(false);if(mesh===wheatFurrows)moundPositions=null;continue;}
  const v=new VertexData();v.positions=b.p;v.indices=b.i;v.colors=b.c;v.normals=[];VertexData.ComputeNormals(v.positions,v.indices,v.normals);if(mesh===wheatFurrows){for(let k=0;k<v.normals.length;k+=3)if(v.normals[k+1]<0){v.normals[k]*=-1;v.normals[k+1]*=-1;v.normals[k+2]*=-1;}moundPositions=b.p.slice();}v.applyToMesh(mesh,true);mesh.setEnabled(true);
  moundQA.peak=Math.max(0,...Array.from(moundState.values(),m=>m.target));
 }
}
const wheatPanel=$('wheat-panel'),wheatAction=$('wheat-action'),wheatUndo=$('wheat-undo');
const wheatNames={raw:'Terra por preparar',tilled:'Terra arada',sown:'Sementes · precisa regar',watered:'Crescendo',ripe:'Pronto para colher'};
const wheatActions={raw:'till',tilled:'plant',sown:'water',ripe:'harvest'};
const wheatLabels={till:'Arar',plant:'Plantar trigo',water:'Regar',harvest:'Colher'};
let wheatSelected=null;
function updateWheat(now=Date.now(),force=false){
 const p=nearestWheat();if(p!==wheatSelected||force){wheatSelected=p;plotOutline.setEnabled(!!p);if(p){plotOutline.position.copyFromFloats(p.x,Math.max(height(p.x,p.z),renderedTerrainY(p.x,p.z))+.11,p.z);plotOutline.scaling.x=p.x2-p.x1;}}
 if(wheatPanel.hidden===!!p)wheatPanel.hidden=!p;
 // Keep the runner reachable when the farm panel is displayed.
 if(document.body.classList.contains('wheat-near')!==!!p)document.body.classList.toggle('wheat-near',!!p);
 if(force||now-lastWheatTick>=250){lastWheatTick=now;rebuildWheat(now);}
 if(!p)return;
 const status=wheatStatus(p.id,now),action=wheatActions[status],data=evaluatedPlot(p.id,now),crop=status==='raw'||status==='tilled'?selectedSpecies():data?.crop||'wheat',stock=stockFor(wheatState,crop),soil=data?.soil||newSoil(worldElapsed(now)),legacy=status==='watered'&&!data?.soil,label=action==='plant'?'Plantar '+CROP_CALENDAR[crop].name.toLowerCase():action?wheatLabels[action]:('Crescendo '+Math.floor(wheatProgress(p.id,now)*100)+'%');
 $('crop-select').hidden=!['raw','tilled'].includes(status);
 if(wheatAction.textContent!==label)wheatAction.textContent=label;
 wheatAction.disabled=!action||wheatSaveLocked||(action==='plant'&&stock.seeds===0);
 wheatUndo.hidden=status!=='tilled';wheatUndo.disabled=wheatSaveLocked;
 const text=wheatSaveError||CROP_CALENDAR[crop].name+' · '+wheatNames[status]+' · Sementes '+stock.seeds+' · Colhido '+stock.grain;
 const schedule=wheatSchedule(now,crop),duration=data?.durationMs??schedule.realMs;
 const hint=status==='watered'?'Estimativa base: '+Math.ceil(Math.max(0,duration*(1-wheatProgress(p.id,now)))/60000)+' min reais · condições podem alterar':status==='ripe'?'Qualidade: '+harvestInfo(data).quality:(schedule.preferred?'Época favorável':'Fora de época · cresce mais devagar')+' · '+(duration/60000)+' min base';
 const soilText='Umidade '+Math.round(soil.moisture*100)+'% · Fertilidade '+Math.round(soil.fertility*100)+'% · Pragas '+Math.round(soil.pest*100)+'%';if($('soil-status').textContent!==soilText)$('soil-status').textContent=soilText;
 $('farm-water').disabled=wheatSaveLocked||legacy||status!=='watered';$('farm-irrigate').disabled=wheatSaveLocked||legacy;$('farm-irrigate').textContent=soil.irrigated?'Desligar irrigação':'Irrigar automaticamente';$('farm-fertilize').disabled=wheatSaveLocked||legacy||!wheatState.compost||soil.fertility>=.99;$('farm-treat').disabled=wheatSaveLocked||legacy||!wheatState.treatments||soil.pest<=.01;
 if($('wheat-season').textContent!==hint)$('wheat-season').textContent=hint;
 if($('wheat-status').textContent!==text)$('wheat-status').textContent=text;
}
wheatAction.addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction(wheatActions[wheatStatus(p.id)],p.id);});
wheatUndo.addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction('undo',p.id);});
$('crop-select').addEventListener('change',()=>updateWheat(Date.now(),true));
for(const [id,action] of [['farm-water','water'],['farm-irrigate','irrigate'],['farm-fertilize','fertilize'],['farm-treat','treat']])$(id).addEventListener('click',()=>{const p=nearestWheat();if(p)applyWheatAction(action,p.id);});
const farmCenter=$('farm-center');
let lastFarmCenter=-Infinity;
function refreshFarmCenter(now=Date.now(),force=false){
 if(farmCenter.hidden||!force&&now>=lastFarmCenter&&now-lastFarmCenter<1000)return;lastFarmCenter=now;
 const elapsed=worldElapsed(now),c=calendarAt(elapsed),w=weatherAt(elapsed);
 $('farm-overview').textContent=c.season+' · '+w.label+' · '+w.temperature+' °C | '+wheatPlots.length+' parcelas | Adubo '+wheatState.compost+' · Tratamentos '+wheatState.treatments;
 $('farm-forecast').textContent=[1,2,3,4].map(i=>{const forecast=weatherAt((w.slot+i)*WEATHER_INTERVAL),at=calendarAt((w.slot+i)*WEATHER_INTERVAL);return String(at.hour).padStart(2,'0')+':'+String(at.minute).padStart(2,'0')+' '+at.day+'/'+at.month+' '+forecast.label+' '+forecast.temperature+' °C';}).join(' | ');
 $('farm-catalog').textContent=Object.entries(CROP_CALENDAR).map(([id,crop])=>{const sc=cropSchedule(id,c.month),stock=stockFor(wheatState,id);return crop.name+': '+sc.realMs/60000+' min base · '+(sc.preferred?'época favorável':'fora de época')+' · meses '+crop.preferredMonths.join(', ')+' · sementes '+stock.seeds+' · estoque '+stock.grain;}).join('\n');
 $('farm-quality').textContent='Colheita por qualidade: '+Object.entries(wheatState.quality).map(([k,v])=>k+' '+v).join(' · ');
}
$('farm-open').addEventListener('click',()=>{cancelInput();farmCenter.hidden=false;refreshFarmCenter(Date.now(),true);});$('farm-close').addEventListener('click',()=>{farmCenter.hidden=true;});
rebuildWheat(Date.now());
function surfaceHeight(x,z){
 const p=homeLocal(x,z),f=-home.d/2;
 if(Math.abs(p.x)<=home.w/2&&Math.abs(p.z)<=home.d/2)return home.y+.53;
 if(Math.abs(p.x)<=(home.w*HOUSE.porchRatio/2)&&p.z>=f-2.85-porchExtension&&p.z<=f)return home.y+.53;
 if(Math.abs(p.x)<=1.1&&p.z>=f-3.725-porchExtension&&p.z<f-2.85-porchExtension){const i=Math.max(0,Math.min(2,Math.floor((p.z-f+3.725+porchExtension)/.35)));return home.y+[.18,.35,.53][i];}
 if(onBridge(x,z))return 2.945;
 let groundY=height(x,z);if(inWheat(x,z)){const bed=wheatBeds.find(b=>x>=b.x1&&x<=b.x2&&z>=b.z1&&z<=b.z2);if(bed){groundY=Math.max(groundY,renderedTerrainY(x,z))+bedHeightAt(x,z,bed);const plot=wheatPlots.find(p=>p.bedId===bed.id&&x>=p.x1-.03&&x<=p.x2+.03);if(plot){const row=Math.round((z-bed.z1-.21)/.41),center=bed.z1+.21+Math.max(0,Math.min(2,row))*.41,profile=Math.max(0,Math.cos(Math.PI*Math.min(1,Math.abs(z-center)/.39)));groundY+=moundHeight(plot.id)*Math.pow(profile,1.35);}}}
 let closest=Infinity,roadY=groundY;
 for(const [rows,half,relief] of [[pathRows,1.24,.08],[approachRows,1.65,0]]){
 if(x<Math.min(rows[0][1].x,rows.at(-1)[1].x)-4||x>Math.max(rows[0][1].x,rows.at(-1)[1].x)+4)continue;
 for(let i=1;i<rows.length;i++){const a=rows[i-1][1],b=rows[i][1],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),dist=Math.hypot(x-a.x-u*dx,z-a.z-u*dz);if(dist<half&&dist<closest){closest=dist;roadY=Math.max(groundY,a.y+(b.y-a.y)*u+relief*(rows===pathRows?Math.min(1,(rows.length-i+1-u)*.28/.65):1));}}}
 return roadY;
}
function homeBlocked(x,z,interacting=false){
 const p=homeLocal(x,z),f=-home.d/2,half=home.w/2,r=.20,wall=.22;
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
const trunkColliders=[];
const canopyStats={trees:0,leaves:0,petals:0,vertices:0,triangles:0};
function tree(id,u,v,pink=false,size=1){
 entity(id);const x=X(u),z=Z(v),y=height(x,z);trunkColliders.push({x,z,r:.36*size});
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
const treeZones=[[35,0,195,235],[210,0,740,70],[40,270,160,325],[655,70,737,195]];
let planted=0;for(let i=0;i<450&&planted<29;i++){const a=treeZones[i%treeZones.length],u=a[0]+placeRnd()*(a[2]-a[0]),v=a[1]+placeRnd()*(a[3]-a[1]),x=X(u),z=Z(v),nr=nearRiver(x,z);
 if(nr.dist<nr.w*.54+1.5||treePositions.some(p=>Math.hypot((u-p[0])/8,(v-p[1])/6.553)<3.5)||roadSegments.some(([a,b,w])=>segDist(x,z,a,b)<w+1.5))continue;
 treePositions.push([u,v]);tree('forest '+planted,u,v,planted%11===0,.90+placeRnd()*.54);planted++;
}
// Low-growing woodland vegetation, grouped into one real vertex-colored mesh.
// Do not put shrubs in river, roads, the residence, or the bridge approach.
entity('woodland understory');{
 const p=[],ind=[],cols=[],norm=[];let seed=4179;const rand=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
 const palette=['#315b27','#537f2e','#76973b','#a4bd50','#d0cf64'].map(c=>Color3.FromHexString(c));
 for(let i=0;i<600&&bankStats.understory<180;i++){
  const zone=treeZones[i%treeZones.length],u=zone[0]+rand()*(zone[2]-zone[0]),v=zone[1]+rand()*(zone[3]-zone[1]),x=X(u),z=Z(v),nr=nearRiver(x,z);
  if(nr.dist<nr.w*.54+.75||roadSegments.some(([a,b,w])=>segDist(x,z,a,b)<w+1.1)||treePositions.some(q=>Math.hypot((u-q[0])/8,(v-q[1])/6.553)<.65))continue;
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
entity('dog');const dog=P(325,183);dog.y=height(dog.x,dog.z);const dogFur=mat('dog caramel','#ba713c'),dogWhite=mat('dog ivory','#f1dcb9');sphere('dog body',dog.x,dog.y+.41,dog.z,.41,.30,.63,dogFur);sphere('dog chest',dog.x,dog.y+.48,dog.z-.38,.30,.34,.29,dogWhite);sphere('dog head',dog.x,dog.y+.78,dog.z-.50,.31,.32,.32,dogFur);sphere('dog muzzle',dog.x,dog.y+.63,dog.z-.77,.22,.16,.22,dogWhite);sphere('dog nose',dog.x,dog.y+.67,dog.z-.92,.10,.08,.09,M.black);for(let a of [-1,1]){sphere('dog ear',dog.x+a*.27,dog.y+.71,dog.z-.50,.10,.23,.13,M.woodDark);sphere('dog eye',dog.x+a*.13,dog.y+.84,dog.z-.73,.042,.046,.035,M.black);for(let b of [-1,1])sphere('dog leg',dog.x+a*.23,dog.y+.17,dog.z+b*.34,.11,.21,.12,dogWhite)}beam('dog tail',V(dog.x,dog.y+.5,dog.z+.55),V(dog.x+.1,dog.y+.91,dog.z+.79),.12,dogFur);cyl('dog bowl',dog.x+.68,dog.y+.09,dog.z-.6,.23,.16,M.red);
entity('garden border');for(let k=0;k<30;k++){const u=350+k*4.1,v=181+3*Math.sin(k*.5),p=P(u,v);p.y=height(p.x,p.z)+.07;if(pathDistance(p.x,p.z)>1.55)rock('garden edging',p,.20,.13,.17,M.stoneLight)}
entity('grass details');const grassBase=MeshBuilder.CreateCylinder('grass tuft', {diameterTop:0,diameterBottom:.10,height:.36,tessellation:3},scene);grassBase.material=M.leaf2;grassBase.isPickable=false;const mats=[];for(let i=0;i<1800;i++){let u=35+random()*700,v=8+random()*310,x=X(u),z=Z(v),nr=nearRiver(x,z);if(nr.dist<nr.w/2+1.5||(u>320&&u<490&&v>96&&v<183)||(pathPoints.some(p=>Math.hypot(x-p.x,z-p.z)<1.4)||approachCurve.some(p=>Math.hypot(x-p.x,z-p.z)<1.8)||inWheat(x,z)))continue;let y=height(x,z)+.13;let matrix=Matrix.Compose(V(.7+random()*.8,.55+random()*.75,.7+random()*.8),Quaternion.RotationYawPitchRoll(random()*6.28,0,(random()-.5)*.4),V(x,y,z));mats.push(...matrix.asArray())}grassBase.thinInstanceSetBuffer('matrix',new Float32Array(mats),16,true);grassBase.receiveShadows=false;groups['grass details'].push(grassBase);
entity('farm visitor');const player=P(538,205);player.y=surfaceHeight(player.x,player.z);const avatar=new Mesh('visitor root',scene);avatar.position=player.clone();const bodyParts=[];for(const [n,x,y,z,w,h,d,m] of [['body',0,.97,0,.42,.63,.30,M.woodLight],['leg L',-.13,.36,0,.15,.62,.17,M.woodDark],['leg R',.13,.36,0,.15,.62,.17,M.woodDark],['arm L',-.29,.95,0,.14,.52,.16,M.plaster],['arm R',.29,.95,0,.14,.52,.16,M.plaster]]){let p=box(n,x,y,z,w,h,d,m);p.parent=avatar;bodyParts.push(p)}let head=sphere('head',0,1.5,0,.22,.25,.22,M.plaster);head.parent=avatar;let hat=cyl('straw hat',0,1.72,0,.37,.09,M.sand);hat.parent=avatar;let hatTop=cyl('hat crown',0,1.82,0,.21,.20,M.woodLight);hatTop.parent=avatar;
// Articulated arm used for grasping: two segments, elbow and a separate hand.
const reachUpper=box('interaction upper arm',0,0,0,.145,1,.155,M.plaster),reachLower=box('interaction forearm',0,0,0,.125,1,.135,M.plaster),reachHand=sphere('interaction hand',0,0,0,.085,.085,.09,M.plaster);
const reachMeshes=[reachUpper,reachLower,reachHand];for(const m of reachMeshes){m.parent=avatar;m.setEnabled(false);}
const restingHand=V(.29,.69,0),shoulder=V(.29,1.19,0);
function poseSegment(m,a,b){const delta=b.subtract(a),n=delta.normalizeToNew(),axis=Vector3.Cross(Vector3.Up(),n),dot=Vector3.Dot(Vector3.Up(),n);m.position.copyFrom(a.add(b).scale(.5));m.scaling.y=Math.max(.001,delta.length());m.rotationQuaternion=dot<-.99999?Quaternion.RotationAxis(Vector3.Right(),Math.PI):new Quaternion(axis.x,axis.y,axis.z,1+dot).normalize();}
function handPose(world,blend){
 avatar.computeWorldMatrix(true);const local=Vector3.TransformCoordinates(world,Matrix.Invert(avatar.getWorldMatrix()));
 const hand=Vector3.Lerp(restingHand,local,blend),elbow=Vector3.Lerp(shoulder,hand,.48).add(V(.075,-.095,-.045));
 for(const m of reachMeshes)m.setEnabled(true);bodyParts[4].setEnabled(false);
 poseSegment(reachUpper,shoulder,elbow);poseSegment(reachLower,elbow,hand);reachHand.position.copyFrom(hand);reachHand.computeWorldMatrix(true);
 return {error:Vector3.Distance(reachHand.getAbsolutePosition(),world),reach:Vector3.Distance(shoulder,local)};
}
function releaseHand(){for(const m of reachMeshes)m.setEnabled(false);bodyParts[4].setEnabled(true);}
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
 if(entry.action||entry.inside||!gardenPanel.hidden)return null;
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2;
 if(p.z>f-.18||p.z<porchFront)return null;
 return benches.map(b=>({b,d:Math.hypot(p.x-b.x,p.z-(b.z-.70))})).filter(x=>x.d<1.12).sort((a,b)=>a.d-b.d)[0]?.b||null;
}
function setSeatPose(blend,lean=0){
 seating.blend=blend;
 const drop=.10*blend;
 bodyParts[0].position.copyFromFloats(0,.97-drop,.04*blend);
 bodyParts[0].rotation.x=lean;
 head.position.copyFromFloats(0,1.50-drop,.09*blend);hat.position.copyFromFloats(0,1.72-drop,.09*blend);hatTop.position.copyFromFloats(0,1.82-drop,.09*blend);
 for(let i=3;i<5;i++){const m=bodyParts[i],r=limbRest[i];m.position.copyFromFloats(r.x,r.y-drop,.12*blend);m.rotation.x=-.65*blend+lean;}
 for(let i=0;i<seatLegs.length;i++){
  const l=seatLegs[i],x=l.x;
  const hip=V(x,.68-.10*blend,0),knee=V(x,.37+.17*blend,.39*blend),ankle=V(x,.075,.43*blend);
  for(const m of [l.thigh,l.shin,l.foot])m.setEnabled(blend>0);
  bodyParts[i+1].setEnabled(blend===0);bodyParts[i+1].rotation.x=0;bodyParts[i+1].position.copyFrom(limbRest[i+1]);
  poseSegment(l.thigh,hip,knee);poseSegment(l.shin,knee,ankle);l.foot.position.copyFromFloats(x,.06,.075+.43*blend);
 }
}
function seatStand(b){return home.C(b.x,.53,b.z-.77);}
function seatTarget(b){return home.C(b.x,.53,b.z-.13);}
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
  seating.elapsed+=dt;const stand=seatStand(b),sit=seatTarget(b),yaw=home.angle+Math.PI;
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
 if(seatButton.textContent!==label)seatButton.textContent=label;
 seatButton.disabled=seating.phase!=='idle'&&seating.phase!=='seated';
}

function walkPose(distance,dt){
 gait.distance+=distance;gait.moving=distance>0.0001;gait.phase=(gait.phase+distance*2*Math.PI/1.45)%(Math.PI*2);
 const target=Math.min(1,distance/Math.max(.001,dt)/3.5);
 gait.stride+=(target-gait.stride)*(1-Math.exp(-dt*18));if(gait.stride<.003)gait.stride=0;
 const swing=Math.sin(gait.phase)*gait.stride,runStyle=entry.action?0:Math.max(0,Math.min(1,(sprint.speed-WALK_SPEED)/(RUN_SPEED-WALK_SPEED)));
 for(let i=1;i<5;i++){
  const limb=bodyParts[i],rest=limbRest[i],isLeg=i<=2,pivot=isLeg?.29:.22,angle=swing*(isLeg?.53+.24*runStyle:.39+.27*runStyle)*(i===1||i===4?1:-1);
  limb.rotation.x=angle;limb.position.y=rest.y+pivot*(1-Math.cos(angle));limb.position.z=rest.z-pivot*Math.sin(angle);
 }
 const bob=Math.abs(Math.sin(gait.phase))*gait.stride*.045;bodyParts[0].position.y=limbRest[0].y+bob;head.position.y=1.5+bob;hat.position.y=1.72+bob;hatTop.position.y=1.82+bob;
}
let joy={x:0,z:0},keys=new Set(),follow=false;
let pointer=null,stickCenter=null;const pad=$('joy'),knob=$('knob'),runButton=$('run-action');
let runPointer=null;
function setRunHeld(held){sprint.held=held;runButton.setAttribute('aria-pressed',String(held));}
function releaseRun(){
 const old=runPointer;runPointer=null;setRunHeld(false);
 if(old!==null&&runButton.hasPointerCapture(old))try{runButton.releasePointerCapture(old);}catch{}
}
runButton.addEventListener('pointerdown',e=>{
 if(runPointer!==null||e.button!==0||entry.action||seating.phase!=='idle')return;
 runPointer=e.pointerId;runButton.setPointerCapture(e.pointerId);setRunHeld(true);e.preventDefault();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])runButton.addEventListener(name,e=>{if(e.pointerId===runPointer)releaseRun();});

const motion={manualFrames:0,blockedFrames:0,steps:0,requested:0,travelled:0,peakDeltaMs:0};
const DEADZONE=.10;
function shapeStick(x,z){const len=Math.hypot(x,z);if(len<=DEADZONE)return {x:0,z:0};const strength=(Math.min(1,len)-DEADZONE)/(1-DEADZONE);return {x:x/len*strength,z:z/len*strength};}
function reset(){
 const old=pointer;pointer=null;stickCenter=null;joy.x=joy.z=0;knob.style.transform='';
 if(old!==null&&pad.hasPointerCapture(old))try{pad.releasePointerCapture(old);}catch{}
}
function cancelInput(){keys.clear();reset();releaseRun();resetSprint();}
window.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.startsWith('Arrow'))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',cancelInput);window.addEventListener('resize',cancelInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelInput()});
function move(e){
 if(e.pointerId!==pointer||!stickCenter)return;
 const dx=e.clientX-stickCenter.x,dy=e.clientY-stickCenter.y,r=stickCenter.r,len=Math.hypot(dx,dy),k=Math.min(1,r/Math.max(1,len)),v=shapeStick(dx/r,-dy/r);
 joy.x=v.x;joy.z=v.z;knob.style.transform='translate('+dx*k+'px,'+dy*k+'px)';
}
pad.addEventListener('pointerdown',e=>{
 if(pointer!==null||e.button!==0)return;const r=pad.getBoundingClientRect();
 stickCenter={x:r.left+r.width/2,y:r.top+r.height/2,r:Math.max(12,(r.width-knob.offsetWidth)/2-2)};
 pointer=e.pointerId;pad.setPointerCapture(pointer);move(e);e.preventDefault();
});
pad.addEventListener('pointermove',move);
for(const e of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(e,v=>{if(v.pointerId===pointer)reset()});

function onBridge(x,z){const a=ba,b=bb,dx=b.x-a.x,dz=b.z-a.z,t=((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz);return t>=0&&t<=1&&Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<1.28}
function blocked(x,z,interacting=false){if(x<minX+1||x>maxX-1||z<minZ+1||z>maxZ-1)return true;const bridge=onBridge(x,z);if(!bridge){const nr=nearRiver(x,z);if(nr.dist<nr.w*.54+.12)return true;}if(trunkColliders.some(t=>Math.hypot(x-t.x,z-t.z)<t.r+.18))return true;if(!bridge&&fenceColliders.some(([a,b])=>segDist(x,z,a,b)<.24))return true;if(homeBlocked(x,z,interacting))return true;const ddx=x-dogHome.x,ddz=z-dogHome.z,dc=Math.cos(dogHome.angle),ds=Math.sin(dogHome.angle);if(Math.abs(ddx*dc-ddz*ds)<dogHome.w/2+.18&&Math.abs(ddx*ds+ddz*dc)<dogHome.d/2+.18)return true;if(Math.hypot(x-well.x,z-well.z)<1.34)return true;if(Math.abs(x-fieldSignCollider.x)<1.08&&Math.abs(z-fieldSignCollider.z)<.26)return true;return false}
function setHouseGroup(id,visible){for(const mesh of groups[id]||[])mesh.setEnabled(visible);}
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
function doorNearby(){const p=homeLocal(avatar.position.x,avatar.position.z);return Math.abs(p.x)<2.25&&Math.abs(p.z+home.d/2)<2.55;}
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

window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='e'&&!e.repeat)toggleDoor()});
const smooth01=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// Camera influence is spatial and continuous, independent of the door/roof state.
function entryInfluence(p,inside,porch){
 if(inside||porch)return 1;
 const f=-home.d/2;
 if(p.z>f+.25)return 0;
 return smooth01((p.z-f+6.2+porchExtension)/3.25)*smooth01((3.0-Math.abs(p.x))/1.8);
}
function updateEntry(dt){
 updateDoorAction(dt);updateSeating(dt);
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2;
 const inside=Math.abs(p.x)<home.w/2-.12&&p.z>f+.22&&p.z<home.d/2-.12;
 const porch=Math.abs(p.x)<(home.w*HOUSE.porchRatio/2)+.15&&p.z>=f-2.9-porchExtension&&p.z<=f+.25;
 const stairs=Math.abs(p.x)<1.25&&p.z>=f-3.95-porchExtension&&p.z<f-2.8-porchExtension;
 const near=inside||porch||stairs;
 const next=inside?'interior':near?'entrada':'exterior';
 const weight=entryInfluence(p,inside,porch);entry.cameraWeight=weight;
 if(weight>.001&&!entry.previous)entry.previous={alpha:camera.alpha,beta:camera.beta,span,target:camera.target.clone(),follow};
 if(next!==entry.mode){entry.mode=next;setHouseGroup('house-porch-roof',!near);setHouseGroup('house-roof',!inside);setHouseGroup('house-front',!inside);shadowMap.resetRefreshCounter();}
 entry.inside=inside;updateChimneySmoke(dt,!inside);
 const nearDoor=seating.phase==='idle'&&(doorNearby()||!!entry.action),doorLabel=entry.action?(entry.action.target?'Abrindo…':'Fechando…'):(entry.door>.5?'Fechar porta':'Abrir porta');
 if(doorAction.disabled!==!!entry.action)doorAction.disabled=!!entry.action;
 if(doorAction.hidden===nearDoor)doorAction.hidden=!nearDoor;
 if(doorAction.textContent!==doorLabel)doorAction.textContent=doorLabel;
 const status=$('entry-status'),statusText=inside?'Interior':near?'Entrada da casa':'';
 if(status.textContent!==statusText)status.textContent=statusText;
 const factor=1-Math.exp(-dt*4);
 if(entry.previous){
  const saved=entry.previous;
  entry.blend+=(weight-entry.blend)*factor;
  const b=entry.blend;
  // The actor, not the building centre, is the tracking anchor. Look slightly
  // ahead along the entrance axis, keeping the actor below the visual centre.
  const forward=home.C(0,0,1).subtract(home.C(0,0,0));
  const aim=avatar.position.add(V(0,inside?1.25:1.45,0)).add(forward.scale(inside?.65:1.65));
  const baseAim=saved.follow?avatar.position.add(V(0,1,0)):saved.target;
  const desiredAlpha=saved.alpha+angleDelta(saved.alpha,-Math.PI/2-home.angle)*b;
  camera.alpha+=angleDelta(camera.alpha,desiredAlpha)*factor;
  const betaTarget=saved.beta+((inside?CAMERA_BETA:65*Math.PI/180)-saved.beta)*b;
  const beta=camera.beta+(betaTarget-camera.beta)*factor;
  const desiredSpan=saved.span+((inside?24:34)-saved.span)*b;
  span+=(desiredSpan-span)*factor;
  retarget(Vector3.Lerp(camera.target,Vector3.Lerp(baseAim,aim,b),factor),beta);fit();
  if(weight===0&&b<.004){camera.alpha=saved.alpha;span=saved.span;retarget(baseAim,saved.beta);fit();entry.previous=null;entry.blend=0;follow=saved.follow;}
 }else if(follow)retarget(Vector3.Lerp(camera.target,avatar.position.add(V(0,1,0)),1-Math.exp(-dt*9)));
}
function setView(newSpan,target,tracking){
 if(entry.previous){Object.assign(entry.previous,{span:newSpan,target,follow:tracking});return;}
 span=newSpan;follow=tracking;retarget(target);fit();
}
$('wide').onclick=()=>setView(94,V(-2,2.7,0),false);
$('close').onclick=()=>setView(66,V(0,3.5,0),false);
$('follow').onclick=()=>setView(27,avatar.position.add(V(0,1,0)),true);
$('field-view').onclick=()=>setView(45,V(wheatGate.x,3.5,wheatGate.z+5),false);
$('rotate').onclick=()=>{orbit=(orbit+1)%4;const alpha=-Math.PI/2+orbit*Math.PI/2;if(entry.previous)entry.previous.alpha=alpha;else camera.alpha=alpha;};
function moveAvatar(dx,dz,dt,interacting=false){
 if(Math.abs(dx)+Math.abs(dz)<1e-8){walkPose(0,dt);return 0;}
 const oldX=avatar.position.x,oldZ=avatar.position.z;
 let floor=surfaceHeight(oldX,oldZ);
 const attempt=(x,z)=>{
  if(blocked(x,z,interacting))return false;
  const next=surfaceHeight(x,z);if(Math.abs(next-floor)>.34)return false;
  avatar.position.x=x;avatar.position.z=z;floor=next;return true;
 };
 if(!attempt(oldX+dx,oldZ+dz)){
  if(Math.abs(dx)>1e-8)attempt(oldX+dx,oldZ);
  if(Math.abs(dz)>1e-8)attempt(avatar.position.x,oldZ+dz);
 }
 const mx=avatar.position.x-oldX,mz=avatar.position.z-oldZ,travel=Math.hypot(mx,mz);
 avatar.position.y=floor;
 if(travel>.0001){
  const target=Math.atan2(mx,mz);
  avatar.rotation.y=interacting?target:avatar.rotation.y+angleDelta(avatar.rotation.y,target)*(1-Math.exp(-dt*22));
 }
 walkPose(travel,dt);return travel;
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
 if(seating.phase!=='idle'||!farmCenter.hidden)return 0;
 if(entry.action||!gardenPanel.hidden){resetSprint();walkPose(0,Math.min(.05,dt));return 0;}
 const running=held&&moving;
 if(running){sprint.brake=0;sprint.coast=false;}
 else if(sprint.wasRunning&&sprint.active&&sprint.speed>WALK_SPEED+.65){
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
const rainMaterial=mat('world rain droplet','#c6e4ee');rainMaterial.disableLighting=true;rainMaterial.emissiveColor=Color3.FromHexString('#91c4d8');rainMaterial.alpha=.67;rainMaterial.disableDepthWrite=true;
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
function rainMatrix(buffer,i,x,y,z,sx,sy,sz){
 const o=i*16;buffer[o]=sx;buffer[o+5]=sy;buffer[o+10]=sz;buffer[o+12]=x;buffer[o+13]=y;buffer[o+14]=z;buffer[o+15]=1;
}
function rainSurface(x,z){
 const p=homeLocal(x,z),ow=home.w/2+.55,od=home.d/2+.65,e=HOUSE.h+.5,r=e+home.w*.26;
 if(Math.abs(p.x)<=ow&&Math.abs(p.z)<=od){
  let y=home.y+r+(e-r)*Math.abs(p.x)/ow+.13;
  const side=-1,z0=-.85,dw=2.35,front=side*ow*.78,back=side*ow*.26;
  if(p.x>=front-.32&&p.x<=back+.26&&Math.abs(p.z-z0)<=dw/2+.25){const top=e+(r-e)*.73,edge=top-.05,crest=top+1.03;y=Math.max(y,home.y+crest+(edge-crest)*Math.abs(p.z-z0)/(dw/2+.25));}
  return {y,kind:'roof',hidden:entry.inside};
 }
 const depth=3+porchExtension,half=home.w*(HOUSE.porchRatio/2+.035);
 if(Math.abs(p.x)<=half&&p.z<=-home.d/2&&p.z>=-home.d/2-depth)return {y:home.y+3.65-.53*(-home.d/2-p.z)/depth+.13,kind:'roof',hidden:entry.mode!=='exterior'};
 if(onBridge(x,z))return {y:2.945,kind:'deck',hidden:false};
 const nr=nearRiver(x,z);if(nr.dist<nr.w*.49)return {y:nr.y+.025,kind:'river',hidden:false};
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
const wetMaterials=[M.grass,M.earth,M.wood,M.woodLight,ceramicMat,road.material,scene.materials.find(m=>m.name==='continuous fertile earth')].filter(Boolean).map(m=>({m,dry:m.diffuseColor.clone(),shine:m.specularColor.clone()}));
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
 p.x=x;p.z=z;p.target=rainSurface(x,z);p.runoff=runoff;p.speed=runoff?7+rainRnd()*3:13+rainRnd()*9;
 p.y=runoff?Math.max(p.target.y+.2,y):p.target.y+9+rainRnd()*9;
 if(initial)p.y=p.target.y+(p.y-p.target.y)*rainRnd();
 p.life=1;
}
function updateRain(dt,weather=weatherVisual){
 dt=Math.max(0,Math.min(dt,.10));const raining=!!weather.rain,storm=weather.kind==='storm';
 rainStats.wetness=Math.max(0,Math.min(1,rainStats.wetness+dt*(raining?(storm?.075:.045):-.006)));
 wetTick+=dt;if(wetTick>=.15||raining!==wasRaining){wetTick=0;const w=rainStats.wetness;
  for(const {m,dry,shine} of wetMaterials){m.diffuseColor.set(dry.r*(1-.28*w),dry.g*(1-.23*w),dry.b*(1-.17*w));m.specularColor.set(shine.r+.055*w,shine.g+.055*w,shine.b+.055*w);}
  for(const p of puddles){p.mesh.setEnabled(w>.32);p.mesh.visibility=Math.max(0,Math.min(1,(w-.32)/.48));}
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
  const len=p.runoff?.10:.16+p.speed*.012;
  rainMatrix(dropMatrices,i,p.x,p.y,p.z,hidden?0:.018,hidden?0:len,hidden?0:.018);
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
let t=0,frames=0;const shadowMap=shadow.getShadowMap();const shadowCache={refreshes:0,lastSignature:null,lastRefreshMs:-Infinity};shadowMap.refreshRate=0;scene.onBeforeRenderObservable.add(()=>{const rawDt=Math.max(0,engine.getDeltaTime()/1000),dt=Math.min(.05,rawDt);motion.peakDeltaMs=Math.max(motion.peakDeltaMs,rawDt*1000);t+=dt;waterTex.vOffset=-(t*.035)%1;fallTex.vOffset=-(t*.27)%1;for(let i=0;i<waterMotion.length;i++){const f=waterMotion[i],p=Vector3.Lerp(f.a,f.b,(f.phase+t*f.speed)%1).add(f.side);p.y+=.035;Matrix.Compose(f.scale,f.rotation,p).copyToArray(flowMatrices,i*16);}if(flowBatch)flowBatch.thinInstanceBufferUpdated('matrix');let x=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=joy.z+(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);let len=Math.hypot(x,z);if(len>1){x/=len;z/=len}const a=camera.alpha+Math.PI/2,dx=x*Math.cos(a)-z*Math.sin(a),dz=x*Math.sin(a)+z*Math.cos(a);updateLocomotion(dx,dz,rawDt);updateDust(Math.min(.12,rawDt));updateEntry(dt);updateGarden();updateWheat();tickMounds(dt);updateWorldClock();updateRain(rawDt);refreshFarmCenter();
 const sig=[Math.round(avatar.position.x*4),Math.round(avatar.position.z*4),Math.round(avatar.rotation.y*4),Math.round(avatar.rotation.x*20),Math.round(seating.blend*20),seating.phase,Math.round(gait.stride*Math.sin(gait.phase)*4),Math.round(camera.alpha*100),Math.round(camera.beta*100),Math.round(entry.door*20),entry.action?.phase||'',Math.round((entry.action?.turn||0)*10),entry.mode,Math.round(camera.target.x*2),Math.round(camera.target.z*2),Math.round(span*10)].join('|');const now=performance.now();if(sig!==shadowCache.lastSignature&&now-shadowCache.lastRefreshMs>=1000/30){shadowCache.lastSignature=sig;shadowCache.lastRefreshMs=now;shadowMap.resetRefreshCounter();shadowCache.refreshes++;}frames++});
// Measure elapsed real time between completed render callbacks, not the engine's startup estimate.
const perf={fps:null,p95Ms:null,maxMs:null,slowFrames:0,frames:0,last:null,windowStart:null,samples:[]};
scene.onAfterRenderObservable.add(()=>{const now=performance.now();if(perf.last!==null)perf.samples.push(now-perf.last);perf.last=now;if(perf.windowStart===null)perf.windowStart=now;const elapsed=now-perf.windowStart;if(elapsed>=4000&&perf.samples.length>=2){const a=perf.samples.slice().sort((x,y)=>x-y);perf.frames=perf.samples.length;perf.fps=1000*perf.frames/Math.max(1,a.reduce((x,y)=>x+y,0));perf.p95Ms=a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];perf.maxMs=a.at(-1);perf.slowFrames=a.filter(ms=>ms>33.33).length;$('fps').textContent=perf.fps.toFixed(1)+' FPS';$('metrics').textContent='P95 '+perf.p95Ms.toFixed(1)+' ms · '+engine.getRenderWidth()+'×'+engine.getRenderHeight()+' · '+perf.frames+' quadros · pico '+perf.maxMs.toFixed(1)+' ms · lentos '+perf.slowFrames;perf.samples=[];perf.windowStart=now;}});
function resetPerf(){perf.samples=[];perf.last=null;perf.windowStart=null;perf.fps=null;perf.p95Ms=null;perf.maxMs=null;perf.slowFrames=0;perf.frames=0;$('fps').textContent='Medindo…';$('metrics').textContent='Nova janela de medição';}
document.addEventListener('visibilitychange',resetPerf);
span=94;fit();retarget(V(-2,2.7,0));
// Keep entity boundaries and material boundaries. Only static pieces are batched.
// Logical component counts remain available for regression checks.
const componentCounts=Object.fromEntries(Object.entries(groups).map(([id,parts])=>[id,parts.length]));componentCounts.house+=['house-roof','house-front','house-porch-roof','house-door'].reduce((n,id)=>n+(componentCounts[id]||0),0);
const batching={before:scene.meshes.length,after:0,merged:0};
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
 if(['terrain','grass details','farm visitor','porch cultivated flowers','run dust','seated articulated legs','wheat dynamic cultivation','chimney smoke','world precipitation'].includes(id))continue;
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
batching.after=scene.meshes.length;
window.cvQA={scene,engine,roofCraft,facadeCraft,rainStats,rainSurface,rainPool,impactPool,puddles,updateRain,weatherPresentation,get weatherVisual(){return {...weatherVisual}},smokePuffs,smokeOrigin,updateChimneySmoke,qualityProfiles,selectQuality,get quality(){return quality},groups,componentCounts,batching,ground,terrainSkirtStats,bedSurfaceStats,moundQA,moundHeight,tickMounds,avatar,blocked,onBridge,nearRiver,layout,riverMotionMetrics,perf,shadowCache,treePositions,fenceColliders,flowInstancing,roadMetrics,canopyStats,bankStats,gait,bodyParts,entry,entryInfluence,homeLocal,surfaceHeight,homeBlocked,nearRiver,riverSegments,riverStats,shapeStick,joy,motion,advanceManual,sprint,updateLocomotion,updateDust,resetSprint,dustPool,dustAllowed,emitBrakeDust,porchRails,porchFixtures,porchHalf,benches,seating,seatLegs,seatStand,seatTarget,updateSeating,pathPoints,pathRows,pathFlowerPositions,pathDistance,stairFoot,bridgeEntry,pathMesh,road,pavingStats,connectionQA,roadClearance,residenceRails,wheatBounds,wheatBeds,wheatPlots,wheatStatus,wheatProgress,wheatDuration,wheatSchedule,evaluatedPlot,weatherAt,WEATHER_INTERVAL,applyWheatAction,updateWheat,calendarAt,worldElapsed,updateWorldClock,daylightAt,get worldClock(){return {...worldClock}},get daylight(){return {sky:light.intensity,sun:sun.intensity}},get wheatState(){return wheatState},wheatStalks,wheatFurrows,wheatGate,wheatPolygon,fieldRails,inWheat,approachCurve,approachRows,porchExtension,porchDepth:HOUSE.porchDepth,renderedTerrainY,projectPoint:p=>Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight())),planters,flowerCatalog,updateGarden,updateCrop,moveAvatar,updateEntry,reachHand,gripPoint,bridgeEnds:[ba.asArray(),bb.asArray()],home,dogHome,well:well.asArray(),ready:false};engine.runRenderLoop(()=>scene.render());scene.executeWhenReady(()=>{$('loading').remove();window.cvQA.ready=true});
