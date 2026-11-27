import {refreshTrackReview} from './track-review.js';
import {exportLevelGain} from './export-level.js';
import {studioPresets} from './studio-presets.js';
import {metadataReview} from './metadata-review.js';
import {drawPremiumNeedle,drawPremiumWave,drawPremiumIndicator,drawPremiumControls} from './premium-deck.js';
import {encodeVideo} from './offline-export.js';
import {bindPlaybackKeys} from './shortcuts.js';
import {storagePanel} from './storage-panel.js';
import {videoZip} from './video-zip.js';
import {videoDimensions,composeVideo} from './video-layout.js';
import {encodeProjectFile,decodeProjectFile,projectFilename} from './project-file.js';
import {createTrimEditor} from './trim-editor.js';
import {validYear,yearDescription} from './year-utils.js';
import {BODIES} from './cassette-models.js';
import {loadBodyImages,drawBody,ORIGINAL_FINISHES} from './cassette-bodies.js';
import {frameTransform} from './framing.js';
import {THEMES,appearance,readAppearance,writeAppearance,coverAccent} from './themes.js';
import {readTrackTags} from './metadata.js';
import {bounds,peaks,rms,time,montageTime} from './audio-utils.js';
import {parseTimeInput,formatTimeInput,presetRange,fadeEnvelope,envelopeAt,scheduleFades,nextTrackIndex,VIDEO_QUALITIES,videoFilename} from './studio-settings.js';
import {putProject,getProject,allProjects,deleteProject} from './project-store.js';
const $=id=>document.getElementById(id),canvas=$('canvas'),master=document.createElement('canvas'),g=master.getContext('2d');master.width=1080;master.height=1920;
const trimEditor = createTrimEditor(document, (start, end) => {
 $('start').value = formatTimeInput(start);
 $('end').value = formatTimeInput(end);
 syncSelection();
});
const status=s=>$('status').textContent=s;
const image=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Image illisible'));i.src=url});
async function blobImage(blob){if(!blob)return null;const url=URL.createObjectURL(blob);try{return await image(url)}finally{URL.revokeObjectURL(url)}}
async function fingerprint(blob){const raw=await blob.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',raw);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}
const premiumDeck=await image('assets/deck-premium.png'),bodyImages=await loadBodyImages();
const cassetteLayer=document.createElement('canvas');cassetteLayer.width=941;cassetteLayer.height=1672;const cg=cassetteLayer.getContext('2d');
for(const id of ['original','eighties']){const option=document.createElement('option');option.value=id;option.textContent=BODIES[id].name;$('body').append(option)}
$('theme').replaceChildren();for(const [key,finish] of Object.entries(ORIGINAL_FINISHES)){const option=document.createElement('option');option.value=key;option.textContent=finish.name;$('theme').append(option)}
let cover=null,cassette=null,buffer=null,ctx=null,source=null,fadeGain=null,monitor=null,destination=null,offset=0,started=0,playing=false,exporting=false,loading=false,stopAt=Infinity,url=null,active=-1,loadGeneration=0,playGeneration=0;
let transportPaused=false,exportPosition=null,currentEnvelope=[[0,1],[1,1]],envelopeStart=0;
let importing=false,batchRunning=false,batchCancelled=false;let zipBusy=false;const batchSelection=new Set(),batchURLs=[],batchFiles=[];
let library=[],montageWaveCache=null,restoring=true,draftTimer=null,saveQueue=Promise.resolve(),draftRevision=0,projectId=null,jukeboxRunning=false,shuffleHistory=[];
const baseConfig=duration=>({start:0,end:duration||0,fadeIn:0,fadeOut:0,framing:'full',quality:'high'});
function readRange(){if(!buffer)throw Error('Chargez une piste audio.');return bounds(parseTimeInput($('start').value),parseTimeInput($('end').value),buffer.duration)}
function fadeValues(){const a=Number($('fadeIn').value),b=Number($('fadeOut').value);if($('fadeIn').value===''||$('fadeOut').value===''||!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0||a>30||b>30)throw Error('Chaque fondu doit être compris entre 0 et 30 secondes.');return [a,b]}
function selection(){if(!buffer)return {start:0,end:0,duration:0,elapsed:0,fraction:0};try{const range=jukeboxRunning&&$('jukeboxScope').value==='full'?{start:0,end:buffer.duration}:readRange();return montageTime(range.start,range.end,buffer.duration,position())}catch{return {start:0,end:0,duration:0,elapsed:0,fraction:0}}}
function selectedWave(range){if(!buffer||!range.duration)return [];if(montageWaveCache?.buffer!==buffer||montageWaveCache.start!==range.start||montageWaveCache.end!==range.end){const data=buffer.getChannelData(0);montageWaveCache={buffer,start:range.start,end:range.end,wave:peaks(data.subarray(Math.floor(range.start*buffer.sampleRate),Math.ceil(range.end*buffer.sampleRate)))}}return montageWaveCache.wave}
function setBusy(){const busy=exporting||loading||restoring||importing||batchRunning||zipBusy;$('fields').disabled=busy;$('audioFile').disabled=busy;$('showProjects').disabled=busy;$('audioDropZone').setAttribute('aria-busy',String(busy));$('fields').hidden=!library.length;for(const id of ['batchExport','exportProjectFile','importProjectFile','saveProject','newProject','openProject','deleteProject','projectList','projectName','keepAudio','previousTrack','nextTrack','jukeboxPlay','jukeboxStop','jukeboxScope','shuffle','repeat','relinkFile'])$(id).disabled=busy;list();validateMontage()}
function validateMontage(){let ok=false;try{if(buffer){const range=readRange();fadeValues();$('clipDuration').textContent='Durée du montage : '+formatTimeInput(range.end-range.start);ok=true}else $('clipDuration').textContent='Durée du montage : —'}catch(e){$('clipDuration').textContent=e.message}for(const id of ['start','end'])$(id).setAttribute('aria-invalid',String(!!buffer&&!ok));$('play').disabled=$('testVideo').disabled=$('export').disabled=!ok||loading||restoring||exporting;$('fullTrack').disabled=!buffer;for(const b of document.querySelectorAll('[data-preset]'))b.disabled=!buffer;$('seek').disabled=!buffer||!selection().duration;return ok}
function syncSelection(){if(exporting)return;jukeboxRunning=false;halt();if(buffer){const range=selection();offset=range.start;$('seek').min=range.start;$('seek').max=range.end;$('seek').value=offset}validateMontage();updateJukebox();markDirty()}
function audioContext(){if(!ctx){ctx=new AudioContext();monitor=ctx.createGain();monitor.gain.value=+$('volume').value;monitor.connect(ctx.destination);destination=ctx.createMediaStreamDestination()}return ctx}
function position(){if(exportPosition!==null)return exportPosition;return buffer?Math.min(stopAt,buffer.duration,offset+(playing?ctx.currentTime-started:0)):0}
function halt(){transportPaused=false;++playGeneration;offset=position();playing=false;if(source){source.onended=null;try{source.stop()}catch{}source.disconnect();source=null}fadeGain?.disconnect();fadeGain=null;$('play').textContent='▶ Écouter l’extrait';updateJukebox()}
async function play(start=offset,end=buffer?.duration){
 if(!buffer)return;halt();const ticket=playGeneration,audio=audioContext();await audio.resume();if(ticket!==playGeneration)return;
 const range=selection();if(!range.duration)throw Error('Choisissez un extrait valide.');const [fadeIn,fadeOut]=fadeValues();
 offset=start;stopAt=end;const node=audio.createBufferSource(),gain=audio.createGain();node.buffer=buffer;node.connect(gain);gain.connect(monitor);gain.connect(destination);
 source=node;fadeGain=gain;started=audio.currentTime;envelopeStart=range.start;currentEnvelope=fadeEnvelope(range.duration,fadeIn,fadeOut);scheduleFades(gain.gain,started,start-range.start,currentEnvelope);playing=true;
 node.onended=()=>{if(source!==node)return;offset=end;playing=false;source=null;node.disconnect();gain.disconnect();fadeGain=null;$('play').textContent='▶ Écouter l’extrait';if(jukeboxRunning)advanceTrack().catch(e=>{stopJukebox();status(e.message)});updateJukebox()};
 node.start(started,start,end-start);$('play').textContent='Ⅱ Pause';updateJukebox();
}
function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
function draw(){requestAnimationFrame(draw);if(!exporting)renderFrame();}
function renderFrame(){
 const trimRange=selection();trimEditor.render(buffer,trimRange.start,trimRange.end,exporting||loading||restoring||importing);
 rect(0,0,1080,1920,'#7f7f7f');g.save();const frame=frameTransform($('framing').value);g.translate(frame.x,frame.y);g.scale(frame.scale,frame.scale);
 g.drawImage(premiumDeck,0,0,941,1672);
 const range=selection(),clipWave=selectedWave(range),p=position(),sample=buffer?Math.floor(p*buffer.sampleRate):0,activePlayback=playing||exporting;
 for(let channel=0;channel<2;channel++)drawPremiumNeedle(g,channel,buffer&&activePlayback?rms(buffer.getChannelData(Math.min(channel,buffer.numberOfChannels-1)),sample)*envelopeAt(currentEnvelope,p-envelopeStart):0);
 // A dedicated layer preserves the existing cassette geometry and animations.
 cg.clearRect(0,0,941,1672);
 if(cassette){
  g.fillStyle='#090a0b';g.beginPath();g.roundRect(80,444,784,511,22);g.fill();
  const scale=Math.min(784/cassette.width,511/cassette.height);
  g.drawImage(cassette,80+(784-cassette.width*scale)/2,444+(511-cassette.height*scale)/2,cassette.width*scale,cassette.height*scale);
 }else{
  drawBody(cg,bodyImages,$('body').value,cover,$('artist').value,$('title').value,range.elapsed,range.duration,$('accent').value,$('theme').value,$('year').value);
  g.drawImage(cassetteLayer,31,370,880,573,80,444,784,784*573/880);
 }
 drawPremiumWave(g,clipWave,range);drawPremiumControls(g,premiumDeck,{playing:activePlayback,paused:transportPaused,volume:Number($('volume').value)});drawPremiumIndicator(g,activePlayback);
 g.restore();composeVideo(canvas,master,$('videoFormat').value,cover,$('artist').value,$('title').value,$('accent').value);$('seek').value=p;
}
function captureActive(){const entry=library[active];if(!entry||loading)return;entry.artist=$('artist').value;entry.title=$('title').value;entry.album=$('album').value;entry.year=validYear($('year').value);entry.style=appearance({body:$('body').value,theme:$('theme').value,accent:$('accent').value});try{const start=parseTimeInput($('start').value),end=parseTimeInput($('end').value);if(entry.duration)bounds(start,end,entry.duration);const [fadeIn,fadeOut]=fadeValues();entry.config={start,end,fadeIn,fadeOut,framing:$('framing').value,quality:$('quality').value,videoFormat:$('videoFormat').value,normalizeExport:$('normalizeExport').checked}}catch{}}
function applyEntry(entry){const style=appearance(entry.style);if(!['original','eighties'].includes(style.body))style.body='original';entry.style=style;$('body').value=style.body;$('theme').value=style.theme;$('accent').value=style.accent;$('artist').value=entry.artist||'';$('title').value=entry.title||'';$('album').value=entry.album||'';showCover(entry);showYear(entry);cover=entry.cover||null;cassette=entry.cassette||null;const config=entry.config||baseConfig(entry.duration);$('normalizeExport').checked=!!config.normalizeExport;$('start').value=formatTimeInput(config.start);$('end').value=formatTimeInput(config.end);$('fadeIn').value=config.fadeIn||0;$('fadeOut').value=config.fadeOut||0;$('framing').value=config.framing==='safe'?'safe':'full';$('quality').value=VIDEO_QUALITIES[config.quality]?config.quality:'high';$('videoFormat').value=['square','landscape'].includes(config.videoFormat)?config.videoFormat:'portrait';updateFraming();updateQuality();$('duration').textContent=entry.duration?'Chanson : '+formatTimeInput(entry.duration)+(buffer?' · '+buffer.numberOfChannels+' canal/canaux':''):'Audio à resélectionner.';$('relinkLabel').hidden=!!(entry.file||entry.path)}
async function load(entry,index,{capture=true}={}){
 if(capture)captureActive();const generation=++loadGeneration;halt();buffer=null;montageWaveCache=null;active=index;loading=true;setBusy();status('Décodage audio…');
 try{
  if(entry.coverBlob&&!entry.cover)entry.cover=await blobImage(entry.coverBlob);if(entry.cassetteBlob&&!entry.cassette)entry.cassette=await blobImage(entry.cassetteBlob);
  if(!entry.file&&!entry.path){applyEntry(entry);status('Audio manquant : resélectionnez « '+(entry.fileName||entry.title)+' » dans le jukebox.');return false}
  const response=entry.file?null:await fetch(entry.path);if(response&&!response.ok)throw Error('Fichier audio indisponible.');const blob=entry.file||await response.blob();
  if(entry.tagsRead&&entry.album===undefined){entry.album=(await readTrackTags(blob,entry.fileName)).album||'';}
  if(!entry.tagsRead){const tags=await readTrackTags(blob,entry.fileName||entry.file?.name||'Audio.mp3');entry.artist=tags.artist;entry.title=tags.title;entry.album=tags.album||'';entry.year=tags.year;entry.yearOrigin=tags.yearOrigin;entry.fileYear=tags.fileYear;entry.originalYear=tags.originalYear;entry.yearPolicy=2;entry.tagWarning=tags.warning;entry.tagsRead=true;if(tags.coverBlob&&!entry.coverBlob){entry.coverBlob=tags.coverBlob;entry.cover=await blobImage(tags.coverBlob)}}
  if(!entry.styleKey){entry.styleKey=await fingerprint(blob);if(!entry.style)try{entry.style=readAppearance(localStorage,entry.styleKey)}catch{}}
  if(entry.yearPolicy!==2){
   const tags=await readTrackTags(blob,entry.fileName||'Audio.mp3');
   entry.fileYear=tags.fileYear||(entry.yearOrigin==='tag'?entry.year:'')||'';entry.originalYear=tags.originalYear||'';entry.yearPolicy=2;
   if(!['manual','web'].includes(entry.yearOrigin)){
    entry.year=tags.year||entry.year||'';entry.yearOrigin=tags.yearOrigin||(entry.year?'tag':'');entry.yearSearched=false;
   }
  }
  const decoded=await audioContext().decodeAudioData(await blob.arrayBuffer());if(generation!==loadGeneration)return false;buffer=decoded;entry.duration=buffer.duration;entry.config||=baseConfig(buffer.duration);try{bounds(entry.config.start,entry.config.end,buffer.duration)}catch{entry.config={...entry.config,...baseConfig(buffer.duration)}}
  offset=entry.config.start;stopAt=buffer.duration;applyEntry(entry);const range=selection();offset=range.start;$('seek').min=range.start;$('seek').max=range.end;$('seek').value=offset;
  status(entry.tagWarning||'Piste prête.');if(!['manual','web','original-tag'].includes(entry.yearOrigin)&&!entry.yearSearched)searchYear(entry);return true;
 }catch(e){if(generation===loadGeneration){buffer=null;status('Import impossible : '+e.message)}return false}
 finally{if(generation===loadGeneration){loading=false;setBusy();list();markDirty()}}
}
function showYear(entry){$('year').value=entry.year||'';$('yearSource').hidden=!entry.yearUrl;if(entry.yearUrl)$('yearSource').href=entry.yearUrl;$('yearNote').textContent=yearDescription(entry);}
async function searchYear(entry){
 if(!entry||entry.yearOrigin==='original-tag'||entry.yearOrigin==='manual'){if(entry)$('yearNote').textContent='Année déjà renseignée. Effacez-la pour lancer une recherche.';return}
 if(!entry.artist||!entry.title){$('yearNote').textContent='Renseignez l’artiste et le titre pour rechercher l’année.';return}
 const token=entry.yearToken=(entry.yearToken||0)+1,artist=entry.artist,title=entry.title;entry.yearSearched=true;$('yearNote').textContent='Recherche de l’année sur MusicBrainz…';
 try{const response=await fetch('/api/year?'+new URLSearchParams({artist,title}));if(!response.ok)throw Error();const result=await response.json();
 if(token!==entry.yearToken||artist!==entry.artist||title!==entry.title)return;
 const foundYear=validYear(result.year);entry.year=foundYear||entry.fileYear||'';entry.yearOrigin=foundYear?'web':entry.fileYear?'tag':'';entry.yearUrl=foundYear&&/^https:\/\/musicbrainz\.org\/recording\/[a-f0-9-]+$/.test(result.url||'')?result.url:'';entry.yearMessage=result.reason==='ambiguous'?'Plusieurs années possibles : saisissez l’année après vérification.':'Aucune correspondance certaine trouvée ; vous pouvez saisir l’année.';
 }catch{if(token!==entry.yearToken)return;entry.yearMessage='Recherche indisponible. Vous pouvez saisir l’année ou réessayer.'}
 if(library[active]===entry&&!exporting)showYear(entry);markDirty();
}
let coverSearchRunning=false;
function showCover(entry){$('coverNote').textContent=entry?.coverMessage||(entry?.coverBlob?'Pochette présente.':'Aucune pochette.');const link=$('coverSource');link.hidden=!entry?.coverUrl;if(entry?.coverUrl)link.href=entry.coverUrl;}
async function findMissingCovers(all){
 if(coverSearchRunning||loading||restoring||exporting)return;captureActive();
 const tracks=(all?[...library]:[library[active]]).filter(e=>e&&!e.coverBlob&&!e.cover);
 if(!tracks.length){$('coverProgress').textContent='Aucune pochette manquante à rechercher.';return}
 coverSearchRunning=true;let found=0,failed=0,processed=0;
 try{for(const entry of tracks){
  if(!library.includes(entry))continue;
  if(entry.album===undefined&&entry.file){entry.album=(await readTrackTags(entry.file,entry.fileName)).album||'';}
  const artist=entry.artist,title=entry.title,album=entry.album||'';
  $('coverProgress').textContent=`Recherche ${++processed}/${tracks.length} : ${artist||'Artiste inconnu'} — ${title||'Titre inconnu'}…`;
  try{
   if(!artist||!title)throw Error('Renseignez l’artiste et le titre pour rechercher la pochette.');
   const response=await fetch('/api/cover?'+new URLSearchParams({artist,title,album}),{signal:AbortSignal.timeout(55000)});if(!response.ok)throw Error('Recherche indisponible. Réessayez plus tard.');const result=await response.json();
   if(!result.image)throw Error('Aucune pochette correspondant précisément aux informations de cette piste.');
   const blob=await (await fetch('data:'+result.type+';base64,'+result.image)).blob(),img=await blobImage(blob);
   // Do not change the artwork during an export, or overwrite a newer manual choice.
   while(exporting)await new Promise(resolve=>setTimeout(resolve,250));
   if(!library.includes(entry)||entry.coverBlob||artist!==entry.artist||title!==entry.title||album!==(entry.album||''))continue;
   entry.coverBlob=blob;entry.cover=img;entry.coverUrl=/^https:\/\/musicbrainz\.org\/release(?:-group)?\/[a-f0-9-]{36}$/.test(result.url||'')?result.url:'';entry.coverMessage='Pochette trouvée : '+result.album+' (MusicBrainz / Cover Art Archive).';found++;
   if(library[active]===entry)cover=img;
  }catch(error){if(library.includes(entry)&&!entry.coverBlob){entry.coverMessage=error.message;failed++}}
  if(library[active]===entry)showCover(entry);markDirty();
 }}finally{coverSearchRunning=false;$('coverProgress').textContent=`Recherche terminée : ${found} pochette(s) ajoutée(s), ${failed} sans résultat ou à réessayer.`;}
}
$('findCover').onclick=()=>findMissingCovers(false);$('findAllCovers').onclick=()=>findMissingCovers(true);
function storedTrack(entry,keepAudio){return {id:entry.id,artist:entry.artist,title:entry.title,album:entry.album,coverUrl:entry.coverUrl,coverMessage:entry.coverMessage,year:entry.year,fileYear:entry.fileYear,originalYear:entry.originalYear,yearPolicy:entry.yearPolicy,yearMessage:entry.yearMessage,yearOrigin:entry.yearOrigin,yearUrl:entry.yearUrl,yearSearched:entry.yearSearched,tagsRead:entry.tagsRead,style:entry.style,styleKey:entry.styleKey,config:entry.config,duration:entry.duration,fileName:entry.fileName||entry.file?.name||'',file:keepAudio?entry.file:null,path:null,coverBlob:entry.coverBlob||null,cassetteBlob:entry.cassetteBlob||null}}
function snapshot(id,name){captureActive();return {id,name,version:1,updatedAt:Date.now(),tracks:library.map(entry=>storedTrack(entry,$('keepAudio').checked)),active,options:{keepAudio:$('keepAudio').checked,volume:Number($('volume').value),shuffle:$('shuffle').checked,repeat:$('repeat').checked,scope:$('jukeboxScope').value}}}
function queueWrite(record){saveQueue=saveQueue.catch(()=>{}).then(()=>putProject(record));return saveQueue}
function markDirty(){refreshTrackReview(document,library,batchSelection);if(restoring||loading||importing)return;draftRevision++;clearTimeout(draftTimer);$('saveState').textContent='Modifications à sauvegarder…';draftTimer=setTimeout(()=>saveDraft(),500)}
async function saveDraft(){clearTimeout(draftTimer);if(restoring||loading||importing)return;const revision=draftRevision,record=snapshot('draft',$('projectName').value.trim()||'Mon montage');try{await queueWrite(record);if(revision===draftRevision)$('saveState').textContent='Brouillon sauvegardé sur cet appareil à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'.'}catch(e){$('saveState').textContent='Sauvegarde locale impossible (stockage plein ou indisponible). Gardez cet onglet ouvert : '+e.message}}
async function refreshProjects(selected=''){const records=await allProjects();$('projectList').replaceChildren(new Option('Choisir un projet…',''));for(const record of records.filter(r=>r.id!=='draft').sort((a,b)=>b.updatedAt-a.updatedAt))$('projectList').append(new Option(record.name,record.id));$('projectList').value=selected}
async function restore(record){
 clearTimeout(draftTimer);restoring=true;stopJukebox();++loadGeneration;buffer=null;active=-1;library=(record.tracks||[]).map(t=>({...t,id:t.id||crypto.randomUUID(),path:null,style:appearance(t.style)}));
 const options=record.options||{};$('projectName').value=record.name||'Mon montage';$('keepAudio').checked=options.keepAudio!==false;$('volume').value=Number.isFinite(options.volume)?options.volume:.7;if(monitor)monitor.gain.value=Number($('volume').value);$('shuffle').checked=!!options.shuffle;$('repeat').checked=!!options.repeat;$('jukeboxScope').value=options.scope==='clips'?'clips':'full';
 try{if(library.length)await load(library[Math.max(0,Math.min(library.length-1,record.active||0))],Math.max(0,Math.min(library.length-1,record.active||0)),{capture:false});else{cover=cassette=null;$('artist').value='';$('title').value='';$('album').value='';showCover(null);$('year').value='';$('start').value='0:00';$('end').value='0:00';$('fadeIn').value=$('fadeOut').value=0;$('duration').textContent='Chargez une piste pour commencer.';$('relinkLabel').hidden=true;list()}}
 finally{restoring=false;setBusy();updateJukebox()}
}
$('saveProject').onclick=async()=>{if(loading||exporting||importing)return;const id=projectId||crypto.randomUUID();try{await queueWrite(snapshot(id,$('projectName').value.trim()||'Mon montage'));projectId=id;await refreshProjects(id);await saveDraft();status('Projet enregistré sur cet appareil.')}catch(e){status('Enregistrement impossible : '+e.message)}};
$('openProject').onclick=async()=>{const id=$('projectList').value;if(!id){status('Choisissez un projet enregistré.');return}try{await saveDraft();const record=await getProject(id);if(!record)throw Error('Projet introuvable.');projectId=id;await restore(record);markDirty();status(library.some(e=>!e.file&&!e.path)?'Projet ouvert. Certaines pistes nécessitent de resélectionner leur audio.':'Projet restauré, audios et réglages disponibles.')}catch(e){status(e.message)}};
$('deleteProject').onclick=async()=>{const id=$('projectList').value;if(!id)return;if(!confirm('Supprimer ce projet enregistré sur cet appareil ? Le montage ouvert reste disponible.'))return;try{await deleteProject(id);if(projectId===id)projectId=null;await refreshProjects();status('Projet enregistré supprimé.')}catch(e){status(e.message)}};
$('newProject').onclick=async()=>{await saveDraft();if(library.length){try{await queueWrite(snapshot(crypto.randomUUID(),$('projectName').value.trim()||'Mon montage'));await refreshProjects()}catch(e){status('Impossible de conserver le projet actuel : '+e.message);return}}projectId=null;await restore({tracks:[],name:'Nouveau montage',options:{keepAudio:true}});markDirty();status('Nouveau projet. Le précédent reste dans les projets enregistrés.')};
$('exportProjectFile').onclick=async()=>{
 if(importing||loading||exporting||restoring)return;
 importing=true;setBusy();
 try{
  const record=snapshot(crypto.randomUUID(),$('projectName').value.trim()||'Mon montage');
  record.tracks=library.map(entry=>storedTrack(entry,true));
  const blob=encodeProjectFile(record),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download=projectFilename(record.name);document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),60000);
  const missing=record.tracks.filter(track=>!track.file).length;
  $('projectFileStatus').textContent='Téléchargement du projet lancé.'+(missing?' '+missing+' piste(s) sans audio : ces fichiers devront être resélectionnés.':' Audios, images et réglages inclus.');
 }catch(error){$('projectFileStatus').textContent='Sauvegarde impossible : '+error.message;}
 finally{importing=false;setBusy();}
};
$('importProjectFile').onchange=async event=>{
 const file=event.target.files[0];
 if(!file||importing||loading||exporting||restoring)return;
 importing=true;stopJukebox();clearTimeout(draftTimer);setBusy();
 $('projectFileStatus').textContent='Ouverture du fichier de projet…';
 try{
  const record=await decodeProjectFile(file);
  if(library.length)await queueWrite(snapshot(crypto.randomUUID(),$('projectName').value.trim()||'Mon montage'));
  await queueWrite(record);
  projectId=record.id;await refreshProjects(record.id);await restore(record);await queueWrite(snapshot('draft',record.name));
  $('projectFileStatus').textContent='Projet importé. Le montage précédent reste dans les projets enregistrés.';
 }catch(error){$('projectFileStatus').textContent='Ouverture impossible : '+error.message;}
 finally{importing=false;$('importProjectFile').value='';setBusy();markDirty();}
};
for(const id of ['projectName','keepAudio'])$(id).addEventListener('change',markDirty);
function updateJukebox(){const entry=library[active];$('jukeboxPlay').textContent=jukeboxRunning&&playing?'Ⅱ Pause playlist':jukeboxRunning?'▶ Reprendre la playlist':'▶ Lire la playlist';$('jukeboxPlay').setAttribute('aria-pressed',String(jukeboxRunning));$('jukeboxStatus').textContent=!library.length?'Playlist vide.':jukeboxRunning?(playing?'Lecture : ':'En pause : ')+(entry?.artist||'')+' — '+(entry?.title||''):library.length+' piste(s) · '+($('jukeboxScope').value==='full'?'chansons entières':'montages sélectionnés')}
function stopJukebox(){jukeboxRunning=false;halt();shuffleHistory=[];const range=selection();if(buffer){offset=Math.max(range.start,Math.min(offset,range.end));$('seek').min=range.start;$('seek').max=range.end}updateJukebox()}
function list(){const container=$('library');container.replaceChildren();library.forEach((entry,i)=>{const row=document.createElement('div');row.dataset.trackIndex=String(i);row.className='track-row'+(i===active?' active':'');const pick=document.createElement('label');pick.className='check';const check=document.createElement('input');check.type='checkbox';check.checked=batchSelection.has(entry.id);check.disabled=exporting||loading||importing||restoring||batchRunning||zipBusy;check.setAttribute('aria-label','Exporter '+(entry.title||entry.fileName||'la piste'));check.onchange=()=>{if(check.checked)batchSelection.add(entry.id);else batchSelection.delete(entry.id);refreshTrackReview(document,library,batchSelection);};pick.append(check,document.createTextNode('Inclure dans l’export en série'));row.append(pick);const b=document.createElement('button');b.className='track-name';b.textContent=`${i+1}. ${entry.artist||'Artiste'} — ${entry.title||entry.fileName||'Piste'}`;b.setAttribute('aria-pressed',String(i===active));b.onclick=()=>{if(exporting||loading||importing)return;stopJukebox();load(entry,i)};row.append(b);if(!entry.file&&!entry.path){const note=document.createElement('p');note.className='track-missing';note.textContent='Audio à resélectionner : '+(entry.fileName||entry.title);row.append(note)}const controls=document.createElement('div');controls.className='track-tools';for(const [label,delta] of [['↑',-1],['↓',1]]){const move=document.createElement('button');move.textContent=label;move.setAttribute('aria-label',(delta<0?'Monter ':'Descendre ')+(entry.title||'la piste'));move.disabled=i+delta<0||i+delta>=library.length||exporting||loading;move.onclick=()=>{captureActive();const selected=library[active];[library[i],library[i+delta]]=[library[i+delta],library[i]];active=library.indexOf(selected);list();markDirty()};controls.append(move)}const remove=document.createElement('button');remove.textContent='Retirer';remove.setAttribute('aria-label','Retirer '+(entry.title||'la piste'));remove.onclick=async()=>{captureActive();const selected=library[active];if(i===active)stopJukebox();library.splice(i,1);active=library.indexOf(selected);if(active<0){buffer=null;cover=cassette=null;if(library.length)await load(library[Math.min(i,library.length-1)],Math.min(i,library.length-1),{capture:false});else{active=-1;$('relinkLabel').hidden=true;setBusy()}}list();markDirty()};controls.append(remove);row.append(controls);for(const button of row.querySelectorAll('button'))if(exporting||loading||restoring||importing||batchRunning||zipBusy)button.disabled=true;container.append(row)});refreshTrackReview(document,library,batchSelection);updateJukebox()}
async function advanceTrack(direction=1){
 const available=library.map((e,i)=>e.file||e.path?i:-1).filter(i=>i>=0);if(!available.length){stopJukebox();status('Resélectionnez les audios manquants pour lire la playlist.');return}
 const current=available.indexOf(active);let next;
 if(direction<0)next=current>0?current-1:$('repeat').checked?available.length-1:0;
 else{const visited=shuffleHistory.map(id=>available.findIndex(i=>library[i].id===id)).filter(i=>i>=0);next=nextTrackIndex(available.length,current,{shuffle:$('shuffle').checked,repeat:$('repeat').checked,history:visited});if($('shuffle').checked&&visited.length>=available.length)shuffleHistory=[]}
 if(next<0){stopJukebox();status('Fin de la playlist.');return}const wasRunning=jukeboxRunning,index=available[next];if(await load(library[index],index)){if(wasRunning){shuffleHistory.push(library[index].id);const range=selection();await play(range.start,range.end)}}else stopJukebox();
}
$('jukeboxPlay').onclick=async()=>{if(loading||exporting||importing)return;try{if(jukeboxRunning&&playing){halt();transportPaused=true;return}if(!jukeboxRunning){captureActive();jukeboxRunning=true;shuffleHistory=[];let index=active;if(index<0||!library[index]||(!library[index].file&&!library[index].path))index=library.findIndex(e=>e.file||e.path);if(index<0){stopJukebox();status('Ajoutez un audio à la playlist.');return}if(!await load(library[index],index)){stopJukebox();return}shuffleHistory.push(library[index].id)}const range=selection();$('seek').min=range.start;$('seek').max=range.end;await play(offset<range.start||offset>=range.end?range.start:offset,range.end)}catch(e){stopJukebox();status(e.message)}};
$('jukeboxStop').onclick=()=>{stopJukebox();const range=selection();offset=range.start;$('seek').min=range.start;$('seek').max=range.end};
$('nextTrack').onclick=()=>advanceTrack().catch(e=>status(e.message));$('previousTrack').onclick=()=>advanceTrack(-1).catch(e=>status(e.message));
$('shuffle').onchange=()=>{shuffleHistory=library[active]?[library[active].id]:[];markDirty();updateJukebox()};$('repeat').onchange=()=>{markDirty();updateJukebox()};$('jukeboxScope').onchange=()=>{stopJukebox();syncSelection();markDirty()};
$('year').oninput=()=>{const entry=library[active];if(!entry)return;entry.yearToken=(entry.yearToken||0)+1;entry.year=validYear($('year').value);entry.yearOrigin=entry.year?'manual':'';entry.yearUrl='';entry.yearSearched=false;$('yearSource').hidden=true;$('yearNote').textContent=entry.year?'Année renseignée manuellement.':'Année absente ou invalide : aucun autocollant affiché.';markDirty()};
$('findYear').onclick=()=>searchYear(library[active]);
async function importAudioFiles(files) {
 if (importing || exporting || loading || restoring) return;
 const audios = files.filter(file => file.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|aac|ogg|opus|aiff|aif)$/i.test(file.name));
 if (!audios.length) {
  $('importStatus').textContent = 'Choisissez un fichier audio compatible.';
  return;
 }
 importing = true;
 stopJukebox();
 captureActive();
 const first = library.length;
 setBusy();
 try {
  let failed = 0, processed = 0;
  for (const file of audios) library.push({id:crypto.randomUUID(),file,fileName:file.name,artist:'',title:file.name});
  for (let index = first; index < library.length; index++) {
   $('importStatus').textContent = 'Chargement ' + (++processed) + ' / ' + audios.length;
   if (!await load(library[index], index, {capture:false})) {
    library.splice(index, 1);
    index--;
    failed++;
   }
  }
  if (library[first]) await load(library[first], first, {capture:false});
  else if (library.length) await load(library[library.length - 1], library.length - 1, {capture:false});
  else active = -1;
  $('importStatus').textContent = (audios.length - failed) + ' morceau(x) ajouté(s).' + (failed ? ' ' + failed + ' fichier(s) illisible(s).' : '');
 } catch (error) {
  $('importStatus').textContent = 'Import interrompu : ' + error.message;
 } finally {
  importing = false;
  $('audioFile').value = '';
  setBusy();
  markDirty();
 }
}
$('audioFile').onchange = event => importAudioFiles([...event.target.files]);
$('showProjects').onclick = () => {
 $('projectPanel').open = true;
 $('projectList').focus();
};
$('projectPanel').ontoggle = () => $('showProjects').setAttribute('aria-expanded', String($('projectPanel').open));
const dropZone = $('audioDropZone');
for (const eventName of ['dragenter', 'dragover']) {
 dropZone.addEventListener(eventName, event => {
  event.preventDefault();
  if (!importing && !loading && !exporting && !restoring) dropZone.classList.add('drag-over');
 });
}
dropZone.addEventListener('dragleave', event => {
 if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', event => {
 event.preventDefault();
 dropZone.classList.remove('drag-over');
 importAudioFiles([...event.dataTransfer.files]);
});

