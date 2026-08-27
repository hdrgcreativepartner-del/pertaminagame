window.EVENT_CONFIG={
  brandName:'PERTAMINA PATRA NIAGA',
  eventLabel:'ENERGIZING YOUR JOURNEY',
  palette:{black:'#0B0A08',red:'#D6191F',blue:'#0070BA',lime:'#BBD760',gray:'#BBBBBB',white:'#FFFFFF'},
  splash:{asset:'asset/Pertamina Logo.png',duration:2400},
  auth:{user:'89 pro',pin:'1945'},
  capture:{
    duration:45,
    spawnEvery:900,
    nonFuelChance:.34,
    truckAsset:'asset/Truck Tanki.png',
    fuel:[
      {src:'asset/pertalite-card.png',label:'PERTALITE',points:10},
      {src:'asset/pertamax-card.png',label:'PERTAMAX',points:15},
      {src:'asset/turbo-card.png',label:'PERTAMAX TURBO',points:20},
      {src:'asset/pertamax-95-card.png',label:'PERTAMAX GREEN 95',points:25},
      {src:'asset/dex-card.png',label:'DEX',points:18},
      {src:'asset/dexlite-card.png',label:'DEXLITE',points:16},
      {src:'asset/biosolar-card.png',label:'BIOSOLAR',points:12},
      {src:'asset/lpg-2.png',label:'LPG',points:22}
    ],
    nonFuel:[
      {src:'asset/non-fuel.png',label:'NON-FUEL',points:-15},
      {src:'asset/non-fuel-1.png',label:'NON-FUEL',points:-20},
      {src:'asset/non-fuel-2.png',label:'NON-FUEL',points:-25},
      {src:'asset/non-fuel-3.png',label:'NON-FUEL',points:-30}
    ]
  },
  wordSearch:{
    size:12,
    duration:120,
    maxWords:6,
    defaultWords:['DISTRIBUTOR','BRIGHTSTORE','FASTRON','RETAIL','MITRA','PERTAMINA','ENERGI','PATRA','NIAGA']
  },
  memory:[
    'asset/pertalite-card.png','asset/pertamax-card.png','asset/turbo-card.png','asset/pertamax-95-card.png',
    'asset/dex-card.png','asset/dexlite-card.png','asset/biosolar-card.png','asset/lpg-2.png'
  ],
  memoryBack:'asset/Pertamina Logo.png'
};

/* Runtime revision loader, versioned to bypass stale GitHub Pages cache. */
(()=>{
  const version='20260827-r7';
  ['booth-rev5.css','booth-rev7.css'].forEach(file=>{
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href=`${file}?v=${version}`;
    document.head.appendChild(css);
  });

  const loadRev7=()=>{
    if(document.querySelector('script[data-booth-rev7]'))return;
    const rev7=document.createElement('script');
    rev7.src=`booth-rev7.js?v=${version}`;
    rev7.dataset.boothRev7='1';
    document.body.appendChild(rev7);
  };

  const loadPatches=()=>{
    if(document.querySelector('script[data-booth-rev5]')){loadRev7();return;}
    const rev5=document.createElement('script');
    rev5.src=`booth-rev5.js?v=${version}`;
    rev5.dataset.boothRev5='1';
    rev5.onload=loadRev7;
    document.body.appendChild(rev5);
  };

  if(document.readyState==='complete')setTimeout(loadPatches,0);
  else window.addEventListener('load',loadPatches,{once:true});
})();
