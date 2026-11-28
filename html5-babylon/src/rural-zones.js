export const ZONES=Object.freeze([
{id:'horse',name:'Estábulo equino',icon:'🐎',species:null,x:-72,z:7,hx:8,hz:7,cost:[8,4],capacity:1},
{id:'barn',name:'Celeiro central',icon:'🏚',species:null,x:-72,z:-15,hx:8,hz:7,cost:[12,6],capacity:0},
{id:'chicken',name:'Galinheiro',icon:'🐔',species:'chicken',x:-72,z:-38,hx:8,hz:8,cost:[6,3],capacity:6},
{id:'cow',name:'Pastagem bovina',icon:'🐄',species:'cow',x:-72,z:-64,hx:10,hz:10,cost:[10,5],capacity:4},
{id:'pig',name:'Chiqueiro',icon:'🐖',species:'pig',x:-72,z:-94,hx:8,hz:9,cost:[8,4],capacity:4},
{id:'duck',name:'Viveiro de patos',icon:'🦆',species:'duck',x:-72,z:-119,hx:8,hz:8,cost:[7,4],capacity:6},
{id:'sheep',name:'Campos das ovelhas',icon:'🐑',species:'sheep',x:-72,z:-158,hx:12,hz:17,cost:[10,5],capacity:6}]);
export const zoneById=id=>ZONES.find(z=>z.id===id);
export const zoneAt=(x,z)=>ZONES.find(q=>Math.abs(x-q.x)<=q.hx&&Math.abs(z-q.z)<=q.hz)||null;
export const stageOf=(s,id)=>s?.[id]?.stage??0;
export function validInstallations(s){return !!s&&typeof s==='object'&&!Array.isArray(s)&&Object.entries(s).every(([id,v])=>zoneById(id)&&v&&Number.isInteger(v.stage)&&v.stage>=1&&v.stage<=3);}
export const ready=(s,id)=>stageOf(s,id)===3;
export const stageCost=(id,stage)=>{const z=zoneById(id);return !z||stage<0||stage>=3?null:[stage===0?Math.ceil(z.cost[0]/3):stage===1?Math.floor(z.cost[0]/3):z.cost[0]-Math.ceil(z.cost[0]/3)-Math.floor(z.cost[0]/3),stage===0?Math.ceil(z.cost[1]/3):stage===1?Math.floor(z.cost[1]/3):z.cost[1]-Math.ceil(z.cost[1]/3)-Math.floor(z.cost[1]/3)];};
export function advanceInstallation(s,id){const before=s.installations??{},stage=stageOf(before,id),cost=stageCost(id,stage);if(!validInstallations(before)||!cost||!Number.isSafeInteger(s.nature?.wood)||!Number.isSafeInteger(s.nature?.stone)||s.nature.wood<cost[0]||s.nature.stone<cost[1])return null;const n=JSON.parse(JSON.stringify(s));n.nature.wood-=cost[0];n.nature.stone-=cost[1];n.installations={...before,[id]:{stage:stage+1}};return n;}
export function canHouse(s,id,species,animals=[]){const zone=zoneById(id);return !!zone&&zone.species===species&&ready(s,id)&&animals.filter(a=>a.species===species).length<zone.capacity;}

export const MAX_EXTRA_PENS=5;
export const prebuiltInstallations=s=>({...s,...Object.fromEntries(ZONES.map(z=>[z.id,{...s?.[z.id],stage:3}]))});
export function validExtraPens(pens){return Array.isArray(pens)&&pens.length<=MAX_EXTRA_PENS&&new Set(pens.map(p=>p?.id)).size===pens.length&&pens.every((p,i)=>p&&p.id==='extra-'+(i+1)&&ZONES.some(z=>z.species===p.species)&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<10000&&Math.abs(p.z)<10000);}
export function extraPenSpec(p){const base=ZONES.find(z=>z.species===p.species);return base?{...base,id:p.id,x:p.x,z:p.z,hx:5,hz:5,capacity:3,extra:true,name:base.name+' adicional'}:null;}
export function addExtraPen(s,species,x,z){const pens=s.extraPens??[],base=ZONES.find(z=>z.species===species);if(!validExtraPens(pens)||pens.length>=MAX_EXTRA_PENS||!base||!Number.isFinite(x)||!Number.isFinite(z)||!Number.isSafeInteger(s.nature?.wood)||!Number.isSafeInteger(s.nature?.stone)||s.nature.wood<base.cost[0]||s.nature.stone<base.cost[1])return null;const p={id:'extra-'+(pens.length+1),species,x,z};if(pens.some(q=>Math.abs(x-q.x)<12&&Math.abs(z-q.z)<12)||ZONES.some(q=>Math.abs(x-q.x)<q.hx+7&&Math.abs(z-q.z)<q.hz+7))return null;const next={...s,nature:{...s.nature,wood:s.nature.wood-base.cost[0],stone:s.nature.stone-base.cost[1]},extraPens:[...pens,p]};return validExtraPens(next.extraPens)?next:null;}
export const animalPenId=a=>a.penId??a.species;
