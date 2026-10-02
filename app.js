const CFG=window.EVENT_CONFIG||{};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(Math.max(0,Math.round(Number(n)||0))).padStart(4,'0');
const PLAYERS_KEY='pertaminaBoothPlayersV4',SCORES_KEY='pertaminaBoothScoresV4',CURRENT_KEY='pertaminaCurrentPlayerV4',WORDS_KEY='pertaminaCustomWordsV4',SYSTEM_PAUSE_KEY='pgnSystemPausedV1',OPERATOR_USER_KEY='pgnOperatorUserV1',OPERATOR_ACCOUNTS_KEY='pgnOperatorAccountsV1';
const REMOTE_STATE_RAW='https://raw.githubusercontent.com/hdrgcreativepartner-del/pertaminagame/main/remote-state.json';
const REMOTE_STATE_API='https://api.github.com/repos/hdrgcreativepartner-del/pertaminagame/contents/remote-state.json';
let remoteStateCache=null,githubAdminToken='',remoteWatchTimer=null;
let currentPage='home',stream=null,faceMesh=null,faceLoopBusy=false,toastTimer=null;
const imageCache={};
const CAPTURE_TRUCK_ASSETS={
  left:'asset/Truck Gas left.png',
  center:'asset/Truck Gas center.png',
  right:'asset/Truck Gas right.png'
};
if(CFG.capture)CFG.capture.truckAsset=CAPTURE_TRUCK_ASSETS.center;

const GAME_INFO={
  word:{kicker:'01 / ENERGY WORD',title:'FIND THE WORDS',description:'Temukan kata-kata yang berkaitan dengan PGN dan energi gas di dalam susunan huruf. Hubungkan huruf menggunakan sentuhan atau mouse dan selesaikan sebanyak mungkin sebelum waktu habis.',tips:['Kiri → kanan','Atas → bawah','120 detik']},
  capture:{kicker:'02 / CAPTURE ENERGY',title:'CAPTURE THE GAS',description:'Gerakkan kepala ke kiri, tengah, atau kanan untuk mengendalikan Truck Gas PGN. Tangkap GasKita, GasKu, GasLine, GasLink, dan Bright Gas untuk mendapat poin. Hindari produk BBM karena akan mengurangi skor.',tips:['Head tracking','Gas = + score','Fuel = − score']},
  memory:{kicker:'03 / ENERGY MEMORY',title:'MATCH THE OBJECTS',description:'Ingat posisi kartu dan temukan pasangan logo produk gas serta ikon kota Surabaya. Card Cover akan terbuka menjadi objek di atas Card Blank. Cocokkan 6 pasangan sebelum waktu habis.',tips:['12 kartu','6 pairs','60 detik']},
  catchgas:{kicker:'04 / CATCH THE GAS',title:'TOUCH. REACT. SCORE.',description:'Uji kecepatan reaksimu. Sentuh atau klik produk gas PGN yang muncul untuk mendapatkan poin. Hindari produk BBM Pertamina karena setiap salah sentuh akan mengurangi skor.',tips:['Touchscreen + mouse','Gas = + score','Fuel = − score']}
};
let pendingGameInfo=null;

