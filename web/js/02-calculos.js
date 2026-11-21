/* ---------- cálculos ---------- */
function lancMes(m){
  const out=[];
  S.lanc.forEach(x=>{const mm=x.data.slice(0,7);
    if(mm===m)out.push(x);else if(x.rec&&mm<m&&(!x.fim||m<=x.fim))out.push({...x,data:m+x.data.slice(7),virt:true})});
  return out;
}
const subsMes=m=>S.subs.filter(s=>(s.desde||'0000-00')<=m&&(s.ativa||(s.pausadaDesde&&m<s.pausadaDesde)));
const MOEDAS={EUR:{s:'€',n:'Euro'},BRL:{s:'R$',n:'Real'},USD:{s:'US$',n:'Dólar'}};
const sym=m=>(MOEDAS[m]||MOEDAS.EUR).s;
const noEur=x=>!!x.moeda&&x.moeda!=='EUR';
const rate=m=>m==='BRL'?Math.max(0.01,S.cfg.cambio||6):m==='USD'?Math.max(0.01,S.cfg.cambioUSD||1.08):1;
const cambio=()=>rate('BRL');
const moedaOpts=sel=>Object.entries(MOEDAS).map(([k,v])=>`<option value="${k}" ${k===(sel||'EUR')?'selected':''}>${v.s} ${v.n}</option>`).join('');
function E(x,inc){
  if(!noEur(x))return x.valor;
  const v=x.valor/(x.cambio>0?x.cambio:rate(x.moeda));
  return inc?v*(1-Math.min(20,S.cfg.convCusto||0)/100):v;
}
const fmtM=(v,m)=>(m&&m!=='EUR')?`${sym(m)} ${(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:eur(v);
const money=(x,inc)=>noEur(x)?`${fmtM(x.valor,x.moeda)} <span class="muted">(≈ ${eur(E(x,inc))})</span>`:eur(x.valor);
const toMoeda=(vEur,m)=>vEur*rate(m);
function meiAno(){
  const y=String(now.getFullYear());
  return sum(S.projetos.filter(p=>p.status==='pago'&&p.moeda==='BRL'&&(p.pago||'').startsWith(y)),p=>p.valor)
    +sum(S.lanc.filter(x=>x.tipo==='r'&&x.moeda==='BRL'&&RCATS[x.cat]==='w'&&x.data.startsWith(y)),x=>x.valor);
}
/* ---------- núcleo do coach: saldos, essencial, dívidas ---------- */
const cb=m=>(!m||m==='EUR')?0:rate(m);
const fmtN=v=>(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const Ea=(a,k)=>noEur(a)?a[k]/rate(a.moeda):a[k];
function saldoConta(a){
  if(!a.atualizado)return a.saldo;
  const hoje=hojeISO();let delta=0;
  for(let m=a.atualizado.slice(0,7);m<=baseMes();m=addM(m,1)){
    lancMes(m).filter(x=>x.conta===a.id&&x.data>a.atualizado&&x.data<=hoje).forEach(x=>{
      const v=x.tipo==='r'?x.valor:-x.valor;
      delta+=(x.moeda||'EUR')===(a.moeda||'EUR')?v:toMoeda(v/(noEur(x)?(x.cambio>0?x.cambio:rate(x.moeda)):1),a.moeda);
    });
  }
  return a.saldo+delta;
}
const Ebal=a=>noEur(a)?saldoConta(a)/rate(a.moeda):saldoConta(a);
const fmtA=(a,k)=>noEur(a)?`${fmtM(a[k],a.moeda)} <span class="muted">(≈ ${eur(Ea(a,k))})</span>`:eur(a[k]);
const baseMes=()=>mk(now.getFullYear(),now.getMonth());
const mesLabel=m=>new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.','');
const caixaTotal=()=>sum(S.contas.filter(a=>a.tipo==='caixa'),Ebal);
const meiTotal=()=>sum(S.contas.filter(a=>a.tipo==='mei'),Ebal);
const reservaAtual=()=>sum(S.carteira.filter(a=>a.classe==='Reserva de emergência'),a=>Ea(a,'atual'))+sum(S.contas.filter(a=>a.tipo==='reserva'),Ebal);
function essencialMedio(){
  const b=baseMes(),min=sum(S.dividas.filter(d=>d.saldo>0),d=>d.minimo||0);
  const v=[0,1,2].map(i=>{const c=calc(addM(b,-i));return c.needs-(c.porCat['Dívidas e juros']||0)}).filter(x=>x>0);
  return v.length?sum(v,x=>x)/v.length+min:0;
}
const maisCara=()=>[...S.dividas].filter(d=>d.saldo>0).sort((a,b)=>(b.juros||0)-(a.juros||0)||b.saldo-a.saldo)[0];
function simDividas(orc){
  let ds=S.dividas.filter(d=>d.saldo>0).map(d=>({...d,s:d.saldo}));
  if(!ds.length)return {meses:0,juros:0};
  const minimos=sum(ds,d=>d.minimo||0);orc=Math.max(orc||0,minimos);
  if(orc<=0)return {meses:null,juros:0};
  let meses=0,juros=0;
  while(ds.some(d=>d.s>0.005)&&meses<600){
    meses++;
    ds.forEach(d=>{const j=d.s*(d.juros||0)/100/12;d.s+=j;juros+=j});
    let b=orc;
    ds.forEach(d=>{const p=Math.min(d.s,d.minimo||0);d.s-=p;b-=p});
    ds.sort((a,b2)=>(b2.juros||0)-(a.juros||0));
    for(const d of ds){if(b<=0)break;const p=Math.min(d.s,b);d.s-=p;b-=p}
  }
  return {meses:ds.some(d=>d.s>0.005)?null:meses,juros};
}
function ctxCoach(){
  const base=baseMes(),c=calc(base),ess=essencialMedio();
  const dv=S.dividas.filter(d=>d.saldo>0),dTotal=sum(dv,d=>d.saldo),dIni=sum(S.dividas,d=>d.inicial||d.saldo);
  const ms=[0,1,2].map(i=>calc(addM(base,-i))).filter(m=>m.renda>0);
  const cap=ms.length?Math.max(0,sum(ms,m=>m.saldo+m.invest+(m.porCat['Dívidas e juros']||0))/ms.length):Math.max(0,c.saldo+c.invest+(c.porCat['Dívidas e juros']||0));
  const ren=[0,1,2].map(i=>calc(addM(base,-i)).rendaW);
  return {base,c,ess,caixa:caixaTotal(),reserva:reservaAtual(),mei:meiTotal(),dv,dTotal,dIni,cap,
    metaCaixa:ess*(S.cfg.mesesCaixa||0),metaReserva:ess*S.cfg.mesesReserva,extraMedia:sum(ren,v=>v)/3};
}
function degraus(x){
  const cf=S.cfg,R=cf.regra,alvoInv=x.c.disp*R.i/100,pc=(v,t)=>t>0?Math.max(0,Math.min(1,v/t)):0;
  const org=[S.renda.length>0,S.contas.length>0,(S.lanc.length+S.subs.length)>=8];
  return [
    {n:'Organizar',desc:'Cadastre renda e contas e lance seus gastos.',ok:org.every(Boolean),p:org.filter(Boolean).length/3},
    {n:'Formar o caixa',desc:`${cf.mesesCaixa||0} mês de custo essencial na conta corrente (${eur(x.metaCaixa)}).`,ok:x.metaCaixa>0&&x.caixa>=x.metaCaixa,p:pc(x.caixa,x.metaCaixa)},
    {n:'Quitar dívidas',desc:x.dIni>0?`Faltam ${eur(x.dTotal)} de ${eur(x.dIni)}.`:'Sem dívidas cadastradas.',ok:x.dTotal===0,p:x.dIni>0?1-x.dTotal/x.dIni:1},
    {n:'Reserva de emergência',desc:`${cf.mesesReserva} meses de custo essencial (${eur(x.metaReserva)}).`,ok:x.metaReserva>0&&x.reserva>=x.metaReserva,p:pc(x.reserva,x.metaReserva)},
    {n:'Investir todo mês',desc:`${R.i}% da renda disponível (${eur(alvoInv)}).`,ok:alvoInv>0&&x.c.invest>=alvoInv,p:pc(x.c.invest,alvoInv)},
    {n:'Escalar a renda extra',desc:cf.metaExtra>0?`Meta de ${eur(cf.metaExtra)} por mês (média atual ${eur(x.extraMedia)}).`:'Defina uma meta de renda extra.',ok:cf.metaExtra>0&&x.extraMedia>=cf.metaExtra,p:pc(x.extraMedia,cf.metaExtra)}
  ];
}
function isoWeek(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=t.getUTCFullYear(),w=Math.ceil(((t-new Date(Date.UTC(y,0,1)))/86400000+1)/7);return y+'-W'+pad(w);
}
function checkinInfo(){
  const weeks=new Set(S.checkins.map(c=>{const [y,m,d]=c.data.split('-').map(Number);return isoWeek(new Date(y,m-1,d))}));
  let d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const feito=weeks.has(isoWeek(d));if(!feito)d.setDate(d.getDate()-7);
  let streak=0;while(weeks.has(isoWeek(d))){streak++;d.setDate(d.getDate()-7)}
  const ult=S.checkins.map(c=>c.data).sort().pop()||'';
  return {feito,streak,ult};
}
function funil(){
  const ps=S.projetos,ganhos=ps.filter(p=>['andamento','entregue','pago'].includes(p.status)),perd=ps.filter(p=>p.status==='perdido');
  const dec=ganhos.length+perd.length,taxa=dec>=5?ganhos.length/dec:(S.cfg.taxaFechamento||25)/100;
  const pagos=ps.filter(p=>p.status==='pago'),base=pagos.length?pagos:ps.filter(p=>p.status!=='perdido');
  const ticket=base.length?sum(base,p=>E(p,true))/base.length:0,meta=S.cfg.metaExtra||0;
  const proj=ticket>0&&meta>0?Math.ceil(meta/ticket):null,props=proj&&taxa>0?Math.ceil(proj/taxa):null;
  return {taxa,real:dec>=5,ticket,meta,proj,props,dec};
}
function saude(x){
  const R=S.cfg.regra,c=x.c,conc=concentracao(),ck=checkinInfo(),pc=(v,t)=>t>0?Math.max(0,Math.min(1,v/t)):0;
  const taxa=c.disp>0?(c.invest+Math.max(0,c.saldo))/c.disp:0;
  const parts=[
    ['Caixa',15,pc(x.caixa,x.metaCaixa)],
    ['Reserva de emergência',25,pc(x.reserva,x.metaReserva)],
    ['Dívidas',20,x.dIni>0?1-x.dTotal/x.dIni:1],
    ['Poupança do mês',20,pc(taxa,R.i/100)],
    ['Renda de trabalho',10,c.rendaW>0?(conc&&conc.pct>60?.6:1):.3],
    ['Constância (check-ins)',10,pc(ck.streak,4)]
  ].map(([n,w,v])=>({n,w,v}));
  const score=Math.round(sum(parts,p=>p.w*p.v));
  return {score,parts,nivel:score<40?'em construção':score<70?'no caminho':'sólida'};
}
function acoes(x){
  const A=[],cf=S.cfg,c=x.c,rc=recebiveis(),roi=roiTools(),conc=concentracao(),ck=checkinInfo();
  const add=(p,t,why,tab,btn,det)=>A.push({p,t,why,tab,btn,det});
  const falC=Math.max(0,x.metaCaixa-x.caixa),falR=Math.max(0,x.metaReserva-x.reserva),pl=plano(c);
  if(!S.renda.length)add(100,'Cadastre seu salário','Sem a renda o app não consegue calcular nada.','lanc','Cadastrar renda');
  if(!S.contas.length)add(95,'Cadastre suas contas e saldos','Saber quanto você tem hoje é o ponto de partida.','caixa','Cadastrar contas');
  if(c.renda>0&&c.saldo<0)add(98,`Você gasta ${eur(-c.saldo)} a mais do que entra`,'Corte primeiro desejos e assinaturas.','pess','Ver gastos',[['Entradas do mês',eur(c.renda)],['Custo do trabalho',eur(c.work)],['Reserva para impostos',eur(c.fiscal)],['Gastos pessoais',eur(c.needs+c.wants)],['Investido',eur(c.invest)],['Saldo do mês',eur(c.saldo)]]);
  if(!ck.feito&&S.renda.length)add(88,'Faça o check-in desta semana','Cinco minutos por semana mantêm os números reais e o plano em dia.','coach','Fazer check-in');
  if(rc.atrasados.length)add(90,`Cobre ${rc.atrasados.length} pagamento(s) atrasado(s): ${eur(sum(rc.atrasados,p=>E(p,true)))}`,'É dinheiro que já é seu.','trab','Ver projetos',rc.atrasados.map(p=>[p.cliente+' · '+p.desc,eur(E(p,true))]));
  if(x.ess>0&&S.contas.some(a=>a.tipo==='caixa')&&falC>0)add(85,`Forme o caixa: faltam ${eur(falC)}`,`Meta: ${cf.mesesCaixa} mês de custo essencial (${eur(x.ess)}) na conta corrente.`,'caixa','Ver caixa',[['Custo essencial médio (3 meses)',eur(x.ess)],['Meses de caixa',String(cf.mesesCaixa)],['Meta do caixa',eur(x.metaCaixa)],['Você tem',eur(x.caixa)],['Falta',eur(falC)]]);
  if(x.dTotal>0){const d=maisCara();add(80,`Priorize a dívida "${d.nome}"`,d.juros>0?`Juros de ${d.juros}% ao ano: quitar dívida cara rende mais do que investir.`:'Informe os juros para o app priorizar a dívida certa.','caixa','Ver dívidas',[['Dívida escolhida',d.nome],['Saldo',eur(d.saldo)],['Juros ao ano',(d.juros||0)+'%'],['Pagamento mínimo',eur(d.minimo||0)],['Todas as dívidas',eur(x.dTotal)]])}
  if(x.ess>0&&falR>0)add(x.dTotal>0?60:75,`Complete a reserva: faltam ${eur(falR)}`,`Meta de ${cf.mesesReserva} meses de custo essencial (${eur(x.metaReserva)}).`,'caixa','Ver reserva',[['Custo essencial médio (sem trabalho; com mínimo das dívidas)',eur(x.ess)],['Meses de reserva',String(cf.mesesReserva)],['Meta da reserva',eur(x.metaReserva)],['Você tem (contas + carteira)',eur(x.reserva)],['Falta',eur(falR)]]);
  Object.entries(S.limites).forEach(([cat,lim])=>{const v=c.porCat[cat]||0;if(lim>0&&v>lim)add(65,`Você passou do limite de ${cat}`,`${eur(v)} de ${eur(lim)} neste mês.`,'pess','Ver limites')});
  if(c.rendaW>0&&!cf.fiscal)add(62,'Reserve uma parte da renda do trabalho para impostos',`Defina a porcentagem na aba trabalho.${cf.pais==='ES'?' Morando na Espanha, a renda do MEI também pode ser tributada lá: confirme com um asesor fiscal.':''}`,'trab','Definir');
  if(roi.semDados)add(52,'Informe as horas que cada ferramenta de IA poupa','Assim o app mostra quais se pagam e quais cortar.','trab','Informar horas');
  else{const r=roi.rows.filter(z=>z.s.horas>0&&z.saldo<0);if(r.length)add(55,`Revise: ${r.map(z=>z.s.nome).join(', ')}`,'Custam mais do que o tempo que poupam.','trab','Ver ferramentas')}
  if(conc&&conc.n>1&&conc.pct>60)add(50,`${conc.cliente} é ${conc.pct.toFixed(0)}% da sua receita de projetos`,'Dependência alta: busque outros clientes.','trab','Ver projetos');
  if(!(cf.metaExtra>0))add(40,'Defina sua meta de renda extra','Veja os cenários abaixo e escolha uma meta realista.','coach','Ver cenários');
  if(x.dTotal===0&&falR===0&&x.metaReserva>0&&c.invest<pl.alvo)add(70,`Invista ${eur(pl.alvo-c.invest)} neste mês`,`Meta de ${cf.regra.i}% da renda disponível.`,'inv','Ver plano');
  if(cf.pais==='ES'&&meiAno()>0)add(30,'Lembre do DAS do MEI','Costuma vencer todo dia 20. Confira no portal do MEI.','trab','Ver MEI');
  if(S.canais.length){const ms=S.metricas.map(z=>z.data).sort(),ult=ms[ms.length-1];if(!ult||dayNum(hojeISO())-dayNum(ult)>=7)add(45,'Registre as métricas da semana do seu canal','Com 3 semanas de dados o app estima a data de cada meta de monetização.','canal','Registrar métricas')}
  if(!A.length)add(10,'Tudo em ordem por agora','Mantenha o check-in semanal e o aporte do mês.','coach','');
  return A.sort((a,b)=>b.p-a.p);
}
function alocacao(x){
  let rest=x.cap;const it=[],falC=Math.max(0,x.metaCaixa-x.caixa),falR=Math.max(0,x.metaReserva-x.reserva);
  if(falC>0&&rest>0&&x.ess>0){const v=Math.min(falC,rest*(x.dTotal>0||falR>0?.6:1));it.push(['Caixa (conta corrente)',v,'Primeiro um colchão para não usar cartão em imprevistos.']);rest-=v}
  if(x.dTotal>0&&rest>0){const d=maisCara(),v=Math.min(x.dTotal,rest*(falR>0?.7:1));it.push([`Dívida: ${d.nome}`,v,d.juros>0?`Maior juros (${d.juros}% ao ano).`:'Informe os juros para priorizar.']);rest-=v}
  if(falR>0&&rest>0){const v=Math.min(falR,rest);it.push(['Reserva de emergência',v,'Conta remunerada ou Letras del Tesoro.']);rest-=v}
  if(rest>0.5)it.push(['Investir',rest,'Com a base pronta, o excedente vai para a carteira.']);
  return it;
}
function previsao(n){
  const b=baseMes();let saldo=caixaTotal();
  const hist=[0,1,2].map(i=>sum(lancMes(addM(b,-i)).filter(z=>z.tipo==='d'&&!z.rec&&!z.virt&&z.cat!=='Investimento'&&z.cat!=='Dívidas e juros'),z=>E(z))).filter(v=>v>0);
  const varAvg=hist.length?sum(hist,v=>v)/hist.length:0,dmin=sum(S.dividas.filter(d=>d.saldo>0),d=>d.minimo||0);
  const canalAvg=(()=>{const v=[0,1,2].map(i=>sum(S.receitasCanal.filter(r=>r.data.startsWith(addM(b,-i))),r=>E(r,true))).filter(x=>x>0);return v.length?sum(v,x=>x)/v.length:0})();
  const atras=sum(S.projetos.filter(p=>['andamento','entregue'].includes(p.status)&&p.previsto&&p.previsto<b+'-01'),p=>E(p,true));
  const out=[];
  for(let i=1;i<=n;i++){
    const m=addM(b,i),L=lancMes(m);
    const ent=sum(S.renda,r=>E(r,true)*rendaMult(r,m))+sum(L.filter(z=>z.tipo==='r'),z=>E(z,true))
      +sum(S.projetos.filter(p=>['andamento','entregue'].includes(p.status)&&p.previsto&&p.previsto.startsWith(m)),p=>E(p,true))+(i===1?atras:0)+canalAvg;
    const expl=sum(L.filter(z=>z.tipo==='d'&&!z.rec&&!z.virt&&z.cat!=='Dívidas e juros'),z=>E(z));
    const sai=sum(L.filter(z=>z.tipo==='d'&&(z.rec||z.virt)&&z.cat!=='Dívidas e juros'),z=>E(z))+sum(subsMes(m),s=>E(s))+Math.max(varAvg,expl)+dmin;
    saldo+=ent-sai;out.push({m,ent,sai,saldo});
  }
  return out;
}
function resumoIA(){
  const x=ctxCoach(),deg=degraus(x),at=deg.findIndex(d=>!d.ok),s=saude(x),R=S.cfg.regra;
  return ['Resumo financeiro (sem nomes, descrições ou contas):',
    `- Renda mensal: ${eur(x.c.renda)} (trabalho extra: ${eur(x.c.rendaW)})`,
    `- Custo essencial médio: ${eur(x.ess)}; custo de trabalho: ${eur(x.c.work)}`,
    `- Saldo livre do mês: ${eur(x.c.saldo)}; investido: ${eur(x.c.invest)}`,
    `- Caixa: ${eur(x.caixa)} (meta ${eur(x.metaCaixa)}); reserva: ${eur(x.reserva)} (meta ${eur(x.metaReserva)}, ${S.cfg.mesesReserva} meses)`,
    `- Dívidas: ${eur(x.dTotal)} em ${x.dv.length} dívida(s)`,
    `- Regra de divisão: ${R.n}/${R.d}/${R.i}; capacidade mensal para metas: ${eur(x.cap)}`,
    `- Degrau atual: ${at<0?'todos concluídos':(at+1)+' de 6 ('+deg[at].n+')'}; nota de saúde: ${s.score}/100`,
    ...(S.canais.length?[`- Canal: ${S.canais.length} canal(is); receita do canal no mês ${eur(resumoCanal().receitaMes)}`]:[]),
    `- Contexto: empregado na Espanha, renda extra de MEI no Brasil em R$`,
    'Pergunta: com base nesses números, qual é o melhor próximo passo e por quê?'].join('\n');
}

const rendaMult=(r,m)=>r.pagas===14&&['06','12'].includes(m.slice(5,7))?2:1;
function calc(m){
  const L=lancMes(m),R=L.filter(x=>x.tipo==='r'),D=L.filter(x=>x.tipo==='d');
  const rIs=(cat,e)=>RCATS[cat||'Salário']===e;
  const recebido=sum(S.projetos.filter(p=>p.status==='pago'&&(p.pago||'').startsWith(m)),p=>E(p,true));
  const canalM=sum(S.receitasCanal.filter(r=>r.data.startsWith(m)),r=>E(r,true));
  const rendaP=sum(S.renda.filter(r=>rIs(r.cat,'p')),r=>E(r,true)*rendaMult(r,m))+sum(R.filter(x=>rIs(x.cat,'p')),x=>E(x,true));
  const rendaW=sum(S.renda.filter(r=>rIs(r.cat,'w')),r=>E(r,true)*rendaMult(r,m))+sum(R.filter(x=>rIs(x.cat,'w')),x=>E(x,true))+recebido+canalM;
  const porCat={};const add=(c,v)=>porCat[c]=(porCat[c]||0)+v;
  D.forEach(x=>add(x.cat,E(x)));
  const subs=subsMes(m);subs.forEach(s=>add(s.cat,E(s)));
  const kind=k=>Object.entries(porCat).filter(([c])=>DCATS[c]===k).reduce((a,[,v])=>a+v,0);
  const needs=kind('n'),wants=kind('d'),work=kind('w'),invest=kind('i');
  const renda=rendaP+rendaW,fiscal=rendaW*(S.cfg.fiscal||0)/100,disp=renda-work-fiscal;
  return {L,renda,rendaP,rendaW,recebido,canal:canalM,fiscal,needs,wants,work,invest,disp,saldo:disp-needs-wants-invest,porCat,
    subsTotal:sum(subs,s=>E(s)),subsWork:sum(subs.filter(s=>DCATS[s.cat]==='w'),s=>E(s))};
}
const hojeISO=()=>now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
const fmtD=d=>String(d).split('-').reverse().join('/');
function recebiveis(){
  const ab=S.projetos.filter(p=>!['pago','perdido'].includes(p.status)),by=s=>sum(ab.filter(p=>p.status===s),p=>E(p,true));
  const atrasados=ab.filter(p=>p.status==='entregue'&&p.previsto&&p.previsto<hojeISO());
  return {total:sum(ab,p=>E(p,true)),proposta:by('proposta'),andamento:by('andamento'),entregue:by('entregue'),atrasados};
}
function concentracao(){
  const ps=S.projetos.filter(p=>!['proposta','perdido'].includes(p.status)),tot=sum(ps,p=>E(p,true)),by={};
  ps.forEach(p=>by[p.cliente]=(by[p.cliente]||0)+E(p,true));
  const top=Object.entries(by).sort((a,b)=>b[1]-a[1])[0];
  return top&&tot>0?{cliente:top[0],pct:top[1]/tot*100,n:Object.keys(by).length}:null;
}
function precoHora(c){
  const cf=S.cfg,R=cf.regra,custo=c.needs+c.wants+c.work,comInv=custo*(1+R.i/100);
  const bruto=comInv/(1-Math.min(60,cf.fiscal||0)/100),falta=Math.max(0,bruto-c.rendaP),h=Math.max(1,cf.horasMes);
  return {custo,comInv,bruto,faltaSalario:falta,hMinTudo:bruto/h,hMinFalta:falta/h,hReal:c.rendaW/h};
}
function roiTools(){
  const vh=S.cfg.valorHora||0,tools=S.subs.filter(s=>s.ativa&&DCATS[s.cat]==='w');
  const rows=tools.map(s=>{const ret=(s.horas||0)*vh;return {s,ret,saldo:ret-E(s)}});
  return {rows,custo:sum(tools,s=>E(s)),retorno:sum(rows,r=>r.ret),semDados:tools.length>0&&tools.every(s=>!(s.horas>0))};
}
function monthsUntil(p){const [y,mo]=p.split('-').map(Number);return Math.max(1,(y-now.getFullYear())*12+(mo-1-now.getMonth()))}
function project(c){
  const r=Math.pow(1+c.taxa/100,1/12)-1;let tot=c.inicial,inv=c.inicial;const pts=[{m:0,tot,inv}];
  for(let i=1;i<=c.anos*12;i++){tot=tot*(1+r)+c.aporte;inv+=c.aporte;pts.push({m:i,tot,inv})}
  return {pts,r};
}
function fv(aporte,taxa,anos){const r=Math.pow(1+taxa/100,1/12)-1;let t=0;for(let i=0;i<anos*12;i++)t=t*(1+r)+aporte;return t}
const pct=(v,t)=>t>0?Math.min(100,Math.round(v/t*100)):0;
function plano(c){
  const R=S.cfg.regra,alvo=Math.max(0,c.disp*R.i/100),meses=S.cfg.mesesReserva;
  const custo=essencialMedio(),meta=custo*meses,falta=Math.max(0,meta-reservaAtual());
  let rest=alvo;const itens=[];
  if(falta>0&&rest>0){const v=Math.min(rest,falta);itens.push(['Reserva de emergência',v,`Prioridade 1: ${meses} meses de custo básico. ${CLASS_HINT['Reserva de emergência']}`]);rest-=v}
  if(rest>0){const t=PERFIS[S.cfg.perfil].alvo;
    Object.entries(t).filter(([,p])=>p>0).forEach(([k,p])=>itens.push([k,rest*p/100,`${p}% do aporte restante (perfil ${PERFIS[S.cfg.perfil].nome.toLowerCase()}). ${CLASS_HINT[k]||''}`]))}
  return {alvo,meta,falta,itens,custo};
}
function independencia(c){
  const custo=c.needs+c.wants+c.work;if(custo<=0)return null;
  const cf=S.cfg,r=Math.pow(1+cf.taxa/100,1/12)-1;if(r<=0)return null;
  let tot=cf.inicial;for(let i=1;i<=600;i++){tot=tot*(1+r)+cf.aporte;if(tot*r>=custo)return {meses:i,custo,patr:custo/r}}
  return {meses:null,custo,patr:custo/r};
}
