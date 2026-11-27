// Constant gain over the selected excerpt: no compressor, no change to its dynamics.
export function exportLevelGain(buffer,start,end){
 const first=Math.max(0,Math.floor(start*buffer.sampleRate)),last=Math.min(buffer.length,Math.ceil(end*buffer.sampleRate));
 const block=Math.max(1,Math.round(buffer.sampleRate*.1));let energy=0,count=0,peak=0;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel);
  for(let i=first;i<last;i+=block){let sum=0;const stop=Math.min(last,i+block);
   for(let j=i;j<stop;j++){const value=data[j];peak=Math.max(peak,Math.abs(value));sum+=value*value;}
   if(sum/(stop-i)>1e-6){energy+=sum;count+=stop-i;}
  }
 }
 return count&&peak?Math.min(4,.08/Math.sqrt(energy/count),.95/peak):1;
}
