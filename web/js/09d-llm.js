/* ---------- coach com IA (Claude): conversa + ferramentas locais ---------- */
const LLM_SYSTEM=`Você é o coach financeiro pessoal do usuário, dentro do app Focus Cofre. Fale em português do Brasil, com tom direto, caloroso e prático.

Contexto: o usuário é empregado na Espanha, ganha em euros e tem renda extra de um MEI no Brasil (em reais). Está formando caixa, quitando dívidas e montando uma reserva de emergência, e quer aumentar a renda, inclusive com um canal de conteúdo que ainda não foi monetizado.

Regras:
- Nunca invente números. Para qualquer valor, prazo ou comparação sobre as finanças do usuário, chame as ferramentas e use o que elas devolverem. Se faltar dado, diga o que falta.
- Explique o raciocínio em poucas frases e termine com uma próxima ação concreta.
- A ordem de prioridade é: organizar os dados, formar o caixa, quitar dívida cara, completar a reserva, investir todo mês e crescer a renda extra.
- Você não é consultor fiscal, jurídico nem de investimentos regulado. Em imposto (Espanha e Brasil), registro como autónomo, residência e escolha de produtos, dê noções gerais e recomende confirmar com um asesor fiscal ou outro profissional.
- Nunca prometa retorno. Mostre riscos e incertezas.
- Escreva em texto simples, sem tabelas nem markdown pesado, em parágrafos curtos.`;
const rdn=(v,n=2)=>Math.round((+v||0)*10**n)/10**n;
const deepR=o=>Array.isArray(o)?o.map(deepR):(o&&typeof o==='object')?Object.fromEntries(Object.entries(o).map(([k,v])=>[k,deepR(v)])):(typeof o==='number'?rdn(o):o);
const clampN=(v,a,b,d)=>{v=parseFloat(v);return isNaN(v)?d:Math.min(b,Math.max(a,v))};
const obj=(props,req)=>({type:'object',properties:props,required:req||[],additionalProperties:false});
const LLM_TOOLS=[
  {name:'visao_geral',description:'Resumo atual das finanças do usuário: renda, custo essencial, caixa, reserva, dívidas, degrau do plano, nota de saúde e próximas ações. Use primeiro quando a pergunta for geral.',input_schema:obj({})},
  {name:'gastos_por_categoria',description:'Média mensal de gasto por categoria nos últimos N meses (sem descrições de lançamentos).',input_schema:obj({meses:{type:'integer',minimum:1,maximum:12}},['meses'])},
  {name:'anomalias_e_tendencias',description:'Mudanças nos hábitos: categorias acima da média, despesas isoladas altas e tendência de poupança e gasto.',input_schema:obj({})},
  {name:'previsao_caixa',description:'Previsão do saldo da conta de caixa para os próximos meses, com entradas e saídas esperadas.',input_schema:obj({meses:{type:'integer',minimum:1,maximum:12}},['meses'])},
  {name:'simular_dividas',description:'Simula quitar as dívidas pelo método avalanche com um pagamento mensal total. Devolve meses e juros estimados.',input_schema:obj({orcamento_mensal:{type:'number',minimum:0}},['orcamento_mensal'])},
  {name:'simular_reserva',description:'Estima em quantos meses o caixa e a reserva ficam completos se o usuário guardar um valor fixo por mês (sem contar rendimento).',input_schema:obj({aporte_mensal:{type:'number',minimum:0}},['aporte_mensal'])},
  {name:'simular_investimento',description:'Projeta um investimento com aportes mensais, juros compostos e imposto estimado sobre o ganho (escala de poupança da Espanha). A rentabilidade é uma suposição do usuário, não uma previsão.',input_schema:obj({aporte_mensal:{type:'number',minimum:0},anos:{type:'integer',minimum:1,maximum:50},rentabilidade_anual_pct:{type:'number',minimum:0,maximum:30},valor_inicial:{type:'number',minimum:0}},['aporte_mensal','anos','rentabilidade_anual_pct'])},
  {name:'quanto_cobrar',description:'Preço mínimo da hora de trabalho extra para cobrir custos, meta de investir e impostos, comparado com a hora real do mês.',input_schema:obj({})},
  {name:'canal_resumo',description:'Situação do canal de conteúdo: progresso até os requisitos de monetização, estimativa de data e receita registrada.',input_schema:obj({})},
  {name:'e_se',description:'Refaz o prazo para completar caixa, dívidas e reserva se o usuário cortar gastos ou ganhar renda extra por mês.',input_schema:obj({corte_mensal:{type:'number',minimum:0},renda_extra_mensal:{type:'number',minimum:0}})}
];
const TOOL_IMPL={
  visao_geral(){const x=ctxCoach(),deg=degraus(x),at=deg.findIndex(d=>!d.ok),sd=saude(x);
    return {hoje:hojeISO(),moeda_base:'EUR',pais:S.cfg.pais,renda_mensal:x.c.renda,renda_de_trabalho:x.c.rendaW,custo_de_trabalho:x.c.work,gastos_pessoais:x.c.needs+x.c.wants,
      custo_essencial_medio:x.ess,saldo_livre_do_mes:x.c.saldo,investido_no_mes:x.c.invest,capacidade_mensal_para_metas:x.cap,
      caixa:{atual:x.caixa,meta:x.metaCaixa},reserva:{atual:x.reserva,meta:x.metaReserva,meses_alvo:S.cfg.mesesReserva},
      dividas:{total:x.dTotal,quantidade:x.dv.length,maior_juros_ao_ano:Math.max(0,...x.dv.map(d=>d.juros||0))},
      degrau_atual:at<0?'todos concluídos':{numero:at+1,de:6,nome:deg[at].n,progresso_pct:deg[at].p*100},saude:{nota:sd.score,nivel:sd.nivel},
      proximas_acoes:acoes(x).slice(0,3).map(a=>a.t),meta_renda_extra:S.cfg.metaExtra||0,prazo_reserva_meses:S.cfg.prazoReserva||0};},
  gastos_por_categoria(i){const n=clampN(i.meses,1,12,3),b=baseMes(),tot={};
    for(let k=0;k<n;k++){const c=calc(addM(b,-k));Object.entries(c.porCat).forEach(([cat,v])=>{tot[cat]=(tot[cat]||0)+v})}
    return {meses:n,media_mensal_por_categoria:Object.fromEntries(Object.entries(tot).sort((a,b2)=>b2[1]-a[1]).map(([k,v])=>[k,v/n]))};},
  anomalias_e_tendencias(){return {anomalias:anomalias(),tendencias:tendencias()};},
  previsao_caixa(i){return {caixa_inicial:caixaTotal(),meta_do_caixa:ctxCoach().metaCaixa,meses:previsao(clampN(i.meses,1,12,6)).map(o=>({mes:o.m,entradas:o.ent,saidas:o.sai,saldo:o.saldo}))};},
  simular_dividas(i){const o=clampN(i.orcamento_mensal,0,1e6,0),r=simDividas(o);return {orcamento_mensal:o,total_das_dividas:sum(S.dividas.filter(d=>d.saldo>0),d=>d.saldo),quita_em_meses:r.meses,juros_estimados:r.juros,observacao:r.meses===null?'não quita com esse valor':''};},
  simular_reserva(i){const a=clampN(i.aporte_mensal,0,1e6,0),x=ctxCoach(),falC=Math.max(0,x.metaCaixa-x.caixa),falR=Math.max(0,x.metaReserva-x.reserva);
    return {aporte_mensal:a,falta_no_caixa:falC,falta_na_reserva:falR,meses_para_completar:a>0?Math.ceil((falC+falR)/a):null,dividas_nao_incluidas:x.dTotal};},
  simular_investimento(i){const c={inicial:clampN(i.valor_inicial,0,1e9,0),aporte:clampN(i.aporte_mensal,0,1e6,0),taxa:clampN(i.rentabilidade_anual_pct,0,30,5),anos:Math.round(clampN(i.anos,1,50,10))},p=project(c),l=p.pts[p.pts.length-1],g=Math.max(0,l.tot-l.inv),imp=S.cfg.pais==='ES'?impostoAhorro(g):0;
    return {...c,total_investido:l.inv,patrimonio_final:l.tot,ganho_bruto:g,imposto_estimado_resgatando_tudo:imp,liquido_apos_imposto:l.tot-imp};},
  quanto_cobrar(){const c=calc(baseMes()),ph=precoHora(c);return {horas_faturaveis_por_mes:S.cfg.horasMes,reserva_para_impostos_pct:S.cfg.fiscal||0,custo_mensal:ph.custo,faturamento_bruto_necessario:ph.bruto,renda_pessoal_cobre:c.rendaP,falta_faturar_com_trabalho:ph.faltaSalario,hora_minima_so_trabalho:ph.hMinTudo,hora_minima_alem_do_salario:ph.hMinFalta,hora_real_no_mes:ph.hReal};},
  canal_resumo(){const rs=resumoCanal();return {canais:S.canais.map(c=>({nome:c.nome,plataforma:c.plataforma,
      requisitos:statusRequisitos(c).map(s=>({nivel:s.def.nome,atingido:s.ok,progresso_pct:s.pct*100,itens:[...s.regras,...s.alt].map(r=>({item:r.rot,atual:r.cur,alvo:r.alvo,dias_estimados:r.eta&&r.eta.ok?r.eta.dias:null}))}))})),
      receita_no_mes:rs.receitaMes,media_3_meses:rs.media3,receita_acumulada:rs.total};},
  e_se(i){const x=ctxCoach(),c=clampN(i.corte_mensal,0,1e6,0),e=clampN(i.renda_extra_mensal,0,1e6,0);
    return {capacidade_hoje:x.cap,meses_hoje:ritmoMeses(x.cap,x),com_corte:{valor:c,meses:ritmoMeses(x.cap+c,x)},com_renda_extra:{valor:e,meses:ritmoMeses(x.cap+e,x)},com_os_dois:{meses:ritmoMeses(x.cap+c+e,x)}};}
};
function execTool(nome,input){
  try{const f=TOOL_IMPL[nome];if(!f)return {erro:'ferramenta desconhecida'};return deepR(f(input||{}))}
  catch(e){return {erro:'falha ao calcular: '+e.message}}
}
let chat={msgs:[],pend:false,erro:'',aviso:'',ferramentas:[],ultimo:null};
async function chamarLLM(body){
  const r=await fetch('/api/llm',{method:'POST',headers:{'Content-Type':'application/json','X-Cofre-Token':TOKEN},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({erro:'resposta inválida'}));
  if(!r.ok)throw new Error(j.erro||('erro '+r.status));
  return j;
}
async function chatSend(texto){
  texto=String(texto||'').trim();if(!texto||chat.pend)return;
  chat.msgs.push({role:'user',content:texto});chat.pend=true;chat.erro='';chat.aviso='';chat.ferramentas=[];render();scrollChat();
  try{
    for(let volta=0;volta<8;volta++){
      const corpo={system:LLM_SYSTEM,messages:chat.msgs,tools:LLM_TOOLS,effort:'medium'};
      chat.ultimo=corpo;
      const j=await chamarLLM(corpo);
      chat.msgs.push({role:'assistant',content:j.content});
      if(j.stop_reason==='refusal'){chat.aviso='A IA recusou responder a esta mensagem. Tente reformular.';break}
      if(j.stop_reason==='max_tokens'){chat.aviso='A resposta foi cortada. Peça para continuar ou faça uma pergunta mais curta.';break}
      if(j.stop_reason!=='tool_use')break;
      const usos=j.content.filter(b=>b.type==='tool_use');
      chat.ferramentas.push(...usos.map(b=>b.name));
      chat.msgs.push({role:'user',content:usos.map(b=>({type:'tool_result',tool_use_id:b.id,content:JSON.stringify(execTool(b.name,b.input))}))});
      if(volta===7)chat.aviso='A IA fez muitas consultas seguidas e parei por aqui. Pergunte de novo, de forma mais específica.';
    }
  }catch(e){chat.erro=e.message}
  finally{chat.pend=false;render();scrollChat()}
}
function scrollChat(){const el=document.getElementById('chatLog');if(el)el.scrollTop=el.scrollHeight}
const chatTexto=m=>typeof m.content==='string'?m.content:(m.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
function resumoBox(){
  return `<div class="small muted">Sem a conexão com a IA, você ainda pode copiar este resumo, sem nomes nem descrições, e colar numa conversa com o Claude.</div>
    <textarea readonly id="resumoIA" aria-label="Resumo para IA">${esc(resumoIA())}</textarea>
    <div><button class="btn ghost" data-act="copyResumo">Copiar resumo</button></div>
    ${flash&&tab==='coach'?`<div class="small good" role="status">${esc(flash)}</div>`:''}`;
}
function chatPanel(){
  const aviso='<div class="small muted">O coach orienta e calcula com regras gerais. Não é consultoria financeira nem fiscal.</div>';
  if(!HAS_DB)return fold('ia','Coach com IA',`<div class="small muted">A conversa com a IA funciona no aplicativo instalado, depois de colocar a sua chave da API em ajustes.</div>${resumoBox()}${aviso}`,false);
  if(!appSettings.llm_key_set)return fold('ia','Coach com IA',`<div class="small muted">Conecte o Claude para conversar com o coach. Em <b>ajustes</b> você coloca a sua chave da API. O coach usa os cálculos do app como ferramentas, então não inventa números.</div><div><button class="btn sm" data-tab="aj">Ir para ajustes</button></div>${resumoBox()}${aviso}`,false);
  const log=chat.msgs.filter(m=>m.role==='assistant'||typeof m.content==='string');
  const body=`<div class="small muted">Pergunte o que quiser: "o que faço com o dinheiro que sobrou?", "em quanto tempo quito o cartão?", "vale cortar assinaturas?". O modelo é ${esc((appSettings.llm_modelos||{})[appSettings.llm_model]||appSettings.llm_model)}.</div>
    <div id="chatLog" class="chatlog" aria-live="polite">${log.length?log.map(m=>{const t=chatTexto(m);return t?`<div class="bubble ${m.role==='user'?'me':'ia'}">${esc(t).replace(/\n/g,'<br>')}</div>`:''}).join(''):'<div class="empty">Nenhuma mensagem ainda.</div>'}
      ${chat.pend?`<div class="bubble ia muted">consultando${chat.ferramentas.length?' ('+chat.ferramentas.slice(-1)[0]+')':''}…</div>`:''}</div>
    ${chat.ferramentas.length&&!chat.pend?`<div class="small muted">Ferramentas usadas nesta resposta: ${esc([...new Set(chat.ferramentas)].join(', '))}.</div>`:''}
    ${chat.erro?`<div class="small bad" role="alert">${esc(chat.erro)}</div>`:''}${chat.aviso?`<div class="small warn">${esc(chat.aviso)}</div>`:''}
    <form class="form" id="fChat"><div class="field" style="flex:4 1 260px"><label for="chatIn">Sua mensagem</label><textarea id="chatIn" style="min-height:64px" ${chat.pend?'disabled':''} placeholder="Escreva aqui"></textarea></div>
      <button class="btn" type="submit" ${chat.pend?'disabled':''}>Enviar</button><button class="btn ghost" type="button" data-act="chatNew">Nova conversa</button></form>
    <details><summary class="small muted" style="cursor:pointer">O que o app envia para a IA</summary>
      <div class="small muted" style="margin-top:8px">Só o que você digita e os resultados das ferramentas (totais, médias e prazos). Nomes de clientes, descrições de lançamentos e nomes de contas não são enviados. A chave da API fica só neste computador.</div>
      ${chat.ultimo?`<textarea readonly aria-label="Última requisição enviada" style="min-height:140px">${esc(JSON.stringify({system:chat.ultimo.system.slice(0,200)+'…',ferramentas:chat.ultimo.tools.map(t=>t.name),mensagens:chat.ultimo.messages},null,1).slice(0,20000))}</textarea>`:''}
    </details>${aviso}${flash&&tab==='coach'?`<div class="small good" role="status">${esc(flash)}</div>`:''}`;
  return fold('ia','Coach com IA',body,true);
}
function llmSettingsPanel(){
  if(!HAS_DB)return '';
  const mods=appSettings.llm_modelos||{'claude-opus-5-5':'Claude Opus 5.5'},dica={'claude-opus-5-5':'US$ 4 / US$ 20 por milhão de tokens','claude-sonnet-5-5':'US$ 2 / US$ 10','claude-haiku-5-5':'US$ 0,10 / US$ 0,50','claude-fable-5-2':'US$ 8 / US$ 40'};
  return `<section class="panel"><h2>Coach com IA (Claude)</h2>
    <div class="small muted">Conecta o coach ao Claude para conversar sobre as suas finanças. O coach usa os cálculos do app como ferramentas. É opcional: sem a chave, o app continua funcionando por regras locais.</div>
    <div class="small ${appSettings.llm_key_set?'good':'muted'}">${appSettings.llm_key_set?'Chave da API configurada.':'Nenhuma chave configurada.'}</div>
    <div class="form"><div class="field" style="flex:2 1 260px"><label for="llmKey">Chave da API (começa com sk-ant-)</label><input id="llmKey" type="password" autocomplete="off" placeholder="${appSettings.llm_key_set?'deixe em branco para manter a atual':'cole a sua chave'}"></div>
      <div class="field"><label for="llmModel">Modelo</label><select id="llmModel">${Object.entries(mods).map(([k,v])=>`<option value="${k}" ${k===appSettings.llm_model?'selected':''}>${esc(v)} (${dica[k]||''})</option>`).join('')}</select></div></div>
    <div class="form"><button class="btn" data-act="llmSave">Salvar</button><button class="btn ghost" data-act="llmTest" ${appSettings.llm_key_set?'':'disabled'}>Testar conexão</button><button class="btn ghost" data-act="llmRemove" ${appSettings.llm_key_set?'':'disabled'}>Remover chave</button></div>
    <ul class="tips">
      <li>A chave é guardada só neste computador, no arquivo de configurações do app, e nunca vai para a tela. Ative a criptografia do disco (BitLocker) para proteger o arquivo.</li>
      <li>Vão para a Anthropic apenas as suas mensagens e os resultados dos cálculos (totais, médias, prazos). Nomes, descrições de lançamentos e contas não são enviados.</li>
      <li>Cada conversa cobra pelo uso na sua conta da Anthropic. Os preços acima são por entrada e saída. O modelo padrão é o mais capaz; modelos menores custam menos e respondem mais rápido, e a escolha é sua.</li>
      <li>O app liga o recurso de reserva da API (fallback automático): se uma resposta for recusada por segurança, outro modelo continua a conversa.</li>
    </ul>
    ${flash?`<div class="small ${flash.startsWith('Erro')?'bad':'good'}" role="status">${esc(flash)}</div>`:''}
  </section>`;
}
