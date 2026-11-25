import {envelopeAt} from './studio-settings.js';

// Planar PCM for a bounded chunk; never alter the imported audio buffer.
export function exportAudioChunk(buffer, startSample, offset, length, envelope) {
 const channels=buffer.numberOfChannels, data=new Float32Array(length*channels);
 for(let channel=0;channel<channels;channel++){
  const source=buffer.getChannelData(channel);
  for(let i=0;i<length;i++)data[channel*length+i]=(source[startSample+offset+i]||0)*envelopeAt(envelope,(offset+i)/buffer.sampleRate);
 }
 return data;
}
