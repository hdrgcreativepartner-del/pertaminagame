(()=>{
  const AUTH_KEY='pertaminaBoothAuth';

  function showBooth(){
    sessionStorage.setItem(AUTH_KEY,'1');
    const error=document.getElementById('loginError');
    if(error) error.textContent='';
    if(typeof window.showApp==='function'){
      window.showApp();
    }else{
      document.getElementById('loginScreen')?.classList.add('hidden');
      document.getElementById('appRoot')?.classList.remove('hidden');
      document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='home'));
    }
    if(typeof window.toast==='function') window.toast('Booth access granted');
  }

  function submitLogin(event){
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation?.();

    const cfg=window.EVENT_CONFIG||{};
    const user=(document.getElementById('loginUser')?.value||'').trim().toLowerCase();
    const pin=(document.getElementById('loginPin')?.value||'').trim();
    const expectedUser=String(cfg.auth?.user||'').trim().toLowerCase();
    const expectedPin=String(cfg.auth?.pin||'').trim();

    if(user===expectedUser&&pin===expectedPin){
      showBooth();
      return false;
    }

    const error=document.getElementById('loginError');
    if(error) error.textContent='User atau PIN tidak sesuai.';
    const pinInput=document.getElementById('loginPin');
    if(pinInput){pinInput.value='';pinInput.focus();}
    return false;
  }

  function install(){
    const form=document.getElementById('loginForm');
    if(!form||form.dataset.loginHardened==='1') return;
    form.dataset.loginHardened='1';
    form.setAttribute('action','javascript:void(0)');
    form.setAttribute('method','post');
    form.addEventListener('submit',submitLogin,true);
    form.onsubmit=submitLogin;
  }

  window.boothLogin=submitLogin;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  setTimeout(install,250);
  setTimeout(install,900);

  window.addEventListener('pageshow',()=>{
    if(sessionStorage.getItem(AUTH_KEY)==='1'&&!document.getElementById('splash')) showBooth();
  });
})();
