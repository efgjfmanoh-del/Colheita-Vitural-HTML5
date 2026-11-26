import {Engine,Scene,ArcRotateCamera,Vector3,Color3,Color4,Mesh,MeshBuilder,StandardMaterial,HemisphericLight,DirectionalLight,ShadowGenerator,VertexData,Quaternion,Matrix,DynamicTexture,Texture,VertexBuffer} from '@babylonjs/core';
import layout from '../layout.json';
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
for(const m of [M.stone,M.stoneLight,M.plaster])m.diffuseTexture=stoneTex;
M.roof.diffuseTexture=roofTex;M.grass.diffuseTexture=grassTex;
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
const rawChannel=layout.water.channels[0].points.filter(p=>p[0]<=741).map(([u,v,y,w])=>({p:P(u,v,y),w:w/8}));
const channel=[];for(let i=0;i<rawChannel.length-1;i++){const a=rawChannel[i],b=rawChannel[i+1],p0=rawChannel[Math.max(0,i-1)].p,p3=rawChannel[Math.min(rawChannel.length-1,i+2)].p;
 const n=Math.max(6,Math.ceil(Vector3.Distance(a.p,b.p)/.85)),fall=i===1||i===3;const ts=Array.from({length:n},(_,j)=>j/n).filter(t=>!fall||t<.45||t>.55);if(fall)ts.push(.45,.47,.49,.51,.53,.55);ts.sort((a,b)=>a-b);for(const t of ts){const p=Vector3.CatmullRom(p0,a.p,b.p,p3,t);let ht=t;if(fall)ht=Math.max(0,Math.min(1,(t-.47)/.06));p.y=a.p.y+(b.p.y-a.p.y)*ht;channel.push({p,w:a.w+(b.w-a.w)*t,fall});}}
channel.push(rawChannel.at(-1));

