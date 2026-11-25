import {allProjects,deleteSavedProjects} from './project-store.js';
export function projectBytes(project){return (project.tracks||[]).reduce((total,track)=>total+['file','coverBlob','cassetteBlob'].reduce((n,key)=>n+(track[key] instanceof Blob?track[key].size:0),0),0);}
export function formatBytes(bytes){return bytes>=1e9?(bytes/1e9).toFixed(2)+' Go':bytes>=1e6?(bytes/1e6).toFixed(1)+' Mo':bytes>=1e3?(bytes/1e3).toFixed(1)+' Ko':bytes+' octets';}
export function storagePanel(document,{beforeRefresh,onDeleted,isBusy}){
 const $=id=>document.getElementById(id);let loading=false;
 async function refresh(){if(loading||isBusy())return;loading=true;$('storageRefresh').disabled=$('storageDelete').disabled=true;
  try{await beforeRefresh();const records=await allProjects();$('storageProjects').replaceChildren();let total=0;
   for(const record of records){const bytes=projectBytes(record);total+=bytes;const label=document.createElement('label');label.className='storage-row';const box=document.createElement('input');box.type='checkbox';box.value=record.id;box.disabled=['draft','radiocassette'].includes(record.id);const text=document.createElement('span');text.textContent=`${record.id==='draft'?'Brouillon actuel':record.id==='radiocassette'?'Bibliothèque cassette':record.name||'Projet'} — ${formatBytes(bytes)} · ${(record.tracks||[]).length} piste(s)${box.disabled?' (géré dans le lecteur)':''}`;label.append(box,text);$('storageProjects').append(label);}
   $('storageTotal').textContent=`Fichiers des projets : ${formatBytes(total)}. Les copies d’un même audio dans plusieurs projets sont comptées séparément.`;
   try{const estimate=await navigator.storage?.estimate();$('storageEstimate').textContent=estimate?`Occupation estimée du site, cache hors connexion compris : ${formatBytes(estimate.usage||0)}. Espace autorisé par le navigateur : ${formatBytes(estimate.quota||0)}.`:'';}catch{$('storageEstimate').textContent='Estimation du navigateur indisponible.';}
  }catch(error){$('storageMessage').textContent='Lecture du stockage impossible : '+error.message;}
  finally{loading=false;$('storageRefresh').disabled=$('storageDelete').disabled=false;}
 }
 $('storagePanel').addEventListener('toggle',()=>{if($('storagePanel').open)refresh();});$('storageRefresh').onclick=refresh;
 $('storageDelete').onclick=async()=>{if(loading||isBusy())return;const selected=[...$('storageProjects').querySelectorAll('input:checked:not(:disabled)')];if(!selected.length){$('storageMessage').textContent='Cochez les projets enregistrés à supprimer.';return;}
  if(!confirm('Supprimer ces projets enregistrés sur cet appareil ?\n\n'+selected.map(box=>box.parentElement.textContent).join('\n')+'\n\nLe montage ouvert et les fichiers originaux sur votre ordinateur sont conservés.'))return;
  loading=true;$('storageDelete').disabled=true;
  try{const ids=selected.map(box=>box.value);await deleteSavedProjects(ids);await onDeleted(ids);$('storageMessage').textContent=`${ids.length} projet(s) supprimé(s). Le navigateur peut mettre un moment à actualiser son estimation.`;}
  catch(error){$('storageMessage').textContent='Suppression impossible : '+error.message;}
  finally{loading=false;await refresh();}
 };
}
