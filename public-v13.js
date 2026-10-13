(()=>{
  const g=id=>document.getElementById(id);
  const esc13=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fmt13=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed13=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt13(n)};
  const short13=d=>d?String(d).replace(/^\d{4}-/,'').replace('-','/'):'-';

  if(modeSel && ![...modeSel.options].some(o=>o.value==='pergame')){
    const opt=document.createElement('option');opt.value='pergame';opt.textContent='1Gあたり差枚';
    const monthly=[...modeSel.options].find(o=>o.value==='monthly');
    monthly?modeSel.insertBefore(opt,monthly):modeSel.appendChild(opt);
  }

  if(!g('rangePanel')){
    g('mainPanel').insertAdjacentHTML('beforebegin',`<section id="rangePanel" class="panel rangePanel" hidden>
      <div class="rangeHead"><div><h2>指定期間集計</h2><div id="rangeInfo" class="muted">期間を選択してください</div></div></div>
      <div class="rangeControls">
        <label>開始日<input id="rangeStart" type="date"></label>
        <label>終了日<input id="rangeEnd" type="date"></label>
        <button id="rangeAll" type="button">全期間に戻す</button>
      </div>
      <div id="rangeSummaryGrid" class="rangeSummaryGrid"></div>
      <div class="rangeFoot">機械割 = (総投入枚数 + 差枚) ÷ 総投入枚数。1G=3枚投入として計算。20円換算 = 1Gあたり差枚×20円。</div>
    </section>`);
  }

  function rangeDaily13(records,machineNo=null){const map=new Map();for(const r of records){if(machineNo!==null&&String(r.machineNo)!==String(machineNo))continue;if(!map.has(r.date))map.set(r.date,{date:r.date,games:0,diff:0});const d=map.get(r.date);d.games+=Number(r.games)||0;d.diff+=Number(r.diff)||0;}return[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
  function rangeMetrics13(ds){const games=ds.reduce((a,d)=>a+(Number(d.games)||0),0),diff=ds.reduce((a,d)=>a+(Number(d.diff)||0),0),days=ds.length,wins=ds.filter(d=>Number(d.diff)>0).length;return{games,diff,days,perGame:games?diff/games:0,yenPerGame:games?diff/games*20:0,payout:games?(1+diff/(games*3))*100:100,winRate:days?wins/days*100:0};}
  function renderRange13(){const box=g('rangeSummaryGrid'),info=g('rangeInfo'),start=g('rangeStart')?.value||'',end=g('rangeEnd')?.value||'';if(!box||!info||!RECORDS?.length)return;const rows=RECORDS.filter(r=>(!start||String(r.date)>=start)&&(!end||String(r.date)<=end));const machines=[...new Set(rows.map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));const rangeDays=new Set(rows.map(r=>String(r.date))).size;info.textContent=rows.length?(start||'-')+' ～ '+(end||'-')+' / '+rangeDays+'日 / 期間内'+machines.length+'台（'+machines.join('・')+'）':(start||'-')+' ～ '+(end||'-')+' / データなし';if(!rows.length){box.innerHTML='<div class="muted">データなし</div>';return;}const sums=machines.map(m=>({machineNo:m,...rangeMetrics13(rangeDaily13(rows,m))}));sums.push({machineNo:'ALL',isTotal:true,machineCount:machines.length,machineList:machines,...rangeMetrics13(rangeDaily13(rows,null))});box.innerHTML=sums.map(x=>'<div class="rangeSummaryCard'+(x.isTotal?' total':'')+'"><div class="rangeMachine">'+(x.isTotal?'全台合計（期間内'+x.machineCount+'台）':'台番 '+esc13(x.machineNo))+'</div>'+(x.isTotal?'<div class="rangeMachineList">対象台番: '+x.machineList.map(esc13).join(' / ')+'</div>':'')+'<dl><dt>日数</dt><dd>'+fmt13(x.days)+'日</dd><dt>総回転数</dt><dd>'+fmt13(x.games)+'G</dd><dt>総差枚</dt><dd class="'+(x.diff>0?'blue':x.diff<0?'red':'')+'">'+signed13(x.diff)+'枚</dd><dt>1Gあたり差枚</dt><dd class="'+(x.perGame>0?'blue':x.perGame<0?'red':'')+'">'+(x.perGame>0?'+':'')+x.perGame.toFixed(3)+'枚/G</dd><dt>20円換算</dt><dd>'+(x.yenPerGame>0?'+':'')+x.yenPerGame.toFixed(2)+'円/G</dd><dt>機械割</dt><dd>'+x.payout.toFixed(2)+'%</dd><dt>プラス日率</dt><dd>'+x.winRate.toFixed(1)+'%</dd></dl></div>').join('');}

  const oldDraw13=draw;
  draw=function(ds){
    if(modeSel.value!=='pergame')return oldDraw13(ds);
    const data=ds.filter(d=>Number(d.games)>0).map(d=>({label:short13(d.date),date:d.date,games:Number(d.games),diff:Number(d.diff)||0,value:(Number(d.diff)||0)/Number(d.games)}));
    const rect=canvas.getBoundingClientRect(),W=Math.max(320,Math.floor(rect.width||1000)),H=430,dpr=Math.max(1,devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);points=[];if(!data.length){c.fillStyle='#6b7280';c.font='14px system-ui';c.fillText('データなし',24,40);g('legend').textContent='';return;}const p={l:68,r:24,t:24,b:48},w=W-p.l-p.r,h=H-p.t-p.b;let min=Math.min(0,...data.map(d=>d.value)),max=Math.max(0,...data.map(d=>d.value));if(max===min){max+=.1;min-=.1;}const range=max-min||1,x=i=>p.l+(data.length===1?w/2:i*w/(data.length-1)),y=v=>p.t+(max-v)*h/range;c.strokeStyle='#e4e8ee';c.fillStyle='#6b7280';c.font='12px system-ui';for(let i=0;i<=4;i++){const val=max-range*i/4,yy=p.t+h*i/4;c.beginPath();c.moveTo(p.l,yy);c.lineTo(p.l+w,yy);c.stroke();c.textAlign='right';c.textBaseline='middle';c.fillText(val.toFixed(2),p.l-8,yy);}if(min<0&&max>0){c.strokeStyle='#9aa0a6';c.beginPath();c.moveTo(p.l,y(0));c.lineTo(p.l+w,y(0));c.stroke();}for(let i=1;i<data.length;i++){c.strokeStyle=data[i].value>=0?'#1a73e8':'#d93025';c.lineWidth=2.5;c.beginPath();c.moveTo(x(i-1),y(data[i-1].value));c.lineTo(x(i),y(data[i].value));c.stroke();}data.forEach((d,i)=>{c.beginPath();c.fillStyle=d.value>=0?'#1a73e8':'#d93025';c.arc(x(i),y(d.value),4,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.stroke();});const maxLabels=Math.min(6,Math.max(2,Math.floor(w/150))),step=Math.max(1,Math.ceil((data.length-1)/Math.max(1,maxLabels-1)));c.fillStyle='#6b7280';c.font='11px system-ui';c.textAlign='center';c.textBaseline='top';data.forEach((d,i)=>{if(i%step===0||i===data.length-1)c.fillText(d.label,x(i),p.t+h+10);});points=data.map((d,i)=>({x:x(i),y:y(d.value),d}));const totalG=data.reduce((a,d)=>a+d.games,0),totalD=data.reduce((a,d)=>a+d.diff,0),avg=totalG?totalD/totalG:0,hi=data.reduce((a,b)=>b.value>a.value?b:a),lo=data.reduce((a,b)=>b.value<a.value?b:a);g('legend').innerHTML='<span class="'+(avg>=0?'blue':'red')+'">期間平均 '+(avg>0?'+':'')+avg.toFixed(3)+'枚/G</span> / <span class="blue">最高 '+(hi.value>0?'+':'')+hi.value.toFixed(3)+' '+short13(hi.date)+'</span> / <span class="red">最低 '+(lo.value>0?'+':'')+lo.value.toFixed(3)+' '+short13(lo.date)+'</span>';
  };

  canvas.addEventListener('mousemove',e=>{if(modeSel.value!=='pergame'||!points.length)return;const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null,dist=1e9;for(const p of points){const d=(p.x-mx)*(p.x-mx)+(p.y-my)*(p.y-my);if(d<dist){dist=d;best=p;}}if(best&&dist<225){const d=best.d;tooltip.style.display='block';tooltip.style.left=Math.min(r.width-175,best.x+12)+'px';tooltip.style.top=Math.max(6,best.y-72)+'px';tooltip.innerHTML=(d.date||d.label)+'<br>G数 '+fmt13(d.games)+'G<br>日別差枚 '+signed13(d.diff)+'枚<br>1Gあたり '+(d.value>0?'+':'')+d.value.toFixed(3)+'枚/G';}});

  [g('rangeStart'),g('rangeEnd')].forEach(x=>x&&x.addEventListener('change',()=>{if(g('rangeStart').value&&g('rangeEnd').value&&g('rangeStart').value>g('rangeEnd').value){if(x.id==='rangeStart')g('rangeEnd').value=g('rangeStart').value;else g('rangeStart').value=g('rangeEnd').value;}renderRange13();}));
  g('rangeAll')?.addEventListener('click',()=>{const dates=RECORDS.map(r=>String(r.date)).filter(Boolean).sort();if(dates.length){g('rangeStart').value=dates[0];g('rangeEnd').value=dates[dates.length-1];renderRange13();}});

  const timer13=setInterval(()=>{if(typeof RECORDS!=='undefined'&&RECORDS.length){clearInterval(timer13);const dates=RECORDS.map(r=>String(r.date)).filter(Boolean).sort();if(dates.length){g('rangeStart').value=dates[0];g('rangeEnd').value=dates[dates.length-1];g('rangeStart').min=g('rangeEnd').min=dates[0];g('rangeStart').max=g('rangeEnd').max=dates[dates.length-1];}g('rangePanel').hidden=false;renderRange13();render();}},100);
})();
(()=>{const s=document.createElement('script');s.src='./public-longterm.js?v=1';s.defer=true;document.body.appendChild(s);})();
