/* ---------- canal: YouTube, Twitch e outras plataformas ---------- */
const PLATAFORMAS=['YouTube','Twitch','TikTok','Kick','Outra'];
const FONTES=['AdSense (anúncios)','Membros do canal','Super Chat / Super Thanks','Twitch: assinaturas','Twitch: bits','Twitch: anúncios','Patrocínio','Afiliados','Merch / loja','Doações','Outra'];
const CAMPOS={
  YouTube:[['subs','Inscritos'],['horas','Horas de exibição (12 meses)'],['shorts','Views de Shorts (90 dias)'],['uploads','Uploads públicos (90 dias)'],['posts','Publicações nesta semana']],
  Twitch:[['seg','Seguidores'],['min','Minutos transmitidos (30 dias)'],['dias','Dias diferentes com live (30 dias)'],['media','Média de espectadores (30 dias)'],['posts','Lives nesta semana']],
  TikTok:[['seg','Seguidores'],['views','Views (30 dias)'],['posts','Vídeos nesta semana']],
  Kick:[['seg','Seguidores'],['media','Média de espectadores (30 dias)'],['posts','Lives nesta semana']],
  Outra:[['seg','Seguidores / inscritos'],['posts','Publicações nesta semana']]};
// Requisitos conhecidos de monetização. Mudam com o tempo: confirme sempre na plataforma.
const REQ={
  YouTube:[
    {id:'n1',nome:'Nível 1: apoio dos fãs (membros, Super Chat)',regras:[{k:'subs',alvo:500,rot:'inscritos',eta:true},{k:'uploads',alvo:3,rot:'uploads públicos nos últimos 90 dias'}],
      alt:[{k:'horas',alvo:3000,rot:'horas de exibição em 12 meses',eta:true},{k:'shorts',alvo:3000000,rot:'views de Shorts em 90 dias',eta:true}]},
    {id:'n2',nome:'Nível 2: anúncios',regras:[{k:'subs',alvo:1000,rot:'inscritos',eta:true}],
      alt:[{k:'horas',alvo:4000,rot:'horas de exibição em 12 meses',eta:true},{k:'shorts',alvo:10000000,rot:'views de Shorts em 90 dias',eta:true}]}],
  Twitch:[{id:'af',nome:'Afiliado',regras:[{k:'seg',alvo:50,rot:'seguidores',eta:true},{k:'min',alvo:500,rot:'minutos transmitidos em 30 dias'},{k:'dias',alvo:7,rot:'dias diferentes com live em 30 dias'},{k:'media',alvo:3,rot:'espectadores médios em 30 dias'}],alt:[]}]};
