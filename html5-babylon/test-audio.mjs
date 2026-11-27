import assert from 'node:assert/strict';
import {audioSettings,ambientMix,createFarmAudio,AUDIO_KEY,FARM_MELODY,ACTION_SOUNDS} from './src/audio.js';
assert.deepEqual(audioSettings(null),{effects:true,ambient:true,music:true,volume:35});
assert.deepEqual(audioSettings({effects:false,ambient:false,volume:150}),{effects:false,ambient:false,music:true,volume:100});
assert.equal(audioSettings({volume:NaN}).volume,35);assert.equal(audioSettings({volume:-3}).volume,0);
assert.equal(ambientMix({rain:false}).rain,0);assert(ambientMix({rain:true,kind:'storm'}).rain>ambientMix({rain:true}).rain);
const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
const a=createFarmAudio({storage});assert.equal(a.state,'idle');assert.equal(await a.unlock(),false);
a.set({effects:false,volume:20});assert.equal(JSON.parse(m.get(AUDIO_KEY)).volume,20);assert.equal(createFarmAudio({storage}).settings.effects,false);assert.equal(a.click(),false);
assert.equal(createFarmAudio({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}}).set({volume:0}).volume,0);
console.log('PASS audio settings, ambient mix, persistence, mute and unavailable audio engine');

assert.equal(audioSettings({music:false}).music,false);assert.equal(a.action('hoe'),false);assert(FARM_MELODY.length===32&&FARM_MELODY.every(n=>n===null||Number.isInteger(n)));assert(Object.keys(ACTION_SOUNDS).includes('hammer')&&Object.keys(ACTION_SOUNDS).includes('cat'));
a.set({music:false});assert.equal(createFarmAudio({storage}).settings.music,false);
// Minimal Web Audio test double checks actual scheduling and muting without hardware.
let tones=0;const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});const node=()=>({connect(){},disconnect(){},start(){},stop(){},gain:param(),frequency:param()});class FakeAudio {constructor(){this.state='running';this.currentTime=1;this.sampleRate=10;this.destination={};}createGain(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(20)}}createBufferSource(){return node()}createBiquadFilter(){return node()}createOscillator(){tones++;return node()}suspend(){this.state='suspended';return Promise.resolve()}}
const b=createFarmAudio({storage:{getItem:()=>null,setItem(){}},AudioContext:FakeAudio});assert(await b.unlock());assert(b.action('hoe'));assert(!b.action('hoe'));b.set({effects:false});assert(!b.action('hammer'));const start=tones;for(let i=0;i<4;i++)b.tick(.25,{rain:false});assert(tones>start);b.set({music:false,ambient:false});const stop=tones;for(let i=0;i<4;i++)b.tick(.25,{rain:false});assert.equal(tones,stop);console.log('PASS scheduled music, effect cooldown and mute');
