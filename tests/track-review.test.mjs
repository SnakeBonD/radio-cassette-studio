import test from 'node:test';
import assert from 'node:assert/strict';
import {trackIssues} from '../public/track-review.js';

test('review flags absent fields and compilation-year tags without changing metadata',()=>{
 const track={artist:'Artist',title:'Title',year:'2024',yearOrigin:'tag',coverBlob:new Blob(['cover'])};
 assert.deepEqual(trackIssues(track),['Année à confirmer']);
 for(const yearOrigin of ['manual','original-tag','web'])assert.deepEqual(trackIssues({...track,yearOrigin}),[]);
 assert.deepEqual(trackIssues({...track,year:'wrong'}),['Année absente']);
 assert.deepEqual(trackIssues({artist:' ',title:'Sans titre'}),['Artiste à compléter','Titre à compléter','Pochette absente','Année absente']);
 assert.equal(track.year,'2024');assert.equal(track.yearOrigin,'tag');
 assert.deepEqual(trackIssues({...track,yearOrigin:'manual',coverBlob:null,cover:{}}),[]);
});
