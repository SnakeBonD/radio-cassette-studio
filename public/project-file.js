import {appearance} from './themes.js';

// A small JSON manifest followed by raw blobs: audio is never base64-expanded.
const magic = 'RCSFILE1';
const maxManifest = 16 * 1024 * 1024;
const mediaKeys = ['file', 'coverBlob', 'cassetteBlob'];
const rasterType = /^image\/(png|jpeg|webp|gif|bmp|avif)$/;
const fail = () => { throw Error('Fichier de projet invalide ou incomplet.'); };
const string = (value, limit=200) => typeof value === 'string' ? value.slice(0,limit) : '';
const number = (value, fallback, min=0, max=86400) => Number.isFinite(value) ? Math.max(min,Math.min(max,value)) : fallback;
const sourceUrl = value => /^https:\/\/musicbrainz\.org\/(recording|release|release-group)\/[a-f0-9-]{36}$/.test(value) ? value : '';

function cleanTrack(track) {
  if (!track || typeof track !== 'object') fail();
  const config = track.config || {};
  return {
    id: crypto.randomUUID(), artist:string(track.artist,70), title:string(track.title,90),
    album:string(track.album,180), fileName:string(track.fileName,255),
    year:/^\d{4}$/.test(track.year) ? String(track.year) : '',
    fileYear:/^\d{4}$/.test(track.fileYear)?String(track.fileYear):'',
    originalYear:/^\d{4}$/.test(track.originalYear)?String(track.originalYear):'',
    yearPolicy:track.yearPolicy===2?2:0,yearMessage:string(track.yearMessage,500),
    yearOrigin:['tag','original-tag','manual','web'].includes(track.yearOrigin) ? track.yearOrigin : '',
    yearUrl:sourceUrl(track.yearUrl), coverUrl:sourceUrl(track.coverUrl),
    coverMessage:string(track.coverMessage,500), yearSearched:!!track.yearSearched,
    tagsRead:!!track.tagsRead, style:appearance(track.style), styleKey:string(track.styleKey,128),
    duration:number(track.duration,0), path:null,
    config:{normalizeExport:!!config.normalizeExport,start:number(config.start,0),end:number(config.end,number(track.duration,0)),
      fadeIn:number(config.fadeIn,0,0,30),fadeOut:number(config.fadeOut,0,0,30),
      videoFormat:['square','landscape'].includes(config.videoFormat)?config.videoFormat:'portrait',framing:config.framing==='safe'?'safe':'full',quality:config.quality==='standard'?'standard':'high'}
  };
}

function cleanProject(record) {
  if (!record || !Array.isArray(record.tracks) || record.tracks.length>2000) fail();
  const options=record.options || {};
  return {id:crypto.randomUUID(),version:1,name:string(record.name,80)||'Projet importé',updatedAt:Date.now(),
    active:Math.floor(number(record.active,0,0,Math.max(0,record.tracks.length-1))),
    options:{keepAudio:true,volume:number(options.volume,.7,0,1),shuffle:!!options.shuffle,
      repeat:!!options.repeat,scope:options.scope==='clips'?'clips':'full'},
    tracks:record.tracks.map(cleanTrack)};
}

export function encodeProjectFile(record) {
  const project=cleanProject(record), blobs=[];
  for (let i=0;i<project.tracks.length;i++) {
    for (const key of mediaKeys) {
      const blob=record.tracks[i][key];
      if (!blob) {project.tracks[i][key]=null;continue;}
      if (!(blob instanceof Blob) || (key!=='file' && !rasterType.test(blob.type))) fail();
      project.tracks[i][key]={size:blob.size,type:blob.type,name:string(blob.name,255)};
      blobs.push(blob);
    }
  }
  const manifest=new TextEncoder().encode(JSON.stringify(project));
  if (manifest.length>maxManifest) fail();
  const size=new Uint8Array(4);
  new DataView(size.buffer).setUint32(0,manifest.length,true);
  return new Blob([magic,size,manifest,...blobs],{type:'application/octet-stream'});
}

export async function decodeProjectFile(file) {
  if (!(file instanceof Blob) || file.size<12) fail();
  const header=await file.slice(0,12).arrayBuffer();
  if (new TextDecoder().decode(header.slice(0,8))!==magic) fail();
  const length=new DataView(header).getUint32(8,true);
  if (!length || length>maxManifest || 12+length>file.size) fail();
  let record;
  try {record=JSON.parse(await file.slice(12,12+length).text());} catch {fail();}
  if (!record || record.version!==1) fail();
  const project=cleanProject(record);
  let offset=12+length;
  for (let i=0;i<project.tracks.length;i++) {
    for (const key of mediaKeys) {
      const media=record.tracks[i][key];
      if (media===null) {project.tracks[i][key]=null;continue;}
      if (!media || !Number.isSafeInteger(media.size) || media.size<0 || media.size>file.size-offset) fail();
      const type=string(media.type,100);
      if (key!=='file' && !rasterType.test(type)) fail();
      const blob=file.slice(offset,offset+media.size,type);
      project.tracks[i][key]=key==='file'?new File([blob],string(media.name,255)||project.tracks[i].fileName||'Audio',{type}):blob;
      offset+=media.size;
    }
  }
  if (offset!==file.size) fail();
  return project;
}

export function projectFilename(name) {
  return (string(name,80).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').trim()||'Mon montage')+'.rcstudio';
}
