import test from 'node:test';
import assert from 'node:assert/strict';
import {exportAudioChunk} from '../public/export-audio.js';
import {fadeEnvelope} from '../public/studio-settings.js';
test('export PCM trims stereo, applies sample-accurate fades across chunks, and preserves source',()=>{
 const left=Float32Array.of(9,9,1,1,1,1,1,1,9),right=Float32Array.from(left,x=>x/2);
 const buffer={numberOfChannels:2,sampleRate:2,getChannelData:i=>i?right:left};
 const envelope=fadeEnvelope(3,1,1);
 assert.deepEqual([...exportAudioChunk(buffer,2,0,3,envelope)],[0,.5,1,0,.25,.5]);
 assert.deepEqual([...exportAudioChunk(buffer,2,3,3,envelope)],[1,1,.5,.5,.5,.25]);
 assert.equal(left[2],1);assert.equal(right[2],.5);
});
