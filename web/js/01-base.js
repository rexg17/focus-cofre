/* ---------- categorias ---------- */
// n = necessidade, d = desejo, w = trabalho (IA e ferramentas), i = investimento
const DCATS={Moradia:'n',Mercado:'n',Transporte:'n','Saúde':'n',Contas:'n','Educação':'n','Dívidas e juros':'n',
  Lazer:'d',Restaurantes:'d',Compras:'d','Assinaturas pessoais':'d',Outros:'d',
  'IA e APIs':'w','Ferramentas e SaaS':'w','Hospedagem e domínio':'w','Anúncios e marketing':'w',Equipamento:'w','Impostos e taxas':'w','Outros do trabalho':'w',
  Investimento:'i'};
const RCATS={'Salário':'p','Clientes e projetos':'w','Rendimentos':'p','Outras rendas':'p'};
const GRUPOS=[['n','Necessidades'],['d','Desejos'],['w','Trabalho: IA e ferramentas'],['i','Investimento']];
const BASE_CATS=new Set(Object.keys(DCATS));
function applyCats(cfg){Object.keys(DCATS).forEach(k=>{if(!BASE_CATS.has(k))delete DCATS[k]});Object.entries((cfg&&cfg.cats)||{}).forEach(([k,v])=>{DCATS[k]=v})}
const CLASSES=['Reserva de emergência','Renda fixa','Fundos indexados','ETFs','Imobiliário','Plano de pensões','Cripto'];
const PERFIS={
  conservador:{nome:'Conservador',alvo:{'Renda fixa':65,'Fundos indexados':20,'ETFs':0,'Imobiliário':5,'Plano de pensões':10,'Cripto':0}},
  moderado:{nome:'Moderado',alvo:{'Renda fixa':35,'Fundos indexados':35,'ETFs':10,'Imobiliário':5,'Plano de pensões':10,'Cripto':5}},
  arrojado:{nome:'Arrojado',alvo:{'Renda fixa':15,'Fundos indexados':40,'ETFs':20,'Imobiliário':10,'Plano de pensões':5,'Cripto':10}}};
const CLASS_HINT={
  'Reserva de emergência':'Cuenta remunerada, depósito a plazo curto ou Letras del Tesoro, com acesso rápido ao dinheiro.',
  'Renda fixa':'Letras del Tesoro e Bonos del Estado (Tesoro Directo) ou depósitos a plazo.',
  'Fundos indexados':'Fundos indexados globais. O traspaso entre fundos em geral não tributa na hora.',
  'ETFs':'ETFs UCITS globais. Vender realiza o ganho e gera imposto.',
  'Imobiliário':'SOCIMIs ou ETFs imobiliários.',
  'Plano de pensões':'Reduz a base do IRPF no ano, mas o limite é baixo e o resgate é restrito.',
  'Cripto':'Risco alto. Ganhos tributam e pode haver obrigação de informar.'};
// Escala de tributação da poupança na Espanha (confirme a vigente)
const ES_AHORRO=[[6000,.19],[50000,.21],[200000,.23],[300000,.27],[Infinity,.28]];
function impostoAhorro(g){
  if(!(g>0))return 0;let prev=0,t=0;
  for(const [lim,r] of ES_AHORRO){const part=Math.min(g,lim)-prev;if(part>0)t+=part*r;prev=lim;if(g<=lim)break}
  return t;
}

const TABS=[['coach','coach'],['resumo','painel'],['trab','trabalho'],['canal','canal'],['pess','pessoal'],['caixa','caixa'],['lanc','extrato'],['inv','investir'],['sim','simulador'],['aj','ajustes']];
const KEY='cofre-v2',KEY1='cofre-v1';

const eur=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'EUR'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const pad=n=>String(n).padStart(2,'0');
const mk=(y,m)=>y+'-'+pad(m+1);
const now=new Date();
const addM=(m,d)=>{const [y,mo]=m.split('-').map(Number);const t=new Date(y,mo-1+d,1);return mk(t.getFullYear(),t.getMonth())};
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
let cur=mk(now.getFullYear(),now.getMonth()),tab='coach',filt='todos',flash='';

