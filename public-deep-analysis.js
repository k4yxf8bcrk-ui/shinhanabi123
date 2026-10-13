(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const pct=(x,d=1)=>Number.isFinite(x)?(x*100).toFixed(d)+'%':'-';
  const div=(a,b,fallback=0)=>b?Number(a)/Number(b):fallback;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const stdev=a=>{if(!a.length)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))));};
  const dayOfMonth=d=>{const m=String(d||'').match(/-(\d{2})$/);return m?Number(m[1]):0;};
  const weekday=d=>['日','月','火','水','木','金','土'][new Date(String(d)+'T12:00:00').getDay()]||'';
  const prob=(g,c)=>c>0?'1/'+(g/c).toFixed(1):'-';
  const perG=r=>Number(r.games)>0?(Number(r.diff)||0)/Number(r.games):0;
  function style(){
    if($('deepAnalysisStyle'))return;
    const s=document.createElement('style');s.id='deepAnalysisStyle';s.textContent=`
      .deepPanel{border-color:#d8e1f0;background:#fbfcff}.deepHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .deepControls{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-top:12px}.deepControls label{font-size:11px;color:#6b7280;font-weight:800;display:flex;flex-direction:column;gap:4px}.deepControls select{min-width:150px}
      .deepOverview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:13px}.deepOverviewCard{border:1px solid #e1e5eb;border-radius:12px;padding:11px;background:#fff}.deepOverviewCard .m{font-weight:950;font-size:17px}.deepOverviewCard .tagrow{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.deepTag{font-size:9px;border-radius:999px;padding:3px 7px;background:#f1f4f8;color:#4b5563}.deepTag.good{background:#eef5ff;color:#1758a8}.deepTag.warn{background:#fff4e5;color:#9a5b00}.deepTag.bad{background:#fff0ef;color:#a72b20}.deepMini{display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:10px;margin-top:8px}.deepMini span{color:#6b7280}.deepMini b{text-align:right;font-variant-numeric:tabular-nums}
      .deepDetails{margin-top:11px;border:1px solid #e1e5eb;border-radius:11px;background:#fff;overflow:hidden}.deepDetails>summary{list-style:none;cursor:pointer;padding:11px 13px;font-weight:900;display:flex;justify-content:space-between;gap:10px}.deepDetails>summary::-webkit-details-marker{display:none}.deepDetails>summary:after{content:'＋';color:#6b7280}.deepDetails[open]>summary:after{content:'−'}.deepBody{padding:0 12px 12px}.deepGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.deepCard{border:1px solid #e6e9ee;border-radius:9px;padding:9px;background:#fafbfc;min-width:0}.deepCard .k{font-size:10px;color:#6b7280}.deepCard .v{font-size:15px;font-weight:900;margin-top:3px;font-variant-numeric:tabular-nums}.deepCard .sub{font-size:9px;color:#7a828d;margin-top:3px;line-height:1.45}.deepTable{width:100%;min-width:0;border-collapse:collapse;margin-top:7px}.deepTable th,.deepTable td{font-size:10px;padding:6px 7px;border-bottom:1px solid #edf0f3;text-align:right}.deepTable th:first-child,.deepTable td:first-child{text-align:left}.deepNote{font-size:9px;color:#6b7280;line-height:1.55;margin-top:8px}.deepSimilar{display:grid;gap:6px;margin-top:8px}.deepSimilarRow{display:grid;grid-template-columns:75px 70px 1fr;gap:7px;align-items:center;font-size:10px;border-bottom:1px solid #edf0f3;padding-bottom:5px}.deepProfile{font-size:12px;line-height:1.7}.deepScore{font-size:28px;font-weight:950}.deepLegend{font-size:9px;color:#6b7280;line-height:1.6;margin-top:10px}
      @media(max-width:900px){.deepOverview,.deepGrid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.deepOverview,.deepGrid{grid-template-columns:1fr}.deepSimilarRow{grid-template-columns:65px 60px 1fr}}
    `;document.head.appendChild(s);
  }
  function aggregateMachine(records,machine){
    const map=new Map();
    records.filter(r=>String(r.machineNo)===String(machine)).forEach(r=>{
      const d=String(r.date||'');if(!d)return;
      if(!map.has(d))map.set(d,{date:d,weekday:r.weekday||weekday(d),games:0,diff:0,bb:0,rb:0});
      const x=map.get(d);x.games+=Number(r.games)||0;x.diff+=Number(r.diff)||0;x.bb+=Number(r.bb)||0;x.rb+=Number(r.rb)||0;
    });
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function activeRows(records,machine){return aggregateMachine(records,machine).filter(r=>r.games>0);}
  function currentMachines(records){
    const latest=records.map(r=>String(r.date||'')).filter(Boolean).sort().pop();
    return {latest,machines:[...new Set(records.filter(r=>String(r.date)===latest).map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b))};
  }
  function periodStats(rows,n){
    const a=rows.slice(-n),g=a.reduce((s,r)=>s+r.games,0),d=a.reduce((s,r)=>s+r.diff,0),bb=a.reduce((s,r)=>s+r.bb,0),rb=a.reduce((s,r)=>s+r.rb,0),wins=a.filter(r=>r.diff>0).length,p=a.map(perG);
    return {rows:a,n:a.length,games:g,diff:d,bb,rb,winRate:a.length?wins/a.length:0,perGame:div(d,g),bbProb:bb?g/bb:9999,rbProb:rb?g/rb:9999,totalProb:(bb+rb)?g/(bb+rb):9999,vol:stdev(p),avgGames:a.length?g/a.length:0};
  }
  function cumulativeMetrics(rows,n=30){
    const a=rows.slice(-n);let c=0,max=0,min=0,maxDD=0;const pts=[0];
    for(const r of a){c+=r.diff;pts.push(c);max=Math.max(max,c);min=Math.min(min,c);maxDD=Math.min(maxDD,c-Math.max(...pts.slice(0,-1)));}
    const range=max-min,pos=range?(c-min)/range:.5;
    let peak=0,trough=0,peakIdx=0,troughIdx=0,run=0,bestPeak=0,bestDraw=0;
    a.forEach((r,i)=>{run+=r.diff;if(run>bestPeak){bestPeak=run;peak=run;peakIdx=i;}const dd=run-bestPeak;if(dd<bestDraw){bestDraw=dd;trough=run;troughIdx=i;}});
    let recovery=0;if(bestDraw<0){const current=c;recovery=clamp((current-trough)/Math.abs(bestDraw),0,1.5);}
    return {current:c,max,min,position:pos,currentDrawdown:c-max,maxDrawdown:maxDD,recovery,peak,trough,peakIdx,troughIdx,range};
  }
  function allTimeMaxDD(rows){let run=0,peak=0,maxDD=0;for(const r of rows){run+=r.diff;peak=Math.max(peak,run);maxDD=Math.min(maxDD,run-peak);}return maxDD;}
  function trendAccel(rows){
    const p=rows.slice(-6).map(perG),last=rows.at(-1)||{},prev=rows.at(-2)||{};const latest=perG(last),previous=perG(prev),delta=latest-previous;
    const recent3=mean(p.slice(-3)),prior3=p.length>=6?mean(p.slice(0,3)):mean(p.slice(0,Math.max(0,p.length-3)));
    return {latest,previous,delta,recent3,prior3,accel:recent3-prior3};
  }
  function contentLabel(rows){
    const last=rows.at(-1);if(!last)return {label:'-',cls:'',sub:''};
    const bp=last.bb?last.games/last.bb:9999,rp=last.rb?last.games/last.rb:9999,tp=(last.bb+last.rb)?last.games/(last.bb+last.rb):9999;
    let label='内容弱め',cls='bad';
    if(tp<=140&&bp<=280&&rp<=350){label='BIG・REGとも良好';cls='good';}
    else if(rp<=300&&last.diff<0){label='内容あり凹み';cls='good';}
    else if(rp<=330){label='REG良好';cls='good';}
    else if(bp<=250){label='BIG先行';cls='warn';}
    else if(tp<=160){label='合算良好';cls='good';}
    else if(last.diff>1000&&rp>=450){label='BIG偏重プラス';cls='warn';}
    return {label,cls,sub:`B ${prob(last.games,last.bb)} / R ${prob(last.games,last.rb)} / 合算 ${prob(last.games,last.bb+last.rb)}`};
  }
  function gQuality(g){if(g>=6000)return['超高稼働','good'];if(g>=4000)return['高稼働','good'];if(g>=2000)return['中稼働',''];if(g>0)return['低稼働','warn'];return['0G','bad'];}
  function confidence(rows){const s=periodStats(rows,90);if(s.n>=45&&s.games>=180000)return['高',3];if(s.n>=20&&s.games>=70000)return['中',2];return['低',1];}
  function diffBand(d){d=Number(d)||0;if(d<=-2000)return'-2000以下';if(d<=-1500)return'-1500〜-1999';if(d<=-1000)return'-1000〜-1499';if(d<=-500)return'-500〜-999';if(d<0)return'-1〜-499';if(d>=3000)return'+3000以上';if(d>=2000)return'+2000〜+2999';if(d>=1000)return'+1000〜+1999';if(d>0)return'+1〜+999';return'0';}
  function nextStatsByBand(rows){
    const bands=['-2000以下','-1500〜-1999','-1000〜-1499','-500〜-999','-1〜-499','+1〜+999','+1000〜+1999','+2000〜+2999','+3000以上'];
    return bands.map(b=>{const next=[];for(let i=0;i<rows.length-1;i++)if(diffBand(rows[i].diff)===b)next.push(rows[i+1]);const g=next.reduce((s,r)=>s+r.games,0),d=next.reduce((s,r)=>s+r.diff,0);return{band:b,n:next.length,plus:next.filter(r=>r.diff>0).length,avg:next.length?d/next.length:0,plus1000:next.filter(r=>r.diff>=1000).length,minus1000:next.filter(r=>r.diff<=-1000).length,avgG:next.length?g/next.length:0};});
  }
  function streakInfo(rows){
    if(!rows.length)return null;const sign=Math.sign(rows.at(-1).diff);if(!sign)return{sign:0,len:0,sum:0};let len=0,sum=0;for(let i=rows.length-1;i>=0;i--){if(Math.sign(rows[i].diff)!==sign)break;len++;sum+=rows[i].diff;}const next=[];for(let i=0;i<rows.length-1;i++){let l=0;for(let j=i;j>=0;j--){if(Math.sign(rows[j].diff)!==sign)break;l++;}if(Math.sign(rows[i].diff)===sign&&l===len)next.push(rows[i+1]);}return{sign,len,sum,n:next.length,plus:next.filter(r=>r.diff>0).length,avg:next.length?mean(next.map(r=>r.diff)):0};
  }
  function thresholdAfter(rows,threshold,dir='down'){
    const hits=[];for(let i=0;i<rows.length-1;i++){const ok=dir==='down'?rows[i].diff<=threshold:rows[i].diff>=threshold;if(ok)hits.push({r:rows[i],next:rows[i+1],next3:rows.slice(i+1,i+4)});}
    return {n:hits.length,plus:hits.filter(x=>x.next.diff>0).length,avg:hits.length?mean(hits.map(x=>x.next.diff)):0,plus1000:hits.filter(x=>x.next.diff>=1000).length,plusWithin3:hits.filter(x=>x.next3.some(r=>r.diff>=1000)).length,minus1000:hits.filter(x=>x.next.diff<=-1000).length};
  }
  function storeRelative(records,machines,machine){
    const byDate=new Map();for(const m of machines){for(const r of activeRows(records,m)){if(!byDate.has(r.date))byDate.set(r.date,[]);byDate.get(r.date).push({...r,machine:m});}}
    const obs=[];for(const [date,arr] of byDate){if(arr.length<2)continue;const me=arr.find(x=>String(x.machine)===String(machine));if(!me)continue;const sorted=[...arr].sort((a,b)=>b.diff-a.diff);const rank=sorted.findIndex(x=>String(x.machine)===String(machine))+1,avg=mean(arr.map(x=>x.diff));obs.push({date,rank,count:arr.length,rel:me.diff-avg,diff:me.diff});}
    obs.sort((a,b)=>a.date.localeCompare(b.date));const last30=obs.slice(-30),latest=obs.at(-1);return{latest,avgRank:last30.length?mean(last30.map(x=>x.rank)):0,top1:last30.length?last30.filter(x=>x.rank===1).length/last30.length:0,top2:last30.length?last30.filter(x=>x.rank<=2).length/last30.length:0,rel30:last30.length?mean(last30.map(x=>x.rel)):0,n:last30.length};
  }
  function calendarStats(rows){
    const make=(keyFn,order)=>order.map(k=>{const a=rows.filter(r=>keyFn(r)===k),g=a.reduce((s,r)=>s+r.games,0),d=a.reduce((s,r)=>s+r.diff,0);return{k,n:a.length,plus:a.length?a.filter(r=>r.diff>0).length/a.length:0,avg:a.length?d/a.length:0,perGame:div(d,g)};});
    const wd=make(r=>weekday(r.date),['月','火','水','木','金','土','日']);
    const endings=make(r=>dayOfMonth(r.date)%10,[0,1,2,3,4,5,6,7,8,9]);
    const thirds=make(r=>dayOfMonth(r.date)<=10?'1〜10日':dayOfMonth(r.date)<=20?'11〜20日':'21日〜末',['1〜10日','11〜20日','21日〜末']);
    const daytypes=make(r=>{const w=weekday(r.date);return(w==='土'||w==='日')?'週末':'平日';},['平日','週末']);
    const payday=make(r=>dayOfMonth(r.date)>=20&&dayOfMonth(r.date)<=25?'20〜25日帯':'その他',['20〜25日帯','その他']);
    return{wd,endings,thirds,daytypes,payday};
  }
  function waveSignals(rows,store){
    const a=rows.slice(-30),pg=a.map(perG),c=[];let s=0;a.forEach(r=>{s+=r.diff;c.push(s);});
    const ma=(arr,n,i)=>i+1<n?null:mean(arr.slice(i-n+1,i+1));
    let golden=false,dead=false;if(pg.length>=8){const i=pg.length-1,sp=ma(pg,3,i-1),lp=ma(pg,7,i-1),sn=ma(pg,3,i),ln=ma(pg,7,i);golden=sp!==null&&lp!==null&&sp<=lp&&sn>ln;dead=sp!==null&&lp!==null&&sp>=lp&&sn<ln;}
    let dbl=false;if(c.length>=8){const range=Math.max(...c)-Math.min(...c)||1,mins=[];for(let i=1;i<c.length-1;i++)if(c[i]<=c[i-1]&&c[i]<=c[i+1])mins.push({i,v:c[i]});for(let i=0;i<mins.length;i++)for(let j=i+1;j<mins.length;j++){if(mins[j].i-mins[i].i>=3&&Math.abs(mins[j].v-mins[i].v)<=range*.15&&c.at(-1)>mins[j].v+range*.2)dbl=true;}}
    const cm=cumulativeMetrics(rows,30),last3=pg.slice(-3),holdLike=last3.length===3&&last3.every(x=>x<-.05)&&stdev(last3)<.08;
    const upTurn=pg.length>=3&&pg.at(-3)<0&&pg.at(-2)<0&&pg.at(-1)>.10;
    const vRebound=cm.maxDrawdown<=-1500&&cm.recovery>=.7;
    const bow=pg.length>=3&&pg.at(-3)>.10&&pg.at(-2)>.10&&pg.at(-1)<-.05;
    const showcase=store.latest&&store.latest.rank===1&&store.latest.rel>=1000;
    let breakout='レンジ内';if(c.length>=2){const prevMax=Math.max(...c.slice(0,-1)),prevMin=Math.min(...c.slice(0,-1));if(c.at(-1)>prevMax)breakout='上値ブレイク候補';else if(c.at(-1)<prevMin)breakout='下値割れ';}
    return{golden,dead,dbl,holdLike,upTurn,vRebound,bow,showcase,breakout};
  }
  function similarCases(rows){
    if(rows.length<12)return{cases:[],n:0,plus:0,avg:0,plus1000:0,minus1000:0};
    const featureAt=i=>{
      const r=rows[i],w=rows.slice(Math.max(0,i-5),i+1),p=w.map(perG),g30=rows.slice(Math.max(0,i-29),i+1),cm=cumulativeMetrics(g30,30),st=(()=>{const sign=Math.sign(r.diff);let len=0;for(let j=i;j>=0;j--){if(Math.sign(rows[j].diff)!==sign)break;len++;}return sign*len;})();
      const s=periodStats(g30,30);return[perG(r),mean(p.slice(-3)),r.games/6000,st/4,cm.position,(s.rbProb<9000?1/s.rbProb:0)*300,(s.totalProb<9000?1/s.totalProb:0)*150];
    };
    const cur=featureAt(rows.length-1),weights=[1.5,1.4,.7,.8,.9,.8,.8],scales=[.35,.25,1,1,1,1,1],cases=[];
    for(let i=5;i<rows.length-1;i++){const f=featureAt(i);let d=0;for(let k=0;k<f.length;k++)d+=weights[k]*Math.pow((f[k]-cur[k])/scales[k],2);const sim=100/(1+d);cases.push({date:rows[i].date,sim,next:rows[i+1]});}
    cases.sort((a,b)=>b.sim-a.sim);const top=cases.slice(0,8),next=top.map(x=>x.next);return{cases:top,n:next.length,plus:next.filter(r=>r.diff>0).length,avg:next.length?mean(next.map(r=>r.diff)):0,plus1000:next.filter(r=>r.diff>=1000).length,minus1000:next.filter(r=>r.diff<=-1000).length};
  }
  function profile(rows){
    const s90=periodStats(rows,90),s30=periodStats(rows,30),cm=cumulativeMetrics(rows,30),acc=trendAccel(rows),conf=confidence(rows)[0],tags=[];
    if(s90.vol>=.28)tags.push('高ボラ');else if(s90.vol<=.16)tags.push('安定');
    if(s90.perGame>=.08)tags.push('長期上向き');else if(s90.perGame<=-.08)tags.push('長期弱め');
    const plus3000=s90.rows.filter(r=>r.diff>=3000).length,minus1500=s90.rows.filter(r=>r.diff<=-1500).length;
    if(plus3000>=2)tags.push('爆発日あり');if(minus1500>=3)tags.push('深い凹みあり');if(cm.recovery>=.7&&cm.maxDrawdown<=-1500)tags.push('回復力あり');if(acc.accel>.08)tags.push('直近加速');if(acc.accel<-.08)tags.push('直近減速');
    if(!tags.length)tags.push('横ばい型');
    const score=clamp(Math.round(50+s30.perGame*90+(s30.winRate-.5)*30-s30.vol*18+(acc.accel*25)),1,99);
    return{tags,conf,score,s90,s30,cm};
  }
  function card(k,v,sub='',cls=''){return `<div class="deepCard"><div class="k">${esc(k)}</div><div class="v ${cls}">${v}</div>${sub?`<div class="sub">${esc(sub)}</div>`:''}</div>`;}
  function table(headers,rows){return `<table class="deepTable"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td>${i===0?esc(x):x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  function overviewCard(records,machines,m){
    const rows=activeRows(records,m),p=profile(rows),cm=p.cm,acc=trendAccel(rows),cont=contentLabel(rows),gq=gQuality(rows.at(-1)?.games||0),store=storeRelative(records,machines,m),pos=Math.round(cm.position*100);
    const tags=[`30日位置 ${pos}%`,p.tags[0],cont.label,gq[0],`信頼度 ${p.conf}`];
    return `<div class="deepOverviewCard"><div class="m">${esc(m)}</div><div class="tagrow">${tags.map((t,i)=>`<span class="deepTag ${i===0&&pos>=75?'warn':i===0&&pos<=25?'bad':i===2?cont.cls:i===3?gq[1]:''}">${esc(t)}</span>`).join('')}</div><div class="deepMini"><span>30日 1G差枚</span><b class="${p.s30.perGame>=0?'blue':'red'}">${p.s30.perGame>=0?'+':''}${p.s30.perGame.toFixed(3)}</b><span>現在DD</span><b class="${cm.currentDrawdown<0?'red':''}">${signed(cm.currentDrawdown)}枚</b><span>加速度</span><b class="${acc.accel>=0?'blue':'red'}">${acc.accel>=0?'+':''}${acc.accel.toFixed(3)}</b><span>店内30日平均順位</span><b>${store.n?store.avgRank.toFixed(2):'-'}</b></div></div>`;
  }
  function renderMachine(records,machines,m){
    const rows=activeRows(records,m),last=rows.at(-1);if(!last)return'<div class="muted">データなし</div>';
    const s30=periodStats(rows,30),s90=periodStats(rows,90),cm=cumulativeMetrics(rows,30),acc=trendAccel(rows),cont=contentLabel(rows),gq=gQuality(last.games),conf=confidence(rows),st=streakInfo(rows),bands=nextStatsByBand(rows),curBand=diffBand(last.diff),store=storeRelative(records,machines,m),cal=calendarStats(rows),waves=waveSignals(rows,store),sim=similarCases(rows),prof=profile(rows),maxDD=allTimeMaxDD(rows);
    const waveTags=[];if(waves.golden)waveTags.push('ゴールデンクロス候補');if(waves.dead)waveTags.push('デッドクロス候補');if(waves.dbl)waveTags.push('ダブルボトム候補');if(waves.vRebound)waveTags.push('V字回復候補');if(waves.bow)waveTags.push('お辞儀・ピークアウト候補');if(waves.holdLike)waveTags.push('据え置き波候補（形状）');if(waves.upTurn)waveTags.push('上向き反転候補');if(waves.showcase)waveTags.push('目立ち台候補');waveTags.push(waves.breakout);
    const dips=[-500,-1000,-1500,-2000].map(t=>({t,...thresholdAfter(rows,t,'down')}));
    const peaks=[1000,2000,3000].map(t=>({t,...thresholdAfter(rows,t,'up')}));
    const state=`<details class="deepDetails" open><summary>① 現在位置・波形・内容</summary><div class="deepBody"><div class="deepGrid">${card('30日レンジ位置',Math.round(cm.position*100)+'%','0%=安値圏 / 100%=高値圏')}${card('現在ドローダウン',signed(cm.currentDrawdown)+'枚',`30日最大DD ${signed(cm.maxDrawdown)}枚 / 全期間 ${signed(maxDD)}枚`,cm.currentDrawdown<0?'red':'')}${card('回復率',pct(cm.recovery),'直近の大きな下落からの戻り',cm.recovery>=.7?'blue':'')}${card('1G差枚 加速度',(acc.accel>=0?'+':'')+acc.accel.toFixed(3),'直近3日平均 − その前3日平均',acc.accel>=0?'blue':'red')}${card('最新稼働',fmt(last.games)+'G',gq[0])}${card('BIG / REG内容',cont.label,cont.sub,cont.cls==='good'?'blue':cont.cls==='bad'?'red':'')}${card('30日ボラティリティ',s30.vol.toFixed(3),s30.vol>=.28?'荒波':s30.vol<=.16?'安定':'中程度')}${card('30日合算',prob(s30.games,s30.bb+s30.rb),`B ${prob(s30.games,s30.bb)} / R ${prob(s30.games,s30.rb)}`)}${card('サンプル信頼度',conf[0],`${s90.n}実稼働日 / ${fmt(s90.games)}G`)}</div><div class="tagrow" style="margin-top:9px">${waveTags.map(t=>`<span class="deepTag">${esc(t)}</span>`).join('')}</div><div class="deepNote">支持線・抵抗線・クロス・W底などは日次集計から作る近似的な形状判定です。設定変更や店舗意図の証明ではありません。300〜500G周期や朝一の挙動は日次データだけでは判定できません。</div></div></details>`;
    const bandRows=bands.map(x=>[x.band,`${x.n}件`,x.n?pct(x.plus/x.n):'-',x.n?signed(x.avg)+'枚':'-',x.n?pct(x.plus1000/x.n):'-',x.n?pct(x.minus1000/x.n):'-']);
    const streakText=st&&st.sign?`${st.len}実稼働日連続${st.sign>0?'プラス':'マイナス'} / ${signed(st.sum)}枚`:'連続なし';
    const cond=`<details class="deepDetails"><summary>② 前日条件・連続・反発・ピーク後</summary><div class="deepBody"><div class="deepGrid">${card('現在の前日条件',curBand,'過去の同帯域を下表で集計')}${card('現在の連続状態',streakText,st&&st.n?`過去同条件 ${st.n}件 / 翌実稼働日+ ${pct(st.plus/st.n)} / 平均 ${signed(st.avg)}枚`:'同条件サンプルなし')}${card('最新差枚',signed(last.diff)+'枚',last.date)}</div>${table(['条件','件数','翌日+','翌日平均','+1000','-1000'],bandRows)}<div class="deepGrid" style="margin-top:9px">${dips.map(x=>card(`${x.t}枚以下の後`,x.n?`翌日+ ${pct(x.plus/x.n)}`:'-',x.n?`n=${x.n} / 平均 ${signed(x.avg)}枚 / 3日以内+1000 ${pct(x.plusWithin3/x.n)}`:'サンプルなし')).join('')}${peaks.map(x=>card(`+${x.t}枚以上の後`,x.n?`翌日+ ${pct(x.plus/x.n)}`:'-',x.n?`n=${x.n} / 平均 ${signed(x.avg)}枚 / 翌日-1000 ${pct(x.minus1000/x.n)}`:'サンプルなし')).join('')}</div></div></details>`;
    const storeSec=`<details class="deepDetails"><summary>③ 店内順位・相対強度</summary><div class="deepBody"><div class="deepGrid">${card('最新店内順位',store.latest?`${store.latest.rank}/${store.latest.count}`:'-',store.latest?`${store.latest.date} / 相対差 ${signed(store.latest.rel)}枚`:'')}${card('30日平均順位',store.n?store.avgRank.toFixed(2):'-',`${store.n}日比較`)}${card('30日 1位率',store.n?pct(store.top1):'-','同じ現役台構成内')}${card('30日 上位2台率',store.n?pct(store.top2):'-','同じ現役台構成内')}${card('30日 相対差枚',store.n?signed(store.rel30)+'枚':'-','同日平均との差')}</div><div class="deepNote">店内比較は現在の現役台番同士で比較します。「目立ち台候補」は結果が他台より大きく目立ったという意味で、店舗の意図や設定を示すものではありません。</div></div></details>`;
    const calTable=(title,a)=>`<div class="deepCard"><div class="k">${esc(title)}</div>${table(['条件','n','+率','平均','枚/G'],a.map(x=>[String(x.k),String(x.n),x.n?pct(x.plus):'-',x.n?signed(x.avg):'-',x.n?(x.perGame>=0?'+':'')+x.perGame.toFixed(3):'-']))}</div>`;
    const calSec=`<details class="deepDetails"><summary>④ 曜日・日付末尾・月内時期</summary><div class="deepBody"><div class="deepGrid">${calTable('曜日 × 台番',cal.wd)}${calTable('日付末尾 × 台番',cal.endings)}${calTable('月前半・中盤・後半',cal.thirds)}${calTable('平日 / 週末',cal.daytypes)}${calTable('20〜25日帯（仮区分）',cal.payday)}</div><div class="deepNote">「20〜25日帯」は給与日を直接取得したものではなく、単なる日付帯比較です。曜日・末尾・時期はサンプルが少ない場合に大きく振れます。</div></div></details>`;
    const simRows=sim.cases.map(x=>`<div class="deepSimilarRow"><span>${esc(x.date)}</span><b>${x.sim.toFixed(0)}点</b><span>次 ${signed(x.next.diff)}枚 / ${fmt(x.next.games)}G</span></div>`).join('');
    const simSec=`<details class="deepDetails"><summary>⑤ 類似過去ケース</summary><div class="deepBody"><div class="deepGrid">${card('類似ケース数',String(sim.n),'上位8件を使用')}${card('次の実稼働日プラス率',sim.n?pct(sim.plus/sim.n):'-',sim.n?`${sim.plus}/${sim.n}`:'')}${card('次の平均差枚',sim.n?signed(sim.avg)+'枚':'-')}${card('+1000枚以上',sim.n?pct(sim.plus1000/sim.n):'-')}${card('-1000枚以下',sim.n?pct(sim.minus1000/sim.n):'-')}</div><div class="deepSimilar">${simRows||'<div class="muted">サンプル不足</div>'}</div><div class="deepNote">類似度は直近1G差枚、直近3日、G数、連続状態、30日位置、REG・合算などを数値化した簡易距離です。未来の確率そのものではありません。</div></div></details>`;
    const profileSec=`<details class="deepDetails"><summary>⑥ 台カルテ・総合タイプ</summary><div class="deepBody"><div class="deepGrid">${card('カルテスコア',prof.score+'点','相対的な状態スコア')}${card('90日 1G差枚',(s90.perGame>=0?'+':'')+s90.perGame.toFixed(3)+'枚/G',`${s90.n}実稼働日`)}${card('90日 プラス率',pct(s90.winRate),`${s90.rows.filter(r=>r.diff>0).length}/${s90.n}`)}${card('+3000枚日',s90.rows.filter(r=>r.diff>=3000).length+'回')}${card('-1500枚以下',s90.rows.filter(r=>r.diff<=-1500).length+'回')}${card('90日ボラ',s90.vol.toFixed(3))}</div><div class="tagrow" style="margin-top:9px">${prof.tags.map(t=>`<span class="deepTag good">${esc(t)}</span>`).join('')}</div><div class="deepProfile" style="margin-top:9px">この台は現在「${esc(prof.tags.join('・'))}」として分類。短期の勢いだけでなく、90日効率・ブレ幅・大幅プラス/マイナス頻度・30日の位置・回復状態を合わせて見ます。</div></div></details>`;
    return state+cond+storeSec+calSec+simSec+profileSec;
  }
  function render(){
    if(typeof RECORDS==='undefined'||!RECORDS.length)return false;style();const {latest,machines}=currentMachines(RECORDS);if(!machines.length)return false;
    let panel=$('deepAnalysisPanel');if(!panel){panel=document.createElement('section');panel.id='deepAnalysisPanel';panel.className='panel deepPanel';const anchor=$('rangePanel')||$('mainPanel');const lt=$('longTermPanel');if(lt)lt.insertAdjacentElement('afterend',panel);else anchor.parentNode.insertBefore(panel,anchor);}
    panel.innerHTML=`<div class="deepHead"><div><h2>多角度分析</h2><div class="muted">前日条件・反発・ピーク後・高値安値・ドローダウン・BIG/REG・店内順位・曜日・末尾・類似ケースまで統合</div></div><div class="pill">分析カルテ</div></div><div class="deepOverview">${machines.map(m=>overviewCard(RECORDS,machines,m)).join('')}</div><div class="deepControls"><label>詳しく見る台<select id="deepMachineSel">${machines.map(m=>`<option value="${esc(m)}">台番 ${esc(m)}</option>`).join('')}</select></label><div class="muted">最新 ${esc(latest)} / 0G日は条件集計から除外</div></div><div id="deepMachineBody"></div><div class="deepLegend">ここでの「予想」「波」「ブレイク」「反発」は過去の日次データから作る記述的な分析です。スロットの抽選は株価チャートと同じ仕組みではなく、形状だけで次の結果や設定を確定することはできません。</div>`;
    const sel=$('deepMachineSel'),body=$('deepMachineBody');const draw=()=>body.innerHTML=renderMachine(RECORDS,machines,sel.value);sel.addEventListener('change',draw);draw();return true;
  }
  if(!render()){const t=setInterval(()=>{if(render())clearInterval(t);},120);setTimeout(()=>clearInterval(t),12000);}
})();