function bytesToBase64(bytes){
  let binary='',i=0;const chunk=0x8000;
  for(;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  return btoa(binary);
}
function base64ToBytes(value){const bin=atob(String(value||'').replace(/\s/g,''));return Uint8Array.from(bin,c=>c.charCodeAt(0))}
function utf8ToBase64(value){return bytesToBase64(new TextEncoder().encode(String(value)))}
function base64ToUtf8(value){return new TextDecoder().decode(base64ToBytes(value))}
async function pinDigest(pin,saltB64,iterations=120000){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:base64ToBytes(saltB64),iterations:Number(iterations)||120000},key,256);
  return bytesToBase64(new Uint8Array(bits));
}
async function makeRemoteAccount(user,pin,role='operator'){
  const salt=new Uint8Array(16);crypto.getRandomValues(salt);
  const saltB64=bytesToBase64(salt),iterations=120000,hash=await pinDigest(pin,saltB64,iterations);
  return{user:String(user).trim(),role, salt:saltB64,hash,iterations};
}
async function verifyRemotePin(pin,account){
  if(!account)return false;
  if(account.hash&&account.salt)return (await pinDigest(pin,account.salt,account.iterations||120000))===account.hash;
  return String(account.pin||'')===String(pin||'');
}
async function fetchRemoteState(){
  const res=await fetch(REMOTE_STATE_RAW+'?v='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('Remote state '+res.status);
  const state=await res.json();
  if(!Array.isArray(state.users))state.users=[];
  remoteStateCache=state;
  return state;
}
function defaultOperatorAccounts(){return (CFG.auth?.users||[]).map(x=>({user:String(x.user||'').trim(),pin:String(x.pin||''),role:String(x.user||'').trim().toLowerCase()==='hdrg'?'master':'operator'})).filter(x=>x.user&&x.pin)}
function getOperatorAccounts(){return remoteStateCache?.users?.length?remoteStateCache.users:defaultOperatorAccounts()}
function getOperatorAccount(name){const key=String(name||'').trim().toLowerCase();return getOperatorAccounts().find(x=>String(x.user||'').trim().toLowerCase()===key)||null}
function validPin(pin){return /^\d{4,8}$/.test(String(pin||''))}
function isSystemPaused(){return remoteStateCache?.paused===true||(remoteStateCache==null&&localStorage.getItem(SYSTEM_PAUSE_KEY)==='1')}
function currentOperatorUser(){return (sessionStorage.getItem(OPERATOR_USER_KEY)||'').toLowerCase()}
function isMasterAdmin(){return currentOperatorUser()==='hdrg'}
async function githubGetRemoteState(){
  if(!githubAdminToken)throw new Error('GitHub token belum terhubung');
  const res=await fetch(REMOTE_STATE_API+'?ref=main&v='+Date.now(),{
    cache:'no-store',
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+githubAdminToken,'X-GitHub-Api-Version':'2022-11-28'}
  });
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||('GitHub '+res.status))}
  const data=await res.json();
  return{sha:data.sha,state:JSON.parse(base64ToUtf8(data.content))};
}
async function githubCommitRemoteState(mutator,message){
  if(!githubAdminToken)throw new Error('Hubungkan GitHub token terlebih dahulu');
  const current=await githubGetRemoteState();
  const next=JSON.parse(JSON.stringify(current.state||{}));
  if(!Array.isArray(next.users))next.users=[];
  await mutator(next);
  next.updatedAt=new Date().toISOString();
  const res=await fetch(REMOTE_STATE_API,{
    method:'PUT',
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+githubAdminToken,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({message,content:utf8ToBase64(JSON.stringify(next,null,2)+'\n'),sha:current.sha,branch:'main'})
  });
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||('GitHub '+res.status))}
  remoteStateCache=next;
  localStorage.setItem(SYSTEM_PAUSE_KEY,next.paused?'1':'0');
  return next;
}
async function connectGitHubAdmin(e){
  e?.preventDefault();
  if(!isMasterAdmin()){toast('Master admin only');return false}
  const input=$('githubAdminTokenInput'),status=$('githubConnectionStatus'),token=(input?.value||'').trim();
  if(!token){toast('Masukkan GitHub token');return false}
  githubAdminToken=token;
  if(status){status.textContent='CONNECTING...';status.classList.remove('connected','error')}
  try{
    await githubGetRemoteState();
    if(input)input.value='';
    if(status){status.textContent='CONNECTED';status.classList.add('connected')}
    toast('GitHub connected — token hanya tersimpan di memori tab ini');
    renderAdminSettings();
  }catch(err){
    githubAdminToken='';
    if(status){status.textContent='CONNECTION FAILED';status.classList.add('error')}
    toast(err.message||'GitHub connection failed');
  }
  return false;
}
function clearRemoteWatch(){if(remoteWatchTimer){clearInterval(remoteWatchTimer);remoteWatchTimer=null}}
function startRemoteWatch(){
  clearRemoteWatch();
  remoteWatchTimer=setInterval(async()=>{
    try{
      const state=await fetchRemoteState();
      if(state.paused&&!isMasterAdmin()){stopAllGames();showMaintenance()}
      if(isMasterAdmin())syncMasterAdminUI();
    }catch{}
  },30000);
}
function showMaintenance(){syncHomeBackgroundVideo(false);$('maintenanceScreen')?.classList.remove('hidden');$('loginScreen')?.classList.add('hidden');$('appRoot')?.classList.add('hidden');document.body.classList.add('maintenance-active')}
function resetLoginCopy(){const form=$('loginForm');if(!form)return;form.dataset.mode='normal';const k=form.querySelector('.kicker'),h=form.querySelector('h1'),p=form.querySelector('p:not(.form-error)');if(k)k.textContent='OPERATOR ACCESS';if(h)h.innerHTML='EVENT<br><em>BOOTH.</em>';if(p)p.textContent='Masuk untuk menjalankan permainan, mengelola word bank, dan mengunduh data peserta.'}
function syncMasterAdminUI(){
  const btn=$('systemPauseBtn'),settingsBtn=$('adminSettingsBtn'),master=isMasterAdmin(),paused=isSystemPaused();
  if(btn){
    btn.classList.toggle('hidden',!master);btn.classList.toggle('paused',paused);
    const b=btn.querySelector('b'),sp=btn.querySelector('span');
    if(b)b.textContent=paused?'▶':'⏸';if(sp)sp.textContent=paused?'RESUME SYSTEM':'PAUSE SYSTEM';
  }
  settingsBtn?.classList.toggle('hidden',!master);
  document.body.classList.toggle('master-admin',master);
  document.body.classList.toggle('system-paused-master',master&&paused);
  if(currentPage==='settings'&&master)renderAdminSettings();
}
function openMasterAdminLogin(){$('maintenanceScreen')?.classList.add('hidden');$('loginScreen')?.classList.remove('hidden');$('appRoot')?.classList.add('hidden');document.body.classList.remove('maintenance-active');const form=$('loginForm');if(form)form.dataset.mode='maintenance';const k=form?.querySelector('.kicker'),h=form?.querySelector('h1'),p=form?.querySelector('p:not(.form-error)');if(k)k.textContent='MASTER ADMIN ACCESS';if(h)h.innerHTML='SYSTEM<br><em>CONTROL.</em>';if(p)p.textContent='Maintenance aktif. Hanya master admin HDRG yang dapat masuk untuk mengaktifkan kembali sistem.';$('loginError').textContent='';setTimeout(()=>$('loginUser')?.focus(),120)}
async function toggleSystemPause(){
  if(!isMasterAdmin()){toast('Master admin only');return}
  if(!githubAdminToken){toast('Hubungkan GitHub token di Settings terlebih dahulu');showPage('settings');return}
  const target=!isSystemPaused();
  if(!confirm(target?'Pause system secara global? Semua device akan melihat System Maintenance.':'Resume system secara global?'))return;
  try{
    await githubCommitRemoteState(state=>{state.paused=target},target?'Pause booth system globally':'Resume booth system globally');
    syncMasterAdminUI();renderAdminSettings();toast(target?'System paused globally':'System resumed globally');
  }catch(err){toast(err.message||'Gagal mengubah system state')}
}
function closeGameInfo(){const m=$('gameInfoModal');m?.classList.remove('show');setTimeout(()=>m?.classList.add('hidden'),220);pendingGameInfo=null}
function confirmGameInfo(){const id=pendingGameInfo;if(!id)return;const m=$('gameInfoModal');m?.classList.remove('show');setTimeout(()=>m?.classList.add('hidden'),220);pendingGameInfo=null;setTimeout(()=>enterGame(id),100)}
function showGameInfo(id){const info=GAME_INFO[id];if(!info){enterGame(id);return}pendingGameInfo=id;$('gameInfoKicker').textContent=info.kicker;$('gameInfoTitle').textContent=info.title;$('gameInfoDescription').textContent=info.description;$('gameInfoTips').innerHTML=info.tips.map(x=>'<span>'+esc(x)+'</span>').join('');const m=$('gameInfoModal');m?.classList.remove('hidden');requestAnimationFrame(()=>m?.classList.add('show'))}

