/* ---------- gráficos ---------- */
function chartHist(){
  const ms=[];for(let i=5;i>=0;i--)ms.push(addM(cur,-i));
  const d=ms.map(m=>{const c=calc(m);return {m,renda:c.renda,gasto:c.work+c.needs+c.wants,inv:c.invest}});
  const W=640,H=240,L=56,R=10,T=12,B=28,max=Math.max(1,...d.flatMap(x=>[x.renda,x.gasto,x.inv]));
  const y=v=>H-B-(H-T-B)*v/max,gw=(W-L-R)/d.length,bw=Math.min(22,gw/4);
  let g='';
  for(let i=0;i<=4;i++){const v=max*i/4;g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${v>=1000?(+(v/1000).toFixed(1)).toLocaleString('pt-BR')+' mil':Math.round(v)}</text>`}
  d.forEach((x,i)=>{const cx=L+gw*i+gw/2;
    [['renda','--c-renda',-1],['gasto','--c-gasto',0],['inv','--c-inv',1]].forEach(([k,col,o])=>{const h=(H-B)-y(x[k]);g+=`<rect x="${cx+o*(bw+2)-bw/2}" y="${y(x[k])}" width="${bw}" height="${Math.max(0,h)}" rx="3" fill="var(${col})"/>`});
    g+=`<text x="${cx}" y="${H-8}" text-anchor="middle">${new Date(+x.m.slice(0,4),+x.m.slice(5)-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</text>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Renda, gastos e investimentos dos últimos 6 meses">${g}</svg>
  <div class="legend"><span><i style="background:var(--c-renda)"></i>Renda</span><span><i style="background:var(--c-gasto)"></i>Gastos (pessoais e trabalho)</span><span><i style="background:var(--c-inv)"></i>Investido</span></div>`;
}
function chartProj(pts,anos){
  const W=640,H=260,L=64,R=12,T=14,B=28,max=Math.max(...pts.map(p=>p.tot),1);
  const x=m=>L+(W-L-R)*m/(pts.length-1),y=v=>H-B-(H-T-B)*v/max;
  const line=k=>pts.filter((_,i)=>i%Math.max(1,Math.floor(pts.length/120))===0||i===pts.length-1).map((p,i)=>(i?'L':'M')+x(p.m).toFixed(1)+' '+y(p[k]).toFixed(1)).join('');
  let g='';
  for(let i=0;i<=4;i++){const v=max*i/4,yy=y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L-6}" y="${yy+4}" text-anchor="end">${v>=1e6?(+(v/1e6).toFixed(1)).toLocaleString('pt-BR')+' mi':v>=1e3?(+(v/1e3).toFixed(1)).toLocaleString('pt-BR')+' mil':Math.round(v)}</text>`}
  const step=anos>12?Math.ceil(anos/6):anos>6?2:1;
  for(let a=0;a<=anos;a+=step)g+=`<text x="${x(a*12)}" y="${H-8}" text-anchor="middle">${a} ${a===1?'ano':'anos'}</text>`;
  const last=pts[pts.length-1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção de patrimônio">${g}
    <path d="${line('inv')}" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="5 4"/>
    <path d="${line('tot')}" fill="none" stroke="var(--c-renda)" stroke-width="3"/>
    <circle cx="${x(last.m)}" cy="${y(last.tot)}" r="4.5" fill="var(--c-renda)"/></svg>
  <div class="legend"><span><i style="background:var(--c-renda)"></i>Com juros</span><span><i style="background:var(--muted)"></i>Só o que você depositou</span></div>`;
}

/* ---------- recomendações ---------- */
function tips(c){
  const t=[],R=S.cfg.regra,cf=S.cfg;
  if(c.renda<=0)return [['','Cadastre sua renda (salário e clientes) na aba extrato para liberar as análises.']];
  const pl=plano(c),rc=recebiveis(),conc=concentracao(),roi=roiTools(),ph=precoHora(c);
  if(c.saldo<0)t.push(['b',`Neste mês você gastou ${eur(-c.saldo)} a mais do que entrou. Corte primeiro em desejos e assinaturas.`]);
  if(c.porCat['Dívidas e juros'])t.push(['b','Há gastos com dívidas e juros. Quitar dívida cara rende mais do que qualquer investimento: priorize isso.']);
  if(c.disp>0&&c.needs/c.disp>R.n/100)t.push(['w',`Necessidades consomem ${(c.needs/c.disp*100).toFixed(0)}% da renda disponível (meta até ${R.n}%). Reveja moradia, contas e transporte.`]);
  if(c.disp>0&&c.wants/c.disp>R.d/100)t.push(['w',`Desejos e assinaturas pessoais somam ${(c.wants/c.disp*100).toFixed(0)}% da renda disponível (meta até ${R.d}%).`]);
  // trabalho: onde está o dinheiro
  if(rc.atrasados.length)t.push(['b',`${rc.atrasados.length} projeto(s) entregue(s) com pagamento atrasado, somando ${eur(sum(rc.atrasados,p=>E(p,true)))}. Cobre hoje: é dinheiro que já é seu.`]);
  if(conc&&conc.n===1&&S.projetos.length>1)t.push(['w','Toda a sua receita de projetos vem de um único cliente. Se ele sair, a renda de trabalho some: busque pelo menos mais um.']);
  else if(conc&&conc.n>1&&conc.pct>60)t.push(['w',`${conc.cliente} representa ${conc.pct.toFixed(0)}% da sua receita de projetos. Dependência alta: diversifique clientes.`]);
  if(c.rendaW>0&&!cf.fiscal)t.push(['w',`Você tem renda de trabalho e ainda não reservou nada para impostos. Defina a porcentagem na aba trabalho para não gastar dinheiro que não é seu.${cf.pais==='ES'?' Morando na Espanha, a renda do MEI também pode ser tributada lá: confirme com um asesor fiscal e use uma alíquota estimada.':''}`]);
  if(roi.semDados)t.push(['k','Informe na aba trabalho quantas horas por mês cada ferramenta de IA poupa. Assim o app mostra quais se pagam e quais você deve cortar.']);
  else{const ruins=roi.rows.filter(r=>r.s.horas>0&&r.saldo<0);
    if(ruins.length)t.push(['k',`Ferramentas que não se pagam em tempo poupado: ${ruins.map(r=>r.s.nome).join(', ')}. Use mais ou cancele.`])}
  if(c.rendaW>0&&ph.faltaSalario>0&&ph.hReal<ph.hMinFalta)t.push(['w',`Sua hora real está em ${eur(ph.hReal)}, abaixo do mínimo de ${eur(ph.hMinFalta)} para cobrir seus custos e a meta de investir. Suba o preço, aumente as horas pagas ou corte custos.`]);
  if(c.work>0){
    const p=c.work/c.renda*100;
    if(c.rendaW>0&&c.rendaW<c.work)t.push(['k',`Suas ferramentas e IA custam ${eur(c.work)}, mais do que o trabalho trouxe de entrada (${eur(c.rendaW)}). O salário está bancando a diferença. Veja se o retorno compensa.`]);
    else t.push(['k',`Custo de trabalho (IA e ferramentas): ${eur(c.work)}, ${p.toFixed(0)}% da renda total.${p>15?' Acima de 15%: revise o uso de cada ferramenta.':''}`]);
  }
  if(c.invest<pl.alvo)t.push(['',`Meta de investir ${R.i}% da renda disponível: ${eur(pl.alvo)}. Neste mês você investiu ${eur(c.invest)}. Veja o plano de aporte na aba investir.`]);
  else t.push(['',`Você investiu ${eur(c.invest)}, acima da meta de ${R.i}% (${eur(pl.alvo)}). Mantenha o ritmo.`]);
  if(pl.falta>0)t.push(['',`Reserva de emergência: faltam ${eur(pl.falta)} para a meta de ${eur(pl.meta)} (${cf.mesesReserva} meses de custo básico). Ela vem antes dos outros investimentos.`]);
  Object.entries(S.limites).forEach(([cat,lim])=>{const v=c.porCat[cat]||0;if(lim>0&&v>lim)t.push(['b',`Você passou do limite de ${cat}: ${eur(v)} de ${eur(lim)}.`]);else if(lim>0&&v>lim*.9)t.push(['w',`${cat} está em ${(v/lim*100).toFixed(0)}% do limite (${eur(v)} de ${eur(lim)}).`])});
  const pausadas=sum(S.subs.filter(s=>!s.ativa),s=>E(s));
  if(pausadas>0)t.push(['',`Com as assinaturas pausadas você economiza ${eur(pausadas)} por mês. Investido por 10 anos a ${cf.taxa}% ao ano, isso viraria ${eur(fv(pausadas,cf.taxa,10))}.`]);
  if(c.saldo>0)t.push(['',`Saldo livre de ${eur(c.saldo)}. Se aportar tudo por 10 anos a ${cf.taxa}% ao ano, seriam ${eur(fv(c.saldo,cf.taxa,10))}.`]);
  return t;
}
