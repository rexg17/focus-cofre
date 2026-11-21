/* ---------- telas ---------- */
const rowBar=(nome,real,alvo,limite,cls='')=>{const p=alvo>0?real/alvo*100:0;const over=limite&&p>100;
  return `<div class="rule"><div class="head"><b>${nome}</b><span class="num small ${over?'bad':''}">${eur(real)} de ${eur(alvo)}</span></div><div class="bar ${over?'over':cls}"><i style="width:${Math.min(100,p)}%"></i></div></div>`};
function vResumo(){
  const c=calc(cur);
  const catsP=Object.entries(c.porCat).filter(([k])=>DCATS[k]!=='w').sort((a,b)=>b[1]-a[1]);
  const catsW=Object.entries(c.porCat).filter(([k])=>DCATS[k]==='w').sort((a,b)=>b[1]-a[1]);
  const maxP=catsP.length?catsP[0][1]:1,maxW=catsW.length?catsW[0][1]:1;
  const res=c.rendaW-c.work;
  const R=S.cfg.regra,rc=recebiveis(),pat=sum(S.carteira,a=>Ea(a,'atual')),custoB=essencialMedio(),folga=custoB>0?reservaAtual()/custoB:null;
  return `
  <div class="stats">
    <div class="stat"><div class="k">Entradas</div><div class="v num">${eur(c.renda)}</div><div class="s">salário ${eur(c.rendaP)} · trabalho ${eur(c.rendaW)}</div></div>
    <div class="stat"><div class="k">Custo do trabalho</div><div class="v num workc">${eur(c.work)}</div><div class="s">IA e ferramentas</div></div>
    <div class="stat"><div class="k">Gastos pessoais</div><div class="v num">${eur(c.needs+c.wants)}</div><div class="s">necessidades e desejos</div></div>
    <div class="stat"><div class="k">Investido</div><div class="v num">${eur(c.invest)}</div><div class="s">${c.disp>0?(c.invest/c.disp*100).toFixed(0):0}% da renda disponível</div></div>
    <div class="stat"><div class="k">Saldo livre</div><div class="v num ${c.saldo<0?'bad':'good'}">${eur(c.saldo)}</div><div class="s">depois de tudo</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="k">Patrimônio investido</div><div class="v num">${eur(pat)}</div></div>
    <div class="stat"><div class="k">A receber (trabalho)</div><div class="v num">${eur(rc.total)}</div><div class="s ${rc.atrasados.length?'bad':''}">${rc.atrasados.length?rc.atrasados.length+' atrasado(s)':'sem atrasos'}</div></div>
    <div class="stat"><div class="k">Reserva para impostos</div><div class="v num">${eur(c.fiscal)}</div><div class="s">${S.cfg.fiscal||0}% do trabalho</div></div>
    <div class="stat"><div class="k">Folga financeira</div><div class="v num ${folga!==null&&folga<3?'warn':''}">${folga===null?'—':folga.toFixed(1).replace('.',',')+' meses'}</div><div class="s">reserva ÷ custo básico</div></div>
  </div>
  <section class="panel"><h2>Últimos 6 meses</h2>${chartHist()}</section>
  <div class="grid2">
    <section class="panel"><h2>Regra ${R.n} / ${R.d} / ${R.i}</h2>
      <div class="small muted">Sobre a renda disponível (${eur(c.disp)}): entradas menos custo do trabalho e reserva para impostos.</div>
      ${rowBar(`Necessidades (${R.n}%)`,c.needs,c.disp*R.n/100,true)}
      ${rowBar(`Desejos e assinaturas (${R.d}%)`,c.wants,c.disp*R.d/100,true)}
      ${rowBar(`Investimentos (${R.i}%)`,c.invest,c.disp*R.i/100,false)}
    </section>
    <section class="panel"><h2>Trabalho: IA e ferramentas</h2>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div><div class="small muted">Entrou do trabalho</div><b class="num">${eur(c.rendaW)}</b></div>
        <div><div class="small muted">Resultado do trabalho</div><b class="num ${res<0?'bad':'good'}">${eur(res)}</b></div>
      </div>
      ${catsW.length?catsW.map(([k,v])=>`<div class="rule"><div class="head"><span>${esc(k)}</span><span class="num">${eur(v)}</span></div><div class="bar work"><i style="width:${v/maxW*100}%"></i></div></div>`).join(''):'<div class="empty">Sem custos de trabalho neste mês.</div>'}
    </section>
  </div>
  <section class="panel"><h2>Para onde foi o dinheiro pessoal</h2>
    ${catsP.length?catsP.map(([k,v])=>`<div class="rule"><div class="head"><span>${esc(k)}</span><span class="num">${eur(v)}</span></div><div class="bar"><i style="width:${v/maxP*100}%"></i></div></div>`).join(''):'<div class="empty">Nenhum gasto neste mês ainda.</div>'}
  </section>
  <section class="panel"><h2>Recomendações para você</h2>
    <ul class="tips">${tips(c).map(([k,t])=>`<li class="${k}">${esc(t)}</li>`).join('')}</ul>
  </section>`;
}
