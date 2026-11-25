import {reorderTrack,removeTrack,nextTape} from './tape-playlist.js';
import {RADIO_PRESETS} from './radio-presets.js';
import {readTrackTags} from './metadata.js';
import {getProject,putProject} from './project-store.js';
import {loadBodyImages,drawBody,ORIGINAL_FINISHES} from './cassette-bodies.js';
import {appearance,THEMES} from './themes.js';
import {time} from './audio-utils.js';
const $=id=>document.getElementById(id),audio=$('audio'),status=text=>$('status').textContent=text;
let mode='radio',tracks=[],active=-1,stations=[],selected=null,favorites=[],onlyFavorites=false,sourceURL='',ticket=0,importing=false,images=null,saveQueue=Promise.resolve();
let removedTracks=[],radioTimer=null,radioAttempt=false,radioWasPlaying=false;
let visited=[],metadataTimer=null,metadataController=null,metadataGeneration=0;
const APIS=['https://de1.api.radio-browser.info/json','https://nl1.api.radio-browser.info/json','https://at1.api.radio-browser.info/json'];
try{const data=JSON.parse(localStorage.getItem('retro-radio-favorites')||'[]');if(Array.isArray(data))favorites=data}catch{}
const key=s=>s.stationuuid||s.url_resolved||s.url;
const blobImage=blob=>new Promise((resolve,reject)=>{if(!blob)return resolve(null);const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Pochette illisible'))};img.src=url});
function release(){radioAttempt=false;radioWasPlaying=false;clearTimeout(radioTimer);$('retryRadio').hidden=true;clearTimeout(metadataTimer);metadataController?.abort();$('nowPlaying').hidden=true;$('nowPlaying').textContent='';ticket++;audio.pause();audio.removeAttribute('src');audio.load();if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL='';}
function record(id='radiocassette'){return {id,name:'Radiocassette',version:1,updatedAt:Date.now(),active,options:{keepAudio:true,volume:audio.volume,scope:'full',shuffle:$('tapeShuffle').checked,repeat:$('tapeRepeat').checked},tracks:tracks.map(({cover,...track})=>track)}}
function save(){const snapshot=record();saveQueue=saveQueue.catch(()=>{}).then(()=>putProject(snapshot)).then(()=>{$('storageNote').textContent='Bibliothèque sauvegardée sur cet appareil.'}).catch(()=>{$('storageNote').textContent='Sauvegarde indisponible : gardez cet onglet ouvert.'});return saveQueue}
function reflect(){const tape=mode==='tape';$('undoNotice').hidden=!tape||!removedTracks.length;$('radioMode').setAttribute('aria-pressed',String(!tape));$('tapeMode').setAttribute('aria-pressed',String(tape));$('radioSearch').hidden=tape;$('tapeActions').hidden=!tape;$('playlistSearch').hidden=!tape;$('tapeSeek').hidden=!tape;$('tapeOptions').hidden=!tape;$('tapeBay').hidden=!tape;$('sourceName').textContent=tape?'● CASSETTE':'● INTERNET RADIO';$('sourceType').textContent=tape?'STEREO • LOCAL':'STEREO • LIVE';$('modeNote').textContent=tape?'REC → studio de montage et export 9:16':'Les flux dépendent des stations et de votre connexion.';const track=tracks[active];$('station').textContent=tape?(track?.title||'Votre collection'):(selected?.name||'Choisir une radio');$('meta').textContent=tape?(track?.artist||'Importez vos fichiers audio'):(selected?.country||'Internet Radio');if(tape&&track){const s=appearance(track.style);$('tapeBody').value=s.body==='eighties'?'eighties':'original';$('tapeTheme').value=s.theme;$('tapeAccent').value=s.accent}render()}
function setMode(next){if(mode===next)return;release();mode=next;reflect();status(next==='tape'?'Choisissez une cassette.':'Choisissez une station.');if(next==='tape'&&active>=0)selectTape(active,false)}
function render(){$('undoRemove').disabled=importing;updateFavoriteControls();const root=$('results');root.replaceChildren();const list=mode==='tape'?tracks:onlyFavorites?favorites:stations;const query=$('trackSearch').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();let shown=0;list.forEach((entry,index)=>{if(mode==='tape'&&query&&!((entry.artist||'')+' '+(entry.title||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query))return;shown++;const button=document.createElement('button');button.textContent=mode==='tape'?`${index+1}. ${entry.artist||'Artiste'} — ${entry.title||'Piste'}${!entry.file&&!entry.path?' · audio manquant':''}`:`${entry.name} · ${entry.country||''}`;button.setAttribute('aria-current',String(mode==='tape'?index===active:selected&&key(entry)===key(selected)));button.onclick=()=>mode==='tape'?selectTape(index,true):selectRadio(entry);if(mode==='tape'){
 const row=document.createElement('div');row.className='tape-row';row.append(button);
 const tools=document.createElement('div');tools.className='tape-row-tools';
 for(const [label,symbol,action,disabled] of [
  ['Monter la piste','↑',()=>editTrack(index,index-1),index===0],
  ['Descendre la piste','↓',()=>editTrack(index,index+1),index===tracks.length-1],
  ['Retirer de la playlist','×',()=>editTrack(index,null),false]
 ]){const tool=document.createElement('button');tool.textContent=symbol;tool.setAttribute('aria-label',label+' : '+(entry.title||'Piste'));tool.title=label;tool.disabled=disabled||importing;tool.onclick=action;tools.append(tool)}
 row.append(tools);root.append(row);
 }else root.append(button)});if(mode==='tape'){const known=tracks.filter(t=>Number.isFinite(t.duration)&&t.duration>0);$('playlistSummary').textContent=`${shown} / ${tracks.length} pistes · ${time(known.reduce((n,t)=>n+t.duration,0))}${known.length<tracks.length?' + durées à lire':''}`;}if(!shown)root.textContent=mode==='tape'?(tracks.length?'Aucun morceau correspondant.':'Importez des audios ou ouvrez le projet du studio.'):onlyFavorites?'Aucune station favorite.':'Recherchez une station.';}
async function start(){if(mode==='radio'){if(!selected)return status('Choisissez une station.');const src=selected.url_resolved||selected.url;if(!/^https:\/\//i.test(src||''))return status('Ce flux ne propose pas de connexion HTTPS.');if(audio.src!==src){release();audio.src=src}}else{if(active<0)return status('Choisissez une cassette.');if(!audio.getAttribute('src'))return selectTape(active,true)}const request=ticket;if(mode==='radio'){radioAttempt=true;radioMessage('Connexion en cours…');armRadioTimeout();}try{if(mode!=='radio')status('Chargement de la cassette…');await audio.play();if(request!==ticket)return}catch(error){if(request===ticket){if(mode==='radio')radioFailure(error.name==='NotAllowedError'?'Cliquez sur Réessayer pour lancer la radio.':undefined);else status('Lecture indisponible. Réessayez ou choisissez une autre piste.')}}}
function selectRadio(entry){release();selected=entry;reflect();start()}
async function selectTape(index,autoplay=false,continuing=false){release();active=index;if(!continuing)visited=[];if(tracks[index])visited.push(tracks[index].id);const track=tracks[index],request=ticket;reflect();if(!track)return;if(!track.file&&!track.path){status('Audio manquant : ouvrez le studio pour resélectionner le fichier.');return}try{if(track.coverBlob&&!track.cover)track.cover=await blobImage(track.coverBlob);if(request!==ticket||mode!=='tape')return;sourceURL=track.file?URL.createObjectURL(track.file):'';audio.src=sourceURL||track.path;status('Cassette prête.');save();if(autoplay)await start()}catch{if(request===ticket)status('Impossible de charger cette cassette.')}}
async function editTrack(index,to){
 if(importing)return;
 if(to===null&&tracks[index]){removedTracks.push({track:tracks[index],index});$('undoText').textContent='Morceau retiré : '+(tracks[index].title||'Piste');}
 const changed=to===null?removeTrack(tracks,active,index):reorderTrack(tracks,active,index,to);
 const removedActive=to===null&&index===active,wasPlaying=!audio.paused;
 tracks=changed.tracks;active=changed.active;
 if(removedActive){release();if(active>=0)await selectTape(active,wasPlaying);else status('Playlist vide. Importez vos morceaux.');}
 reflect();await save();
}
$('undoRemove').onclick=async()=>{
 if(importing||!removedTracks.length)return;
 const {track,index}=removedTracks.pop(),current=tracks[active];
 tracks.splice(Math.min(index,tracks.length),0,track);
 if(current)active=tracks.indexOf(current);else if(mode==='tape')await selectTape(tracks.indexOf(track),false);else active=tracks.indexOf(track);
 $('undoText').textContent=removedTracks.length?'Morceau retiré : '+(removedTracks.at(-1).track.title||'Piste'):'';
 reflect();await save();
};
function radioMessage(message,retry=false){status(message);$('retryRadio').hidden=!retry;$('nowPlaying').hidden=true;}
function armRadioTimeout(){clearTimeout(radioTimer);const request=ticket;radioTimer=setTimeout(()=>{if(request===ticket&&mode==='radio'&&radioAttempt)radioFailure();},15000);}
function radioFailure(message){
 if(mode!=='radio'||!radioAttempt)return;
 const interrupted=radioWasPlaying;release();radioMessage(message||(navigator.onLine===false?'Connexion Internet perdue.':interrupted?'Flux interrompu.':'Station indisponible.'),true);
}
$('retryRadio').onclick=()=>{if(mode==='radio'&&selected){release();start();}};
for(const event of ['waiting','stalled'])audio.addEventListener(event,()=>{if(mode==='radio'&&radioAttempt){radioMessage(radioWasPlaying?'Flux interrompu · reconnexion…':'Connexion en cours…',true);armRadioTimeout();}});
window.addEventListener('offline',()=>{if(mode==='radio'&&radioAttempt)radioFailure('Connexion Internet perdue.');});
function advanceTape(){
 const options={shuffle:$('tapeShuffle').checked,repeat:$('tapeRepeat').checked,visited};
 let next=nextTape(tracks,active,options);
 if(next<0){status('Fin de la playlist.');return;}
 if(options.shuffle&&visited.includes(tracks[next].id))visited=[];
 selectTape(next,true,true);
}
for(const id of ['tapeShuffle','tapeRepeat'])$(id).onchange=()=>{visited=tracks[active]?[tracks[active].id]:[];save();};
function move(delta){if(mode==='radio'){const list=onlyFavorites?favorites:stations;if(!list.length)return;const index=list.findIndex(s=>selected&&key(s)===key(selected));selectRadio(list[(index+delta+list.length)%list.length])}else if(tracks.length){if(delta>0)advanceTape();else selectTape((active-1+tracks.length)%tracks.length,true)}}
async function refreshNowPlaying(){
 const generation=++metadataGeneration;
 clearTimeout(metadataTimer);metadataController?.abort();
 if(mode!=='radio'||audio.paused||!selected)return;
 const station=RADIO_PRESETS.find(s=>s.stationuuid===selected.stationuuid||s.url_resolved===(selected.url_resolved||selected.url));
 if(!station)return;
 const request=ticket;metadataController=new AbortController();
 try{
  const response=await fetch('/api/now-playing?'+new URLSearchParams({station:station.stationuuid}),{signal:metadataController.signal});
  if(!response.ok)throw Error();const result=await response.json();
  if(generation!==metadataGeneration||request!==ticket||mode!=='radio'||audio.paused)return;
  const title=typeof result.title==='string'?result.title:'';
  $('nowPlaying').textContent=title?'♫ '+title:'';$('nowPlaying').title=title;$('nowPlaying').hidden=!title;
 }catch{if(generation===metadataGeneration&&request===ticket){$('nowPlaying').hidden=true;$('nowPlaying').textContent='';}}
 finally{if(generation===metadataGeneration&&request===ticket&&mode==='radio'&&!audio.paused)metadataTimer=setTimeout(refreshNowPlaying,30000);}
}
audio.addEventListener('playing',refreshNowPlaying);
audio.addEventListener('pause',()=>{clearTimeout(metadataTimer);metadataController?.abort();$('nowPlaying').hidden=true;});
async function api(path){for(const base of APIS){try{const response=await fetch(base+path,{signal:AbortSignal.timeout(5000)});if(response.ok){const result=await response.json();if(Array.isArray(result))return result}}catch{}}throw Error('Recherche indisponible')}
let searchTicket=0;
async function search(){const request=++searchTicket,q=$('search').value.trim();onlyFavorites=false;render();status('Recherche des stations…');try{const result=await api('/stations/search?'+new URLSearchParams(q?{name:q,limit:'40',hidebroken:'true',order:'clickcount',reverse:'true'}:{limit:'40',hidebroken:'true',order:'clickcount',reverse:'true'}));if(request!==searchTicket)return;const matchingPresets=RADIO_PRESETS.filter(s=>!q||s.name.toLowerCase().includes(q.toLowerCase()));const list=[...matchingPresets,...result];stations=[...new Map(list.filter(s=>/^https:\/\//i.test(s.url_resolved||s.url||'')).map(s=>[key(s),s])).values()];if(mode==='radio'){render();status(`${stations.length} stations HTTPS trouvées.`)}}catch{if(mode==='radio'&&request===searchTicket)status('Annuaire indisponible. Les stations proposées et vos favoris restent accessibles.')}}
async function importFiles(files){if(importing||!files.length)return;importing=true;$('tapeFiles').disabled=true;render();setMode('tape');const first=tracks.length;try{for(const file of files){status('Lecture des tags : '+file.name);const tags=await readTrackTags(file,file.name);tracks.push({id:crypto.randomUUID(),file,fileName:file.name,...tags,tagsRead:true,yearOrigin:tags.year?'tag':'',style:appearance({body:'eighties',theme:'cobalt',accent:THEMES.cobalt.accent})})}if(mode==='tape')await selectTape(first,false);await save();render()}catch(e){status('Import impossible : '+e.message)}finally{importing=false;$('tapeFiles').disabled=false;$('tapeFiles').value='';render()}}
async function fillDurations(){
 let changed=false;
 for(const track of [...tracks])if(track.file&&!(track.duration>0)){
  try{const tags=await readTrackTags(track.file,track.fileName);if(tracks.includes(track)&&tags.duration>0){track.duration=tags.duration;changed=true;if(mode==='tape')render();}}catch{}
 }
 if(changed)await save();
}
async function openStudio(){if(importing){status('Attendez la fin de l’import.');return}release();try{if(tracks.length){const existing=await getProject('draft');if(existing?.tracks?.length)await putProject({...existing,id:crypto.randomUUID(),name:(existing.name||'Projet')+' · avant radiocassette'});await putProject(record('draft'));await save()}location.href='/studio.html'}catch{status('Sauvegarde impossible : le studio n’a pas été ouvert pour conserver votre travail.')}}
$('radioMode').onclick=()=>setMode('radio');$('tapeMode').onclick=()=>setMode('tape');$('studioMode').onclick=$('fav').onclick=openStudio;
$('searchBtn').onclick=search;$('search').onkeydown=e=>{if(e.key==='Enter')search()};$('favFilter').onclick=()=>{onlyFavorites=!onlyFavorites;render();status(onlyFavorites?'Stations favorites.':'Résultats de recherche.')};
function updateFavoriteControls() {
 const isFavorite = Boolean(selected && favorites.some(station => key(station) === key(selected)));
 const star = $('stationFavorite');
 const label = isFavorite ? 'Retirer la station des favoris' : 'Ajouter la station aux favoris';
 star.disabled = !selected;
 star.textContent = isFavorite ? '★' : '☆';
 star.setAttribute('aria-label', label);
 star.title = selected ? label : 'Choisissez une station';
 $('favFilter').setAttribute('aria-pressed', String(onlyFavorites));
}
$('stationFavorite').onclick = () => {
 if (!selected) return;
 const isFavorite = favorites.some(station => key(station) === key(selected));
 favorites = isFavorite ? favorites.filter(station => key(station) !== key(selected)) : [...favorites, selected];
 try {
  localStorage.setItem('retro-radio-favorites', JSON.stringify(favorites));
  status(isFavorite ? 'Station retirée des favoris.' : 'Station ajoutée aux favoris.');
 } catch {
  status('Les favoris ne peuvent pas être sauvegardés sur cet appareil.');
 }
 render();
};
$('play').onclick=start;$('pause').onclick=()=>{if(audio.paused)start();else{radioAttempt=false;clearTimeout(radioTimer);$('retryRadio').hidden=true;audio.pause();status('En pause.')}};$('stop').onclick=()=>{release();status('Lecture arrêtée.')};$('prev').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('mute').onclick=()=>audio.muted=!audio.muted;
$('trackSearch').oninput=render;
$('tapeFiles').onchange=e=>importFiles([...e.target.files]);
$('reloadLibrary').onclick=async()=>{if(importing)return;try{const project=await getProject('draft');if(!project?.tracks?.length)return status('Aucune piste dans le projet courant du studio.');release();removedTracks=[];tracks=project.tracks.map(t=>({...t,path:null}));await selectTape(Math.min(project.active||0,tracks.length-1));status('Projet du studio chargé.')}catch{status('Projet local indisponible.')}};
$('seekTape').oninput=()=>{if(mode==='tape'&&Number.isFinite(audio.duration))audio.currentTime=+$('seekTape').value/100*audio.duration};
for(const [key,finish] of Object.entries(ORIGINAL_FINISHES))$('tapeTheme').append(new Option(finish.name,key));
for(const id of ['tapeBody','tapeTheme','tapeAccent'])$(id).onchange=()=>{const track=tracks[active];if(!track)return;if(id==='tapeTheme')$('tapeAccent').value=THEMES[$('tapeTheme').value].accent;track.style=appearance({body:$('tapeBody').value,theme:$('tapeTheme').value,accent:$('tapeAccent').value});save()};
audio.onplaying=()=>{clearTimeout(radioTimer);if(mode==='radio'){radioAttempt=true;radioWasPlaying=true;$('retryRadio').hidden=true;}status(mode==='radio'?'● EN DIRECT':'● LECTURE CASSETTE');};audio.onerror=()=>{if(mode==='radio')radioFailure();else status('Audio illisible.');};audio.onended=()=>{if(mode==='tape')advanceTape();else radioFailure('Flux interrompu.');};audio.onloadedmetadata=()=>{if(mode==='tape'&&tracks[active]&&Number.isFinite(audio.duration)){tracks[active].duration=audio.duration;render();save()}};audio.volume=.7;
const canvas=$('tapeCanvas'),g=canvas.getContext('2d');
function draw(){if(images){const track=tracks[active],style=appearance(track?.style);g.save();g.translate(-31,-370);drawBody(g,images,style.body==='eighties'?'eighties':'original',track?.cover,track?.artist||'SnakeBonD',track?.title||'Votre musique sur bande',mode==='tape'?audio.currentTime||0:0,mode==='tape'&&Number.isFinite(audio.duration)?audio.duration:track?.duration||0,style.accent,style.theme,track?.year);g.restore();$('seekTape').value=Number.isFinite(audio.duration)&&audio.duration?audio.currentTime/audio.duration*100:0;$('tapeTime').textContent=time(audio.currentTime||0)+' / '+time(Number.isFinite(audio.duration)?audio.duration:track?.duration||0)}requestAnimationFrame(draw)}
try{images=await loadBodyImages()}catch{status('Images de cassette indisponibles.')}draw();stations=[...RADIO_PRESETS];
try{const saved=new URLSearchParams(location.search).get('from')==='studio'?await getProject('draft'):(await getProject('radiocassette')||await getProject('draft'));if(saved?.tracks){$('tapeShuffle').checked=!!saved.options?.shuffle;$('tapeRepeat').checked=!!saved.options?.repeat;tracks=saved.tracks.map(t=>({...t,path:null}));active=Math.min(saved.active||0,tracks.length-1)}}catch{$('storageNote').textContent='Stockage local indisponible.'}reflect();
if(new URLSearchParams(location.search).get('mode')==='tape')setMode('tape');
fillDurations();
window.addEventListener('pagehide',release);
