import test from 'node:test';
import assert from 'node:assert/strict';
import {levelGain} from '../public/volume-level.js';
const buffer=values=>({numberOfChannels:1,sampleRate:100,getChannelData:()=>Float32Array.from(values)});
test('leveling attenuates loud tracks and never boosts silence or quiet tracks',()=>{
 assert.ok(Math.abs(levelGain(buffer(Array(100).fill(.4)))-.2)<.00001);
 assert.equal(levelGain(buffer(Array(100).fill(.02))),1);
 assert.equal(levelGain(buffer(Array(100).fill(0))),1);
});
test('silent sections do not skew the active-track level',()=>{
 const loud=Array(100).fill(.4),silent=Array(200).fill(0);
 assert.equal(levelGain(buffer(loud)),levelGain(buffer([...silent,...loud])));
});
