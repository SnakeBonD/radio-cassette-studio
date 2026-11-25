export function videoDimensions(format='portrait',quality='high') {
  const n=quality==='standard'?720:1080;
  return format==='landscape'?{width:Math.round(n*16/9),height:n}:format==='square'?{width:n,height:n}:{width:n,height:Math.round(n*16/9)};
}

export function composeVideo(target,source,format,cover,artist,title,accent) {
  const size=videoDimensions(format),{width:w,height:h}=size;
  if(target.width!==w||target.height!==h){target.width=w;target.height=h;}
  const g=target.getContext('2d');
  if(format==='portrait'){g.drawImage(source,0,0,w,h);return;}
  g.fillStyle='#101112';g.fillRect(0,0,w,h);
  const pad=h*.045,deckH=h-pad*2,deckW=deckH*9/16,leftW=w-deckW-pad*3;
  g.drawImage(source,w-pad-deckW,pad,deckW,deckH);
  const artSize=Math.min(leftW,h*.57),x=pad+(leftW-artSize)/2,y=(h-artSize)*.27;
  if(cover){const side=Math.min(cover.width,cover.height);g.drawImage(cover,(cover.width-side)/2,(cover.height-side)/2,side,side,x,y,artSize,artSize);}
  else {g.fillStyle=accent||'#602b3e';g.fillRect(x,y,artSize,artSize);g.fillStyle='#fff4d6';g.font=`${artSize*.35}px Georgia`;g.textAlign='center';g.fillText('♫',x+artSize/2,y+artSize*.61);}
  g.textAlign='center';g.fillStyle='#eee5d5';
  function label(value,top,font){g.font=`${font}px system-ui`;while(g.measureText(value).width>leftW&&font>13){font--;g.font=`${font}px system-ui`;}g.fillText(value,pad+leftW/2,top,leftW);}
  label(artist||'SnakeBonD',y+artSize+h*.075,h*.038);
  g.fillStyle='#c1b6a2';label(title||'Votre musique sur bande',y+artSize+h*.125,h*.025);
  g.fillStyle=accent||'#edac53';g.fillRect(pad+leftW*.3,h-pad*2,leftW*.4,3);
}
