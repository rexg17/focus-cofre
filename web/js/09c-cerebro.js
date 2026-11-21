/* ---------- cérebro local: anomalias, tendências, cenários e explicações ---------- */
const mediana=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
function anomalias(){
  const b=baseMes(),atual=calc(b),prev=[1,2,3].map(i=>calc(addM(b,-i))),out=[];
  const cats=new Set([...Object.keys(atual.porCat),...prev.flatMap(p=>Object.keys(p.porCat))]);
  cats.forEach(cat=>{
    if(DCATS[cat]==='i'||cat==='Dívidas e juros')return;
    const hist=prev.map(p=>p.porCat[cat]||0).filter(v=>v>0);
    if(hist.length<2)return;
    const media=sum(hist,v=>v)/hist.length,a=atual.porCat[cat]||0,delta=a-media;
    if(media>=20&&a>media*1.5&&delta>=30)out.push({tipo:'categoria',cat,atual:a,media,delta,pct:delta/media*100});
  });
  // despesa isolada muito acima do normal da categoria (últimos 90 dias)
  const desde=addDaysISO(hojeISO(),-90),porC={};
  S.lanc.filter(x=>x.tipo==='d'&&!x.rec&&x.data>=desde&&DCATS[x.cat]!=='i'&&x.cat!=='Dívidas e juros').forEach(x=>{(porC[x.cat]=porC[x.cat]||[]).push(E(x))});
  Object.entries(porC).forEach(([cat,v])=>{if(v.length<5)return;const med=mediana(v),mx=Math.max(...v);if(mx>med*4&&mx>=80)out.push({tipo:'isolada',cat,valor:mx,mediana:med})});
  return out.sort((a,b)=>(b.delta||b.valor)-(a.delta||a.valor)).slice(0,5);
}
function tendencias(){
  const b=baseMes(),ms=[3,2,1,0].map(i=>calc(addM(b,-i))).filter(m=>m.renda>0);
  if(ms.length<3)return {ok:false};
  const taxa=ms.map(m=>m.disp>0?(m.invest+Math.max(0,m.saldo))/m.disp:0),gasto=ms.map(m=>m.needs+m.wants+m.work),rw=ms.map(m=>m.rendaW);
  const slope=a=>{const n=a.length,mx=(n-1)/2,my=sum(a,v=>v)/n;return sum(a.map((v,i)=>(i-mx)*(v-my)),v=>v)/sum(a.map((_,i)=>(i-mx)**2),v=>v)};
  const sp=slope(taxa),sg=slope(gasto);
  const mediaRw=sum(rw,v=>v)/rw.length,dp=Math.sqrt(sum(rw,v=>(v-mediaRw)**2)/rw.length),cv=mediaRw>0?dp/mediaRw:0;
  return {ok:true,meses:ms.length,taxaPoupanca:taxa,taxaAtual:taxa[taxa.length-1],poupanca:sp>0.01?'subindo':sp<-0.01?'caindo':'estável',gasto:sg>20?'subindo':sg<-20?'caindo':'estável',gastoAtual:gasto[gasto.length-1],variacaoGasto:sg,rendaExtraVolatil:cv>0.5,cvRendaExtra:cv};
}
function ritmoMeses(cap,x){
  const falC=Math.max(0,x.metaCaixa-x.caixa),falR=Math.max(0,x.metaReserva-x.reserva);
  if(cap<=0)return null;
  const dm=x.dTotal>0?simDividas(Math.max(cap*.7,sum(x.dv,d=>d.minimo||0))).meses:0;
  return dm===null?null:Math.ceil(falC/cap)+dm+Math.ceil(falR/cap);
}
let ese={corte:0,extra:0};
function esePanel(x){
  const cenarios=[['Hoje',x.cap],['Cortando '+eur(ese.corte)+' por mês',x.cap+ese.corte],['Ganhando '+eur(ese.extra)+' a mais por mês',x.cap+ese.extra],['Os dois juntos',x.cap+ese.corte+ese.extra]];
  const body=`<div class="small muted">Teste ideias antes de decidir. O app refaz o prazo para completar caixa, dívidas e reserva com a capacidade mensal alterada (hoje ${eur(x.cap)}).</div>
    <div class="form"><div class="field"><label for="eseC">E se eu cortar (€ por mês)</label><input id="eseC" type="number" min="0" step="10" value="${ese.corte||''}" data-ese="corte" placeholder="0"></div>
      <div class="field"><label for="eseE">E se eu ganhar a mais (€ por mês)</label><input id="eseE" type="number" min="0" step="10" value="${ese.extra||''}" data-ese="extra" placeholder="0"></div></div>
    <div class="scroll"><table class="tbl"><thead><tr><th>Cenário</th><th>Capacidade</th><th>Tudo pronto em</th></tr></thead><tbody>${cenarios.map(([n,c])=>{const m=ritmoMeses(c,x);return `<tr><td>${esc(n)}</td><td class="num">${eur(c)}</td><td>${m===null?'sem estimativa':m===0?'já concluído':m+' meses ('+mesLabel(addM(x.base,m))+')'}</td></tr>`}).join('')}</tbody></table></div>`;
  return fold('ese','E se…?',body,false);
}
function insightsPanel(){
  const an=anomalias(),tr=tendencias(),itens=[];
  an.forEach(a=>itens.push(a.tipo==='categoria'?['w',`${a.cat} está ${eur(a.delta)} acima da sua média dos últimos meses (${eur(a.atual)} contra ${eur(a.media)}, +${a.pct.toFixed(0)}%).`]:['w',`Há uma despesa isolada de ${eur(a.valor)} em ${a.cat}, bem acima do seu normal (${eur(a.mediana)}).`]));
  if(tr.ok){
    itens.push(['',`Taxa de poupança: ${(tr.taxaAtual*100).toFixed(0)}% neste mês. Tendência dos últimos ${tr.meses} meses: ${tr.poupanca}.`]);
    if(tr.gasto==='subindo')itens.push(['w',`Seus gastos totais estão subindo cerca de ${eur(tr.variacaoGasto)} por mês nos últimos meses.`]);
    if(tr.rendaExtraVolatil)itens.push(['k','Sua renda de trabalho varia bastante de um mês para o outro. Ao planejar, conte só com a parte mais baixa dela e trate o resto como bônus.']);
  }
  const body=itens.length?`<ul class="tips">${itens.map(([k,t])=>`<li class="${k}">${esc(t)}</li>`).join('')}</ul>`:'<div class="empty">Nada fora do normal por enquanto. Com mais meses de dados o app detecta mudanças nos seus hábitos.</div>';
  return fold('ins','O que mudou nos seus hábitos',body,an.length>0);
}
