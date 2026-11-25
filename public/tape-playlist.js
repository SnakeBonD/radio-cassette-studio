import {nextTrackIndex} from './studio-settings.js';

export function reorderTrack(tracks,active,from,to) {
  if (!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=tracks.length||to>=tracks.length) return {tracks,active};
  const selected=tracks[active],ordered=[...tracks];
  ordered.splice(to,0,ordered.splice(from,1)[0]);
  return {tracks:ordered,active:selected?ordered.indexOf(selected):-1};
}

export function removeTrack(tracks,active,index) {
  if (!Number.isInteger(index)||index<0||index>=tracks.length) return {tracks,active};
  const selected=tracks[active],remaining=tracks.filter((_,i)=>i!==index);
  return {tracks:remaining,active:index===active?Math.min(index,remaining.length-1):remaining.indexOf(selected)};
}

export function nextTape(tracks,active,options={},random=Math.random) {
  const available=tracks.map((t,i)=>t.file||t.path?i:-1).filter(i=>i>=0);
  const history=available.map((i,j)=>options.visited?.includes(tracks[i].id)?j:-1).filter(i=>i>=0);
  const next=nextTrackIndex(available.length,available.indexOf(active),{...options,history},random);
  return next<0?-1:available[next];
}
