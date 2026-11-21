const ST=[['proposta','Proposta'],['andamento','Em andamento'],['entregue','Entregue (a receber)'],['pago','Pago'],['perdido','Perdido']];
const scopeCats=scope=>Object.keys(DCATS).filter(k=>scope==='w'?DCATS[k]==='w':(DCATS[k]==='n'||DCATS[k]==='d'));
function subsPanel(scope){
  const w=scope==='w',vh=S.cfg.valorHora||0;
  const list=S.subs.filter(s=>w?DCATS[s.cat]==='w':DCATS[s.cat]!=='w').sort((a,b)=>E(b)-E(a));
  const mes=sum(list.filter(s=>s.ativa),s=>E(s)),pausadas=sum(list.filter(s=>!s.ativa),s=>E(s)),roi=roiTools();
  const linha=s=>{const ret=(s.horas||0)*vh,saldo=ret-E(s);
    return `<div class="row"><div class="main"><b>${esc(s.nome)}</b><span class="small muted">Dia ${s.dia} · ${eur(E(s)*12)} por ano · <span class="tag ${w?'work':''}">${esc(s.cat)}</span></span></div>
    ${w?`<div style="width:120px"><input aria-label="Horas poupadas por mês com ${esc(s.nome)}" type="number" min="0" step="0.5" placeholder="horas/mês" value="${s.horas||''}" data-hrs="${s.id}"></div><span class="small num ${s.horas>0?(saldo>=0?'good':'bad'):'muted'}" style="min-width:120px">${s.horas>0?(saldo>=0?'+':'−')+eur(Math.abs(saldo))+' líquido':'sem dado'}</span>`:''}
    <span class="num ${s.ativa?'':'muted'}">${money(s)}</span>
    <button class="btn ghost sm" data-act="togSub" data-id="${s.id}">${s.ativa?'Pausar':'Reativar'}</button><button class="btn ghost sm" data-act="delSub" data-id="${s.id}">Excluir</button></div>`};
  return `<section class="panel"><h2>${w?'Ferramentas e IA':'Assinaturas pessoais'}</h2>
    <div class="small muted">Total ativo: <b class="num">${eur(mes)}</b> por mês (${eur(mes*12)} por ano).${w?` Informe as horas que cada ferramenta poupa por mês. Com sua hora a ${eur(vh)}, as ferramentas ativas devolvem ${eur(roi.retorno)} em tempo contra ${eur(roi.custo)} de custo.`:''}${pausadas>0?` Pausadas: ${eur(pausadas)} por mês, que investidos por 10 anos a ${S.cfg.taxa}% ao ano seriam ${eur(fv(pausadas,S.cfg.taxa,10))}.`:''}</div>
    <div class="list">${list.length?list.map(linha).join(''):'<div class="empty">Nenhuma assinatura aqui.</div>'}</div>
    <form class="form" id="fSub">
      <div class="field" style="flex:2 1 170px"><label for="sn">Serviço</label><input id="sn" required placeholder="${w?'Ex.: Assistente de IA':'Ex.: Streaming'}"></div>
      <div class="field"><label for="sc">Categoria</label><select id="sc">${optGroups(false,w?['w']:['n','d'])}</select></div>
      <div class="field"><label for="sm">Moeda</label><select id="sm">${moedaOpts()}</select></div>
      <div class="field"><label for="sv">Valor mensal</label><input id="sv" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label for="sd">Dia da cobrança</label><input id="sd" type="number" min="1" max="31" value="10" required></div>
      <button class="btn" type="submit">Adicionar</button>
    </form>
    <div class="small muted">Assinaturas valem a partir do mês em que você as cadastra. Pausar tira do cálculo.</div>
  </section>`;
}
function orcPanel(scope){
  const c=calc(cur),cats=scopeCats(scope),tot=sum(cats,k=>S.limites[k]||0);
  return `<section class="panel"><h2>Limites por categoria</h2>
    <div class="small muted">Defina quanto pode gastar por mês em cada categoria. Os limites aparecem nas recomendações do painel quando você chega perto ou passa. Deixe em branco para não limitar.</div>
    <div class="list">${cats.map(k=>{const v=c.porCat[k]||0,lim=S.limites[k]||0,p=lim?v/lim*100:0;
      return `<div class="row"><div class="main" style="flex-basis:200px"><b>${esc(k)}</b><span class="tag ${DCATS[k]==='w'?'work':''}">${GRUPOS.find(g=>g[0]===DCATS[k])[1]}</span>
        ${lim?`<div class="bar ${p>100?'over':p>90?'warn':''}" style="margin-top:6px"><i style="width:${Math.min(100,p)}%"></i></div>`:''}</div>
        <span class="num small ${lim&&v>lim?'bad':''}">${eur(v)}${lim?` de ${eur(lim)}`:''}</span>
        <div style="width:130px"><input aria-label="Limite de ${esc(k)}" type="number" min="0" step="10" placeholder="Limite €" value="${lim||''}" data-lim="${esc(k)}"></div></div>`}).join('')}</div>
    <div class="small muted">Soma dos limites definidos: ${eur(tot)}.</div>
  </section>`;
}
function projPanel(c){
  const rc=recebiveis(),conc=concentracao();
  const lista=S.projetos.filter(p=>p.status==='perdido'?false:(p.status!=='pago'||(p.pago||'').startsWith(cur)))
    .sort((a,b)=>ST.findIndex(x=>x[0]===a.status)-ST.findIndex(x=>x[0]===b.status)||(a.previsto||'9').localeCompare(b.previsto||'9'));
  return `<section class="panel"><h2>Projetos e recebíveis</h2>
    <div class="stats">
      <div class="stat"><div class="k">Propostas</div><div class="v num">${eur(rc.proposta)}</div><div class="s">possível receita</div></div>
      <div class="stat"><div class="k">Em andamento</div><div class="v num">${eur(rc.andamento)}</div></div>
      <div class="stat"><div class="k">Entregue, a receber</div><div class="v num">${eur(rc.entregue)}</div><div class="s ${rc.atrasados.length?'bad':''}">${rc.atrasados.length?rc.atrasados.length+' atrasado(s)':'em dia'}</div></div>
      <div class="stat"><div class="k">Recebido no mês</div><div class="v num good">${eur(c.recebido)}</div></div>
    </div>
    ${conc&&conc.n>1&&conc.pct>60?`<div class="tips"><li class="w">${esc(conc.cliente)} concentra ${conc.pct.toFixed(0)}% da sua receita de projetos.</li></div>`:''}
    <div class="list">${lista.length?lista.map(p=>{const late=p.status==='entregue'&&p.previsto&&p.previsto<hojeISO();
      return `<div class="row"><div class="main"><b>${esc(p.cliente)}</b><span class="small muted">${esc(p.desc)}${p.previsto?' · previsto '+fmtD(p.previsto):''}${p.status==='pago'&&p.pago?' · pago '+fmtD(p.pago):''}${late?' · <span class="bad">atrasado</span>':''}</span></div>
        <div style="width:190px"><select data-st="${p.id}" aria-label="Status de ${esc(p.cliente)}">${ST.map(([k,l])=>`<option value="${k}" ${k===p.status?'selected':''}>${l}</option>`).join('')}</select></div>
        <span class="num">${money(p,true)}</span><button class="btn ghost sm" data-act="delProj" data-id="${p.id}">Excluir</button></div>`}).join(''):'<div class="empty">Cadastre seus projetos para acompanhar o que falta receber.</div>'}</div>
    <form class="form" id="fProj">
      <div class="field"><label for="pc">Cliente</label><input id="pc" required placeholder="Nome do cliente"></div>
      <div class="field" style="flex:2 1 170px"><label for="pd">Projeto</label><input id="pd" required placeholder="Ex.: Site institucional"></div>
      <div class="field"><label for="pm">Moeda</label><select id="pm">${moedaOpts()}</select></div>
      <div class="field"><label for="pv">Valor</label><input id="pv" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label for="ps">Status</label><select id="ps">${ST.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="pp">Pagamento previsto</label><input id="pp" type="date"></div>
      <button class="btn" type="submit">Adicionar</button>
    </form>
    <div class="small muted">Ao marcar como pago, o valor entra como renda de trabalho no mês do pagamento. Não lance o mesmo valor de novo no extrato.</div>
  </section>`;
}
function precoPanel(c){
  const ph=precoHora(c),cf=S.cfg,R=cf.regra;
  const fld=(id,label,key,v,step)=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" min="0" step="${step}" value="${v}" data-cfg="${key}"></div>`;
  const veredito=c.rendaW<=0?'Cadastre projetos pagos para comparar a sua hora real com o mínimo.'
    :ph.faltaSalario===0?'Seu salário já cobre os custos e a meta de investir. O que o trabalho trouxer é crescimento: invista boa parte.'
    :ph.hReal>=ph.hMinFalta?`Sua hora real (${eur(ph.hReal)}) está acima do mínimo (${eur(ph.hMinFalta)}). Bom sinal.`
    :`Sua hora real (${eur(ph.hReal)}) está abaixo do mínimo (${eur(ph.hMinFalta)}). Faltam ${eur(ph.faltaSalario-c.rendaW)} por mês: suba o preço, aumente as horas pagas ou corte custos.`;
  return `<section class="panel"><h2>Quanto cobrar</h2>
    <div class="small muted">Calcula o preço mínimo da sua hora para cobrir seus custos, a meta de investir e os impostos. Ajuste as horas e a reserva fiscal.</div>
    <div class="form">${fld('cfgH','Horas faturáveis por mês','horasMes',cf.horasMes,1)}${fld('cfgF','Reserva para impostos (% do trabalho)','fiscal',cf.fiscal,1)}${fld('cfgV','Quanto vale sua hora (€), para o retorno das ferramentas','valorHora',cf.valorHora,1)}</div>
    <div class="plan">
      <div class="p"><span>Custo mensal (pessoal + trabalho)</span><b class="num">${eur(ph.custo)}</b></div>
      <div class="p"><span>Com a meta de investir (${R.i}%)</span><b class="num">${eur(ph.comInv)}</b></div>
      <div class="p"><span>Faturamento bruto necessário (${cf.fiscal||0}% de impostos)</span><b class="num">${eur(ph.bruto)}</b></div>
      <div class="p"><span>Salário e rendas pessoais cobrem</span><b class="num">${eur(c.rendaP)}</b></div>
      <div class="p"><span>Falta faturar com o trabalho</span><b class="num">${eur(ph.faltaSalario)}</b></div>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Hora mínima (só trabalho)</div><div class="v num">${eur(ph.hMinTudo)}</div><div class="s">se o trabalho pagasse tudo</div></div>
      <div class="stat"><div class="k">Hora mínima (além do salário)</div><div class="v num">${eur(ph.hMinFalta)}</div></div>
      <div class="stat"><div class="k">Sua hora real no mês</div><div class="v num ${c.rendaW>0&&ph.faltaSalario>0?(ph.hReal>=ph.hMinFalta?'good':'bad'):''}">${eur(ph.hReal)}</div></div>
    </div>
    <ul class="tips"><li class="k">${esc(veredito)}</li></ul>
  </section>`;
}
function meiPanel(){
  const cf=S.cfg,ano=meiAno(),teto=cf.tetoMEI||0,pc=teto>0?ano/teto*100:0;
  if(cf.pais!=='ES'&&ano===0)return '';
  return `<section class="panel"><h2>MEI no Brasil, morando na Espanha</h2>
    <div class="small muted">Lance o MEI em reais (campo Moeda): o app converte pelo câmbio de ${cf.cambio||6} R$ por € com ${cf.convCusto||0}% de custo de conversão. Você ajusta esses valores na aba ajustes.</div>
    <div class="rule"><div class="head"><b>Faturamento do MEI em ${now.getFullYear()}</b><span class="num small">R$ ${ano.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} de R$ ${teto.toLocaleString('pt-BR')} (${pc.toFixed(0)}%)</span></div>
      <div class="bar ${pc>=100?'over':pc>=80?'warn':''}"><i style="width:${Math.min(100,pc)}%"></i></div></div>
    ${pc>=80?`<ul class="tips"><li class="${pc>=100?'b':'w'}">Você já usou ${pc.toFixed(0)}% do teto anual do MEI. Passar do limite muda o enquadramento e os impostos: confira com seu contador.</li></ul>`:''}
    <ul class="tips">
      <li class="k">O DAS do MEI é um valor fixo mensal em reais. Cadastre como saída recorrente em R$, categoria Impostos e taxas (extrato).</li>
      <li class="w">Morando na Espanha, em geral a renda de fora também entra na declaração de lá (IRPF), e existe tratado entre Brasil e Espanha contra dupla tributação. Por isso, coloque em "Reserva para impostos" uma alíquota estimada e confirme com um asesor fiscal que conheça os dois países. Confirme também se a sua autorização de residência e trabalho permite essa atividade.</li>
    </ul></section>`;
}
function vTrabalho(){
  const c=calc(cur),rc=recebiveis(),res=c.rendaW-c.work;
  return `
  <div class="stats">
    <div class="stat"><div class="k">Entrou do trabalho</div><div class="v num">${eur(c.rendaW)}</div><div class="s">projetos pagos ${eur(c.recebido)}</div></div>
    <div class="stat"><div class="k">Custo (IA e ferramentas)</div><div class="v num workc">${eur(c.work)}</div></div>
    <div class="stat"><div class="k">Resultado do trabalho</div><div class="v num ${res<0?'bad':'good'}">${eur(res)}</div></div>
    <div class="stat"><div class="k">A receber</div><div class="v num">${eur(rc.total)}</div></div>
    <div class="stat"><div class="k">Reserva para impostos</div><div class="v num">${eur(c.fiscal)}</div><div class="s">${S.cfg.fiscal||0}% do trabalho</div></div>
  </div>
  ${projPanel(c)}${meiPanel()}${precoPanel(c)}${subsPanel('w')}${orcPanel('w')}`;
}
function vPessoal(){
  const c=calc(cur),R=S.cfg.regra,gasto=c.needs+c.wants;
  const catsP=Object.entries(c.porCat).filter(([k])=>DCATS[k]==='n'||DCATS[k]==='d').sort((a,b)=>b[1]-a[1]),maxP=catsP.length?catsP[0][1]:1;
  return `
  <div class="stats">
    <div class="stat"><div class="k">Rendas pessoais</div><div class="v num">${eur(c.rendaP)}</div></div>
    <div class="stat"><div class="k">Gastos pessoais</div><div class="v num">${eur(gasto)}</div></div>
    <div class="stat"><div class="k">Necessidades</div><div class="v num">${eur(c.needs)}</div><div class="s">${c.disp>0?(c.needs/c.disp*100).toFixed(0):0}% da renda disponível</div></div>
    <div class="stat"><div class="k">Desejos</div><div class="v num">${eur(c.wants)}</div><div class="s">${c.disp>0?(c.wants/c.disp*100).toFixed(0):0}% da renda disponível</div></div>
    <div class="stat"><div class="k">Sobra pessoal</div><div class="v num ${c.rendaP-gasto<0?'bad':'good'}">${eur(c.rendaP-gasto)}</div><div class="s">rendas pessoais menos gastos</div></div>
  </div>
  <div class="grid2">
    <section class="panel"><h2>Regra ${R.n} / ${R.d} / ${R.i}</h2>
      <div class="small muted">Sobre a renda disponível (${eur(c.disp)}). Você pode mudar as porcentagens na aba ajustes.</div>
      ${rowBar(`Necessidades (${R.n}%)`,c.needs,c.disp*R.n/100,true)}
      ${rowBar(`Desejos (${R.d}%)`,c.wants,c.disp*R.d/100,true)}
      ${rowBar(`Investimentos (${R.i}%)`,c.invest,c.disp*R.i/100,false)}
    </section>
    <section class="panel"><h2>Para onde foi o dinheiro</h2>
      ${catsP.length?catsP.map(([k,v])=>`<div class="rule"><div class="head"><span>${esc(k)}</span><span class="num">${eur(v)}</span></div><div class="bar"><i style="width:${v/maxP*100}%"></i></div></div>`).join(''):'<div class="empty">Nenhum gasto pessoal neste mês ainda.</div>'}
    </section>
  </div>
  ${subsPanel('p')}${orcPanel('p')}`;
}
