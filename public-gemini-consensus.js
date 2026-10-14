(()=>{
  const $=id=>document.getElementById(id);
  let externalHistory=[];
  const short=d=>typeof shortDate==='function'?shortDate(d):String(d||'').slice(5).replace('-','/');
  const signedLocal=n=>typeof signed==='function'?signed(n):((Number(n)>0?'+':'')+Math.round(Number(n)||0));
  const escLocal=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mergedHistory(){
    const map=new Map();
    const add=list=>{for(const h of Array.isArray(list)?list:[]){if(h?.targetDate&&Array.isArray(h.ranking)&&h.ranking.length)map.set(String(h.targetDate),h);}};
    add(externalHistory);
    try{if(typeof AI_HISTORY_PUBLIC!=='undefined')add(AI_HISTORY_PUBLIC);}catch(_){}
    try{
      if(typeof AI_ANALYSIS!=='undefined'&&AI_ANALYSIS?.targetDate&&Array.isArray(AI_ANALYSIS.ranking)&&AI_ANALYSIS.ranking.length){
        map.set(String(AI_ANALYSIS.targetDate),{targetDate:String(AI_ANALYSIS.targetDate),sourceLatestDate:String(AI_ANALYSIS.sourceLatestDate||''),generatedAt:AI_ANALYSIS.generatedAt||null,ranking:AI_ANALYSIS.ranking.map((x,i)=>({machineNo:String(x.machineNo||''),rank:i+1,confidence:String(x.confidence||'')})).filter(x=>x.machineNo)});
      }
    }catch(_){}
    return [...map.values()].sort((a,b)=>String(a.targetDate).localeCompare(String(b.targetDate)));
  }

  function accuracy(){
    let records=[];try{records=Array.isArray(RECORDS)?RECORDS:[];}catch(_){}
    const hist=mergedHistory(),out=[];
    for(const h of hist){
      const rows=records.filter(r=>String(r.date)===String(h.targetDate));if(!rows.length)continue;
      const actual=new Map();for(const r of rows)actual.set(String(r.machineNo),(actual.get(String(r.machineNo))||0)+(Number(r.diff)||0));
      const ranked=(h.ranking||[]).filter(x=>actual.has(String(x.machineNo)));if(!ranked.length)continue;
      const top=ranked[0],topDiff=actual.get(String(top.machineNo))||0,maxDiff=Math.max(...actual.values()),top2=ranked.slice(0,2);
      out.push({targetDate:String(h.targetDate),topMachine:String(top.machineNo),topDiff,plusHit:topDiff>0,bestHit:topDiff===maxDiff,top2Plus:top2.some(x=>(actual.get(String(x.machineNo))||0)>0)});
    }
    const n=out.length;
    return {n,plusHits:out.filter(x=>x.plusHit).length,bestHits:out.filter(x=>x.bestHit).length,top2Hits:out.filter(x=>x.top2Plus).length,avg:n?out.reduce((a,x)=>a+x.topDiff,0)/n:0,pendingDates:hist.filter(h=>!records.some(r=>String(r.date)===String(h.targetDate))).map(h=>String(h.targetDate)),recent:out.slice(-10).reverse()};
  }

  function renderAccuracy(){
    const box=$('aiAccuracyBox');if(!box)return;
    const a=accuracy();
    if(!a.n){
      box.innerHTML='<h3>Gemini AI予想の実績</h3><div class="muted">'+(a.pendingDates.length?'Gemini予想は保存済みですが、対象日の結果がまだありません。未確定 '+a.pendingDates.length+'件（'+a.pendingDates.map(short).join('、')+'）。結果データ取得後に自動で答え合わせします。':'答え合わせ対象のGemini予想履歴がまだありません。Gemini分析を実行すると履歴を保存します。')+'</div>';
      return;
    }
    const pct=x=>(x/a.n*100).toFixed(1)+'%',note=a.n<5?'まだ件数が少ないため参考値です。':a.n<20?'件数はまだ少なめです。':'蓄積したGemini予想の実績です。';
    box.innerHTML='<h3>Gemini AI予想の実績 <span class="tiny">'+a.n+'回</span></h3><div class="aiAccGrid"><div class="aiAccCard"><span>1位予想がプラス</span><strong>'+pct(a.plusHits)+'</strong><small>'+a.plusHits+'/'+a.n+'</small></div><div class="aiAccCard"><span>1位が最大差枚</span><strong>'+pct(a.bestHits)+'</strong><small>'+a.bestHits+'/'+a.n+'</small></div><div class="aiAccCard"><span>Gemini1位の平均差枚</span><strong class="'+(a.avg>=0?'blue':'red')+'">'+signedLocal(a.avg)+'枚</strong><small>答え合わせ済み</small></div><div class="aiAccCard"><span>上位2台どちらかプラス</span><strong>'+pct(a.top2Hits)+'</strong><small>'+a.top2Hits+'/'+a.n+'</small></div></div>'+(a.recent.length?'<div class="aiAccRecent"><span>直近</span>'+a.recent.map(x=>'<em class="'+(x.plusHit?'hit':'miss')+'">'+short(x.targetDate)+' '+escLocal(x.topMachine)+' '+signedLocal(x.topDiff)+'枚</em>').join('')+'</div>':'')+'<div class="tiny" style="margin-top:7px">'+note+(a.pendingDates.length?' / 未確定 '+a.pendingDates.length+'件（'+a.pendingDates.map(short).join('、')+'）':'')+'。</div>';
  }

  function rankPoint(i,n){return n<=1?70:100-i*(60/(n-1));}
  function renderConsensus(){
    const panel=$('predictionPanel'),aiBox=$('aiBox');if(!panel||!aiBox)return;
    let box=$('consensusBox');if(!box){box=document.createElement('div');box.id='consensusBox';box.className='aiBox';aiBox.parentNode.insertBefore(box,aiBox);}
    let records=[];try{records=Array.isArray(RECORDS)?RECORDS:[];}catch(_){}if(!records.length)return;
    const latestDate=records.reduce((m,r)=>!m||String(r.date)>m?String(r.date):m,''),machines=[...new Set(records.filter(r=>String(r.date)===latestDate).map(r=>String(r.machineNo)))].sort((a,b)=>Number(a)-Number(b));
    const stats=[];try{for(const m of machines){const p=machinePrediction(m);if(p)stats.push(p);}}catch(_){}
    if(!stats.length)return;
    const sources=[{name:'統計',weight:50,type:'score',map:new Map(stats.map(p=>[String(p.m),Number(p.score)||0]))}];
    try{const ar=AI_ANALYSIS?.sourceLatestDate===latestDate&&Array.isArray(AI_ANALYSIS.ranking)?AI_ANALYSIS.ranking.filter(x=>machines.includes(String(x.machineNo))):[];if(ar.length)sources.push({name:'Gemini',weight:25,type:'rank',ranking:ar});}catch(_){}
    try{const ed=EDITOR_CHIEF?.latest,er=ed?.sourceLatestDate===latestDate&&Array.isArray(ed.ranking)?ed.ranking.filter(x=>machines.includes(String(x.machineNo))):[];if(er.length)sources.push({name:'編集長',weight:25,type:'rank',ranking:er});}catch(_){}
    const items=machines.map(m=>{let sum=0,w=0,detail=[];for(const src of sources){let v=null;if(src.type==='score'){v=src.map.get(m);detail.push(src.name+' '+Math.round(v)+'点');}else{const i=src.ranking.findIndex(x=>String(x.machineNo)===m);if(i>=0){v=rankPoint(i,src.ranking.length);detail.push(src.name+' '+(i+1)+'位');}}if(Number.isFinite(v)){sum+=v*src.weight;w+=src.weight;}}return{m,score:w?sum/w:0,detail};}).sort((a,b)=>b.score-a.score);
    box.innerHTML='<h3>総合参考順位 <span class="editorBadge">統計＋Gemini＋編集長</span></h3><div class="muted">基本比率は統計50・Gemini25・編集長25。利用できない情報がある場合は残りの情報で再配分します。</div><div class="aiRank">'+items.map((x,i)=>'<div class="aiRankCard"><div class="aiRankHead"><span class="rankNo">'+(i+1)+'位</span><span class="machineStrong">'+escLocal(x.m)+'</span><span class="conf">総合 '+x.score.toFixed(1)+'</span></div><div class="tiny">'+x.detail.map(escLocal).join(' / ')+'</div></div>').join('')+'</div><div class="tiny" style="margin-top:7px">総合スコアは勝率ではありません。Geminiは単独決定ではなく補助票です。</div>';
  }

  async function loadHistory(){
    try{const r=await fetch('./gemini-history.json?ts='+Date.now(),{cache:'no-store'});if(r.ok){const d=await r.json();externalHistory=Array.isArray(d)?d:(Array.isArray(d.history)?d.history:[]);}}catch(_){}
  }
  loadHistory().finally(()=>{
    let tries=0;const timer=setInterval(()=>{tries++;let ready=false;try{ready=Array.isArray(RECORDS)&&RECORDS.length>0;}catch(_){}if(ready){clearInterval(timer);renderConsensus();renderAccuracy();}else if(tries>300)clearInterval(timer);},200);
  });
})();
