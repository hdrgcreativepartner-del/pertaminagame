window.EVENT_CONFIG={
  brandName:'PERTAMINA GAS NEGARA',
  eventLabel:'GAS ENERGY EXPERIENCE',
  features:{catchGas:false},
  palette:{black:'#0B0A08',red:'#E9313A',blue:'#0879BE',lime:'#B7D322',gray:'#BBBBBB',white:'#FFFFFF'},
  splash:{asset:'asset/Pertamina Gas Negara logo.png',partnerAsset:'asset/Danantara_Indonesia logo.png',duration:1800},
  auth:{
    user:'89 pro',
    pin:'1945',
    users:[
      {user:'89 pro',pin:'1945'},
      {user:'hdrg',pin:'1993'}
    ]
  },
  capture:{
    duration:45,
    spawnEveryStart:1250,
    spawnEveryEnd:680,
    minWaveGapStart:.30,
    minWaveGapEnd:.12,
    speedStart:.00365,
    speedEnd:.00685,
    speedJitterStart:.00090,
    speedJitterEnd:.00135,
    nonFuelChance:.42,
    truckAsset:'asset/Truck Tanki.png',
    fuel:[
      {src:'asset/Logo Produk PGN • GasKita.png',label:'GASKITA',points:20},
      {src:'asset/Logo Produk PGN • GasKu.png',label:'GASKU',points:25},
      {src:'asset/Logo Produk PGN • GasLine.png',label:'GASLINE',points:30},
      {src:'asset/Logo Produk PGN • GasLink.png',label:'GASLINK',points:35},
    ],
    nonFuel:[
      {src:'asset/pertalite-card.png',label:'PERTALITE',points:-15},
      {src:'asset/pertamax-card.png',label:'PERTAMAX',points:-20},
      {src:'asset/turbo-card.png',label:'PERTAMAX TURBO',points:-25},
      {src:'asset/pertamax-95-card.png',label:'PERTAMAX GREEN 95',points:-25},
      {src:'asset/dex-card.png',label:'DEX',points:-18},
      {src:'asset/dexlite-card.png',label:'DEXLITE',points:-16},
      {src:'asset/biosolar-card.png',label:'BIOSOLAR',points:-12}
    ]
  },
  catchGas:{
    duration:30,
    spawnEveryStart:820,
    spawnEveryEnd:390,
    activeMin:2,
    activeMax:5,
    good:[
      {src:'asset/Logo Produk PGN • GasKita.png',label:'GASKITA',points:20},
      {src:'asset/Logo Produk PGN • GasKu.png',label:'GASKU',points:25},
      {src:'asset/Logo Produk PGN • GasLine.png',label:'GASLINE',points:30},
      {src:'asset/Logo Produk PGN • GasLink.png',label:'GASLINK',points:35},
    ],
    bad:[
      {src:'asset/pertalite-card.png',label:'PERTALITE',points:-15},
      {src:'asset/pertamax-card.png',label:'PERTAMAX',points:-20},
      {src:'asset/turbo-card.png',label:'PERTAMAX TURBO',points:-25},
      {src:'asset/pertamax-95-card.png',label:'PERTAMAX GREEN 95',points:-25},
      {src:'asset/dex-card.png',label:'DEX',points:-18},
      {src:'asset/dexlite-card.png',label:'DEXLITE',points:-16},
      {src:'asset/biosolar-card.png',label:'BIOSOLAR',points:-12}
    ]
  },
  wordSearch:{
    size:12,
    duration:120,
    maxWords:6,
    defaultWords:['PGN','GASKITA','GASKU','GASLINE','GASLINK','GASBUMI','ENERGI','JARINGAN','PELANGGAN']
  },
  memory:[
    'asset/Logo Produk PGN • GasKita.png',
    'asset/Logo Produk PGN • GasKu.png',
    'asset/Logo Produk PGN • GasLine.png',
    'asset/Logo Produk PGN • GasLink.png',
  ],
  memoryRequired:[
    'asset/Card Game - Icon Surabaya.png',
    'asset/Card Game - Tugu Pahlawan.png',
    'asset/Advancing & rising in unity.png'
  ],
  memoryDirectCards:[
    'asset/Card Game - Icon Surabaya.png',
    'asset/Card Game - Tugu Pahlawan.png'
  ],
  memoryPairCount:6,
  memoryBack:'asset/Card Cover.png',
  memoryBlank:'asset/Card Blank.png'
};