function readJSON(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function uuid(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`}
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function toggleFullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}
let assetsPreloaded=false,faceMeshLibPromise=null,xlsxLibPromise=null;
function preloadAssets(){
  if(assetsPreloaded)return;
  assetsPreloaded=true;
  const list=[CFG.capture?.truckAsset,...Object.values(CAPTURE_TRUCK_ASSETS),CFG.memoryBack,CFG.memoryBlank,...(CFG.memoryRequired||[]),...(CFG.capture?.fuel||[]).map(x=>x.src),...(CFG.capture?.nonFuel||[]).map(x=>x.src),...(CFG.memory||[]),...(CFG.catchGas?.good||[]).map(x=>x.src),...(CFG.catchGas?.bad||[]).map(x=>x.src)];
  [...new Set(list.filter(Boolean))].forEach(src=>{const im=new Image();im.decoding='async';im.src=src;imageCache[src]=im});
}
function loadScriptOnce(src,id){
  return new Promise((resolve,reject)=>{
    const existing=document.getElementById(id);
    if(existing){
      if((id==='faceMeshLib'&&window.FaceMesh)||(id==='xlsxLib'&&window.XLSX))resolve();
      else existing.addEventListener('load',resolve,{once:true});
      return;
    }
    const sc=document.createElement('script');sc.id=id;sc.src=src;sc.async=true;sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);
  });
}
function ensureFaceMeshLib(){if(window.FaceMesh)return Promise.resolve();if(!faceMeshLibPromise)faceMeshLibPromise=loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js','faceMeshLib');return faceMeshLibPromise}
function ensureXLSXLib(){if(window.XLSX)return Promise.resolve();if(!xlsxLibPromise)xlsxLibPromise=loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','xlsxLib');return xlsxLibPromise}
function syncHomeBackgroundVideo(play){
  const v=$('homeBgVideo');if(!v)return;
  if(play){
    if(!v.src){v.src=v.dataset.src||'';v.load()}
    const p=v.play();p?.catch?.(()=>{});
  }else v.pause();
}

function hideSplash(){const s=$('splash');if(!s)return;s.classList.add('splash-hide');setTimeout(async()=>{s.remove();try{await fetchRemoteState()}catch{}const authed=sessionStorage.getItem('pertaminaBoothAuth')==='1';if(isSystemPaused()&&!isMasterAdmin())showMaintenance();else if(authed)showApp();else showLogin()},720)}
function showLogin(){syncHomeBackgroundVideo(false);$('maintenanceScreen')?.classList.add('hidden');$('loginScreen')?.classList.remove('hidden');$('appRoot')?.classList.add('hidden');document.body.classList.remove('maintenance-active');resetLoginCopy();setTimeout(()=>$('loginUser')?.focus(),150)}
function showApp(){$('maintenanceScreen')?.classList.add('hidden');$('loginScreen')?.classList.add('hidden');$('appRoot')?.classList.remove('hidden');document.body.classList.remove('maintenance-active');restorePlayerForm();renderWordBank();prepareWordSearch();resetMemory();resetCatchGas();renderLeaderboard();showPage('home');syncMasterAdminUI();startRemoteWatch();setTimeout(()=>syncHomeBackgroundVideo(true),80);setTimeout(preloadAssets,700)}
async function loginOperator(e){
  e?.preventDefault();
  const user=$('loginUser').value.trim().toLowerCase(),pin=$('loginPin').value.trim();
  let state=null;
  try{state=await fetchRemoteState()}catch{}
  const account=(state?.users||getOperatorAccounts()).find(x=>String(x?.user||'').trim().toLowerCase()===user);
  const valid=await verifyRemotePin(pin,account);
  const role=user==='hdrg'?'master':(account?.role||'operator');
  if(valid&&state?.paused&&role!=='master'){
    $('loginError').textContent='System Maintenance aktif. Hanya master admin HDRG yang dapat masuk.';
    $('loginPin').value='';$('loginPin').focus();return false;
  }
  if(valid){
    sessionStorage.setItem('pertaminaBoothAuth','1');sessionStorage.setItem(OPERATOR_USER_KEY,user);
    $('loginError').textContent='';showApp();toast(user==='hdrg'?'Master admin access granted':'Booth access granted');return false;
  }
  $('loginError').textContent='User atau PIN tidak sesuai.';$('loginPin').value='';$('loginPin').focus();return false;
}
function logoutOperator(){if(!confirm('Keluar dari booth operator?'))return;stopAllGames();clearRemoteWatch();githubAdminToken='';sessionStorage.removeItem('pertaminaBoothAuth');sessionStorage.removeItem(OPERATOR_USER_KEY);document.body.classList.remove('master-admin','system-paused-master');if(isSystemPaused())showMaintenance();else showLogin()}

function setNavActive(id){document.querySelectorAll('.nav-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.page===id))}
function showPage(id){if(id==='settings'&&!isMasterAdmin()){toast('Master admin only');id='home'}if(id!==currentPage){if(currentPage==='capture')stopCamera();if(currentPage==='word')stopWordSearch(false);if(currentPage==='memory')stopMemory(false);if(currentPage==='catchgas')stopCatchGas()}currentPage=id;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));setNavActive(id);syncHomeBackgroundVideo(id==='home');if(id==='leaderboard')renderLeaderboard();if(id==='settings')renderAdminSettings();window.scrollTo({top:0,behavior:'smooth'})}
function enterGame(id){preloadAssets();if(id==='capture')resetCapture();if(id==='word')prepareWordSearch();if(id==='memory')resetMemory();if(id==='catchgas')resetCatchGas();showPage(id)}
function openGame(id){if(!ensurePlayer())return;showGameInfo(id)}
function stopAllGames(){stopCamera();stopWordSearch(false);stopMemory(false);stopCatchGas()}

function openAdminSettings(){if(!isMasterAdmin()){toast('Master admin only');return}showPage('settings')}
async function renderAdminSettings(){
  if(!isMasterAdmin())return;
  let state=remoteStateCache;
  if(!state){try{state=await fetchRemoteState()}catch{}}
  const paused=state?.paused===true,status=$('settingsSystemStatus'),btn=$('settingsPauseBtn');
  if(status){status.textContent=paused?'PAUSED':'ACTIVE';status.classList.toggle('paused',paused)}
  if(btn){btn.textContent=paused?'RESUME SYSTEM':'PAUSE SYSTEM';btn.classList.toggle('resume',paused);btn.disabled=!githubAdminToken}
  const connection=$('githubConnectionStatus');
  if(connection&&githubAdminToken){connection.textContent='CONNECTED';connection.classList.add('connected')}
  const list=$('operatorUserList');if(!list)return;
  const accounts=state?.users||[];
  list.innerHTML=accounts.map(a=>{const master=String(a.user).toLowerCase()==='hdrg';return '<div class="operator-user-row"><div><b>'+esc(a.user)+'</b><span>'+(master?'MASTER ADMIN':'OPERATOR')+'</span></div>'+(master?'<em>PROTECTED</em>':'<button type="button" onclick="removeOperatorUser(\''+esc(a.user)+'\')">REMOVE</button>')+'</div>'}).join('');
}
async function changeMasterPin(e){
  e?.preventDefault();if(!isMasterAdmin()){toast('Master admin only');return false}
  if(!githubAdminToken){toast('Hubungkan GitHub token terlebih dahulu');return false}
  const current=$('currentMasterPin')?.value||'',next=$('newMasterPin')?.value||'',confirmPin=$('confirmMasterPin')?.value||'';
  if(!validPin(next)){toast('PIN baru harus 4–8 digit');return false}
  if(next!==confirmPin){toast('Konfirmasi PIN tidak sama');return false}
  try{
    const state=remoteStateCache||await fetchRemoteState(),master=(state.users||[]).find(x=>String(x.user).toLowerCase()==='hdrg');
    if(!await verifyRemotePin(current,master)){toast('Current PIN salah');return false}
    const newAccount=await makeRemoteAccount('hdrg',next,'master');
    await githubCommitRemoteState(nextState=>{const i=nextState.users.findIndex(x=>String(x.user).toLowerCase()==='hdrg');if(i>=0)nextState.users[i]=newAccount;else nextState.users.unshift(newAccount)},'Update HDRG master PIN');
    $('currentMasterPin').value='';$('newMasterPin').value='';$('confirmMasterPin').value='';toast('HDRG PIN berhasil diubah secara global');renderAdminSettings();
  }catch(err){toast(err.message||'Gagal mengubah PIN')}
  return false;
}
async function addOperatorUser(e){
  e?.preventDefault();if(!isMasterAdmin()){toast('Master admin only');return false}
  if(!githubAdminToken){toast('Hubungkan GitHub token terlebih dahulu');return false}
  const name=($('newOperatorName')?.value||'').trim(),pin=$('newOperatorPin')?.value||'',key=name.toLowerCase();
  if(name.length<2){toast('Username minimal 2 karakter');return false}
  if(key==='hdrg'){toast('Username hdrg khusus master admin');return false}
  if(!validPin(pin)){toast('PIN harus 4–8 digit');return false}
  try{
    const account=await makeRemoteAccount(name,pin,'operator');
    await githubCommitRemoteState(state=>{
      if((state.users||[]).some(x=>String(x.user).trim().toLowerCase()===key))throw new Error('Username sudah terdaftar');
      state.users.push(account);
    },'Add booth operator '+name);
    $('newOperatorName').value='';$('newOperatorPin').value='';toast('User baru aktif secara global');renderAdminSettings();
  }catch(err){toast(err.message||'Gagal menambah user')}
  return false;
}
async function removeOperatorUser(name){
  if(!isMasterAdmin())return;
  if(!githubAdminToken){toast('Hubungkan GitHub token terlebih dahulu');return}
  const key=String(name||'').toLowerCase();if(key==='hdrg'){toast('Master admin tidak dapat dihapus');return}
  if(!confirm('Hapus user '+name+' secara global?'))return;
  try{
    await githubCommitRemoteState(state=>{state.users=(state.users||[]).filter(x=>String(x.user).toLowerCase()!==key)},'Remove booth operator '+name);
    toast('User dihapus secara global');renderAdminSettings();
  }catch(err){toast(err.message||'Gagal menghapus user')}
}

function contactMeta(type){return type==='email'?{label:'Email',placeholder:'nama@email.com',inputType:'email'}:type==='phone'?{label:'WhatsApp / Phone',placeholder:'08xx xxxx xxxx',inputType:'tel'}:{label:'Social Media',placeholder:'@username',inputType:'text'}}
function updateContactField(){const meta=contactMeta($('contactType')?.value),input=$('contactValue');if(input){input.placeholder=meta.placeholder;input.type=meta.inputType}}
function getCurrentPlayerId(){return localStorage.getItem(CURRENT_KEY)||''}
function getCurrentPlayer(){const id=getCurrentPlayerId();return readJSON(PLAYERS_KEY,[]).find(p=>p.id===id)||null}
function restorePlayerForm(){const p=getCurrentPlayer();if(!p)return;$('playerName').value=p.name||'';$('contactType').value=p.contactType||'social';$('contactValue').value=p.contactValue||'';updateContactField();$('playerStatus').textContent=`Saved • ${p.name}`;$('playerStatus').classList.add('saved')}
function collectPlayerForm(){return{name:$('playerName').value.trim(),contactType:$('contactType').value,contactValue:$('contactValue').value.trim()}}
function validatePlayer(data){if(!data.name){toast('Masukkan nama player terlebih dahulu');$('playerName').focus();return false}if(!data.contactValue){toast('Masukkan detail kontak player');$('contactValue').focus();return false}if(data.contactType==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactValue)){toast('Format email belum sesuai');$('contactValue').focus();return false}return true}
function registerPlayer(){const data=collectPlayerForm();if(!validatePlayer(data))return false;const players=readJSON(PLAYERS_KEY,[]),current=getCurrentPlayerId(),now=new Date().toISOString();let p=players.find(x=>x.id===current);if(p)Object.assign(p,data,{updatedAt:now});else{p={id:uuid(),...data,createdAt:now,updatedAt:now};players.push(p);localStorage.setItem(CURRENT_KEY,p.id)}writeJSON(PLAYERS_KEY,players);$('playerStatus').textContent=`Saved • ${p.name}`;$('playerStatus').classList.add('saved');toast('Player data tersimpan');renderLeaderboard();return true}
function ensurePlayer(){const data=collectPlayerForm();if(!validatePlayer(data))return false;const p=getCurrentPlayer();if(!p||p.name!==data.name||p.contactType!==data.contactType||p.contactValue!==data.contactValue)return registerPlayer();return true}
function newPlayer(){localStorage.removeItem(CURRENT_KEY);$('playerName').value='';$('contactType').value='social';$('contactValue').value='';updateContactField();$('playerStatus').textContent='Belum tersimpan';$('playerStatus').classList.remove('saved');$('playerName').focus();toast('Ready for new player')}
function saveScore(game,score){if(!ensurePlayer())return;const p=getCurrentPlayer(),scores=readJSON(SCORES_KEY,[]);scores.push({id:uuid(),playerId:p.id,name:p.name,contactType:p.contactType,contactValue:p.contactValue,game,score:Math.max(0,Math.round(score||0)),timestamp:new Date().toISOString()});writeJSON(SCORES_KEY,scores);renderLeaderboard()}

/* CAPTURE ENERGY */
const capture={running:false,score:0,time:45,combo:1,objects:[],timer:null,raf:0,lastSpawn:0,roadOffset:0,targetLane:1,truckLane:1,faceX:.5,w:0,h:0,ctx:null};
function updateCaptureHud(){const lane=['LEFT','CENTER','RIGHT'][capture.targetLane]||'CENTER';$('captureTime').textContent=capture.time;$('captureLane').textContent=lane;$('captureScore').textContent=pad(capture.score);$('captureCombo').textContent='x'+Math.max(1,Math.round(capture.combo));$('captureTimeFocus').textContent=`${capture.time}s`;$('captureLaneFocus').textContent=lane;$('captureScoreFocus').textContent=pad(capture.score);$('captureMeter').style.width=`${Math.max(0,capture.time/(CFG.capture?.duration||45)*100)}%`}
function resetCapture(){clearInterval(capture.timer);cancelAnimationFrame(capture.raf);Object.assign(capture,{running:false,score:0,time:CFG.capture?.duration||45,combo:1,objects:[],lastSpawn:0,roadOffset:0,targetLane:1,truckLane:1,faceX:.5});$('trackingState').textContent='STANDBY';$('cameraPrompt').classList.remove('hidden');$('captureResult').classList.add('hidden');updateCaptureHud();requestAnimationFrame(resizeCapture)}
function enterCaptureFocus(){document.body.classList.add('capture-focus');const stage=$('captureStage');if(stage&&!document.fullscreenElement){try{const p=stage.requestFullscreen?.();p?.catch?.(()=>{})}catch{}}requestAnimationFrame(resizeCapture)}
async function exitCaptureFocus(){document.body.classList.remove('capture-focus');if(document.fullscreenElement){try{await document.exitFullscreen?.()}catch{}}setTimeout(resizeCapture,80)}
async function enableCamera(){
  if(!ensurePlayer())return;
  enterCaptureFocus();
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable');
    $('trackingState').textContent='LOADING TRACKER';
    await ensureFaceMeshLib();
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    $('webcam').srcObject=stream;await $('webcam').play();initFaceMesh();$('cameraPrompt').classList.add('hidden');await countdown(3);startCaptureRound();
  }catch(err){
    $('trackingState').textContent='CAMERA ERROR';await exitCaptureFocus();toast('Kamera/tracker tidak dapat digunakan. Periksa koneksi, camera permission, dan HTTPS.');
  }
}
function countdown(n){return new Promise(resolve=>{let i=n;const tick=()=>{if(i<=0){$('captureCountdown').textContent='';resolve();return}$('captureCountdown').textContent=i--;setTimeout(tick,700)};tick()})}
function initFaceMesh(){if(faceMesh||!window.FaceMesh)return;faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});faceMesh.setOptions({maxNumFaces:1,refineLandmarks:false,minDetectionConfidence:.55,minTrackingConfidence:.55});faceMesh.onResults(onFaceResults)}
async function processFaceFrame(){if(!capture.running||!stream||!faceMesh)return;if(!faceLoopBusy){faceLoopBusy=true;try{await faceMesh.send({image:$('webcam')})}catch{}faceLoopBusy=false}if(capture.running)requestAnimationFrame(processFaceFrame)}
function onFaceResults(res){if(!capture.running)return;if(!res.multiFaceLandmarks?.length){$('trackingState').textContent='SEARCHING';return}const raw=1-res.multiFaceLandmarks[0][1].x;capture.faceX+=(raw-capture.faceX)*.12;capture.targetLane=capture.faceX<.37?0:capture.faceX>.63?2:1;const lane=['LEFT','CENTER','RIGHT'][capture.targetLane];$('trackingState').textContent=`TRACKING • ${lane}`;updateCaptureHud()}
function startCaptureRound(){capture.running=true;capture.time=CFG.capture?.duration||45;$('trackingState').textContent='SEARCHING';resizeCapture();processFaceFrame();capture.timer=setInterval(()=>{if(!capture.running)return;capture.time--;capture.combo=Math.max(1,capture.combo-.06);updateCaptureHud();if(capture.time<=0)endCapture()},1000);capture.raf=requestAnimationFrame(captureLoop)}
function resizeCapture(){const c=$('captureCanvas');if(!c)return;const r=c.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*d));c.height=Math.max(1,Math.round(r.height*d));capture.ctx=c.getContext('2d');capture.ctx.setTransform(d,0,0,d,0,0);capture.w=r.width;capture.h=r.height}
function roadGeometry(w,h){return{cx:w/2,topW:Math.min(w*.42,520),bottomW:Math.min(w*.9,1050)}}
function laneWidthAt(road,t){return(road.topW+(road.bottomW-road.topW)*t)/3}
function laneX(road,lane,t){const width=road.topW+(road.bottomW-road.topW)*t,left=road.cx-width/2;return left+width*((lane+.5)/3)}
function boundaryX(road,boundary,t){const width=road.topW+(road.bottomW-road.topW)*t,left=road.cx-width/2;return left+width*(boundary/3)}
function drawRoad(ctx,w,h){const r=roadGeometry(w,h),topL=r.cx-r.topW/2,topR=r.cx+r.topW/2,botL=r.cx-r.bottomW/2,botR=r.cx+r.bottomW/2;ctx.fillStyle='#101113';ctx.fillRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#35373a');g.addColorStop(.55,'#25272a');g.addColorStop(1,'#17191b');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(topL,0);ctx.lineTo(topR,0);ctx.lineTo(botR,h);ctx.lineTo(botL,h);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.64)';ctx.lineWidth=1.5;for(let b=1;b<=2;b++){ctx.beginPath();ctx.moveTo(boundaryX(r,b,0),0);ctx.lineTo(boundaryX(r,b,1),h);ctx.stroke()}capture.roadOffset=(capture.roadOffset+.013)%1;for(let lane=0;lane<3;lane++){for(let k=0;k<8;k++){const t=((k/8)+capture.roadOffset)%1,x=laneX(r,lane,t),y=t*h,l=7+20*t;ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x-1,y,2,l)}}const l=capture.targetLane;ctx.fillStyle='rgba(0,112,186,.10)';ctx.beginPath();ctx.moveTo(boundaryX(r,l,.7),h*.7);ctx.lineTo(boundaryX(r,l+1,.7),h*.7);ctx.lineTo(boundaryX(r,l+1,1),h);ctx.lineTo(boundaryX(r,l,1),h);ctx.closePath();ctx.fill();return r}
function spawnWave(){const fuel=CFG.capture?.fuel||[],bad=CFG.capture?.nonFuel||[];if(!fuel.length&&!bad.length)return;const badChance=bad.length?(CFG.capture?.nonFuelChance??.34):0,lanes=shuffle([0,1,2]),count=Math.random()<.72?2:1;for(let i=0;i<count;i++){const isBad=Math.random()<badChance,pool=isBad?bad:fuel,item=pool[Math.floor(Math.random()*pool.length)];if(!item)continue;capture.objects.push({lane:lanes[i],y:-.08,speed:.0037+Math.random()*.0012,item,bad:isBad,rot:(Math.random()-.5)*.035})}}
function drawGameObject(ctx,o,road){o.y+=o.speed;const t=Math.max(0,Math.min(1,o.y)),x=laneX(road,o.lane,t),y=o.y*capture.h,im=imageCache[o.item.src],laneW=laneWidthAt(road,t),maxW=laneW*.54,maxH=30+30*t;let w=maxW*.72,h=maxH;if(im?.naturalWidth){const ratio=im.naturalWidth/im.naturalHeight;w=Math.min(maxW,maxH*ratio);h=w/ratio}ctx.save();ctx.translate(x,y);ctx.rotate(o.rot);ctx.shadowColor=o.bad?'rgba(214,25,31,.42)':'rgba(187,215,96,.4)';ctx.shadowBlur=8+8*t;if(im?.complete&&im.naturalWidth)ctx.drawImage(im,-w/2,-h/2,w,h);else{ctx.fillStyle=o.bad?'#D6191F':'#BBD760';ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.35,0,Math.PI*2);ctx.fill()}ctx.restore();return{x,y,w,h}}
function captureTruckAsset(){
  if(capture.truckLane<.66)return CAPTURE_TRUCK_ASSETS.left;
  if(capture.truckLane>1.34)return CAPTURE_TRUCK_ASSETS.right;
  return CAPTURE_TRUCK_ASSETS.center;
}
function drawTruck(ctx,road){
  const t=.93;
  capture.truckLane+=(capture.targetLane-capture.truckLane)*.095;
  const sprite=captureTruckAsset();
  const im=imageCache[sprite]||imageCache[CAPTURE_TRUCK_ASSETS.center]||imageCache[CFG.capture?.truckAsset];
  const x=laneX(road,capture.truckLane,t),laneW=laneWidthAt(road,t);
  const centerScale=sprite===CAPTURE_TRUCK_ASSETS.center?.82:1;
  const truckW=Math.min(300,laneW*.90)*centerScale*.70;
  const ratio=im?.naturalWidth?im.naturalHeight/im.naturalWidth:.72;
  const truckH=truckW*ratio;
  const now=performance.now();
  const vibrationX=Math.sin(now*.038)*1.15+Math.sin(now*.071)*.55;
  const vibrationY=Math.sin(now*.052)*1.9+Math.sin(now*.093)*.65;
  const vibrationRot=Math.sin(now*.044)*.0042;
  const drawX=x+vibrationX,drawY=capture.h-truckH-2+vibrationY;
  ctx.save();
  ctx.translate(drawX,drawY+truckH*.5);
  ctx.rotate(vibrationRot);
  ctx.shadowColor='rgba(0,0,0,.70)';
  ctx.shadowBlur=28;
  ctx.shadowOffsetY=12;
  if(im?.complete&&im.naturalWidth)ctx.drawImage(im,-truckW/2,-truckH*.5,truckW,truckH);
  else{ctx.fillStyle='#0070BA';ctx.fillRect(-truckW/2,-truckH*.5,truckW,truckH)}
  ctx.restore();
  return{x,y:capture.h-truckH*.5-2,w:truckW,h:truckH,lane:capture.truckLane}
}
function captureLoop(ts){if(!capture.running)return;const ctx=capture.ctx;if(!ctx){resizeCapture();capture.raf=requestAnimationFrame(captureLoop);return}ctx.clearRect(0,0,capture.w,capture.h);const road=drawRoad(ctx,capture.w,capture.h);if(!capture.lastSpawn||ts-capture.lastSpawn>(CFG.capture?.spawnEvery||880)){spawnWave();capture.lastSpawn=ts}const truck=drawTruck(ctx,road);for(let i=capture.objects.length-1;i>=0;i--){const o=capture.objects[i],p=drawGameObject(ctx,o,road),sameLane=Math.abs(o.lane-truck.lane)<.43,hit=sameLane&&o.y>.82&&o.y<1.03&&Math.abs(p.x-truck.x)<Math.max(24,truck.w*.42);if(hit){collectCapture(o);capture.objects.splice(i,1)}else if(o.y>1.1)capture.objects.splice(i,1)}capture.raf=requestAnimationFrame(captureLoop)}
function collectCapture(o){const points=Number(o.item.points)||0;if(o.bad){capture.score=Math.max(0,capture.score+points);capture.combo=1;navigator.vibrate?.([30,20,30])}else{capture.score+=Math.round(points*Math.max(1,capture.combo));capture.combo=Math.min(7,capture.combo+.45)}updateCaptureHud();const f=$('hitFlash');f.className=`hit-flash ${o.bad?'bad':'good'}`;setTimeout(()=>f.className='hit-flash',220)}
function stopCameraStream(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}if($('webcam'))$('webcam').srcObject=null}
async function endCapture(){if(!capture.running)return;capture.running=false;clearInterval(capture.timer);cancelAnimationFrame(capture.raf);stopCameraStream();saveScore('Capture Energy',capture.score);$('captureResultScore').textContent=pad(capture.score);$('captureResultText').textContent=capture.score>=350?'OUTSTANDING JOURNEY!':capture.score>=180?'GREAT DRIVE — KEEP THE ENERGY MOVING.':'GOOD RUN — TRY ANOTHER ROUND.';await exitCaptureFocus();$('captureResult').classList.remove('hidden')}
async function stopCamera(){capture.running=false;clearInterval(capture.timer);cancelAnimationFrame(capture.raf);stopCameraStream();await exitCaptureFocus()}
async function restartCapture(){await stopCamera();resetCapture();enableCamera()}
window.addEventListener('resize',()=>{if(currentPage==='capture')resizeCapture()});
document.addEventListener('fullscreenchange',()=>setTimeout(resizeCapture,80));

/* ENERGY WORD — touch / cursor drag word search */
const word={running:false,size:12,time:120,score:0,found:new Set(),grid:[],targets:[],placements:[],timer:null,selecting:false,startIndex:null,currentPath:[]};
function getWordBank(){const defaults=CFG.wordSearch?.defaultWords||['PERTAMINA','ENERGI','PATRA','NIAGA'],custom=readJSON(WORDS_KEY,[]);return [...new Set([...defaults,...custom].map(x=>String(x).toUpperCase().replace(/[^A-Z]/g,'')).filter(x=>x.length>=3&&x.length<=16))]}
function renderWordBank(){const custom=readJSON(WORDS_KEY,[]),el=$('wordBankList');if(!el)return;el.innerHTML=custom.length?custom.map(w=>`<span>${esc(w)}<button onclick="removeCustomWord('${esc(w)}')" aria-label="Remove ${esc(w)}">×</button></span>`).join(''):'<small>Belum ada kata tambahan.</small>'}
function addCustomWord(){const input=$('customWordInput'),value=input.value.toUpperCase().replace(/[^A-Z]/g,'');if(value.length<3){toast('Minimal 3 huruf');return}const list=readJSON(WORDS_KEY,[]);if(!list.includes(value))list.push(value);writeJSON(WORDS_KEY,list);input.value='';renderWordBank();prepareWordSearch();toast('Kata ditambahkan')}
function removeCustomWord(value){writeJSON(WORDS_KEY,readJSON(WORDS_KEY,[]).filter(x=>x!==value));renderWordBank();prepareWordSearch()}
function buildWordSearch(){const size=CFG.wordSearch?.size||12,board=Array.from({length:size},()=>Array(size).fill('')),dirs=[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]],pool=shuffle(getWordBank()).sort((a,b)=>b.length-a.length),max=CFG.wordSearch?.maxWords||6,placements=[];for(const text of pool){if(placements.length>=max)break;let placed=null;for(let a=0;a<240&&!placed;a++){const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)],r=Math.floor(Math.random()*size),c=Math.floor(Math.random()*size),er=r+dr*(text.length-1),ec=c+dc*(text.length-1);if(er<0||er>=size||ec<0||ec>=size)continue;let ok=true;for(let i=0;i<text.length;i++){const ch=board[r+dr*i][c+dc*i];if(ch&&ch!==text[i]){ok=false;break}}if(!ok)continue;const cells=[];for(let i=0;i<text.length;i++){const rr=r+dr*i,cc=c+dc*i;board[rr][cc]=text[i];cells.push(rr*size+cc)}placed={word:text,cells};}if(placed)placements.push(placed)}const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!board[r][c])board[r][c]=letters[Math.floor(Math.random()*letters.length)];return{size,grid:board.flat(),placements}}
function prepareWordSearch(){stopWordSearch(false);const built=buildWordSearch();Object.assign(word,{running:false,size:built.size,time:CFG.wordSearch?.duration||120,score:0,found:new Set(),grid:built.grid,targets:built.placements.map(x=>x.word),placements:built.placements,selecting:false,startIndex:null,currentPath:[]});renderWordSearch();$('wordStart').disabled=false;$('wordStart').textContent='START GAME';$('wordFeedback').textContent='Tekan START GAME untuk memulai.'}
function renderWordSearch(){const grid=$('wordGrid');grid.style.setProperty('--grid-size',word.size);grid.innerHTML=word.grid.map((ch,i)=>`<button class="word-cell" data-index="${i}" type="button" aria-label="${ch}">${ch}</button>`).join('');$('wordList').innerHTML=word.targets.map(w=>`<span data-word="${w}">${w}</span>`).join('');$('wordScore').textContent=word.score;$('wordTime').textContent=`${word.time}s`;$('wordFound').textContent=word.found.size;bindWordPointer()}
function startWordSearch(){if(!ensurePlayer())return;prepareWordSearch();word.running=true;$('wordStart').disabled=true;$('wordStart').textContent='PLAYING';$('wordFeedback').textContent='Drag dari huruf pertama ke huruf terakhir.';word.timer=setInterval(()=>{word.time--;$('wordTime').textContent=`${word.time}s`;if(word.time<=0)finishWordSearch(false)},1000)}
function cellIndexFromPoint(x,y){const el=document.elementFromPoint(x,y)?.closest?.('.word-cell');return el?Number(el.dataset.index):null}
function pathBetween(a,b){if(a==null||b==null)return[];const ar=Math.floor(a/word.size),ac=a%word.size,br=Math.floor(b/word.size),bc=b%word.size,rd=br-ar,cd=bc-ac;if(!(rd===0||cd===0||Math.abs(rd)===Math.abs(cd)))return[];const sr=Math.sign(rd),sc=Math.sign(cd),steps=Math.max(Math.abs(rd),Math.abs(cd)),out=[];for(let i=0;i<=steps;i++)out.push((ar+sr*i)*word.size+(ac+sc*i));return out}
function paintWordSelection(path){document.querySelectorAll('.word-cell.selecting').forEach(x=>x.classList.remove('selecting'));path.forEach(i=>document.querySelector(`.word-cell[data-index="${i}"]`)?.classList.add('selecting'))}
function bindWordPointer(){const grid=$('wordGrid');grid.onpointerdown=e=>{if(!word.running)return;const idx=Number(e.target.closest?.('.word-cell')?.dataset.index);if(!Number.isFinite(idx))return;e.preventDefault();word.selecting=true;word.startIndex=idx;word.currentPath=[idx];grid.setPointerCapture?.(e.pointerId);paintWordSelection(word.currentPath)};grid.onpointermove=e=>{if(!word.running||!word.selecting)return;const idx=cellIndexFromPoint(e.clientX,e.clientY);if(idx==null)return;const path=pathBetween(word.startIndex,idx);if(path.length){word.currentPath=path;paintWordSelection(path)}};const end=e=>{if(!word.selecting)return;word.selecting=false;checkWordSelection(word.currentPath);word.currentPath=[];paintWordSelection([]);try{grid.releasePointerCapture?.(e.pointerId)}catch{}};grid.onpointerup=end;grid.onpointercancel=end}
function sameCells(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i])}
function checkWordSelection(path){if(!word.running||!path.length)return;const text=path.map(i=>word.grid[i]).join(''),rev=[...path].reverse();const hit=word.placements.find(p=>!word.found.has(p.word)&&(sameCells(path,p.cells)||sameCells(rev,p.cells))&&(text===p.word||text.split('').reverse().join('')===p.word));if(!hit){$('wordFeedback').textContent=`"${text}" belum cocok. Coba lagi.`;return}word.found.add(hit.word);hit.cells.forEach(i=>document.querySelector(`.word-cell[data-index="${i}"]`)?.classList.add('found'));document.querySelector(`[data-word="${hit.word}"]`)?.classList.add('found');word.score+=100+Math.max(0,Math.round(word.time/6));$('wordScore').textContent=word.score;$('wordFound').textContent=word.found.size;$('wordFeedback').textContent=`${hit.word} ditemukan!`;if(word.found.size===word.targets.length)finishWordSearch(true)}
function revealMissingWords(){word.placements.forEach(p=>{if(word.found.has(p.word))return;p.cells.forEach(i=>document.querySelector(`.word-cell[data-index="${i}"]`)?.classList.add('revealed'));document.querySelector(`[data-word="${p.word}"]`)?.classList.add('revealed')})}
function finishWordSearch(completed){if(!word.running)return;word.running=false;clearInterval(word.timer);$('wordStart').disabled=false;$('wordStart').textContent='PLAY AGAIN';if(completed){word.score+=word.time*4;$('wordScore').textContent=word.score;$('wordFeedback').textContent='SEMUA KATA DITEMUKAN — GREAT JOB!'}else{revealMissingWords();$('wordFeedback').textContent='TIME UP — lokasi kata yang belum ditemukan sekarang ditampilkan.'}saveScore('Energy Word',word.score)}
function stopWordSearch(reset=false){clearInterval(word.timer);word.running=false;word.selecting=false;if(reset)prepareWordSearch()}

/* ENERGY MEMORY */
const memory={running:false,cards:[],roundBase:[],first:null,lock:false,moves:0,matches:0,time:60,timer:null};
function memoryCardMarkup(src,i){
  return `<button class="memory-card-btn" data-i="${i}" onclick="flipCard(${i})"><span class="memory-card-inner"><span class="memory-face memory-cover"><img class="memory-cover-art" src="${CFG.memoryBack}" alt="Card Cover"></span><span class="memory-face memory-product"><img class="memory-blank-bg" src="${CFG.memoryBlank}" alt=""><img class="memory-object" src="${src}" alt="Memory object"></span></span></button>`;
}
function selectMemoryPairs(){
  const required=[...(CFG.memoryRequired||[])],pool=shuffle(CFG.memory||[]),count=Math.max(1,CFG.memoryPairCount||6),need=Math.max(0,count-required.length);
  return [...required,...pool.slice(0,need)].slice(0,count);
}
function resetMemory(){
  stopMemory(false);
  const base=selectMemoryPairs();
  Object.assign(memory,{running:false,roundBase:base,cards:shuffle([...base,...base]),first:null,lock:false,moves:0,matches:0,time:60});
  $('memoryMoves').textContent='00';$('memoryMatches').textContent='0';$('memoryTime').textContent='60';
  $('memoryBoard').innerHTML=memory.cards.map(memoryCardMarkup).join('');
  $('memoryResult').classList.add('hidden');$('memoryResult').innerHTML='';$('memoryStart').disabled=false;$('memoryStart').textContent='START GAME';
}
function startMemory(){if(!ensurePlayer())return;resetMemory();memory.running=true;$('memoryStart').disabled=true;$('memoryStart').textContent='PLAYING';memory.timer=setInterval(()=>{memory.time--;$('memoryTime').textContent=memory.time;if(memory.time<=0)finishMemory(false)},1000)}
function flipCard(i){
  if(!memory.running||memory.lock)return;
  const el=document.querySelector(`.memory-card-btn[data-i="${i}"]`);if(!el||el.classList.contains('flipped')||el.classList.contains('matched'))return;
  el.classList.add('flipped');
  if(memory.first===null){memory.first=i;return}
  const j=memory.first;memory.first=null;memory.moves++;$('memoryMoves').textContent=String(memory.moves).padStart(2,'0');
  const prev=document.querySelector(`.memory-card-btn[data-i="${j}"]`);
  if(memory.cards[i]===memory.cards[j]){
    el.classList.add('matched');prev?.classList.add('matched');memory.matches++;$('memoryMatches').textContent=memory.matches;
    if(memory.matches===memory.roundBase.length)finishMemory(true);
  }else{
    memory.lock=true;setTimeout(()=>{el.classList.remove('flipped');prev?.classList.remove('flipped');memory.lock=false},650);
  }
}
function finishMemory(completed){
  if(!memory.running)return;memory.running=false;clearInterval(memory.timer);
  const base=memory.roundBase.length||CFG.memoryPairCount||6,score=Math.max(0,memory.matches*100+memory.time*4-Math.max(0,memory.moves-base)*5);
  saveScore('Energy Memory',score);$('memoryStart').disabled=false;$('memoryStart').textContent='PLAY AGAIN';
  $('memoryResult').classList.remove('hidden');$('memoryResult').innerHTML=`<b>${completed?'ALL PAIRS FOUND':'TIME UP'}</b><span>SCORE ${score}</span>`;
}
function stopMemory(){clearInterval(memory.timer);memory.running=false}

/* CATCH THE GAS — touchscreen + mouse reaction game */
const catchGas={running:false,time:30,score:0,combo:1,timer:null,spawnTimer:null,wave:0};

function updateCatchGasHud(){
  if($('catchGasTime'))$('catchGasTime').textContent=catchGas.time;
  if($('catchGasScore'))$('catchGasScore').textContent=pad(catchGas.score);
  if($('catchGasCombo'))$('catchGasCombo').textContent='x'+Math.max(1,Math.round(catchGas.combo));
}

function buildCatchGasBoard(){
  const board=$('catchGasBoard');if(!board)return;
  board.innerHTML=Array.from({length:12},(_,i)=>`<button class="catchgas-slot" type="button" data-slot="${i}" aria-label="Game slot ${i+1}"><span class="catchgas-slot-ring"></span></button>`).join('');
  board.querySelectorAll('.catchgas-slot').forEach(slot=>{
    slot.addEventListener('pointerdown',e=>{e.preventDefault();hitCatchGas(slot,e)});
  });
}

function clearCatchGasSlots(){
  document.querySelectorAll('.catchgas-slot').forEach(slot=>{
    slot.classList.remove('live','hit','miss');
    slot.removeAttribute('data-good');slot.removeAttribute('data-points');slot.removeAttribute('data-label');
    slot.innerHTML='<span class="catchgas-slot-ring"></span>';
  });
}

function resetCatchGas(){
  stopCatchGas();
  Object.assign(catchGas,{running:false,time:CFG.catchGas?.duration||30,score:0,combo:1,wave:0});
  buildCatchGasBoard();clearCatchGasSlots();updateCatchGasHud();
  $('catchGasIntro')?.classList.remove('hidden');
  $('catchGasResult')?.classList.add('hidden');
  if($('catchGasStart')){$('catchGasStart').disabled=false;$('catchGasStart').textContent='START GAME'}
}

function catchGasInterval(){
  const duration=CFG.catchGas?.duration||30,progress=1-Math.max(0,catchGas.time)/duration;
  const start=CFG.catchGas?.spawnEveryStart||820,end=CFG.catchGas?.spawnEveryEnd||390;
  return Math.round(start+(end-start)*progress);
}

function spawnCatchGasWave(){
  if(!catchGas.running)return;
  clearCatchGasSlots();
  const good=CFG.catchGas?.good||[],bad=CFG.catchGas?.bad||[];
  if(!good.length)return;
  const slots=shuffle([...document.querySelectorAll('.catchgas-slot')]);
  const duration=CFG.catchGas?.duration||30,progress=1-Math.max(0,catchGas.time)/duration;
  const min=CFG.catchGas?.activeMin||2,max=CFG.catchGas?.activeMax||5;
  const count=Math.min(slots.length,Math.max(min,Math.round(min+(max-min)*progress)));
  for(let i=0;i<count;i++){
    const isGood=Math.random()<.62||!bad.length,pool=isGood?good:bad,item=pool[Math.floor(Math.random()*pool.length)],slot=slots[i];
    if(!item)continue;
    slot.dataset.good=isGood?'1':'0';slot.dataset.points=String(item.points||0);slot.dataset.label=item.label||'';
    slot.classList.add('live');
    slot.innerHTML=`<span class="catchgas-slot-ring"></span><img src="${item.src}" alt="${esc(item.label||'Game item')}">`;
  }
  catchGas.wave++;
  clearTimeout(catchGas.spawnTimer);
  catchGas.spawnTimer=setTimeout(spawnCatchGasWave,catchGasInterval());
}

function showCatchGasFx(slot,good,points,label){
  const layer=$('catchGasFxLayer'),stage=$('catchGasStage');if(!layer||!stage)return;
  const sr=stage.getBoundingClientRect(),r=slot.getBoundingClientRect(),fx=document.createElement('div');
  fx.className=`catchgas-score-fx ${good?'good':'bad'}`;
  fx.style.left=`${r.left-sr.left+r.width/2}px`;fx.style.top=`${r.top-sr.top+r.height/2}px`;
  fx.innerHTML=`<b>${good?'+':''}${points}</b><span>${good?'GAS CAPTURED':'WRONG PRODUCT'} • ${esc(label)}</span>`;
  layer.appendChild(fx);setTimeout(()=>fx.remove(),850);
  stage.classList.remove('catch-good','catch-bad');void stage.offsetWidth;stage.classList.add(good?'catch-good':'catch-bad');
  setTimeout(()=>stage.classList.remove('catch-good','catch-bad'),280);
}

function hitCatchGas(slot){
  if(!catchGas.running||!slot.classList.contains('live')||slot.classList.contains('hit'))return;
  const good=slot.dataset.good==='1',raw=Number(slot.dataset.points)||0,label=slot.dataset.label||'';
  slot.classList.add('hit',good?'good':'bad');slot.classList.remove('live');
  if(good){
    const gained=Math.round(Math.abs(raw)*Math.max(1,catchGas.combo));
    catchGas.score+=gained;catchGas.combo=Math.min(6,catchGas.combo+.35);
    showCatchGasFx(slot,true,gained,label);navigator.vibrate?.(20);
  }else{
    const lost=Math.abs(raw);
    catchGas.score=Math.max(0,catchGas.score-lost);catchGas.combo=1;
    showCatchGasFx(slot,false,-lost,label);navigator.vibrate?.([35,25,35]);
  }
  updateCatchGasHud();
  setTimeout(()=>{slot.classList.remove('hit','good','bad');slot.innerHTML='<span class="catchgas-slot-ring"></span>'},360);
}

function startCatchGas(){
  if(!ensurePlayer())return;
  resetCatchGas();catchGas.running=true;
  $('catchGasIntro')?.classList.add('hidden');$('catchGasResult')?.classList.add('hidden');
  if($('catchGasStart')){$('catchGasStart').disabled=true;$('catchGasStart').textContent='PLAYING'}
  spawnCatchGasWave();
  catchGas.timer=setInterval(()=>{
    if(!catchGas.running)return;
    catchGas.time--;catchGas.combo=Math.max(1,catchGas.combo-.04);updateCatchGasHud();
    if(catchGas.time<=0)finishCatchGas();
  },1000);
}

function finishCatchGas(){
  if(!catchGas.running)return;
  catchGas.running=false;clearInterval(catchGas.timer);clearTimeout(catchGas.spawnTimer);clearCatchGasSlots();
  saveScore('Catch The Gas',catchGas.score);
  const p=getCurrentPlayer();
  if($('catchGasPlayer'))$('catchGasPlayer').textContent=p?.name||$('playerName')?.value||'PLAYER';
  if($('catchGasResultScore'))$('catchGasResultScore').textContent=pad(catchGas.score);
  if($('catchGasResultText'))$('catchGasResultText').textContent=catchGas.score>=500?'GAS MASTER — OUTSTANDING REACTION!':catchGas.score>=250?'GREAT CATCH — KEEP THE ENERGY FLOWING.':'GOOD TRY — CATCH MORE GAS NEXT ROUND.';
  $('catchGasResult')?.classList.remove('hidden');
  if($('catchGasStart')){$('catchGasStart').disabled=false;$('catchGasStart').textContent='PLAY AGAIN'}
}

function stopCatchGas(){
  catchGas.running=false;clearInterval(catchGas.timer);clearTimeout(catchGas.spawnTimer);
}

/* LEADERBOARD + EXPORT */
function renderLeaderboard(){const players=readJSON(PLAYERS_KEY,[]),scores=readJSON(SCORES_KEY,[]),best=[...scores].sort((a,b)=>b.score-a.score).slice(0,12);$('playerCount').textContent=players.length;$('scoreCount').textContent=scores.length;$('leaderboardList').innerHTML=best.length?best.map((x,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><div><b>${esc(x.name)}</b><small>${esc(x.game)} • ${esc(contactMeta(x.contactType).label)}</small></div><strong>${x.score}</strong></div>`).join(''):'<div class="empty-state">Belum ada score. Mulai game untuk mengisi leaderboard.</div>'}
function clearLeaderboard(){if(confirm('Hapus semua score pada perangkat ini?')){localStorage.removeItem(SCORES_KEY);renderLeaderboard();toast('Scores dihapus')}}
async function exportPlayerData(){
  const players=readJSON(PLAYERS_KEY,[]),scores=readJSON(SCORES_KEY,[]);
  if(!players.length){toast('Belum ada data player');return}
  try{toast('Menyiapkan file Excel...');await ensureXLSXLib()}catch{toast('Excel library gagal dimuat');return}
  const playerRows=players.map(p=>({'Player ID':p.id,'Name':p.name,'Contact Type':contactMeta(p.contactType).label,'Contact Detail':p.contactValue,'Registered At':p.createdAt,'Updated At':p.updatedAt}));
  const scoreRows=scores.map(r=>({'Player ID':r.playerId,'Name':r.name,'Contact Type':contactMeta(r.contactType).label,'Contact Detail':r.contactValue,'Game':r.game,'Score':r.score,'Played At':r.timestamp}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(playerRows),'Players');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(scoreRows),'Scores');
  const d=new Date(),date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  XLSX.writeFile(wb,'PGN-Booth-Players-'+date+'.xlsx');
}

document.addEventListener('DOMContentLoaded',()=>{
  if(sessionStorage.getItem('pertaminaBoothAuth')==='1'&&!sessionStorage.getItem(OPERATOR_USER_KEY))sessionStorage.setItem(OPERATOR_USER_KEY,'89 pro');
  syncMasterAdminUI();
  $('gameInfoModal')?.addEventListener('click',e=>{if(e.target?.id==='gameInfoModal')closeGameInfo()});
  $('loginForm')?.addEventListener('submit',loginOperator);
  $('customWordInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomWord()}});
  updateContactField();
  setTimeout(hideSplash,CFG.splash?.duration||1800);
});
setTimeout(()=>{if(document.getElementById('splash'))hideSplash()},4500);
