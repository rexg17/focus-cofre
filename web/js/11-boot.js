(async function boot(){
  if(HAS_DB){
    try{const r=await fetch('/api/state',{headers:{'X-Cofre-Token':TOKEN}});if(!r.ok)throw new Error(r.status);S=norm(await r.json())}
    catch(e){saveErr='Não foi possível abrir o banco local: '+e.message}
    try{const r2=await fetch('/api/settings',{headers:{'X-Cofre-Token':TOKEN}});if(r2.ok)appSettings=await r2.json()}catch(e){}
  }
  render();
  if(HAS_DB){
    const ping=()=>fetch('/api/ping?t='+encodeURIComponent(TOKEN)).catch(()=>{});
    ping();setInterval(ping,15000);
    addEventListener('pagehide',()=>{try{navigator.sendBeacon('/api/bye?t='+encodeURIComponent(TOKEN))}catch(e){}});
  }
})();
