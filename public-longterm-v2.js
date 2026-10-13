(()=>{
  const $=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const sd=a=>{if(!a.length)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))));};
  const prob=(g,c)=>c>0?g/c:9999;
  const perG=r=>Number(r.games)>0?(Number(r.diff)||0)/Number(r.games):0;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  function style(){
    if($('longTermStyleV2'))return;
    const s=document.createElement('style');s.id='longTermStyleV2';s.textContent=`
      .longTermPanel{border-color:#d8e1f0;background:#fbfcff}.longTermHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .longOverall{margin-top:12px;border:1px solid #cfdcf1;border-radius:12px;background:#f7faff;padding:12px}.longOverallTitle{font-weight:950;font-size:15px}.longOverallList{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}
      .longOverallCard{border:1px solid #dfe6f0;border-radius:10px;background:#fff;padding:10px}.longOverallCard:first-child{border-color:#a9c4ef;box-shadow:0 0 0 1px #e5efff inset}.longOverallTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.longOverallScore{font-size:22px;font-weight:950}.longOverallWhy{font-size:10px;color:#4b5563;line-height:1.55;margin-top:6px}
      .longTermGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:13px}.longTermBlock{border:1px solid #dfe5ee;border-radius:12px;background:#fff;padding:12px;min-width:0}.longTermBlock h3{margin:0;font-size:16px}.longTermSub{font-size:10px;color:#6b7280;margin-top:3px;line-height:1.5}
      .longRankList{display:grid;gap:7px;margin-top:10px}.longRankCard{border:1px solid #e5e9ef;border-radius:10px;padding:9px;background:#fafbfc}.longRankCard:first-child{border-color:#b9cff3;background:#f6f9ff}.longRankTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.longMachine{font-weight:900;font-size:15px}.longScore{font-weight:950;font-size:20px;white-space:nowrap}.longBadge{font-size:9px;border-radius:999px;padding:2px 6px;background:#eef3fb;color:#315b91;margin-right:5px}.longConfidence{font-size:9px;border-radius:999px;padding:2px 6px;background:#f0f2f5;color:#4b5563;margin-left:5px}
      .longType{font-size:10px;color:#5f6368;margin-top:4px}.longMetrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 8px;margin-top:7px;font-size:10px}.longMetrics span{color:#6b7280}.longMetrics strong{text-align:right;font-variant-numeric:tabular-nums}.longReason{margin-top:7px;font-size:10px;line-height:1.6;color:#4b5563}.longDeep{margin-top:7px;padding-top:7px;border-top:1px dashed #e2e7ee;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 8px;font-size:9px}.longDeep span{color:#6b7280}.longDeep b{text-align:right;font-weight:800}.longTermFoot{font-size:10px;color:#6b7280;margin-top:10px;line-height:1.65}
      @media(max-width:900px){.longTermGrid,.longOverallList{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function aggregate(records,machine){
    const map=new Map();
    records.filter(r=>String(r.machineNo)===String(machine)).forEach(r=>{
      const d=String(r.date||'');if(!d)return;
      if(!map.has(d))map.set(d,{date:d,games:0,diff:0,bb:0,rb:0});
      const x=map.get(d);x.games+=Number(r.games)||0;x.diff+=Number(r.diff)||0;x.bb+=Number(r.bb)||0;x.rb+=Number(r.rb)||0;
    });
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function activeMachines(records){
    const latest=records.map(r=>String(r.date||'')).filter(Boolean).sort().pop();
    return latest?[...new Set(records.filter(r=>String(r.date)===latest).map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b)):[];
  }
  function activeRows(records,machine){return aggregate(records,machine).filter(r=>r.games>0);}

  function metrics(rows){
    const n=rows.length,games=rows.reduce((s,r)=>s+r.games,0),diff=rows.reduce((s,r)=>s+r.diff,0),bb=rows.reduce((s,r)=>s+r.bb,0),rb=rows.reduce((s,r)=>s+r.rb,0);
    const p=rows.map(perG),k=Math.max(1,Math.floor(n/3)),first=rows.slice(0,k),last=rows.slice(-k);
    const fG=first.reduce((s,r)=>s+r.games,0),fD=first.reduce((s,r)=>s+r.diff,0),lG=last.reduce((s,r)=>s+r.games,0),lD=last.reduce((s,r)=>s+r.diff,0);
    return {n,games,diff,perGame:games?diff/games:0,winRate:n?rows.filter(r=>r.diff>0).length/n:0,bbProb:prob(games,bb),rbProb:prob(games,rb),totalProb:prob(games,bb+rb),vol:sd(p),trend:(lG?lD/lG:0)-(fG?fD/fG:0),plus3000:rows.filter(r=>r.diff>=3000).length,minus1500:rows.filter(r=>r.diff<=-1500).length,avgGames:n?games/n:0};
  }
  function drawdown(rows){
    let c=0,peak=0,trough=0,maxDD=0;for(const r of rows){c+=r.diff;peak=Math.max(peak,c);trough=Math.min(trough,c);maxDD=Math.min(maxDD,c-peak);}const range=peak-trough;return{cum:c,peak,trough,currentDD:c-peak,maxDD,position:range?(c-trough)/range:.5,recovery:maxDD<0?clamp((c-trough)/Math.abs(maxDD),0,1.5):1};
  }
  function accel(rows){const p=rows.slice(-6).map(perG),a=p.slice(-3),b=p.slice(0,Math.max(0,p.length-3));return mean(a)-mean(b.length?b:a);}
  function conditionBand(d){if(d<=-2000)return'<=-2000';if(d<=-1500)return'-1500~-1999';if(d<=-1000)return'-1000~-1499';if(d<=-500)return'-500~-999';if(d<0)return'-1~-499';if(d>=3000)return'>=+3000';if(d>=2000)return'+2000~+2999';if(d>=1000)return'+1000~+1999';if(d>=500)return'+500~+999';return'0~+499';}
  function sameCondition(rows){
    if(!rows.length)return{n:0,plusRate:.5,avgDiff:0};const band=conditionBand(rows.at(-1).diff),out=[];
    for(let i=0;i<rows.length-1;i++)if(conditionBand(rows[i].diff)===band)out.push(rows[i+1]);
    return{n:out.length,plusRate:out.length?out.filter(x=>x.diff>0).length/out.length:.5,avgDiff:out.length?mean(out.map(x=>x.diff)):0,band};
  }
  function similarCases(rows){
    if(rows.length<3)return{n:0,plusRate:.5,avgDiff:0};const cur=rows.at(-1);const feat=x=>[x.diff/2000,perG(x)/.3,x.games/6000,prob(x.games,x.bb)/300,prob(x.games,x.rb)/350];const cf=feat(cur),c=[];
    for(let i=0;i<rows.length-1;i++){const f=feat(rows[i]);const dist=Math.sqrt(f.reduce((s,v,j)=>s+(v-cf[j])*(v-cf[j]),0));c.push({dist,next:rows[i+1]});}
    c.sort((a,b)=>a.dist-b.dist);const top=c.slice(0,8);return{n:top.length,plusRate:top.length?top.filter(x=>x.next.diff>0).length/top.length:.5,avgDiff:top.length?mean(top.map(x=>x.next.diff)):0};
  }
  function storeStats(records,machines,machine,n){
    const maps={};machines.forEach(m=>maps[m]=new Map(activeRows(records,m).map(r=>[r.date,r])));const dates=[...new Set(machines.flatMap(m=>[...maps[m].keys()]))].sort();const hist=[];
    for(const d of dates){const rows=machines.map(m=>maps[m].get(d)).filter(Boolean).sort((a,b)=>b.diff-a.diff);if(rows.length<2)continue;const avg=mean(rows.map(x=>x.diff));rows.forEach((r,i)=>{if(maps[machine].get(d)===r)hist.push({rank:i+1,field:rows.length,vs:r.diff-avg});});}
    const a=hist.slice(-n);return{n:a.length,avgRank:a.length?mean(a.map(x=>x.rank)):9,top2:a.length?a.filter(x=>x.rank<=2).length/a.length:.5,avgVs:a.length?mean(a.map(x=>x.vs)):0};
  }
  function confidence(m){if(m.n>=30&&m.games>=80000)return'高';if(m.n>=10&&m.games>=30000)return'中〜高';if(m.games>=15000)return'中';return'低め';}
  function typeLabel(m,h){
    if(h===90){if(m.vol>=.30&&m.plus3000>=2)return'高ボラ・爆発型';if(m.vol<=.20&&m.winRate>=.5)return'安定型';if(m.minus1500>=3)return'凹み深め・要反転確認型';if(m.perGame>.07)return'長期上向き型';if(m.perGame<-.07)return'長期下降型';return'長期横ばい型';}
    if(m.perGame>.10&&m.trend>.04)return'上昇加速型';if(m.perGame>.04&&m.trend>=-.04)return'上昇継続型';if(m.perGame>0&&m.trend<-.05)return'ピークアウト注意';if(m.perGame<=0&&m.trend>.07)return'反転上向き型';if(m.perGame<-.10)return'下降・要反転確認';return'横ばい・方向確認';
  }
  function normalize(items,key,inverse=false){const vals=items.map(x=>Number(x[key])).filter(Number.isFinite),lo=Math.min(...vals),hi=Math.max(...vals);items.forEach(x=>{const v=Number(x[key]),z=hi===lo?.5:(v-lo)/(hi-lo);x['_'+key]=inverse?1-z:z;});}

  function scoreHorizon(records,machines,h){
    const items=machines.map(machine=>{const all=activeRows(records,machine),r=all.slice(-h),m=metrics(r),dd=drawdown(r),sc=sameCondition(all),sim=similarCases(all),st=storeStats(records,machines,machine,h),ac=accel(all);return{machine,...m,dd,sc,sim,st,accel:ac};});
    normalize(items,'perGame');normalize(items,'winRate');normalize(items,'trend');normalize(items,'totalProb',true);normalize(items,'rbProb',true);normalize(items,'vol',true);normalize(items,'plus3000');normalize(items,'minus1500',true);normalize(items,'accel');
    items.forEach(x=>{x.same=x.sc.plusRate;x.similar=x.sim.plusRate;x.storeScore=1-clamp((x.st.avgRank-1)/Math.max(1,machines.length-1),0,1);x.ddScore=clamp(.5+.5*x.dd.position-.25*clamp(Math.abs(x.dd.currentDD)/5000,0,1),0,1);});
    normalize(items,'same');normalize(items,'similar');normalize(items,'storeScore');normalize(items,'ddScore');
    items.forEach(x=>{let s;if(h===7)s=.22*x._perGame+.12*x._winRate+.10*x._trend+.10*x._totalProb+.08*x._rbProb+.08*x._vol+.10*x._accel+.07*x._same+.05*x._similar+.08*x._storeScore;else if(h===30)s=.20*x._perGame+.12*x._winRate+.07*x._trend+.12*x._totalProb+.08*x._rbProb+.10*x._vol+.08*x._ddScore+.10*x._storeScore+.06*x._same+.07*x._similar;else s=.16*x._perGame+.10*x._winRate+.10*x._totalProb+.08*x._rbProb+.10*x._vol+.08*x._plus3000+.08*x._minus1500+.10*x._storeScore+.07*x._ddScore+.06*x._similar+.07*x._same;const suff=Math.min(1,x.n/Math.min(h,20))*Math.min(1,x.games/Math.max(15000,h*2200));x.score=Math.round(clamp((48+(s-.5)*72)*(.90+.10*suff),1,99));x.type=typeLabel(x,h);x.conf=confidence(x);});
    return items.sort((a,b)=>b.score-a.score||b.perGame-a.perGame);
  }

  function reason(x,h){const p=[];if(x.perGame>=.15)p.push('1G差枚が強い');else if(x.perGame<=-.10)p.push('1G差枚が弱い');if(x.winRate>=.6)p.push('プラス日率が高い');if(x.accel>=.08)p.push('短期加速');else if(x.accel<=-.08)p.push('短期減速');if(x.rbProb<330)p.push('REG良好');if(x.st.top2>=.7)p.push('店内上位率が高い');if(x.sc.n>=8&&x.sc.plusRate>=.55)p.push('同条件後が比較的良い');if(x.sim.n>=6&&x.sim.plusRate>=.625)p.push('類似ケース良好');if(h===90&&x.plus3000>=2)p.push('+3000枚日が複数');return p.length?p.slice(0,4).join('・'):'偏りは小さく、複数指標の総合評価';}
  function rankHtml(x,i,h){const pg=(x.perGame>0?'+':'')+x.perGame.toFixed(3),dd=x.dd.currentDD===0?'高値':signed(x.dd.currentDD)+'枚';return `<div class="longRankCard"><div class="longRankTop"><div><span class="longBadge">${i+1}位</span><span class="longMachine">${esc(x.machine)}</span><span class="longConfidence">参考度 ${x.conf}</span></div><div class="longScore">${x.score}<small>点</small></div></div><div class="longType">${esc(x.type)} / ${x.n}実稼働日</div><div class="longMetrics"><span>総差枚</span><strong class="${x.diff>0?'blue':x.diff<0?'red':''}">${signed(x.diff)}枚</strong><span>1G差枚</span><strong>${pg}枚/G</strong><span>プラス日率</span><strong>${(x.winRate*100).toFixed(1)}%</strong><span>合算</span><strong>${x.totalProb<9000?'1/'+x.totalProb.toFixed(1):'-'}</strong><span>BIG</span><strong>${x.bbProb<9000?'1/'+x.bbProb.toFixed(1):'-'}</strong><span>REG</span><strong>${x.rbProb<9000?'1/'+x.rbProb.toFixed(1):'-'}</strong>${h===90?`<span>+3000 / -1500</span><strong>${x.plus3000}回 / ${x.minus1500}回</strong>`:''}</div><div class="longDeep"><span>現在DD</span><b>${dd}</b><span>店内上位2台率</span><b>${(x.st.top2*100).toFixed(1)}%</b><span>同条件後プラス率</span><b>${x.sc.n?`${(x.sc.plusRate*100).toFixed(1)}% (n=${x.sc.n})`:'-'}</b><span>類似8件プラス率</span><b>${x.sim.n?`${(x.sim.plusRate*100).toFixed(1)}%`:'-'}</b></div><div class="longReason">${esc(reason(x,h))}</div></div>`;}
  function block(records,machines,h,title,sub){const ranked=scoreHorizon(records,machines,h);return{ranked,html:`<div class="longTermBlock"><h3>${title}</h3><div class="longTermSub">${sub}</div><div class="longRankList">${ranked.map((x,i)=>rankHtml(x,i,h)).join('')}</div></div>`};}

  function overall(seven,thirty,ninety){const map={};for(const x of seven)map[x.machine]={machine:x.machine,s7:x.score};for(const x of thirty)(map[x.machine]||(map[x.machine]={machine:x.machine})).s30=x.score;for(const x of ninety)(map[x.machine]||(map[x.machine]={machine:x.machine})).s90=x.score;return Object.values(map).map(x=>({...x,score:Math.round((x.s7||50)*.15+(x.s30||50)*.40+(x.s90||50)*.45)})).sort((a,b)=>b.score-a.score);}
  function overallWhy(x,lookup){const a=lookup[x.machine],p=[];if(a.r30.perGame>.08)p.push('30日1G差枚が強い');if(a.r90.perGame>.05)p.push('90日もプラス基調');if(a.r7.accel>.05)p.push('短期加速');if(a.r30.st.top2>=.75)p.push('店内相対が強い');if(a.r30.sim.plusRate>=.625)p.push('類似ケース良好');if(a.r30.dd.currentDD===0)p.push('30日高値圏');else if(a.r30.dd.position>=.7)p.push('30日レンジ上側');return p.length?p.slice(0,3).join('・'):'7/30/90日のバランスで総合評価';}

  function render(){
    if(typeof RECORDS==='undefined'||!RECORDS.length)return;style();const machines=activeMachines(RECORDS);if(!machines.length)return;const latest=RECORDS.map(r=>String(r.date||'')).filter(Boolean).sort().pop();
    const b7=block(RECORDS,machines,7,'7日予想','短中期の勢い・加速度・直近条件を重視');const b30=block(RECORDS,machines,30,'30日予想','差枚効率・ボーナス内容・店内相対・類似ケースを重視');const b90=block(RECORDS,machines,90,'90日傾向','長期効率・ボラ・大幅伸び/凹み・ドローダウンを重視');
    const ov=overall(b7.ranked,b30.ranked,b90.ranked),lookup={};machines.forEach(m=>lookup[m]={r7:b7.ranked.find(x=>x.machine===m),r30:b30.ranked.find(x=>x.machine===m),r90:b90.ranked.find(x=>x.machine===m)});
    let panel=$('longTermPanel');if(!panel){panel=document.createElement('section');panel.id='longTermPanel';panel.className='panel longTermPanel';const anchor=$('rangePanel')||$('mainPanel');anchor.parentNode.insertBefore(panel,anchor);}panel.innerHTML=`<div class="longTermHead"><div><h2>編集長 長期予想</h2><div class="muted">最新 ${esc(latest)} / 現在稼働台 ${machines.join('・')} / 多角度版</div></div><div class="pill">長期波 v2</div></div><div class="longOverall"><div class="longOverallTitle">長期総合ランキング <span class="muted">7日15%・30日40%・90日45%</span></div><div class="longOverallList">${ov.map((x,i)=>`<div class="longOverallCard"><div class="longOverallTop"><div><span class="longBadge">${i+1}位</span><span class="longMachine">${esc(x.machine)}</span></div><div class="longOverallScore">${x.score}点</div></div><div class="longDeep"><span>7日</span><b>${x.s7}点</b><span>30日</span><b>${x.s30}点</b><span>90日</span><b>${x.s90}点</b></div><div class="longOverallWhy">${esc(overallWhy(x,lookup))}</div></div>`).join('')}</div></div><div class="longTermGrid">${b7.html}${b30.html}${b90.html}</div><div class="longTermFoot">今回から、差枚・1G差枚・勝率・BIG/REG/合算だけでなく、加速度、現在ドローダウン、店内順位、同じ前日差枚帯の次実稼働日、類似過去ケースまで長期評価へ追加しました。スコアは現在稼働台内の0〜100相対評価で、勝率や当たり確率ではありません。0G日は除外。300〜500G周期・朝一挙動・設定変更・店舗意図は日別データだけでは判定しません。</div>`;
  }
  const timer=setInterval(()=>{if(typeof RECORDS!=='undefined'&&RECORDS.length){clearInterval(timer);render();}},100);
})();
