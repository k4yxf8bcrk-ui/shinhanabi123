/* コンコルド雄踏ほか：差枚数・台番・曜日・G数・BIG/REG・日付の自由検索。元データは一切変更しない。 */
(function(){
'use strict';
const root=document.querySelector('main.wrap');if(!root)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
const signed=n=>(Number(n)>0?'+':'')+f(n);
const week=['日','月','火','水','木','金','土'];
const state={records:[],latest:'',earliest:'',byMachine:new Map(),lastResult:[],limit:50,loaded:false};
const css=document.createElement('style');
css.textContent=[
'#diffFinderPanel{border-color:#bfd7eb}',
'#diffFinderPanel .df-intro{margin:3px 0 13px;color:#526479;font-size:12px;line-height:1.7}',
'#diffFinderPanel .df-preset{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0 14px}',
'#diffFinderPanel .df-preset button{border:1px solid #aabfd6;background:#fff;border-radius:9px;color:#25527c;font-size:13px;font-weight:800;padding:9px 12px;cursor:pointer;min-height:40px}',
'#diffFinderPanel .df-preset button.df-on{background:#2369aa;color:#fff;border-color:#2369aa}',
'#diffFinderPanel .df-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
'#diffFinderPanel .df-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:12px;color:#45566a;font-weight:800}',
'#diffFinderPanel .df-field select,#diffFinderPanel .df-field input{width:100%;min-width:0;min-height:41px;background:#fff;border:1px solid #bfcbd8;border-radius:8px;font-size:14px;color:#1b2638;padding:8px 9px}',
'#diffFinderPanel .df-advanced{margin:12px 0;border:1px solid #dce3ea;border-radius:9px;padding:0 12px;background:#fbfcfe}',
'#diffFinderPanel .df-advanced summary{cursor:pointer;padding:11px 0;font-weight:800;font-size:13px;color:#285480}',
'#diffFinderPanel .df-advanced .df-form{padding:3px 0 14px}',
'#diffFinderPanel .df-btnrow{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:12px 0}',
'#diffFinderPanel .df-primary{background:#1766a7;border:1px solid #1766a7;color:#fff;font-size:14px;border-radius:9px;padding:11px 17px;min-height:42px;font-weight:900;cursor:pointer}',
'#diffFinderPanel .df-secondary{background:#fff;border:1px solid #9db6d2;color:#225a87;font-size:13px;border-radius:8px;padding:10px 12px;min-height:42px;font-weight:800;cursor:pointer}',
'#diffFinderPanel button:focus-visible{outline:3px solid #7eb6ec;outline-offset:2px}',
'#diffFinderPanel .df-status{font-size:12px;color:#66778b;line-height:1.6;margin:7px 0}',
'#diffFinderPanel .df-error{color:#aa3024;font-weight:800}',
'#diffFinderPanel .df-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}',
'#diffFinderPanel .df-stat{border-radius:10px;border:1px solid #dce5ed;background:#f8fafc;padding:10px;min-width:0}',
'#diffFinderPanel .df-stat small{display:block;font-size:11px;color:#64748b;line-height:1.5}',
'#diffFinderPanel .df-stat strong{display:block;font-size:21px;line-height:1.45;color:#23354c;overflow-wrap:anywhere}',
'#diffFinderPanel .df-sub{font-size:14px;margin:19px 0 9px;font-weight:900}',
'#diffFinderPanel .df-tablewrap{border:1px solid #e0e5ee;border-radius:10px;overflow:auto;max-height:500px}',
'#diffFinderPanel .df-tablewrap table{width:100%;min-width:700px;border-collapse:collapse;font-variant-numeric:tabular-nums}',
'#diffFinderPanel .df-tablewrap th,#diffFinderPanel .df-tablewrap td{padding:9px;font-size:12px;text-align:right;white-space:nowrap}',
'#diffFinderPanel .df-tablewrap th:first-child,#diffFinderPanel .df-tablewrap td:first-child{text-align:left}',
'#diffFinderPanel .df-tablewrap th{position:sticky;top:0;z-index:1;background:#eef3f9}',
'#diffFinderPanel .df-post-table{min-width:700px}',
'#diffFinderPanel .df-positive{color:#145fa5;font-weight:850}',
'#diffFinderPanel .df-negative{color:#c33329;font-weight:850}',
'#diffFinderPanel .df-muted{color:#718096;font-size:11px}',
'#diffFinderPanel .df-bars{display:grid;gap:8px}',
'#diffFinderPanel .df-baritem{display:grid;grid-template-columns:70px minmax(0,1fr) 125px;align-items:center;gap:9px;font-size:12px}',
'#diffFinderPanel .df-barbg{height:12px;border-radius:20px;background:#e7edf4;overflow:hidden}',
'#diffFinderPanel .df-barfill{height:100%;background:#4884ba;min-width:0;border-radius:20px}',
'#diffFinderPanel .df-barlabel{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}',
'#diffFinderPanel .df-note{font-size:12px;color:#66758a;line-height:1.75;margin:10px 0}',
'#diffFinderPanel .df-paging{margin-top:11px;text-align:center}',
'#diffFinderPanel .df-mini{font-size:11px;color:#65758b;margin:6px 0}',
'@media(max-width:740px){#diffFinderPanel .df-form{grid-template-columns:repeat(2,minmax(0,1fr))}#diffFinderPanel .df-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
'@media(max-width:420px){#diffFinderPanel .df-form{gap:9px}#diffFinderPanel .df-field select,#diffFinderPanel .df-field input{font-size:16px}#diffFinderPanel .df-stat strong{font-size:19px}#diffFinderPanel .df-baritem{grid-template-columns:48px minmax(0,1fr) 106px;gap:5px;font-size:11px}#diffFinderPanel .df-preset button{flex:1 1 30%}}'
].join('\n');
document.head.appendChild(css);
const panel=document.createElement('section');panel.id='diffFinderPanel';panel.className='panel';
panel.innerHTML=[
'<h2>差枚条件・詳細検索</h2>',
'<p class="df-intro">何枚以上・以下・範囲指定でも検索できます。台番、曜日、期間、G数、BIG・REGを組み合わせて抽出。翌日・3日間・7日間の実績も自動検証します。検索は公開データの最新日を基準にしています。</p>',
'<div class="df-preset" id="dfPresets" aria-label="よく使う差枚条件">',
'<button type="button" data-val="2000">+2,000枚以上</button>',
'<button type="button" data-val="2500">+2,500枚以上</button>',
'<button type="button" data-val="3000">+3,000枚以上</button>',
'<button type="button" data-val="1000">+1,000枚以上</button>',
'<button type="button" data-val="0">プラスのみ</button>',
'</div>',
'<div class="df-form">',
'<label class="df-field">台番<select id="dfMachine"><option value="ALL">すべての台</option></select></label>',
'<label class="df-field">集計期間<select id="dfPeriod"><option value="ALL">全期間</option><option value="6M">直近半年</option><option value="30">直近30日</option><option value="90">直近90日</option><option value="180">直近180日</option><option value="365">直近1年</option><option value="CUSTOM">日付で指定</option></select></label>',
'<label class="df-field">差枚条件<select id="dfCompare"><option value="gte">指定枚数以上（≧）</option><option value="lte">指定枚数以下（≦）</option><option value="between">枚数の範囲</option></select></label>',
'<label class="df-field">差枚数（枚）<input id="dfMin" inputmode="numeric" type="number" step="1" value="2000"></label>',
'<label class="df-field" id="dfMaxWrap" hidden>差枚数の上限（枚）<input id="dfMax" inputmode="numeric" type="number" step="1" value="2999"></label>',
'<label class="df-field">曜日<select id="dfWeekday"><option value="ALL">すべての曜日</option><option value="WEEKEND">土日</option><option value="WEEKDAY">月〜金</option><option value="0">日曜日</option><option value="1">月曜日</option><option value="2">火曜日</option><option value="3">水曜日</option><option value="4">木曜日</option><option value="5">金曜日</option><option value="6">土曜日</option></select></label>',
'</div>',
'<details class="df-advanced" id="dfAdvanced"><summary>さらに細かく指定（回転数・BIG・REG・日付・並び順）</summary>',
'<div class="df-form">',
'<label class="df-field">最低G数<input id="dfMinGames" type="number" inputmode="numeric" min="0" step="1" placeholder="指定なし"></label>',
'<label class="df-field">最高G数<input id="dfMaxGames" type="number" inputmode="numeric" min="0" step="1" placeholder="指定なし"></label>',
'<label class="df-field">BIG最低回数<input id="dfMinBb" type="number" inputmode="numeric" min="0" step="1" placeholder="指定なし"></label>',
'<label class="df-field">REG最低回数<input id="dfMinRb" type="number" inputmode="numeric" min="0" step="1" placeholder="指定なし"></label>',
'<label class="df-field">一覧の並び<select id="dfSort"><option value="NEW">日付が新しい順</option><option value="OLD">日付が古い順</option><option value="HIGH">差枚が多い順</option><option value="LOW">差枚が少ない順</option><option value="GAMES">G数が多い順</option></select></label>',
'<div id="dfDates" class="df-form" style="grid-column:1/-1" hidden>',
'<label class="df-field">開始日<input id="dfFrom" type="date"></label>',
'<label class="df-field">終了日<input id="dfTo" type="date"></label>',
'</div>',
'</div></details>',
'<div class="df-btnrow"><button id="dfSearch" type="button" class="df-primary">この条件で検索</button><button id="dfReset" type="button" class="df-secondary">条件をリセット</button><button id="dfExport" type="button" class="df-secondary" disabled>CSV保存</button></div>',
'<div class="df-status" id="dfStatus">データを読み込んでいます…</div>',
'<div class="df-grid" id="dfStats"></div>',
'<h3 class="df-sub">台番別の該当件数と達成割合</h3><div id="dfMachineResults"></div>',
'<h3 class="df-sub">曜日別の該当件数と達成割合</h3><div id="dfWeekResults"></div>',
'<h3 class="df-sub">該当日の翌日・3日・7日後の成績</h3><div id="dfFollowResults"></div>',
'<h3 class="df-sub">該当日一覧 <span id="dfListCount" class="df-mini"></span></h3>',
'<div id="dfList"></div><div class="df-paging"><button type="button" id="dfMore" class="df-secondary" hidden>さらに50件表示</button></div>',
'<p class="df-note">「達成割合」の分母は、指定した台番・期間・曜日・G数・BIG/REG条件に合う稼働日数（台・日）です。修理・0G日は除きます。「翌日」「3日間」「7日間」は該当日の翌日からの差枚合計で、欠損日・0G日がある場合や結果が未取得の場合は除外します。同じ台が連日条件達成すると将来期間が重複するため、各例を独立した予測成功例とは扱えません。過去の成績は将来の当選確率や期待収支を保証しません。</p>'
].join('');
const before=$('weekdayPanel')||$('tablePanel');if(before&&before.parentNode===root)root.insertBefore(panel,before);else root.appendChild(panel);
function dateShift(date,days){
 const ms=Date.parse(date+'T12:00:00Z');if(!Number.isFinite(ms))return'';
 return new Date(ms+days*86400000).toISOString().slice(0,10);
}
function halfYearStart(latest){
 const d=new Date(latest+'T12:00:00Z');
 const target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-6,1,12));
 const maxday=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();
 target.setUTCDate(Math.min(d.getUTCDate(),maxday));
 return dateShift(target.toISOString().slice(0,10),1);
}
function weekday(date){
 const x=Date.parse(date+'T12:00:00Z');
 return Number.isFinite(x)?new Date(x).getUTCDay():-1;
}
function numOpt(id){
 const v=$(id).value.trim();
 if(v==='')return null;
 const n=Number(v);return Number.isFinite(n)?n:NaN;
}
function validateOptional(n,min,max){
 return n===null||(Number.isInteger(n)&&n>=min&&n<=max);
}
function getOptions(){
 const compare=$('dfCompare').value,threshold=numOpt('dfMin'),high=numOpt('dfMax');
 const minimumG=numOpt('dfMinGames'),maximumG=numOpt('dfMaxGames');
 const minimumBb=numOpt('dfMinBb'),minimumRb=numOpt('dfMinRb');
 if(threshold===null||!Number.isInteger(threshold)||Math.abs(threshold)>10000000)return{error:'差枚数を整数で入力してください。'};
 if(compare==='between'&&(high===null||!Number.isInteger(high)||high<threshold))return{error:'範囲指定の上限枚数は下限枚数以上にしてください。'};
 if(![minimumG,maximumG,minimumBb,minimumRb].every(x=>validateOptional(x,0,1000000)))return{error:'回転数・BIG・REGは0以上の整数を指定してください。'};
 if(minimumG!==null&&maximumG!==null&&minimumG>maximumG)return{error:'最高G数は最低G数以上にしてください。'};
 let start=state.earliest,end=state.latest;
 const period=$('dfPeriod').value;
 if(period==='6M')start=halfYearStart(state.latest);
 else if(/^(30|90|180|365)$/.test(period))start=dateShift(state.latest,1-Number(period));
 else if(period==='CUSTOM'){
  start=$('dfFrom').value;end=$('dfTo').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return{error:'開始日と終了日を正しく指定してください。'};
 }
 return{compare,threshold,high,minimumG,maximumG,minimumBb,minimumRb,start,end,
  period,weekday:$('dfWeekday').value,machine:$('dfMachine').value,sort:$('dfSort').value};
}
function hasWeekday(d,choice){
 if(choice==='ALL')return true;
 const w=weekday(d);
 if(choice==='WEEKEND')return w===0||w===6;
 if(choice==='WEEKDAY')return w>=1&&w<=5;
 return w===Number(choice);
}
function eligible(r,q){
 if(String(r.machineNo)!==q.machine&&q.machine!=='ALL')return false;
 if(String(r.date)<q.start||String(r.date)>q.end||!hasWeekday(r.date,q.weekday))return false;
 const g=Number(r.games),bb=Number(r.bb),rb=Number(r.rb);
 if(!Number.isFinite(g)||g<=0)return false;
 if(q.minimumG!==null&&g<q.minimumG)return false;
 if(q.maximumG!==null&&g>q.maximumG)return false;
 if(q.minimumBb!==null&&(!Number.isFinite(bb)||bb<q.minimumBb))return false;
 if(q.minimumRb!==null&&(!Number.isFinite(rb)||rb<q.minimumRb))return false;
 return true;
}
function match(r,q){
 const v=Number(r.diff);
 if(!Number.isFinite(v))return false;
 if(q.compare==='gte')return v>=q.threshold;
 if(q.compare==='lte')return v<=q.threshold;
 return v>=q.threshold&&v<=q.high;
}
function dayFuture(r,span){
 const machine=state.byMachine.get(String(r.machineNo));if(!machine)return null;
 let sum=0;
 for(let i=1;i<=span;i++){
  const date=dateShift(r.date,i),next=machine.get(date);
  if(!next||Number(next.games)<=0||!Number.isFinite(Number(next.diff)))return null;
  sum+=Number(next.diff);
 }
 return sum;
}
function metrics(rows,field){
 const values=rows.map(x=>x[field]).filter(x=>Number.isFinite(x));
 if(!values.length)return{n:0,pos:0,neg:0,avg:null,median:null,min:null,max:null};
 const ordered=values.slice().sort((a,b)=>a-b);
 const n=ordered.length;
 return{n,pos:ordered.filter(x=>x>0).length,neg:ordered.filter(x=>x<0).length,
  avg:values.reduce((a,b)=>a+b,0)/n,median:(ordered[Math.floor((n-1)/2)]+ordered[Math.floor(n/2)])/2,
  min:ordered[0],max:ordered[n-1]};
}
const countPct=(n,total)=>total?(n/total*100).toFixed(1)+'%':'-';
function bars(items){
 const max=Math.max(1,...items.map(x=>x.total?100*x.n/x.total:0));
 return '<div class="df-bars">'+items.map(x=>{
  const rate=x.total?100*x.n/x.total:0;
  return'<div class="df-baritem"><b>'+esc(x.label)+'</b><div class="df-barbg"><div class="df-barfill" style="width:'+(rate/max*100).toFixed(1)+'%"></div></div><span class="df-barlabel">'+x.n+'/'+x.total+'件（'+countPct(x.n,x.total)+'）</span></div>';
 }).join('')+'</div>';
}
function renderBreakdown(base,matches,q){
 const machineList=q.machine==='ALL'?[...new Set(state.records.map(x=>String(x.machineNo)))].sort((a,b)=>Number(a)-Number(b)):[q.machine];
 const machines=machineList.map(m=>{
  const b=base.filter(r=>String(r.machineNo)===m),x=matches.filter(r=>String(r.machineNo)===m);
  return{label:m==='3231'?'旧3231':m,total:b.length,n:x.length};
 });
 $('dfMachineResults').innerHTML=bars(machines);
 $('dfWeekResults').innerHTML=bars(week.map((label,i)=>({
  label:label+'曜',total:base.filter(r=>weekday(r.date)===i).length,n:matches.filter(r=>weekday(r.date)===i).length
 })));
}
function renderFollow(enriched){
 const spans=[{key:'next1',label:'翌日（1日間）'},{key:'next3',label:'翌日から3日間'},{key:'next7',label:'翌日から7日間'}];
 const rowHtml=(m,key)=>{
  const t=metrics(enriched.filter(x=>m==='ALL'||String(x.row.machineNo)===m),key);
  return'<td>'+t.n+'件</td><td>'+countPct(t.pos,t.n)+' <small>（'+t.pos+'件プラス）</small></td>'+
   '<td class="'+(t.avg>0?'df-positive':t.avg<0?'df-negative':'')+'">'+(t.n?signed(t.avg)+'枚':'-')+'</td>'+
   '<td>'+(t.n?signed(t.median)+'枚':'-')+'</td>';
 };
 const all=spans.map(s=>'<tr><td>'+s.label+'</td>'+rowHtml('ALL',s.key)+'</tr>').join('');
 $('dfFollowResults').innerHTML=
  '<div class="df-tablewrap"><table class="df-post-table"><thead><tr><th>結果を確認する期間</th><th>確認可能</th><th>プラス割合</th><th>平均差枚</th><th>中央値</th></tr></thead><tbody>'+all+'</tbody></table></div>'+
  '<div class="df-mini">プラス割合は「合計差枚が0枚超」の割合。日数別の分母は未確定・0G日のため異なります。</div>'+
  '<details class="df-advanced"><summary>台番別の翌日・3日間・7日間を見る</summary>'+
  '<div class="df-tablewrap"><table><thead><tr><th>台番・結果期間</th><th>確認可能</th><th>プラス割合</th><th>平均差枚</th><th>中央値</th></tr></thead><tbody>'+
  [...new Set(enriched.map(x=>String(x.row.machineNo)))].sort((a,b)=>Number(a)-Number(b)).map(m=>
   spans.map(s=>'<tr><td>'+esc(m)+'・'+s.label+'</td>'+rowHtml(m,s.key)+'</tr>').join('')
  ).join('')+'</tbody></table></div></details>';
}
function renderTable(enriched){
 const sorted=enriched.slice(),mode=$('dfSort').value;
 sorted.sort((a,b)=>{
  if(mode==='OLD')return a.row.date.localeCompare(b.row.date)||Number(a.row.machineNo)-Number(b.row.machineNo);
  if(mode==='HIGH')return Number(b.row.diff)-Number(a.row.diff)||b.row.date.localeCompare(a.row.date);
  if(mode==='LOW')return Number(a.row.diff)-Number(b.row.diff)||b.row.date.localeCompare(a.row.date);
  if(mode==='GAMES')return Number(b.row.games)-Number(a.row.games)||b.row.date.localeCompare(a.row.date);
  return b.row.date.localeCompare(a.row.date)||Number(a.row.machineNo)-Number(b.row.machineNo);
 });
 $('dfListCount').textContent='（'+sorted.length+'件）';
 const list=sorted.slice(0,state.limit);
 const outcome=x=>x===null?'<span class="df-muted">未取得・対象外</span>':'<span class="'+(x>0?'df-positive':x<0?'df-negative':'')+'">'+signed(x)+'</span>';
 $('dfList').innerHTML=sorted.length?
  '<div class="df-tablewrap"><table><thead><tr><th>日付</th><th>曜</th><th>台番</th><th>G数</th><th>BIG</th><th>REG</th><th>差枚</th><th>翌日</th><th>3日間</th><th>7日間</th></tr></thead><tbody>'+
  list.map(x=>'<tr><td>'+esc(x.row.date)+'</td><td>'+week[weekday(x.row.date)]+'</td><td>'+esc(x.row.machineNo)+'</td><td>'+f(x.row.games)+'</td><td>'+f(x.row.bb)+'</td><td>'+f(x.row.rb)+'</td><td class="'+(x.row.diff>0?'df-positive':x.row.diff<0?'df-negative':'')+'">'+signed(x.row.diff)+'</td><td>'+outcome(x.next1)+'</td><td>'+outcome(x.next3)+'</td><td>'+outcome(x.next7)+'</td></tr>').join('')+
  '</tbody></table></div>':
  '<p class="df-note">条件に合う記録はありません。枚数・期間・台番などを変更してみてください。</p>';
 const more=$('dfMore');more.hidden=state.limit>=sorted.length;
 if(!more.hidden)more.textContent='さらに'+Math.min(50,sorted.length-state.limit)+'件表示（残り'+(sorted.length-state.limit)+'件）';
}
function downloadCsv(){
 const rows=state.lastResult;if(!rows.length)return;
 const first=['日付','曜日','台番','G数','BIG','REG','差枚数','翌日差枚','翌日から3日間','翌日から7日間'];
 const data=[first,...rows.map(x=>[x.row.date,week[weekday(x.row.date)],x.row.machineNo,x.row.games,x.row.bb,x.row.rb,x.row.diff,x.next1??'',x.next3??'',x.next7??''])];
 const csv='\ufeff'+data.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='shinhanabi_samai_'+state.latest+'.csv';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function runSearch(){
 if(!state.loaded)return;
 const q=getOptions();
 if(q.error){$('dfStatus').className='df-status df-error';$('dfStatus').textContent=q.error;return;}
 const base=state.records.filter(r=>eligible(r,q));
 const matches=base.filter(r=>match(r,q));
 const enriched=matches.map(row=>({row,next1:dayFuture(row,1),next3:dayFuture(row,3),next7:dayFuture(row,7)}));
 state.lastResult=enriched;
 const uniq=new Set(matches.map(x=>x.date)).size;
 const text=q.compare==='gte'?signed(q.threshold)+'枚以上':q.compare==='lte'?signed(q.threshold)+'枚以下':signed(q.threshold)+'〜'+signed(q.high)+'枚';
 $('dfStatus').className='df-status';
 $('dfStatus').textContent='条件：'+text+' ／ '+q.start+'〜'+q.end+' ／ 公開データ最終日 '+state.latest+'。該当'+matches.length+'件（'+uniq+'日）。';
 $('dfStats').innerHTML=[
  ['該当件数',f(matches.length)+'件'],
  ['該当日数',f(uniq)+'日'],
  ['対象の稼働台・日',f(base.length)+'件'],
  ['条件達成割合',countPct(matches.length,base.length)]
 ].map(x=>'<div class="df-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('');
 renderBreakdown(base,matches,q);
 renderFollow(enriched);
 renderTable(enriched);
 $('dfExport').disabled=!enriched.length;
}
function updateControls(){
 $('dfMaxWrap').hidden=$('dfCompare').value!=='between';
 const custom=$('dfPeriod').value==='CUSTOM';
 $('dfDates').hidden=!custom;
 if(custom)$('dfAdvanced').open=true;
 [...$('dfPresets').querySelectorAll('button[data-val]')].forEach(b=>b.classList.toggle('df-on',$('dfCompare').value==='gte'&&$('dfMin').value===b.dataset.val));
}
function reset(){
 $('dfMachine').value='ALL';$('dfPeriod').value='ALL';$('dfCompare').value='gte';$('dfMin').value='2000';$('dfMax').value='2999';
 $('dfWeekday').value='ALL';$('dfMinGames').value='';$('dfMaxGames').value='';$('dfMinBb').value='';$('dfMinRb').value='';$('dfSort').value='NEW';
 state.limit=50;updateControls();runSearch();
}
function setup(){
 const machines=[...new Set(state.records.map(r=>String(r.machineNo)))].sort((a,b)=>Number(a)-Number(b));
 $('dfMachine').innerHTML='<option value="ALL">すべての台（旧台番含む）</option>'+machines.map(m=>'<option value="'+esc(m)+'">'+(m==='3231'?'旧3231':esc(m))+'番台</option>').join('');
 $('dfFrom').value=state.earliest;$('dfTo').value=state.latest;$('dfFrom').min=state.earliest;$('dfTo').max=state.latest;
 for(const id of ['dfMachine','dfPeriod','dfCompare','dfMin','dfMax','dfWeekday','dfMinGames','dfMaxGames','dfMinBb','dfMinRb','dfSort','dfFrom','dfTo']){
  $(id).addEventListener('change',()=>{if(id==='dfPeriod'||id==='dfCompare'||id==='dfMin')updateControls();state.limit=50;runSearch();});
 }
 $('dfPresets').addEventListener('click',e=>{
  const button=e.target.closest('button[data-val]');if(!button)return;
  $('dfCompare').value='gte';$('dfMin').value=button.dataset.val;
  state.limit=50;updateControls();runSearch();
 });
 $('dfSearch').addEventListener('click',()=>{state.limit=50;updateControls();runSearch();});
 $('dfReset').addEventListener('click',reset);
 $('dfExport').addEventListener('click',downloadCsv);
 $('dfMore').addEventListener('click',()=>{state.limit+=50;renderTable(state.lastResult);});
 updateControls();runSearch();
}
const file=window.SHINHANABI_DATA_URL||'./data.json';
fetch(file+(file.includes('?')?'&':'?')+'df='+Date.now(),{cache:'no-store'}).then(r=>{
 if(!r.ok)throw Error('公開データ取得：HTTP '+r.status);
 return r.json();
}).then(d=>{
 state.records=Array.isArray(d.records)?d.records:[];
 if(!state.records.length){$('dfStatus').textContent='公開データはまだありません。データ取得後に検索できます。';return;}
 state.records=state.records.filter(r=>r&&typeof r.date==='string'&&Number.isFinite(Number(r.games)));
 state.earliest=state.records.reduce((a,x)=>!a||x.date<a?x.date:a,'');
 state.latest=state.records.reduce((a,x)=>x.date>a?x.date:a,'');
 for(const r of state.records){
  const key=String(r.machineNo);if(!state.byMachine.has(key))state.byMachine.set(key,new Map());
  state.byMachine.get(key).set(r.date,r);
 }
 state.loaded=true;setup();
}).catch(e=>{
 $('dfStatus').className='df-status df-error';
 $('dfStatus').textContent='差枚検索のデータを読み込めませんでした：'+String(e.message||e);
});
})();