let canalSel='';
const dayNum=iso=>{const [y,m,d]=String(iso).split('-').map(Number);return Math.floor(Date.UTC(y,m-1,d)/86400000)};
const addDaysISO=(iso,n)=>{const [y,m,d]=iso.split('-').map(Number),t=new Date(y,m-1,d+n);return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())};
const fmtI=v=>Math.round(+v||0).toLocaleString('pt-BR');
function ultMetricas(canalId,n){return S.metricas.filter(m=>m.canal===canalId).sort((a,b)=>a.data.localeCompare(b.data)).slice(-(n||6))}
function etaMetrica(snaps,k,alvo){
  const pts=snaps.filter(s=>typeof s.dados[k]==='number').map(s=>[dayNum(s.data),s.dados[k]]);
  if(!pts.length)return {ok:false,why:'sem dados'};
  const cur=pts[pts.length-1][1];if(cur>=alvo)return {done:true,cur};
  if(pts.length<3)return {ok:false,cur,why:'registre pelo menos 3 semanas para estimar a data'};
  const n=pts.length,sx=sum(pts,p=>p[0]),sy=sum(pts,p=>p[1]),sxy=sum(pts,p=>p[0]*p[1]),sxx=sum(pts,p=>p[0]*p[0]),den=n*sxx-sx*sx;
  const slope=den?(n*sxy-sx*sy)/den:0;
  if(slope<=0)return {ok:false,cur,why:'ainda sem crescimento nas últimas semanas'};
  const dias=Math.ceil((alvo-cur)/slope);
  return {ok:true,cur,dias,data:addDaysISO(hojeISO(),dias),semana:slope*7};
}
function statusRequisitos(c){
  const snaps=ultMetricas(c.id,8),last=snaps.length?snaps[snaps.length-1].dados:{},defs=REQ[c.plataforma]||[];
  return defs.map(def=>{
    const mk=r=>{const cur=+last[r.k]||0;return {...r,cur,pct:Math.min(1,cur/r.alvo),ok:cur>=r.alvo,eta:r.eta?etaMetrica(snaps,r.k,r.alvo):null}};
    const regras=def.regras.map(mk),alt=(def.alt||[]).map(mk);
    const okRegras=regras.every(r=>r.ok),okAlt=!alt.length||alt.some(a=>a.ok),melhorAlt=alt.length?[...alt].sort((a,b)=>b.pct-a.pct)[0]:null;
    const pct=(sum(regras,r=>r.pct)+(melhorAlt?melhorAlt.pct:0))/(regras.length+(melhorAlt?1:0));
    return {def,regras,alt,ok:okRegras&&okAlt,pct};
  });
}
const receitaCanalMes=m=>sum(S.receitasCanal.filter(r=>r.data.startsWith(m)),r=>E(r,true));
function resumoCanal(){
  const b=baseMes(),m3=[0,1,2].map(i=>receitaCanalMes(addM(b,-i)));
  return {canais:S.canais.length,receitaMes:receitaCanalMes(b),media3:sum(m3,v=>v)/3,total:sum(S.receitasCanal,r=>E(r,true))};
}
function canalOnboarding(){
  return `<section class="panel hero"><h2>Seu canal</h2>
    <div class="small muted">Cadastre o canal para acompanhar o caminho até a monetização, as métricas da semana e, quando começar a receber, a renda de YouTube, Twitch e outras plataformas.</div>
    <form class="form" id="fCanal">
      <div class="field" style="flex:2 1 180px"><label for="cvn">Nome do canal</label><input id="cvn" required placeholder="Ex.: Meu canal"></div>
      <div class="field"><label for="cvp">Plataforma</label><select id="cvp">${PLATAFORMAS.map(p=>`<option>${p}</option>`).join('')}</select></div>
      <div class="field" style="flex:2 1 200px"><label for="cvu">Endereço (opcional)</label><input id="cvu" placeholder="youtube.com/@..."></div>
      <button class="btn" type="submit">Adicionar canal</button>
    </form></section>`;
}
function caminhoPanel(c){
  const st=statusRequisitos(c);
  if(!st.length)return fold('cam','Caminho até a monetização',`<div class="empty">Esta plataforma não tem requisitos cadastrados no app. Você ainda pode registrar métricas e receitas.</div>`,true);
  const linha=r=>`<div class="rule"><div class="head"><span>${esc(r.rot)}</span><span class="num small ${r.ok?'good':''}">${fmtI(r.cur)} de ${fmtI(r.alvo)}</span></div><div class="bar ${r.ok?'ok':'work'}"><i style="width:${Math.round(r.pct*100)}%"></i></div>
    ${r.eta?`<div class="small muted">${r.eta.done?'Meta atingida.':r.eta.ok?`No ritmo atual, chega em cerca de ${r.eta.dias} dias (${fmtD(r.eta.data)}). Crescimento de ${fmtI(r.eta.semana)} por semana.`:esc(r.eta.why)}</div>`:''}</div>`;
  const body=st.map(s=>`<div class="rule" style="gap:10px"><div class="head"><b>${esc(s.def.nome)}</b><span class="tag ${s.ok?'':'work'}">${s.ok?'requisitos atingidos':Math.round(s.pct*100)+'% do caminho'}</span></div>
    ${s.regras.map(linha).join('')}${s.alt.length?`<div class="small muted">E pelo menos um destes:</div>${s.alt.map(linha).join('')}`:''}</div>`).join('<hr style="border:0;border-top:1px solid var(--line);width:100%">')
    +`<div class="small muted">Requisitos conhecidos até agora. Eles mudam e podem variar por país: confirme no YouTube Studio ou no painel da Twitch antes de contar com eles. A data estimada usa o ritmo das suas últimas semanas e é só uma projeção.</div>`;
  return fold('cam','Caminho até a monetização',body,true);
}
function metricasPanel(c){
  const campos=CAMPOS[c.plataforma]||CAMPOS.Outra,snaps=ultMetricas(c.id,8);
  const meta=S.cfg.canal.metaPosts||2,weeks=[...snaps].reverse();let streak=0;for(const s of weeks){if((+s.dados.posts||0)>=meta)streak++;else break}
  const body=`<div class="small muted">Registre uma vez por semana, copiando os números do YouTube Studio ou da Twitch. Com 3 semanas o app estima a data de cada meta. Sua meta de publicação é de ${meta} por semana${streak?` (sequência atual: ${streak} semana(s))`:''}.</div>
    <form class="form" id="fMet">
      <div class="field"><label for="mdt">Data</label><input id="mdt" type="date" value="${hojeISO()}" required></div>
      ${campos.map(([k,l])=>`<div class="field"><label for="mk_${k}">${l}</label><input id="mk_${k}" type="number" min="0" step="1" data-mk="${k}"></div>`).join('')}
      <button class="btn" type="submit">Registrar</button>
    </form>
    <div class="form"><div class="field" style="max-width:240px"><label for="cvMeta">Meta de publicações por semana</label><input id="cvMeta" type="number" min="1" step="1" value="${meta}" data-ccfg="metaPosts"></div></div>
    ${snaps.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Data</th>${campos.map(([,l])=>`<th>${esc(l)}</th>`).join('')}<th></th></tr></thead><tbody>${[...snaps].reverse().map(s=>`<tr><td>${fmtD(s.data)}</td>${campos.map(([k])=>`<td class="num">${s.dados[k]===undefined?'—':fmtI(s.dados[k])}</td>`).join('')}<td><button class="btn ghost sm" data-act="delMet" data-id="${s.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum registro ainda.</div>'}`;
  return fold('met','Métricas da semana',body,!snaps.length||dayNum(hojeISO())-dayNum(snaps[snaps.length-1].data)>=6);
}
function receitasPanel(c){
  const b=baseMes(),lista=S.receitasCanal.filter(r=>r.canal===c.id).sort((a,b2)=>b2.data.localeCompare(a.data)).slice(0,30);
  const meses=[0,1,2,3,4,5].map(i=>addM(b,-i)).reverse().map(m=>[m,sum(S.receitasCanal.filter(r=>r.canal===c.id&&r.data.startsWith(m)),r=>E(r,true))]);
  const mx=Math.max(1,...meses.map(z=>z[1]));
  const body=`<div class="small muted">Você ainda não precisa ter recebido nada. Quando o primeiro pagamento chegar, registre aqui: ele entra automaticamente na sua renda de trabalho, no painel e no coach. Pagamentos em R$ ou US$ são convertidos pelo câmbio do dia do registro.</div>
    <form class="form" id="fRec">
      <div class="field"><label for="rcd">Data</label><input id="rcd" type="date" value="${hojeISO()}" required></div>
      <div class="field" style="flex:2 1 170px"><label for="rcf">Fonte</label><select id="rcf">${FONTES.map(f=>`<option>${esc(f)}</option>`).join('')}</select></div>
      <div class="field"><label for="rcm">Moeda</label><select id="rcm">${moedaOpts()}</select></div>
      <div class="field"><label for="rcv">Valor</label><input id="rcv" type="number" min="0.01" step="0.01" required></div>
      <div class="field" style="flex:2 1 170px"><label for="rco">Observação</label><input id="rco" placeholder="opcional"></div>
      <button class="btn" type="submit">Registrar receita</button>
    </form>
    ${S.receitasCanal.some(r=>r.canal===c.id)?`<div class="rule">${meses.map(([m,v])=>`<div class="head"><span>${mesLabel(m)}</span><span class="num small">${eur(v)}</span></div><div class="bar work"><i style="width:${Math.round(v/mx*100)}%"></i></div>`).join('')}</div>`:''}
    <div class="list">${lista.length?lista.map(r=>`<div class="row"><div class="main"><b>${esc(r.fonte)}</b><span class="small muted">${fmtD(r.data)}${r.obs?' · '+esc(r.obs):''}</span></div><span class="num good">+ ${money(r,true)}</span><button class="btn ghost sm" data-act="delRec" data-id="${r.id}">Excluir</button></div>`).join(''):'<div class="empty">Nenhuma receita registrada ainda. Tudo bem: o app já está pronto para quando começar.</div>'}</div>`;
  return fold('rec','Receitas do canal',body,S.receitasCanal.some(r=>r.canal===c.id));
}
function simCanal(){return {views:0,rpm:0,membros:0,precoMembro:0,patrocinio:0,doacoes:0,afiliados:0,...(S.cfg.canal.sim||{})}}
function simPanel(){
  const s=simCanal(),ads=s.views*s.rpm/1000,mem=s.membros*s.precoMembro,total=ads+mem+s.patrocinio+s.doacoes+s.afiliados,meta=S.cfg.metaExtra||0;
  const outros=mem+s.patrocinio+s.doacoes+s.afiliados,viewsNec=s.rpm>0&&meta>0?Math.max(0,(meta-outros)/s.rpm*1000):null;
  const fld=(k,l,st)=>`<div class="field"><label for="cs_${k}">${l}</label><input id="cs_${k}" type="number" min="0" step="${st||1}" value="${s[k]||''}" data-csim="${k}" placeholder="0"></div>`;
  const body=`<div class="small muted">Monte cenários com as suas próprias suposições. O app não sabe quanto o seu canal vai render: o RPM (quanto você ganha a cada mil views) varia muito com o assunto, o público e o país. Quando monetizar, use o RPM real do YouTube Studio.</div>
    <div class="form">${fld('views','Views por mês')}${fld('rpm','RPM (€ por mil views)',0.1)}${fld('membros','Membros pagantes')}${fld('precoMembro','Preço do membro (€/mês)',0.5)}${fld('patrocinio','Patrocínios por mês (€)')}${fld('doacoes','Doações por mês (€)')}${fld('afiliados','Afiliados por mês (€)')}</div>
    <div class="stats"><div class="stat"><div class="k">Anúncios</div><div class="v num">${eur(ads)}</div></div><div class="stat"><div class="k">Por mês</div><div class="v num">${eur(total)}</div></div><div class="stat"><div class="k">Por ano</div><div class="v num">${eur(total*12)}</div></div></div>
    ${meta>0?`<ul class="tips"><li class="k">Sua meta de renda extra é ${eur(meta)} por mês. ${total>=meta?'Neste cenário você chega lá.':viewsNec!==null?`Com esse RPM e os outros ganhos, você precisaria de cerca de ${fmtI(viewsNec)} views por mês.`:'Informe o RPM para ver quantas views precisa.'}</li></ul>`:''}`;
  return fold('sim','Simulador de receita',body,false);
}
const CHECK=[
  ['ck1','Confirmar com um gestor ou asesor se, morando na Espanha, a renda do canal exige registro como autónomo ou outro trâmite antes de receber.'],
  ['ck2','Conferir se meu contrato de trabalho e minha autorização de residência permitem essa renda extra.'],
  ['ck3','Criar a conta AdSense e preencher as informações fiscais pedidas pelo YouTube (criadores de fora dos EUA costumam precisar enviar dados fiscais).'],
  ['ck4','Escolher a conta bancária que vai receber e comparar as taxas de conversão de moeda.'],
  ['ck5','Definir a porcentagem de reserva para impostos na aba trabalho.'],
  ['ck6','Separar os custos do canal (equipamento, programas) nas categorias de trabalho para ver o lucro de verdade.'],
  ['ck7','Definir uma meta de publicação por semana e registrar as métricas toda semana.']];
