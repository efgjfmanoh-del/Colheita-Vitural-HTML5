// Safe single archive, restart journal, and exact raw values. Never clear localStorage.
export const WORLD_KEYS=Object.freeze(['cv.worldCalendar.v1','cv.ornamentalGarden.v1','cv.wheat.v1','cv.build.v1','cv.fenceCare.v1','cv.ranch.v1','cv.pets.v1']);
export const ARCHIVE='cv.worldArchive.v1', JOURNAL='cv.worldRestart.v1';
const keysOk=o=>o&&typeof o==='object'&&Object.keys(o).length===WORLD_KEYS.length&&WORLD_KEYS.every(k=>Object.hasOwn(o,k)&&(o[k]===null||typeof o[k]==='string'));
const parse=raw=>{const o=JSON.parse(raw);if(o?.schema!==1||!keysOk(o.world))throw Error('Arquivo de progresso inválido');return o.world;};
export const captureWorld=storage=>Object.fromEntries(WORLD_KEYS.map(k=>[k,storage.getItem(k)]));
const writeVerified=(storage,k,v)=>{storage.setItem(k,v);if(storage.getItem(k)!==v)throw Error('Falha na verificação do arquivo');};
export function archiveAvailable(storage){const raw=storage.getItem(ARCHIVE);if(raw===null)return false;parse(raw);return true;}
export function scheduleWorldRestart(storage,mode){
 if(storage.getItem(JOURNAL)!==null)throw Error('Reinício pendente; reabra o jogo');
 const current=captureWorld(storage),raw=storage.getItem(ARCHIVE);
 if(mode==='new'&&raw!==null)throw Error('Já existe um mundo arquivado. Use Trocar mundo para preservá-lo.');
 if(mode==='swap'&&raw===null)throw Error('Não existe mundo arquivado');
 if(!['new','swap'].includes(mode))throw Error('Operação inválida');
 const target=mode==='new'?Object.fromEntries(WORLD_KEYS.map(k=>[k,null])):parse(raw);
 // Journal holds both worlds before any key is touched. Only applied on next boot,
 // after the previous document has completed all pagehide saves.
 const journal=JSON.stringify({schema:1,target,archive:current});
 writeVerified(storage,JOURNAL,journal);
 return true;
}
export function applyWorldRestart(storage){
 const raw=storage.getItem(JOURNAL);if(raw===null)return false;
 const j=JSON.parse(raw);if(j?.schema!==1||!keysOk(j.target)||!keysOk(j.archive))throw Error('Reinício pendente inválido; progresso não alterado');
 // Persist the archived world before replacing active keys. Reapplying after
 // an interrupted boot is idempotent; journal is removed only after verification.
 writeVerified(storage,ARCHIVE,JSON.stringify({schema:1,world:j.archive}));
 for(const k of WORLD_KEYS){const v=j.target[k];if(v===null)storage.removeItem(k);else storage.setItem(k,v);if(storage.getItem(k)!==v)throw Error('Não foi possível concluir reinício seguro');}
 storage.removeItem(JOURNAL);return true;
}
