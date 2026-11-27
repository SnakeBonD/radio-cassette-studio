import {appearance} from './themes.js';
const key='snakebond:studio-presets:v1';
export function presetSettings(value={}){
 value=value&&typeof value==='object'?value:{};
 const seconds=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(30,Number(n))):0;
 const style=appearance(value.style);if(!['original','eighties'].includes(style.body))style.body='original';
 return {style,fadeIn:seconds(value.fadeIn),fadeOut:seconds(value.fadeOut),videoFormat:['portrait','square','landscape'].includes(value.videoFormat)?value.videoFormat:'portrait',quality:value.quality==='standard'?'standard':'high',framing:value.framing==='safe'?'safe':'full',normalizeExport:!!value.normalizeExport};
}
export function studioPresets({document,storage,read,apply,isBusy}){
 const $=id=>document.getElementById(id);let presets=[];
 try{const saved=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(saved))presets=saved.filter(p=>p&&typeof p.name==='string').slice(0,50).map(p=>({name:p.name.slice(0,60),settings:presetSettings(p.settings)}));}catch{}
 function render(){const selected=$('presetList').value;$('presetList').replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choisir un préréglage…';$('presetList').append(empty);presets.forEach((p,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=p.name;$('presetList').append(option);});$('presetList').value=selected;}
 function save(next){try{storage.setItem(key,JSON.stringify(next));presets=next;render();return true;}catch{$('presetStatus').textContent='Enregistrement impossible sur cet appareil.';return false;}}
 $('savePreset').onclick=()=>{if(isBusy())return;const name=$('presetName').value.trim().slice(0,60);if(!name){$('presetStatus').textContent='Donnez un nom au préréglage.';return;}const next=[...presets],index=next.findIndex(p=>p.name===name);if(index>=0&&!confirm('Remplacer le préréglage « '+name+' » ?'))return;if(index<0&&next.length>=50){$('presetStatus').textContent='Limite de 50 préréglages atteinte.';return;}const preset={name,settings:presetSettings(read())};if(index>=0)next[index]=preset;else next.push(preset);if(save(next))$('presetStatus').textContent='Préréglage enregistré sur cet appareil.';};
 $('applyPreset').onclick=()=>{if(isBusy()||$('presetList').value==='')return;const p=presets[Number($('presetList').value)];if(!p)return;apply(presetSettings(p.settings));$('presetStatus').textContent='Préréglage appliqué. Le morceau et les limites de l’extrait sont conservés.';};
 $('deletePreset').onclick=()=>{if(isBusy()||$('presetList').value==='')return;const index=Number($('presetList').value);if(!presets[index]||!confirm('Supprimer « '+presets[index].name+' » ?'))return;if(save(presets.filter((_,i)=>i!==index)))$('presetStatus').textContent='Préréglage supprimé.';};render();
}
