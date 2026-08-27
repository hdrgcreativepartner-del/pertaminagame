(()=>{
  'use strict';

  function formatElapsed(seconds){
    const total=Math.max(0,Math.round(Number(seconds)||0));
    const m=Math.floor(total/60),s=total%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function playerName(){
    try{
      const p=typeof getCurrentPlayer==='function'?getCurrentPlayer():null;
      if(p?.name)return p.name;
    }catch{}
    return (document.getElementById('playerName')?.value||'PLAYER').trim()||'PLAYER';
  }

  function removeResultPopup(){document.getElementById('boothGameResult')?.remove();}

  function showResultPopup({game,name,score,elapsed,status,onReplay}){
    removeResultPopup();
    const overlay=document.createElement('div');
    overlay.id='boothGameResult';
    overlay.className='booth-result-overlay';
    overlay.innerHTML=`
      <div class="booth-result-card" role="dialog" aria-modal="true" aria-label="${game} result">
        <button class="booth-result-close" type="button" aria-label="Close">×</button>
        <div class="booth-result-brand"><img src="asset/Pertamina Logo.png" alt="Pertamina Patra Niaga"></div>
        <span class="booth-result-kicker">${game}</span>
        <h2>${status}</h2>
        <p class="booth-result-player">${String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
        <div class="booth-result-stats">
          <div><span>SCORE</span><b>${Math.max(0,Math.round(Number(score)||0))}</b></div>
          <div><span>TIME</span><b>${formatElapsed(elapsed)}</b></div>
        </div>
        <div class="booth-result-actions">
          <button class="booth-result-primary" type="button" data-action="replay">PLAY AGAIN</button>
          <button class="booth-result-secondary" type="button" data-action="home">HOME</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add('show'));

    const close=()=>{overlay.classList.remove('show');setTimeout(()=>overlay.remove(),280);};
    overlay.querySelector('.booth-result-close')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('[data-action="home"]')?.addEventListener('click',()=>{close();setTimeout(()=>{if(typeof showPage==='function')showPage('home');},180);});
    overlay.querySelector('[data-action="replay"]')?.addEventListener('click',()=>{close();setTimeout(()=>onReplay?.(),180);});
  }

  function installWordResult(){
    if(typeof finishWordSearch!=='function'||finishWordSearch.__rev7Wrapped)return;
    const original=finishWordSearch;
    const wrapped=function(completed){
      if(typeof word==='undefined'||!word.running)return original(completed);
      const duration=CFG.wordSearch?.duration||120;
      const elapsed=Math.max(0,duration-word.time);
      original(completed);
      showResultPopup({
        game:'ENERGY WORD',
        name:playerName(),
        score:word.score,
        elapsed,
        status:completed?'WORDS COMPLETE':'TIME UP',
        onReplay:()=>typeof startWordSearch==='function'&&startWordSearch()
      });
    };
    wrapped.__rev7Wrapped=true;
    finishWordSearch=wrapped;
  }

  function installMemoryResult(){
    if(typeof finishMemory!=='function'||finishMemory.__rev7Wrapped)return;
    const original=finishMemory;
    const wrapped=function(completed){
      if(typeof memory==='undefined'||!memory.running)return original(completed);
      const duration=60;
      const elapsed=Math.max(0,duration-memory.time);
      const base=(CFG.memory||[]).length;
      const score=Math.max(0,memory.matches*100+memory.time*4-Math.max(0,memory.moves-base)*5);
      original(completed);
      showResultPopup({
        game:'ENERGY MEMORY',
        name:playerName(),
        score,
        elapsed,
        status:completed?'ALL PAIRS FOUND':'TIME UP',
        onReplay:()=>typeof startMemory==='function'&&startMemory()
      });
    };
    wrapped.__rev7Wrapped=true;
    finishMemory=wrapped;
  }

  function installCaptureResultName(){
    if(typeof endCapture!=='function'||endCapture.__rev8Wrapped)return;
    const original=endCapture;
    const wrapped=async function(...args){
      const name=playerName();
      const result=await original.apply(this,args);
      const modal=document.getElementById('captureResult');
      if(modal){
        let player=modal.querySelector('.capture-result-player');
        if(!player){
          player=document.createElement('p');
          player.className='capture-result-player';
          const score=modal.querySelector('#captureResultScore');
          if(score)modal.insertBefore(player,score);
          else modal.prepend(player);
        }
        player.textContent=name;
      }
      return result;
    };
    wrapped.__rev8Wrapped=true;
    endCapture=wrapped;
  }

  function install(){installWordResult();installMemoryResult();installCaptureResultName();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setTimeout(install,250);setTimeout(install,900);
})();
