import assert from 'node:assert/strict';import {PRICES,quoteTrade,tradeFarm,commitTrade,INITIAL_COINS} from './src/economy.js';
const state={coins:INITIAL_COINS,seeds:24,grain:4,stocks:{corn:{seeds:12,grain:0},rice:{seeds:12,grain:0},strawberry:{seeds:12,grain:0}},plots:{a:{state:'watered'}},compost:24,quality:{Boa:4}};
const original=JSON.stringify(state);
let saved;const buy=commitTrade(state,'wheat','buy',2,v=>saved=v);assert(buy.ok);assert.equal(buy.next.coins,480);assert.equal(buy.next.seeds,26);assert.equal(JSON.parse(saved).coins,480);assert.deepEqual(buy.next.plots,state.plots);
const sell=commitTrade(buy.next,'wheat','sell',3,v=>saved=v);assert(sell.ok);assert.equal(sell.next.coins,555);assert.equal(sell.next.grain,1);assert.deepEqual(JSON.parse(saved),sell.next);
assert.equal(JSON.stringify(state),original);assert(!quoteTrade(sell.next,'wheat','sell',2).ok);assert(!quoteTrade(state,'corn','buy',999).ok);assert(!quoteTrade(state,'wheat','buy',-1).ok);assert(!quoteTrade(state,'__proto__','buy',1).ok);assert(!quoteTrade(state,'wheat','buy',1.5).ok);assert(!quoteTrade({...state,coins:NaN},'wheat','buy',1).ok);
assert(!commitTrade(state,'wheat','buy',1,()=>{throw Error('quota');}).ok);assert.equal(JSON.stringify(state),original);
const other=tradeFarm(state,'corn','buy',1);assert(other.ok);assert.equal(other.next.stocks.corn.seeds,13);assert.equal(other.next.seeds,24);assert.equal(other.next.coins,485);
assert(!tradeFarm({...state,coins:Number.MAX_SAFE_INTEGER},'wheat','sell',1).ok);console.log('PASS atomic farm commerce, prices, insufficient resources, rollback on write failure, no mutation');

import {CROP_CALENDAR,cropSchedule} from './src/world-calendar.js';import {newSoil,prepareSpecies,simulatePlot,harvestInfo} from './src/farm-simulation.js';
const expanded={...state,stocks:{...Object.fromEntries(Object.keys(CROP_CALENDAR).filter(x=>x!=='wheat').map(x=>[x,{seeds:0,grain:0}])),...state.stocks}};
assert.equal(Object.keys(CROP_CALENDAR).length,12);const lettuce=tradeFarm(expanded,'lettuce','buy',2);assert(lettuce.ok&&lettuce.next.stocks.lettuce.seeds===2&&lettuce.next.coins===490);for(const [id,c] of Object.entries(CROP_CALENDAR)){assert(PRICES[id].buy>0&&PRICES[id].sell>0);for(let month=1;month<=12;month++)assert(cropSchedule(id,month).realMs<=3600000);const p=prepareSpecies({state:'tilled',soil:newSoil(0)},id,0),watered={...p,state:'watered',soil:{...p.soil,moisture:c.moisture}};const ripe=simulatePlot(watered,7200000,()=>({kind:'sun',temperature:c.temperature,rain:false}));assert(ripe.soil.progress>=1&&harvestInfo(ripe).units>=1);}
console.log('PASS expanded crop calendar, market prices and all growth cycles');

import {quoteSupply,commitSupply} from './src/economy.js';
const supplyState={...state,treatments:3},supplyOriginal=JSON.stringify(supplyState);const fertilizer=commitSupply(supplyState,'compost',2,v=>saved=v);assert(fertilizer.ok&&fertilizer.next.coins===484&&fertilizer.next.compost===26);assert.deepEqual(JSON.parse(saved),fertilizer.next);assert.equal(JSON.stringify(supplyState),supplyOriginal);assert(!quoteSupply(supplyState,'compost',999).ok);assert(!quoteSupply(supplyState,'__proto__',1).ok);assert(!commitSupply(supplyState,'treatments',1,()=>{throw Error('quota')}).ok);assert.equal(JSON.stringify(supplyState),supplyOriginal);console.log('PASS agricultural supply replenishment and atomic debit');
