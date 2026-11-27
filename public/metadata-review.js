import {validYear} from './year-utils.js';
const source=value=>/^https:\/\/musicbrainz\.org\/(recording|release|release-group)\/[a-f0-9-]{36}$/.test(value||'')?value:'';
export function metadataReview({document,getTracks,getActive,isBusy,capture,changed,decodeImage}){
 const $=id=>document.getElementById(id);
 const text=(parent,value,tag='p')=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 function link(parent,url){if(!source(url))return;const a=text(parent,'Voir la source','a');a.href=url;a.target='_blank';a.rel='noopener';}
 let yearsRunning=false,coverRunning=false;
 $('reviewYears').onclick=async()=>{
  if(yearsRunning||isBusy())return;capture();yearsRunning=true;$('reviewYears').disabled=true;$('yearReviewResults').replaceChildren();
  let checked=0,proposed=0,uncertain=0,protectedCount=0;
  const entries=[...getTracks()];
  try{for(const entry of entries){
   if(!getTracks().includes(entry))continue;
   const row=document.createElement('div');row.className='metadata-proposal';$('yearReviewResults').append(row);
   text(row,`${entry.artist||'Artiste inconnu'} — ${entry.title||entry.fileName}`,'strong');
   if(['manual','original-tag'].includes(entry.yearOrigin)){text(row,`${entry.year} · ${entry.yearOrigin==='manual'?'Correction manuelle conservée':'Date originale des tags conservée'}`);protectedCount++;continue;}
   const artist=entry.artist,title=entry.title,oldYear=entry.year,origin=entry.yearOrigin;
   $('yearReviewStatus').textContent=`Vérification ${++checked} : ${title||'Titre inconnu'}…`;
   try{
    if(!artist||!title)throw Error('Artiste ou titre manquant.');
    const response=await fetch('/api/year?'+new URLSearchParams({artist,title}),{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Recherche indisponible, à réessayer.');
    const result=await response.json(),year=validYear(result.year);
    if(!year||!source(result.url))throw Error('Année incertaine : aucune correspondance suffisante.');
    text(row,`${oldYear||'Année inconnue'} → ${year}${oldYear===year?' · même année, source trouvée':''}`);link(row,result.url);
    proposed++;const apply=text(row,'Valider cette année','button');apply.type='button';
    apply.onclick=()=>{
     if(isBusy())return;
     if(!getTracks().includes(entry)||entry.artist!==artist||entry.title!==title||entry.year!==oldYear||entry.yearOrigin!==origin){apply.disabled=true;text(row,'La piste a changé : relancez la vérification.');return;}
     entry.yearToken=(entry.yearToken||0)+1;entry.year=year;entry.yearOrigin='web';entry.yearUrl=source(result.url);entry.yearSearched=true;entry.yearMessage='';changed(entry);apply.disabled=true;apply.textContent='Année validée';
    };
   }catch(error){uncertain++;text(row,error.message);}
  }}finally{yearsRunning=false;$('reviewYears').disabled=false;$('yearReviewStatus').textContent=`${proposed} proposition(s) à valider · ${uncertain} incertaine(s) · ${protectedCount} date(s) protégée(s). Aucun changement sans validation.`;}
 };
 $('reviewCover').onclick=async()=>{
  if(coverRunning||isBusy())return;capture();const entry=getActive();if(!entry)return;
  const artist=entry.artist,title=entry.title,oldBlob=entry.coverBlob,oldCover=entry.cover;
  coverRunning=true;$('reviewCover').disabled=true;$('originalCoverResults').replaceChildren();$('originalCoverStatus').textContent='Recherche d’une édition d’origine…';
  try{
   if(!artist||!title)throw Error('Renseignez l’artiste et le titre.');
   const response=await fetch('/api/cover?'+new URLSearchParams({artist,title,kind:$('originalCoverKind').value}),{signal:AbortSignal.timeout(55000)});
   if(!response.ok)throw Error('Recherche indisponible, réessayez plus tard.');
   const result=await response.json();
   if(!result.image||!['image/jpeg','image/png','image/webp'].includes(result.type)||!source(result.url))throw Error('Aucune pochette correspondante trouvée pour cette édition. Votre pochette est conservée.');
   const blob=await(await fetch(`data:${result.type};base64,${result.image}`)).blob(),img=await decodeImage(blob);
   const row=$('originalCoverResults');text(row,`${artist} — ${title}`,'strong');
   const preview=document.createElement('img');
   preview.src=`data:${result.type};base64,${result.image}`;preview.alt='Pochette proposée : '+result.album;preview.className='cover-proposal';row.append(preview);
   text(row,`${result.album}${result.date?' · '+result.date:''}`);link(row,result.url);
   const apply=text(row,'Utiliser cette pochette','button');apply.type='button';
   apply.onclick=()=>{
    if(isBusy())return;
    if(!getTracks().includes(entry)||getActive()!==entry||entry.artist!==artist||entry.title!==title||entry.coverBlob!==oldBlob||entry.cover!==oldCover){apply.disabled=true;$('originalCoverStatus').textContent='La piste ou sa pochette a changé. Relancez la recherche.';return;}
    entry.coverBlob=blob;entry.cover=img;entry.coverUrl=source(result.url);entry.coverMessage=`Pochette choisie : ${result.album}${result.date?' ('+result.date+')':''}.`;changed(entry);apply.disabled=true;$('originalCoverStatus').textContent='Pochette remplacée et mémorisée pour cette piste.';
   };
   $('originalCoverStatus').textContent='Aperçu proposé : votre pochette actuelle reste inchangée jusqu’à validation.';
  }catch(error){$('originalCoverStatus').textContent=error.message;}
  finally{coverRunning=false;$('reviewCover').disabled=false;}
 };
}
