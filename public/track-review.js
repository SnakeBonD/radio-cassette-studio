import {validYear} from './year-utils.js';

export function trackIssues(entry={}){
 const issues=[];
 const missing=value=>!String(value||'').trim()||/^(unknown(?: artist| title)?|untitled|artiste(?: inconnu)?|titre(?: inconnu)?|sans titre)$/i.test(String(value).trim());
 if(missing(entry.artist))issues.push('Artiste à compléter');
 if(missing(entry.title))issues.push('Titre à compléter');
 if(!entry.coverBlob&&!entry.cover)issues.push('Pochette absente');
 if(!validYear(entry.year))issues.push('Année absente');
 else if(!['manual','original-tag','web'].includes(entry.yearOrigin))issues.push('Année à confirmer');
 return issues;
}

export function refreshTrackReview(document,tracks,selection){
 const filter=document.getElementById('trackReviewFilter').value;
 let incomplete=0,shown=0,hiddenSelected=0;
 const rows=document.getElementById('library').children;
 for(const row of rows){
  const entry=tracks[Number(row.dataset.trackIndex)];if(!entry)continue;
  const issues=trackIssues(entry),hidden=filter==='incomplete'&&!issues.length;
  if(issues.length)incomplete++;if(!hidden)shown++;else if(selection.has(entry.id))hiddenSelected++;
  row.hidden=hidden;
  let badges=row.querySelector('.track-review');
  if(!badges){badges=document.createElement('p');badges.className='track-review';row.querySelector('.track-name').after(badges);}
  badges.replaceChildren();badges.hidden=!issues.length;
  for(const issue of issues){const badge=document.createElement('span');badge.textContent=issue;badges.append(badge);}
 }
 const selected=tracks.filter(t=>selection.has(t.id)).length;
 document.getElementById('trackReviewStatus').textContent=tracks.length
  ?`${incomplete} / ${tracks.length} piste(s) à compléter. ${shown} affichée(s). ${selected} cochée(s) pour l’export.`+(hiddenSelected?` Dont ${hiddenSelected} masquée(s) par le filtre : elles restent incluses dans l’export.`:'')+(filter==='incomplete'&&!shown?' Aucune information manquante repérée.':'')
  :'Importez des morceaux pour vérifier leurs informations.';
}
