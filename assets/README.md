# Event Assets

Asset folder untuk Pertamina Gas Event Booth Experience.

Capture Energy mengambil asset dari `game-config.js`, sehingga asset campaign dapat diganti tanpa mengubah engine.

Format yang digunakan saat ini adalah SVG agar ringan dan mudah diedit. Nama file mengikuti asset yang diberikan pada paket reference: Pertalite, Pertamax, Pertamax Turbo, Pertamax Green 95, Dex, Dexlite, Biosolar, LPG, serta non-fuel assets.

Untuk mengganti asset Capture Energy, ubah `src` pada `game-config.js`, misalnya:

`{src:'assets/custom-product.svg',points:20,label:'CUSTOM PRODUCT'}`
