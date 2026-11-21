/* ---------- melhorias: vencimentos, patrimônio, seções dobráveis ---------- */
const foldState={};
const fold=(id,title,body,def)=>{const o=id in foldState?foldState[id]:def;return `<details class="panel" data-fold="${id}" ${o?'open':''}><summary><h2>${title}</h2></summary><div class="fold-body">${body}</div></details>`};
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.fold)foldState[d.dataset.fold]=d.open},true);
function patrimonio(x){
  const carteira=sum(S.carteira.filter(a=>a.classe!=='Reserva de emergência'),a=>Ea(a,'atual'));
  return {caixa:x.caixa,reserva:x.reserva,mei:x.mei,carteira,dividas:x.dTotal,pat:x.caixa+x.reserva+x.mei+carteira-x.dTotal};
}
const r2=v=>Math.round(v*100)/100;
function vencimentos(dias){
  const hoje=new Date(now.getFullYear(),now.getMonth(),now.getDate()),out=[];
  for(let k=0;k<=dias;k++){
    const dt=new Date(hoje);dt.setDate(hoje.getDate()+k);
    const m=mk(dt.getFullYear(),dt.getMonth()),dia=dt.getDate(),iso=m+'-'+pad(dia);
    subsMes(m).filter(s=>s.ativa&&+s.dia===dia).forEach(s=>out.push({d:iso,t:s.nome,v:E(s),tipo:'saída'}));
    lancMes(m).filter(z=>z.data===iso&&z.cat!=='Investimento'&&z.cat!=='Dívidas e juros').forEach(z=>out.push({d:iso,t:z.desc,v:z.tipo==='r'?E(z,true):E(z),tipo:z.tipo==='r'?'entrada':'saída'}));
    S.projetos.filter(p=>['andamento','entregue'].includes(p.status)&&p.previsto===iso).forEach(p=>out.push({d:iso,t:p.cliente+': '+p.desc,v:E(p,true),tipo:'entrada'}));
    if(S.cfg.pais==='ES'&&meiAno()>0&&dia===20)out.push({d:iso,t:'DAS do MEI (confira o valor no portal)',v:0,tipo:'lembrete'});
  }
  return out;
}
function vencPanel(x){
  const v=vencimentos(14),sai=sum(v.filter(z=>z.tipo==='saída'),z=>z.v),ent=sum(v.filter(z=>z.tipo==='entrada'),z=>z.v);
  const body=v.length?`<div class="small muted">Nos próximos 14 dias: entram <b class="num good">${eur(ent)}</b> e saem <b class="num">${eur(sai)}</b>. Caixa atual: ${eur(x.caixa)}.</div>
    <div class="list">${v.map(z=>`<div class="row"><div class="main"><b>${esc(z.t)}</b><span class="small muted">${fmtD(z.d)}</span></div>${z.tipo==='lembrete'?'<span class="tag work">lembrete</span>':`<span class="num ${z.tipo==='entrada'?'good':''}">${z.tipo==='entrada'?'+':'−'} ${eur(z.v)}</span>`}</div>`).join('')}</div>`
    :'<div class="empty">Nenhuma cobrança ou recebimento previsto nos próximos 14 dias.</div>';
  return fold('venc','Próximos 14 dias',body,true);
}
function chartPat(sn){
  const W=640,H=200,L=60,R=14,T=12,B=28,vals=sn.map(s=>s.pat),mx=Math.max(...vals),mn=Math.min(...vals),rg=(mx-mn)||1;
  const y=v=>H-B-(H-T-B)*(v-mn)/rg,gw=(W-L-R)/Math.max(1,sn.length-1),xs=i=>L+gw*i;
  let g='';
  for(let i=0;i<=3;i++){const v=mn+rg*i/3;g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${Math.abs(v)>=1000?(+(v/1000).toFixed(1)).toLocaleString('pt-BR')+' mil':Math.round(v)}</text>`}
  g+=`<path d="${sn.map((s,i)=>(i?'L':'M')+xs(i).toFixed(1)+' '+y(s.pat).toFixed(1)).join('')}" fill="none" stroke="var(--c-renda)" stroke-width="3"/>`;
  sn.forEach((s,i)=>{g+=`<circle cx="${xs(i)}" cy="${y(s.pat)}" r="4" fill="var(--c-renda)"/>`;if(i===0||i===sn.length-1||sn.length<=6)g+=`<text x="${xs(i)}" y="${H-8}" text-anchor="middle">${fmtD(s.d).slice(0,5)}</text>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do patrimônio líquido">${g}</svg>`;
}
function patPanel(){
  const sn=S.checkins.filter(c=>c.snap&&typeof c.snap.pat==='number').sort((a,b)=>a.data.localeCompare(b.data)).map(c=>({d:c.data,...c.snap})).slice(-12);
  if(sn.length<2)return fold('pat','Evolução do patrimônio',`<div class="empty">Faça pelo menos 2 check-ins para ver como o seu patrimônio líquido evolui. Cada check-in guarda uma foto dos seus saldos.</div>`,false);
  const ult=sn[sn.length-1],ant=sn[sn.length-2],tot=ult.pat-sn[0].pat;
  return fold('pat','Evolução do patrimônio',`<div class="small muted">Patrimônio líquido (caixa, reserva, caixa do MEI e investimentos, menos dívidas): <b class="num">${eur(ult.pat)}</b>. Desde o último check-in: <b class="num ${ult.pat-ant.pat>=0?'good':'bad'}">${ult.pat-ant.pat>=0?'+':'−'} ${eur(Math.abs(ult.pat-ant.pat))}</b>. Desde ${fmtD(sn[0].d)}: <b class="num ${tot>=0?'good':'bad'}">${tot>=0?'+':'−'} ${eur(Math.abs(tot))}</b>.</div>${chartPat(sn)}`,true);
}
function vCoach(){
  if(!S.cfg.diagFeito&&!S.demo)return diagPanel();
  const x=ctxCoach(),deg=degraus(x),at=deg.findIndex(d=>!d.ok),ac=acoes(x),al=alocacao(x),sd=saude(x),pv=previsao(6),ck=checkinInfo(),cf=S.cfg;
  const prim=ac[0],rest=ac.slice(1,4),temCaixa=S.contas.some(a=>a.tipo==='caixa');
  const neg=pv.find(o=>o.saldo<0),baixo=pv.find(o=>o.saldo<x.metaCaixa*.5);
  const itens=['Lancei os gastos desta semana','Cobrei ou conferi os pagamentos a receber','Atualizei o saldo das contas','Transferi para a reserva/dívida o que o plano pede'];
  return `
  <section class="panel hero"><div class="small muted">Seu degrau agora</div>
    <h2>${at<0?'Todos os degraus concluídos':`Degrau ${at+1} de 6: ${esc(deg[at].n)}`}</h2>
    ${at>=0?`<div class="small muted">${esc(deg[at].desc)}</div><div class="bar"><i style="width:${Math.round(deg[at].p*100)}%"></i></div><div class="small num">${Math.round(deg[at].p*100)}% concluído</div>`:''}
  </section>
  <section class="panel"><h2>Sua próxima ação</h2>
    <div class="plan"><div class="p"><div><b>${esc(prim.t)}</b><div class="small muted">${esc(prim.why)}</div></div>${prim.btn?`<button class="btn sm" data-tab="${prim.tab}">${esc(prim.btn)}</button>`:''}</div></div>
    ${prim.det&&prim.det.length?`<details><summary class="small muted" style="cursor:pointer">Como o app chegou a isso</summary><div class="list">${prim.det.map(([k,v])=>`<div class="row"><span>${esc(k)}</span><b class="num">${esc(v)}</b></div>`).join('')}</div></details>`:''}
    ${rest.length?`<div class="small muted">Depois disso:</div><ul class="tips">${rest.map(a=>`<li><b>${esc(a.t)}</b> ${esc(a.why)} ${a.btn&&a.tab!=='coach'?`<button class="btn ghost sm" data-tab="${a.tab}">${esc(a.btn)}</button>`:''}</li>`).join('')}</ul>`:''}
  </section>
  <section class="panel"><h2>Plano do mês (pague-se primeiro)</h2>
    <div class="small muted">Quando o salário cair, separe o dinheiro nesta ordem. Base: sua capacidade mensal de ${eur(x.cap)} (média dos últimos meses, contando de volta o que você já pagou de dívida).</div>
    ${al.length?`<div class="plan">${al.map(([k,v,d])=>`<div class="p"><div><b>${esc(k)}</b><div class="small muted">${esc(d)}</div></div><b class="num">${eur(v)}</b></div>`).join('')}</div>`:'<div class="empty">Sem saldo livre para direcionar. Veja os cortes na aba pessoal e a renda extra abaixo.</div>'}
    ${cf.prazoReserva>0&&x.metaReserva>x.reserva?`<div class="small muted">Para a reserva ficar pronta em ${cf.prazoReserva} meses, guarde ${eur((x.metaReserva-x.reserva)/cf.prazoReserva)} por mês.</div>`:''}
  </section>
  ${vencPanel(x)}
  ${insightsPanel()}
  <div class="grid2">
    ${fold('deg','Degraus',`<div class="list">${deg.map((d,i)=>`<div class="row"><div class="main"><b>${i+1}. ${esc(d.n)}</b><span class="small muted">${esc(d.desc)}</span><div class="bar ${d.p>=.999?'ok':''}" style="margin-top:6px"><i style="width:${Math.round(d.p*100)}%"></i></div></div><span class="tag ${d.ok?'':'work'}">${d.ok?'concluído':i===at?'agora':'depois'}</span></div>`).join('')}</div>`,true)}
    ${fold('saude',`Saúde financeira: ${sd.score}/100`,`<div class="small muted">Nível ${sd.nivel}. Cada parte pesa no total.</div>${sd.parts.map(p=>`<div class="rule"><div class="head"><span>${esc(p.n)}</span><span class="num small">${Math.round(p.v*100)}% · peso ${p.w}</span></div><div class="bar ${p.v<.4?'warn':p.v>=.999?'ok':''}"><i style="width:${Math.round(p.v*100)}%"></i></div></div>`).join('')}`,true)}
  </div>
  ${fold('ck','Check-in semanal',`<div class="small muted">${ck.feito?'Check-in desta semana feito.':'Ainda não fez o check-in desta semana.'} Sequência: <b class="num">${ck.streak}</b> semana(s). ${ck.ult?'Último: '+fmtD(ck.ult)+'.':''} Cada check-in guarda uma foto do seu patrimônio.</div>
    <div class="list">${itens.map((t,i)=>`<label class="check" style="padding:6px 0"><input type="checkbox" id="ci${i}">${esc(t)}</label>`).join('')}</div>
    <div><button class="btn" data-act="doCheckin" ${ck.feito?'disabled':''}>Concluir check-in</button></div>`,!ck.feito)}
  ${patPanel()}
  ${fold('prev','Previsão do caixa (6 meses)',`<div class="small muted">Parte do seu saldo em conta corrente (${eur(x.caixa)}) e soma entradas esperadas (salário, pagamentos previstos) e saídas (fixos, assinaturas, gasto variável médio e dívida mínima). O saldo mostrado é o que sobra no caixa antes de você transferir para a reserva, dívidas ou investimentos.</div>
    ${temCaixa?chartPrev(pv,x.metaCaixa):'<div class="empty">Cadastre uma conta de caixa na aba caixa para ver a previsão.</div>'}
    ${neg?`<ul class="tips"><li class="b">Seu caixa fica negativo em ${mesLabel(neg.m)}. Ajuste gastos, antecipe recebimentos ou use a reserva só se for emergência.</li></ul>`:baixo&&temCaixa?`<ul class="tips"><li class="w">Em ${mesLabel(baixo.m)} o caixa cai abaixo da metade da meta.</li></ul>`:''}
    <div class="scroll"><table class="tbl"><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>${pv.map(o=>`<tr><td>${mesLabel(o.m)}</td><td class="num">${eur(o.ent)}</td><td class="num">${eur(o.sai)}</td><td class="num ${o.saldo<0?'bad':''}">${eur(o.saldo)}</td></tr>`).join('')}</tbody></table></div>`,false)}
  ${prazosPanel(x)}
  ${esePanel(x)}
  ${chatPanel()}`;
}

/* ---------- coach ---------- */
function chartPrev(out,metaC){
  const W=640,H=200,L=56,R=10,T=12,B=28;
  const vals=out.map(o=>o.saldo).concat([0,metaC||0]),mx=Math.max(...vals),mn=Math.min(...vals),rg=(mx-mn)||1;
  const y=v=>H-B-(H-T-B)*(v-mn)/rg,gw=(W-L-R)/out.length;
  let g='';
  for(let i=0;i<=3;i++){const v=mn+rg*i/3;g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${Math.abs(v)>=1000?(+(v/1000).toFixed(1)).toLocaleString('pt-BR')+' mil':Math.round(v)}</text>`}
  g+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-dasharray="4 3"/>`;
  let pts=out.map((o,i)=>[L+gw*i+gw/2,y(o.saldo)]);
  g+=`<path d="${pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')}" fill="none" stroke="var(--c-renda)" stroke-width="3"/>`;
  out.forEach((o,i)=>{g+=`<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4" fill="${o.saldo<0?'var(--bad)':'var(--c-renda)'}"/><text x="${pts[i][0]}" y="${H-8}" text-anchor="middle">${mesLabel(o.m).split(' ')[0]}</text>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Previsão do saldo do caixa">${g}</svg>`;
}
function diagPanel(){
  return `<section class="panel hero"><h2>Diagnóstico inicial</h2>
    <div class="small muted">Preencha o que souber. Tudo é opcional e pode ser ajustado depois. Isso monta seu plano e calcula as metas.</div>
    <form class="form" id="fDiag">
      <div class="field"><label for="dgS">Salário líquido por paga (€)</label><input id="dgS" type="number" min="0" step="0.01"></div>
      <div class="field"><label for="dgP">Pagas por ano</label><select id="dgP"><option value="12">12</option><option value="14">14 (com pagas extras)</option></select></div>
      <div class="field"><label for="dgC">Saldo na conta corrente (€)</label><input id="dgC" type="number" min="0" step="0.01"></div>
      <div class="field"><label for="dgR">Reserva de emergência atual (€)</label><input id="dgR" type="number" min="0" step="0.01"></div>
      <div class="field"><label for="dgD">Dívida total (€)</label><input id="dgD" type="number" min="0" step="0.01" placeholder="ex.: 2000"></div>
      <div class="field"><label for="dgJ">Juros da dívida (% ao ano)</label><input id="dgJ" type="number" min="0" step="0.1" placeholder="se souber"></div>
      <div class="field"><label for="dgM">Pagamento mínimo mensal (€)</label><input id="dgM" type="number" min="0" step="0.01"></div>
      <div class="field"><label for="dgE">Renda extra desejada por mês (€)</label><input id="dgE" type="number" min="0" step="1" placeholder="ainda não sei"></div>
      <div class="field"><label for="dgZ">Prazo para a reserva (meses)</label><input id="dgZ" type="number" min="0" step="1" placeholder="ainda não sei"></div>
      <button class="btn" type="submit">Montar meu plano</button>
      <button class="btn ghost" type="button" data-act="skipDiag">Pular por enquanto</button>
    </form></section>`;
}
function prazosPanel(x){
  const cf=S.cfg,falC=Math.max(0,x.metaCaixa-x.caixa),falR=Math.max(0,x.metaReserva-x.reserva),tot=falC+x.dTotal+falR;
  const fn=funil();
  const dm=x.dTotal>0?simDividas(Math.max(x.cap*.7,sum(x.dv,d=>d.minimo||0))).meses:0;
  const mesesRitmo=x.cap>0&&dm!==null?Math.ceil(falC/x.cap)+dm+Math.ceil(falR/x.cap):null;
  const prazos=[6,12,18,24,36];
  const und=!(cf.metaExtra>0&&cf.prazoReserva>0);
  const body=`
    <div class="small muted">Se você ainda não sabe o prazo ou a renda extra, use os cenários. Falta formar: ${eur(tot)} (caixa ${eur(falC)}, dívidas ${eur(x.dTotal)}, reserva ${eur(falR)}). Sua capacidade mensal hoje: <b class="num">${eur(x.cap)}</b>.</div>
    ${mesesRitmo!==null&&tot>0?`<ul class="tips"><li class="k">No ritmo atual, você completa tudo em cerca de ${mesesRitmo} meses (${mesLabel(addM(x.base,mesesRitmo))}). É uma estimativa simples.</li></ul>`:(tot>0?'<ul class="tips"><li class="w">Com a capacidade atual não dá para estimar o prazo. Corte gastos ou aumente a renda.</li></ul>':'')}
    ${tot>0?`<div class="scroll"><table class="tbl"><thead><tr><th>Prazo</th><th>Guardar por mês</th><th>Renda extra necessária</th><th></th></tr></thead><tbody>
      ${prazos.map(p=>{const need=tot/p,extra=Math.max(0,need-x.cap);return `<tr><td>${p} meses</td><td class="num">${eur(need)}</td><td class="num ${extra>0?'warn':'good'}">${extra>0?eur(extra):'cabe no seu saldo'}</td><td><button class="btn ghost sm" data-act="usePrazo" data-p="${p}" data-extra="${Math.ceil(extra)}">Usar este</button></td></tr>`}).join('')}
    </tbody></table></div>`:''}
    <div class="form">
      <div class="field"><label for="cfgPz">Prazo escolhido para a reserva (meses)</label><input id="cfgPz" type="number" min="0" step="1" value="${cf.prazoReserva||''}" data-cfg="prazoReserva" placeholder="ainda não sei"></div>
      <div class="field"><label for="cfgMe">Meta de renda extra por mês (€)</label><input id="cfgMe" type="number" min="0" step="1" value="${cf.metaExtra||''}" data-cfg="metaExtra" placeholder="ainda não sei"></div>
      <div class="field"><label for="cfgTf">Taxa de fechamento estimada (%)</label><input id="cfgTf" type="number" min="1" max="100" step="1" value="${cf.taxaFechamento}" data-cfg="taxaFechamento"></div>
    </div>
    ${fn.meta>0?`<ul class="tips"><li class="k">${fn.ticket>0?`Com ticket médio de ${eur(fn.ticket)} e taxa de fechamento de ${(fn.taxa*100).toFixed(0)}%${fn.real?'':' (estimada, até você ter 5 propostas decididas)'}, para ganhar ${eur(fn.meta)} por mês você precisa fechar ${fn.proj} projeto(s) e enviar cerca de ${fn.props} proposta(s) por mês.`:'Cadastre projetos na aba trabalho para o app calcular quantas propostas você precisa enviar.'}</li></ul>`:''}
  `;
  return fold('prazos','Prazos e renda extra',body,und);
}
