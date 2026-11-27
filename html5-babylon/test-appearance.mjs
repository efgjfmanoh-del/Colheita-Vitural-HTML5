import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_APPEARANCE,PALETTES,validAppearance,withAppearance} from './src/appearance.js';
test('default and every catalogue combination are serializable',()=>{assert(validAppearance(DEFAULT_APPEARANCE));for(const [k,v] of Object.entries(PALETTES))for(const id of Object.keys(v))assert(validAppearance(JSON.parse(JSON.stringify(withAppearance(DEFAULT_APPEARANCE,k,id)))));});
test('reject malformed or unknown values without mutation',()=>{assert.equal(withAppearance(DEFAULT_APPEARANCE,'skin','__proto__'),null);assert.equal(withAppearance(DEFAULT_APPEARANCE,'constructor','original'),null);assert(!validAppearance({...DEFAULT_APPEARANCE,extra:true}));assert(!validAppearance({skin:'original'}));assert(!validAppearance({...DEFAULT_APPEARANCE,hat:'invalid'}));const next=withAppearance(DEFAULT_APPEARANCE,'shirt','verde');assert.equal(next.shirt,'verde');assert.equal(DEFAULT_APPEARANCE.shirt,'original');});

test('legacy four fields are accepted and added fields default safely',()=>{const old={skin:'original',shirt:'verde',trousers:'original',hat:'sem'};assert(validAppearance(old));const n=withAppearance(old,'eyes','azul');assert.equal(n.shirt,'verde');assert.equal(n.hair,'original');assert.equal(n.eyes,'azul');assert(!validAppearance({...n,eyes:'invalid'}));});
