/* ---------- caixa: contas, transferências, dívidas, metas ---------- */
const TIPOS_CONTA={caixa:'Caixa (conta corrente)',reserva:'Reserva de emergência',mei:'Caixa do MEI',outra:'Outra'};
const contaStr=a=>{const s=saldoConta(a),est=Math.abs(s-a.saldo)>0.004;return (noEur(a)?`${fmtM(s,a.moeda)} <span class="muted">(≈ ${eur(Ebal(a))})</span>`:eur(s))+(est?' <span class="tag">estimado</span>':'')};
function dividasPanel(){
  const dv=S.dividas,minimos=sum(dv.filter(d=>d.saldo>0),d=>d.minimo||0),base=Math.max(minimos,S.cfg.pgtoDivida||0);
  const cen=[base,base+100,base+250].filter((v,i,a)=>v>0&&a.indexOf(v)===i);
  const caixas=S.contas.filter(a=>a.tipo==='caixa');
  return `<section class="panel"><h2>Dívidas</h2>
    <div class="small muted">O app usa o método da avalanche: o dinheiro extra vai primeiro para a dívida com maior juros, e as demais ficam no mínimo.</div>
    <div class="list">${dv.length?dv.map(d=>`<div class="row" style="align-items:flex-start"><div class="main" style="flex-basis:220px"><b>${esc(d.nome)}</b>
        <div class="bar" style="margin:6px 0"><i style="width:${d.inicial>0?Math.round((1-d.saldo/d.inicial)*100):0}%"></i></div>
        <span class="small muted num">Saldo ${eur(d.saldo)} de ${eur(d.inicial)} · juros ${d.juros||0}% ao ano · mínimo ${eur(d.minimo||0)}</span></div>
      <form class="form" data-act="payDiv" data-id="${d.id}" style="flex:1 1 280px"><div class="field"><label for="dp${d.id}">Registrar pagamento (€)</label><input id="dp${d.id}" type="number" min="0.01" step="0.01" required></div>
        ${caixas.length?`<div class="field"><label for="dc${d.id}">Descontar da conta</label><select id="dc${d.id}"><option value="">(não descontar)</option>${caixas.map(a=>`<option value="${a.id}">${esc(a.nome)}</option>`).join('')}</select></div>`:''}
        <button class="btn sm" type="submit">Pagar</button></form>
      <button class="btn ghost sm" data-act="delDiv" data-id="${d.id}">Excluir</button></div>`).join(''):'<div class="empty">Nenhuma dívida cadastrada.</div>'}</div>
    <form class="form" id="fDiv">
      <div class="field" style="flex:2 1 160px"><label for="vn">Dívida</label><input id="vn" required placeholder="Ex.: Cartão de crédito"></div>
      <div class="field"><label for="vs">Saldo devedor (€)</label><input id="vs" type="number" min="0.01" step="0.01" required></div>
      <div class="field"><label for="vj">Juros (% ao ano)</label><input id="vj" type="number" min="0" step="0.1" placeholder="se souber"></div>
      <div class="field"><label for="vm">Mínimo por mês (€)</label><input id="vm" type="number" min="0" step="0.01"></div>
      <button class="btn" type="submit">Adicionar</button>
    </form>
    ${dv.some(d=>d.saldo>0)?`<div class="form"><div class="field" style="max-width:260px"><label for="cfgPd">Quanto posso pagar por mês nas dívidas (€)</label><input id="cfgPd" type="number" min="0" step="10" value="${S.cfg.pgtoDivida||''}" data-cfg="pgtoDivida" placeholder="${eur(minimos)}"></div></div>
    <div class="scroll"><table class="tbl"><thead><tr><th>Pagando por mês</th><th>Quita em</th><th>Juros estimados</th></tr></thead><tbody>${cen.map(v=>{const r=simDividas(v);return `<tr><td class="num">${eur(v)}</td><td>${r.meses===null?'nunca (aumente o valor)':r.meses+' meses ('+mesLabel(addM(baseMes(),r.meses))+')'}</td><td class="num">${eur(r.juros)}</td></tr>`}).join('')}</tbody></table></div>`:''}
  </section>`;
}
function contasPanel(){
  return `<section class="panel"><h2>Contas e saldos</h2>
    <div class="small muted">Atualize o saldo quando conferir o banco. Sem isso o app não sabe quanto dinheiro você tem de verdade. O caixa do MEI pode ficar em R$.</div>
    <div class="list">${S.contas.length?S.contas.map(a=>`<div class="row"><div class="main"><b>${esc(a.nome)}</b><span class="small muted"><span class="tag ${a.tipo==='mei'?'work':''}">${TIPOS_CONTA[a.tipo]}</span>${a.atualizado?' · atualizado em '+fmtD(a.atualizado):''}</span></div>
      <span class="num">${contaStr(a)}</span>
      <form class="form" data-act="updConta" data-id="${a.id}" style="flex:0 1 230px"><div class="field"><label for="cs${a.id}">Novo saldo (${sym(a.moeda)})</label><input id="cs${a.id}" type="number" step="0.01" required></div><button class="btn sm" type="submit">Atualizar</button></form>
      <button class="btn ghost sm" data-act="delConta" data-id="${a.id}">Excluir</button></div>`).join(''):'<div class="empty">Cadastre sua conta corrente para começar.</div>'}</div>
    <form class="form" id="fConta">
      <div class="field" style="flex:2 1 160px"><label for="cn2">Nome da conta</label><input id="cn2" required placeholder="Ex.: Conta corrente"></div>
      <div class="field"><label for="ct">Tipo</label><select id="ct">${Object.entries(TIPOS_CONTA).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="cmo">Moeda</label><select id="cmo">${moedaOpts()}</select></div>
      <div class="field"><label for="csd">Saldo</label><input id="csd" type="number" step="0.01" required></div>
      <button class="btn" type="submit">Adicionar conta</button>
    </form>
  </section>`;
}
function movPanel(){
  const nm=id=>{const a=S.contas.find(z=>z.id===id);return a?a.nome:'(fora do app)'};
  const opts=`<option value="">(fora do app, ex.: salário)</option>${S.contas.map(a=>`<option value="${a.id}">${esc(a.nome)}</option>`).join('')}`;
  const ult=[...S.movs].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8);
  const mesRes=sum(S.movs.filter(m=>m.data.startsWith(baseMes())&&(S.contas.find(a=>a.id===m.para)||{}).tipo==='reserva'),m=>m.valor);
  return `<section class="panel"><h2>Transferências entre contas</h2>
    <div class="small muted">Registre quando mover dinheiro, por exemplo do caixa para a reserva. Os saldos das duas contas são ajustados. Neste mês você levou ${eur(mesRes)} para a reserva.</div>
    <form class="form" id="fMov">
      <div class="field"><label for="mvd">De</label><select id="mvd">${opts}</select></div>
      <div class="field"><label for="mvp">Para</label><select id="mvp">${opts}</select></div>
      <div class="field"><label for="mvv">Valor (€)</label><input id="mvv" type="number" min="0.01" step="0.01" required></div>
      <div class="field"><label for="mvo">Observação</label><input id="mvo" placeholder="opcional"></div>
      <button class="btn" type="submit">Registrar</button>
    </form>
    ${ult.length?`<div class="list">${ult.map(m=>`<div class="row"><div class="main"><b>${esc(nm(m.de))} → ${esc(nm(m.para))}</b><span class="small muted">${fmtD(m.data)}${m.obs?' · '+esc(m.obs):''}</span></div><span class="num">${eur(m.valor)}</span></div>`).join('')}</div><div class="small muted">Para corrigir um erro, atualize o saldo da conta.</div>`:''}
  </section>`;
}
function vCaixa(){
  const x=ctxCoach(),pat=patrimonio(x).pat,pc=(v,t)=>t>0?Math.round(Math.min(1,v/t)*100):0;
  return `
  <div class="stats">
    <div class="stat"><div class="k">Caixa</div><div class="v num">${eur(x.caixa)}</div><div class="s">meta ${eur(x.metaCaixa)} (${pc(x.caixa,x.metaCaixa)}%)</div></div>
    <div class="stat"><div class="k">Reserva de emergência</div><div class="v num">${eur(x.reserva)}</div><div class="s">meta ${eur(x.metaReserva)} (${pc(x.reserva,x.metaReserva)}%)</div></div>
    <div class="stat"><div class="k">Caixa do MEI</div><div class="v num workc">${eur(x.mei)}</div></div>
    <div class="stat"><div class="k">Dívidas</div><div class="v num ${x.dTotal>0?'warn':''}">${eur(x.dTotal)}</div></div>
    <div class="stat"><div class="k">Patrimônio líquido</div><div class="v num ${pat<0?'bad':''}">${eur(pat)}</div><div class="s">tudo menos dívidas</div></div>
  </div>
  ${contasPanel()}${movPanel()}${dividasPanel()}${vMetas()}`;
}

