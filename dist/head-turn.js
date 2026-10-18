const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Long forward-running phases, with two unequal shoulder checks per cycle.
export function headLookBack(time){
 const t=((time%15)+15)%15;
 const glance=(start,hold)=>smooth((t-start)/.38)*(1-smooth((t-start-.38-hold)/.42));
 return Math.max(glance(3.6,1.25),glance(10.3,.85));
}
export function headPoseWeights(time,mode='play'){
 const back=mode==='intro'?1:headLookBack(time);
 const forward=Math.max(0,1-back*2),rear=Math.max(0,back*2-1);
 return [forward,1-forward-rear,rear];
}