$('relinkFile').onchange=async e=>{const file=e.target.files[0],entry=library[active];if(!file||!entry)return;try{const hash=await fingerprint(file);if(entry.styleKey&&hash!==entry.styleKey)throw Error('Ce fichier ne correspond pas à la piste enregistrée. Choisissez « '+entry.fileName+' ».');entry.file=file;entry.fileName=file.name;await load(entry,active);markDirty()}catch(err){status(err.message)}finally{e.target.value=''}};
for(const [id,key] of [['coverFile','cover'],['cassetteFile','cassette']])$(id).onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const img=await blobImage(file);if(key==='cover')cover=img;else cassette=img;const entry=library[active];if(entry){entry[key]=img;entry[key+'Blob']=file;if(key==='cover'){entry.coverUrl='';entry.coverMessage='Pochette importée manuellement.';showCover(entry)}markDirty()}else status('Chargez une piste pour mémoriser cette image.')}catch(err){status(err.message)}finally{e.target.value=''}};
for(const key of ['artist','title'])$(key).oninput=()=>{const entry=library[active];if(entry){entry[key]=$(key).value;entry.yearToken=(entry.yearToken||0)+1;if(entry.yearOrigin==='web'){entry.year='';entry.yearOrigin='';entry.yearUrl='';entry.yearSearched=false;showYear(entry)}}list();markDirty()};
$('album').oninput=()=>{const entry=library[active];if(entry){entry.album=$('album').value;markDirty()}};
function saveStyle(){const entry=library[active];cassette=null;if(entry){entry.cassette=null;entry.cassetteBlob=null;entry.style=appearance({body:$('body').value,theme:$('theme').value,accent:$('accent').value});try{writeAppearance(localStorage,entry.styleKey,entry.style)}catch{}markDirty()}}
$('body').onchange=saveStyle;$('anotherBody').onclick=()=>{const keys=Object.keys(ORIGINAL_FINISHES);$('theme').value=keys[(keys.indexOf($('theme').value)+1)%keys.length];saveStyle()};
$('theme').onchange=()=>{$('accent').value=THEMES[$('theme').value].accent;saveStyle()};$('accent').oninput=saveStyle;$('defaultAccent').onclick=()=>{$('accent').value=THEMES[$('theme').value].accent;saveStyle()};
$('fromCover').onclick=()=>{if(!cover){status('Chargez une pochette pour en extraire une couleur.');return}const color=coverAccent(cover);if(color){$('accent').value=color;saveStyle()}else status('Aucune couleur dominante suffisamment marquée dans cette pochette.')};
$('resetCassette').onclick=()=>{cassette=null;const entry=library[active];if(entry){entry.cassette=null;entry.cassetteBlob=null}markDirty()};
$('volume').oninput=()=>{if(monitor)monitor.gain.value=+$('volume').value;markDirty()};
$('fullTrack').onclick=()=>{if(!buffer||exporting)return;$('start').value='0:00';$('end').value=formatTimeInput(buffer.duration);syncSelection()};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{try{const range=presetRange(parseTimeInput($('start').value),Number(b.dataset.preset),buffer.duration);$('start').value=formatTimeInput(range.start);$('end').value=formatTimeInput(range.end);syncSelection()}catch(e){status(e.message)}};
for(const id of ['start','end']){$(id).addEventListener('input',()=>{if(playing)stopJukebox();validateMontage()});$(id).addEventListener('change',()=>{try{let seconds=parseTimeInput($(id).value);if(id==='end'&&buffer)seconds=Math.min(seconds,buffer.duration);$(id).value=formatTimeInput(seconds)}catch{}syncSelection()})}
for(const id of ['fadeIn','fadeOut'])$(id).onchange=syncSelection;
$('play').onclick=()=>{if(playing){halt();transportPaused=true;return}if(buffer){jukeboxRunning=false;const range=selection();if(!validateMontage()||!range.duration)return;$('seek').min=range.start;$('seek').max=range.end;play(offset<range.start||offset>=range.end?range.start:offset,range.end).catch(e=>status(e.message))}};
$('seek').oninput=async()=>{const p=+$('seek').value,wasPlaying=playing;halt();offset=p;const range=selection();if(wasPlaying&&p<range.end)try{await play(p,range.end)}catch(e){status(e.message)}};
function save(blob,name){if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}
$('still').onclick=()=>canvas.toBlob(b=>save(b,'snakebond-preview.png'));
function updateFraming(){$('frameNote').textContent=$('framing').value==='safe'?'Habillage fixe · marges de sécurité invisibles':'Lecteur entier · proportions conservées'}
function updateQuality(){const q=videoDimensions($('videoFormat').value,$('quality').value);$('formatLabel').textContent={portrait:'9:16',square:'1:1',landscape:'16:9'}[$('videoFormat').value];$('qualityNote').textContent=`${q.width} × ${q.height} · 30 images/s · audio inclus`}
$('videoFormat').onchange=()=>{updateQuality();markDirty();};$('framing').onchange=()=>{updateFraming();markDirty()};$('quality').onchange=()=>{updateQuality();markDirty()};
function unlock(){exporting=false;exportPosition=null;if(library[active])showYear(library[active]);$('cancel').hidden=true;setBusy();list()}
async function exportVideo({preview=false}={}){
 const controller=new AbortController();
 try{
  const montage=readRange(),range=preview?{...montage,end:Math.min(montage.end,montage.start+5)}:montage,[fadeIn,fadeOut]=fadeValues();
  stopJukebox();$('videoPreview').pause();captureActive();exporting=true;setBusy();
  const quality={...VIDEO_QUALITIES[$('quality').value],...videoDimensions($('videoFormat').value,$('quality').value)};
  const exportGain=$('normalizeExport').checked?exportLevelGain(buffer,montage.start,montage.end):1;
  currentEnvelope=fadeEnvelope(montage.end-montage.start,fadeIn,fadeOut).map(([t,v])=>[t,v*exportGain]);envelopeStart=range.start;
  $('cancel').hidden=false;$('cancel').onclick=()=>{if(batchRunning)batchCancelled=true;controller.abort();status('Annulation…');};
  status('Préparation de la vidéo… Vous pouvez réduire la fenêtre.');
  const blob=await encodeVideo({buffer,range,envelope:currentEnvelope,quality,signal:controller.signal,
   render:position=>{exportPosition=position;renderFrame();return canvas;},
   progress:percent=>status(`Création ${preview?'du test':'de la vidéo'}… ${percent} % · Vous pouvez réduire la fenêtre.`)});
  const filename=(preview?'TEST - ':'')+videoFilename($('artist').value,$('title').value,$('year').value,blob.type);
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);$('download').href=url;$('download').download=filename;$('download').hidden=false;
  $('videoPreview').src=url;$('videoResult').hidden=false;$('videoInfo').textContent=`${quality.width} × ${quality.height} · ${formatTimeInput(range.end-range.start)} · ${(blob.size/1e6).toFixed(1)} Mo`;
  $('videoResultTitle').textContent=preview?'Votre test vidéo':'Votre vidéo';$('download').textContent=preview?'Télécharger le test':'Télécharger la vidéo';
  status(preview?'Test prêt. Regardez-le ci-dessous. Votre montage reste inchangé.':'Vidéo prête. Regardez-la ci-dessous avant de la télécharger.');return {blob,filename};
 }catch(error){status(controller.signal.aborted?'Export annulé.':error.message);return null;}
 finally{unlock();}
}
$('export').onclick=()=>exportVideo();
$('testVideo').onclick=()=>exportVideo({preview:true});
$('applyBatchSettings').onclick=()=>{
 if(batchRunning||loading||exporting||restoring||importing||zipBusy)return;
 captureActive();const selected=library.filter(entry=>batchSelection.has(entry.id));
 if(!selected.length){$('batchSettingsStatus').textContent='Cochez les pistes dans le jukebox.';return;}
 const settings={videoFormat:$('videoFormat').value,quality:$('quality').value,framing:$('framing').value,normalizeExport:$('normalizeExport').checked};
 for(const entry of selected)entry.config={...(entry.config||baseConfig(entry.duration)),...settings};
 markDirty();$('batchSettingsStatus').textContent=`Réglages vidéo appliqués à ${selected.length} piste(s). Extraits et fondus conservés.`;
};
$('batchExport').onclick=async()=>{
 if(batchRunning||loading||exporting||restoring||importing)return;
 captureActive();const selected=library.filter(entry=>batchSelection.has(entry.id));
 if(!selected.length){$('batchStatus').textContent='Cochez les pistes à exporter dans le jukebox.';return;}
 batchRunning=true;batchCancelled=false;stopJukebox();setBusy();$('batchCancel').hidden=false;
 for(const href of batchURLs)URL.revokeObjectURL(href);batchURLs.length=0;batchFiles.length=0;$('downloadZip').hidden=true;$('zipStatus').textContent='';$('batchResults').replaceChildren();
 let completed=0;
 try{
  for(const entry of selected){
   if(batchCancelled)break;
   $('batchStatus').textContent=`Vidéo ${completed+1} / ${selected.length} : ${entry.title||entry.fileName}`;
   if(!await load(entry,library.indexOf(entry),{capture:false})){batchCancelled=true;break;}
   if(batchCancelled)break;
   const result=await exportVideo();if(!result){batchCancelled=true;break;}
   batchFiles.push(result);$('downloadZip').hidden=false;const href=URL.createObjectURL(result.blob);batchURLs.push(href);const link=document.createElement('a');link.href=href;link.download=result.filename;link.textContent=`${++completed}. Télécharger ${result.filename}`;$('batchResults').append(link);
  }
 }finally{batchRunning=false;setBusy();$('batchCancel').hidden=true;$('batchStatus').textContent=`${completed} / ${selected.length} vidéo(s) prête(s).`+(batchCancelled?' Série interrompue ; les vidéos terminées restent disponibles.':' Téléchargez chaque fichier ci-dessous.');markDirty();}
};
$('downloadZip').onclick=async()=>{
 if(zipBusy||batchRunning||!batchFiles.length)return;
 zipBusy=true;setBusy();
 try{const zip=await videoZip([...batchFiles],(done,total)=>{$('zipStatus').textContent=`Préparation du ZIP : ${done} / ${total}`;});save(zip,($('projectName').value.trim()||'Mes vidéos').replace(/[<>:\"/\\|?*]/g,'_')+'.zip');$('zipStatus').textContent='Téléchargement du ZIP lancé. Les vidéos restent aussi disponibles séparément.';}
 catch(error){$('zipStatus').textContent=error.message;}
 finally{zipBusy=false;setBusy();}
};
$('batchCancel').onclick=()=>{batchCancelled=true;if(exporting)$('cancel').click();};
$('videoPreview').onplay=()=>{if(exporting)$('videoPreview').pause();else stopJukebox()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!restoring&&!exporting&&!batchRunning)saveDraft()});
window.addEventListener('beforeunload',e=>{if(exporting||importing||batchRunning||zipBusy||$('saveState').textContent.startsWith('Modifications')){e.preventDefault();e.returnValue=''}});
bindPlaybackKeys(document,{enabled:()=>!!buffer&&!exporting&&!loading&&!restoring&&!importing&&!batchRunning&&!zipBusy,toggle:()=>$('play').click(),seek:delta=>{const range=selection();$('seek').value=Math.max(range.start,Math.min(range.end,position()+delta));$('seek').dispatchEvent(new Event('input'));}});
storagePanel(document,{isBusy:()=>exporting||loading||restoring||importing||batchRunning||zipBusy,beforeRefresh:async()=>{await saveDraft();await saveQueue;},onDeleted:async ids=>{if(ids.includes(projectId))projectId=null;await refreshProjects();}});
$('normalizeExport').onchange=markDirty;
studioPresets({document,storage:localStorage,isBusy:()=>exporting||loading||restoring||importing||batchRunning||zipBusy,
 read:()=>({style:appearance({body:$('body').value,theme:$('theme').value,accent:$('accent').value}),fadeIn:Number($('fadeIn').value),fadeOut:Number($('fadeOut').value),framing:$('framing').value,quality:$('quality').value,videoFormat:$('videoFormat').value,normalizeExport:$('normalizeExport').checked}),
 apply:p=>{stopJukebox();$('body').value=p.style.body;$('theme').value=p.style.theme;$('accent').value=p.style.accent;saveStyle();for(const key of ['fadeIn','fadeOut','framing','quality','videoFormat'])$(key).value=p[key];$('normalizeExport').checked=p.normalizeExport;updateFraming();updateQuality();syncSelection();}
});
metadataReview({document,getTracks:()=>library,getActive:()=>library[active],isBusy:()=>exporting||loading||restoring||importing||batchRunning||zipBusy,capture:captureActive,decodeImage:blobImage,changed:entry=>{if(library[active]===entry){cover=entry.cover||null;showYear(entry);showCover(entry);}markDirty();}});
$('trackReviewFilter').onchange=()=>refreshTrackReview(document,library,batchSelection);
updateFraming();updateQuality();setBusy();draw();
try{await refreshProjects();const draft=await getProject('draft');if(draft?.tracks?.length){await restore(draft);$('saveState').textContent='Dernier brouillon restauré depuis cet appareil.'}else $('saveState').textContent='Sauvegarde automatique locale prête.'}catch(e){$('saveState').textContent='Stockage local indisponible : les projets resteront dans cette session. '+e.message}
finally{restoring=false;setBusy();list()}

// Flush pending edits before leaving the studio; keep the page open if saving fails.
for(const link of document.querySelectorAll('[data-player-link]'))link.addEventListener('click',async event=>{
 if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 if(exporting||loading||restoring||importing||batchRunning||zipBusy){status('Attendez la fin du chargement ou de l’export avant de changer de page.');return}
 clearTimeout(draftTimer);
 try{await queueWrite(snapshot('draft',$('projectName').value.trim()||'Mon montage'));$('saveState').textContent='Brouillon sauvegardé.';location.href=link.href}
 catch{status('Sauvegarde impossible : restez dans le studio pour conserver votre travail.')}
});
