// Original procedural sounds; no third-party or legacy assets copied.
export const AUDIO_KEY='cv.audio.v1';
export const DEFAULT_AUDIO=Object.freeze({effects:true,ambient:true,music:true,volume:35});
export function audioSettings(value){
 const o=value&&typeof value==='object'?value:{};
 return {effects:typeof o.effects==='boolean'?o.effects:true,ambient:typeof o.ambient==='boolean'?o.ambient:true,music:typeof o.music==='boolean'?o.music:true,volume:Number.isFinite(o.volume)?Math.round(Math.max(0,Math.min(100,o.volume))):35};
}
export function ambientMix(weather={}){
 return {wind:weather.rain?.12:weather.night?.035:.075,rain:weather.rain?(weather.kind==='storm'?.24:.14):0};
}
// Original sparse pastoral melody; no sampled or licensed recording.
export const FARM_MELODY=Object.freeze([60,64,67,72,69,67,64,null,62,65,69,74,72,69,65,null,60,64,67,69,67,64,62,null,55,59,62,67,64,62,60,null]);
export const ACTION_SOUNDS=Object.freeze({hoe:[142,66,.13,.12,'triangle'],hammer:[290,115,.08,.12,'triangle'],plant:[420,680,.10,.07,'sine'],water:[850,260,.18,.05,'sine'],harvest:[520,780,.15,.08,'triangle'],weed:[260,100,.12,.07,'triangle'],dog:[220,135,.17,.07,'triangle'],cat:[490,260,.25,.055,'sine'],trade:[750,1050,.12,.07,'sine'],chop:[150,58,.18,.11,'triangle'],mine:[680,180,.15,.09,'triangle']});
export function createFarmAudio({storage,AudioContext,hidden=()=>false}){
 let settings=audioSettings(null),ctx=null,master=null,musicBus=null,wind=null,rain=null,clock=0,nextBird=0,musicClock=0,noteIndex=0;const lastSound=new Map();
 try{settings=audioSettings(JSON.parse(storage.getItem(AUDIO_KEY)));}catch{}
 function set(patch){settings=audioSettings({...settings,...patch});try{storage.setItem(AUDIO_KEY,JSON.stringify(settings));}catch{}if(master)master.gain.setTargetAtTime(settings.volume/100,ctx.currentTime,.04);if(musicBus)musicBus.gain.setTargetAtTime(settings.music?1:0,ctx.currentTime,.04);if(!settings.ambient&&ctx&&wind&&rain){for(const n of [wind,rain])n.gain.setTargetAtTime(0,ctx.currentTime,.04);}return {...settings};}
 function noise(buffer,frequency,type){
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;filter.type=type;filter.frequency.value=frequency;gain.gain.value=0;src.connect(filter);filter.connect(gain);gain.connect(master);src.start();return gain;
 }
 async function unlock(){
  if(!AudioContext||hidden())return false;
  try{if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=settings.volume/100;master.connect(ctx.destination);musicBus=ctx.createGain();musicBus.gain.value=settings.music?1:0;musicBus.connect(master);const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let n=0;for(let i=0;i<data.length;i++){n=(n+.075*(Math.random()*2-1))/1.075;data[i]=n*3;}wind=noise(buffer,260,'lowpass');rain=noise(buffer,1200,'highpass');}
   if(ctx.state==='suspended')await ctx.resume();return ctx.state==='running';
  }catch{return false;}
 }
 function tone(f,end,duration,level,type='sine',bus=master){
  if(!ctx||ctx.state!=='running'||hidden())return false;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(level,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};return true;
 }
 function click(){return settings.effects&&settings.volume>0&&tone(620,420,.075,.12,'triangle');}
 function action(name){
  if(!settings.effects||!settings.volume||!ctx||ctx.state!=='running'||!Object.hasOwn(ACTION_SOUNDS,name))return false;
  const now=ctx.currentTime;if(now-(lastSound.get(name)??-Infinity)<.12)return false;
  const played=tone(...ACTION_SOUNDS[name]);if(played)lastSound.set(name,now);return played;
 }
 function tick(dt,weather){
  if(!ctx||ctx.state!=='running'||hidden())return;
  const delta=Math.max(0,Math.min(.25,dt));if(settings.music&&settings.volume>0){musicClock+=delta;if(musicClock>=.8){musicClock-=.8;const midi=FARM_MELODY[noteIndex++%FARM_MELODY.length];if(midi!==null){const hz=440*2**((midi-69)/12);tone(hz,hz,.58,.032,'sine',musicBus);}}}else musicClock=0;
  clock+=delta;if(clock<.25)return;nextBird+=clock;clock=0;
  const m=settings.ambient?ambientMix(weather):{wind:0,rain:0};
  wind.gain.setTargetAtTime(m.wind,ctx.currentTime,.35);rain.gain.setTargetAtTime(m.rain,ctx.currentTime,.35);
  if(settings.ambient&&settings.volume>0&&!weather.rain&&nextBird>(weather.night?2.8:6)){nextBird=0;if(weather.night)tone(2700,2650,.10,.018);else tone(1800,2600,.16,.025);}
 }
 function visibility(){if(hidden()&&ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});}
 return {set,unlock,click,action,tick,visibility,get settings(){return {...settings}},get state(){return ctx?.state||'idle'}};
}
