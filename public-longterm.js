(()=>{
  const $=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  if(!$('longTermStyle')){
    const style=document.createElement('style');
    style.id='longTermStyle';
    style.textContent=`
      .longTermPanel{border-color:#d8e1f0;background:#fbfcff}
      .longTermHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .longTermGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:13px}
      .longTermBlock{border:1px solid #dfe5ee;border-radius:12px;background:#fff;padding:12px;min-width:0}
      .longTermBlock h3{margin:0;font-size:16px}.longTermSub{font-size:10px;color:#6b7280;margin-top:3px;line-height:1.5}
      .longRankList{display:grid;gap:7px;margin-top:10px}.longRankCard{border:1px solid #e5e9ef;border-radius:10px;padding:9px;background:#fafbfc}
      .longRankCard:first-child{border-color:#b9cff3;background:#f6f9ff}.longRankTop{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .longMachine{font-weight:900;font-size:15px}.longScore{font-weight:950;font-size:20px;white-space:nowrap}.longBadge{font-size:9px;border-radius:999px;padding:2px 6px;background:#eef3fb;color:#315b91;margin-right:5px}
      .longType{font-size:10px;color:#5f6368;margin-top:4px}.longMetrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 8px;margin-top:7px;font-size:10px}
      .longMetrics span{color:#6b7280}.longMetrics strong{text-align:right;font-variant-numeric:tabular-nums}.longReason{margin-top:7px;font-size:10px;line-height:1.6;color:#4b5563}
      .longTermFoot{font-size:10px;color:#6b7280;margin-top:10px;line-height:1.65}
      @media(max-width:900px){.longTermGrid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function activeMachines(records){
    const dates=records.map(r=>String(r.date||'')).filter(Boolean).sort();
    if(!dates.length)return [];
    const latest=dates[dates.length-1];
    return [...new Set(records.filter(r=>String(r.date)===latest).map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  }

  function rowsFor(records,machine,n){
    return records.filter(r=>String(r.machineNo)===String(machine)&&Number(r.games)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-n);
  }

  function metrics(rows){
    const n=rows.length;
    const games=rows.reduce((a,r)=>a+(Number(r.games)||0),0);
    const diff=rows.reduce((a,r)=>a+(Number(r.diff)||0),0);
    const bb=rows.reduce((a,r)=>a+(Number(r.bb)||0),0);
    const rb=rows.reduce((a,r)=>a+(Number(r.rb)||0),0);
    const win=rows.filter(r=>Number(r.diff)>0).length;
    const perDay=rows.map(r=>(Number(r.diff)||0)/(Number(r.games)||1));
    const avg=games?diff/games:0;
    const mean=perDay.length?perDay.reduce((a,b)=>a+b,0)/perDay.length:0;
    const vol=perDay.length?Math.sqrt(perDay.reduce((a,b)=>a+(b-mean)*(b-mean),0)/perDay.length):0;
    const k=Math.max(1,Math.floor(n/3));
    const first=rows.slice(0,k),last=rows.slice(-k);
    const fG=first.reduce((a,r)=>a+(Number(r.games)||0),0),fD=first.reduce((a,r)=>a+(Number(r.diff)||0),0);
    const lG=last.reduce((a,r)=>a+(Number(r.games)||0),0),lD=last.reduce((a,r)=>a+(Number(r.diff)||0),0);
    const trend=(lG?lD/lG:0)-(fG?fD/fG:0);
    return {
      n,games,diff,perGame:avg,winRate:n?win/n:0,
      bbProb:bb?games/bb:9999,rbProb:rb?games/rb:9999,totalProb:(bb+rb)?games/(bb+rb):9999,
      vol,trend,plus3000:rows.filter(r=>Number(r.diff)>=3000).length,minus1500:rows.filter(r=>Number(r.diff)<=-1500).length,
      latest:rows.length?rows[rows.length-1]:null
    };
  }

  function normalize(items,key,inverse=false){
    const vals=items.map(x=>Number(x[key])).filter(Number.isFinite);
    const min=Math.min(...vals),max=Math.max(...vals);
    items.forEach(x=>{const v=Number(x[key]);const z=(max===min)?0.5:(v-min)/(max-min);x['_'+key]=inverse?1-z:z;});
  }

  function typeLabel(m,horizon){
    if(horizon===90){
      if(m.vol>=0.28&&m.plus3000>=2)return '高ボラ・爆発型';
      if(m.vol<=0.17&&m.winRate>=.5)return '安定型';
      if(m.minus1500>=3)return '凹み深め・反発待ち型';
      if(m.perGame>0.08)return '長期上向き型';
      if(m.perGame<-0.08)return '長期下降型';
      return '長期横ばい型';
    }
    if(m.perGame>0.10&&m.trend>0.04)return '上昇加速型';
    if(m.perGame>0.04&&m.trend>=-0.04)return '上昇継続型';
    if(m.perGame>0&&m.trend<-0.05)return 'ピークアウト注意';
    if(m.perGame<=0&&m.trend>0.07)return '反転上向き型';
    if(m.perGame<-0.10)return '下降・反転待ち';
    return '横ばい・方向確認';
  }

  function scoreHorizon(records,machines,horizon){
    const items=machines.map(machine=>({machine,...metrics(rowsFor(records,machine,horizon))}));
    normalize(items,'perGame');normalize(items,'winRate');normalize(items,'trend');normalize(items,'totalProb',true);normalize(items,'rbProb',true);normalize(items,'vol',true);normalize(items,'plus3000');normalize(items,'minus1500',true);
    items.forEach(x=>{
      let s;
      if(horizon===7)s=.32*x._perGame+.18*x._winRate+.18*x._trend+.12*x._totalProb+.10*x._rbProb+.10*x._vol;
      else if(horizon===30)s=.30*x._perGame+.20*x._winRate+.10*x._trend+.15*x._totalProb+.10*x._rbProb+.15*x._vol;
      else s=.25*x._perGame+.18*x._winRate+.10*x._totalProb+.10*x._rbProb+.17*x._vol+.10*x._plus3000+.10*x._minus1500;
      const suff=Math.min(1,x.n/Math.min(horizon,12));
      x.score=Math.round((50+(s-.5)*70)*(.88+.12*suff));
      x.score=Math.max(1,Math.min(99,x.score));
      x.type=typeLabel(x,horizon);
    });
    return items.sort((a,b)=>b.score-a.score||b.perGame-a.perGame);
  }

  function reason(x,h){
    const parts=[];
    if(x.perGame>=.15)parts.push('1G差枚が強い'); else if(x.perGame<=-.15)parts.push('1G差枚が弱い');
    if(x.winRate>=.6)parts.push('プラス日率が高い');
    if(x.trend>=.08)parts.push('直近で加速'); else if(x.trend<=-.08)parts.push('直近で減速');
    if(x.rbProb<330)parts.push('REG内容良好');
    if(h===90&&x.plus3000>=2)parts.push('+3000枚日が複数');
    if(h===90&&x.minus1500>=3)parts.push('-1500枚以下が多い');
    return parts.length?parts.slice(0,3).join('・'):'大きな偏りは少なく、総合値で評価';
  }

  function rankHtml(x,i,h){
    const pg=(x.perGame>0?'+':'')+x.perGame.toFixed(3);
    return `<div class="longRankCard"><div class="longRankTop"><div><span class="longBadge">${i+1}位</span><span class="longMachine">${esc(x.machine)}</span></div><div class="longScore">${x.score}</div></div><div class="longType">${esc(x.type)} / ${x.n}実稼働日</div><div class="longMetrics"><span>総差枚</span><strong class="${x.diff>0?'blue':x.diff<0?'red':''}">${signed(x.diff)}枚</strong><span>1G差枚</span><strong class="${x.perGame>0?'blue':x.perGame<0?'red':''}">${pg}枚/G</strong><span>プラス日率</span><strong>${(x.winRate*100).toFixed(1)}%</strong><span>合算</span><strong>1/${x.totalProb<9000?x.totalProb.toFixed(1):'-'}</strong><span>BIG</span><strong>1/${x.bbProb<9000?x.bbProb.toFixed(1):'-'}</strong><span>REG</span><strong>1/${x.rbProb<9000?x.rbProb.toFixed(1):'-'}</strong>${h===90?`<span>+3000 / -1500</span><strong>${x.plus3000}回 / ${x.minus1500}回</strong>`:''}</div><div class="longReason">${esc(reason(x,h))}</div></div>`;
  }

  function blockHtml(records,machines,h,title,sub){
    const ranked=scoreHorizon(records,machines,h);
    return `<div class="longTermBlock"><h3>${title}</h3><div class="longTermSub">${sub}</div><div class="longRankList">${ranked.map((x,i)=>rankHtml(x,i,h)).join('')}</div></div>`;
  }

  function renderLongTerm(){
    if(typeof RECORDS==='undefined'||!RECORDS.length)return;
    const machines=activeMachines(RECORDS);
    if(!machines.length)return;
    let panel=$('longTermPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.id='longTermPanel';panel.className='panel longTermPanel';
      const anchor=$('rangePanel')||$('mainPanel');
      anchor.parentNode.insertBefore(panel,anchor);
    }
    const latest=[...RECORDS.map(r=>String(r.date||'')).filter(Boolean)].sort().pop();
    panel.innerHTML=`<div class="longTermHead"><div><h2>編集長 長期予想</h2><div class="muted">最新 ${esc(latest)} / 現在稼働台 ${machines.join('・')}</div></div><div class="pill">長期波</div></div><div class="longTermGrid">${blockHtml(RECORDS,machines,7,'7日予想','短中期の勢い・1G差枚・加速を重視')}${blockHtml(RECORDS,machines,30,'30日予想','安定性・勝率・BIG/REG内容を重視')}${blockHtml(RECORDS,machines,90,'90日傾向','爆発頻度・大幅凹み・ブレ幅から台の性格を見る')}</div><div class="longTermFoot">スコアは各台を同じ期間で比較する0〜100の相対評価で、勝率や当たり確率ではありません。0G日は除外。長期では「凹んだから出る」「連勝だから続く」を前提にせず、期間内の差枚効率・ボーナス内容・波の安定性をまとめて比較します。</div>`;
  }

  const timer=setInterval(()=>{if(typeof RECORDS!=='undefined'&&RECORDS.length){clearInterval(timer);renderLongTerm();}},100);
})();
