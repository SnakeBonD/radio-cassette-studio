export function videoDimensions(format='portrait',quality='high') {
  const n=quality==='standard'?720:1080;
  return format==='landscape'?{width:Math.round(n*16/9),height:n}:format==='square'?{width:n,height:n}:{width:n,height:Math.round(n*16/9)};
}

export function composeVideo(target,source,format,cover,artist,title,accent) {
  const size=videoDimensions(format),{width:w,height:h}=size;
  if(target.width!==w||target.height!==h){target.width=w;target.height=h;}
  const g=target.getContext('2d');
  if(format==='portrait'){g.drawImage(source,0,0,w,h);return;}
  g.fillStyle='#7f7f7f';g.fillRect(0,0,w,h);
  const pad=h*.045,deckH=h-pad*2,deckW=deckH*9/16,leftW=w-deckW-pad*3;
  const deckX=w-pad-deckW;
  g.drawImage(source,deckX,pad,deckW,deckH);
  // Blend only the outer edge into the surrounding background.
  const feather=deckW*.018;
  for(const [x1,y1,x2,y2,x,y,rw,rh] of [
    [deckX,pad,deckX+feather,pad,deckX,pad,feather,deckH],
    [deckX+deckW,pad,deckX+deckW-feather,pad,deckX+deckW-feather,pad,feather,deckH],
    [deckX,pad,deckX,pad+feather,deckX,pad,deckW,feather],
    [deckX,pad+deckH,deckX,pad+deckH-feather*2,deckX,pad+deckH-feather*2,deckW,feather*2]
  ]){const fade=g.createLinearGradient(x1,y1,x2,y2);fade.addColorStop(0,'#7f7f7f');fade.addColorStop(1,'#7f7f7f00');g.fillStyle=fade;g.fillRect(x,y,rw,rh);}
  const artSize=Math.min(leftW,h*.57),x=pad+(leftW-artSize)/2,y=(h-artSize)*.22;
  if(cover){const side=Math.min(cover.width,cover.height);g.drawImage(cover,(cover.width-side)/2,(cover.height-side)/2,side,side,x,y,artSize,artSize);}
  else {g.fillStyle=accent||'#602b3e';g.fillRect(x,y,artSize,artSize);g.fillStyle='#fff4d6';g.font=`${artSize*.35}px Georgia`;g.textAlign='center';g.fillText('♫',x+artSize/2,y+artSize*.61);}
  g.textAlign='center';g.fillStyle='#141414';
  function label(value,top,font){g.font=`${font}px system-ui`;while(g.measureText(value).width>leftW&&font>13){font--;g.font=`${font}px system-ui`;}g.fillText(value,pad+leftW/2,top,leftW);}
  label(artist||'SnakeBonD',y+artSize+h*.075,h*.038);
  g.fillStyle='#1b1b1b';
  let font=h*.028,lines=[];
  const value=title||'Votre musique sur bande';
  do {
    g.font=`${font}px system-ui`;lines=[''];
    for(const word of value.split(/\s+/)){
      const last=lines.length-1,candidate=lines[last]?lines[last]+' '+word:word;
      if(g.measureText(candidate).width>leftW&&lines[last])lines.push(word);else lines[last]=candidate;
    }
    if(lines.length<=2)break;
    font--;
  }while(font>16);
  lines=lines.slice(0,2);
  const titleTop=y+artSize+h*.125,lineHeight=font*1.4;
  lines.forEach((line,i)=>g.fillText(line,pad+leftW/2,titleTop+i*lineHeight,leftW));
  g.fillStyle=accent||'#edac53';g.fillRect(pad+leftW*.3,titleTop+(lines.length-1)*lineHeight+h*.045,leftW*.4,3);
}
