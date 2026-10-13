(()=>{
  const g=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prob=(games,count)=>count>0?'1/'+(games/count).toFixed(1):'-';
  function summarize(rows){
    const games=rows.reduce((a,r)=>a+(Number(r.games)||0),0);
    const diff=rows.reduce((a,r)=>a+(Number(r.diff)||0),0);
    const bb=rows.reduce((a,r)=>a+(Number(r.bb)||0),0);
    const rb=rows.reduce((a,r)=>a+(Number(r.rb)||0),0);
    const days=new Set(rows.filter(r=>Number(r.games)>0).map(r=>String(r.date))).size;
    const daily=new Map();
    for(const r of rows){if(Number(r.games)<=0)continue;const d=String(r.date);daily.set(d,(daily.get(d)||0)+(Number(r.diff)||0));}
    const wins=[...daily.values()].filter(v=>v>0).length;
    return {games,diff,bb,rb,days,winRate:days?wins/days*100:0,perGame:games?diff/games:0,yenPerGame:games?diff/games*20:0,payout:games?(1+diff/(games*3))*100:100};
  }
  function render(){
    if(typeof RECORDS==='undefined'||!RECORDS.length||!g('rangeSummaryGrid'))return;
    const start=g('rangeStart')?.value||'',end=g('rangeEnd')?.value||'';
    const rows=RECORDS.filter(r=>(!start||String(r.date)>=start)&&(!end||String(r.date)<=end));
    if(!rows.length){g('rangeSummaryGrid').innerHTML='<div class="muted">データなし</div>';return;}
    const machines=[...new Set(rows.map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
    const items=machines.map(m=>({machineNo:m,...summarize(rows.filter(r=>String(r.machineNo)===m))}));
    items.push({machineNo:'ALL',isTotal:true,machineCount:machines.length,machineList:machines,...summarize(rows)});
    g('rangeSummaryGrid').innerHTML=items.map(x=>{
      const total=x.bb+x.rb;
      return '<div class="rangeSummaryCard'+(x.isTotal?' total':'')+'">'+
        '<div class="rangeMachine">'+(x.isTotal?'全台合計（期間内'+x.machineCount+'台）':'台番 '+esc(x.machineNo))+'</div>'+
        (x.isTotal?'<div class="rangeMachineList">対象台番: '+x.machineList.map(esc).join(' / ')+'</div>':'')+
        '<dl>'+
        '<dt>日数</dt><dd>'+fmt(x.days)+'日</dd>'+
        '<dt>総回転数</dt><dd>'+fmt(x.games)+'G</dd>'+
        '<dt>総差枚</dt><dd class="'+(x.diff>0?'blue':x.diff<0?'red':'')+'">'+signed(x.diff)+'枚</dd>'+
        '<dt>BIG</dt><dd>'+fmt(x.bb)+'回 / '+prob(x.games,x.bb)+'</dd>'+
        '<dt>REG</dt><dd>'+fmt(x.rb)+'回 / '+prob(x.games,x.rb)+'</dd>'+
        '<dt>合算</dt><dd>'+fmt(total)+'回 / '+prob(x.games,total)+'</dd>'+
        '<dt>1Gあたり差枚</dt><dd class="'+(x.perGame>0?'blue':x.perGame<0?'red':'')+'">'+(x.perGame>0?'+':'')+x.perGame.toFixed(3)+'枚/G</dd>'+
        '<dt>20円換算</dt><dd>'+(x.yenPerGame>0?'+':'')+x.yenPerGame.toFixed(2)+'円/G</dd>'+
        '<dt>機械割</dt><dd>'+x.payout.toFixed(2)+'%</dd>'+
        '<dt>プラス日率</dt><dd>'+x.winRate.toFixed(1)+'%</dd>'+
        '</dl></div>';
    }).join('');
  }
  const bind=()=>{
    ['rangeStart','rangeEnd','rangeAll'].forEach(id=>g(id)?.addEventListener(id==='rangeAll'?'click':'change',()=>setTimeout(render,0)));
    render();
  };
  const timer=setInterval(()=>{if(typeof RECORDS!=='undefined'&&RECORDS.length&&g('rangeSummaryGrid')){clearInterval(timer);bind();}},100);
})();

(()=>{
  const g=id=>document.getElementById(id);
  function setupAiFold(){
    const panel=g('predictionPanel'),grid=g('predictionGrid'),ai=g('aiBox'),acc=g('aiAccuracyBox');
    if(!panel||!grid||!ai||!acc||g('aiPredictionFold'))return false;
    const details=document.createElement('details');
    details.id='aiPredictionFold';
    details.className='aiPredictionFold';
    const summary=document.createElement('summary');
    summary.innerHTML='<span>AI予想を見る</span><small>参考スコア・AI分析・AI的中率</small>';
    const body=document.createElement('div');
    body.className='aiPredictionFoldBody';
    grid.parentNode.insertBefore(details,grid);
    details.appendChild(summary);
    details.appendChild(body);
    body.appendChild(grid);
    body.appendChild(ai);
    body.appendChild(acc);
    details.addEventListener('toggle',()=>{
      const span=summary.querySelector('span');
      if(span)span.textContent=details.open?'AI予想を閉じる':'AI予想を見る';
    });
    if(!g('aiPredictionFoldStyle')){
      const style=document.createElement('style');
      style.id='aiPredictionFoldStyle';
      style.textContent='.aiPredictionFold{margin-top:13px;border:1px solid #c9d9f5;border-radius:12px;background:#fff;overflow:hidden}.aiPredictionFold>summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:900;color:#174ea6;display:flex;align-items:center;justify-content:space-between;gap:10px}.aiPredictionFold>summary::-webkit-details-marker{display:none}.aiPredictionFold>summary:after{content:"＋";font-size:18px;line-height:1}.aiPredictionFold[open]>summary:after{content:"−"}.aiPredictionFold>summary small{font-weight:500;color:#6b7280;font-size:10px;margin-left:auto}.aiPredictionFoldBody{padding:0 12px 12px}.aiPredictionFoldBody .predictionGrid{margin-top:0}@media(max-width:600px){.aiPredictionFold>summary{align-items:flex-start}.aiPredictionFold>summary small{display:none}}';
      document.head.appendChild(style);
    }
    return true;
  }
  if(!setupAiFold()){
    const t=setInterval(()=>{if(setupAiFold())clearInterval(t);},100);
    setTimeout(()=>clearInterval(t),10000);
  }
})();