function checkPanel(){
  const ck=S.cfg.canal.checklist||{},feitos=CHECK.filter(([k])=>ck[k]).length;
  const body=`<div class="small muted">Para não ser pego de surpresa quando a monetização chegar. ${feitos} de ${CHECK.length} concluídos. Regras de imposto e de trabalho variam: o app lembra, mas quem confirma é um profissional.</div>
    <div class="list">${CHECK.map(([k,t])=>`<label class="check" style="padding:6px 0;align-items:flex-start"><input type="checkbox" data-cklist="${k}" ${ck[k]?'checked':''}>${esc(t)}</label>`).join('')}</div>`;
  return fold('chk','Antes do primeiro pagamento',body,!S.receitasCanal.length);
}
function vCanal(){
  if(!S.canais.length)return canalOnboarding();
  const c=S.canais.find(z=>z.id===canalSel)||S.canais[0];canalSel=c.id;
  const rs=resumoCanal(),st=statusRequisitos(c),monet=st.some(s=>s.ok);
  return `
  <div class="stats">
    <div class="stat"><div class="k">Receita do canal no mês</div><div class="v num">${eur(rs.receitaMes)}</div><div class="s">média de 3 meses ${eur(rs.media3)}</div></div>
    <div class="stat"><div class="k">Receita acumulada</div><div class="v num">${eur(rs.total)}</div></div>
    <div class="stat"><div class="k">Monetização</div><div class="v ${monet||rs.total>0?'good':''}" style="font-size:1.05rem">${rs.total>0?'recebendo':monet?'requisitos atingidos':'ainda não'}</div><div class="s">${esc(c.plataforma)}</div></div>
  </div>
  <section class="panel"><h2>Canais</h2>
    <div class="form">${S.canais.map(z=>`<button class="btn ${z.id===c.id?'':'ghost'} sm" data-act="selCanal" data-id="${z.id}">${esc(z.nome)} · ${esc(z.plataforma)}</button>`).join('')}</div>
    <details><summary class="small muted" style="cursor:pointer">Adicionar ou remover canal</summary>
      <form class="form" id="fCanal" style="margin-top:10px">
        <div class="field" style="flex:2 1 180px"><label for="cvn">Nome do canal</label><input id="cvn" required></div>
        <div class="field"><label for="cvp">Plataforma</label><select id="cvp">${PLATAFORMAS.map(p=>`<option>${p}</option>`).join('')}</select></div>
        <div class="field" style="flex:2 1 200px"><label for="cvu">Endereço (opcional)</label><input id="cvu"></div>
        <button class="btn" type="submit">Adicionar</button><button class="btn ghost" type="button" data-act="delCanal" data-id="${c.id}">Remover "${esc(c.nome)}"</button></form></details>
  </section>
  ${caminhoPanel(c)}${metricasPanel(c)}${receitasPanel(c)}${simPanel()}${checkPanel()}`;
}
