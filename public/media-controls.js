export function mediaControls(session,actions) {
  let artworkURL=null;
  if(!session||typeof MediaMetadata==='undefined')return {update(){},position(){}};
  for(const [name,handler] of Object.entries(actions))try{session.setActionHandler(name,handler);}catch{}
  return {
    update({title,artist,album,cover,playing=false}){
      if(artworkURL)URL.revokeObjectURL(artworkURL);
      artworkURL=cover?URL.createObjectURL(cover):null;
      session.metadata=new MediaMetadata({title:title||'Radio Cassette Studio',artist:artist||'SnakeBonD',album:album||'',artwork:[{src:artworkURL||new URL('/favicon-192.png',location.href).href,...(cover?{type:cover.type}:{sizes:'192x192',type:'image/png'})}]});
      session.playbackState=playing?'playing':'paused';
    },
    position(duration,position,rate=1){try{session.setPositionState(Number.isFinite(duration)&&duration>0?{duration,position:Math.max(0,Math.min(duration,position)),playbackRate:rate}:undefined);}catch{}}
  };
}
