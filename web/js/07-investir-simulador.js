function vInv(){
  const c=calc(cur),pl=plano(c),cf=S.cfg,cart=S.carteira;
  const apl=sum(cart,a=>Ea(a,'aplicado')),atu=sum(cart,a=>Ea(a,'atual')),rent=apl>0?(atu-apl)/apl*100:0;
  const alvo=PERFIS[cf.perfil].alvo;
  const nr=cart.filter(a=>a.classe!=='Reserva de emergência'),totNR=sum(nr,a=>Ea(a,'atual'));
  const aloc=Object.keys(alvo).map(k=>{const v=sum(nr.filter(a=>a.classe===k),a=>Ea(a,'atual'));return {k,v,real:totNR>0?v/totNR*100:0,alvo:alvo[k],gap:alvo[k]/100*totNR-v}});
  const prox=aloc.filter(a=>a.alvo>0).sort((a,b)=>b.gap-a.gap)[0];
  const ind=independencia(c);
  return `
  <div class="stats">
    <div class="stat"><div class="k">Patrimônio investido</div><div class="v num">${eur(atu)}</div></div>
    <div class="stat"><div class="k">Rentabilidade total</div><div class="v num ${atu>=apl?'good':'bad'}">${rent.toFixed(1)}%</div><div class="s">${eur(atu-apl)} sobre ${eur(apl)}</div></div>
    <div class="stat"><div class="k">Reserva de emergência</div><div class="v num">${pct(reservaAtual(),pl.meta)}%</div><div class="s">${eur(reservaAtual())} de ${eur(pl.meta)}</div></div>
    <div class="stat"><div class="k">Aporte recomendado</div><div class="v num">${eur(pl.alvo)}</div><div class="s">${S.cfg.regra.i}% da renda disponível</div></div>
    ${S.cfg.pais==='ES'?`<div class="stat"><div class="k">Se resgatar tudo hoje</div><div class="v num">${eur(atu-impostoAhorro(Math.max(0,atu-apl)))}</div><div class="s">imposto estimado ${eur(impostoAhorro(Math.max(0,atu-apl)))}</div></div>`:''}
  </div>
  <section class="panel"><h2>Plano de aporte deste mês</h2>
    <div class="small muted">Seu aporte ideal é ${eur(pl.alvo)} (${S.cfg.regra.i}% de ${eur(c.disp)}). Já investido neste mês: ${eur(c.invest)}. A reserva de emergência vem primeiro; depois o dinheiro segue o perfil escolhido.</div>
    <div class="field" style="max-width:240px"><label for="perfil">Perfil de investidor</label><select id="perfil">${Object.entries(PERFIS).map(([k,p])=>`<option value="${k}" ${k===cf.perfil?'selected':''}>${p.nome}</option>`).join('')}</select></div>
    <div class="plan">${pl.itens.length?pl.itens.map(([k,v,d])=>`<div class="p"><div><b>${esc(k)}</b><div class="small muted">${esc(d)}</div></div><b class="num">${eur(v)}</b></div>`).join(''):'<div class="empty">Sem saldo disponível para aportar neste mês. Reduza gastos ou aumente a renda.</div>'}</div>
    ${ind?`<div class="tips"><li class="k">${ind.meses?`Independência financeira: com seu aporte atual do simulador (${eur(cf.aporte)} por mês a ${cf.taxa}% ao ano), os rendimentos cobririam seu custo mensal de ${eur(ind.custo)} em cerca de ${(ind.meses/12).toFixed(1)} anos, com patrimônio de ${eur(ind.patr)}.`:`Para os rendimentos cobrirem seu custo mensal de ${eur(ind.custo)} você precisaria de ${eur(ind.patr)}. Com o aporte atual do simulador isso leva mais de 50 anos: aumente o aporte.`}</li></div>`:''}
    <div class="small muted">Sugestão educativa baseada em regras gerais de alocação. Escolha investimentos adequados ao seu prazo e risco.</div>
  </section>
  <section class="panel"><h2>Minha carteira</h2>
    <div class="list">${cart.length?cart.map(a=>{const r=a.aplicado>0?(a.atual-a.aplicado)/a.aplicado*100:0;
      return `<div class="row" style="align-items:flex-start"><div class="main" style="flex-basis:220px"><b>${esc(a.nome)}</b><span class="tag">${esc(a.classe)}</span><div class="small muted num">Aplicado ${fmtA(a,'aplicado')} · Atual ${fmtA(a,'atual')} · <span class="${r>=0?'good':'bad'}">${r.toFixed(1)}%</span></div></div>
      <form class="form" data-act="updAtivo" data-id="${a.id}" style="flex:1 1 280px">
        <div class="field"><label for="ap${a.id}">Aportar (${sym(a.moeda)})</label><input id="ap${a.id}" type="number" step="0.01" min="0" placeholder="0"></div>
        <div class="field"><label for="at${a.id}">Valor atual (${sym(a.moeda)})</label><input id="at${a.id}" type="number" step="0.01" min="0" placeholder="${a.atual}"></div>
        ${!noEur(a)&&S.contas.some(z=>z.tipo==='caixa')?`<div class="field"><label for="ad${a.id}">Descontar da conta</label><select id="ad${a.id}"><option value="">(não descontar)</option>${S.contas.filter(z=>z.tipo==='caixa').map(z=>`<option value="${z.id}">${esc(z.nome)}</option>`).join('')}</select></div>`:''}<button class="btn sm" type="submit">Atualizar</button></form>
      <button class="btn ghost sm" data-act="delAtivo" data-id="${a.id}">Remover</button></div>`}).join(''):'<div class="empty">Cadastre seus investimentos para acompanhar a rentabilidade.</div>'}</div>
    <form class="form" id="fAtivo">
      <div class="field" style="flex:2 1 160px"><label for="an">Investimento</label><input id="an" required placeholder="Ex.: Letras del Tesoro" list="prods"><datalist id="prods"><option value="Cuenta remunerada"><option value="Depósito a plazo"><option value="Letras del Tesoro"><option value="Bonos del Estado"><option value="Fondo indexado global"><option value="ETF global UCITS"><option value="SOCIMI"><option value="Plan de pensiones"><option value="Bitcoin"></datalist></div>
      <div class="field"><label for="acl">Classe</label><select id="acl">${CLASSES.map(k=>`<option>${k}</option>`).join('')}</select></div>
      <div class="field"><label for="am">Moeda</label><select id="am">${moedaOpts()}</select></div>
      <div class="field"><label for="aa">Valor aplicado</label><input id="aa" type="number" step="0.01" min="0" required></div>
      <div class="field"><label for="av">Valor atual</label><input id="av" type="number" step="0.01" min="0" placeholder="igual ao aplicado"></div>
      <button class="btn" type="submit">Adicionar</button>
    </form>
    <div class="small muted">Ao aportar, o valor também entra no extrato como gasto da categoria Investimento. Se o dinheiro já está numa conta do tipo Reserva (aba caixa), não cadastre de novo aqui, para não contar em dobro.</div>
  </section>
  <section class="panel"><h2>Alocação da carteira</h2>
    <div class="small muted">Compara o que você tem (fora a reserva) com o alvo do perfil ${PERFIS[cf.perfil].nome.toLowerCase()}.</div>
    ${totNR>0?aloc.map(a=>`<div class="rule"><div class="head"><b>${a.k}</b><span class="num small">${a.real.toFixed(0)}% atual · alvo ${a.alvo}% · ${eur(a.v)}</span></div><div class="bar"><i style="width:${Math.min(100,a.real)}%"></i></div></div>`).join('')+(prox&&prox.gap>0?`<div class="tips"><li>Próximo aporte (fora a reserva): <b>${prox.k}</b>, que está mais abaixo do alvo (faltam cerca de ${eur(prox.gap)}).</li></div>`:''):'<div class="empty">Cadastre ativos fora da reserva para ver a alocação.</div>'}
  </section>
  ${S.cfg.pais==='ES'?espanhaInv():''}`;
}
function espanhaInv(){
  const prod=[
    ['Cuenta remunerada e depósito a plazo','Os juros tributam como ganho de poupança (19% a 28%). Depósitos até €100.000 por banco têm garantia do fundo de garantia de depósitos.'],
    ['Letras del Tesoro e Bonos del Estado','Dívida pública, comprável no Tesoro Directo sem comissão de custódia. Os juros tributam como poupança.'],
    ['Fundos indexados','O traspaso para outro fundo em geral não tributa na hora, só no resgate. Bom para longo prazo; compare as comissões anuais.'],
    ['ETFs UCITS','Pelas regras da UE, o investidor de varejo costuma acessar ETFs UCITS, e não os ETFs americanos. Vender realiza o ganho e gera imposto.'],
    ['SOCIMIs e ETFs imobiliários','Exposição a imóveis sem comprar um. Dividendos e ganhos tributam como poupança.'],
    ['Planes de pensiones','Reduzem a base do IRPF no ano, mas o limite anual de aporte dedutível é baixo e o resgate é restrito. Confirme os valores vigentes.'],
    ['Cripto','Risco alto. Ganhos tributam, e pode haver obrigação de informar saldos (modelo 721) acima de certos valores.'],
    ['Dinheiro e investimentos no Brasil','Podem exigir declaração na Espanha acima de certos valores (modelo 720). O câmbio R$/€ também afeta o resultado.']];
  return `<section class="panel"><h2>Produtos para investir na Espanha</h2>
    <div class="small muted">Visão educativa. Regras, limites e alíquotas mudam todo ano: confirme com um asesor fiscal ou nas fontes oficiais (Agencia Tributaria, Tesoro Directo, CNMV).</div>
    <div class="plan">${prod.map(([k,d])=>`<div class="p"><div><b>${k}</b><div class="small muted">${d}</div></div></div>`).join('')}</div>
    <ul class="tips"><li class="w">Ganhos de capital e juros pagam imposto por faixas (a escala de poupança vai de 19% a 28%). O app estima isso na carteira e no simulador, mas o valor real depende do seu caso.</li></ul></section>`;
}

