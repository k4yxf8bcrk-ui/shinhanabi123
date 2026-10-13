(()=>{
  const $=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const pct=n=>Number.isFinite(Number(n))?(Number(n)*100).toFixed(1)+'%':'-';
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function addStyle(){
    if($('lowSpinStyle'))return;
    const st=document.createElement('style');st.id='lowSpinStyle';st.textContent=`
      .lowSpinPanel{border-color:#d7e1ef;background:#fbfdff}.lowSpinHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.lowSpinGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.lowSpinCard{background:#fff;border:1px solid #dde5ef;border-radius:11px;padding:11px;min-width:0}.lowSpinCard span{display:block;color:#6b7280;font-size:10px}.lowSpinCard strong{display:block;font-size:18px;margin-top:3px;font-variant-numeric:tabular-nums}.lowSpinCard small{display:block;color:#7a828d;font-size:9px;margin-top:3px;line-height:1.45}.lowSpinCompare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.lowSpinCompareCard{background:#fff;border:1px solid #dde5ef;border-radius:10px;padding:10px}.lowSpinCompareCard b{display:block;font-size:12px}.lowSpinCompareCard div{margin-top:5px;font-size:11px;line-height:1.65}.lowSpinTableWrap{overflow:auto;margin-top:11px;border:1px solid #dde5ef;border-radius:10px;background:#fff}.lowSpinTable{width:100%;min-width:700px;border-collapse:collapse;font-variant-numeric:tabular-nums}.lowSpinTable th,.lowSpinTable td{padding:8px 9px;border-bottom:1px solid #edf1f5;font-size:11px;text-align:right;white-space:nowrap}.lowSpinTable th{background:#f6f9fc;color:#5f6368;position:sticky;top:0}.lowSpinTable th:first-child,.lowSpinTable td:first-child{text-align:left}.lowSpinGood{color:#0f7b3e}.lowSpinNeutral{color:#6b7280}.lowSpinWarn{color:#9a5b00}.lowSpinNote{font-size:9px;color:#6b7280;line-height:1.7;margin-top:9px}.lowSpinFlag{display:inline-block;border-radius:999px;padding:3px 7px;font-size:9px;background:#eef5ff;color:#1758a8;margin-left:4px}
      @media(max-width:800px){.lowSpinGrid{grid-template-columns:1fr 1fr}.lowSpinCompare{grid-template-columns:1fr}}@media(max-width:480px){.lowSpinGrid{grid-template-columns:1fr 1fr}.lowSpinCard strong{font-size:16px}}
    `;document.head.appendChild(st);
  }

  function card(title,rate,n,avg,baseline){
    const r=Number(rate),base=Number(baseline)||1/3,cls=r>base+.04?'lowSpinGood':r<base-.04?'lowSpinWarn':'lowSpinNeutral';
    return `<div class="lowSpinCard"><span>${esc(title)}</span><strong class="${cls}">${pct(r)}</strong><small>翌日差枚1位 / ${fmt(n)}件<br>翌日平均 ${signed(avg)}枚</small></div>`;
  }

  function compareCard(label,x){
    return `<div class="lowSpinCompareCard"><b>${esc(label)}</b><div>翌日1位率 ${pct(x?.nextBestRate)}<br>翌日プラス率 ${pct(x?.nextPlusRate)}<br>翌日平均 ${signed(x?.avgNextDiff)}枚</div></div>`;
  }

  async function setup(){
    if($('lowSpinPanel'))return;
    addStyle();
    let data;
    try{
      const res=await fetch('./low-spin-analysis.json?ts='+Date.now(),{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      data=await res.json();
    }catch(e){return;}
    if(!data||!data.all)return;

    const panel=document.createElement('section');panel.id='lowSpinPanel';panel.className='panel lowSpinPanel';
    const b=data.lowGamesBuckets||{},cmp=data.spinRankComparison||{},base=Number(data.baselineBestRate)||1/3;
    const recent=Array.isArray(data.latestCases)?data.latestCases.slice(0,12):[];
    panel.innerHTML=`
      <div class="lowSpinHead"><div><h2>低稼働翌日分析</h2><div class="muted">前日いちばん回っていない台が、翌日にどこまで出たかを過去データで検証</div></div><div class="pill">基準 ${pct(base)}</div></div>
      <div class="lowSpinGrid">
        ${card('全期間',data.all.bestRate,data.all.n,data.all.avgNextDiff,base)}
        ${card('直近30ケース',data.recent30Cases?.bestRate,data.recent30Cases?.n,data.recent30Cases?.avgNextDiff,base)}
        ${card('前日1,500G以下',b['1500']?.bestRate,b['1500']?.n,b['1500']?.avgNextDiff,base)}
        ${card('前日1,000G以下',b['1000']?.bestRate,b['1000']?.n,b['1000']?.avgNextDiff,base)}
      </div>
      <div class="lowSpinCompare">
        ${compareCard('前日 一番回っていない',cmp['1'])}
        ${compareCard('前日 真ん中',cmp['2'])}
        ${compareCard('前日 一番回っている',cmp['3'])}
      </div>
      <div class="lowSpinTableWrap"><table class="lowSpinTable"><thead><tr><th>前日→翌日</th><th>低稼働台</th><th>前日G</th><th>翌日差枚</th><th>翌日順位</th><th>結果</th></tr></thead><tbody>${recent.map(x=>`<tr><td>${esc(x.date)} → ${esc(x.nextDate)}</td><td>${esc(x.lowMachine)}</td><td>${fmt(x.lowGames)}G</td><td class="${Number(x.nextDiff)>=0?'blue':'red'}">${signed(x.nextDiff)}枚</td><td>${fmt(x.nextRank)}位</td><td>${x.nextBest?'<span class="lowSpinGood">差枚1位</span>':x.nextPlus?'<span class="lowSpinNeutral">プラス</span>':'<span class="lowSpinWarn">マイナス</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="lowSpinNote">3台なら無作為に1台を選んだ場合の「翌日差枚1位」は約33.3%。全期間の低稼働台はこの基準とほぼ同程度で、単独では強い法則ではありません。一方、前日1,000G以下のケースはやや高めなので、他の凹み・回復・曜日・直近波と組み合わせる補助材料として表示しています。</div>`;

    const anchor=$('tablePanel');
    if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor);
  }

  let tries=0;const t=setInterval(()=>{
    tries++;
    if(document.body){clearInterval(t);setup();}
    else if(tries>100)clearInterval(t);
  },100);
})();
