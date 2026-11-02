import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withoutRetiredDemo} from '../public/project-migrations.js';
test('retired demo is removed while the selected user track and settings survive',()=>{
 const demo={path:'assets/liora.mp3'},user={id:'mine',artist:'LIORA AIOVA',fileName:'my-import.mp3'};
 const original={tracks:[demo,user],active:1,options:{volume:.4}};
 const cleaned=withoutRetiredDemo(original);
 assert.deepEqual(cleaned.tracks,[user]);assert.equal(cleaned.active,0);assert.equal(cleaned.options,original.options);assert.equal(original.tracks.length,2);
 assert.equal(withoutRetiredDemo({tracks:[demo],active:0}).active,-1);
 assert.equal(withoutRetiredDemo(undefined),undefined);
});
