import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataTitle,readIcyTitle,lookupRadioTitle} from '../radio-metadata.mjs';

function stream(bytes,chunk=3){let offset=0;return new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+chunk));offset=Math.min(offset+chunk,bytes.length);}});}
function block(text){const raw=new TextEncoder().encode(text),result=new Uint8Array(1+Math.ceil(raw.length/16)*16);result[0]=(result.length-1)/16;result.set(raw,1);return result;}

test('ICY metadata survives chunk boundaries and skipped empty blocks',async()=>{
  const metadata=block("StreamTitle='Artist - Song';");
  const bytes=new Uint8Array([1,2,3,4,0,1,2,3,4,...metadata]);
  assert.equal(await readIcyTitle(stream(bytes),4),'Artist - Song');
});
test('missing intervals and truncated blocks have no title',async()=>{
  assert.equal(await readIcyTitle(stream(new Uint8Array([1,2,3])),0),'');
  assert.equal(await readIcyTitle(stream(new Uint8Array([1,2,3,4,2,65])),4),'');
});
test('title decoding preserves accents and does not invent artist splits',()=>{
  assert.equal(metadataTitle(new TextEncoder().encode("StreamTitle='Björk - It's Oh So Quiet';")),"Björk - It's Oh So Quiet");
  assert.equal(metadataTitle(new Uint8Array([...new TextEncoder().encode("StreamTitle='Caf"),233,...new TextEncoder().encode("';")])),'Café');
});
test('unknown station identifiers never cause network requests',async()=>{
  let calls=0;
  assert.deepEqual(await lookupRadioTitle('http://127.0.0.1',()=>{calls++;}),{title:'',supported:false});
  assert.equal(calls,0);
});
