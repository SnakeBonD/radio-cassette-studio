import test from 'node:test';
import assert from 'node:assert/strict';
import {videoDimensions,composeVideo} from '../public/video-layout.js';

test('all export formats have the correct dimensions at both quality levels',()=>{
 for(const [quality,n] of [['standard',720],['high',1080]]){
  assert.deepEqual(videoDimensions('portrait',quality),{width:n,height:n*16/9});
  assert.deepEqual(videoDimensions('square',quality),{width:n,height:n});
  assert.deepEqual(videoDimensions('landscape',quality),{width:n*16/9,height:n});
 }
});
test('wide compositions preserve the player ratio and fit entirely within the output',()=>{
 for(const format of ['square','landscape']){
  const images=[];const context={drawImage(...args){images.push(args);},createLinearGradient(){return {addColorStop(){}};},fillRect(){},fillText(){},measureText(){return {width:100};}};
  const target={width:0,height:0,getContext:()=>context},source={};
  composeVideo(target,source,format,null,'Artist','Title','#123456');
  const [,x,y,w,h]=images[0];
  assert.equal(w/h,9/16);assert.ok(x>=0&&y>=0&&x+w<=target.width&&y+h<=target.height);
 }
});
