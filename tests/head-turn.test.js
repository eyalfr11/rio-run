import test from 'node:test';
import assert from 'node:assert/strict';
import {headLookBack,headPoseWeights} from '../dist/head-turn.js';
test('Rio mostly faces the run direction and occasionally checks behind him',()=>{
 assert.equal(headLookBack(0),0);assert.equal(headLookBack(2),0);
 assert.equal(headLookBack(4.5),1);assert.equal(headLookBack(7),0);
 assert.equal(headLookBack(11),1);assert.equal(headLookBack(14),0);
 let forward=0;for(let t=0;t<15;t+=.01)if(headLookBack(t)<.1)forward++;
 assert.ok(forward/1500>.65);
});
test('head turn blends through profile, with no abrupt loop boundary',()=>{
 for(let t=0;t<30;t+=.01){const w=headPoseWeights(t);assert.ok(w.every(n=>n>=0&&n<=1));assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-10);assert.ok(Math.abs(headLookBack(t+.01)-headLookBack(t))<.05);}
 assert.deepEqual(headPoseWeights(0,'intro'),[0,0,1]);
 assert.deepEqual(headPoseWeights(3.79).map(n=>Math.round(n)),[0,1,0]);
 assert.equal(headLookBack(15),headLookBack(0));
});
