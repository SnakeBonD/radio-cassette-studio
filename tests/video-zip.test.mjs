import test from 'node:test';
import assert from 'node:assert/strict';
import {videoZip} from '../public/video-zip.js';
test('ZIP stores valid checksums, UTF-8 names, exact content and unique duplicate names',async()=>{
 const progress=[];
 const zip=await videoZip([{filename:'Été.mp4',blob:new Blob(['123456789'])},{filename:'Été.mp4',blob:new Blob(['second'])}],n=>progress.push(n));
 const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer),decode=new TextDecoder();
 assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(14,true),0xcbf43926);
 const nameLength=view.getUint16(26,true);
 assert.equal(decode.decode(bytes.slice(30,30+nameLength)),'Été.mp4');
 assert.equal(decode.decode(bytes.slice(30+nameLength,30+nameLength+9)),'123456789');
 const second=30+nameLength+9,secondLength=view.getUint16(second+26,true);
 assert.equal(decode.decode(bytes.slice(second+30,second+30+secondLength)),'Été (2).mp4');
 const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),2);
 const central=view.getUint32(end+16,true);assert.equal(view.getUint32(central,true),0x02014b50);
 assert.deepEqual(progress,[0,1,2]);
});
test('ZIP rejects empty lists and replaces path separators in filenames',async()=>{
 await assert.rejects(videoZip([]),/Aucune/);
 const bytes=new Uint8Array(await (await videoZip([{filename:'../folder/test.mp4',blob:new Blob(['x'])}])).arrayBuffer());
 const length=new DataView(bytes.buffer).getUint16(26,true);
 assert.equal(new TextDecoder().decode(bytes.slice(30,30+length)),'_folder_test.mp4');
});
