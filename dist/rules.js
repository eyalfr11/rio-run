export const LEVELS = Object.freeze({
  easy:{name:'רגוע',target:8,trail:4,speed:10.5,interval:2.65,close:false},
  normal:{name:'שובב',target:12,trail:2,speed:13,interval:2.25,close:false},
  hard:{name:'מלך הבריחות',target:16,trail:1,speed:15,interval:1.95,close:true}
});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function chaseProgress(collected,target){return clamp(collected/target,0,1);}
export function pace(level,seconds){const c=LEVELS[level],ramp=clamp(seconds/100,0,1);return {speed:c.speed*(1+ramp*.55),interval:c.interval*(1-ramp*.3),stage:1+Math.floor(Math.min(seconds,99)/25)};}
export function collides(type,playerX,obstacleX,jump,duck){
  if(Math.abs(playerX-obstacleX)>1.03)return false;
  if(type==='lamp')return duck<=0 || jump>.12;
  if(type==='pit')return jump<.9;
  return jump<1.05;
}
export function wavePlan(level,index,random=Math.random){
  const cfg=LEVELS[level];let lane=Math.floor(random()*3)-1;
  const type=['crate','pit','lamp','crate','lamp','pit'][index%6];
  if(type==='lamp'&&lane===0)lane=index%2?1:-1;
  const safe=lane===0?(random()<.5?-1:1):0;
  const snackLane=cfg.close?lane:safe;
  // Hard-mode snacks lead directly into a hazard: the obstacle arrives 0.2–0.3s later.
  const snacks=Array.from({length:cfg.trail},(_,i)=>({lane:snackLane,offset:cfg.close?4:level==='normal'?6+i*3.2:8+i*3.5}));
  return {lane,type,snacks};
}
