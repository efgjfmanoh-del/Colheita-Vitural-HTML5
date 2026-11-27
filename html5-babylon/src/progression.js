// Progression is part of the authoritative agricultural save, not a parallel currency ledger.
export const SKILLS=Object.freeze({cultivo:'Cultivo',manejo:'Manejo animal',floresta:'Floresta',pesca:'Pesca',construcao:'Construção',comercio:'Comércio',mineracao:'Mineração'});
export const ACTIVE_SKILLS=['cultivo','manejo','construcao','comercio','floresta','mineracao','pesca'];
export const EVENTS={till:['cultivo',3,'Preparar canteiros'],plant:['cultivo',4,'Plantar sementes'],water:['cultivo',2,'Regar plantações'],harvest:['cultivo',12,'Colher produtos'],weed:['cultivo',4,'Capinar canteiros'],build:['construcao',8,'Construir cercas'],paint:['construcao',3,'Pintar cercas'],care:['manejo',7,'Cuidar dos pets'],sell:['comercio',4,'Vender produtos'],chop:['floresta',12,'Cortar árvores'],mine:['mineracao',12,'Extrair pedra'],fish:['pesca',10,'Pescar'],animalcollect:['manejo',10,'Recolher produção animal']};
export const LAND=[
{id:'pomar',name:'Pomar do Leste',price:300,level:2,rect:[100,920,315,1030]},
{id:'pastagem',name:'Pastagem Alta',price:650,level:3,rect:[355,920,570,1030]},
{id:'varzea',name:'Várzea',price:950,level:5,rect:[100,1065,315,1175]},
{id:'bosque',name:'Bosque das Araucárias',price:1400,level:6,rect:[355,1065,570,1175]},
{id:'campos',name:'Campos do Sul',price:1800,level:7,rect:[100,1210,315,1320]},
{id:'serra',name:'Serra dos Pastos',price:2300,level:8,rect:[355,1210,570,1320]}];
export const PERKS=[
{id:'solo',skill:'cultivo',level:2,name:'Solo fértil',description:'Adubo recupera mais 8% de fertilidade.'},
{id:'colheita',skill:'cultivo',level:4,requires:'solo',name:'Colheita cuidadosa',description:'+1 produto por colheita.'},
{id:'afinidade',skill:'manejo',level:2,name:'Companheiro rural',description:'Carinho e brincadeiras geram 20% mais afinidade.'},
{id:'negocio',skill:'comercio',level:2,name:'Bom negociante',description:'+5% no preço de venda (arredondado para baixo).'},
{id:'oficio',skill:'construcao',level:2,name:'Ofício de carpinteiro',description:'+20% XP de construção; tinta e obras continuam consumindo os recursos normais.'}];
const count=n=>Number.isSafeInteger(n)&&n>=0;
const safe=(n,d=0)=>count(n)?n:d;
export const freshProgress=()=>({schema:1,xp:0,skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0])),perks:[],land:[],reputation:0,stats:{},species:[],missions:{},markers:[],seen:{},lastReal:0,history:[]});
export function validProgress(p){
 return p?.schema===1&&count(p.xp)&&count(p.reputation)&&count(p.lastReal)&&Object.keys(SKILLS).every(k=>count(p.skills?.[k]))&&Array.isArray(p.perks)&&p.perks.every(id=>PERKS.some(x=>x.id===id))&&new Set(p.perks).size===p.perks.length&&Array.isArray(p.land)&&p.land.every(id=>LAND.some(x=>x.id===id))&&new Set(p.land).size===p.land.length&&p.stats&&Object.values(p.stats).every(count)&&Array.isArray(p.species)&&p.species.every(x=>typeof x==='string')&&p.seen&&Object.values(p.seen).every(count)&&p.missions&&Object.values(p.missions).every(m=>m&&['daily','weekly','monthly'].includes(m.cycle)&&Object.hasOwn(EVENTS,m.event)&&count(m.target)&&m.target>0&&count(m.done)&&m.done<=m.target&&count(m.reward)&&count(m.end)&&typeof m.claimed==='boolean')&&Array.isArray(p.markers)&&p.markers.length<=20&&p.markers.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)&&typeof m.name==='string'&&m.name.length<=32)&&Array.isArray(p.history);
}
export const threshold=l=>100*(l-1)*l/2;
 // Level 2 at 100 XP, level 3 at 300 XP; use exact inverse.
