import {CROP_CALENDAR} from './world-calendar.js';
// Read-through catalog: existing subsystem saves remain the sole source of truth.
// No duplicated balance, grants, deductions or destructive migration.
export const cropIcons=Object.freeze({"wheat":"🌾","corn":"🌽","rice":"🌱","strawberry":"🍓","lettuce":"🥬","carrot":"🥕","pea":"🫛","basil":"🌿","tomato":"🍅","broccoli":"🥦","sunflower":"🌻","turnip":"🌱"});
const validCount=n=>Number.isSafeInteger(n)&&n>=0;
export function inventorySnapshot(farm,construction,{farmLocked=false,constructionLocked=false}={}){
 const items=[];
 function add(id,category,name,icon,count,source,crop=null,locked=false){
  items.push({id,category,name,icon,count:!locked&&validCount(count)?count:null,source,crop});
 }
 for(const [id,crop] of Object.entries(CROP_CALENDAR)){
  const stock=id==='wheat'?{seeds:farm?.seeds,grain:farm?.grain}:farm?.stocks?.[id];
  add('seed:'+id,'seeds','Sementes · '+crop.name,cropIcons[id]||'🌱',stock?.seeds,'agriculture',id,farmLocked);
  add('harvest:'+id,'harvest',crop.name,cropIcons[id]||'🌱',stock?.grain,'agriculture',null,farmLocked);
 }
 add('compost','supplies','Adubo orgânico','🌿',farm?.compost,'agriculture',null,farmLocked);
 add('treatment','supplies','Tratamento de pragas','🛡',farm?.treatments,'agriculture',null,farmLocked);
 add('fence','building','Peça de cerca','🪵',construction?.stock,'construction',null,constructionLocked);
 return items;
}
