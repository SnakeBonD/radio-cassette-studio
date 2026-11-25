export function resumePosition(value,duration) {
  return Number.isFinite(value)&&value>0&&Number.isFinite(duration)&&value<duration-.5?value:0;
}
export function playbackMemory(storage) {
  const key='snakebond:playback';
  function read(){try{const value=JSON.parse(storage.getItem(key));return value&&typeof value.id==='string'&&Number.isFinite(value.position)?value:null;}catch{return null;}}
  return {read,save(id,position,duration){if(!id||!Number.isFinite(position))return;try{storage.setItem(key,JSON.stringify({id,position:resumePosition(position,duration)}));}catch{}}};
}
