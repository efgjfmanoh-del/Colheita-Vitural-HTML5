import assert from 'node:assert/strict';import {inventorySnapshot} from './src/inventory.js';
const farm={seeds:23,grain:4,stocks:{corn:{seeds:11,grain:2},rice:{seeds:12,grain:0},strawberry:{seeds:12,grain:0}},compost:22,treatments:24},build={stock:12};
const initial=JSON.stringify({farm,build}),items=inventorySnapshot(farm,build),get=(list,id)=>list.find(x=>x.id===id).count;
assert.equal(items.length,27);assert.equal(new Set(items.map(x=>x.id)).size,27);assert.equal(get(items,'seed:wheat'),23);assert.equal(get(items,'harvest:wheat'),4);assert.equal(get(items,'seed:corn'),11);assert.equal(get(items,'fence'),12);
assert.equal(JSON.stringify({farm,build}),initial);
farm.seeds--;farm.grain+=3;build.stock--;assert.equal(get(inventorySnapshot(farm,build),'seed:wheat'),22);assert.equal(get(inventorySnapshot(farm,build),'harvest:wheat'),7);assert.equal(get(inventorySnapshot(farm,build),'fence'),11);
assert.equal(get(inventorySnapshot(farm,build,{farmLocked:true}),'seed:wheat'),null);assert.equal(get(inventorySnapshot(farm,build,{constructionLocked:true}),'fence'),null);assert.equal(get(inventorySnapshot({},{}),'seed:wheat'),null);
assert.equal(get(inventorySnapshot({...farm,seeds:-1},build),'seed:wheat'),null);console.log('PASS inventory source-of-truth, live balances, invalid state, no mutation');
