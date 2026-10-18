import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as rules from '../dist/rules.js';
import {headPoseWeights} from '../dist/head-turn.js';
import * as scoreFunctions from '../dist/scores.js';
// Run the real game loop with a headless rendering adapter. The collision, input,
// collection, HUD and end-state code are unchanged; no WebGL context is required.
function harness(){
 class Vec{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}set(x,y,z){Object.assign(this,{x,y,z});return this;}setScalar(v){return this.set(v,v,v);}addScaledVector(v,d){this.x+=v.x*d;this.y+=v.y*d;this.z+=v.z*d;return this;}}
 class Obj{constructor(g,m){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.children=[];this.geometry=g;this.material=m;this.visible=true;}add(o){this.children.push(o);}remove(o){this.children=this.children.filter(c=>c!==o);}traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn));}dispose(){}lookAt(){}updateProjectionMatrix(){}}
 const renderer={domElement:{addEventListener(){}},shadowMap:{},setPixelRatio(){},setSize(){},render(){}};
 const tex={repeat:new Vec(),offset:new Vec(),image:null};
 const T=new Proxy({Vector3:Vec,Sprite:class extends Obj{constructor(m){super(null,m);}},WebGLRenderer:class{constructor(){return renderer;}},TextureLoader:class{load(_url,fn){if(fn)queueMicrotask(fn);return tex;}},CanvasTexture:class{constructor(){this.image={};}}},{get:(o,k)=>o[k]||Obj});
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',style:{},appendChild(){},setAttribute(k,v){this[k]=v;}});return elements.get(id);};
 const scene=new Obj(),M={};const mesh=(g,m,x=0,y=0,z=0)=>{const o=new Obj(g,m);o.position.set(x,y,z);return o;};
 const context=vm.createContext({T,...rules,...scoreFunctions,headPoseWeights,wavePlan:(level,index)=>rules.wavePlan(level,index,()=>.05),createWorld:()=>({scene,M,mesh,box:()=>new Obj(),update(){}}),createRunner:()=>({root:new Obj(),update(){}}),document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('brand'),body:{classList:{add(){},remove(){}}},createElement:()=>({getContext:()=>({})}),addEventListener(){}},window:{},devicePixelRatio:1,innerWidth:390,innerHeight:844,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem(){return 0;},setItem(){}},queueMicrotask,Math:Object.assign(Object.create(Math),{random:()=>.05})});
 const code=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,context);
 el('scores-panel').hidden=true;let now=0;return {run:s=>vm.runInContext(s,context),tick:seconds=>{for(let i=0;i<seconds*60;i++){now+=1000/60;vm.runInContext(`frame(${now})`,context);}},el};
}
test('elapsed time without snacks never produces a win',()=>{
 const h=harness();h.run("level='easy';begin();lane=1");h.tick(50);assert.equal(h.run('bones'),0);assert.equal(h.run('progress'),0);assert.equal(h.run('mode'),'play');assert.ok(h.run('distance')>500);
});
test('collecting the required snack count runs the catch sequence and shows victory',()=>{
 const h=harness();h.run("level='easy';begin()");h.tick(22);assert.equal(h.run('bones'),rules.LEVELS.easy.target);assert.equal(h.el('result-title').textContent,'תפסתם את ריו!');assert.equal(h.run('mode'),'end');assert.equal(h.el('modal').hidden,false);
});
test('a hit consumes one heart and one collected snack, and pause freezes the chase',()=>{
 const h=harness();h.run("begin();bones=3;obstacle('pit',0,.2)");h.tick(.1);assert.equal(h.run('hearts'),2);assert.equal(h.run('bones'),2);assert.equal(h.el('hearts')['aria-label'],'נותרו 2 פסילות מתוך 3');assert.equal((h.el('hearts').innerHTML.match(/heart-full/g)||[]).length,2);assert.equal((h.el('hearts').innerHTML.match(/heart-lost/g)||[]).length,1);h.run('pause()');const distance=h.run('distance');h.tick(10);assert.equal(h.run('distance'),distance);h.run('pause()');h.tick(.5);assert.ok(h.run('distance')>distance);
});

test('return to title abandons a run once and restores difficulty selection',()=>{
 const h=harness();h.run("level='easy';begin()");h.tick(2);h.run('openMenu()');assert.equal(h.run('mode'),'paused');h.run('returnHome()');assert.equal(h.run('mode'),'intro');assert.equal(h.el('intro').hidden,false);assert.equal(h.el('hud').hidden,true);assert.equal(h.el('menu').hidden,true);assert.equal(h.run('scores.length'),1);assert.equal(h.run('scores[0].outcome'),'quit');h.run('returnHome()');assert.equal(h.run('scores.length'),1);
 h.run("level='hard';begin()");assert.equal(h.el('bones').textContent,'0 / 16');
});
test('scoreboard pauses a live run and resumes only when opened from play',()=>{
 const h=harness();h.run('begin()');h.tick(1);h.run('openScores()');assert.equal(h.run('mode'),'paused');assert.equal(h.el('scores-panel').hidden,false);const d=h.run('distance');h.tick(3);assert.equal(h.run('distance'),d);h.run('closeScores()');assert.equal(h.run('mode'),'play');
 h.run('pause();openScores();closeScores()');assert.equal(h.run('mode'),'paused');assert.equal(h.run('scores.length'),0);
});
test('victory is recorded once and remains available after returning to title',()=>{
 const h=harness();h.run("level='easy';begin()");h.tick(22);assert.equal(h.run('scores.length'),1);assert.equal(h.run('scores[0].outcome'),'win');h.run('returnHome();openScores()');assert.equal(h.run('scores.length'),1);assert.match(h.el('scores-body').innerHTML,/שחקן/);assert.equal(h.el('leaderboard-table').hidden,false);
});
