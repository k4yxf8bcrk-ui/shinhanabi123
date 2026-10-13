(()=>{
  const apply=()=>{
    const panel=document.getElementById('predictionPanel');
    const grid=document.getElementById('predictionGrid');
    const ai=document.getElementById('aiBox');
    const acc=document.getElementById('aiAccuracyBox');
    if(!panel||!grid||!ai||!acc||document.getElementById('aiPredictionFold'))return false;

    const details=document.createElement('details');
    details.id='aiPredictionFold';
    details.className='aiPredictionFold';
    const summary=document.createElement('summary');
    summary.className='aiPredictionFoldSummary';
    summary.innerHTML='<span class="aiFoldLabel">AI予想を見る</span><span class="aiFoldIcon">＋</span>';
    details.appendChild(summary);

    grid.parentNode.insertBefore(details,grid);
    details.appendChild(grid);
    details.appendChild(ai);
    details.appendChild(acc);

    const style=document.createElement('style');
    style.id='aiPredictionFoldStyle';
    style.textContent=`
      .aiPredictionFold{margin-top:12px;border:1px solid #c9d9f5;border-radius:12px;background:#fff;overflow:hidden}
      .aiPredictionFoldSummary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:900;color:#174ea6;background:#f7faff;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .aiPredictionFoldSummary::-webkit-details-marker{display:none}
      .aiPredictionFold .predictionGrid{padding:0 12px 12px;margin-top:12px}
      .aiPredictionFold .aiBox,.aiPredictionFold .aiAccuracyBox{margin:0 12px 12px}
      .aiPredictionFold[open] .aiFoldLabel::after{content:'（開いています）';font-size:10px;font-weight:700;color:#6b7280;margin-left:6px}
      .aiPredictionFold[open] .aiFoldIcon{transform:rotate(45deg)}
      .aiFoldIcon{font-size:18px;line-height:1;transition:transform .15s ease}
    `;
    document.head.appendChild(style);
    return true;
  };

  if(!apply()){
    const t=setInterval(()=>{if(apply())clearInterval(t);},100);
    setTimeout(()=>clearInterval(t),10000);
  }
})();
