// Testes da lógica financeira. Uso: node tests/logic.test.js  (precisa do pacote "playwright")
const {chromium}=require('playwright');const path=require('path');
const FILE='file://'+path.resolve(__dirname,'..','web','index.html');
let falhas=0;const ok=(c,m)=>{console.log((c?'  ok  ':' FALHA ')+m);if(!c)falhas++};
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(FILE);
const R=await p.evaluate(()=>{
  const out={},f=n=>Math.round(n*100)/100;
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2000,moeda:'EUR',pagas:14}],
    lanc:[{id:'a',tipo:'d',desc:'Aluguel',cat:'Moradia',valor:700,data:addM(baseMes(),-4)+'-02',rec:true,moeda:'EUR'},
          {id:'b',tipo:'d',desc:'Mercado',cat:'Mercado',valor:300,data:baseMes()+'-05',rec:false,moeda:'EUR'},
          {id:'c',tipo:'d',desc:'DAS',cat:'Impostos e taxas',valor:60,data:addM(baseMes(),-2)+'-20',rec:true,moeda:'BRL',cambio:6}],
    subs:[{id:'s',nome:'IA',valor:20,dia:5,ativa:true,cat:'IA e APIs',desde:addM(baseMes(),-4)}],
    projetos:[{id:'p',cliente:'X',desc:'y',valor:600,moeda:'BRL',cambio:6,status:'pago',pago:addM(baseMes(),-1)+'-10',previsto:''}],
    contas:[],dividas:[{id:'d1',nome:'Cartão',saldo:1000,inicial:1000,juros:0,minimo:100}],cfg:{cambio:6,fiscal:0}});
  // 1) meta da reserva não depende do mês visto
  const m1=[0,1,-3].map(d=>{cur=addM(baseMes(),d);return f(plano(calc(cur)).meta)});
  out.metaIgual=m1.every(v=>v===m1[0]);out.meta=m1;cur=baseMes();
  // 2) pausar não reescreve o passado
  const passado=addM(baseMes(),-3),a=calc(passado).work;
  S.subs[0].ativa=false;S.subs[0].pausadaDesde=baseMes();
  out.pausaPassado=[f(a),f(calc(passado).work)];out.pausaAgora=f(calc(baseMes()).work);
  // 3) câmbio por transação
  const mp=addM(baseMes(),-1),r6=calc(mp).rendaW;S.cfg.cambio=5;const r5=calc(mp).rendaW;S.cfg.cambio=6;
  out.cambioFixo=[f(r6),f(r5)];
  // 4) pagas extras: 14 pagas dobra junho e dezembro
  out.pagas=[calc('2026-06').rendaP,calc('2026-12').rendaP,calc('2026-05').rendaP];
  // 5) encerrar série
  const al=S.lanc[0];al.fim=addM(baseMes(),-2);
  out.fim=[lancMes(addM(baseMes(),-3)).some(x=>x.id==='a'),lancMes(baseMes()).some(x=>x.id==='a')];
  // 6) dívidas (avalanche)
  S.dividas=[{id:'x',nome:'A',saldo:1000,inicial:1000,juros:0,minimo:100}];
  out.div=[simDividas(100).meses,simDividas(200).meses];
  S.dividas=[{id:'x',nome:'A',saldo:1000,inicial:1000,juros:24,minimo:50}];
  out.divJuros=simDividas(100).juros>0&&simDividas(100).meses>10;
  S.dividas=[{id:'x',nome:'A',saldo:500,inicial:500,juros:5,minimo:0},{id:'y',nome:'B',saldo:500,inicial:500,juros:30,minimo:0}];
  out.cara=maisCara().nome;
  // 7) imposto poupança Espanha
  out.imposto=[impostoAhorro(10000),impostoAhorro(0),impostoAhorro(-1)];
  // 8) semana ISO e sequência de check-ins
  const hoje=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dias=n=>{const d=new Date(hoje);d.setDate(d.getDate()-n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  S.checkins=[{id:'1',data:dias(0)},{id:'2',data:dias(7)},{id:'3',data:dias(14)},{id:'4',data:dias(28)}];
  out.streak=checkinInfo().streak;S.checkins=[];out.streak0=checkinInfo().streak;
  // 9) CSV espanhol
  const t=parseCSV('Fecha;Concepto;Importe\n05/11/2026;"MERCADONA, S.A.";-45,30\n06/11/2026;NOMINA EMPRESA;"1.850,00"');
  out.csv=[t.length,t[1][1],parseNum(t[1][2]),parseNum(t[2][2]),parseDate(t[1][0],'dmy'),parseNum('(12,50)'),parseNum('1.234'),parseNum('12.5')];
  out.kw=[kwCat('Compra MERCADONA 123'),kwCat('NETFLIX.COM'),kwCat('OPENAI *CHATGPT'),kwCat('Zzz')];
  // 10) degraus: caixa completo avança o degrau
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2000,moeda:'EUR',pagas:12}],
    lanc:[{id:'a',tipo:'d',desc:'Aluguel',cat:'Moradia',valor:1000,data:baseMes()+'-02',rec:true,moeda:'EUR'}],
    contas:[{id:'c',nome:'CC',tipo:'caixa',moeda:'EUR',saldo:1500,atualizado:''}],cfg:{}});
  const x=ctxCoach();out.ess=x.ess;out.caixaOk=degraus(x)[1].ok;
  // 11) conta MEI em R$ entra convertida; reserva soma contas e carteira
  S.contas.push({id:'m',nome:'MEI',tipo:'mei',moeda:'BRL',saldo:1200,atualizado:''},{id:'r',nome:'Res',tipo:'reserva',moeda:'EUR',saldo:500,atualizado:''});
  S.carteira.push({id:'k',nome:'Conta rem.',classe:'Reserva de emergência',aplicado:100,atual:200,moeda:'EUR'});
  out.mei=meiTotal();out.reserva=reservaAtual();
  // 12) pagar dívida a mais NÃO infla o custo essencial nem reduz a capacidade
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2500,moeda:'EUR',pagas:12}],
    lanc:[{id:'a',tipo:'d',desc:'Aluguel',cat:'Moradia',valor:900,data:baseMes()+'-02',rec:true,moeda:'EUR'},
          {id:'m',tipo:'d',desc:'Mercado',cat:'Mercado',valor:300,data:baseMes()+'-05',rec:false,moeda:'EUR'}],
    dividas:[{id:'d',nome:'Cartão',saldo:2000,inicial:2000,juros:19,minimo:80}],contas:[],cfg:{}});
  const e1=essencialMedio(),c1=ctxCoach().cap;
  S.lanc.push({id:'p',tipo:'d',desc:'Pagamento: Cartão',cat:'Dívidas e juros',valor:800,data:baseMes()+'-10',rec:false,moeda:'EUR',cambio:0,fim:''});
  out.dividaEssencial=[f(e1),f(essencialMedio())];out.dividaCap=[f(c1),f(ctxCoach().cap)];
  // 13) vencimentos: assinatura que cobra daqui a 3 dias aparece; patrimônio soma tudo
  const d3=new Date(now.getFullYear(),now.getMonth(),now.getDate()+3);
  S.subs.push({id:'s',nome:'Ferramenta X',valor:15,dia:d3.getDate(),ativa:true,cat:'Ferramentas e SaaS',desde:'0000-00',horas:0,moeda:'EUR',cambio:0,pausadaDesde:''});
  out.venc=vencimentos(14).filter(z=>z.t==='Ferramenta X').length;
  S.contas=[{id:'c',nome:'CC',tipo:'caixa',moeda:'EUR',saldo:1000,atualizado:''},{id:'r',nome:'R',tipo:'reserva',moeda:'EUR',saldo:500,atualizado:''}];
  S.carteira=[{id:'k',nome:'ETF',classe:'ETFs',aplicado:100,atual:300,moeda:'EUR'}];
  out.pat=patrimonio(ctxCoach()).pat;
  // 14) foto do check-in e seções dobráveis
  S.cfg.diagFeito=true;out.fold=vCoach().includes('data-fold="venc"')&&vCoach().includes('<details');
  // 15) moedas: US$ convertido pelo câmbio da transação; símbolo e formatação
  S=norm({demo:false,cfg:{cambio:6,cambioUSD:1.1}});
  out.usd=[f(E({valor:110,moeda:'USD',cambio:0})),f(E({valor:110,moeda:'USD',cambio:1.25})),f(E({valor:60,moeda:'BRL',cambio:0})),sym('USD'),fmtM(10,'USD').startsWith('US$')];
  // 16) extrato com colunas de débito e crédito, moeda e saldo
  imp=impFresh();imp.raw='Fecha;Concepto;Cargo;Abono;Saldo\n05/11/2026;MERCADONA 12;45,30;;954,70\n06/11/2026;NOMINA SL;;1.850,00;2.804,70';parseImp();
  out.dc=[imp.map.c>=0,imp.map.s>=0,imp.rows.map(r=>[r.tipo,r.valor,r.cat,r.saldo])];
  // 17) saldo estimado: informado + lançamentos vinculados depois da data
  const hoje2=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dd=n=>{const d=new Date(hoje2);d.setDate(d.getDate()-n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  S=norm({demo:false,contas:[{id:'c',nome:'CC',tipo:'caixa',moeda:'EUR',saldo:1000,atualizado:dd(5)}],
    lanc:[{id:'1',tipo:'d',desc:'a',cat:'Mercado',valor:999,data:dd(5),rec:false,moeda:'EUR',conta:'c'},
          {id:'2',tipo:'d',desc:'b',cat:'Mercado',valor:50,data:dd(3),rec:false,moeda:'EUR',conta:'c'},
          {id:'3',tipo:'r',desc:'c',cat:'Outras rendas',valor:20,data:dd(1),rec:false,moeda:'EUR',conta:'c'},
          {id:'4',tipo:'d',desc:'d',cat:'Mercado',valor:70,data:dd(2),rec:false,moeda:'EUR',conta:''}],cfg:{}});
  out.saldoEst=[f(saldoConta(S.contas[0])),f(caixaTotal())];
  // 18) canal: requisitos, previsão de data e receita entrando na renda de trabalho
  const dc=n=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  S=norm({demo:false,canais:[{id:'c1',nome:'X',plataforma:'YouTube',url:''}],
    metricas:[21,14,7,0].map((n,i)=>({id:'m'+i,canal:'c1',data:dc(n),dados:{subs:[100,150,200,250][i],horas:[500,600,700,800][i],shorts:0,uploads:4}})),cfg:{}});
  const st=statusRequisitos(S.canais[0]);
  out.n1=[st[0].ok,st[1].ok];
  const e=etaMetrica(ultMetricas('c1'),'subs',1000);out.eta=[e.ok,e.dias,Math.round(e.semana)];
  out.eta2=etaMetrica(ultMetricas('c1').slice(0,2),'subs',1000).ok;
  S.receitasCanal=[{id:'r',canal:'c1',data:baseMes()+'-05',fonte:'AdSense (anúncios)',valor:110,moeda:'USD',cambio:1.1,obs:''}];
  out.canalRenda=[f(calc(baseMes()).canal),f(calc(baseMes()).rendaW),f(resumoCanal().receitaMes)];
  S=norm({demo:false,canais:[{id:'t',nome:'T',plataforma:'Twitch',url:''}],metricas:[{id:'a',canal:'t',data:dc(0),dados:{seg:60,min:600,dias:8,media:4}}],cfg:{}});
  out.twitch=statusRequisitos(S.canais[0])[0].ok;
  // 19) cérebro: anomalias, tendências e cenários
  const L19=[],b19=baseMes();
  [3,2,1].forEach(i=>L19.push({id:'h'+i,tipo:'d',desc:'m',cat:'Mercado',valor:200,data:addM(b19,-i)+'-05',rec:false,moeda:'EUR'}));
  L19.push({id:'c0',tipo:'d',desc:'m',cat:'Mercado',valor:450,data:b19+'-05',rec:false,moeda:'EUR'});
  for(let i=0;i<6;i++)L19.push({id:'r'+i,tipo:'d',desc:'r',cat:'Restaurantes',valor:20,data:addM(b19,-1)+'-'+pad(10+i),rec:false,moeda:'EUR'});
  L19.push({id:'big',tipo:'d',desc:'r',cat:'Restaurantes',valor:150,data:addM(b19,-1)+'-20',rec:false,moeda:'EUR'});
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2000,moeda:'EUR',pagas:12}],lanc:L19,cfg:{}});
  const an=anomalias();out.anom=[an.some(z=>z.tipo==='categoria'&&z.cat==='Mercado'&&Math.round(z.delta)===250),an.some(z=>z.tipo==='isolada'&&z.cat==='Restaurantes'&&z.valor===150)];
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2000,moeda:'EUR',pagas:12}],
    lanc:[3,2,1,0].flatMap(i=>[{id:'a'+i,tipo:'d',desc:'x',cat:'Mercado',valor:[1200,1300,1400,1500][i],data:addM(b19,-i)+'-05',rec:false,moeda:'EUR'}]),cfg:{}});
  const tr=tendencias();out.tend=[tr.ok,tr.poupanca,tr.gasto];
  S=norm({demo:false,renda:[{id:'r',nome:'N',cat:'Salário',valor:2000,moeda:'EUR',pagas:12}],
    lanc:[{id:'a',tipo:'d',desc:'x',cat:'Moradia',valor:1000,data:b19+'-02',rec:true,moeda:'EUR'}],
    contas:[{id:'c',nome:'CC',tipo:'caixa',moeda:'EUR',saldo:0,atualizado:''}],cfg:{mesesReserva:6,mesesCaixa:1}});
  const xx=ctxCoach();out.ritmo=[ritmoMeses(0,xx),ritmoMeses(700,xx),ritmoMeses(1400,xx)];
  S.cfg.diagFeito=true;const hh=vCoach();out.coachCerebro=hh.includes('data-fold="ese"')&&hh.includes('data-fold="ins"')&&acoes(ctxCoach()).some(a=>a.det&&a.det.length>0);
  return out});
