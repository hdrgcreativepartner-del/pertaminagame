/* PERTAMINA EVENT CONFIG — ganti asset di folder /assets/ tanpa menyentuh game engine. */
window.EVENT_CONFIG={
  brandName:'PERTAMINA GAS',
  eventLabel:'ENERGY EXPERIENCE',
  splash:{asset:'assets/patra-niaga-splash.svg',duration:2600},
  capture:{
    duration:45,
    roadSpeed:3.6,
    spawnEvery:680,
    truckAsset:'assets/truck-tanki.svg',
    fuel:[
      {src:'assets/pertalite-card.svg',label:'PERTALITE',points:10},
      {src:'assets/pertamax-card.svg',label:'PERTAMAX',points:15},
      {src:'assets/turbo-card.svg',label:'PERTAMAX TURBO',points:20},
      {src:'assets/pertamax-95-card.svg',label:'PERTAMAX GREEN 95',points:25},
      {src:'assets/dex-card.svg',label:'DEX',points:18},
      {src:'assets/dexlite-card.svg',label:'DEXLITE',points:16},
      {src:'assets/biosolar-card.svg',label:'BIOSOLAR',points:12},
      {src:'assets/lpg-2.svg',label:'LPG',points:22}
    ],
    nonFuel:[
      {src:'assets/non-fuel.svg',label:'NON-FUEL',points:-15},
      {src:'assets/non-fuel-1.svg',label:'NON-FUEL',points:-20},
      {src:'assets/non-fuel-2.svg',label:'NON-FUEL',points:-25},
      {src:'assets/non-fuel-3.svg',label:'NON-FUEL',points:-30}
    ]
  },
  memory:['⚡','🔥','🛢️','🌱','💧','☀️','⚙️','⛽'],
  words:['ENERGI','GAS','PANAS','BUMI','API','DAYA','HIJAU','POWER','NETZERO']
};
