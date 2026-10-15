/* 連続N日+閾値枚→翌日マイナス→翌々日検証。将来の出玉を保証しません。 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const day=(s,add)=>new Date(Date.parse(s+"T12:00:00Z")+add*86400000).toISOString().slice(0,10);
const num=n=>Number(n).toLocaleString("ja-JP",{maximumFractionDigits:1});
const signed=n=>(n>0?"+":"")+num(n);
function mount(){
if($("riseFallFollowPanel"))return;
const style=document.createElement("style");
style.textContent="#riseFallFollowPanel .rf-controls{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}#riseFallFollowPanel .rf-controls label{display:flex;align-items:center;gap:5px;font-size:13px}#riseFallFollowPanel select{width:auto;padding:7px}#riseFallFollowPanel .rf-scroll{overflow-x:auto}#riseFallFollowPanel table{min-width:720px}#riseFallFollowPanel td,#riseFallFollowPanel th{text-align:right;white-space:nowrap}#riseFallFollowPanel td:first-child,#riseFallFollowPanel th:first-child{text-align:left}#riseFallFollowPanel .rf-summary{margin:12px 0;padding:12px;background:#f1f7fb;border-radius:9px;line-height:1.8}#riseFallFollowPanel .rf-pending{background:#fff8e8}#riseFallFollowPanel .rf-note{font-size:12px;color:#667085;line-height:1.8;margin-top:10px}";
document.head.appendChild(style);
const p=document.createElement("section");
p.id="riseFallFollowPanel";p.className="panel";
p.innerHTML='<h2>大幅上昇 → 翌日マイナス → その次の日</h2><div class="muted">連続した日数の合計差枚で上昇を判定。条件に合う過去の実例と、その次の日の結果を検証します。</div><div class="rf-controls"><label>台番 <select id="rfMachine"><option value="ALL">3台合計</option><option value="3232">3232</option><option value="3233" selected>3233</option><option value="3235">3235</option></select></label><label>上昇期間 <select id="rfDays"></select></label><label>上昇枚数 <select id="rfThreshold"><option value="3000">+3,000枚以上</option><option value="4000">+4,000枚以上</option><option value="5000" selected>+5,000枚以上</option><option value="6000">+6,000枚以上</option><option value="7000">+7,000枚以上</option><option value="10000">+10,000枚以上</option></select></label><label>対象期間 <select id="rfPeriod"><option value="ALL">全期間</option><option value="AUGSEP">2026年8・9月</option><option value="90">直近90日</option></select></label></div><div id="rfResult" class="muted">読み込み中…</div><div class="rf-note">判定条件：連続N暦日の実稼働（0G・欠損日は除外）の差枚合計が指定値以上で、その翌日がマイナス。さらに翌日（上昇期間終了から2日後）の差枚を調べます。該当例が複数ある場合は独立した抽選の証拠ではなく、重なる期間や稼働量の偏りがあり得ます。合計差枚はスランプグラフの期間中の増減に相当しますが、日中の高値・安値は考慮していません。</div>';
for(let n=2;n<=14;n++){const o=document.createElement("option");o.value=n;o.textContent=n+"日間";if(n===4)o.selected=true;p.querySelector("#rfDays").appendChild(o);}
const a=$("dipNextPanel")||$("mainPanel")||$("tablePanel");
if(a&&a.parentNode)a.parentNode.insertBefore(p,a);else document.querySelector("main")?.appendChild(p);
}
function analyze(records){
const machine=$("rfMachine").value,n=Number($("rfDays").value),threshold=Number($("rfThreshold").value),period=$("rfPeriod").value;
const latest=records.reduce((v,r)=>r.date>v?r.date:v,"");
const cutoff=latest?day(latest,-89):"";
const all=[];
for(const m of ["3232","3233","3235"]){
if(machine!=="ALL"&&m!==machine)continue;
const map=new Map(records.filter(r=>String(r.machineNo)===m&&Number(r.games)>0&&Number.isFinite(Number(r.diff))).map(r=>[r.date,r]));
for(const [end,r] of map){
if(period==="AUGSEP"&&!/^2026-(08|09)-/.test(day(end,1)))continue;
if(period==="90"&&day(end,1)<cutoff)continue;
const seq=Array.from({length:n},(_,i)=>map.get(day(end,i+1-n)));
if(seq.some(x=>!x))continue;
const rise=seq.reduce((s,x)=>s+Number(x.diff),0);
if(rise<threshold)continue;
const negative=map.get(day(end,1));
if(!negative||Number(negative.diff)>=0)continue;
const next=map.get(day(end,2));
all.push({m,end,rise,negative:negative.diff,followDate:day(end,2),follow:next?Number(next.diff):null,followGames:next?Number(next.games):null});
}
}
all.sort((a,b)=>b.end.localeCompare(a.end)||a.m.localeCompare(b.m));
const done=all.filter(x=>x.follow!==null),positive=done.filter(x=>x.follow>0).length;
const avg=done.length?done.reduce((s,x)=>s+x.follow,0)/done.length:null;
const pending=all.filter(x=>x.follow===null);
let html='<div class="rf-summary">条件に合う事例：'+num(all.length)+'件　／　翌々日の結果が判明：'+num(done.length)+'件<br>翌々日プラス：'+num(positive)+'件'+(done.length?'（'+num(positive/done.length*100)+'%）':'')+'　／　平均差枚：'+(avg===null?'—':signed(avg)+'枚')+'<br>未確認：'+num(pending.length)+'件</div>';
if(!all.length){html+='<div class="muted">この条件に合う記録はありません。期間・日数・枚数を変えてみてください。</div>';}
else{html+='<div class="rf-scroll"><table><thead><tr><th>台番</th><th>上昇終了日</th><th>上昇合計</th><th>翌日の差枚</th><th>翌々日</th><th>翌々日の差枚</th><th>翌々日G</th></tr></thead><tbody>'+all.slice(0,100).map(x=>'<tr'+(x.follow===null?' class="rf-pending"':'')+'><td>'+x.m+'</td><td>'+x.end+'</td><td>'+signed(x.rise)+'枚</td><td>'+signed(x.negative)+'枚</td><td>'+x.followDate+'</td><td>'+(x.follow===null?'未確認':signed(x.follow)+'枚')+'</td><td>'+(x.followGames===null?'—':num(x.followGames)+'G')+'</td></tr>').join("")+'</tbody></table></div>'+(all.length>100?'<div class="rf-note">直近100件を表示しています。</div>':'');}
$("rfResult").innerHTML=html;
}
async function init(){
mount();
try{const r=await fetch("./data.json?rf="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();if(!Array.isArray(d.records))throw Error("データ形式を確認してください");const render=()=>analyze(d.records);for(const id of ["rfMachine","rfDays","rfThreshold","rfPeriod"])$(id).addEventListener("change",render);render();}
catch(e){$("rfResult").textContent="データを読み込めませんでした："+e.message;}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();