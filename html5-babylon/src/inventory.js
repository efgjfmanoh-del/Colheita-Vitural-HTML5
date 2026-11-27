import {GOODS} from './household.js';
import {PRODUCTS} from './husbandry.js';
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
 for(const [id,name,icon] of [['wood','Madeira','🪵'],['stone','Pedra','🪨'],['saplings','Muda de árvore verde','🌱'],['pinkSaplings','Muda de cerejeira','🌸']]){add('resource:'+id,id.endsWith('aplings')?'seeds':'building',name,icon,farm?.nature?.[id]??0,'nature',null,farmLocked);if(id.endsWith('aplings'))items.at(-1).treeSpecies=id==='pinkSaplings'?'pink':'green';}
 add('fish','harvest','Peixe de rio','🐟',farm?.fishery?.fish??0,'fishing',null,farmLocked);
 for(const [id,p] of Object.entries(PRODUCTS))add('animal:'+id,'harvest',p.name,p.icon,farm?.husbandry?.products?.[id]??0,'livestock',null,farmLocked);
 for(const [id,g] of Object.entries(GOODS))if(Object.hasOwn(farm?.household?.goods??{},id))add('good:'+id,'harvest',g.name,g.icon,farm.household.goods[id],'household',null,farmLocked);
 add('fence','building','Peça de cerca','🪵',construction?.stock,'construction',null,constructionLocked);
 return items;
}

// Existing functional tools are capabilities, not consumable stock.
export const TOOL_CATALOG=Object.freeze({hammer:Object.freeze({name:'Martelo',icon:'🔨',use:'Construção e manutenção'}),hoe:Object.freeze({name:'Enxada',icon:'⛏',use:'Preparar e manejar canteiros'}),water:Object.freeze({name:'Regador',icon:'💧',use:'Regar a cultura selecionada'}),axe:Object.freeze({name:'Machado',icon:'🪓',use:'Cortar árvores na interação de proximidade'}),pickaxe:Object.freeze({name:'Picareta',icon:'⛏',use:'Extrair pedra na interação de proximidade'}),rod:Object.freeze({name:'Vara de pesca',icon:'🎣',use:'Pescar em pontos da margem'})});
export const EQUIPMENT_KEY='cv.equipment.v1';
export function equippedTool(storage){try{const id=storage.getItem(EQUIPMENT_KEY);return Object.hasOwn(TOOL_CATALOG,id)?id:'hoe';}catch{return 'hoe';}}
export function equipTool(storage,id){if(!Object.hasOwn(TOOL_CATALOG,id))return false;try{storage.setItem(EQUIPMENT_KEY,id);return true;}catch{return false;}}
