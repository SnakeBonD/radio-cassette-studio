import {Output,BufferTarget,Mp4OutputFormat,WebMOutputFormat,CanvasSource,AudioSampleSource,AudioSample,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import {exportAudioChunk} from '../public/export-audio.js';

// No animation frames, screen capture or wall clock: each frame has an explicit timestamp.
export async function encodeVideo({buffer,range,envelope,quality,render,signal,progress}) {
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder||!globalThis.OffscreenCanvas)throw Error('Cet export nécessite un navigateur récent compatible, comme Chrome ou Edge.');
 const audioOptions={numberOfChannels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,bitrate:quality.audioBitsPerSecond};
 const videoOptions={width:quality.width,height:quality.height,bitrate:quality.videoBitsPerSecond,frameRate:30};
 let videoCodec,audioCodec,format;
 if(await canEncodeVideo('avc',videoOptions)&&await canEncodeAudio('aac',audioOptions)){videoCodec='avc';audioCodec='aac';format=new Mp4OutputFormat();}
 else if(await canEncodeVideo('vp9',videoOptions)&&await canEncodeAudio('opus',audioOptions)){videoCodec='vp9';audioCodec='opus';format=new WebMOutputFormat();}
 else throw Error('Aucun encodeur compatible. Essayez Chrome ou Edge à jour.');
 signal.throwIfAborted();
 const target=new BufferTarget(),output=new Output({format,target});
 const canvas=new OffscreenCanvas(quality.width,quality.height),context=canvas.getContext('2d');
 const video=new CanvasSource(canvas,{codec:videoCodec,bitrate:quality.videoBitsPerSecond});
 const audio=new AudioSampleSource({codec:audioCodec,bitrate:quality.audioBitsPerSecond});
 output.addVideoTrack(video,{frameRate:30});output.addAudioTrack(audio);
 // Message tasks allow cancel/UI events without background timer throttling.
 const channel=new MessageChannel();
 const yieldTask=()=>new Promise(resolve=>{channel.port1.onmessage=resolve;channel.port2.postMessage(null);});
 try{
  await output.start();
  const duration=range.end-range.start,frames=Math.ceil(duration*30);
  const startSample=Math.round(range.start*buffer.sampleRate),sampleCount=Math.min(buffer.length-startSample,Math.round(duration*buffer.sampleRate));
  let audioOffset=0;
  for(let frame=0;frame<frames;frame++){
   signal.throwIfAborted();
   const timestamp=frame/30,frameDuration=Math.min(1/30,duration-timestamp);
   context.drawImage(render(range.start+timestamp),0,0,canvas.width,canvas.height);
   await video.add(timestamp,frameDuration);
   const endSample=Math.min(sampleCount,Math.round((timestamp+frameDuration)*buffer.sampleRate));
   if(endSample>audioOffset){
    const sample=new AudioSample({data:exportAudioChunk(buffer,startSample,audioOffset,endSample-audioOffset,envelope),format:'f32-planar',numberOfChannels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,timestamp:audioOffset/buffer.sampleRate});
    try{await audio.add(sample);}finally{sample.close();}
    audioOffset=endSample;
   }
   progress(Math.floor((frame+1)/frames*99));
   await yieldTask();
  }
  signal.throwIfAborted();progress(99);await output.finalize();signal.throwIfAborted();
  return new Blob([target.buffer],{type:format.mimeType});
 }catch(error){if(output.state!=='finalized')await output.cancel();throw error;}
 finally{channel.port1.close();channel.port2.close();}
}
