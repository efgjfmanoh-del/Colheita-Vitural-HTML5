import assert from 'node:assert/strict';import {PRICES,quoteTrade,tradeFarm,commitTrade,INITIAL_COINS} from './src/economy.js';
const state={coins:INITIAL_COINS,seeds:24,grain:4,stocks:{corn:{seeds:12,grain:0},rice:{seeds:12,grain:0},strawberry:{seeds:12,grain:0}},plots:{a:{state:'watered'}},compost:24,quality:{Boa:4}};
const original=JSON.stringify(state);
let saved;const buy=commitTrade(state,'wheat','buy',2,v=>saved=v);assert(buy.ok);assert.equal(buy.next.coins,480);assert.equal(buy.next.seeds,26);assert.equal(JSON.parse(saved).coins,480);assert.deepEqual(buy.next.plots,state.plots);
const sell=commitTrade(buy.next,'wheat','sell',3,v=>saved=v);assert(sell.ok);assert.equal(sell.next.coins,555);assert.equal(sell.next.grain,1);assert.deepEqual(JSON.parse(saved),sell.next);
assert.equal(JSON.stringify(state),original);assert(!quoteTrade(sell.next,'wheat','sell',2).ok);assert(!quoteTrade(state,'corn','buy',999).ok);assert(!quoteTrade(state,'wheat','buy',-1).ok);assert(!quoteTrade(state,'__proto__','buy',1).ok);assert(!quoteTrade(state,'wheat','buy',1.5).ok);assert(!quoteTrade({...state,coins:NaN},'wheat','buy',1).ok);
assert(!commitTrade(state,'wheat','buy',1,()=>{throw Error('quota');}).ok);assert.equal(JSON.stringify(state),original);
const other=tradeFarm(state,'corn','buy',1);assert(other.ok);assert.equal(other.next.stocks.corn.seeds,13);assert.equal(other.next.seeds,24);assert.equal(other.next.coins,485);
assert(!tradeFarm({...state,coins:Number.MAX_SAFE_INTEGER},'wheat','sell',1).ok);console.log('PASS atomic farm commerce, prices, insufficient resources, rollback on write failure, no mutation');
