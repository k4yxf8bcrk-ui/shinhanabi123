/* 前日凹み→翌日検証：日付連続・両日稼働あり。将来の当選確率を表すものではありません。 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString("ja-JP",{maximumFractionDigits:1});
const sgn=n=>(n>0?"+":"")+fmt(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const css=document.createElement("style");
css.textContent="#dipNextPanel{border-color:#d5e3e1}#dipNextPanel h2{margin:0 0 6px}#dipNextPanel .dn-controls{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}#dipNextPanel label{font-size:13px;display:flex;align-items:center;gap:6px}#dipNextPanel select{width:auto;max-width:100%;padding:7px}#dipNextPanel .dn-table{overflow-x:auto}#dipNextPanel table{min-width:700px}#dipNextPanel th,#dipNextPanel td{text-align:right}#dipNextPanel th:first-child,#dipNextPanel td:first-child{text-align:left}#dipNextPanel .dn-note{font-size:12px;color:#667085;line-height:1.8;margin-top:10px}#dipNextPanel .dn-highlight{background:#f1f8f5}";
document.head.appendChild(css);
function addPanel(){
if($("dipNextPanel"))return;
const p=document.createElement("section");p.id="dipNextPanel";p.className="panel";
p.innerHTML='<h2>前日凹み → 翌日の成績検証</h2><div class="muted">3232・3233・3235の実績を、8月・9月の追加分も含めて自動集計</div><div class="dn-controls"><label>台番 <select id="dnMachine"><option value="ALL">3台合計</option><option value="3232">3232</option><option value="3233">3233</option><option value="3235">3235</option></select></label><label>期間 <select id="dnPeriod"><option value="ALL">全期間</option><option value="AUGSEP">8・9月のみ</option><option value="90">直近90日</option></select></label></div><div id="dnContent" class="muted">読み込み中…</div><div class="dn-note">比較は前日と翌日の両方に実稼働があり、暦上で連続した2日間だけを対象とします。翌日のプラス率は「翌日差枚が0枚超」の割合。前日条件の重複集計です。低稼働・店の状況・偶然による偏りがあるため、凹んだ翌日に当たりやすくなることを意味しません。特に少数件は参考程度にしてください。</div>';
const anchor=$("mainPanel")||$("tablePanel");
if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(p,anchor);else document.querySelector("main")?.appendChild(p);
}
function pairs(records,period,machine){
const now=records.reduce((v,r)=>r.date>v?r.date:v,"");
const cut=now?new Date(now+"T12:00:00Z").getTime()-89*86400000:0;
const grouped={};
for(const r of records){
const m=String(r.machineNo);
if(!["3232","3233","3235"].includes(m)||!(Number(r.games)>0)||!Number.isFinite(Number(r.diff)))continue;
(grouped[m]??=[]).push(r);
}
let out=[];
for(const [m,rs] of Object.entries(grouped)){
if(machine!=="ALL"&&m!==machine)continue;
rs.sort((a,b)=>a.date.localeCompare(b.date));
for(let i=1;i<rs.length;i++){
const prev=rs[i-1],next=rs[i];
const dayDiff=(Date.parse(next.date+"T12:00:00Z")-Date.parse(prev.date+"T12:00:00Z"))/86400000;
if(dayDiff!==1)continue;
if(period==="AUGSEP"&&!/^2026-(08|09)-/.test(next.date))continue;
if(period==="90"&&Date.parse(next.date+"T12:00:00Z")<cut)continue;
out.push({m,prev,next});
}
}
return out;
}
function stat(p){
const n=p.length;
if(!n)return null;
const plus=p.filter(x=>Number(x.next.diff)>0).length;
const diff=p.reduce((s,x)=>s+Number(x.next.diff),0);
const games=p.reduce((s,x)=>s+Number(x.next.games),0);
const bb=p.reduce((s,x)=>s+(Number(x.next.bb)||0),0),rb=p.reduce((s,x)=>s+(Number(x.next.rb)||0),0);
return {n,plus,rate:100*plus/n,avg:diff/n,games:games/n,bb:bb?games/bb:null,rb:rb?games/rb:null,combined:bb+rb?games/(bb+rb):null};
}
function render(records){
addPanel();
const machine=$("dnMachine").value,period=$("dnPeriod").value;
const a=pairs(records,period,machine);
const conditions=[
["前日プラス",x=>Number(x.prev.diff)>0],
["前日マイナス",x=>Number(x.prev.diff)<0],
["前日−500枚以下",x=>Number(x.prev.diff)<=-500],
["前日−1,000枚以下",x=>Number(x.prev.diff)<=-1000],
["前日−1,500枚以下",x=>Number(x.prev.diff)<=-1500],
["前日−2,000枚以下",x=>Number(x.prev.diff)<=-2000]
];
const rows=conditions.map(([name,fn])=>({name,st:stat(a.filter(fn))}));
const baseline=stat(a);
$("dnContent").innerHTML='<div class="dn-note">比較対象：'+fmt(a.length)+'組（'+(machine==="ALL"?"3台合計":machine+"番台")+'）。全体の翌日プラス率：'+(baseline?fmt(baseline.rate)+"%":"—")+'。</div><div class="dn-table"><table><thead><tr><th>前日の条件</th><th>件数</th><th>翌日プラス</th><th>翌日プラス率</th><th>翌日平均差枚</th><th>翌日平均G</th><th>翌日合算</th></tr></thead><tbody>'+rows.map(({name,st})=>'<tr'+(name==="前日−500枚以下"?' class="dn-highlight"':"")+'><td>'+esc(name)+'</td><td>'+(st?fmt(st.n):"0")+'</td><td>'+(st?fmt(st.plus):"—")+'</td><td>'+(st?fmt(st.rate)+"%":"—")+'</td><td>'+(st?sgn(st.avg)+"枚":"—")+'</td><td>'+(st?fmt(st.games)+"G":"—")+'</td><td>'+(st&&st.combined?"1/"+fmt(st.combined):"—")+'</td></tr>').join("")+'</tbody></table></div>';
}
async function start(){
addPanel();
try{
const r=await fetch("./data.json?dn="+Date.now(),{cache:"no-store"});
if(!r.ok)throw Error("data.json: "+r.status);
const d=await r.json();
const records=Array.isArray(d.records)?d.records:[];
if(!records.length)throw Error("記録がありません");
const fn=()=>render(records);
$("dnMachine").addEventListener("change",fn);
$("dnPeriod").addEventListener("change",fn);
fn();
}catch(e){$("dnContent").textContent="集計できませんでした："+e.message;}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();