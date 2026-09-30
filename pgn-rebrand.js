(()=>{
  'use strict';

  const PGN_LOGO='asset/Pertamina Gas Negara logo.png';
  const GAS_PRODUCTS=[
    {src:'asset/Logo Produk PGN • GasKita.png',label:'GASKITA',points:20},
    {src:'asset/Logo Produk PGN • GasKu.png',label:'GASKU',points:25},
    {src:'asset/Logo Produk PGN • GasLine.png',label:'GASLINE',points:30},
    {src:'asset/Logo Produk PGN • GasLink.png',label:'GASLINK',points:35}
  ];
  const PGN_WORDS=['PGN','GASKITA','GASKU','GASLINE','GASLINK','GASBUMI','ENERGI','JARINGAN','PELANGGAN'];

  const cfg=window.EVENT_CONFIG||{};
  cfg.brandName='PERTAMINA GAS NEGARA';
  cfg.eventLabel='GAS ENERGY EXPERIENCE';
  cfg.splash={...(cfg.splash||{}),asset:PGN_LOGO};
  cfg.capture={
    ...(cfg.capture||{}),
    spawnEvery:820,
    nonFuelChance:0,
    fuel:GAS_PRODUCTS,
    nonFuel:[]
  };
  cfg.wordSearch={...(cfg.wordSearch||{}),size:12,duration:120,maxWords:6,defaultWords:PGN_WORDS};
  cfg.memory=GAS_PRODUCTS.map(x=>x.src);
  cfg.memoryBack=PGN_LOGO;

  if(!localStorage.getItem('pgnWordBankMigrated')){
    localStorage.removeItem('pertaminaCustomWordsV4');
    localStorage.setItem('pgnWordBankMigrated','1');
  }

  function setText(selector,text){
    const el=document.querySelector(selector);
    if(el&&el.textContent!==text)el.textContent=text;
  }
  function setHTML(selector,html){
    const el=document.querySelector(selector);
    if(el&&el.innerHTML!==html)el.innerHTML=html;
  }

  function applyBranding(){
    document.title='Pertamina Gas Negara — Gas Energy Experience';
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.content='Pertamina Gas Negara interactive gas energy booth games';

    document.querySelectorAll('img[src="asset/Pertamina Logo.png"], img[alt="Pertamina Patra Niaga"]').forEach(img=>{
      img.src=PGN_LOGO;
      img.alt='Pertamina Gas Negara';
    });

    setText('.brand span b','PERTAMINA GAS NEGARA');
    setText('.brand span small','GAS ENERGY EXPERIENCE');
    setText('.home-copy .kicker','PERTAMINA GAS NEGARA • INTERACTIVE GAS EXPERIENCE');
    setHTML('.home-copy h1','ENERGY FOR<br><em>EVERY CONNECTION.</em>');
    setText('.home-copy > p','Registrasikan player, kenali produk dan solusi gas PGN, lalu pilih permainan interaktif untuk mengumpulkan skor tertinggi.');

    setText('.label-one span','HEAD TRACKING');
    setText('.label-two span','GAS CAPTURE');
    setText('.label-three span','LIVE SCORE');

    const picks=document.querySelectorAll('.game-picker button');
    if(picks[0])picks[0].querySelector('small').textContent='Find PGN gas words';
    if(picks[1])picks[1].querySelector('small').textContent='Catch PGN gas products';
    if(picks[2])picks[2].querySelector('small').textContent='Match PGN gas products';

    setHTML('#capture .game-titlebar h2','CAPTURE THE GAS.');
    const captureSide=document.querySelector('#capture .capture-side .side-card p');
    if(captureSide)captureSide.textContent='Gerakkan kepala ke kiri, tengah, atau kanan untuk mengarahkan truk menangkap produk gas PGN.';
    setHTML('#cameraPrompt h3','MOVE YOUR HEAD.<br><em>CAPTURE THE GAS.</em>');
    setText('#cameraPrompt p','Tangkap logo GasKita, GasKu, GasLine, dan GasLink. Saat permainan dimulai, track otomatis masuk fullscreen.');

    const legendRows=document.querySelectorAll('#capture .legend-card > div');
    if(legendRows[0]){
      const spans=legendRows[0].querySelectorAll('span,b');
      if(spans[0])spans[0].textContent='PGN GAS PRODUCT';
      if(spans[1])spans[1].textContent='+ SCORE';
    }

    setHTML('#word .game-titlebar h2','FIND THE WORDS.');
    setText('.word-instruction','TEKA-TEKI SILANG HURUF PGN — cari kata dari kiri ke kanan atau dari atas ke bawah. Touch / click lalu drag.');
    const wordAdmin=document.querySelector('.word-admin .admin-card p');
    if(wordAdmin)wordAdmin.textContent='Tambahkan istilah PGN atau gas bumi. Kata tersimpan di perangkat booth dan digunakan pada ronde berikutnya.';

    setHTML('#memory .game-titlebar h2','MATCH THE GAS PRODUCTS.');
    setText('.memory-brand b','PGN GAS MEMORY');
    setText('.memory-brand span','Cocokkan setiap pasangan logo GasKita, GasKu, GasLine, dan GasLink');

    const loginCopy=document.querySelector('.login-form > p:not(.form-error)');
    if(loginCopy)loginCopy.textContent='Masuk untuk menjalankan permainan PGN, mengelola word bank, dan mengunduh data peserta.';

    const footer=document.querySelectorAll('footer span');
    if(footer[0])footer[0].textContent='PERTAMINA GAS NEGARA';
    if(footer[1])footer[1].textContent='GAS ENERGY EXPERIENCE • EVENT BOOTH';

    document.querySelectorAll('.booth-result-brand img').forEach(img=>{
      img.src=PGN_LOGO;
      img.alt='Pertamina Gas Negara';
    });
  }

  function installGasCaptureFx(){
    if(typeof window.showCaptureFx!=='function')return;
    if(window.showCaptureFx.__pgn)return;
    const gasFx=function(o){
      const stage=document.getElementById('captureStage');if(!stage)return;
      const fx=document.createElement('div');
      fx.className='capture-score-fx good';
      const pts=Math.abs(Number(o?.item?.points)||0);
      fx.innerHTML=`<b>+${pts}</b><span>GAS CAPTURED • ${o?.item?.label||'PGN'}</span>`;
      stage.appendChild(fx);
      setTimeout(()=>fx.remove(),850);
    };
    gasFx.__pgn=true;
    window.showCaptureFx=gasFx;
  }

  const observer=new MutationObserver(()=>applyBranding());
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});

  applyBranding();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBranding,{once:true});
  window.addEventListener('load',()=>{applyBranding();setTimeout(()=>{applyBranding();installGasCaptureFx();},250);setTimeout(()=>{applyBranding();installGasCaptureFx();},1200);},{once:true});
})();