import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,chaseProgress,pace,collides,wavePlan} from '../dist/rules.js';
test('only collected snacks close the chase, with level-specific targets',()=>{
 for(const cfg of Object.values(LEVELS)){
  assert.equal(chaseProgress(0,cfg.target),0);
  assert.equal(chaseProgress(cfg.target-1,cfg.target)<1,true);
  assert.equal(chaseProgress(cfg.target,cfg.target),1);
  assert.equal(chaseProgress(cfg.target+5,cfg.target),1);
 }
 assert.deepEqual(Object.values(LEVELS).map(c=>c.target),[8,12,16]);
 assert.ok(LEVELS.easy.target<LEVELS.normal.target&&LEVELS.normal.target<LEVELS.hard.target);
});
test('pit and crate require jumping, while a low light arm requires ducking',()=>{
 for(const type of ['pit','crate','lamp']){
  assert.equal(collides(type,0,0,0,0),true);
  assert.equal(collides(type,2.7,0,0,0),false);
 }
 assert.equal(collides('pit',0,0,1.3,0),false);
 assert.equal(collides('crate',0,0,1.3,0),false);
 assert.equal(collides('pit',0,0,0,.6),true);
 assert.equal(collides('lamp',0,0,0,.6),false);
 assert.equal(collides('lamp',0,0,1.3,0),true);
});
test('harder levels offer fewer snacks and put them nearer hazards, without blocking all lanes',()=>{
 for(let i=0;i<60;i++)for(const r of [.05,.5,.95]){
  const plans=['easy','normal','hard'].map(l=>wavePlan(l,i,()=>r));
  assert.deepEqual(plans.map(p=>p.snacks.length),[4,2,1]);
  assert.equal(plans[2].snacks[0].lane,plans[2].lane);
  assert.ok(plans[2].snacks[0].offset<plans[1].snacks[0].offset);
  for(const p of plans){assert.ok([-1,0,1].includes(p.lane));if(p.type==='lamp')assert.notEqual(p.lane,0);}
  for(const p of plans.slice(0,2))assert.notEqual(p.snacks[0].lane,p.lane);
 }
});
test('pace rises over time but stays bounded with readable gaps between hazard rows',()=>{
 for(const level of Object.keys(LEVELS)){
  const a=pace(level,0),b=pace(level,50),c=pace(level,100),d=pace(level,1000);
  assert.ok(a.speed<b.speed&&b.speed<c.speed);
  assert.ok(a.interval>b.interval&&b.interval>c.interval);
  assert.deepEqual(c,d);
  assert.ok(c.interval>1.3);
 }
});
