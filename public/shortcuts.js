export function bindPlaybackKeys(document,{enabled,toggle,seek,canSeek=()=>true}){
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!enabled()||document.querySelector('dialog[open]'))return;
  if(event.target?.closest?.('input,textarea,select,button,a,summary,video,audio,[contenteditable],[role="slider"]'))return;
  if(event.code==='Space'){event.preventDefault();if(!event.repeat)toggle();}
  else if(['ArrowLeft','ArrowRight'].includes(event.key)&&canSeek()){event.preventDefault();seek(event.key==='ArrowLeft'?-5:5);}
 });
}
