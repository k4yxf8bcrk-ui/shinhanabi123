(()=>{
  const $=id=>document.getElementById(id);
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ja-JP');
  const signed=n=>{n=Number(n)||0;return(n>0?'+':'')+fmt(n)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function addStyle(){
    if($('dipRecoveryStyle'))return;
    const st=document.createElement('style');st.id='dipRecoveryStyle';st.textContent=`
      .dipRecoveryPanel{border-color:#eadfcf;background:#fffdfa}.dipRecoveryHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.dipRecoveryControls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.dipRecoveryControls label{font-size:12px;font-weight:800;display:flex;flex-direction:column;gap:5px}.dipRecoveryCurrent{margin-top:10px;padding:10px 12px;border:1px solid #eadfce;border-radius:10px;background:#fff8ee;font-size:12px;line-height:1.7}.dipRecoveryStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:11px}.dipRecoveryStat{border:1px solid #eadfce;border-radius:10px;padding:10px;background:#fff}.dipRecoveryStat span{display:block;font-size:10px;color:#6b7280}.dipRecoveryStat strong{display:block;font-size:17px;margin-top:3px;font-variant-numeric:tabular-nums}.dipRecoveryWindows{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.dipRecoveryChip{border:1px solid #eadfce;background:#fff;border-radius:999px;padding:6px 9px;font-size:10px}.dipRecoveryChip strong{font-size:11px}.dipRecoveryTableWrap{overflow:auto;margin-top:11px;border:1px solid #eadfce;border-radius:10px;background:#fff}.dipRecoveryTable{width:100%;min-width:860px;border-collapse:collapse;font-variant-numeric:tabular-nums}.dipRecoveryTable th,.dipRecoveryTable td{padding:8px 9px;border-bottom:1px solid #f1ebe2;font-size:11px;text-align:right;white-space:nowrap}.dipRecoveryTable th{background:#fbf7f1;color:#5f6368;position:sticky;top:0}.dipRecoveryTable th:first-child,.dipRecoveryTable td:first-child{text-align:left}.dipRecovered{color:#0f7b3e}.dipUnrecovered{color:#a35a00}.dipRecoveryNote{font-size:9px;color:#6b7280;line-height:1.65;margin-top:9px}
      @media(max-width:760px){.dipRecoveryStats{grid-template-columns:1fr 1fr}.dipRecoveryControls{grid-template-columns:1fr}}@media(max-width:480px){.dipRecoveryStats{grid-template-columns:1fr 1fr}.dipRecoveryStat strong{font-size:15px}}
    `;document.head.appendChild(st);
  }

  function activeMachines(records){
    const latest=records.map(r=>String(r.date||'')).filter(Boolean).sort().pop();
    return [...new Set(records.filter(r=>String(r.date)===latest).map(r=>String(r.machineNo||'')).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  }

  function machineDays(records,machine){
    const map=new Map();
    for(const r of records){
      if(String(r.machineNo)!==String(machine))continue;
      const date=String(r.date||'');if(!date)continue;
      if(!map.has(date))map.set(date,{date,games:0,diff:0});
      const x=map.get(date);x.games+=Number(r.games)||0;x.diff+=Number(r.diff)||0;
    }
    return [...map.values()].filter(x=>x.games>0).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function rawWindows(days,span,threshold){
    const out=[];
    if(span<1||days.length<span)return out;
    for(let end=span-1;end<days.length;end++){
      let total=0;
      for(let i=end-span+1;i<=end;i++)total+=Number(days[i].diff)||0;
      if(total<=-threshold)out.push({start:end-span+1,end,total});
    }
    return out;
  }

  function collapseWindows(windows,span){
    if(span===1)return windows;
    const out=[];let group=[];let prevEnd=null;
    const flush=()=>{if(!group.length)return;group.sort((a,b)=>a.total-b.total);out.push(group[0]);group=[];};
    for(const w of windows){
      if(prevEnd!==null&&w.end!==prevEnd+1)flush();
      group.push(w);prevEnd=w.end;
    }
    flush();return out.sort((a,b)=>a.end-b.end);
  }

  function eventsFor(days,span,threshold){
    const picked=collapseWindows(rawWindows(days,span,threshold),span),out=[];
    for(const w of picked){
      const target=-w.total;
      let sum=0,minSum=0,recoveryDate='',recoveryDays=null;
      for(let j=w.end+1;j<days.length;j++){
        sum+=Number(days[j].diff)||0;
        if(sum<minSum)minSum=sum;
        if(recoveryDays===null&&sum>=target){recoveryDays=j-w.end;recoveryDate=days[j].date;break;}
      }
      out.push({startDate:days[w.start].date,endDate:days[w.end].date,diff:w.total,target,recovered:recoveryDays!==null,recoveryDays,recoveryDate,extraDip:minSum<0?-minSum:0,availableDays:days.length-w.end-1});
    }
    return out;
  }

  function median(a){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}
  function pct(a,b){return b?((a/b)*100).toFixed(1)+'%':'-';}
  function within(events,n){
    const eligible=events.filter(e=>(e.recovered&&e.recoveryDays<=n)||e.availableDays>=n);
    const hits=eligible.filter(e=>e.recovered&&e.recoveryDays<=n).length;
    return{hits,total:eligible.length,rate:pct(hits,eligible.length)};
  }

  function setup(){
    if(typeof RECORDS==='undefined'||!RECORDS.length||$('dipRecoveryPanel'))return;
    addStyle();
    const machines=activeMachines(RECORDS);if(!machines.length)return;
    const panel=document.createElement('section');panel.id='dipRecoveryPanel';panel.className='panel dipRecoveryPanel';
    panel.innerHTML=`<div class="dipRecoveryHead"><div><h2>凹み回復分析</h2><div class="muted">選んだ連続実稼働日の合計差枚が大きく凹んだ後、何実稼働日でそのマイナス分を取り戻したかを集計</div></div><div class="pill">期間×枚数</div></div>
      <div class="dipRecoveryControls">
        <label>台番<select id="dipRecoveryMachine">${machines.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label>
        <label>連続日数<select id="dipRecoverySpan"><option value="1">1実稼働日</option><option value="3">3実稼働日</option><option value="5">5実稼働日</option><option value="7" selected>7実稼働日</option><option value="10">10実稼働日</option><option value="14">14実稼働日</option><option value="30">30実稼働日</option></select></label>
        <label>凹み枚数<select id="dipRecoveryThreshold"><option value="1000">-1,000枚以上</option><option value="2000">-2,000枚以上</option><option value="3000">-3,000枚以上</option><option value="5000" selected>-5,000枚以上</option><option value="7000">-7,000枚以上</option><option value="10000">-10,000枚以上</option></select></label>
      </div>
      <div id="dipRecoveryCurrent" class="dipRecoveryCurrent"></div>
      <div id="dipRecoveryStats" class="dipRecoveryStats"></div>
      <div id="dipRecoveryWindows" class="dipRecoveryWindows"></div>
      <div class="dipRecoveryTableWrap"><table class="dipRecoveryTable"><thead><tr><th>凹み期間</th><th>期間差枚</th><th>結果</th><th>回復まで</th><th>回復日</th><th>回復前の追加凹み</th></tr></thead><tbody id="dipRecoveryBody"></tbody></table></div>
      <div class="dipRecoveryNote">例：7実稼働日・-5,000枚を選ぶと、「7実稼働日の合計が-5,000枚以下になった凹み」を探し、その期間終了後から+5,000枚分以上を取り戻すまでの日数を数えます。複数日設定では、連続して重なる同じ凹み候補は一番深い期間を1件として集計します。0G日は数えません。1・2・3・5・10・20日以内率は、その日数まで追跡できる事例だけを分母にしています。</div>`;
    const anchor=$('tablePanel');anchor?.parentNode.insertBefore(panel,anchor);

    function render(){
      const machine=$('dipRecoveryMachine').value,span=Number($('dipRecoverySpan').value)||7,threshold=Number($('dipRecoveryThreshold').value)||5000;
      const days=machineDays(RECORDS,machine),events=eventsFor(days,span,threshold),recovered=events.filter(e=>e.recovered);
      const medDays=median(recovered.map(e=>e.recoveryDays)),medExtra=median(recovered.map(e=>e.extraDip));
      $('dipRecoveryCurrent').innerHTML=`<strong>${esc(machine)}番台：</strong>${span}実稼働日で <span class="red">-${fmt(threshold)}枚以上</span> 凹んだケースを分析中。該当 ${events.length}件。`;
      $('dipRecoveryStats').innerHTML=`<div class="dipRecoveryStat"><span>発生回数</span><strong>${events.length}回</strong></div><div class="dipRecoveryStat"><span>現在まで回復</span><strong>${events.length?pct(recovered.length,events.length):'-'}</strong></div><div class="dipRecoveryStat"><span>回復日数 中央値</span><strong>${medDays===null?'-':(Number.isInteger(medDays)?medDays:medDays.toFixed(1))+'日'}</strong></div><div class="dipRecoveryStat"><span>回復前の追加凹み 中央値</span><strong>${medExtra===null?'-':'-'+fmt(medExtra)+'枚'}</strong></div>`;
      const windows=[1,2,3,5,10,20].map(n=>({n,...within(events,n)}));
      $('dipRecoveryWindows').innerHTML=windows.map(x=>`<span class="dipRecoveryChip"><strong>${x.n}日以内 ${x.rate}</strong> <span class="muted">(${x.hits}/${x.total})</span></span>`).join('');
      $('dipRecoveryBody').innerHTML=events.length?[...events].reverse().map(e=>`<tr><td>${esc(e.startDate)}〜${esc(e.endDate)}</td><td class="red">${signed(e.diff)}枚</td><td class="${e.recovered?'dipRecovered':'dipUnrecovered'}">${e.recovered?'回復':'未回復'}</td><td>${e.recovered?e.recoveryDays+'実稼働日':'経過'+e.availableDays+'実稼働日'}</td><td>${e.recoveryDate||'-'}</td><td>${e.extraDip?'-'+fmt(e.extraDip)+'枚':'0枚'}</td></tr>`).join(''):`<tr><td colspan="6" style="text-align:center;color:#6b7280">この条件に該当する凹みはありません</td></tr>`;
    }
    ['dipRecoveryMachine','dipRecoverySpan','dipRecoveryThreshold'].forEach(id=>$(id).addEventListener('change',render));
    render();
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(typeof RECORDS!=='undefined'&&RECORDS.length){clearInterval(timer);setup();}else if(tries>300)clearInterval(timer);},100);
})();
