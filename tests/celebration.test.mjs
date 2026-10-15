import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrationFor } from '../celebration.mjs';
const sold=(sale,received)=>({status:'sold',sale,received});
test('personal-use celebration is only a new outcome',()=>{
 assert.equal(celebrationFor({status:'claimed'},{status:'used personally'}),'Benefit enjoyed');
 assert.equal(celebrationFor(null,{status:'used personally'}),'Benefit enjoyed');
 assert.equal(celebrationFor({status:'used personally'},{status:'used personally'}),null);
 assert.equal(celebrationFor({status:'available'},{status:'claimed'}),null);
 assert.equal(celebrationFor(null,null),null);
});
test('payment celebration requires positive fully received sale',()=>{
 assert.equal(celebrationFor(sold(100,40),sold(100,100)),'Payment fully received');
 assert.equal(celebrationFor(null,sold(100,100)),'Payment fully received');
 assert.equal(celebrationFor(sold(100,40),sold(100,60)),null);
 assert.equal(celebrationFor(sold(100,100),sold(100,100)),null);
 assert.equal(celebrationFor(null,sold(0,0)),null);
 assert.equal(celebrationFor(sold(100,40),sold(40,40)),null);
});
test('family gifts celebrate only a newly saved family outcome',()=>{
 assert.equal(celebrationFor({status:'claimed'},{status:'gifted to family'}),'Shared with family');
 assert.equal(celebrationFor({status:'gifted to family'},{status:'gifted to family'}),null);
});
