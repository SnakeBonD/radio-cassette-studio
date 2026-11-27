import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverCandidates,lookupCover,lookupCoverChoices} from '../cover-service.mjs';
const id='12345678-1234-1234-1234-123456789abc';
const recording={score:100,title:'Da Funk','artist-credit':[{name:'Daft Punk',artist:{id:'artist'}}],releases:[{id,title:'Homework',date:'1997'}]};
const data={recordings:[recording]};
test('cover selection requires exact track artist and tagged album',()=>{
 assert.equal(coverCandidates(data,'DAFT PUNK','Da Funk','Homework').length,1);
 assert.equal(coverCandidates(data,'Other','Da Funk').length,0);
 assert.equal(coverCandidates(data,'Daft Punk','Da Funk','Discovery').length,0);
 assert.equal(coverCandidates({recordings:[{...recording,title:'Da Funk (Live)'}]},'Daft Punk','Da Funk').length,0);
});

test('artwork comparison includes official compilations, bounds results and survives missing images',async()=>{
 const releases=Array.from({length:5},(_,i)=>({id:id.slice(0,-1)+i,title:'Edition '+i,date:String(1980+i),status:i===4?'Bootleg':'Official','release-group':{id:id.slice(0,-1)+i,'primary-type':i===0?'Single':'Album','secondary-types':i===2?['Compilation']:[]}}));
 const search=async()=>({recordings:[{...recording,releases}]});
 assert.equal(coverCandidates(await search(),'Daft Punk','Da Funk','','Compilation',true).length,1);
 assert.equal(coverCandidates(await search(),'Daft Punk','Da Funk','','Album',true).length,2);
 const result=await lookupCoverChoices('Daft Punk','Da Funk','All',async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}}),search);
 assert.equal(result.results.length,3);assert.equal(result.results[2].secondaryTypes[0],'Compilation');assert.equal(result.results[0].date,'1980');
 const partial=await lookupCoverChoices('Daft Punk','Da Funk','All',async url=>{if(url.includes(releases[0].id))throw Error('Unavailable');return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}});},search);
 assert.equal(partial.results.length,3);assert.equal(partial.partial,true);
 const oversized=await lookupCoverChoices('Daft Punk','Da Funk','Single',async()=>new Response(new Uint8Array(750001),{headers:{'content-type':'image/png'}}),search);assert.equal(oversized.results.length,0);assert.equal(oversized.reason,'unavailable');
});
test('cover selection rejects ambiguous artist identities and unsafe IDs',()=>{
 assert.equal(coverCandidates({recordings:[recording,{...recording,'artist-credit':[{name:'Daft Punk',artist:{id:'other'}}]}]},'Daft Punk','Da Funk').length,0);
 assert.equal(coverCandidates({recordings:[{...recording,releases:[{id:'../../bad',title:'Homework'}]}]},'Daft Punk','Da Funk').length,0);
});
test('cover service returns a bounded raster image and source, handles missing artwork',async()=>{
 const result=await lookupCover('Daft Punk','Da Funk','Homework',async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg'}}),async()=>data);
 assert.equal(result.image,'AQID');assert.equal(result.url,'https://musicbrainz.org/release/'+id);
 assert.deepEqual(await lookupCover('Daft Punk','Da Funk','',async()=>new Response('',{status:404}),async()=>data),{reason:'not-found'});
 await assert.rejects(lookupCover('Daft Punk','Da Funk','',async()=>new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}}),async()=>data));
});

test('original artwork proposals exclude compilations and unverified editions and distinguish singles from albums',()=>{
 const release=(kind,extra={})=>({id,title:'Release',status:'Official',date:'1985','release-group':{'primary-type':kind},...extra});
 const candidates=releases=>({recordings:[{...recording,releases}]});
 assert.equal(coverCandidates(candidates([release('Single')]),'Daft Punk','Da Funk','','Single').length,1);
 for(const r of [release('Album'),release('Single',{status:'Bootleg'}),release('Single',{date:''}),release('Single',{'release-group':{'primary-type':'Single','secondary-types':['Compilation']}})])assert.equal(coverCandidates(candidates([r]),'Daft Punk','Da Funk','','Single').length,0);
});
