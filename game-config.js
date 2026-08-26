/* PERTAMINA EVENT CONFIG — seluruh asset mengikuti folder /asset/. */
window.EVENT_CONFIG={
  brandName:'PERTAMINA GAS',
  eventLabel:'ENERGY EXPERIENCE',
  splash:{asset:'asset/Pertamina Logo.png',duration:2600},
  capture:{
    duration:45,
    roadSpeed:3.6,
    spawnEvery:680,
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
  memory:[
    'asset/pertalite-card.png','asset/pertamax-card.png','asset/turbo-card.png','asset/pertamax-95-card.png',
    'asset/dex-card.png','asset/dexlite-card.png','asset/biosolar-card.png','asset/lpg-2.png'
  ],
  words:['ENERGI','GAS','PANAS','BUMI','API','DAYA','HIJAU','POWER','NETZERO']
};
