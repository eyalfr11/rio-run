import * as T from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
export function createWorld(renderer){
 const scene=new T.Scene();scene.fog=new T.FogExp2(0xb6c3b8,.0125);
 const mat=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.85,...extra});
 function noiseTexture(size,base,amount){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),im=ctx.createImageData(size,size);let seed=19;for(let i=0;i<im.data.length;i+=4){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;const px=(i/4)%size,py=Math.floor(i/4/size);const n=(seed/4294967296-.5)*amount+Math.sin(px*.09+Math.sin(py*.04)*3)*amount*.11;for(let j=0;j<3;j++)im.data[i+j]=base[j]+n;im.data[i+3]=255;}ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);tex.colorSpace=T.SRGBColorSpace;return tex;}
 const soil=noiseTexture(256,[176,164,140],38);soil.repeat.set(9,160);
 const grassTex=noiseTexture(128,[69,90,52],42);grassTex.repeat.set(80,80);
 const bark=noiseTexture(64,[101,82,58],65);bark.repeat.set(3,10);
 const wood=noiseTexture(64,[132,93,58],45);wood.repeat.set(3,1);
 const M={grass:mat(0xadb597,{map:grassTex}),road:mat(0xf4e6c9,{map:soil,bumpMap:soil,bumpScale:.1,roughness:.96}),edge:mat(0xaca894),trunk:mat(0xa28a66,{map:bark,bumpMap:bark,bumpScale:.07}),leaf:mat(0x526c35),lightLeaf:mat(0x718346),darkLeaf:mat(0x354e2b),wood:mat(0xe2c5a0,{map:wood,bumpMap:wood,bumpScale:.05}),gold:mat(0xf7d067,{metalness:.35,roughness:.25,emissive:0xb27716,emissiveIntensity:.1}),metal:mat(0x34423c,{metalness:.78,roughness:.32}),rock:mat(0x777e70,{bumpMap:bark,bumpScale:.1}),water:mat(0x5d8883,{metalness:.65,roughness:.18}),hole:mat(0x211d17,{side:T.DoubleSide}),lamp:mat(0xffe6ae,{emissive:0xffc065,emissiveIntensity:2.8})};
 function mesh(g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}
 function box(w,h,d,m,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z);}
 scene.add(new T.HemisphereLight(0xeaf3f8,0x445330,1.65));const sun=new T.DirectionalLight(0xffdcaa,3.3);sun.position.set(-18,27,-28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:30,bottom:-25,near:1,far:95});sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
 // A sky dome provides the same warm horizon in landscape and portrait.
 const sky=mesh(new T.SphereGeometry(180,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x7eacbd)},bottom:{value:new T.Color(0xf1dfbd)}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(v).y*1.7,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.7)),1.);}'}));sky.castShadow=false;sky.receiveShadow=false;scene.add(sky);
 const holes=Array.from({length:16},()=>new T.Vector3(999,999,0));
 // Cut actual openings in both ground surfaces so a pit has visible depth.
 for(const material of [M.road,M.grass]){material.onBeforeCompile=shader=>{shader.uniforms.holes={value:holes};shader.vertexShader='varying vec3 worldPoint;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nworldPoint=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 worldPoint; uniform vec3 holes[16];\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfor(int i=0;i<16;i++){if(distance(worldPoint.xz,holes[i].xy)<holes[i].z) discard;}');};material.customProgramCacheKey=()=> 'rio-pit-ground';}
 const ground=box(220,.2,220,M.grass,0,-.16,-75);scene.add(ground);const road=box(9,.09,200,M.road,0,-.045,-75);scene.add(road);
 const scenery=[];
 function addScenery(o){scene.add(o);scenery.push(o);return o;}
 // Leaf cards have irregular, light-permeable silhouettes instead of solid spherical crowns.
 const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;const lc=leafCanvas.getContext('2d');let leafSeed=17;const lr=()=>{leafSeed=(leafSeed*1664525+1013904223)>>>0;return leafSeed/4294967296;};
 for(let j=0;j<34;j++){const a=lr()*Math.PI*2,r=Math.sqrt(lr())*48,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;lc.save();lc.translate(x,y);lc.rotate(a);lc.fillStyle=['#65783f','#81984a','#4f6636','#98a766'][j%4];lc.beginPath();lc.ellipse(0,0,5+lr()*4,2.5+lr()*2,0,0,Math.PI*2);lc.fill();lc.strokeStyle='#b2bb6a55';lc.lineWidth=.6;lc.beginPath();lc.moveTo(-5,0);lc.lineTo(5,0);lc.stroke();lc.restore();}
 const leafTexture=new T.CanvasTexture(leafCanvas);leafTexture.colorSpace=T.SRGBColorSpace;const leafMaterial=new T.MeshStandardMaterial({map:leafTexture,alphaTest:.43,side:T.DoubleSide,roughness:.9,color:0xc6d5a6});const leafGeometry=new T.PlaneGeometry(1.45,1.45);
 function tree(x,z,size=1,seed=0){const g=new T.Group();g.add(mesh(new T.CylinderGeometry(.11,.27,4.3,9),M.trunk,0,2.05));for(let j=0;j<4;j++){const a=j*2.3+seed,b=mesh(new T.CylinderGeometry(.035,.10,2.1,8),M.trunk,Math.cos(a)*.6,3.5+j*.35,Math.sin(a)*.6);b.rotation.z=Math.cos(a)*.65;b.rotation.x=Math.sin(a)*.65;g.add(b);}
 // Many smaller, overlapping crowns replace the old three large polygon blobs.
 const crown=new T.InstancedMesh(leafGeometry,leafMaterial,210),leafDummy=new T.Object3D();for(let j=0;j<210;j++){const a=j*2.399+seed,r=.25+Math.sqrt((j*.618)%1)*2.1;leafDummy.position.set(Math.cos(a)*r,3.65+((j*.753)%1)*2.7,Math.sin(a)*r);leafDummy.rotation.set(Math.sin(j)*.8,a,Math.cos(j)*.6);leafDummy.scale.setScalar(.75+(j%4)*.16);leafDummy.updateMatrix();crown.setMatrixAt(j,leafDummy.matrix);}crown.castShadow=true;crown.receiveShadow=true;g.add(crown);g.position.set(x,0,z);g.scale.setScalar(size);return g;}
 for(let i=0;i<36;i++)addScenery(tree((i%2?1:-1)*(7.5+(i*7%15)),-i*4.6,.85+(i%4)*.23,i));
 for(const s of [-1,1]){scene.add(box(.2,.16,200,M.edge,s*4.65,.015,-75));scene.add(box(10,.03,200,M.water,s*32,-.07,-75));}
 function lamp(side,low=false){const g=new T.Group(),height=low?2.15:4.7;g.add(mesh(new T.CylinderGeometry(.065,.105,height,10),M.metal,0,height/2));g.add(mesh(new T.CylinderGeometry(.19,.23,.18,10),M.metal,0,.09));const curve=new T.CatmullRomCurve3([new T.Vector3(0,height-.1,0),new T.Vector3(-side*.2,height+.25,0),new T.Vector3(-side*.9,height+.3,0),new T.Vector3(-side*1.35,height-.15,0)]);g.add(mesh(new T.TubeGeometry(curve,12,.075,8,false),M.metal));g.add(box(.55,.12,.42,M.metal,-side*1.35,height-.22));g.add(box(.4,.035,.3,M.lamp,-side*1.35,height-.29));return g;}
 for(let i=0;i<20;i++){const side=i%2?1:-1,g=lamp(side);g.position.set(side*5.1,0,-i*8.2);addScenery(g);}
 for(let i=0;i<65;i++){const o=mesh(new T.IcosahedronGeometry(.15+i%3*.1,1),M.rock,(i%2?1:-1)*(5.6+i*7%16),.08,-i*2.5);o.scale.y=.5;addScenery(o);}
 for(let i=0;i<8;i++){const g=new T.Group();g.add(box(1.8,.12,.55,M.wood,0,.53));g.add(box(1.8,.55,.1,M.wood,0,.95,-.23));for(const side of [-1,1])g.add(box(.1,.55,.5,M.metal,side*.68,.27));g.rotation.y=i%2?.4:-.4;g.position.set((i%2?1:-1)*6,0,-i*20-13);addScenery(g);}
 // Instanced grass keeps ground detail affordable on phones.
 const bladeGeo=new T.PlaneGeometry(.055,.43),bladeMat=mat(0x678044,{side:T.DoubleSide});const grass=new T.InstancedMesh(bladeGeo,bladeMat,3200),dummy=new T.Object3D();let seed=101;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<3200;i++){dummy.position.set((i%2?1:-1)*(4.9+rand()*18),.13,-rand()*164);dummy.rotation.set(-.15,rand()*Math.PI,rand()*.3);dummy.scale.setScalar(.45+rand()*1.2);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}grass.receiveShadow=true;scene.add(grass);
 for(let i=0;i<12;i++){let h=mesh(new T.SphereGeometry(19,16,12),mat(0x879a83),-105+i*19,-5,-137-(i%3)*5);h.scale.y=.6;h.castShadow=false;scene.add(h);}const disc=mesh(new T.SphereGeometry(3.4,24,16),new T.MeshBasicMaterial({color:0xfff0c8}),-38,24,-127);disc.castShadow=false;scene.add(disc);
 const particleCanvas=document.createElement('canvas');particleCanvas.width=particleCanvas.height=32;const pc=particleCanvas.getContext('2d'),gradient=pc.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#ffffee');gradient.addColorStop(.15,'#fff3c5aa');gradient.addColorStop(1,'#fff0');pc.fillStyle=gradient;pc.fillRect(0,0,32,32);const moteTex=new T.CanvasTexture(particleCanvas);const pos=[];for(let i=0;i<100;i++)pos.push((rand()-.5)*28,rand()*6,-rand()*75);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));const motes=new T.Points(geometry,new T.PointsMaterial({color:0xffe8b3,size:.14,map:moteTex,transparent:true,depthWrite:false,opacity:.55}));scene.add(motes);
 function update(dt,speed,pits){for(const t of scenery){t.position.z+=speed*dt;if(t.position.z>14)t.position.z-=164;}grass.position.z=(grass.position.z+speed*dt)%40;soil.offset.y-=speed*dt/200;for(let i=0;i<holes.length;i++){const p=pits[i];holes[i].set(p?p.g.position.x:999,p?p.g.position.z:999,p?1.02:0);}motes.position.z=(motes.position.z+speed*dt*.4)%20;motes.rotation.y=Math.sin(performance.now()*.0001)*.015;}
 return {scene,M,mesh,box,lamp,update};
}
export function createRunner(scene,M,mesh,box){
 const root=new T.Group();scene.add(root);const body=new T.Group();root.add(body);
 const skin=new T.MeshStandardMaterial({color:0xc38d6f,roughness:.58}),cloth=new T.MeshStandardMaterial({color:0x3c8d8b,roughness:.92}),dark=new T.MeshStandardMaterial({color:0x223d4c,roughness:.87}),hair=new T.MeshStandardMaterial({color:0x36281f,roughness:.9}),shoe=new T.MeshStandardMaterial({color:0xe8e3ce,roughness:.7});
 function capsule(r,len,m,x,y,z=0){return mesh(new T.CapsuleGeometry(r,len,4,10),m,x,y,z);}
 const hips=capsule(.19,.15,dark,0,.95);hips.scale.x=1.25;body.add(hips);
 const torso=capsule(.24,.35,cloth,0,1.34);torso.scale.set(1,.9,.65);body.add(torso);const stripe=box(.045,.42,.015,M.edge,0,1.36,.16);body.add(stripe);
 body.add(mesh(new T.CylinderGeometry(.075,.09,.17,10),skin,0,1.68));let head=mesh(new T.SphereGeometry(.17,16,12),skin,0,1.88);head.scale.set(.86,1.15,.95);body.add(head);let hairCap=mesh(new T.SphereGeometry(.176,14,12,0,Math.PI*2,0,Math.PI*.65),hair,0,1.91);hairCap.rotation.x=-.25;body.add(hairCap);const pony= new T.Group();pony.position.set(0,1.94,.15);pony.add(capsule(.08,.22,hair,0,-.13,.04));body.add(pony);
 let detailed,mixer,runAction,idleAction,previousClock=0,wasWinning=false;const runBones={};const axis=new T.Vector3(),parentQuat=new T.Quaternion(),turn=new T.Quaternion();let previousX=0;
 new GLTFLoader().load('assets/runner.glb',gltf=>{
  detailed=gltf.scene;const bounds=new T.Box3().setFromObject(detailed),height=bounds.max.y-bounds.min.y,scale=1.94/height;detailed.scale.setScalar(scale);detailed.userData.baseScale=scale;detailed.rotation.y=Math.PI;
  detailed.traverse(o=>{if(o.isBone)runBones[o.name.replace(/[^a-zA-Z]/g,'').toLowerCase()]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.roughness=.78;o.material.metalness=.08;}}});root.add(detailed);
  mixer=new T.AnimationMixer(detailed);runAction=mixer.clipAction(gltf.animations.find(a=>a.name==='Walking'));idleAction=mixer.clipAction(gltf.animations.find(a=>a.name==='Idle'));runAction.play();
 },undefined,()=>{/* The articulated runner remains available if the detailed asset fails. */});
 const limbs=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.14,.94,0);leg.add(capsule(.105,.31,dark,0,-.23));const shin=new T.Group();shin.position.y=-.46;shin.add(capsule(.078,.3,dark,0,-.2));const foot=capsule(.09,.19,shoe,0,-.43,-.08);foot.rotation.x=Math.PI/2;shin.add(foot);leg.add(shin);body.add(leg);
 const arm=new T.Group();arm.position.set(side*.29,1.53,0);arm.add(capsule(.079,.26,cloth,side*.02,-.18));const forearm=new T.Group();forearm.position.set(side*.02,-.35,0);forearm.add(capsule(.062,.22,skin,0,-.14));forearm.add(mesh(new T.SphereGeometry(.073,10,8),skin,0,-.3));arm.add(forearm);body.add(arm);limbs.push({side,leg,shin,arm,forearm});}
 const shade=mesh(new T.CircleGeometry(.4,24),new T.MeshBasicMaterial({color:0x243428,transparent:true,opacity:.25,depthWrite:false}),0,.015,0);shade.rotation.x=-Math.PI/2;shade.scale.y=.55;root.add(shade);
 function update({x,jump,duck,clock,running,speed,invincible,win}){root.position.set(x,0,0);root.visible=running||win;const phase=clock*(speed||13)*.9,lean=duck>0?.92:.12;body.position.y=jump+(duck>0?-.35:Math.abs(Math.sin(phase))* .045);body.rotation.x=-lean;body.rotation.z=0;body.visible=invincible<=0||Math.floor(clock*12)%2===0;pony.rotation.x=Math.sin(phase)*.2;for(const l of limbs){const swing=Math.sin(phase)*l.side;l.leg.rotation.x=jump>0?l.side*.5:duck>0?-.7:swing*.75;l.shin.rotation.x=duck>0?1.9:Math.max(0,-swing)*1.2+.18;l.arm.rotation.x=duck>0?-.9:-swing*.65;l.forearm.rotation.x=-.95;}
 if(detailed){body.visible=false;detailed.visible=invincible<=0||Math.floor(clock*12)%2===0;const dt=Math.max(0,Math.min(.04,clock-previousClock));mixer.timeScale=win?.45:Math.max(1.3,(speed||13)/8);mixer.update(dt);detailed.position.y=jump;detailed.rotation.x=duck>0?-.5:jump>0?-.12:-.07;const s=detailed.userData.baseScale;detailed.scale.set(s,s*(duck>0?.62:1),s);if(win&&!wasWinning){idleAction.reset().play();runAction.crossFadeTo(idleAction,.3,false);}if(!win&&wasWinning){runAction.reset().play();idleAction.crossFadeTo(runAction,.2,false);}wasWinning=win;
  if(!win){
   const stride=clock*10.5*Math.max(.85,(speed||13)/13),swing=Math.sin(stride),stridePower=duck>0?.25:jump>0?.5:1;
   const rotateJoint=(name,angle)=>{const b=runBones['mixamorig'+name.toLowerCase()];if(!b)return;b.parent.updateWorldMatrix(true,false);b.parent.getWorldQuaternion(parentQuat);axis.set(1,0,0).applyQuaternion(parentQuat.invert());turn.setFromAxisAngle(axis,angle);b.quaternion.premultiply(turn);b.updateMatrixWorld(true);};
   // Add a running flight phase, bent elbows and high knee recovery to the walking base clip.
   rotateJoint('LeftUpLeg',swing*.35*stridePower);rotateJoint('RightUpLeg',-swing*.35*stridePower);
   rotateJoint('LeftLeg',-Math.max(0,-swing)*.65*stridePower);rotateJoint('RightLeg',-Math.max(0,swing)*.65*stridePower);
   rotateJoint('LeftArm',-swing*.23*stridePower);rotateJoint('RightArm',swing*.23*stridePower);
   rotateJoint('LeftForeArm',.55);rotateJoint('RightForeArm',.55);
   detailed.position.y+=jump===0&&duck===0?Math.abs(Math.sin(stride))*.065:0;
   detailed.rotation.z=T.MathUtils.clamp(-(x-previousX)*1.5,-.13,.13);previousX=x;
  }
 }previousClock=clock;
 shade.scale.set(1-jump*.15,.55-jump*.08,1);if(win){body.rotation.x=-.25;limbs.forEach(l=>{l.arm.rotation.x=-1.1;l.forearm.rotation.x=-.4;});}}
 return {root,update};
}