function nearRiver(x,z){let best={dist:1e9,y:1.8,w:4};for(let i=1;i<channel.length;i++){const a=channel[i-1],b=channel[i],dx=b.p.x-a.p.x,dz=b.p.z-a.p.z;let t=Math.max(0,Math.min(1,((x-a.p.x)*dx+(z-a.p.z)*dz)/(dx*dx+dz*dz)));let dist=Math.hypot(x-a.p.x-t*dx,z-a.p.z-t*dz),w=a.w+(b.w-a.w)*t;if(dist<best.dist)best={dist,y:a.p.y+(b.p.y-a.p.y)*t,w};}return best}
function height(x,z){let a=nearRiver(x,z),edge=a.dist-a.w/2;const west=x<-20?Math.max(0,Math.min(1,(z-5)/16))*2.2:0;const flat=2.65+west+.035*Math.sin(x*.24+Math.sin(z*.19))*Math.cos(z*.31);if(edge<0)return a.y-.44;if(edge<1.5){let t=edge/1.5;t=t*t*(3-2*t);return (a.y-.44)*(1-t)+Math.max(flat,a.y+.35)*t}return Math.max(flat,a.y+.35*Math.max(0,1-(edge-1.5)/6))}
entity('terrain');const minX=X(20),maxX=X(750),minZ=Z(330),maxZ=Z(-20),nx=170,nz=110,pos=[],idx=[],colors=[],uvs=[];
for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){let x=minX+(maxX-minX)*i/nx,z=minZ+(maxZ-minZ)*j/nz,y=height(x,z),n=nearRiver(x,z),d=n.dist-n.w/2;pos.push(x,y,z);uvs.push(x/2.7,z/2.7);const v=.94+.09*Math.sin(x*.39+Math.sin(z*.52))*Math.cos(z*.43+Math.sin(x*.21))+.025*Math.sin(x*1.71+z*.91);const patch=.5+.5*Math.sin(x*.17+Math.sin(z*.29))*Math.cos(z*.23+x*.07);const c=d<.9?[.57,.44,.27]:d<1.65?[.55,.62,.30]:[.37+.13*patch,.53+.14*patch,.19+.09*patch];colors.push(c[0]*v,c[1]*v,c[2]*v,1)}
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2)}
const ground=new Mesh('sculpted terrain mesh',scene),gd=new VertexData();gd.positions=pos;gd.indices=idx;gd.colors=colors;gd.uvs=uvs;gd.normals=[];VertexData.ComputeNormals(pos,idx,gd.normals);if(gd.normals[1]<0){for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];gd.indices=idx;VertexData.ComputeNormals(pos,idx,gd.normals);}gd.applyToMesh(ground);own(ground,M.grass,false);
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
const fenceColliders=[];const fencePoints=layout.residence.boundary.map(([u,v])=>{let p=P(u,v);const center=P(430,153);for(let n=0;n<25&&nearRiver(p.x,p.z).dist<nearRiver(p.x,p.z).w/2+.8;n++)p=Vector3.Lerp(p,center,.045);p.y=height(p.x,p.z);return p});
entity('residence fence');const gate=P(...layout.residence.gate.at);
for(let i=0;i<fencePoints.length;i++){let a=fencePoints[i],b=fencePoints[(i+1)%fencePoints.length];let len=Vector3.Distance(a,b),count=Math.ceil(len/1.9);for(let j=0;j<count;j++){let p=Vector3.Lerp(a,b,j/count),q=Vector3.Lerp(a,b,(j+1)/count);if(Vector3.Distance(Vector3.Lerp(p,q,.5),gate)<2.2)continue;p.y=height(p.x,p.z);q.y=height(q.x,q.z);fenceColliders.push([p.clone(),q.clone()]);box('fence post',p.x,p.y+.61,p.z,.20,1.22,.20,M.woodDark);box('post cap',p.x,p.y+1.25,p.z,.28,.12,.28,M.woodLight);for(let h of [.40,.89])beam('fence rail',p.add(V(0,h,0)),q.add(V(0,h,0)),.13,M.woodLight,.13)}}
const pathPoints=layout.residence.path.map(p=>P(...p));
entity('stone walkway');for(let i=1;i<pathPoints.length;i++){let a=pathPoints[i-1],b=pathPoints[i],d=b.subtract(a),len=d.length(),n=Math.ceil(len/.72);for(let j=0;j<n;j++){let p=Vector3.Lerp(a,b,j/n);for(let s of [-.45,.45]){let v=V(-d.z,0,d.x).normalize().scale(s).add(p);box('stepping stone',v.x,height(v.x,v.z)+.045,v.z,.77,.09,.63,j%3?M.stoneLight:M.stone,Math.atan2(d.x,d.z)+(random()-.5)*.2,false)}}}
// Exterior approach is a physical ground-following ribbon, not a painted road.
entity('bridge approach');const approach=[[575,248],[597,256],[616,270],[635,290],[644,305],[658,327]].map(p=>P(...p));
const approachCurve=[];for(let i=1;i<approach.length;i++){const a=approach[i-1],b=approach[i],n=Math.ceil(Vector3.Distance(a,b)/.42);for(let j=0;j<n;j++)approachCurve.push(Vector3.CatmullRom(approach[Math.max(0,i-2)],a,b,approach[Math.min(approach.length-1,i+1)],j/n));}approachCurve.push(approach.at(-1));
const rp=[],ri=[],rc=[],ru=[],sections=[];let pathLength=0;
for(let i=0;i<approachCurve.length;i++){const p=approachCurve[i],d=approachCurve[Math.min(i+1,approachCurve.length-1)].subtract(approachCurve[Math.max(0,i-1)]);d.y=0;d.normalize();if(i)pathLength+=Vector3.Distance(p,approachCurve[i-1]);const side=V(-d.z,0,d.x);
 const row=[];for(const offset of [-1.65,-1.35,-.75,0,.75,1.35,1.65]){const q=p.add(side.scale(offset));q.y=height(q.x,q.z)+.065;row.push(q);rp.push(...q.asArray());ru.push((offset+1.65)/3.3,pathLength/3);const edge=Math.abs(offset)>1.4;rc.push(edge?.64:1,edge?.62:1,edge?.43:1,1);}
 sections.push(row);
 if(i)for(let j=0;j<6;j++){const k=(i-1)*7+j;ri.push(k,k+7,k+1,k+1,k+7,k+8);}
}
const road=new Mesh('continuous terrain-following dirt road',scene),rv=new VertexData();rv.positions=rp;rv.indices=ri;rv.colors=rc;rv.uvs=ru;rv.normals=[];VertexData.ComputeNormals(rp,ri,rv.normals);if(rv.normals[1]<0){for(let i=0;i<ri.length;i+=3)[ri[i+1],ri[i+2]]=[ri[i+2],ri[i+1]];VertexData.ComputeNormals(rp,ri,rv.normals);}rv.applyToMesh(road);own(road,M.sand,false);
const roadMetrics={sections:sections.length,vertices:road.getTotalVertices(),segments:approachCurve.length-1};
entity('bridge home');const [ba,bb]=layout.bridges[0].ends.map(p=>P(...p,2.85));const bd=bb.subtract(ba),bl=bd.length(),ang=Math.atan2(bd.x,bd.z),bs=V(Math.cos(ang),0,-Math.sin(ang));
for(let k=0;k<Math.ceil(bl/.36);k++){let p=Vector3.Lerp(ba,bb,k/Math.ceil(bl/.36));box('bridge plank',p.x,p.y,p.z,3.15,.19,.35,k%3?M.woodLight:M.wood,ang);for(let s of [-1,1]){let q=p.add(bs.scale(s*1.48));if(k%4===0){box('bridge rail post',q.x,q.y+.55,q.z,.20,1.1,.20,M.woodDark);box('bridge pier',q.x,q.y-.75,q.z,.27,1.6,.27,M.woodDark)}}}for(let s of [-1,1])beam('bridge railing',ba.add(bs.scale(s*1.48)).add(V(0,.91,0)),bb.add(bs.scale(s*1.48)).add(V(0,.91,0)),.14,M.woodLight);
function house(id,u,v,w,d,h,angle,small=false){entity(id);const x=X(u),z=Z(v),y=height(x,z),C=(a,b,c)=>V(x+a*Math.cos(angle)+c*Math.sin(angle),y+b,z-a*Math.sin(angle)+c*Math.cos(angle));const B=(n,a,b,c,ww,hh,dd,m)=>{let p=C(a,b,c);return box(n,p.x,p.y,p.z,ww,hh,dd,m,angle)};const L=(n,a,b,ww,m)=>beam(n,C(...a),C(...b),ww,m);
 const doorW=small?w*.47:1.35,doorH=small?h*.65:2.2,wall=.22;let doorRoot=null;
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
 }for(let xx of [-w/2+.05,w/2-.05])for(let zz of [-d/2+.05,d/2-.05])B('corner framing',xx,h/2+.44,zz,.23,h,.23,M.woodDark);
 for(let zz of [-d/2-.03,d/2+.03]){const front=!small&&zz<0;entity(front?'house-front':id);for(let xx of [-w*.25,0,w*.25])if(!front||xx!==0)B('vertical timber',xx,h/2+.44,zz,.18,h,.17,M.wood);for(let yy of [.5,h*.53,h+.40]){if(front&&yy<.6){for(const k of [-1,1])B('split threshold timber',k*(w+doorW)/4,yy,zz,(w-doorW)/2,.19,.2,M.woodDark);}else B('horizontal timber',0,yy,zz,w,.19,.2,M.woodDark)}}entity(id);
 for(let xx of [-w/2-.03,w/2+.03]){for(let zz of [-d*.25,0,d*.25])B('side timber',xx,h/2+.44,zz,.18,h,.18,M.wood);for(let yy of [.5,h*.53,h+.40])B('side horizontal',xx,yy,0,.19,.19,d,M.woodDark)}
 if(!small)entity('house-roof');
 const e=h+.5,r=h+.5+w*.26,ow=w/2+.55,od=d/2+.65;
 for(let s of [-1,1]){let ps=[C(0,r,-od),C(0,r,od),C(s*ow,e,od),C(s*ow,e,-od)];quad('sloping roof panel',ps,M.roof,true);for(let row=0;row<Math.ceil(ow/.62);row++){let t=(row+.55)/Math.ceil(ow/.62),xx=s*ow*t,yy=r+(e-r)*t+.07;L('raised ceramic tile seam',[xx,yy,-od],[xx,yy,od],.09,row%3===0?M.tile2:M.tile);for(let zz=-od+.25;zz<od;zz+=.67){let stagger=(row%2)*.29;let zt=zz+stagger;if(zt>od-.1)continue;L('tile joint',[s*ow*Math.max(0,t-.045),yy+.03,zt],[s*ow*Math.min(1,t+.045),yy-.15,zt],.045,M.tile2)}}}
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
 for(const k of [-1,1])B('door jamb',k*(doorW/2+.065),.53+doorH/2,-d/2-.045,.13,doorH,.30,M.woodDark);
 B('door header',0,.53+doorH+.065,-d/2-.045,doorW+.26,.13,.30,M.woodDark);
 doorRoot=new Mesh('door hinge pivot',scene);doorRoot.position=C(-doorW/2+.035,.53,-d/2-.055);doorRoot.rotation.y=angle;
 const leaf=(n,x,y,z,ww,hh,dd,m)=>{const q=box(n,x,y,z,ww,hh,dd,m);q.parent=doorRoot;return q;};
 const leafW=doorW-.07;leaf('solid swinging door',leafW/2,doorH/2,0,leafW,doorH-.04,.095,M.wood);
 for(const x of [.13,leafW-.13])leaf('door vertical trim',x,doorH/2,-.07,.075,doorH-.11,.05,M.woodLight);
 for(const y of [.2,doorH-.2])leaf('door cross trim',leafW/2,y,-.07,leafW-.13,.09,.05,M.woodLight);
 leaf('door handle',leafW-.19,1.01,-.13,.12,.12,.13,M.black);
 entity('house-front');
 const window=(xx,yy)=>{B('window frame',xx,yy,-d/2-.12,1.37,1.43,.20,M.woodDark);B('window amber glass',xx,yy,-d/2-.24,1.11,1.17,.09,M.glass);B('window vertical bar',xx,yy,-d/2-.30,.10,1.2,.08,M.woodDark);B('window horizontal bar',xx,yy,-d/2-.30,1.17,.10,.08,M.woodDark);B('window sill',xx,yy-.73,-d/2-.33,1.55,.14,.42,M.woodLight)};
 for(let xx of [-w*.3,w*.3]){window(xx,1.8);window(xx,h*.76)}entity('house-roof');window(0,h+.88);entity(id);for(let xx of [-w/2-.10,w/2+.10])for(let zz of [-d*.22,d*.22]){B('side window frame',xx,h*.69,zz,.18,1.34,1.36,M.woodDark);B('side window glass',xx+Math.sign(xx)*.11,h*.69,zz,.10,1.08,1.07,M.glass);B('side mullion',xx+Math.sign(xx)*.17,h*.69,zz,.08,1.09,.09,M.woodDark);B('side window sill',xx+Math.sign(xx)*.22,h*.69-.73,zz,.35,.13,1.55,M.woodLight)}for(let side of [-1,1]){for(let i=0;i<5;i++){let yy=.55+i*.18;B('foundation stone trim',side*(w/2+.02),yy,d*.36,.13,.13,1.15,i%2?M.stone:M.stoneLight);}}
 B('porch deck',0,.37,-d/2-1.45,w*.77,.32,2.8,M.woodLight);for(let j=0;j<16;j++)B('porch deck board seam',-w*.37+j*w*.049,.54,-d/2-1.45,.035,.012,2.7,M.woodDark);for(const k of [-1,1]){B('porch lantern bracket',k*w*.18,2.55,-d/2-.23,.12,.15,.42,M.woodDark);B('porch lantern',k*w*.18,2.35,-d/2-.49,.26,.36,.25,M.glass);B('porch lantern cap',k*w*.18,2.55,-d/2-.49,.34,.10,.34,M.black);}for(let s of [-1,1]){B('porch support',s*w*.34,1.83,-d/2-2.4,.27,2.8,.27,M.woodDark);B('porch rail',s*w*.27,.96,-d/2-2.5,w*.23,.14,.15,M.woodLight);for(let i=0;i<5;i++)B('porch baluster',s*(w*.16+i*w*.045),.74,-d/2-2.5,.11,.50,.11,M.wood)}
 entity('house-porch-roof');
 quad('porch roof',[C(-w*.42,3.65,-d/2),C(w*.42,3.65,-d/2),C(w*.42,3.12,-d/2-3),C(-w*.42,3.12,-d/2-3)],M.roof,true);
 for(let zz=0;zz<6;zz++)L('porch roof tile',[-w*.42,3.69-zz*.09,-d/2-zz*.51],[w*.42,3.69-zz*.09,-d/2-zz*.51],.10,M.tile);
 entity(id);for(let i=0;i<3;i++){const top=[.18,.35,.53][i];B('stone entry step',0,top/2,-d/2-3.55+i*.35,2.2,top,.35,M.stoneLight);}
 entity('house-roof');B('chimney',w*.29,h+1.75,d*.26,.86,3.5,.86,M.stoneLight);for(let i=0;i<7;i++)B('chimney course',w*.29,h+.42+i*.48,d*.26,.89,.045,.89,M.stone);B('chimney cap',w*.29,h+3.55,d*.26,1.1,.20,1.1,M.woodDark);
 }else{B('doghouse name plaque',0,h*.84,-d/2-.11,.59,.24,.09,M.woodDark);for(let xx of [-.19,.19])B('paw mark',xx,h*.85,-d/2-.17,.07,.08,.035,M.woodLight)}
 entity(id);return {x,z,w,d,angle,y,C,doorW,doorRoot};
}
const home=house('house',409,137,14.5,9,5.6,-.30);
// The rendered architectural surfaces and the movement surfaces share local coordinates.
const homeLocal=(x,z)=>{const dx=x-home.x,dz=z-home.z,c=Math.cos(home.angle),s=Math.sin(home.angle);return {x:dx*c-dz*s,z:dx*s+dz*c};};
const entry={open:false,door:0,mode:'exterior',blend:0,previous:null,inside:false};
function surfaceHeight(x,z){
 const p=homeLocal(x,z),f=-home.d/2;
 if(Math.abs(p.x)<=home.w/2&&Math.abs(p.z)<=home.d/2)return home.y+.53;
 if(Math.abs(p.x)<=home.w*.385&&p.z>=f-2.85&&p.z<=f)return home.y+.53;
 if(Math.abs(p.x)<=1.1&&p.z>=f-3.725&&p.z<f-2.85){const i=Math.max(0,Math.min(2,Math.floor((p.z-f+3.725)/.35)));return home.y+[.18,.35,.53][i];}
 return onBridge(x,z)?2.96:height(x,z);
}
function homeBlocked(x,z){
 const p=homeLocal(x,z),f=-home.d/2,half=home.w/2,r=.20,wall=.22;
 // Real perimeter walls, with a front opening that only permits passage when the door is open.
 if(Math.abs(p.z)<=home.d/2+r&&Math.abs(Math.abs(p.x)-half)<wall+r)return true;
 if(Math.abs(p.x)<half+r&&Math.abs(p.z-home.d/2)<wall+r)return true;
 if(Math.abs(p.x)<half+r&&Math.abs(p.z-f)<wall+r&&(Math.abs(p.x)>home.doorW/2-r||entry.door<.88))return true;
 if(Math.abs(p.z-(f-2.50))<.22&&Math.abs(p.x)>home.w*.155&&Math.abs(p.x)<home.w*.39)return true;
 for(const k of [-1,1])if(Math.hypot(p.x-k*home.w*.34,p.z-(f-2.4))<.33)return true;
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
function flowerbed(id,u,v,n,r){
 entity(id);let p=P(u,v);const points=[],indices=[],colors=[],normals=[];
 function leaf(cx,cy,cz,a,len,width,col){const dx=Math.cos(a),dz=Math.sin(a),k=points.length/3;for(const q of [[cx,cy,cz],[cx+dx*len*.55-dz*width,cy+.10,cz+dz*len*.55+dx*width],[cx+dx*len,cy+.12,cz+dz*len],[cx+dx*len*.55+dz*width,cy+.10,cz+dz*len*.55-dx*width]]){points.push(...q);colors.push(col.r,col.g,col.b,1);normals.push(0,1,0)}indices.push(k,k+1,k+2,k,k+2,k+3)}
 const greens=['#355c26','#548236','#82a34b'].map(Color3.FromHexString),blooms=['#c93030','#e45b76','#f6bc35','#fff1ce'].map(Color3.FromHexString);
 for(let i=0;i<n;i++){
  let a=random()*Math.PI*2,rad=Math.sqrt(random())*r,x=p.x+Math.cos(a)*rad,z=p.z+Math.sin(a)*rad,y=height(x,z),h=.22+random()*.22;
  if(nearRiver(x,z).dist<nearRiver(x,z).w*.54+.3)continue;
  for(let j=0;j<5;j++)leaf(x,y+.05,z,j*1.256+a,.21+random()*.20,.065,greens[j%3]);
  for(let j=0;j<5;j++)leaf(x,y+h,z,j*1.256+a,.105+random()*.025,.045,blooms[Math.floor(i/8)%4]);
  leaf(x-.027,y+h+.018,z-.027,0,.06,.035,blooms[2]);
 }
 const mesh=new Mesh('individual garden leaves and petals',scene),gardenData=new VertexData();gardenData.positions=points;gardenData.indices=indices;gardenData.colors=colors;gardenData.normals=normals;gardenData.applyToMesh(mesh);own(mesh,foliageDetailMat,false);
}
flowerbed('front garden',449,188,110,2.7);flowerbed('well garden',616,165,72,1.8);flowerbed('house side garden',339,183,74,1.7);flowerbed('doghouse garden',265,192,35,1.2);flowerbed('residential north flowers',480,92,45,1.9);
entity('dog');const dog=P(325,183);dog.y=height(dog.x,dog.z);const dogFur=mat('dog caramel','#ba713c'),dogWhite=mat('dog ivory','#f1dcb9');sphere('dog body',dog.x,dog.y+.41,dog.z,.41,.30,.63,dogFur);sphere('dog chest',dog.x,dog.y+.48,dog.z-.38,.30,.34,.29,dogWhite);sphere('dog head',dog.x,dog.y+.78,dog.z-.50,.31,.32,.32,dogFur);sphere('dog muzzle',dog.x,dog.y+.63,dog.z-.77,.22,.16,.22,dogWhite);sphere('dog nose',dog.x,dog.y+.67,dog.z-.92,.10,.08,.09,M.black);for(let a of [-1,1]){sphere('dog ear',dog.x+a*.27,dog.y+.71,dog.z-.50,.10,.23,.13,M.woodDark);sphere('dog eye',dog.x+a*.13,dog.y+.84,dog.z-.73,.042,.046,.035,M.black);for(let b of [-1,1])sphere('dog leg',dog.x+a*.23,dog.y+.17,dog.z+b*.34,.11,.21,.12,dogWhite)}beam('dog tail',V(dog.x,dog.y+.5,dog.z+.55),V(dog.x+.1,dog.y+.91,dog.z+.79),.12,dogFur);cyl('dog bowl',dog.x+.68,dog.y+.09,dog.z-.6,.23,.16,M.red);
entity('garden border');for(let k=0;k<30;k++){const u=350+k*4.1,v=181+3*Math.sin(k*.5),p=P(u,v);p.y=height(p.x,p.z)+.07;rock('garden edging',p,.20,.13,.17,M.stoneLight)}
entity('grass details');const grassBase=MeshBuilder.CreateCylinder('grass tuft', {diameterTop:0,diameterBottom:.10,height:.36,tessellation:3},scene);grassBase.material=M.leaf2;grassBase.isPickable=false;const mats=[];for(let i=0;i<1800;i++){let u=35+random()*700,v=8+random()*310,x=X(u),z=Z(v),nr=nearRiver(x,z);if(nr.dist<nr.w/2+1.5||(u>320&&u<490&&v>96&&v<183)||pathPoints.some(p=>Math.hypot(x-p.x,z-p.z)<1.4))continue;let y=height(x,z)+.13;let matrix=Matrix.Compose(V(.7+random()*.8,.55+random()*.75,.7+random()*.8),Quaternion.RotationYawPitchRoll(random()*6.28,0,(random()-.5)*.4),V(x,y,z));mats.push(...matrix.asArray())}grassBase.thinInstanceSetBuffer('matrix',new Float32Array(mats),16,true);grassBase.receiveShadows=false;groups['grass details'].push(grassBase);
entity('farm visitor');const player=P(538,205);player.y=height(player.x,player.z);const avatar=new Mesh('visitor root',scene);avatar.position=player.clone();const bodyParts=[];for(const [n,x,y,z,w,h,d,m] of [['body',0,.97,0,.42,.63,.30,M.woodLight],['leg L',-.13,.36,0,.15,.62,.17,M.woodDark],['leg R',.13,.36,0,.15,.62,.17,M.woodDark],['arm L',-.29,.95,0,.14,.52,.16,M.plaster],['arm R',.29,.95,0,.14,.52,.16,M.plaster]]){let p=box(n,x,y,z,w,h,d,m);p.parent=avatar;bodyParts.push(p)}let head=sphere('head',0,1.5,0,.22,.25,.22,M.plaster);head.parent=avatar;let hat=cyl('straw hat',0,1.72,0,.37,.09,M.sand);hat.parent=avatar;let hatTop=cyl('hat crown',0,1.82,0,.21,.20,M.woodLight);hatTop.parent=avatar;
// Pose the actual 3D limbs around hip and shoulder pivots, driven by distance walked.
const gait={phase:0,distance:0,moving:false,stride:0};
const limbRest=bodyParts.map(m=>m.position.clone());
function walkPose(distance,dt){
 gait.distance+=distance;gait.moving=distance>0.0001;gait.phase=(gait.phase+distance*2*Math.PI/1.45)%(Math.PI*2);
 const target=Math.min(1,distance/Math.max(.001,dt)/3.5);
 gait.stride+=(target-gait.stride)*(1-Math.exp(-dt*18));if(gait.stride<.003)gait.stride=0;
 const swing=Math.sin(gait.phase)*gait.stride;
 for(let i=1;i<5;i++){
  const limb=bodyParts[i],rest=limbRest[i],isLeg=i<=2,pivot=isLeg?.29:.22,angle=swing*(isLeg?.53:.39)*(i===1||i===4?1:-1);
  limb.rotation.x=angle;limb.position.y=rest.y+pivot*(1-Math.cos(angle));limb.position.z=rest.z-pivot*Math.sin(angle);
 }
 const bob=Math.abs(Math.sin(gait.phase))*gait.stride*.045;bodyParts[0].position.y=limbRest[0].y+bob;head.position.y=1.5+bob;hat.position.y=1.72+bob;hatTop.position.y=1.82+bob;
}
let joy={x:0,z:0},keys=new Set(),follow=false;window.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.startsWith('Arrow'))e.preventDefault()});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();joy.x=joy.z=0});
let pointer=null;const pad=$('joy'),knob=$('knob');function reset(){pointer=null;joy.x=joy.z=0;knob.style.transform=''}function move(e){if(e.pointerId!==pointer)return;const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,k=Math.min(1,36/Math.max(1,Math.hypot(dx,dy)));joy.x=dx*k/36;joy.z=-dy*k/36;knob.style.transform='translate('+dx*k+'px,'+dy*k+'px)'}pad.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;pad.setPointerCapture(pointer);move(e)});pad.addEventListener('pointermove',move);for(const e of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(e,v=>{if(v.pointerId===pointer)reset()});
function onBridge(x,z){const a=ba,b=bb,dx=b.x-a.x,dz=b.z-a.z,t=((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz);return t>=0&&t<=1&&Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<1.28}
function blocked(x,z){if(x<minX+1||x>maxX-1||z<minZ+1||z>maxZ-1)return true;const nr=nearRiver(x,z);if(!onBridge(x,z)&&nr.dist<nr.w*.54+.12)return true;if(trunkColliders.some(t=>Math.hypot(x-t.x,z-t.z)<t.r+.18))return true;if(!onBridge(x,z)&&fenceColliders.some(([a,b])=>segDist(x,z,a,b)<.24))return true;if(homeBlocked(x,z))return true;const ddx=x-dogHome.x,ddz=z-dogHome.z,dc=Math.cos(dogHome.angle),ds=Math.sin(dogHome.angle);if(Math.abs(ddx*dc-ddz*ds)<dogHome.w/2+.18&&Math.abs(ddx*ds+ddz*dc)<dogHome.d/2+.18)return true;if(Math.hypot(x-well.x,z-well.z)<1.34)return true;return false}
function setHouseGroup(id,visible){for(const mesh of groups[id]||[])mesh.setEnabled(visible);}
function doorNearby(){const p=homeLocal(avatar.position.x,avatar.position.z);return Math.abs(p.x)<1.8&&Math.abs(p.z+home.d/2)<2.0;}
function toggleDoor(){
 if(!doorNearby())return false;
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2;
 if(entry.open&&Math.hypot(p.x+home.doorW/2,p.z-f)<home.doorW+.30)return false;
 entry.open=!entry.open;return true;
}
$('door-action').onclick=toggleDoor;
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='e'&&!e.repeat)toggleDoor()});
function updateEntry(dt){
 const p=homeLocal(avatar.position.x,avatar.position.z),f=-home.d/2;
 const inside=Math.abs(p.x)<home.w/2-.12&&p.z>f+.22&&p.z<home.d/2-.12;
 const porch=Math.abs(p.x)<home.w*.385+.15&&p.z>=f-2.9&&p.z<=f+.25;
 const stairs=Math.abs(p.x)<1.25&&p.z>=f-3.95&&p.z<f-2.8;
 const near=inside||porch||stairs;
 const next=inside?'interior':near?'entrada':'exterior';
 if(near&&!entry.previous)entry.previous={alpha:camera.alpha,beta:camera.beta,span,target:camera.target.clone(),follow};
 if(next!==entry.mode){entry.mode=next;setHouseGroup('house-porch-roof',!near);setHouseGroup('house-roof',!inside);setHouseGroup('house-front',!inside);shadowMap.resetRefreshCounter();}
 entry.inside=inside;
 const targetDoor=entry.open?1:0;entry.door+=(targetDoor-entry.door)*(1-Math.exp(-dt*7));if(Math.abs(targetDoor-entry.door)<.002)entry.door=targetDoor;
 home.doorRoot.rotation.y=home.angle-entry.door*Math.PI*.49;
 const doorButton=$('door-action'),nearDoor=doorNearby();doorButton.hidden=!nearDoor;doorButton.textContent=entry.open?'Fechar porta':'Abrir porta';
 $('entry-status').textContent=inside?'Interior':near?'Entrada da casa':'';
 const factor=1-Math.exp(-dt*4);
 if(entry.previous){
  const saved=entry.previous;
  entry.blend+=( (near?1:0)-entry.blend)*factor;
  const aim=near?(inside?avatar.position.add(V(0,1,0)):home.C(0,1.65,f-1.25)):(saved.follow?avatar.position.add(V(0,1,0)):saved.target);
  const desiredAlpha=near?-Math.PI/2-home.angle:saved.alpha;
  const da=Math.atan2(Math.sin(desiredAlpha-camera.alpha),Math.cos(desiredAlpha-camera.alpha));
  camera.alpha+=da*factor;
  const beta=camera.beta+((near?(inside?CAMERA_BETA:65*Math.PI/180):saved.beta)-camera.beta)*factor;
  span+=((near?(inside?24:30):saved.span)-span)*factor;
  retarget(Vector3.Lerp(camera.target,aim,factor),beta);fit();
  if(!near&&entry.blend<.004){camera.alpha=saved.alpha;span=saved.span;retarget(aim,saved.beta);fit();entry.previous=null;entry.blend=0;follow=saved.follow;}
 }else if(follow)retarget(Vector3.Lerp(camera.target,avatar.position.add(V(0,1,0)),1-Math.exp(-dt*9)));
}
function manualView(next){if(entry.previous){entry.previous={alpha:camera.alpha,beta:CAMERA_BETA,span,target:camera.target.clone(),follow};}next();}
$('wide').onclick=()=>{span=94;follow=false;retarget(V(-2,2.7,0));fit();if(entry.previous){entry.previous.span=span;entry.previous.follow=false;entry.previous.target=camera.target.clone();}};
$('close').onclick=()=>{span=66;follow=false;retarget(V(0,3.5,0));fit();if(entry.previous){entry.previous.span=span;entry.previous.follow=false;entry.previous.target=camera.target.clone();}};
$('follow').onclick=()=>{follow=true;span=27;retarget(avatar.position.add(V(0,1,0)));fit();if(entry.previous){entry.previous.span=span;entry.previous.follow=true;}};
$('rotate').onclick=()=>{orbit=(orbit+1)%4;camera.alpha=-Math.PI/2+orbit*Math.PI/2;if(entry.previous)entry.previous.alpha=camera.alpha;};
function moveAvatar(dx,dz,dt){
 const oldX=avatar.position.x,oldZ=avatar.position.z;
 // A raised deck can be reached only via the stairs; prevent jumping through its edge.
 const can=(x,z)=>!blocked(x,z)&&Math.abs(surfaceHeight(x,z)-surfaceHeight(avatar.position.x,avatar.position.z))<=.34;
 if(can(oldX+dx,oldZ))avatar.position.x+=dx;
 if(can(avatar.position.x,oldZ+dz))avatar.position.z+=dz;
 const mx=avatar.position.x-oldX,mz=avatar.position.z-oldZ,travel=Math.hypot(mx,mz);
 avatar.position.y=surfaceHeight(avatar.position.x,avatar.position.z);
 if(travel>.0001)avatar.rotation.y=Math.atan2(mx,mz);walkPose(travel,dt);return travel;
}
let t=0,frames=0;const shadowMap=shadow.getShadowMap();const shadowCache={refreshes:0,lastSignature:null};shadowMap.refreshRate=0;scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(.05,engine.getDeltaTime()/1000);t+=dt;waterTex.vOffset=-(t*.035)%1;fallTex.vOffset=-(t*.27)%1;for(let i=0;i<waterMotion.length;i++){const f=waterMotion[i],p=Vector3.Lerp(f.a,f.b,(f.phase+t*f.speed)%1).add(f.side);p.y+=.035;Matrix.Compose(f.scale,f.rotation,p).copyToArray(flowMatrices,i*16);}if(flowBatch)flowBatch.thinInstanceBufferUpdated('matrix');let x=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=joy.z+(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);let len=Math.hypot(x,z);if(len>1){x/=len;z/=len}const a=camera.alpha+Math.PI/2,dx=(x*Math.cos(a)-z*Math.sin(a))*dt*5,dz=(x*Math.sin(a)+z*Math.cos(a))*dt*5;moveAvatar(dx,dz,dt);updateEntry(dt);
 const sig=[Math.round(avatar.position.x*4),Math.round(avatar.position.z*4),Math.round(avatar.rotation.y*4),Math.round(gait.stride*Math.sin(gait.phase)*4),Math.round(camera.alpha*100),Math.round(camera.beta*100),Math.round(entry.door*20),entry.mode,Math.round(camera.target.x*2),Math.round(camera.target.z*2),span].join('|');if(sig!==shadowCache.lastSignature){shadowCache.lastSignature=sig;shadowMap.resetRefreshCounter();shadowCache.refreshes++;}frames++});
