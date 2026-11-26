import {validYear,tagYears} from '../public/year-utils.js';
import {parseBlob,selectCover} from 'music-metadata';
export function fallbackNames(filename='') {
 const clean=filename.replace(/\.[^.]+$/,'').replace(/\s*\[\d+\s*kbps\]/ig,'').replace(/^\s*\d+(?:[-.]\d+)*[.\s_-]+/,'').trim();
 const parts=clean.split(/\s+[—–-]\s+/);
 return parts.length>1?{artist:parts.shift().trim(),title:parts.join(' — ').trim()}:{artist:'',title:clean};
}
export async function readTrackTags(blob,filename='') {
 const fallback=fallbackNames(filename);
 try {
  const {common,format}=await parseBlob(blob,{duration:true});
  const artist=common.artist?.trim()||common.artists?.filter(Boolean).join(' / ')||'';
  const title=common.title?.trim()||'';
  const picture=selectCover(common.picture);
  return {duration:Number.isFinite(format.duration)?format.duration:0,album:common.album?.trim()||'',...tagYears(common),artist:artist||fallback.artist,title:title||fallback.title,taggedArtist:!!artist,taggedTitle:!!title,coverBlob:picture?new Blob([picture.data],{type:picture.format}):null,warning:(!artist||!title)?'Tags incomplets : les champs manquants utilisent le nom du fichier si possible.':''};
 } catch {return {album:'',year:'',...fallback,taggedArtist:false,taggedTitle:false,coverBlob:null,warning:'Tags illisibles : informations proposées depuis le nom du fichier.'}}
}
