// Appearance is stored in the existing per-world farm save. IDs, not arbitrary colors.
export const PALETTES=Object.freeze({
 skin:Object.freeze({original:null,clara:'#e7b18d',media:'#bc845b',morena:'#95613e',escura:'#603b28'}),
 shirt:Object.freeze({original:null,verde:'#54734c',azul:'#416d8d',vinho:'#904c52',creme:'#e0c9a1'}),
 trousers:Object.freeze({original:null,jeans:'#374e65',oliva:'#606348',carvao:'#383a3c',marrom:'#754d35'}),
 hat:Object.freeze({original:null,sem:null})
});
export const DEFAULT_APPEARANCE=Object.freeze({skin:'original',shirt:'original',trousers:'original',hat:'original'});
export function validAppearance(a){
 return !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===4&&Object.keys(PALETTES).every(k=>Object.hasOwn(a,k)&&Object.hasOwn(PALETTES[k],a[k]));
}
export function withAppearance(a,part,id){
 if(!validAppearance(a)||!Object.hasOwn(PALETTES,part)||!Object.hasOwn(PALETTES[part],id))return null;
 return {...a,[part]:id};
}
