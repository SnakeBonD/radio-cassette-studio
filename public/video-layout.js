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
  const center=pad+leftW/2,textWidth=Math.min(leftW,artSize);
  g.textAlign='center';
  function linesFor(value,size,face,maxLines=2){
    let lines;
    do {
      g.font=`${size}px ${face}`;lines=[''];
      for(const word of value.split(/\s+/)){
        const last=lines.length-1,candidate=lines[last]?lines[last]+' '+word:word;
        if(g.measureText(candidate).width>textWidth&&lines[last])lines.push(word);else lines[last]=candidate;
      }
      if(lines.length<=maxLines||size<=13)break;
      size--;
    }while(true);
    return {lines,size};
  }
  // A record-sleeve hierarchy: artist, song title, then edition information.
  g.fillStyle='#202226';g.letterSpacing='2px';
  const artistLabel=linesFor((artist||'SnakeBonD').toLocaleUpperCase(),h*.022,'system-ui');
  let baseline=y+artSize+h*.060;
  artistLabel.lines.forEach(line=>{g.fillText(line,center,baseline,textWidth);baseline+=artistLabel.size*1.3;});
  g.letterSpacing='0px';
  const value=title||'Votre musique sur bande';
  const edition=value.match(/\s*\(([^()]*(?:edit|mix|version|remaster|live|instrumental)[^()]*)\)\s*$/i);
  const mainTitle=edition?value.slice(0,edition.index).trim()||value:value;
  const heading=linesFor(mainTitle,h*.039,'Georgia');
  g.fillStyle='#111315';baseline+=h*.019;
  heading.lines.forEach(line=>{g.fillText(line,center,baseline,textWidth);baseline+=heading.size*1.22;});
  if(edition){
    const subtitle=linesFor(edition[1],h*.021,'system-ui');
    g.fillStyle='#292c30';baseline+=h*.004;
    subtitle.lines.forEach(line=>{g.fillText(line,center,baseline,textWidth);baseline+=subtitle.size*1.3;});
  }
  const ruleWidth=Math.min(artSize*.22,100);
  g.fillStyle=accent||'#edac53';g.fillRect(center-ruleWidth/2,baseline+h*.012,ruleWidth,3);
}
