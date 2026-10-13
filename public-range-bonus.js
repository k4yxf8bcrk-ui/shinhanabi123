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
