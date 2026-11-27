import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLevelGain} from '../public/export-level.js';
import {exportAudioChunk} from '../public/export-audio.js';
import {presetSettings} from '../public/studio-presets.js';
const audio=data=>({sampleRate:100,length:data.length,numberOfChannels:1,getChannelData:()=>data});
test('export leveling normalizes selected audio, protects transients and preserves input',()=>{
 const data=Float32Array.from({length:200},(_,i)=>i<100?.4:.04),buffer=audio(data);
 assert.ok(Math.abs(exportLevelGain(buffer,0,1)-.2)<1e-6);
 assert.ok(Math.abs(exportLevelGain(buffer,1,2)-2)<1e-6);
 const out=exportAudioChunk(buffer,100,0,100,[[0,2],[1,2]]);assert.ok(Math.abs(out[5]-.08)<1e-6);assert.ok(Math.abs(data[105]-.04)<1e-6);
 const transient=new Float32Array(1000).fill(.002);transient[10]=1;
 assert.ok(exportLevelGain(audio(transient),0,10)<=.95);
 assert.equal(exportLevelGain(audio(new Float32Array(100)),0,1),1);
 assert.ok(exportLevelGain(audio(new Float32Array(100).fill(.002)),0,1)<=4);
});
test('presets exclude song metadata and excerpt ranges and constrain settings',()=>{
 const p=presetSettings({artist:'Private',title:'Song',start:5,end:10,fadeIn:99,fadeOut:-1,quality:'bad',normalizeExport:true});
 assert.equal(p.fadeIn,30);assert.equal(p.fadeOut,0);assert.equal(p.quality,'high');assert.equal(p.normalizeExport,true);assert.equal(p.start,undefined);assert.equal(p.artist,undefined);
});
