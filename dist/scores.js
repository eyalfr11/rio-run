export const SCORE_KEY='rio-run-scores-v1';
const validLevel=v=>['easy','normal','hard'].includes(v);
export function normalizeScores(value){
 if(!Array.isArray(value))return [];
 return value.filter(s=>s&&typeof s.id==='string'&&typeof s.player==='string'&&validLevel(s.level)&&['win','loss','quit'].includes(s.outcome)&&[s.seconds,s.distance,s.snacks,s.hearts,s.at].every(Number.isFinite)&&s.seconds>=0&&s.distance>=0&&s.snacks>=0&&s.hearts>=0&&s.hearts<=3).slice(0,100).map(s=>({...s,player:s.player.slice(0,24)}));
}
export function readScores(storage){try{return normalizeScores(JSON.parse(storage.getItem(SCORE_KEY)||'[]'));}catch{return [];}}
export function appendScore(scores,score,storage){const next=normalizeScores([score,...scores]);let persisted=true;try{storage.setItem(SCORE_KEY,JSON.stringify(next));}catch{persisted=false;}return {scores:next,persisted};}
export function leaderboard(scores,level){return scores.filter(s=>s.level===level&&s.outcome==='win').slice().sort((a,b)=>a.seconds-b.seconds||b.hearts-a.hearts||a.at-b.at).slice(0,10);}
export function recentScores(scores,level){return scores.filter(s=>s.level===level).slice().sort((a,b)=>b.at-a.at).slice(0,20);}
export function formatTime(seconds){const tenths=Math.max(0,Math.round(seconds*10)),m=Math.floor(tenths/600),s=Math.floor(tenths/10)%60;return `${m}:${String(s).padStart(2,'0')}.${tenths%10}`;}
export function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
