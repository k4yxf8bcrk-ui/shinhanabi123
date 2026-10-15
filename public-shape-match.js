/* 新ハナビ：過去波形類似検索。統計的参考表示であり、将来の差枚予測・勝率ではありません。 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const num=(x,d=0)=>Number(x).toLocaleString("ja-JP",{maximumFractionDigits:d,minimumFractionDigits:d});
const sign=x=>(x>0?"+":"")+num(x);
const addDay=(s,n)=>new Date(Date.parse(s+"T12:00:00Z")+n*86400000).toISOString().slice(0,10);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function panel(){
if($("shapeMatchPanel"))return;
const style=document.createElement("style");
style.textContent="#shapeMatchPanel .sm-controls{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}#shapeMatchPanel label{font-size:13px;display:flex;gap:6px;align-items:center}#shapeMatchPanel select{width:auto;max-width:100%;padding:7px}#shapeMatchPanel .sm-info{font-size:13px;line-height:1.8;color:#596579}#shapeMatchPanel .sm-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:12px 0}#shapeMatchPanel .sm-card{border:1px solid #dde4ee;border-radius:10px;padding:12px;background:#fff}#shapeMatchPanel .sm-card h3{font-size:15px;margin:0 0 6px}#shapeMatchPanel .sm-card svg{display:block;width:100%;height:105px}#shapeMatchPanel .sm-card p{margin:4px 0;font-size:13px}#shapeMatchPanel .sm-note{font-size:12px;color:#667085;line-height:1.8;margin-top:12px}#shapeMatchPanel .sm-forecast{padding:12px;background:#f2f7fb;border-radius:9px;line-height:1.8;margin:12px 0}#shapeMatchPanel .sm-bad{color:#b54708}#shapeMatchPanel .sm-good{color:#027a48}#shapeMatchPanel .sm-legend{display:flex;gap:14px;font-size:12px;color:#667085}#shapeMatchPanel .sm-line{display:inline-block;width:14px;border-top:3px solid #2563eb;vertical-align:middle;margin-right:4px}#shapeMatchPanel .sm-line.alt{border-color:#f59e0b}";
document.head.appendChild(style);
const p=document.createElement("section");p.className="panel";p.id="shapeMatchPanel";
p.innerHTML='<h2>過去の似た波形 TOP5</h2><div class="muted">現在の累積差枚の形に似た過去を探し、その後1日・3日・7日を答え合わせ</div><div class="sm-controls"><label>台番 <select id="smMachine"><option value="3232">3232</option><option value="3233">3233</option><option value="3235" selected>3235</option></select></label><label>比較期間 <select id="smWindow"><option value="7">直近7日</option><option value="14" selected>直近14日</option><option value="30">直近30日</option></select></label><label>比較方法 <select id="smMode"><option value="shape">形の類似度</option><option value="magnitude">形＋上下幅</option></select></label></div><div id="smContent" class="sm-info">データを読み込み中…</div><div class="sm-note">類似度は日別差枚から作った累積グラフを起点0にそろえ、標準化した形の近さで計算します。「形＋上下幅」は増減幅も加味します。欠損日・0G日は比較対象外。過去例は期間が重複しないよう選び、7日後まで実績があるものだけを表示します。類似した波形でも翌日の抽選が有利になるわけではなく、過去の結果は将来を保証しません。</div>';
const anchor=$("dipNextPanel")||$("riseFallFollowPanel")||$("mainPanel")||$("tablePanel");
if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(p,anchor);else document.querySelector("main")?.appendChild(p);
}
function cum(rows){let s=0;return [0,...rows.map(x=>(s+=Number(x.diff)))];}
function norm(a){const mean=a.reduce((s,x)=>s+x,0)/a.length;const sd=Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/a.length)||1;return a.map(x=>(x-mean)/sd);}
function score(a,b,mode){
const an=norm(a),bn=norm(b);
const rmse=Math.sqrt(an.reduce((s,x,i)=>s+(x-bn[i])**2,0)/an.length);
const rangeA=Math.max(...a)-Math.min(...a),rangeB=Math.max(...b)-Math.min(...b);
const penalty=mode==="magnitude"?Math.abs(Math.log((rangeA+200)/(rangeB+200)))*0.35:0;
return 100*Math.exp(-(rmse+penalty)*1.35);
}
function spark(a,b){
const W=224,H=105,p=7;
const combined=[...a,...b],low=Math.min(...combined),high=Math.max(...combined),span=high-low||1;
const points=v=>v.map((x,i)=>(p+i*(W-2*p)/(v.length-1)).toFixed(1)+","+(H-p-(x-low)*(H-2*p)/span).toFixed(1)).join(" ");
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="青が現在、オレンジが過去の類似波形"><path d="M'+p+' '+(H-p)+'H'+(W-p)+'" stroke="#d6dde6" fill="none"/><polyline points="'+points(a)+'" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="'+points(b)+'" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function analyze(records){
const m=$("smMachine").value,N=Number($("smWindow").value),mode=$("smMode").value;
const rows=records.filter(r=>String(r.machineNo)===m&&Number(r.games)>0&&Number.isFinite(Number(r.diff))).sort((a,b)=>a.date.localeCompare(b.date));
const map=new Map(rows.map(r=>[r.date,r]));
const latest=rows.at(-1)?.date;
if(!latest){$("smContent").textContent="対象台のデータがありません。";return;}
const current=Array.from({length:N},(_,i)=>map.get(addDay(latest,i+1-N)));
if(current.some(x=>!x)){$("smContent").textContent="直近"+N+"日間に未取得日または0G日があるため、比較できません。7日など短い期間を選んでください。";return;}
const shape=cum(current),start=addDay(latest,1-N),candidates=[];
for(const row of rows){
const end=row.date;
if(addDay(end,7)>=start)continue;
const window=Array.from({length:N},(_,i)=>map.get(addDay(end,i+1-N)));
if(window.some(x=>!x))continue;
const after=Array.from({length:7},(_,i)=>map.get(addDay(end,i+1)));
if(after.some(x=>!x))continue;
const comparison=cum(window),similarity=score(shape,comparison,mode);
const result=n=>after.slice(0,n).reduce((s,x)=>s+Number(x.diff),0);
candidates.push({start:addDay(end,1-N),end,shape:comparison,similarity,day1:result(1),day3:result(3),day7:result(7),rise:comparison.at(-1)});
}
candidates.sort((a,b)=>b.similarity-a.similarity);
const top=[];
for(const x of candidates){
if(top.some(y=>!(x.end<y.start||x.start>y.end)))continue;
top.push(x);
if(top.length===5)break;
}
if(!top.length){$("smContent").textContent="この条件で比較できる過去データがありません。比較期間を短くしてください。";return;}
const avg=n=>top.reduce((s,x)=>s+x["day"+n],0)/top.length;
const positive=n=>top.filter(x=>x["day"+n]>0).length;
let html='<div class="sm-info">対象：'+m+'番台　／　現在の比較期間：'+start+'〜'+latest+'（'+N+'日）<br>比較できた過去期間：'+num(candidates.length)+'件（重複しない上位'+top.length+'件を表示）</div>';
html+='<div class="sm-forecast">似た波形TOP'+top.length+'の、その後の実績（参考値）<br>翌日：平均'+sign(avg(1))+'枚・プラス'+positive(1)+'/'+top.length+'件<br>3日合計：平均'+sign(avg(3))+'枚・プラス'+positive(3)+'/'+top.length+'件<br>7日合計：平均'+sign(avg(7))+'枚・プラス'+positive(7)+'/'+top.length+'件</div>';
html+='<div class="sm-legend"><span><i class="sm-line"></i>現在</span><span><i class="sm-line alt"></i>過去</span></div>';
html+='<div class="sm-cards">'+top.map((x,i)=>'<div class="sm-card"><h3>'+ (i+1)+'位　'+x.start+'〜'+x.end+'</h3><p>形の類似度：'+num(x.similarity,1)+'点　／　期間差枚：'+sign(x.rise)+'枚</p>'+spark(shape,x.shape)+'<p>翌日：<span class="'+(x.day1>=0?'sm-good':'sm-bad')+'">'+sign(x.day1)+'枚</span></p><p>3日合計：<span class="'+(x.day3>=0?'sm-good':'sm-bad')+'">'+sign(x.day3)+'枚</span></p><p>7日合計：<span class="'+(x.day7>=0?'sm-good':'sm-bad')+'">'+sign(x.day7)+'枚</span></p></div>').join("")+'</div>';
html+='<div class="sm-note">「類似度」はこの画面内の形の近さを示す独自指標で、的中率ではありません。TOP5の平均は過去の選ばれた事例の平均であり、次の7日間の期待差枚を意味しません。比較条件や対象期間を変えると結果も変わります。</div>';
$("smContent").innerHTML=html;
}
async function start(){
panel();
try{
const res=await fetch("./data.json?shape="+Date.now(),{cache:"no-store"});
if(!res.ok)throw Error("HTTP "+res.status);
const d=await res.json();if(!Array.isArray(d.records))throw Error("データ形式を確認してください");
const rerender=()=>analyze(d.records);
["smMachine","smWindow","smMode"].forEach(id=>$(id).addEventListener("change",rerender));
rerender();
}catch(e){$("smContent").textContent="読み込みに失敗しました："+e.message;}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();