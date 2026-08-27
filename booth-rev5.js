(()=>{
  'use strict';

  function hardenLogin(){
    const form=document.getElementById('loginForm');
    if(!form||form.dataset.rev5Login==='1') return;
    form.dataset.rev5Login='1';
    const submit=(event)=>{
      event?.preventDefault();
      event?.stopPropagation();
      event?.stopImmediatePropagation?.();
      const cfg=window.EVENT_CONFIG||{};
      const user=(document.getElementById('loginUser')?.value||'').trim().toLowerCase();
      const pin=(document.getElementById('loginPin')?.value||'').trim();
      if(user===String(cfg.auth?.user||'').trim().toLowerCase()&&pin===String(cfg.auth?.pin||'').trim()){
        sessionStorage.setItem('pertaminaBoothAuth','1');
        const err=document.getElementById('loginError'); if(err) err.textContent='';
        if(typeof showApp==='function') showApp();
        return false;
      }
      const err=document.getElementById('loginError'); if(err) err.textContent='User atau PIN tidak sesuai.';
      const pinEl=document.getElementById('loginPin'); if(pinEl){pinEl.value='';pinEl.focus();}
      return false;
    };
    form.setAttribute('action','javascript:void(0)');
    form.onsubmit=submit;
    form.addEventListener('submit',submit,true);
  }

  function installWordSearchRules(){
    if(typeof buildWordSearch!=='function'||typeof pathBetween!=='function') return;

    buildWordSearch=function(){
      const size=CFG.wordSearch?.size||12;
      const board=Array.from({length:size},()=>Array(size).fill(''));
      // Only left-to-right and top-to-bottom placements.
      const dirs=[[0,1],[1,0]];
      const pool=shuffle(getWordBank()).sort((a,b)=>b.length-a.length);
      const max=CFG.wordSearch?.maxWords||6;
      const placements=[];

      for(const text of pool){
        if(placements.length>=max) break;
        let placed=null;
        for(let attempt=0;attempt<320&&!placed;attempt++){
          const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)];
          const r=Math.floor(Math.random()*size);
          const c=Math.floor(Math.random()*size);
          const er=r+dr*(text.length-1);
          const ec=c+dc*(text.length-1);
          if(er<0||er>=size||ec<0||ec>=size) continue;
          let ok=true;
          for(let i=0;i<text.length;i++){
            const ch=board[r+dr*i][c+dc*i];
            if(ch&&ch!==text[i]){ok=false;break;}
          }
          if(!ok) continue;
          const cells=[];
          for(let i=0;i<text.length;i++){
            const rr=r+dr*i,cc=c+dc*i;
            board[rr][cc]=text[i];
            cells.push(rr*size+cc);
          }
          placed={word:text,cells};
        }
        if(placed) placements.push(placed);
      }

      const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(!board[r][c]) board[r][c]=letters[Math.floor(Math.random()*letters.length)];
      return {size,grid:board.flat(),placements};
    };

    // Player may connect only horizontally or vertically; no diagonal path.
    pathBetween=function(a,b){
      if(a==null||b==null) return [];
      const ar=Math.floor(a/word.size),ac=a%word.size;
      const br=Math.floor(b/word.size),bc=b%word.size;
      const rd=br-ar,cd=bc-ac;
      if(!(rd===0||cd===0)) return [];
      const sr=Math.sign(rd),sc=Math.sign(cd);
      const steps=Math.max(Math.abs(rd),Math.abs(cd));
      const out=[];
      for(let i=0;i<=steps;i++) out.push((ar+sr*i)*word.size+(ac+sc*i));
      return out;
    };
  }

  function refreshCopy(){
    const instruction=document.querySelector('.word-instruction');
    if(instruction) instruction.textContent='TOUCH / CLICK + DRAG untuk menghubungkan huruf secara horizontal (kiri → kanan) atau vertikal (atas → bawah).';
    const wordSmall=document.querySelector('.game-picker button:nth-child(1) small');
    if(wordSmall) wordSmall.textContent='Horizontal & vertical word search';
    const captureText=document.querySelector('#cameraPrompt p');
    if(captureText) captureText.textContent='Tangkap produk fuel untuk menambah skor dan hindari produk non-fuel. Saat mulai, track otomatis masuk fullscreen.';
    const captureTitle=document.querySelector('#cameraPrompt h3');
    if(captureTitle) captureTitle.innerHTML='MOVE YOUR HEAD.<br><em>CAPTURE THE ENERGY.</em>';
  }

  function install(){
    hardenLogin();
    installWordSearchRules();
    refreshCopy();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  setTimeout(install,250);
  setTimeout(install,1000);
})();
