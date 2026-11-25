import test from 'node:test';
import assert from 'node:assert/strict';
import {resumePosition,playbackMemory} from '../public/playback-memory.js';
test('resume accepts a valid position and restarts completed or invalid tracks',()=>{
 assert.equal(resumePosition(23.4,100),23.4);
 for(const value of [NaN,Infinity,-1,99.9,100,101])assert.equal(resumePosition(value,100),0);
 assert.equal(resumePosition(12,NaN),0);
});
test('last-track position survives storage and handles blocked or corrupted storage',()=>{
 let data=null;const store={getItem:()=>data,setItem:(_,value)=>data=value};
 const memory=playbackMemory(store);memory.save('track-b',12,60);
 assert.deepEqual(playbackMemory(store).read(),{id:'track-b',position:12});
 memory.save('track-b',60,60);assert.equal(memory.read().position,0);
 data='bad json';assert.equal(memory.read(),null);
 const blocked=playbackMemory({getItem(){throw Error();},setItem(){throw Error();}});
 assert.equal(blocked.read(),null);assert.doesNotThrow(()=>blocked.save('a',10,30));
});