function vMetas(){
  const c=calc(cur);
  return `
  <section class="panel"><h2>Metas</h2>
    <div class="list">${S.metas.length?S.metas.map(g=>{
      const p=pct(g.guardado,g.alvo),n=monthsUntil(g.prazo),falta=Math.max(0,g.alvo-g.guardado),mes=falta/n,viavel=c.saldo+c.invest>=mes;
      return `<div class="row" style="align-items:flex-start"><div class="main" style="flex-basis:260px"><b>${esc(g.nome)}</b>
        <div class="bar" style="margin:8px 0"><i style="width:${p}%"></i></div>
        <span class="small muted num">${eur(g.guardado)} de ${eur(g.alvo)} (${p}%) · prazo ${g.prazo.split('-').reverse().join('/')}</span><br>
        <span class="small ${falta===0?'good':viavel?'':'warn'}">${falta===0?'Meta concluída.':`Guarde ${eur(mes)} por mês nos próximos ${n} meses.${viavel?'':' Seu saldo atual não cobre isso: amplie o prazo ou reduza gastos.'}`}</span></div>
        <form class="form" data-act="addMeta" data-id="${g.id}" style="flex:0 1 220px"><div class="field"><label for="g${g.id}">Guardar agora (€)</label><input id="g${g.id}" type="number" step="0.01" min="0.01" required></div><button class="btn sm" type="submit">Guardar</button></form>
        <button class="btn ghost sm" data-act="delMeta" data-id="${g.id}">Excluir</button></div>`}).join(''):'<div class="empty">Crie sua primeira meta abaixo.</div>'}</div>
    <form class="form" id="fMeta">
      <div class="field" style="flex:2 1 180px"><label for="mn">Meta</label><input id="mn" required placeholder="Ex.: Entrada do carro"></div>
      <div class="field"><label for="ma">Valor alvo (€)</label><input id="ma" type="number" min="1" step="0.01" required></div>
      <div class="field"><label for="mg">Já guardado (€)</label><input id="mg" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label for="mp">Prazo</label><input id="mp" type="month" value="${addM(cur,12)}" required></div>
      <button class="btn" type="submit">Criar meta</button>
    </form>
  </section>`;
}
function vSim(){
  const c=calc(cur),cf=S.cfg,{pts,r}=project(cf),last=pts[pts.length-1];
  const sug=Math.round(Math.max(0,c.disp*S.cfg.regra.i/100));
  return `
  <section class="panel"><h2>Simulador de investimentos</h2>
    <div class="small muted">Veja quanto seu dinheiro pode render com aportes mensais e juros compostos.${sug?` Sua meta de ${S.cfg.regra.i}% da renda disponível equivale a <b>${eur(sug)}</b> por mês.`:''}</div>
    <form class="form" id="fInv">
      <div class="field"><label for="iI">Valor inicial (€)</label><input id="iI" type="number" min="0" step="0.01" value="${cf.inicial}"></div>
      <div class="field"><label for="iA">Aporte mensal (€)</label><input id="iA" type="number" min="0" step="0.01" value="${cf.aporte}"></div>
      <div class="field"><label for="iT">Rentabilidade (% ao ano)</label><input id="iT" type="number" min="0" step="0.1" value="${cf.taxa}"></div>
      <div class="field"><label for="iY">Prazo (anos)</label><input id="iY" type="number" min="1" max="50" step="1" value="${cf.anos}"></div>
    </form>
    <div class="form"><span class="small muted">Cenários de rentabilidade (não são promessa):</span>
      <button class="btn ghost sm" data-act="preset" data-taxa="2.5">Prudente 2,5%</button>
      <button class="btn ghost sm" data-act="preset" data-taxa="4.5">Misto 4,5%</button>
      <button class="btn ghost sm" data-act="preset" data-taxa="7">Otimista 7%</button></div>
    <div class="stats">
      <div class="stat"><div class="k">Você investe</div><div class="v num">${eur(last.inv)}</div></div>
      <div class="stat"><div class="k">Juros ganhos</div><div class="v num good">${eur(last.tot-last.inv)}</div></div>
      <div class="stat"><div class="k">Patrimônio final</div><div class="v num">${eur(last.tot)}</div></div>
      <div class="stat"><div class="k">Renda passiva/mês</div><div class="v num">${eur(last.tot*r)}</div></div>
      ${cf.pais==='ES'?`<div class="stat"><div class="k">Líquido após imposto</div><div class="v num">${eur(last.tot-impostoAhorro(Math.max(0,last.tot-last.inv)))}</div><div class="s">imposto estimado ${eur(impostoAhorro(Math.max(0,last.tot-last.inv)))} se resgatar tudo no fim</div></div>`:''}
    </div>
    ${chartProj(pts,cf.anos)}
    <div class="small muted">A renda passiva é o rendimento mensal estimado do patrimônio final sem tocar no principal. Use a taxa do investimento que você realmente pretende fazer (depósito, Letras del Tesoro, fundos indexados). Ela varia e não é garantida; imposto e inflação não estão incluídos. Como referência, renda fixa na zona do euro costuma render poucos por cento ao ano, e ações globais renderam historicamente algo como 6% a 8% ao ano, com quedas fortes pelo caminho.</div>
  </section>
  <section class="panel"><h2>Ordem recomendada</h2>
    <ul class="tips">
      <li>1. Quite dívidas com juros altos (cartão, cheque especial) antes de investir.</li>
      <li>2. Monte a reserva de emergência (${S.cfg.mesesReserva} meses de custo básico) em renda fixa com liquidez diária.</li>
      <li>3. Aporte todo mês, de preferência no dia em que o salário cair.</li>
      <li>4. Para prazos longos, diversifique entre renda fixa e renda variável conforme seu perfil.</li>
      <li class="k">5. Ferramentas e IA de trabalho que geram mais renda que custam são investimento. Revise as que não geram.</li>
    </ul>
  </section>`;
}
