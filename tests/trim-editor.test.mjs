import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrimEditor} from '../public/trim-editor.js';

function fixture(duration=60) {
  const nodes = new Map();
  const document = {getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, attributes: {}, listeners: {}, width: 800, height: 120,
      getContext: () => ({clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}}),
      getBoundingClientRect: () => ({left:100, width:600}),
      setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(key,fn){this.listeners[key]=fn;},
      setPointerCapture(){}, focus(){},
      fire(key,event={}) {this.listeners[key]({preventDefault(){}, ...event});}
    });
    return nodes.get(id);
  }};
  const changes=[];
  const editor=createTrimEditor(document,(start,end)=>changes.push([start,end]));
  const buffer={duration,getChannelData:()=>new Float32Array(800)};
  editor.render(buffer,10,40,false);
  return {editor,buffer,changes,start:nodes.get('trimStart'),end:nodes.get('trimEnd')};
}

test('trim handles keep an excerpt inside the song and cannot cross',()=>{
  const {start,end,changes}=fixture();
  start.fire('keydown',{key:'End'});
  assert.deepEqual(changes.at(-1),[39.9,40]);
  end.fire('keydown',{key:'Home'});
  assert.deepEqual(changes.at(-1),[39.9,40]);
  end.fire('keydown',{key:'End'});
  assert.deepEqual(changes.at(-1),[39.9,60]);
  start.fire('keydown',{key:'Home'});
  assert.deepEqual(changes.at(-1),[0,60]);
});

test('keyboard supports fine adjustments and one-second shift steps',()=>{
  const {start,changes}=fixture();
  start.fire('keydown',{key:'ArrowRight'});
  assert.deepEqual(changes.at(-1),[10.1,40]);
  start.fire('keydown',{key:'ArrowLeft',shiftKey:true});
  assert.deepEqual(changes.at(-1),[9.1,40]);
});

test('drag keeps the grab offset, ignores other pointers and ends on cancel',()=>{
  const {start,changes}=fixture();
  start.fire('pointerdown',{pointerId:1,clientX:205});
  start.fire('pointermove',{pointerId:2,clientX:305});
  assert.equal(changes.length,0);
  start.fire('pointermove',{pointerId:1,clientX:305});
  assert.deepEqual(changes.at(-1),[20,40]);
  start.fire('pointercancel');
  start.fire('pointermove',{pointerId:1,clientX:405});
  assert.equal(changes.length,1);
});

test('busy and empty editors reject edits and describe the current boundaries',()=>{
  const {editor,buffer,start,end,changes}=fixture();
  assert.equal(start.attributes['aria-valuemax'],'39.9');
  assert.equal(end.attributes['aria-valuemin'],'10.1');
  assert.equal(start.attributes['aria-valuetext'],'10.0 secondes');
  editor.render(buffer,10,40,true);
  start.fire('keydown',{key:'Home'});
  assert.equal(start.disabled,true);
  assert.equal(changes.length,0);
  editor.render(null,0,0,false);
  end.fire('keydown',{key:'End'});
  assert.equal(changes.length,0);
});
