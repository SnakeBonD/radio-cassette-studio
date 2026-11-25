import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeProjectFile,decodeProjectFile,projectFilename} from '../public/project-file.js';

const sample=()=>({id:'existing-project',name:'Mes années 80',active:0,options:{keepAudio:false,volume:.4,scope:'clips',repeat:true},tracks:[{
  id:'existing-track',artist:'Artiste',title:'Titre',album:'Album',year:'1984',yearOrigin:'tag',tagsRead:true,
  style:{body:'eighties',theme:'cobalt',accent:'#123456'},
  config:{start:12.5,end:60,fadeIn:1,fadeOut:2,framing:'safe',quality:'standard',videoFormat:'landscape'},
  file:new File([new Uint8Array([0,255,127,64])],'chanson.mp3',{type:'audio/mpeg'}),
  fileName:'chanson.mp3',coverBlob:new Blob(['cover'],{type:'image/png'}),cassetteBlob:new Blob(['body'],{type:'image/webp'})
}]});

test('portable project retains exact media bytes and montage settings with new identities',async()=>{
  const original=sample();
  const result=await decodeProjectFile(encodeProjectFile(original));
  assert.equal(result.name,original.name);
  assert.notEqual(result.id,original.id);
  assert.notEqual(result.tracks[0].id,original.tracks[0].id);
  assert.equal(result.options.keepAudio,true);
  assert.equal(result.options.volume,.4);
  assert.equal(result.options.repeat,true);
  const track=result.tracks[0];
  assert.deepEqual(track.config,original.tracks[0].config);
  assert.deepEqual(track.style,original.tracks[0].style);
  assert.equal(track.year,'1984');
  assert.equal(track.file.name,'chanson.mp3');
  assert.equal(track.file.type,'audio/mpeg');
  assert.deepEqual(new Uint8Array(await track.file.arrayBuffer()),new Uint8Array([0,255,127,64]));
  assert.equal(await track.coverBlob.text(),'cover');
  assert.equal(await track.cassetteBlob.text(),'body');
});

test('missing audio remains explicit and an empty project is supported',async()=>{
  const original=sample();original.tracks[0].file=null;
  const result=await decodeProjectFile(encodeProjectFile(original));
  assert.equal(result.tracks[0].file,null);
  assert.equal(result.tracks[0].fileName,'chanson.mp3');
  original.tracks=[];
  assert.deepEqual((await decodeProjectFile(encodeProjectFile(original))).tracks,[]);
});

test('truncated, appended, wrong-format and oversized-manifest files fail before restoration',async()=>{
  const valid=encodeProjectFile(sample());
  await assert.rejects(decodeProjectFile(valid.slice(0,valid.size-1)),/invalide/);
  await assert.rejects(decodeProjectFile(new Blob([valid,'extra'])),/invalide/);
  await assert.rejects(decodeProjectFile(new Blob(['not a project file'])),/invalide/);
  const size=new Uint8Array(4);new DataView(size.buffer).setUint32(0,0xffffffff,true);
  await assert.rejects(decodeProjectFile(new Blob(['RCSFILE1',size])),/invalide/);
});

test('import excludes external paths and unsafe links and normalizes settings',async()=>{
  const original=sample();Object.assign(original.tracks[0],{path:'https://example.com/audio',yearUrl:'javascript:alert(1)',coverUrl:'https://example.com/cover'});
  original.options.volume=999;original.tracks[0].config.fadeIn=-12;
  const result=await decodeProjectFile(encodeProjectFile(original));
  assert.equal(result.tracks[0].path,null);
  assert.equal(result.tracks[0].yearUrl,'');
  assert.equal(result.tracks[0].coverUrl,'');
  assert.equal(result.options.volume,1);
  assert.equal(result.tracks[0].config.fadeIn,0);
  assert.equal(projectFilename('Mon / projet?'),'Mon _ projet_.rcstudio');
});