console.log(JSON.stringify(R));
ok(R.metaIgual,'meta da reserva igual em qualquer mês visto '+R.meta);
ok(R.pausaPassado[0]===R.pausaPassado[1]&&R.pausaPassado[0]>0,'pausar assinatura não altera meses passados '+R.pausaPassado);
ok(R.pausaAgora<R.pausaPassado[0],'pausada some do mês atual '+R.pausaAgora);
ok(R.cambioFixo[0]===R.cambioFixo[1]&&R.cambioFixo[0]===99,'mudar o câmbio não reescreve receita já registrada '+R.cambioFixo);
ok(R.pagas[0]===4000&&R.pagas[1]===4000&&R.pagas[2]===2000,'14 pagas: junho e dezembro em dobro '+R.pagas);
ok(R.fim[0]===true&&R.fim[1]===false,'encerrar série preserva o passado e para no futuro '+R.fim);
ok(R.div[0]===10&&R.div[1]===5,'dívida sem juros: 1000 a 100/mês = 10 meses, a 200 = 5 '+R.div);
ok(R.divJuros,'juros alongam o prazo da dívida');
ok(R.cara==='B','avalanche escolhe a dívida de maior juros');
ok(R.imposto[0]===1980&&R.imposto[1]===0&&R.imposto[2]===0,'imposto da poupança: 10.000 de ganho = 1.980 '+R.imposto);
ok(R.streak===3&&R.streak0===0,'sequência de check-ins semanais '+[R.streak,R.streak0]);
ok(R.csv[0]===3&&R.csv[1]==='MERCADONA, S.A.'&&R.csv[2]===-45.3&&R.csv[3]===1850&&R.csv[4]==='2026-11-05'&&R.csv[5]===-12.5&&R.csv[6]===1234&&R.csv[7]===12.5,'leitura de CSV espanhol '+JSON.stringify(R.csv));
ok(R.kw.join()==='Mercado,Assinaturas pessoais,IA e APIs,'+'' ,'categorização automática '+R.kw);
ok(R.ess===1000&&R.caixaOk===true,'custo essencial médio e degrau do caixa '+[R.ess,R.caixaOk]);
ok(Math.abs(R.mei-200)<0.01&&R.reserva===700,'caixa do MEI em R$ convertido e reserva soma contas + carteira '+[R.mei,R.reserva]);
ok(R.dividaEssencial[0]===R.dividaEssencial[1]&&R.dividaEssencial[0]===1280,'pagar dívida extra não infla o custo essencial (900+300+mínimo 80) '+R.dividaEssencial);
ok(R.dividaCap[0]===R.dividaCap[1],'capacidade mensal devolve o que foi pago de dívida '+R.dividaCap);
ok(R.venc===1,'assinatura que cobra em 3 dias aparece nos próximos 14 dias');
ok(R.pat===1500-2000+300+500+0||R.pat===-200+0,'patrimônio líquido = caixa + reserva + investimentos - dívidas '+R.pat);
ok(R.fold===true,'coach usa seções dobráveis');
ok(R.usd[0]===100&&R.usd[1]===88&&R.usd[2]===10&&R.usd[3]==='US$'&&R.usd[4],'moedas: US$ e R$ convertidos pelo câmbio (da transação, se houver) '+R.usd);
ok(R.dc[0]&&R.dc[1]&&R.dc[2][0][0]==='d'&&R.dc[2][0][1]===45.3&&R.dc[2][0][2]==='Mercado'&&R.dc[2][0][3]===954.7&&R.dc[2][1][0]==='r'&&R.dc[2][1][1]===1850&&R.dc[2][1][3]===2804.7,'extrato com colunas de débito/crédito e saldo '+JSON.stringify(R.dc));
ok(R.saldoEst[0]===970&&R.saldoEst[1]===970,'saldo estimado = informado - 50 + 20 (ignora lançamento do dia da atualização e sem conta) '+R.saldoEst);
ok(R.n1[0]===false&&R.n1[1]===false,'canal: 250 inscritos e 800 horas ainda não atingem o nível 1 (500) '+R.n1);
ok(R.eta[0]===true&&R.eta[1]===Math.ceil(750/(50/7))&&R.eta[2]===50&&R.eta2===false,'previsão: 50 inscritos por semana, faltam 750 => 105 dias; com 2 registros não estima '+R.eta+' '+R.eta2);
ok(R.canalRenda[0]===99&&R.canalRenda[1]===99&&R.canalRenda[2]===99,'receita do canal em US$ entra na renda de trabalho já convertida (110/1,1 = 100, menos 1% de conversão) '+R.canalRenda);
ok(R.twitch===true,'Twitch afiliado: requisitos atingidos com 60 seguidores, 600 min, 8 dias e 4 espectadores');
ok(R.anom[0]&&R.anom[1],'anomalias: mercado +250 acima da média e despesa isolada de 150 em restaurantes '+R.anom);
ok(R.tend[0]&&R.tend[1]==='subindo'&&R.tend[2]==='caindo','tendências: gasto caindo => poupança subindo '+R.tend);
ok(R.ritmo[0]===null&&R.ritmo[1]===Math.ceil(1000/700)+Math.ceil(6000/700)&&R.ritmo[2]===Math.ceil(1000/1400)+Math.ceil(6000/1400),'prazo do cenário: caixa 1000 + reserva 6000 com capacidade 700 e 1400 '+R.ritmo);
ok(R.coachCerebro,'coach mostra explicação, hábitos e "e se"');
ok(errs.length===0,'sem erros de JavaScript '+errs);
await b.close();console.log(falhas?`\n${falhas} FALHA(S)`:'\nTodos os testes passaram');process.exit(falhas?1:0)})();
