export function validYear(value){const text=String(value??'').trim();const m=/^(\d{4})(?:$|[-/T])/.exec(text);if(!m)return '';const n=Number(m[1]);return n>=1850&&n<=new Date().getFullYear()+1?m[1]:''}
const normalized=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function chooseYear(data,artist,title){
 const matches=(data.recordings||[]).filter(r=>Number(r.score)>=95&&normalized(r.title)===normalized(title)&&normalized((r['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join(''))===normalized(artist)&&!r.disambiguation);
 const dated=matches.map(r=>({year:validYear(r['first-release-date']),id:r.id})).filter(r=>r.year&&/^[a-f0-9-]{36}$/.test(r.id));
 const identities=new Set(matches.map(r=>(r['artist-credit']||[]).map(a=>a.artist?.id||'').join('/')).filter(Boolean));
 if(identities.size>1)return {year:'',reason:'ambiguous'};
 if(!dated.length)return {year:'',reason:'not-found'};
 dated.sort((a,b)=>Number(a.year)-Number(b.year));
 return {year:dated[0].year,source:'MusicBrainz',url:'https://musicbrainz.org/recording/'+dated[0].id};
}

export function tagYears(common){
 const fileYear=validYear(common.year)||validYear(common.date);
 const originalYear=validYear(common.originalyear)||validYear(common.originaldate);
 return {fileYear,originalYear,year:originalYear||fileYear,yearOrigin:originalYear?'original-tag':fileYear?'tag':'',yearPolicy:2};
}
export function yearDescription(entry){
 if(entry.yearOrigin==='manual')return 'Année corrigée manuellement — prioritaire sur les recherches.';
 if(entry.yearOrigin==='original-tag')return 'Date originale indiquée dans les tags du fichier.';
 if(entry.yearOrigin==='web')return 'Première sortie de cet enregistrement trouvée sur MusicBrainz.'+(entry.fileYear&&entry.fileYear!==entry.year?' Année du fichier : '+entry.fileYear+'.':'');
 if(entry.yearOrigin==='tag')return 'Année du fichier : '+entry.year+' — à confirmer, elle peut correspondre à un album, une compilation ou une réédition.'+(entry.yearMessage?' '+entry.yearMessage:'');
 return entry.yearMessage||'Année inconnue : aucun autocollant affiché.';
}
