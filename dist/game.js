import {readScores,appendScore,leaderboard,recentScores,formatTime,escapeHTML} from './scores.js';
import * as T from './assets/three.module.js';
import {headPoseWeights} from './head-turn.js';
import {createWorld,createRunner} from './world.js';
import {LEVELS,clamp,chaseProgress,pace,collides,wavePlan} from './rules.js?v=3';
const $=id=>document.getElementById(id),start=$('start');start.disabled=true;
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;throw e;}
renderer.domElement.tabIndex=0;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;$('world').appendChild(renderer.domElement);
const world=createWorld(renderer),{scene,M,mesh,box}=world;const camera=new T.PerspectiveCamera(50,1,.1,240),runner=createRunner(scene,M,mesh,box);
const tex=new T.TextureLoader().load('assets/rio-run-sheet.png',()=>{start.disabled=false;$('loading').textContent='מוכן למחשב ולטלפון · בלי התקנה';},undefined,()=>{$('loading').textContent='לא הצלחנו לטעון את ריו. רעננו את הדף.';});tex.colorSpace=T.SRGBColorSpace;tex.repeat.set(.5,.5);tex.magFilter=T.LinearFilter;
const forwardTex=new T.TextureLoader().load('assets/rio-run-forward.png');
const profileTex=new T.TextureLoader().load('assets/rio-run-profile.png');
// Sample complete atlas frames on the GPU. No horizontal strips or low-resolution canvas copy.
for(const atlas of [tex,forwardTex,profileTex]){atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.LinearFilter;atlas.minFilter=T.LinearMipmapLinearFilter;atlas.generateMipmaps=true;}
const poseBlend=new T.Vector3(0,0,1);
const dogMaterial=new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:.008});
dogMaterial.onBeforeCompile=shader=>{
 shader.uniforms.rioForward={value:forwardTex};shader.uniforms.rioProfile={value:profileTex};shader.uniforms.rioPose={value:poseBlend};
 shader.fragmentShader='uniform sampler2D rioForward; uniform sampler2D rioProfile; uniform vec3 rioPose;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
  vec4 backSample=texture2D(map,vMapUv);
  vec4 frontSample=texture2D(rioForward,vMapUv);
  vec4 sideSample=texture2D(rioProfile,vMapUv);
  float rioAlpha=frontSample.a*rioPose.x+sideSample.a*rioPose.y+backSample.a*rioPose.z;
  vec3 rioRGB=(frontSample.rgb*frontSample.a*rioPose.x+sideSample.rgb*sideSample.a*rioPose.y+backSample.rgb*backSample.a*rioPose.z)/max(rioAlpha,0.00001);
  diffuseColor*=vec4(rioRGB,rioAlpha);
 `);
};
dogMaterial.customProgramCacheKey=()=> 'rio-full-frame-head-blend-v1';
const rio=new T.Sprite(dogMaterial);scene.add(rio);const shadow=mesh(new T.CircleGeometry(.7,32),new T.MeshBasicMaterial({color:0x243428,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;scene.add(shadow);
const objects=[],sparks=[],quotes=['מכיר, מכיר. אבל לא עוצר.','הטיול שלכם. המסלול שלי.','אני לא מתעלם. אני פשוט לא רואה חטיף.','לא מציק לא מציק, מניח…','שמח!','קודם תראה מה הבאת.','הפרווה טבעית. הפוזה מקצועית.'];
let mode='intro',level='normal',lane=0,playerX=0,jump=0,vy=0,duck=0,hearts=3,bones=0,totalBones=0,distance=0,progress=0,invincible=0,spawn=0,elapsed=0,combo=0,shake=0,clock=0,last=0,quoteClock=0,wave=0,muted=true,audio,finishTime=0;
let runSaved=true,scoreReturnMode='intro',scoreFocus=null,scores=[],scoresPersisted=true;
try{scores=readScores(localStorage);$('player-name').value=localStorage.getItem('rio-run-player')||'';}catch{}
let best=0;try{best=Number(localStorage.getItem('rio-run-best-v2')||0);}catch{}if(best)$('best').textContent=`השיא המקומי שלכם: ${best} מטר`;
function beep(freq=640,duration=.1,type='sine'){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audio.currentTime+duration);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function say(t){$('quote').textContent=t;quoteClock=0;}
const particleGeo=new T.SphereGeometry(.045,4,4);function burst(x,z,color=0xffdc83,count=14){for(let i=0;i<count;i++){const o=mesh(particleGeo,new T.MeshBasicMaterial({color}),x,.9,z);scene.add(o);sparks.push({o,v:new T.Vector3((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4),life:.7});}}
function boneObject(){const g=new T.Group(),shaft=mesh(new T.CylinderGeometry(.085,.085,.5,8),M.gold);shaft.rotation.z=Math.PI/2;g.add(shaft);for(const s of [-1,1])for(const y of [-.1,.1])g.add(mesh(new T.SphereGeometry(.135,10,8),M.gold,s*.26,y));const ring=mesh(new T.TorusGeometry(.49,.012,5,32),M.gold);ring.rotation.x=Math.PI/2;g.add(ring);return g;}
function obstacle(type,l,z){const g=new T.Group();if(type==='bone'){g.add(boneObject());g.position.y=1.05;}else if(type==='crate'){g.add(box(1.3,.98,1.05,M.wood,0,.49));for(const y of [.14,.81])g.add(box(1.38,.1,1.1,M.edge,0,y));for(const x of [-.5,.5])g.add(box(.1,.97,1.1,M.wood,x,.5));let diagonal=box(.1,1.32,.07,M.edge,0,.5,.57);diagonal.rotation.z=.83;g.add(diagonal);}else if(type==='pit'){
 const wall=mesh(new T.CylinderGeometry(1.02,.65,1.15,32,1,true),M.hole,0,-.57);g.add(wall);const floor=mesh(new T.CircleGeometry(.7,32),M.hole,0,-1.12);floor.rotation.x=-Math.PI/2;g.add(floor);const rim=mesh(new T.TorusGeometry(1.04,.075,7,32),M.rock,0,-.025);rim.rotation.x=Math.PI/2;g.add(rim);
 for(let i=0;i<9;i++){const a=i*2.399,s=.08+i%3*.035;g.add(mesh(new T.DodecahedronGeometry(s,0),M.rock,Math.cos(a)*1.12,.04,Math.sin(a)*1.12));}
 }else if(type==='lamp'){
 // Lamp posts stand beside the path; a low arm covers the outside lane.
 const side=l<0?-1:1,postX=side*5.0-l*2.7;
 const height=1.78;g.add(mesh(new T.CylinderGeometry(.085,.14,height,12),M.metal,postX,height/2));g.add(mesh(new T.CylinderGeometry(.24,.28,.2,12),M.metal,postX,.1));const length=Math.abs(postX)+.85;g.add(box(length,.18,.25,M.metal,postX/2-side*.4,height));g.add(box(1.6,.18,.65,M.metal,0,height-.06));g.add(box(1.45,.035,.5,M.lamp,0,height-.17));
 // Yellow reflectors communicate the low crossbar even against bright foliage.
 for(const x of [-.6,.6])g.add(box(.1,.2,.68,M.gold,x,height-.06));
 }g.position.x=l*2.7;g.position.z=z;scene.add(g);objects.push({g,type,l,hit:false});}
function disposeObject(o){o.g.traverse(n=>{if(n.geometry)n.geometry.dispose();});scene.remove(o.g);}
function clear(){objects.forEach(disposeObject);objects.length=0;sparks.forEach(p=>{scene.remove(p.o);p.o.material.dispose();});sparks.length=0;}
function updateHUD(){progress=chaseProgress(bones,LEVELS[level].target);$('meters').textContent=Math.floor(distance);$('bones').textContent=`${bones} / ${LEVELS[level].target}`;$('hearts').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<hearts?'heart-full':'heart-lost'}" aria-hidden="true">${i<hearts?'♥':'♡'}</span>`).join('');$('hearts').setAttribute('aria-label',`נותרו ${hearts} פסילות מתוך 3`);$('progress').style.width=(progress*100)+'%';$('gap').textContent=progress>=1?'ריו בידיים שלכם!':`עוד ${LEVELS[level].target-bones} חטיפים לתפיסה · ${Math.ceil((1-progress)*20)} מ׳ מריו`;$('pace').textContent=`קצב ${pace(level,elapsed).stage} / 4`;}
function levelText(){const c=LEVELS[level];$('mission').innerHTML=`<b>איך מנצחים?</b> אוספים <strong>${c.target} חטיפים</strong> כדי לתפוס את ריו. כל חטיף מקרב; פגיעה מאבדת לב וחטיף אחד.<small>${c.trail===1?'חטיף בודד ליד מכשול':c.trail+' חטיפים בכל רצף'} · המהירות עולה לאורך המרדף</small>`;}
function begin(){if(!runSaved)saveRun('quit');clear();$('scores-panel').hidden=$('exit-panel').hidden=true;$('world').hidden=false;$('stop-controls').hidden=false;runSaved=false;mode='play';lane=playerX=jump=vy=duck=0;hearts=3;bones=totalBones=distance=progress=elapsed=combo=invincible=shake=0;spawn=.65;wave=0;finishTime=0;$('intro').hidden=$('hero-label').hidden=$('modal').hidden=true;$('hud').hidden=$('mobile-controls').hidden=$('pause').hidden=$('menu').hidden=false;document.body.classList.add('playing');$('combo').textContent='';say(`אוספים ${LEVELS[level].target} חטיפים — ותופסים את ריו!`);updateHUD();renderer.domElement.focus?.();beep(480,.18);}
function finish(win){saveRun(win?'win':'loss');mode=win?'catch':'end';finishTime=0;best=Math.max(best,Math.floor(distance));try{localStorage.setItem('rio-run-best-v2',String(best));}catch{}$('resume').hidden=true;$('restart').textContent='עוד מרדף ←';$('result-kicker').textContent=win?'הוד פרוותו נכנע. זמנית.':'למלך יש תוכניות אחרות';$('result-title').textContent=win?'תפסתם את ריו!':'ריו: 1. אתם: 0.';$('result-text').textContent=win?'״אפשר עוד טיול. התעריף הוא חטיף.״':'״אני לא בורח. אני פשוט לא רואה חטיף ביד שלך.״';$('result-stats').textContent=`זמן ${formatTime(elapsed)} · ${Math.floor(distance)} מטר · ${totalBones} חטיפים · ${LEVELS[level].name}`;if(!win){$('modal').hidden=false;$('restart').focus?.();}else{say('תפסתם! עכשיו אפשר לצאת לטיול.');burst(playerX,-2,0xdbfc73,32);}beep(win?900:180,.4);}
function pause(){if(mode==='play'){mode='paused';$('modal').hidden=false;$('resume').hidden=false;$('result-kicker').textContent='הפסקת חטיף';$('result-title').textContent='גם לבוס מגיע לנוח.';$('result-text').textContent='המרדף ימשיך בדיוק מאיפה שעצרתם.';$('result-stats').textContent='';$('restart').textContent='להתחיל מחדש';$('resume').focus?.();}else if(mode==='paused'){mode='play';$('modal').hidden=true;renderer.domElement.focus?.();}}
function saveRun(outcome){
 if(runSaved)return;runSaved=true;
 const player=($('player-name').value||'').trim().slice(0,24)||'שחקן';
 const score={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,player,level,outcome,seconds:Math.round(elapsed*100)/100,distance:Math.floor(distance),snacks:totalBones,hearts,at:Date.now()};
 let storage;try{storage=localStorage;}catch{}const result=appendScore(scores,score,storage);scores=result.scores;scoresPersisted=result.persisted;
 try{localStorage.setItem('rio-run-player',player);}catch{}
}
function returnHome(){
 if(!runSaved)saveRun('quit');clear();mode='intro';jump=vy=duck=shake=invincible=0;touch=null;rio.material.rotation=0;
 $('modal').hidden=$('hud').hidden=$('mobile-controls').hidden=$('pause').hidden=$('menu').hidden=$('scores-panel').hidden=$('stop-controls').hidden=$('exit-panel').hidden=true;
 $('world').hidden=false;$('intro').hidden=$('hero-label').hidden=false;document.body.classList.remove('playing');
 if(best)$('best').textContent=`השיא המקומי שלכם: ${best} מטר`;levelText();start.focus?.();
}
function exitGame(){
 if(!runSaved)saveRun('quit');clear();mode='exited';touch=null;
 for(const id of ['intro','hero-label','hud','mobile-controls','pause','menu','modal','scores-panel','stop-controls','world'])$(id).hidden=true;
 document.body.classList.remove('playing');$('exit-panel').hidden=false;audio?.suspend?.();$('exit-home').focus?.();
}
function renderScores(){
 const selected=$('scores-level').value,ranked=leaderboard(scores,selected),history=recentScores(scores,selected);
 $('scores-empty').hidden=ranked.length>0;$('leaderboard-table').hidden=!ranked.length;$('history-empty').hidden=history.length>0;$('history-table').hidden=!history.length;
 $('scores-body').innerHTML=ranked.map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(s.player)}</td><td dir="ltr">${formatTime(s.seconds)}</td><td class="table-hearts">${'♥'.repeat(s.hearts)}</td></tr>`).join('');
 const outcomes={win:'תפסנו את ריו 🏆',loss:'ריו ברח',quit:'המרדף הופסק'};
 $('history-body').innerHTML=history.map(s=>`<tr><td>${escapeHTML(s.player)}</td><td>${outcomes[s.outcome]}</td><td dir="ltr">${formatTime(s.seconds)}</td><td>${s.snacks}</td><td>${s.distance} מ׳</td></tr>`).join('');
 $('score-storage-note').textContent=scoresPersisted?'התוצאות נשמרות בדפדפן ובמכשיר הזה. הן אינן משותפות בין מכשירים.':'שמירת התוצאות חסומה בדפדפן הזה. התוצאות יוצגו עד סגירת הדף.';
}
function openScores(){
 if(!$('scores-panel').hidden)return;scoreFocus=document.activeElement;scoreReturnMode=mode;
 if(mode==='play')mode='paused';$('scores-level').value=level;renderScores();$('scores-panel').hidden=false;$('scores-close').focus?.();
}
function closeScores(){
 if($('scores-panel').hidden)return;$('scores-panel').hidden=true;
 if(scoreReturnMode==='play'&&mode==='paused')mode='play';scoreFocus?.focus?.();
}
function openMenu(){if(mode==='play')pause();else if(mode==='intro')returnHome();}
function action(a){if(mode!=='play')return;if(a==='left')lane=Math.max(-1,lane-1);if(a==='right')lane=Math.min(1,lane+1);if(a==='jump'&&jump===0){duck=0;vy=8.4;beep(420,.13);}if(a==='duck'&&jump===0){duck=.85;beep(220,.08);}}
$('stop-game').onclick=$('exit-home').onclick=returnHome;
$('intro-exit').onclick=$('modal-exit').onclick=exitGame;
$('menu').onclick=openMenu;$('modal-home').onclick=returnHome;
$('scores-open').onclick=$('intro-scores').onclick=$('result-scores').onclick=openScores;$('scores-close').onclick=$('scores-back').onclick=closeScores;$('scores-level').onchange=renderScores;
document.querySelector('.brand').onclick=e=>{e.preventDefault();if(mode==='play'||mode==='paused')openMenu();else returnHome();};
addEventListener('pagehide',()=>{if(!runSaved)saveRun('quit');});
addEventListener('pageshow',e=>{if(e.persisted&&mode!=='intro')returnHome();});
start.onclick=begin;$('restart').onclick=begin;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♫':'♪';$('sound').setAttribute('aria-label',muted?'הפעלת צלילים':'השתקת צלילים');$('sound').style.color=muted?'':'#dbfc73';beep();};document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{level=b.dataset.level;document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('selected',x===b));levelText();});document.querySelectorAll('[data-action]').forEach(b=>b.onpointerdown=e=>{e.preventDefault();action(b.dataset.action);});
addEventListener('keydown',e=>{
 if(e.key==='Tab'){
  const panel=!$('exit-panel').hidden?$('exit-panel'):!$('scores-panel').hidden?$('scores-panel'):!$('modal').hidden?$('modal'):null;
  if(panel){const focusable=[...panel.querySelectorAll('button,a[href],select,input')].filter(n=>!n.hidden&&!n.disabled&&n.getClientRects().length),first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }
 const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',' ':'jump',ArrowDown:'duck',a:'left',d:'right',w:'jump',s:'duck'};if(e.key==='Escape'){if(!$('scores-panel').hidden)closeScores();else pause();return;}if(mode!=='play'||/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target?.tagName||''))return;if(map[e.key]){e.preventDefault();if(!e.repeat)action(map[e.key]);}});let touch;renderer.domElement.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointerup',e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;if(Math.max(Math.abs(dx),Math.abs(dy))>22)action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'duck':'jump');touch=null;});renderer.domElement.addEventListener('pointercancel',()=>touch=null);document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause();});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();levelText();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.04);last=now;if(mode==='exited')return;if(mode!=='paused'&&$('scores-panel').hidden)clock+=dt;const playing=mode==='play',mobile=innerWidth<700,{speed,interval,stage}=pace(level,elapsed);
 if(playing){elapsed+=dt;distance+=speed*dt;spawn-=dt;invincible=Math.max(0,invincible-dt);duck=Math.max(0,duck-dt);shake=Math.max(0,shake-dt*2);if(vy!==0||jump>0){jump+=vy*dt;vy-=22*dt;if(jump<=0){jump=vy=0;}}
 playerX+=(lane*2.7-playerX)*Math.min(1,dt*12);
 if(spawn<0){const plan=wavePlan(level,wave++);obstacle(plan.type,plan.lane,-78);for(const s of plan.snacks){const snackLane=level==='hard'?plan.lane:s.lane;obstacle('bone',snackLane,-78+s.offset);}spawn=interval+Math.random()*.3;}
 for(let i=objects.length-1;i>=0;i--){const o=objects[i],previous=o.g.position.z;o.g.position.z+=speed*dt;if(o.type==='bone'){o.g.rotation.y=clock*2;o.g.position.y=1.02+Math.sin(clock*3+o.g.position.z)*.09;}
 if(!o.hit&&previous<.4&&o.g.position.z>=.4){o.hit=true;if(o.type==='bone'){if(Math.abs(playerX-o.l*2.7)<1.03&&jump<1.55){o.g.visible=false;bones++;totalBones++;combo++;burst(playerX,0);beep(600+Math.min(combo,10)*35,.07);$('combo').textContent=`+1 חטיף · עוד ${Math.max(0,LEVELS[level].target-bones)} לתפיסה`;say(bones>=LEVELS[level].target?'זהו! תפסנו את המלך.':`ריו התקרב! נשארו ${LEVELS[level].target-bones} חטיפים.`);}}
 else if(invincible<=0&&collides(o.type,playerX,o.l*2.7,jump,duck)){hearts--;bones=Math.max(0,bones-1);combo=0;invincible=1.65;shake=.6;beep(110,.25,'sawtooth');say(o.type==='pit'?'בור! קופצים מעליו או מחליפים נתיב.':o.type==='lamp'?'עמוד נמוך! מתכופפים או זזים לצד.':'ארגז! קופצים או מחליפים נתיב.');$('combo').textContent='−1 לב · ריו התרחק בחטיף';if(hearts<=0){finish(false);updateHUD();break;}}}
 if(o.g.position.z>12){disposeObject(o);objects.splice(i,1);}}
 quoteClock+=dt;if(quoteClock>10){say(quotes[Math.floor(Math.random()*quotes.length)]);$('combo').textContent='';}updateHUD();if(bones>=LEVELS[level].target&&mode==='play')finish(true);
 }
 if(mode==='catch'&&$('scores-panel').hidden){finishTime+=dt;if(finishTime>1.7){mode='end';$('modal').hidden=false;$('restart').focus?.();}}
 const moving=playing?speed:mode==='intro'?1.4:0;world.update(dt,moving,objects.filter(o=>o.type==='pit'));
 for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];if(mode!=='paused'){p.life-=dt;p.v.y-=9*dt;p.o.position.addScaledVector(p.v,dt);p.o.scale.setScalar(Math.max(0,p.life));}if(p.life<=0){scene.remove(p.o);p.o.material.dispose();sparks.splice(i,1);}}
 if(mode==='intro'){runner.root.visible=false;camera.position.set(mobile?0:-4,mobile?3.2:3.0,mobile?9:7.5);camera.lookAt(mobile?0:1,1.1,-12);rio.position.set(mobile?.7:2.3,mobile?2.1:2.0,-2);rio.scale.setScalar(mobile?3.5:4.3);}else{
 const won=bones>=LEVELS[level].target,visualGap=20*(1-chaseProgress(bones,LEVELS[level].target));const dogZ=-2.2-visualGap*.8;rio.position.z+=(dogZ-rio.position.z)*Math.min(1,dt*3);rio.position.x+=((won?playerX:Math.sin(clock*.5)*1.2)-rio.position.x)*Math.min(1,dt*2);rio.position.y=.86+(playing?Math.abs(Math.sin(clock*11))*.06:0);rio.scale.set(1.72,1.8*(1+Math.sin(clock*22)*.014),1);rio.material.rotation=playing?Math.sin(clock*5)*.022:0;
 camera.position.set(playerX*.28+(Math.random()-.5)*shake*.1,mobile?4.1:3.5,mobile?8.2:7.2);camera.lookAt(playerX*.35,1.1,-11);runner.update({x:playerX,jump,duck,clock,running:mode!=='intro',speed,invincible,win:won});}
 const anim=Math.floor(clock*(mode==='intro'?5:13))%4;
 tex.offset.set((anim%2)*.5,anim<2?.5:0);
 const weights=headPoseWeights(elapsed,mode);
 const ready=forwardTex.image?.width&&profileTex.image?.width;
 poseBlend.set(ready?weights[0]:0,ready?weights[1]:0,ready?weights[2]:1);
 shadow.position.x=rio.position.x;shadow.position.z=rio.position.z;shadow.scale.set(mode==='intro'?1.5:1,.6,1);renderer.render(scene,camera);
}requestAnimationFrame(frame);
