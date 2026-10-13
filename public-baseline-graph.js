(()=>{
  const $=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short=d=>String(d||'').replace(/^\d{4}-/,'').replace('-','/');

  function addStyle(){
    if($('baselineGraphStyle'))return;
    const st=document.createElement('style');st.id='baselineGraphStyle';st.textContent=`
      .baselinePanel{border-color:#dfe7d8;background:#fcfefb}.baselineHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.baselineControls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.baselineControls label{font-size:12px;font-weight:800;display:flex;flex-direction:column;gap:5px}.baselineChecks{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;padding:10px;border:1px solid #e3e8df;border-radius:10px;background:#fff}.baselineChecks label{font-size:11px;font-weight:700;display:flex;align-items:center;gap:6px}.baselineStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.baselineStat{border:1px solid #e1e6de;border-radius:9px;padding:8px;background:#fff}.baselineStat span{display:block;font-size:10px;color:#6b7280}.baselineStat strong{display:block;font-size:16px;margin-top:3px;font-variant-numeric:tabular-nums}.baselineChartWrap{position:relative;margin-top:12px;border:1px solid #e1e6de;border-radius:11px;background:#fff;overflow:hidden}.baselineChartWrap canvas{display:block;width:100%;height:390px}.baselineTooltip{display:none;position:absolute;z-index:3;min-width:165px;padding:8px 10px;border-radius:8px;background:rgba(17,24,39,.94);color:#fff;font-size:11px;line-height:1.55;pointer-events:none}.baselineLegend{margin-top:8px;color:#667085;font-size:11px;line-height:1.6}.baselineExcluded{margin-top:10px;border:1px solid #e1e6de;border-radius:9px;background:#fff}.baselineExcluded summary{cursor:pointer;padding:9px 11px;font-weight:800;font-size:11px;list-style:none}.baselineExcluded summary::-webkit-details-marker{display:none}.baselineExcluded summary:after{content:'＋';float:right}.baselineExcluded[open] summary:after{content:'−'}.baselineExcludedBody{padding:0 11px 10px;display:grid;gap:5px}.baselineExcludedRow{display:grid;grid-template-columns:82px 1fr auto;gap:8px;font-size:10px;border-top:1px solid #edf0ea;padding-top:5px}.baselineNote{font-size:9px;color:#6b7280;line-height:1.6;margin-top:9px}
      @media(max-width:800px){.baselineControls,.baselineStats{grid-template-columns:1fr 1fr}}@media(max-width:560px){.baselineControls,.baselineStats{grid-template-columns:1fr}.baselineExcludedRow{grid-template-columns:70px 1fr auto}}
    `;document.head.appendChild(st);
  }

  function aggregate(records,machines){
    const map=new Map();
    for(const r of records){
      const m=String(r.machineNo||''),d=String(r.date||'');
      if(!d||!machines.includes(m))continue;
      const k=d+'|'+m;
      if(!map.has(k))map.set(k,{date:d,machineNo:m,games:0,diff:0,bb:0,rb:0});
      const x=map.get(k);x.games+=Number(r.games)||0;x.diff+=Number(r.diff)||0;x.bb+=Number(r.bb)||0;x.rb+=Number(r.rb)||0;
    }
    return [...map.values()];
  }
  function activeMachines(records){
    const latest=records.map(r=>String(r.date||'')).filter(Boolean).sort().pop();
    return [...new Set(records.filter(r=>String(r.date)===latest).map(r=>String(r.machineNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  }
  function isLastSaturday(d){
    const x=new Date(String(d)+'T12:00:00');if(Number.isNaN(x.getTime())||x.getDay()!==6)return false;
    const y=new Date(x);y.setDate(y.getDate()+7);return y.getMonth()!==x.getMonth();
  }
  function strongDays(rows,machines){
    const byDate=new Map();
    for(const r of rows){if(!machines.includes(r.machineNo)||r.games<=0)continue;if(!byDate.has(r.date))byDate.set(r.date,[]);byDate.get(r.date).push(r);}
    const set=new Set();
    for(const [d,a] of byDate){const pos=a.filter(x=>x.diff>0).length;if(a.length>=2&&pos>=2&&pos/a.length>=2/3)set.add(d);}
    return set;
  }
  function monthOptions(rows){return [...new Set(rows.map(r=>r.date.slice(0,7)))].sort();}

  let canvas,tip,points=[];
  function draw(data,mode){
    const rect=canvas.getBoundingClientRect(),W=Math.max(320,Math.floor(rect.width||1000)),H=390,dpr=Math.max(1,devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);points=[];
    if(!data.length){c.fillStyle='#6b7280';c.font='14px system-ui';c.fillText('対象データなし',24,40);return;}
    let run=0;const pData=data.map(r=>{let v;if(mode==='daily')v=r.diff;else if(mode==='pergame')v=r.games?r.diff/r.games:0;else{run+=r.diff;v=run;}return {...r,value:v};});
    const pad={l:68,r:24,t:22,b:45},w=W-pad.l-pad.r,h=H-pad.t-pad.b;let min=Math.min(0,...pData.map(d=>d.value)),max=Math.max(0,...pData.map(d=>d.value));if(min===max){max+=1;min-=1;}const span=max-min||1,x=i=>pad.l+(pData.length===1?w/2:i*w/(pData.length-1)),y=v=>pad.t+(max-v)*h/span;
    c.strokeStyle='#e4e8ee';c.fillStyle='#6b7280';c.font='11px system-ui';for(let i=0;i<=4;i++){const v=max-span*i/4,yy=pad.t+h*i/4;c.beginPath();c.moveTo(pad.l,yy);c.lineTo(pad.l+w,yy);c.stroke();c.textAlign='right';c.textBaseline='middle';c.fillText(mode==='pergame'?v.toFixed(2):Math.round(v).toLocaleString('ja-JP'),pad.l-8,yy);}if(min<0&&max>0){c.strokeStyle='#9aa0a6';c.beginPath();c.moveTo(pad.l,y(0));c.lineTo(pad.l+w,y(0));c.stroke();}
    c.strokeStyle='#2d6a4f';c.lineWidth=2.5;c.beginPath();pData.forEach((d,i)=>{i?c.lineTo(x(i),y(d.value)):c.moveTo(x(i),y(d.value));});c.stroke();
    pData.forEach((d,i)=>{c.beginPath();c.fillStyle=d.diff>=0?'#1a73e8':'#d93025';c.arc(x(i),y(d.value),3.5,0,Math.PI*2);c.fill();});
    const maxLabels=Math.min(7,Math.max(2,Math.floor(w/120))),step=Math.max(1,Math.ceil((pData.length-1)/Math.max(1,maxLabels-1)));c.fillStyle='#6b7280';c.font='10px system-ui';c.textAlign='center';c.textBaseline='top';pData.forEach((d,i)=>{if(i%step===0||i===pData.length-1)c.fillText(short(d.date),x(i),pad.t+h+9);});
    points=pData.map((d,i)=>({x:x(i),y:y(d.value),d}));
  }

  function setup(){
    if(typeof RECORDS==='undefined'||!RECORDS.length||$('baselinePanel'))return;
    addStyle();
    const machines=activeMachines(RECORDS);if(!machines.length)return;
    const rows=aggregate(RECORDS,machines).sort((a,b)=>a.date.localeCompare(b.date)||Number(a.machineNo)-Number(b.machineNo));
    const strong=strongDays(rows,machines);
    const months=monthOptions(rows);
    const panel=document.createElement('section');panel.id='baselinePanel';panel.className='panel baselinePanel';
    panel.innerHTML=`<div class="baselineHead"><div><h2>通常日推定グラフ</h2><div class="muted">特別に設定が入った可能性があるプラス実績を外して、普段の波を見る参考グラフ</div></div><div class="pill">設定1寄り</div></div><div class="baselineControls"><label>台番<select id="baselineMachine">${machines.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label><label>月<select id="baselineMonth"><option value="ALL">全期間</option>${months.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label><label>グラフ<select id="baselineMode"><option value="cumulative">累計差枚</option><option value="daily">日別差枚</option><option value="pergame">1Gあたり差枚</option></select></label></div><div class="baselineChecks"><label><input id="baselineStrong" type="checkbox" checked> 全体強め日のプラス台を除外</label><label><input id="baselineMonthEnd" type="checkbox" checked> 月末土曜日のプラス台を除外</label></div><div id="baselineStats" class="baselineStats"></div><div class="baselineChartWrap"><canvas id="baselineCanvas"></canvas><div id="baselineTip" class="baselineTooltip"></div></div><div id="baselineLegend" class="baselineLegend"></div><details id="baselineExcluded" class="baselineExcluded"><summary>除外された日を見る</summary><div id="baselineExcludedBody" class="baselineExcludedBody"></div></details><div class="baselineNote">「全体強め日」は現在稼働台のうち実稼働2台以上かつ2/3以上がプラスの日を候補扱いし、その日にプラスだった台だけを除外します。「月末土曜日」はその月の最後の土曜日で、プラスだった台だけを除外します。設定投入を証明する判定ではなく、通常日の傾向を見るための参考フィルターです。</div>`;
    const anchor=$('tablePanel');anchor?.parentNode.insertBefore(panel,anchor);
    canvas=$('baselineCanvas');tip=$('baselineTip');

    function render(){
      const machine=$('baselineMachine').value,month=$('baselineMonth').value,mode=$('baselineMode').value,cutStrong=$('baselineStrong').checked,cutEnd=$('baselineMonthEnd').checked;
      let base=rows.filter(r=>r.machineNo===machine&&r.games>0&&(month==='ALL'||r.date.startsWith(month)));
      const excluded=[],kept=[];
      for(const r of base){const reasons=[];if(r.diff>0&&cutStrong&&strong.has(r.date))reasons.push('全体強め日');if(r.diff>0&&cutEnd&&isLastSaturday(r.date))reasons.push('月末土曜');if(reasons.length)excluded.push({...r,reasons});else kept.push(r);}
      const g=kept.reduce((s,r)=>s+r.games,0),d=kept.reduce((s,r)=>s+r.diff,0),exd=excluded.reduce((s,r)=>s+r.diff,0),pg=g?d/g:0;
      $('baselineStats').innerHTML=`<div class="baselineStat"><span>採用実稼働日</span><strong>${kept.length}日</strong></div><div class="baselineStat"><span>除外</span><strong>${excluded.length}日</strong></div><div class="baselineStat"><span>通常日推定差枚</span><strong class="${d>0?'blue':d<0?'red':''}">${signed(d)}枚</strong></div><div class="baselineStat"><span>通常日1G差枚</span><strong class="${pg>0?'blue':pg<0?'red':''}">${pg>0?'+':''}${pg.toFixed(3)}枚/G</strong></div>`;
      draw(kept,mode);
      $('baselineLegend').textContent=`除外したプラス差枚 合計 ${signed(exd)}枚 / 判定対象 ${base.length}実稼働日`;
      $('baselineExcludedBody').innerHTML=excluded.length?excluded.map(r=>`<div class="baselineExcludedRow"><span>${esc(r.date)}</span><span>${esc(r.reasons.join('・'))}</span><strong class="blue">${signed(r.diff)}枚</strong></div>`).join(''):'<div class="muted">除外対象なし</div>';
    }
    ['baselineMachine','baselineMonth','baselineMode','baselineStrong','baselineMonthEnd'].forEach(id=>$(id).addEventListener('change',render));
    canvas.addEventListener('mousemove',e=>{if(!points.length)return;const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null,dist=1e9;for(const p of points){const dd=(p.x-mx)**2+(p.y-my)**2;if(dd<dist){dist=dd;best=p;}}if(best&&dist<225){const d=best.d;tip.style.display='block';tip.style.left=Math.min(r.width-180,best.x+12)+'px';tip.style.top=Math.max(6,best.y-72)+'px';tip.innerHTML=`${esc(d.date)}<br>G数 ${fmt(d.games)}G<br>差枚 ${signed(d.diff)}枚<br>1G差枚 ${(d.diff/d.games>0?'+':'')+(d.diff/d.games).toFixed(3)}枚/G`; }else tip.style.display='none';});
    canvas.addEventListener('mouseleave',()=>tip.style.display='none');
    window.addEventListener('resize',render);render();
  }
  const timer=setInterval(()=>{if(typeof RECORDS!=='undefined'&&RECORDS.length){clearInterval(timer);setup();}},100);
})();
