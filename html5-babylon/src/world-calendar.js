// One time scale for the fictional agricultural calendar and crops.
export const REAL_MS_PER_GAME_MINUTE=2500;
export const DAYS_PER_MONTH=7,MONTHS_PER_YEAR=12;
export const GAME_MINUTES_PER_DAY=1440;
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
 wheat:Object.freeze({name:'Trigo',preferredMonths:Object.freeze([3,4,5,6,7,8]),hours:4,offSeasonMultiplier:1.5})
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
