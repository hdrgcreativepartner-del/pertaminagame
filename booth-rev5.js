(()=>{
  'use strict';

  const revImages={};
  function preloadRevAssets(){
    const cfg=window.EVENT_CONFIG||{};
    const list=[cfg.capture?.truckAsset,...(cfg.capture?.fuel||[]).map(x=>x.src),...(cfg.capture?.nonFuel||[]).map(x=>x.src)];
    [...new Set(list.filter(Boolean))].forEach(src=>{const im=new Image();im.src=src;revImages[src]=im;});
  }

  function hardenLogin(){
    const form=document.getElementById('loginForm');
    if(!form||form.dataset.rev5Login==='1') return;
    form.dataset.rev5Login='1';
    const submit=(event)=>{
      event?.preventDefault();event?.stopPropagation();event?.stopImmediatePropagation?.();
      const cfg=window.EVENT_CONFIG||{};
      const user=(document.getElementById('loginUser')?.value||'').trim().toLowerCase();
      const pin=(document.getElementById('loginPin')?.value||'').trim();
      if(user===String(cfg.auth?.user||'').trim().toLowerCase()&&pin===String(cfg.auth?.pin||'').trim()){
        sessionStorage.setItem('pertaminaBoothAuth','1');
        const err=document.getElementById('loginError');if(err)err.textContent='';
        if(typeof showApp==='function')showApp();
        return false;
      }
      const err=document.getElementById('loginError');if(err)err.textContent='User atau PIN tidak sesuai.';
      const pinEl=document.getElementById('loginPin');if(pinEl){pinEl.value='';pinEl.focus();}
      return false;
    };
    form.setAttribute('action','javascript:void(0)');form.onsubmit=submit;form.addEventListener('submit',submit,true);
  }

  function installWordSearchRules(){
    if(typeof buildWordSearch!=='function'||typeof pathBetween!=='function')return;

    buildWordSearch=function(){
      const size=CFG.wordSearch?.size||12;
      const board=Array.from({length:size},()=>Array(size).fill(''));
      const dirs=[[0,1],[1,0]]; // ONLY left→right and top→bottom
      const pool=shuffle(getWordBank()).sort((a,b)=>b.length-a.length);
      const max=CFG.wordSearch?.maxWords||6;
      const placements=[];
      for(const text of pool){
        if(placements.length>=max)break;
        let placed=null;
        for(let attempt=0;attempt<420&&!placed;attempt++){
          const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)];
          const maxR=dr===1?size-text.length:size-1;
          const maxC=dc===1?size-text.length:size-1;
          if(maxR<0||maxC<0)continue;
          const r=Math.floor(Math.random()*(maxR+1));
          const c=Math.floor(Math.random()*(maxC+1));
          let ok=true;
          for(let i=0;i<text.length;i++){
            const ch=board[r+dr*i][c+dc*i];
            if(ch&&ch!==text[i]){ok=false;break;}
          }
          if(!ok)continue;
          const cells=[];
          for(let i=0;i<text.length;i++){
            const rr=r+dr*i,cc=c+dc*i;
            board[rr][cc]=text[i];cells.push(rr*size+cc);
          }
          placed={word:text,cells,direction:dr===0?'H':'V'};
        }
        if(placed)placements.push(placed);
      }
      const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!board[r][c])board[r][c]=letters[Math.floor(Math.random()*letters.length)];
      return{size,grid:board.flat(),placements};
    };

    // Selection is also one-way: only left→right or top→bottom.
    pathBetween=function(a,b){
      if(a==null||b==null)return[];
      const ar=Math.floor(a/word.size),ac=a%word.size,br=Math.floor(b/word.size),bc=b%word.size;
      const rd=br-ar,cd=bc-ac;
      const isHorizontal=rd===0&&cd>=0;
      const isVertical=cd===0&&rd>=0;
      if(!isHorizontal&&!isVertical)return[];
      const steps=Math.max(rd,cd),out=[];
      for(let i=0;i<=steps;i++)out.push(isHorizontal?ar*word.size+(ac+i):(ar+i)*word.size+ac);
      return out;
    };

    checkWordSelection=function(path){
      if(!word.running||!path.length)return;
      const text=path.map(i=>word.grid[i]).join('');
      const hit=word.placements.find(p=>!word.found.has(p.word)&&sameCells(path,p.cells)&&text===p.word);
      if(!hit){$('wordFeedback').textContent=`\"${text}\" belum cocok. Cari dari kiri ke kanan atau dari atas ke bawah.`;return;}
      word.found.add(hit.word);
      hit.cells.forEach(i=>document.querySelector(`.word-cell[data-index=\"${i}\"]`)?.classList.add('found'));
      document.querySelector(`[data-word=\"${hit.word}\"]`)?.classList.add('found');
      word.score+=100+Math.max(0,Math.round(word.time/6));
      $('wordScore').textContent=word.score;$('wordFound').textContent=word.found.size;$('wordFeedback').textContent=`${hit.word} ditemukan!`;
      if(word.found.size===word.targets.length)finishWordSearch(true);
    };
  }

  function installCaptureRenderer(){
    if(typeof drawGameObject!=='function'||typeof drawTruck!=='function'||typeof collectCapture!=='function')return;

    spawnWave=function(){
      const fuel=CFG.capture?.fuel||[],bad=CFG.capture?.nonFuel||[];if(!fuel.length&&!bad.length)return;
      const lanes=shuffle([0,1,2]),count=Math.random()<.74?2:1;
      for(let i=0;i<count;i++){
        const isBad=Math.random()<(CFG.capture?.nonFuelChance??.34),pool=isBad?bad:fuel,item=pool[Math.floor(Math.random()*pool.length)];
        capture.objects.push({lane:lanes[i],y:-.10,speed:.0039+Math.random()*.0012,item,bad:isBad,rot:(Math.random()-.5)*.025});
      }
    };

    drawGameObject=function(ctx,o,road){
      o.y+=o.speed;
      const t=Math.max(0,Math.min(1,o.y)),x=laneX(road,o.lane,t),y=o.y*capture.h,im=revImages[o.item.src];
      const laneW=laneWidthAt(road,t),maxW=laneW*.58,maxH=42+42*t;
      let w=Math.min(maxW,72+30*t),h=Math.min(maxH,68+24*t);
      if(im?.naturalWidth){const ratio=im.naturalWidth/im.naturalHeight;w=Math.min(maxW,maxH*ratio);h=w/ratio;}
      ctx.save();ctx.translate(x,y);ctx.rotate(o.rot);
      ctx.shadowColor=o.bad?'rgba(214,25,31,.48)':'rgba(0,112,186,.34)';ctx.shadowBlur=12+10*t;
      if(im?.complete&&im.naturalWidth)ctx.drawImage(im,-w/2,-h/2,w,h);
      else{ctx.fillStyle=o.bad?'#D6191F':'#0070BA';ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.34,0,Math.PI*2);ctx.fill();}
      ctx.restore();return{x,y,w,h};
    };

    drawTruck=function(ctx,road){
      const im=revImages[CFG.capture?.truckAsset],t=.93;
      capture.truckLane+=(capture.targetLane-capture.truckLane)*.085;
      const x=laneX(road,capture.truckLane,t),laneW=laneWidthAt(road,t),truckW=Math.min(118,laneW*.48);
      const ratio=im?.naturalWidth?im.naturalHeight/im.naturalWidth:.55,truckH=truckW*ratio,y=capture.h-truckH-18;
      ctx.save();
      const glow=ctx.createRadialGradient(x,y+truckH*.55,4,x,y+truckH*.55,truckW*.7);glow.addColorStop(0,'rgba(0,112,186,.20)');glow.addColorStop(1,'rgba(0,112,186,0)');ctx.fillStyle=glow;ctx.fillRect(x-truckW,y-truckH*.2,truckW*2,truckH*1.8);
      ctx.shadowColor='rgba(0,0,0,.62)';ctx.shadowBlur=20;ctx.shadowOffsetY=8;
      if(im?.complete&&im.naturalWidth)ctx.drawImage(im,x-truckW/2,y,truckW,truckH);
      else{ctx.fillStyle='#0070BA';ctx.fillRect(x-truckW/2,y,truckW,truckH);}
      ctx.restore();return{x,y:y+truckH*.52,w:truckW,h:truckH,lane:capture.truckLane};
    };

    window.showCaptureFx=function(o){
      const stage=document.getElementById('captureStage');if(!stage)return;
      const fx=document.createElement('div');
      fx.className=`capture-score-fx ${o.bad?'bad':'good'}`;
      const pts=Math.abs(Number(o.item.points)||0);
      fx.innerHTML=o.bad?`<b>−${pts}</b><span>NON-FUEL HIT</span>`:`<b>+${pts}</b><span>ENERGY CAPTURED</span>`;
      stage.appendChild(fx);setTimeout(()=>fx.remove(),850);
    };

    collectCapture=function(o){
      const points=Number(o.item.points)||0;
      if(o.bad){capture.score=Math.max(0,capture.score+points);capture.combo=1;navigator.vibrate?.([45,30,45]);}
      else{capture.score+=Math.round(points*Math.max(1,capture.combo));capture.combo=Math.min(7,capture.combo+.45);navigator.vibrate?.(22);}
      updateCaptureHud();showCaptureFx(o);
      const f=$('hitFlash');f.className=`hit-flash ${o.bad?'bad':'good'}`;setTimeout(()=>f.className='hit-flash',260);
    };
  }

  function refreshCopy(){
    const instruction=document.querySelector('.word-instruction');
    if(instruction)instruction.textContent='TEKA-TEKI SILANG HURUF — cari kata hanya dari kiri ke kanan atau dari atas ke bawah. Touch / click lalu drag.';
    const wordSmall=document.querySelector('.game-picker button:nth-child(1) small');if(wordSmall)wordSmall.textContent='Left → right / top → bottom';
    const captureText=document.querySelector('#cameraPrompt p');if(captureText)captureText.textContent='Gerakkan kepala untuk mengarahkan truk. Tangkap logo fuel untuk menambah skor dan hindari non-fuel. Saat mulai, track otomatis fullscreen.';
    const captureTitle=document.querySelector('#cameraPrompt h3');if(captureTitle)captureTitle.innerHTML='DRIVE THE TRUCK.<br><em>CAPTURE THE ENERGY.</em>';
  }

  function install(){hardenLogin();preloadRevAssets();installWordSearchRules();installCaptureRenderer();refreshCopy();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setTimeout(install,250);setTimeout(install,1000);
})();
