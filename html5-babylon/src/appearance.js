// Appearance is stored in the existing per-world farm save. IDs, not arbitrary colors.
export const PALETTES=Object.freeze({
 skin:Object.freeze({original:null,clara:'#e7b18d',media:'#bc845b',morena:'#95613e',escura:'#603b28'}),
 shirt:Object.freeze({original:null,verde:'#54734c',azul:'#416d8d',vinho:'#904c52',creme:'#e0c9a1'}),
 trousers:Object.freeze({original:null,jeans:'#374e65',oliva:'#606348',carvao:'#383a3c',marrom:'#754d35'}),
 hat:Object.freeze({original:null,sem:null,marrom:'#754d35',verde:'#54734c'}),
 hair:Object.freeze({original:null,curto:'#38291f',castanho:'#70462b',loiro:'#c8a45c',preto:'#232327'}),
 eyes:Object.freeze({original:null,castanho:'#563b24',verde:'#577852',azul:'#4a7294'}),
 beard:Object.freeze({original:null,curta:'#493328',barba:'#38291f'}),
 boots:Object.freeze({original:null,marrom:'#704b32',carvao:'#333436'})
});
export const DEFAULT_APPEARANCE=Object.freeze({skin:'original',shirt:'original',trousers:'original',hat:'original',hair:'original',eyes:'original',beard:'original',boots:'original'});
export function validAppearance(a){
 return !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).every(k=>Object.hasOwn(PALETTES,k)&&Object.hasOwn(PALETTES[k],a[k]))&&['skin','shirt','trousers','hat'].every(k=>Object.hasOwn(a,k));
}
export function withAppearance(a,part,id){
 if(!validAppearance(a)||!Object.hasOwn(PALETTES,part)||!Object.hasOwn(PALETTES[part],id))return null;
 return {...DEFAULT_APPEARANCE,...a,[part]:id};
}
