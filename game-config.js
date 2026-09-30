window.EVENT_CONFIG={
  brandName:'PERTAMINA GAS NEGARA',
  eventLabel:'GAS ENERGY EXPERIENCE',
  palette:{black:'#0B0A08',red:'#E9313A',blue:'#0879BE',lime:'#B7D322',gray:'#BBBBBB',white:'#FFFFFF'},
  splash:{asset:'asset/Pertamina Gas Negara logo.png',duration:1800},
  auth:{user:'89 pro',pin:'1945'},
  capture:{
    duration:45,
    spawnEvery:820,
    nonFuelChance:0,
    truckAsset:'asset/Truck Tanki.png',
    fuel:[
      {src:'asset/Logo Produk PGN • GasKita.png',label:'GASKITA',points:20},
      {src:'asset/Logo Produk PGN • GasKu.png',label:'GASKU',points:25},
      {src:'asset/Logo Produk PGN • GasLine.png',label:'GASLINE',points:30},
      {src:'asset/Logo Produk PGN • GasLink.png',label:'GASLINK',points:35}
    ],
    nonFuel:[]
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
    'asset/Logo Produk PGN • GasLink.png'
  ],
  memoryBack:'asset/Pertamina Gas Negara logo.png'
};
