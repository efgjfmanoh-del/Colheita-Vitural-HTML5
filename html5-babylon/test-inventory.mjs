import assert from 'node:assert/strict';import {inventorySnapshot,TOOL_CATALOG,EQUIPMENT_KEY,equippedTool,equipTool} from './src/inventory.js';
const farm={seeds:23,grain:4,stocks:{corn:{seeds:11,grain:2},rice:{seeds:12,grain:0},strawberry:{seeds:12,grain:0}},compost:22,treatments:24},build={stock:12};
const initial=JSON.stringify({farm,build}),items=inventorySnapshot(farm,build),get=(list,id)=>list.find(x=>x.id===id).count;
assert.equal(items.length,37);assert.equal(new Set(items.map(x=>x.id)).size,37);assert.equal(get(items,'seed:wheat'),23);assert.equal(get(items,'harvest:wheat'),4);assert.equal(get(items,'seed:corn'),11);assert.equal(get(items,'fence'),12);
assert.equal(JSON.stringify({farm,build}),initial);
farm.seeds--;farm.grain+=3;build.stock--;assert.equal(get(inventorySnapshot(farm,build),'seed:wheat'),22);assert.equal(get(inventorySnapshot(farm,build),'harvest:wheat'),7);assert.equal(get(inventorySnapshot(farm,build),'fence'),11);
assert.equal(get(inventorySnapshot(farm,build,{farmLocked:true}),'seed:wheat'),null);assert.equal(get(inventorySnapshot(farm,build,{constructionLocked:true}),'fence'),null);assert.equal(get(inventorySnapshot({},{}),'seed:wheat'),null);
assert.equal(get(inventorySnapshot({...farm,seeds:-1},build),'seed:wheat'),null);console.log('PASS inventory source-of-truth, live balances, invalid state, no mutation');

const store=new Map(),adapter={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};assert.equal(equippedTool(adapter),'hoe');assert(equipTool(adapter,'hammer'));assert.equal(store.get(EQUIPMENT_KEY),'hammer');assert.equal(equippedTool(adapter),'hammer');assert(!equipTool(adapter,'invalid'));assert.equal(equippedTool(adapter),'hammer');assert(!equipTool({setItem(){throw Error('full')}},'water'));assert.equal(Object.keys(TOOL_CATALOG).length,6);console.log('PASS persistent tool equipment without resource grants');

const expanded=inventorySnapshot({...farm,orchard:{seeds:{mango:2,coconut:1},fruit:{guava:3,acerola:4}},household:{goods:{coconutMilk:1}}},build);assert.equal(get(expanded,'fruitseed:mango'),2);assert.equal(expanded.find(x=>x.id==='fruitseed:coconut').fruitSpecies,'coconut');assert.equal(get(expanded,'fruit:guava'),3);assert.equal(get(expanded,'fruit:acerola'),4);assert.equal(get(expanded,'good:coconutMilk'),1);