const optGroups=(withInv,only)=>GRUPOS.filter(g=>(withInv||g[0]!=='i')&&(!only||only.includes(g[0]))).map(([k,l])=>`<optgroup label="${l}">${Object.keys(DCATS).filter(c=>DCATS[c]===k).map(c=>`<option>${esc(c)}</option>`).join('')}</optgroup>`).join('');
const rOpts=()=>Object.keys(RCATS).map(c=>`<option>${esc(c)}</option>`).join('');

/* ---------- dados ---------- */
function demo(){
  const c0=cur,P=k=>addM(c0,-k);
  const L=[];const add=(m,d,desc,cat,valor,tipo='d',rec=false)=>L.push({id:uid(),data:m+'-'+pad(d),desc,cat,valor,tipo,rec});
  add(P(4),2,'Aluguel','Moradia',750,'d',true);
  add(P(4),20,'DAS do MEI','Impostos e taxas',80,'d',true);L[L.length-1].moeda='BRL';
  for(let k=0;k<=3;k++){const m=P(k);
    add(m,5,'Supermercado','Mercado',250+k*12);add(m,7,'Luz e internet','Contas',95);
    add(m,9,'Transportes','Transporte',60+k*5);add(m,12,'Jantar fora','Restaurantes',45+k*8);
    add(m,15,'Projeto para cliente','Clientes e projetos',380+k*60,'r');
    add(m,10,'Créditos de API','IA e APIs',40+k*10);add(m,16,'Aporte ETF global','Investimento',160+k*20);}
  add(c0,14,'Roupa','Compras',85);
  return norm({demo:true,
    renda:[{id:uid(),nome:'Salário líquido',valor:2400,cat:'Salário'}],lanc:L,
    subs:[
      {id:uid(),nome:'Assistente de IA',valor:20,dia:5,ativa:true,horas:10,cat:'IA e APIs',desde:P(4)},
      {id:uid(),nome:'Editor de código com IA',valor:19,dia:8,ativa:true,horas:8,cat:'IA e APIs',desde:P(4)},
      {id:uid(),nome:'Ferramenta de design',valor:12,dia:12,ativa:true,horas:2,cat:'Ferramentas e SaaS',desde:P(4)},
      {id:uid(),nome:'Hospedagem do site',valor:8,dia:20,ativa:true,cat:'Hospedagem e domínio',desde:P(4)},
      {id:uid(),nome:'Streaming de vídeo',valor:12.99,dia:10,ativa:true,cat:'Assinaturas pessoais',desde:P(4)},
      {id:uid(),nome:'Streaming de música',valor:10.99,dia:15,ativa:true,cat:'Assinaturas pessoais',desde:P(4)},
      {id:uid(),nome:'Ginásio',valor:35,dia:5,ativa:true,cat:'Saúde',desde:P(4)},
      {id:uid(),nome:'Armazenamento na nuvem',valor:2.99,dia:20,ativa:false,cat:'Assinaturas pessoais',desde:P(4)}],
    metas:[
      {id:uid(),nome:'Computador novo para trabalho',alvo:1500,guardado:400,prazo:addM(c0,10)},
      {id:uid(),nome:'Viagem',alvo:1200,guardado:250,prazo:addM(c0,14)}],
    carteira:[
      {id:uid(),nome:'Cuenta remunerada',classe:'Reserva de emergência',aplicado:2800,atual:2850},
      {id:uid(),nome:'Letras del Tesoro',classe:'Renda fixa',aplicado:1000,atual:1030},
      {id:uid(),nome:'Fondo indexado global',classe:'Fundos indexados',aplicado:900,atual:985},
      {id:uid(),nome:'SOCIMI / ETF imobiliário',classe:'Imobiliário',aplicado:300,atual:310},
      {id:uid(),nome:'Plan de pensiones',classe:'Plano de pensões',aplicado:400,atual:412},
      {id:uid(),nome:'Bitcoin',classe:'Cripto',aplicado:100,atual:128}],
    dividas:[
      {id:uid(),nome:'Cartão de crédito',saldo:1400,inicial:1800,juros:19.9,minimo:70},
      {id:uid(),nome:'Empréstimo pessoal',saldo:600,inicial:900,juros:8,minimo:50}],
    contas:[
      {id:uid(),nome:'Conta corrente',tipo:'caixa',moeda:'EUR',saldo:900,atualizado:addM(c0,0)+'-15'},
      {id:uid(),nome:'Conta do MEI (R$)',tipo:'mei',moeda:'BRL',saldo:1800,atualizado:addM(c0,0)+'-15'}],
    checkins:[28,21,14,7].map((n,i)=>{const d=new Date();d.setDate(d.getDate()-n);const pat=[4890,5040,5230,5410][i];return {id:uid(),data:d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),snap:{caixa:700+i*60,reserva:2700+i*40,mei:260+i*10,carteira:2700+i*60,dividas:2100+0*i-i*70,pat}}}),
    projetos:[
      {id:uid(),cliente:'Estúdio Alfa',desc:'Site institucional',valor:900,status:'andamento',previsto:c0+'-28',pago:''},
      {id:uid(),cliente:'Loja Beta',desc:'Automação com IA',valor:2700,moeda:'BRL',status:'entregue',previsto:P(1)+'-20',pago:''},
      {id:uid(),cliente:'Gama Consultoria',desc:'Diagnóstico',valor:300,status:'proposta',previsto:'',pago:''},
      {id:uid(),cliente:'Estúdio Alfa',desc:'Manutenção',valor:250,status:'pago',previsto:'',pago:P(1)+'-05'}],
    canais:[{id:'cv1',nome:'Meu canal (exemplo)',plataforma:'YouTube',url:''}],
    metricas:[28,21,14,7].map((n,i)=>{const d=new Date();d.setDate(d.getDate()-n);return {id:'mt'+i,canal:'cv1',data:d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),
      dados:{subs:[128,150,171,196][i],horas:[410,455,520,590][i],shorts:[180000,260000,330000,470000][i],uploads:[3,3,4,3][i],posts:[2,3,2,2][i]}}}),
    limites:{Mercado:300,Restaurantes:80,'IA e APIs':120},
    cfg:{inicial:5100,aporte:200,taxa:5,anos:10,perfil:'moderado',fiscal:10,horasMes:80,valorHora:25,diagFeito:true}});
}
function norm(o){
  o.renda=(o.renda||[]).map(r=>({cat:'Salário',moeda:'EUR',cambio:0,pagas:12,...r}));
  o.lanc=(o.lanc||[]).map(x=>({moeda:'EUR',cambio:0,fim:'',conta:'',...x}));
  o.subs=(o.subs||[]).map(s=>({cat:'Assinaturas pessoais',desde:'0000-00',horas:0,moeda:'EUR',cambio:0,pausadaDesde:'',...s}));
  o.metas=o.metas||[];
  o.carteira=(o.carteira||[]).map(a=>({moeda:'EUR',...a,classe:({'FIIs':'Imobiliário','Ações e ETFs':'ETFs'})[a.classe]||a.classe}));
  o.limites=o.limites||{};
  o.projetos=(o.projetos||[]).map(x=>({moeda:'EUR',cambio:0,...x}));
  o.canais=o.canais||[];o.metricas=o.metricas||[];o.receitasCanal=(o.receitasCanal||[]).map(x=>({moeda:'EUR',cambio:0,obs:'',...x}));
  o.contas=o.contas||[];o.movs=o.movs||[];o.checkins=o.checkins||[];
  o.dividas=(o.dividas||[]).map(d=>({juros:0,minimo:0,inicial:d.saldo,...d}));
  o.cfg={inicial:0,aporte:150,taxa:5,anos:10,perfil:'moderado',mesesReserva:6,mesesCaixa:1,fiscal:0,horasMes:80,valorHora:25,cats:{},cambio:6,cambioUSD:1.08,convCusto:1,tetoMEI:81000,pais:'ES',
    metaExtra:0,prazoReserva:0,pgtoDivida:0,taxaFechamento:25,diagFeito:false,...(o.cfg||{})};
  o.cfg.regra={n:50,d:30,i:20,...(o.cfg.regra||{})};
  o.cfg.canal={checklist:{},sim:{},metaPosts:2,...(o.cfg.canal||{})};
  applyCats(o.cfg);
  return o;
}
function load(){
  try{
    let v=localStorage.getItem(KEY);if(v)return norm(JSON.parse(v));
    v=localStorage.getItem(KEY1);if(v){const o=JSON.parse(v);if(o&&!o.demo)return norm(o)}
  }catch(e){}
  return demo();
}
const TOKEN=((document.querySelector('meta[name="cofre-token"]')||{}).content)||'';
const HAS_DB=!!TOKEN&&TOKEN!==('__COFRE'+'_TOKEN__');
let S=HAS_DB?norm({}):load();
let saveErr='',saveT=null,saved=true;
function setSv(){const el=document.getElementById('sv');if(el)el.textContent=saveErr?'● erro ao salvar':saved?'● salvo':'● salvando…'}
function flush(){
  if(!HAS_DB)return Promise.resolve();
  clearTimeout(saveT);saveT=null;
  return fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify(S)})
    .then(r=>{if(!r.ok)return r.json().then(j=>{throw new Error(j.erro||r.status)});saved=true;saveErr=''})
    .catch(e=>{saveErr='Não foi possível gravar no banco local: '+e.message;saved=false})
    .finally(()=>{setSv();const b=document.getElementById('banner');if(b)b.innerHTML=bannerHtml()});
}
function save(){
  if(HAS_DB){saved=false;setSv();clearTimeout(saveT);saveT=setTimeout(flush,150)}
  else{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
}
addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
addEventListener('pagehide',()=>{flush()});
function bannerHtml(){
  if(undoSnap)return `<div class="banner"><span class="small">Item excluído.</span><button class="btn sm" data-act="undo">Desfazer</button></div>`;
  if(saveErr)return `<div class="banner err" role="alert"><span class="small"><b>Atenção.</b> ${esc(saveErr)}</span><button class="btn sm" data-act="retry">Tentar de novo</button></div>`;
  if(S.demo)return `<div class="banner"><span class="small"><b>Dados de exemplo.</b> Apague tudo para começar com os seus números.</span><button class="btn sm" data-act="clear">Começar do zero</button></div>`;
  if(!S.renda.length&&!S.lanc.length)return `<div class="banner"><span class="small"><b>Primeiros passos.</b> Abra a aba coach e responda o diagnóstico inicial.</span><button class="btn sm" data-tab="coach">Começar</button></div>`;
  return '';
}
function statusBar(){
  const c=calc(cur);
  document.getElementById('status').innerHTML=`<span id="sv"></span><span>saldo livre ${eur(c.saldo)}</span><span>investido ${eur(c.invest)}</span><span class="hint">Alt+1…9 abas · Alt+[ ] mês</span>`;
  setSv();
  const w=document.getElementById('where');
  if(w)w.textContent=HAS_DB?'Os dados ficam no banco local deste computador (SQLite), com backup diário automático.':'Os dados ficam salvos só neste navegador (use a aba ajustes para fazer backup).';
}
document.addEventListener('keydown',e=>{
  if(!e.altKey||e.ctrlKey||e.metaKey)return;
  const n=parseInt(e.key,10);
  if(n>=1&&n<=TABS.length){tab=TABS[n-1][0];render();e.preventDefault()}
  else if(e.key==='['){cur=addM(cur,-1);render();e.preventDefault()}
  else if(e.key===']'){cur=addM(cur,1);render();e.preventDefault()}
});
