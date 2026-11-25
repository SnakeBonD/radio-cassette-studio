import test from 'node:test';
import assert from 'node:assert/strict';
import {projectBytes,formatBytes} from '../public/storage-panel.js';
import {bindPlaybackKeys} from '../public/shortcuts.js';
test('project sizes include audio and both images without decoding media',()=>{
 assert.equal(projectBytes({tracks:[{file:new Blob(['abc']),coverBlob:new Blob(['xy']),cassetteBlob:new Blob(['z'])},{file:null}]}),6);
 assert.equal(projectBytes({tracks:[]}),0);assert.equal(formatBytes(1500000),'1.5 Mo');
});
test('playback keys respect focus, dialogs, modifiers and availability',()=>{
 let handler,dialog=false,enabled=true,toggles=0,jumps=[];
 bindPlaybackKeys({addEventListener:(_,fn)=>handler=fn,querySelector:()=>dialog},{enabled:()=>enabled,toggle:()=>toggles++,seek:n=>jumps.push(n)});
 const press=(extra={})=>handler({code:'Space',target:{closest:()=>false},preventDefault(){},...extra});
 press();assert.equal(toggles,1);
 press({repeat:true});press({ctrlKey:true});press({target:{closest:()=>true}});
 dialog=true;press();dialog=false;enabled=false;press();enabled=true;
 assert.equal(toggles,1);press({code:'ArrowRight',key:'ArrowRight'});press({code:'ArrowLeft',key:'ArrowLeft'});assert.deepEqual(jumps,[5,-5]);
});
