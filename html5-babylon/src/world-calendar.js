// One time scale for the fictional agricultural calendar and crops.
export const REAL_MS_PER_GAME_MINUTE=5000;
export const DAYS_PER_MONTH=7,MONTHS_PER_YEAR=12;
export const GAME_MINUTES_PER_DAY=1440;
// Schema 1 was the 24x clock; schema 2 is 12x. Preserve the exact game
// minute (including fractions) at migration, then continue at the new rate.
export function newWorldClock(now){return {schema:2,anchor:now,offset:0,floor:0};}
export function elapsedWorldClock(clock,now){return Math.max(0,clock.floor,clock.offset+now-clock.anchor);}
export function upgradeWorldClock(saved,now){
 if(!saved||!Number.isFinite(saved.anchor)||saved.anchor<0||!Number.isFinite(saved.floor)||saved.floor<0)throw Error('invalid world clock');
 if(saved.schema===1){
  const elapsed=Math.max(0,saved.floor,now-saved.anchor)*2;
  return {schema:2,anchor:now,offset:elapsed,floor:elapsed};
 }
 if(saved.schema===2&&Number.isFinite(saved.offset)&&saved.offset>=0)return {...saved};
 throw Error('invalid world clock schema');
}
export const REAL_MS_PER_GAME_DAY=GAME_MINUTES_PER_DAY*REAL_MS_PER_GAME_MINUTE;
export const MONTH_NAMES=Object.freeze(['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']);
export const WEEKDAYS=Object.freeze(['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']);
export const SEASONS=Object.freeze(['Verão','Outono','Inverno','Primavera']);
const START_MINUTE=(2*DAYS_PER_MONTH)*GAME_MINUTES_PER_DAY+8*60;
export function calendarAt(elapsedMs){
 const total=START_MINUTE+Math.floor(Math.max(0,elapsedMs)/REAL_MS_PER_GAME_MINUTE),absoluteDay=Math.floor(total/GAME_MINUTES_PER_DAY);
 const year=Math.floor(absoluteDay/(DAYS_PER_MONTH*MONTHS_PER_YEAR))+1,month=Math.floor(absoluteDay/DAYS_PER_MONTH)%MONTHS_PER_YEAR+1,day=absoluteDay%DAYS_PER_MONTH+1;
 const hour=Math.floor(total%GAME_MINUTES_PER_DAY/60),minute=total%60,seasonIndex=Math.floor((month%12)/3);
 return {year,month,day,weekday:WEEKDAYS[absoluteDay%7],hour,minute,season:SEASONS[seasonIndex],seasonIndex,absoluteDay,monthName:MONTH_NAMES[month-1]};
}
export const gameHoursToRealMs=hours=>hours*60*REAL_MS_PER_GAME_MINUTE;
// These are game balance values, not agronomic recommendations.
export const CROP_CALENDAR=Object.freeze({
 wheat:Object.freeze({name:'Trigo',preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:4,offSeasonMultiplier:1.5,temperature:19,moisture:.48,yield:3,regrow:0}),
 corn:Object.freeze({name:'Milho',preferredMonths:Object.freeze([9,10,11,12,1,2]),hours:6,offSeasonMultiplier:1.5,temperature:26,moisture:.58,yield:4,regrow:0}),
 rice:Object.freeze({name:'Arroz',preferredMonths:Object.freeze([9,10,11,12,1,2]),hours:8,offSeasonMultiplier:1.5,temperature:25,moisture:.88,yield:5,regrow:0}),
 strawberry:Object.freeze({name:'Morango',preferredMonths:Object.freeze([4,5,6,7,8,9]),hours:5,offSeasonMultiplier:1.5,temperature:18,moisture:.60,yield:3,regrow:2}),
 lettuce:Object.freeze({name:"Alface",preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:3,offSeasonMultiplier:1.5,temperature:18,moisture:0.6,yield:3,regrow:0}),
 carrot:Object.freeze({name:"Cenoura",preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:5,offSeasonMultiplier:1.5,temperature:19,moisture:0.52,yield:3,regrow:0}),
 pea:Object.freeze({name:"Ervilha",preferredMonths:Object.freeze([4,5,6,7,8]),hours:4,offSeasonMultiplier:1.5,temperature:17,moisture:0.56,yield:4,regrow:0}),
 basil:Object.freeze({name:"Manjericão",preferredMonths:Object.freeze([9,10,11,12,1,2]),hours:3,offSeasonMultiplier:1.5,temperature:25,moisture:0.5,yield:3,regrow:2}),
 tomato:Object.freeze({name:"Tomate",preferredMonths:Object.freeze([8,9,10,11,12,1]),hours:6,offSeasonMultiplier:1.5,temperature:23,moisture:0.57,yield:4,regrow:2}),
 broccoli:Object.freeze({name:"Brócolis",preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:6,offSeasonMultiplier:1.5,temperature:18,moisture:0.62,yield:3,regrow:0}),
 sunflower:Object.freeze({name:"Girassol",preferredMonths:Object.freeze([9,10,11,12,1,2]),hours:6,offSeasonMultiplier:1.5,temperature:25,moisture:0.45,yield:3,regrow:0}),
 turnip:Object.freeze({name:"Nabo",preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:4,offSeasonMultiplier:1.5,temperature:17,moisture:0.55,yield:3,regrow:0})
});
export function cropSchedule(id,month){
 const crop=CROP_CALENDAR[id];if(!crop||!Number.isInteger(month)||month<1||month>12)throw Error('invalid crop calendar');
 const preferred=crop.preferredMonths.includes(month),hours=crop.hours*(preferred?1:crop.offSeasonMultiplier);
 return {preferred,hours,realMs:gameHoursToRealMs(hours)};
}
export function daylightAt(hour,minute=0){
 const t=hour+minute/60,clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
 const daylight=smooth((t-5)/2)*smooth((19-t)/2);
 return {daylight,phase:t<5?'Noite':t<7?'Amanhecer':t<17?'Dia':t<19?'Entardecer':'Noite'};
}
