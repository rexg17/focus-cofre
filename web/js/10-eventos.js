/* ---------- render e eventos ---------- */
const VIEWS={coach:vCoach,resumo:vResumo,trab:vTrabalho,canal:vCanal,pess:vPessoal,caixa:vCaixa,lanc:vLanc,inv:vInv,metas:vMetas,sim:vSim,aj:vAj};
function render(){
  const [y,m]=cur.split('-');
  document.getElementById('monthLabel').textContent=new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  document.getElementById('tabs').innerHTML=TABS.map(([k,l])=>`<button role="tab" data-tab="${k}" aria-selected="${k===tab}">${l}</button>`).join('');
  document.getElementById('banner').innerHTML=bannerHtml();
  document.getElementById('view').innerHTML=VIEWS[tab]();
  if(tab==='lanc'&&editLanc)fillEdit();
  statusBar();
}
const val=id=>document.getElementById(id).value;
const num=id=>{const v=parseFloat(val(id));return isNaN(v)?0:v};
let undoSnap=null,editLanc=null,appSettings={},backups=null,restoreAsk='';
function mutate(f,del){undoSnap=del?JSON.stringify(S):null;f();S.demo=false;save();render()}
function hojeStr(){return cur===mk(now.getFullYear(),now.getMonth())?cur+'-'+pad(now.getDate()):cur+'-01'}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-act],#prev,#next');if(!t||t.tagName==='FORM')return;
  if(t.dataset.tab){tab=t.dataset.tab;return render()}
  if(t.id==='prev'||t.id==='next'){cur=addM(cur,t.id==='next'?1:-1);return render()}
  const id=t.dataset.id;
  switch(t.dataset.act){
    case'clear':S=norm({demo:false});save();flash='';render();break;
    case'retry':flush().then(render);break;
    case'delRenda':mutate(()=>S.renda=S.renda.filter(x=>x.id!==id),true);break;
    case'delLanc':mutate(()=>S.lanc=S.lanc.filter(x=>x.id!==id),true);break;
    case'delSub':mutate(()=>S.subs=S.subs.filter(x=>x.id!==id),true);break;
    case'togSub':mutate(()=>{const s=S.subs.find(x=>x.id===id);if(s.ativa){s.ativa=false;s.pausadaDesde=baseMes()}else{s.ativa=true;s.pausadaDesde=''}});break;
    case'delMeta':mutate(()=>S.metas=S.metas.filter(x=>x.id!==id),true);break;
    case'delAtivo':mutate(()=>S.carteira=S.carteira.filter(x=>x.id!==id),true);break;
    case'undo':if(undoSnap){S=norm(JSON.parse(undoSnap));undoSnap=null;save();render()}break;
    case'editLanc':editLanc=id;render();{const fl=document.getElementById('fLanc');if(fl)fl.scrollIntoView({block:'center'})}break;
    case'cancelEdit':editLanc=null;render();break;
    case'endSerie':mutate(()=>{const x=S.lanc.find(z=>z.id===id);if(x)x.fim=addM(cur,-1)},true);break;
    case'skipDiag':mutate(()=>S.cfg.diagFeito=true);break;
    case'doCheckin':mutate(()=>{const pt=patrimonio(ctxCoach());S.checkins.push({id:uid(),data:hojeISO(),snap:{caixa:r2(pt.caixa),reserva:r2(pt.reserva),mei:r2(pt.mei),carteira:r2(pt.carteira),dividas:r2(pt.dividas),pat:r2(pt.pat)}})});break;
    case'usePrazo':mutate(()=>{S.cfg.prazoReserva=+t.dataset.p;if(+t.dataset.extra>0)S.cfg.metaExtra=Math.max(S.cfg.metaExtra||0,+t.dataset.extra)});break;
    case'copyResumo':{const txt=resumoIA(),ta=document.getElementById('resumoIA');const fb=()=>{ta.select();flash='Selecione e copie o texto (Ctrl+C).';render()};try{navigator.clipboard.writeText(txt).then(()=>{flash='Resumo copiado.';render()},fb)}catch(_){fb()}break}
    case'csvRead':imp.raw=val('csvIn');parseImp();render();break;
    case'csvDo':{const sel=(imp.rows||[]).filter(r=>r.inc),mo=imp.moeda,ct=imp.conta;let msg=sel.length+' lançamento(s) importado(s).';
      mutate(()=>{sel.forEach(r=>S.lanc.push({id:uid(),tipo:r.tipo,desc:r.desc,cat:r.cat,valor:r.valor,data:r.data,rec:false,moeda:mo,cambio:cb(mo),fim:'',conta:ct}));
        const a=S.contas.find(z=>z.id===ct);
        if(a&&imp.map.s>=0){const L=(imp.rows||[]).filter(r=>!isNaN(r.saldo));
          if(L.length){const asc=L[0].data<=L[L.length-1].data,mx=L.map(r=>r.data).sort().pop(),cand=L.filter(r=>r.data===mx),last=asc?cand[cand.length-1]:cand[0];
            if((a.moeda||'EUR')===mo){a.saldo=last.saldo;a.atualizado=last.data;msg+=' Saldo de "'+a.nome+'" atualizado para '+fmtM(last.saldo,mo)+' ('+fmtD(last.data)+').'}
            else msg+=' O saldo não foi atualizado porque a moeda da conta é diferente da do extrato.'}}});
      imp=impFresh();imp.msg=msg;render();break}
    case'chatNew':chat={msgs:[],pend:false,erro:'',aviso:'',ferramentas:[],ultimo:null};render();break;
    case'llmSave':{const corpo={llm_model:val('llmModel')};if(val('llmKey').trim())corpo.llm_key=val('llmKey').trim();
      fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify(corpo)}).then(r=>r.json().then(j=>{if(!r.ok)throw new Error(j.erro||r.status);appSettings=j;flash='Configurações da IA salvas.'})).catch(e=>{flash='Erro: '+e.message}).finally(render);break}
    case'llmRemove':fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify({llm_key:''})}).then(r=>r.json().then(j=>{if(!r.ok)throw new Error(j.erro||r.status);appSettings=j;flash='Chave removida.'})).catch(e=>{flash='Erro: '+e.message}).finally(render);break;
    case'llmTest':flash='Testando…';render();chamarLLM({messages:[{role:'user',content:'Responda apenas com a palavra: ok'}],effort:'low'}).then(j=>{flash='Conexão ok com '+j.model+'.'}).catch(e=>{flash='Erro: '+e.message}).finally(render);break;
    case'listBk':fetch('/api/backups',{headers:{'X-Cofre-Token':TOKEN}}).then(r=>r.json()).then(j=>{backups=j}).catch(()=>{backups=[]}).finally(render);break;
    case'askRestore':restoreAsk=t.dataset.name;render();break;
    case'cancelRestore':restoreAsk='';render();break;
    case'doRestore':fetch('/api/restore',{method:'POST',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify({name:restoreAsk})})
      .then(r=>r.json().then(j=>{if(!r.ok)throw new Error(j.erro||r.status);return fetch('/api/state',{headers:{'X-Cofre-Token':TOKEN}}).then(x=>x.json())}))
      .then(st=>{S=norm(st);flash='Backup restaurado. Uma cópia do estado anterior foi guardada.';restoreAsk=''}).catch(e=>{flash='Erro: '+e.message}).finally(render);break;
    case'selCanal':canalSel=id;render();break;
    case'delCanal':mutate(()=>{S.canais=S.canais.filter(z=>z.id!==id);S.metricas=S.metricas.filter(z=>z.canal!==id);S.receitasCanal=S.receitasCanal.filter(z=>z.canal!==id)},true);canalSel='';break;
    case'delMet':mutate(()=>S.metricas=S.metricas.filter(z=>z.id!==id),true);break;
    case'delRec':mutate(()=>S.receitasCanal=S.receitasCanal.filter(z=>z.id!==id),true);break;
    case'delConta':mutate(()=>S.contas=S.contas.filter(z=>z.id!==id),true);break;
    case'delDiv':mutate(()=>S.dividas=S.dividas.filter(z=>z.id!==id),true);break;
    case'saveBk':fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify({backup_dir:val('bkDir')})}).then(r=>r.json().then(j=>{if(!r.ok)throw new Error(j.erro||r.status);appSettings=j;flash='Pasta de backup salva.'})).catch(e=>{flash='Erro: '+e.message}).finally(render);break;
    case'preset':mutate(()=>S.cfg.taxa=parseFloat(t.dataset.taxa));break;
    case'delProj':mutate(()=>S.projetos=S.projetos.filter(x=>x.id!==id),true);break;
    case'delCat':{const k=t.dataset.cat;if(S.lanc.some(x=>x.cat===k)||S.subs.some(x=>x.cat===k)){flash='Erro: a categoria "'+k+'" está em uso. Mude ou apague os lançamentos antes.';render()}else mutate(()=>{delete S.cfg.cats[k];applyCats(S.cfg)});break}
    case'copyBk':{const ta=document.getElementById('bkOut');const txt=JSON.stringify(S);
      const fb=()=>{ta.select();flash='Selecione e copie o texto acima (Ctrl+C).';render()};
      try{navigator.clipboard.writeText(txt).then(()=>{flash='Backup copiado.';render()},fb)}catch(_){fb()}break}
    case'impBk':{try{const o=JSON.parse(val('bkIn'));if(!o||typeof o!=='object'||!Array.isArray(o.lanc||[]))throw 0;S=norm(o);S.demo=false;save();flash='Backup importado.'}catch(_){flash='Erro: texto de backup inválido.'}render();break}
  }
});
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(f.id==='fRenda')mutate(()=>S.renda.push({id:uid(),nome:val('rn').trim(),cat:val('rc'),valor:num('rv'),moeda:val('rm'),cambio:cb(val('rm')),pagas:+val('rp')===14?14:12}));
  else if(f.id==='fLanc'){const o={tipo:val('lt'),desc:val('ld').trim(),cat:val('lc'),valor:num('lv'),moeda:val('lm'),data:val('ldt'),conta:val('lcta'),rec:document.getElementById('lr').checked};
    if(editLanc){const x=S.lanc.find(y=>y.id===editLanc);editLanc=null;mutate(()=>{const was=x.moeda;Object.assign(x,o);x.cambio=cb(o.moeda)>0?((was===o.moeda&&x.cambio>0)?x.cambio:cb(o.moeda)):0})}
    else mutate(()=>S.lanc.push({id:uid(),...o,cambio:cb(o.moeda),fim:''}))}
  else if(f.id==='fDiag'){const n=id=>{const v=parseFloat(document.getElementById(id).value);return isNaN(v)?0:v},has=id=>document.getElementById(id).value!=='';
    mutate(()=>{
      if(n('dgS')>0&&!S.renda.some(r=>RCATS[r.cat]==='p'))S.renda.push({id:uid(),nome:'Salário líquido',cat:'Salário',valor:n('dgS'),moeda:'EUR',cambio:0,pagas:+val('dgP')===14?14:12});
      if(has('dgC'))S.contas.push({id:uid(),nome:'Conta corrente',tipo:'caixa',moeda:'EUR',saldo:n('dgC'),atualizado:hojeISO()});
      if(has('dgR'))S.contas.push({id:uid(),nome:'Reserva de emergência',tipo:'reserva',moeda:'EUR',saldo:n('dgR'),atualizado:hojeISO()});
      if(n('dgD')>0)S.dividas.push({id:uid(),nome:'Dívida',saldo:n('dgD'),inicial:n('dgD'),juros:n('dgJ'),minimo:n('dgM')});
      if(n('dgE')>0)S.cfg.metaExtra=n('dgE');if(n('dgZ')>0)S.cfg.prazoReserva=Math.round(n('dgZ'));
      S.cfg.diagFeito=true})}
  else if(f.id==='fConta')mutate(()=>S.contas.push({id:uid(),nome:val('cn2').trim(),tipo:val('ct'),moeda:val('cmo'),saldo:num('csd'),atualizado:hojeISO()}));
  else if(f.id==='fMov'){const v=num('mvv'),d=S.contas.find(a=>a.id===val('mvd')),pa=S.contas.find(a=>a.id===val('mvp'));
    if(!d&&!pa)return;if(d&&pa&&d.id===pa.id)return;
    mutate(()=>{if(d){d.saldo-=toMoeda(v,d.moeda);d.atualizado=hojeISO()}if(pa){pa.saldo+=toMoeda(v,pa.moeda);pa.atualizado=hojeISO()}
      S.movs.push({id:uid(),data:hojeISO(),de:d?d.id:'',para:pa?pa.id:'',valor:v,obs:val('mvo').trim()})})}
  else if(f.id==='fDiv')mutate(()=>S.dividas.push({id:uid(),nome:val('vn').trim(),saldo:num('vs'),inicial:num('vs'),juros:num('vj'),minimo:num('vm')}));
  else if(f.dataset.act==='payDiv'){const d=S.dividas.find(z=>z.id===f.dataset.id),v=num('dp'+d.id),cEl=document.getElementById('dc'+d.id),ac=cEl?S.contas.find(z=>z.id===cEl.value):null;
    mutate(()=>{d.saldo=Math.max(0,d.saldo-v);S.lanc.push({id:uid(),tipo:'d',desc:'Pagamento: '+d.nome,cat:'Dívidas e juros',valor:v,data:hojeISO(),rec:false,moeda:'EUR',cambio:0,fim:''});if(ac){ac.saldo-=toMoeda(v,ac.moeda);ac.atualizado=hojeISO()}})}
  else if(f.dataset.act==='updConta'){const a=S.contas.find(z=>z.id===f.dataset.id);mutate(()=>{a.saldo=num('cs'+a.id);a.atualizado=hojeISO()})}
  else if(f.id==='fSub')mutate(()=>S.subs.push({id:uid(),nome:val('sn').trim(),cat:val('sc'),valor:num('sv'),moeda:val('sm'),cambio:cb(val('sm')),dia:num('sd')||1,ativa:true,desde:cur,horas:0}));
  else if(f.id==='fProj')mutate(()=>S.projetos.push({id:uid(),cliente:val('pc').trim(),desc:val('pd').trim(),valor:num('pv'),moeda:val('pm'),cambio:cb(val('pm')),status:val('ps'),previsto:val('pp'),pago:val('ps')==='pago'?hojeISO():''}));
  else if(f.id==='fCat'){const n=val('cn').trim();if(!n||DCATS[n]){flash=n?'Erro: essa categoria já existe.':'Erro: informe um nome.';render()}else mutate(()=>{S.cfg.cats[n]=val('cg');applyCats(S.cfg);flash='Categoria criada.'})}
  else if(f.id==='fChat'){chatSend(val('chatIn'))}
  else if(f.id==='fCanal')mutate(()=>{const c={id:uid(),nome:val('cvn').trim(),plataforma:val('cvp'),url:val('cvu').trim()};S.canais.push(c);canalSel=c.id});
  else if(f.id==='fMet'){const d={};document.querySelectorAll('[data-mk]').forEach(i=>{if(i.value!=='')d[i.dataset.mk]=parseFloat(i.value)});
    if(!Object.keys(d).length)return;mutate(()=>S.metricas.push({id:uid(),canal:canalSel,data:val('mdt'),dados:d}))}
  else if(f.id==='fRec')mutate(()=>S.receitasCanal.push({id:uid(),canal:canalSel,data:val('rcd'),fonte:val('rcf'),valor:num('rcv'),moeda:val('rcm'),cambio:cb(val('rcm')),obs:val('rco').trim()}));
  else if(f.id==='fMeta')mutate(()=>S.metas.push({id:uid(),nome:val('mn').trim(),alvo:num('ma'),guardado:num('mg'),prazo:val('mp')}));
  else if(f.id==='fAtivo')mutate(()=>{const ap=num('aa'),at=val('av')===''?ap:num('av');S.carteira.push({id:uid(),nome:val('an').trim(),classe:val('acl'),aplicado:ap,atual:at,moeda:val('am')})});
  else if(f.dataset.act==='addMeta'){const g=S.metas.find(x=>x.id===f.dataset.id),v=num('g'+g.id);mutate(()=>g.guardado+=v)}
  else if(f.dataset.act==='updAtivo'){const a=S.carteira.find(x=>x.id===f.dataset.id),ap=num('ap'+a.id),atRaw=val('at'+a.id);
    mutate(()=>{if(ap>0){a.aplicado+=ap;a.atual=atRaw===''?a.atual+ap:parseFloat(atRaw);
        S.lanc.push({id:uid(),tipo:'d',desc:'Aporte: '+a.nome,cat:'Investimento',valor:ap,data:hojeStr(),rec:false,moeda:a.moeda||'EUR',cambio:cb(a.moeda)});const ce=document.getElementById('ad'+a.id),ac=ce?S.contas.find(z=>z.id===ce.value):null;if(ac){ac.saldo-=ap;ac.atualizado=hojeISO()}}
      else if(atRaw!=='')a.atual=parseFloat(atRaw)})}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='lt'){document.getElementById('lc').innerHTML=t.value==='r'?rOpts():optGroups(true)}
  else if(t.id==='flt'){filt=t.value;render()}
  else if(t.id==='perfil'){S.cfg.perfil=t.value;S.demo=false;save();render()}
  else if(t.dataset&&t.dataset.st){const p=S.projetos.find(x=>x.id===t.dataset.st);mutate(()=>{p.status=t.value;p.pago=t.value==='pago'?hojeISO():'';if(t.value==='pago'&&noEur(p))p.cambio=rate(p.moeda)},t.value==='perdido')}
  else if(t.dataset&&t.dataset.hrs!==undefined){const sb=S.subs.find(x=>x.id===t.dataset.hrs);mutate(()=>sb.horas=Math.max(0,parseFloat(t.value)||0))}
  else if(t.dataset&&t.dataset.cfg){const k=t.dataset.cfg;let v=parseFloat(t.value);v=isNaN(v)?0:Math.max(0,v);if(k==='fiscal')v=Math.min(60,v);if(k==='cambio'||k==='cambioUSD')v=Math.max(0.01,v);if(k==='convCusto')v=Math.min(20,v);if(k==='prazoReserva')v=Math.round(v);if(k==='taxaFechamento')v=Math.min(100,Math.max(1,v));if(k==='mesesCaixa')v=Math.min(6,Math.round(v));if(k==='mesesReserva')v=Math.min(36,Math.max(1,Math.round(v)));if(k==='horasMes')v=Math.max(1,v);mutate(()=>S.cfg[k]=v)}
  else if(t.id==='csvFile'&&t.files&&t.files[0]){t.files[0].arrayBuffer().then(buf=>{let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(_){txt=new TextDecoder('windows-1252').decode(buf)}imp.raw=txt;parseImp();render()})}
  else if(t.dataset&&t.dataset.impmap){imp.map[t.dataset.impmap]=+t.value;buildImpRows();render()}
  else if(t.dataset&&t.dataset.impmoeda){imp.moeda=t.value;render()}
  else if(t.dataset&&t.dataset.impconta){imp.conta=t.value;render()}
  else if(t.dataset&&t.dataset.impfmt){imp.fmt=t.value;buildImpRows();render()}
  else if(t.dataset&&t.dataset.impinv){imp.inv=t.checked;buildImpRows();render()}
  else if(t.dataset&&t.dataset.impinc!==undefined){imp.rows[+t.dataset.impinc].inc=t.checked;render()}
  else if(t.dataset&&t.dataset.impcat!==undefined){imp.rows[+t.dataset.impcat].cat=t.value}
  else if(t.dataset&&t.dataset.ese){const v=Math.max(0,parseFloat(t.value)||0);ese[t.dataset.ese]=v;render()}
  else if(t.dataset&&t.dataset.csim){const v=parseFloat(t.value);mutate(()=>{S.cfg.canal.sim[t.dataset.csim]=isNaN(v)?0:Math.max(0,v)})}
  else if(t.dataset&&t.dataset.cklist){mutate(()=>{S.cfg.canal.checklist[t.dataset.cklist]=t.checked})}
  else if(t.dataset&&t.dataset.ccfg){const v=Math.max(1,Math.round(parseFloat(t.value)||1));mutate(()=>{S.cfg.canal[t.dataset.ccfg]=v})}
  else if(t.dataset&&t.dataset.cfgs){mutate(()=>S.cfg[t.dataset.cfgs]=t.value)}
  else if(t.dataset&&t.dataset.regra){const v=Math.min(100,Math.max(0,parseFloat(t.value)||0));mutate(()=>S.cfg.regra[t.dataset.regra]=v)}
  else if(t.dataset&&t.dataset.lim!==undefined){const v=parseFloat(t.value);if(v>0)S.limites[t.dataset.lim]=v;else delete S.limites[t.dataset.lim];S.demo=false;save();render()}
});
document.addEventListener('input',e=>{
  if(!e.target.closest('#fInv'))return;
  const n=(id,d)=>{const v=parseFloat(val(id));return isNaN(v)?d:v};
  S.cfg={...S.cfg,inicial:Math.max(0,n('iI',0)),aporte:Math.max(0,n('iA',0)),taxa:Math.max(0,n('iT',0)),anos:Math.min(50,Math.max(1,Math.round(n('iY',10))))};
  save();const id=e.target.id,pos=e.target.selectionStart;render();
  const el=document.getElementById(id);if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(_){}}
});