function vAj(){
  const rg=S.cfg.regra,soma=rg.n+rg.d+rg.i,cats=Object.entries(S.cfg.cats||{});
  const fld=(id,l,attr,v,step)=>`<div class="field"><label for="${id}">${l}</label><input id="${id}" type="number" min="0" step="${step}" value="${v}" ${attr}></div>`;
  return `
  <section class="panel"><h2>Personalização</h2>
    <div class="small muted">Ajuste as metas ao seu perfil. A regra divide a renda disponível entre necessidades, desejos e investimento.</div>
    <div class="form">${fld('rgN','Necessidades (%)','data-regra="n"',rg.n,1)}${fld('rgD','Desejos (%)','data-regra="d"',rg.d,1)}${fld('rgI','Investir (%)','data-regra="i"',rg.i,1)}${fld('cfgR','Meses da reserva de emergência','data-cfg="mesesReserva"',S.cfg.mesesReserva,1)}${fld('cfgMC','Meses do caixa (conta corrente)','data-cfg="mesesCaixa"',S.cfg.mesesCaixa,1)}</div>
    ${soma!==100?`<div class="small warn" role="status">As porcentagens somam ${soma}%, e não 100%.</div>`:''}
    <h3>Moeda, país e MEI</h3>
    <div class="form">${fld('cfgC','Câmbio (R$ por 1 €)','data-cfg="cambio"',S.cfg.cambio,0.01)}${fld('cfgU','Câmbio (US$ por 1 €)','data-cfg="cambioUSD"',S.cfg.cambioUSD,0.01)}${fld('cfgCC','Custo de converter R$ em € (%)','data-cfg="convCusto"',S.cfg.convCusto,0.1)}${fld('cfgT','Teto anual do MEI (R$)','data-cfg="tetoMEI"',S.cfg.tetoMEI,1000)}
      <div class="field"><label for="cfgP">País (dicas fiscais)</label><select id="cfgP" data-cfgs="pais"><option value="ES" ${S.cfg.pais==='ES'?'selected':''}>Espanha</option><option value="outro" ${S.cfg.pais!=='ES'?'selected':''}>Outro</option></select></div></div>
    <div class="small muted">Atualize o câmbio quando quiser ver os valores em reais convertidos com mais precisão. Confira o teto vigente do MEI.</div>
    <h3>Categorias próprias</h3>
    <div class="list">${cats.length?cats.map(([k,g])=>`<div class="row"><div class="main"><b>${esc(k)}</b><span class="tag ${g==='w'?'work':''}">${GRUPOS.find(x=>x[0]===g)[1]}</span></div><button class="btn ghost sm" data-act="delCat" data-cat="${esc(k)}">Excluir</button></div>`).join(''):'<div class="empty">Nenhuma categoria própria ainda.</div>'}</div>
    <form class="form" id="fCat">
      <div class="field" style="flex:2 1 170px"><label for="cn">Nome da categoria</label><input id="cn" required placeholder="Ex.: Cursos"></div>
      <div class="field"><label for="cg">Grupo</label><select id="cg">${GRUPOS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div>
      <button class="btn" type="submit">Criar categoria</button>
    </form>
  </section>
  <section class="panel"><h2>Backup dos dados</h2>
    <div class="small muted">${HAS_DB?'Seus dados ficam no banco local deste computador, com backup diário automático. Você também pode copiar um backup em texto abaixo.':'Seus dados ficam só neste navegador. Copie o texto abaixo e guarde em um lugar seguro.'} Para restaurar ou levar para outro aparelho, cole no campo de importação.</div>
    <textarea id="bkOut" readonly aria-label="Dados para backup">${esc(JSON.stringify(S))}</textarea>
    <div><button class="btn" data-act="copyBk">Copiar backup</button></div>
    <div class="field"><label for="bkIn">Importar backup (cole aqui)</label><textarea id="bkIn" placeholder="Cole o texto do backup"></textarea></div>
    <div><button class="btn ghost" data-act="impBk">Importar</button></div>
    ${flash?`<div class="small ${flash.startsWith('Erro')?'bad':'good'}" role="status">${esc(flash)}</div>`:''}
  </section>
  ${llmSettingsPanel()}
  ${HAS_DB?`<section class="panel"><h2>Backup automático extra</h2>
    <div class="small muted">O app já guarda uma cópia diária no próprio computador (14 dias). Informe uma pasta sincronizada (OneDrive, Dropbox, pen drive) e a cópia diária também vai para lá.</div>
    <div class="form"><div class="field" style="flex:2 1 260px"><label for="bkDir">Pasta extra de backup</label><input id="bkDir" value="${esc(appSettings.backup_dir||'')}" placeholder="C:\\Users\\voce\\OneDrive\\Backups"></div><button class="btn" data-act="saveBk">Salvar pasta</button></div>
    <div class="small muted">Dica: ative também a criptografia do disco (BitLocker no Windows) para proteger seus dados financeiros.</div>
  </section>`:''}
  ${HAS_DB?`<section class="panel"><h2>Restaurar backup</h2>
    <div class="small muted">Volta o banco para a cópia de um dia anterior. Antes de restaurar, o app guarda uma cópia de segurança do estado atual.</div>
    <div><button class="btn ghost" data-act="listBk">Ver backups disponíveis</button></div>
    ${backups?(backups.length?`<div class="list">${backups.map(b=>`<div class="row"><div class="main"><b>${fmtD(b.data)}</b><span class="small muted">${Math.round(b.size/1024)} KB</span></div>${restoreAsk===b.name?`<button class="btn sm" data-act="doRestore">Confirmar restauração</button><button class="btn ghost sm" data-act="cancelRestore">Cancelar</button>`:`<button class="btn ghost sm" data-act="askRestore" data-name="${esc(b.name)}">Restaurar</button>`}</div>`).join('')}</div>`:'<div class="empty">Nenhum backup ainda. O primeiro é criado ao abrir o app.</div>'):''}
  </section>`:''}
  <section class="panel"><h2>Recomeçar</h2>
    <div class="small muted">Apaga tudo (inclusive os exemplos) e deixa o app em branco. Faça backup antes.</div>
    <div><button class="btn ghost" data-act="clear">Apagar tudo e começar do zero</button></div>
  </section>`;
}
