// RMS of audible blocks, attenuation only: quiet files are never boosted.
export function levelGain(buffer) {
 let energy=0,count=0;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel),block=Math.max(1,Math.round(buffer.sampleRate*.1));
  for(let i=0;i<data.length;i+=block){let sum=0;const end=Math.min(data.length,i+block);for(let j=i;j<end;j++)sum+=data[j]*data[j];const mean=sum/(end-i);if(mean>.000001){energy+=sum;count+=end-i;}}
 }
 return count?Math.min(1,.08/Math.sqrt(energy/count)):1;
}