// Measure elapsed real time between completed render callbacks, not the engine's startup estimate.
const perf={fps:null,p95Ms:null,frames:0,last:null,windowStart:null,samples:[]};
scene.onAfterRenderObservable.add(()=>{const now=performance.now();if(perf.last!==null)perf.samples.push(now-perf.last);perf.last=now;if(perf.windowStart===null)perf.windowStart=now;const elapsed=now-perf.windowStart;if(elapsed>=4000&&perf.samples.length>=2){const a=perf.samples.slice().sort((x,y)=>x-y);perf.frames=perf.samples.length;perf.fps=1000*perf.frames/Math.max(1,a.reduce((x,y)=>x+y,0));perf.p95Ms=a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];$('fps').textContent=perf.fps.toFixed(1)+' FPS';$('metrics').textContent='P95 '+perf.p95Ms.toFixed(1)+' ms · '+engine.getRenderWidth()+'×'+engine.getRenderHeight()+' · '+perf.frames+' quadros';perf.samples=[];perf.windowStart=now;}});
function resetPerf(){perf.samples=[];perf.last=null;perf.windowStart=null;perf.fps=null;perf.p95Ms=null;perf.frames=0;$('fps').textContent='Medindo…';$('metrics').textContent='Nova janela de medição';}
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
 if(['terrain','grass details','farm visitor'].includes(id))continue;
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
window.cvQA={scene,engine,qualityProfiles,selectQuality,get quality(){return quality},groups,componentCounts,batching,ground,avatar,blocked,onBridge,nearRiver,layout,riverMotionMetrics,perf,shadowCache,treePositions,fenceColliders,flowInstancing,roadMetrics,canopyStats,bankStats,gait,bodyParts,entry,homeLocal,surfaceHeight,homeBlocked,moveAvatar,updateEntry,bridgeEnds:[ba.asArray(),bb.asArray()],home,dogHome,well:well.asArray(),ready:false};engine.runRenderLoop(()=>scene.render());scene.executeWhenReady(()=>{$('loading').remove();window.cvQA.ready=true});