export function rank(xp){const l=Math.min(10000,Math.floor((1+Math.sqrt(1+Math.max(0,xp)*.08))/2));return Math.max(1,l);}
export const title=l=>l>=50?'Lenda do campo':l>=30?'Mestre rural':l>=20?'Fazendeiro':l>=10?'Produtor rural':l>=5?'Agricultor':'Iniciante rural';
export const points=p=>Math.max(0,Math.floor(rank(p.xp)/2)-p.perks.length);
export const reputationTitle=n=>n>=1000?'Excelência rural':n>=500?'Referência regional':n>=200?'Produtor confiável':n>=50?'Produtor local':'Desconhecido';
export const hasPerk=(p,id)=>!!p?.perks?.includes(id);
const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export function periods(now){
 const d=new Date(now),day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),week=new Date(day);week.setDate(day.getDate()-((day.getDay()+6)%7));const month=new Date(d.getFullYear(),d.getMonth(),1);
 const de=new Date(day);de.setDate(day.getDate()+1);const we=new Date(week);we.setDate(week.getDate()+7);const me=new Date(d.getFullYear(),d.getMonth()+1,1);
 return [{cycle:'daily',start:day,end:+de},{cycle:'weekly',start:week,end:+we},{cycle:'monthly',start:month,end:+me}];
}
const hash=s=>Array.from(s).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
const POOL=['till','plant','water','harvest','weed','build','paint','care','sell'];
const baseTarget={till:1,plant:4,water:3,harvest:3,weed:2,build:2,paint:2,care:2,sell:4};
export function offers(p,now=Date.now()){
 now=Math.max(now,p.lastReal);return periods(now).flatMap(({cycle,start,end})=>{
 const key=dateKey(start),mult=cycle==='daily'?1:cycle==='weekly'?3:8,seed=hash(cycle+key),pool=POOL.slice();
 // rotate deterministic objectives, not a fixed lifetime list; all actions exist today.
 return Array.from({length:3},(_,i)=>{const event=pool.splice((seed+i*7)%pool.length,1)[0],id=cycle+':'+key+':'+i;return {id,cycle,event,target:baseTarget[event]*mult,done:0,reward:25*mult+i*5,end,claimed:false};});
 });
}
export function expire(p,now){p.lastReal=Math.max(p.lastReal,now);for(const [id,m] of Object.entries(p.missions))if(m.end<=p.lastReal&&(m.done<m.target||m.claimed))delete p.missions[id];for(const [k,v] of Object.entries(p.seen))if(v<p.lastReal-32*86400000)delete p.seen[k];}
export function accept(p,id,now=Date.now()){expire(p,now);if(p.missions[id])return false;const m=offers(p,now).find(x=>x.id===id);if(!m||Object.keys(p.missions).length>=45)return false;p.missions[id]=m;return true;}
export function record(p,event,{now=Date.now(),units=1,key='',species='',value=0,quality=''}={}){
 if(!EVENTS[event]||!count(units)||units===0)return false;expire(p,now);const day=dateKey(new Date(p.lastReal)),dedup=key?event+':'+day+':'+key:'';
 if(dedup&&Object.hasOwn(p.seen,dedup))return false;if(dedup)p.seen[dedup]=p.lastReal;
 const [skill,amount]=EVENTS[event],gain=Math.min(1000,Math.ceil(amount*(event==='sell'?Math.min(units,20):1)*(event==='build'&&hasPerk(p,'oficio')?1.2:1)));
 if(!count(p.xp+gain)||!count(p.skills[skill]+gain))return false;
 const prior=rank(p.xp);p.xp+=gain;p.skills[skill]+=gain;p.stats[event]=safe(p.stats[event])+units;
 if(event==='harvest'&&species&&!p.species.includes(species))p.species.push(species);
 if(event==='sell'){p.stats.revenue=safe(p.stats.revenue)+safe(value);p.reputation+=Math.min(units,100);}
 if(event==='harvest'&&quality==='Especial')p.reputation+=1;
 if(event==='care')p.reputation+=1;
 for(const m of Object.values(p.missions))if(!m.claimed&&m.event===event&&m.end>p.lastReal)m.done=Math.min(m.target,m.done+units);
 if(rank(p.xp)>prior){p.history.push({at:p.lastReal,text:'Nível '+rank(p.xp)+' · '+title(rank(p.xp))});p.history=p.history.slice(-40);}
 return true;
}
export function claim(state,id,now=Date.now()){const p=state.progress;expire(p,now);const m=p.missions[id];if(!m||m.claimed||m.done<m.target||!count(state.coins+m.reward))return false;state.coins+=m.reward;m.claimed=true;p.reputation+=5;p.history.push({at:p.lastReal,text:'Missão concluída · '+EVENTS[m.event][2]});p.history=p.history.slice(-40);return true;}
export function unlock(p,id){const a=PERKS.find(x=>x.id===id);if(!a||hasPerk(p,id)||points(p)<1||rank(p.skills[a.skill])<a.level||a.requires&&!hasPerk(p,a.requires))return false;p.perks.push(id);return true;}
export function buyLand(state,id){const p=state.progress,a=LAND.find(x=>x.id===id);if(!a||p.land.includes(id)||rank(p.xp)<a.level||!count(state.coins)||state.coins<a.price)return false;state.coins-=a.price;p.land.push(id);p.history.push({at:Math.max(Date.now(),p.lastReal),text:'Terreno adquirido · '+a.name});p.history=p.history.slice(-40);return true;}
export function achievements(p){return [['Primeira colheita',safe(p.stats.harvest)>=1],['Cultivador diversificado',p.species.length>=5],['Cem produtos colhidos',safe(p.stats.harvest)>=100],['Primeira venda',safe(p.stats.sell)>=1],['Primeiro terreno adquirido',p.land.length>=1],['Amigo dos pets',safe(p.stats.care)>=10],['Construtor rural',safe(p.stats.build)>=10],['Produtor reconhecido',p.reputation>=200]];}
