import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderTrack,removeTrack,nextTape} from '../public/tape-playlist.js';
const tracks=[{id:'a',file:{}},{id:'missing'},{id:'b',file:{}},{id:'c',file:{}}];

test('reordering preserves selected track identity and leaves original order untouched',()=>{
  const result=reorderTrack(tracks,2,0,3);
  assert.deepEqual(result.tracks.map(t=>t.id),['missing','b','c','a']);
  assert.equal(result.tracks[result.active],tracks[2]);
  assert.equal(tracks[0].id,'a');
  assert.equal(reorderTrack(tracks,2,0,-1).tracks,tracks);
});

test('removal selects the successor, previous last track, or empty state',()=>{
  assert.equal(removeTrack(tracks,2,2).tracks[2].id,'c');
  assert.equal(removeTrack(tracks,3,3).active,2);
  assert.equal(removeTrack([tracks[0]],0,0).active,-1);
  const result=removeTrack(tracks,2,0);
  assert.equal(result.tracks[result.active].id,'b');
});

test('sequential playback skips missing audio and repeat wraps only when enabled',()=>{
  assert.equal(nextTape(tracks,0),2);
  assert.equal(nextTape(tracks,3),-1);
  assert.equal(nextTape(tracks,3,{repeat:true}),0);
  assert.equal(nextTape([{id:'missing'}],0,{repeat:true}),-1);
});

test('shuffle visits every available track before repeating and avoids immediate replay',()=>{
  const options={shuffle:true,visited:['a','b']};
  assert.equal(nextTape(tracks,2,options,()=>0),3);
  options.visited.push('c');
  assert.equal(nextTape(tracks,3,options,()=>0),-1);
  options.repeat=true;
  assert.equal(nextTape(tracks,3,options,()=>0),0);
  assert.equal(nextTape([tracks[0]],0,{shuffle:true,repeat:true,visited:['a']}),0);
});
