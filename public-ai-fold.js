(()=>{
  const addStyle=()=>{
    if(document.getElementById('aiPredictionFoldStyle'))return;
    const style=document.createElement('style');
    style.id='aiPredictionFoldStyle';
    style.textContent=`
      .aiPredictionFold,.editorPredictionFold{margin-top:12px;border:1px solid #c9d9f5;border-radius:12px;background:#fff;overflow:hidden}
      .editorPredictionFold{border-color:#d9c7f3}
      .aiPredictionFoldSummary,.editorPredictionFoldSummary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:900;color:#174ea6;background:#f7faff;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .editorPredictionFoldSummary{color:#6b3fa0;background:#fcfaff}
      .aiPredictionFoldSummary::-webkit-details-marker,.editorPredictionFoldSummary::-webkit-details-marker{display:none}
      .aiPredictionFold .predictionGrid{padding:0 12px 12px;margin-top:12px}
      .aiPredictionFold .aiBox,.aiPredictionFold .aiAccuracyBox{margin:0 12px 12px}
      .editorPredictionFold .editorChiefBox,.editorPredictionFold .editorChiefAccuracy{margin:12px}
      .aiPredictionFold[open] .aiFoldIcon,.editorPredictionFold[open] .editorFoldIcon{transform:rotate(45deg)}
      .aiFoldIcon,.editorFoldIcon{font-size:18px;line-height:1;transition:transform .15s ease}
    `;
    document.head.appendChild(style);
  };

  const makeDetails=(id,className,summaryClass,labelClass,iconClass,label)=>{
    const details=document.createElement('details');
    details.id=id;
    details.className=className;
    const summary=document.createElement('summary');
    summary.className=summaryClass;
    summary.innerHTML='<span class="'+labelClass+'">'+label+'</span><span class="'+iconClass+'">＋</span>';
    details.appendChild(summary);
    return details;
  };

  const apply=()=>{
    const panel=document.getElementById('predictionPanel');
    const grid=document.getElementById('predictionGrid');
    const ai=document.getElementById('aiBox');
    const acc=document.getElementById('aiAccuracyBox');
    const editor=document.getElementById('editorChiefBox');
    const editorAcc=document.getElementById('editorChiefAccuracy');
    if(!panel||!grid||!ai||!acc||!editor||!editorAcc)return false;

    addStyle();

    if(!document.getElementById('aiPredictionFold')){
      const details=makeDetails('aiPredictionFold','aiPredictionFold','aiPredictionFoldSummary','aiFoldLabel','aiFoldIcon','AI予想を見る');
      grid.parentNode.insertBefore(details,grid);
      details.appendChild(grid);
      details.appendChild(ai);
      details.appendChild(acc);
    }

    if(!document.getElementById('editorPredictionFold')){
      const details=makeDetails('editorPredictionFold','editorPredictionFold','editorPredictionFoldSummary','editorFoldLabel','editorFoldIcon','編集長分析を見る');
      editor.parentNode.insertBefore(details,editor);
      details.appendChild(editor);
      details.appendChild(editorAcc);
    }

    return true;
  };

  if(!apply()){
    const t=setInterval(()=>{if(apply())clearInterval(t);},100);
    setTimeout(()=>clearInterval(t),10000);
  }
})();
