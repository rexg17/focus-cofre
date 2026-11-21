/* ---------- importar extrato (CSV) ---------- */
let imp=impFresh();
function impFresh(){return {raw:'',table:null,hasHdr:false,map:{d:0,desc:1,v:2,c:-1,s:-1},fmt:'dmy',inv:false,moeda:'EUR',conta:'',rows:null,msg:''}}
const KW=[
  [/mercadona|carrefour|lidl|aldi|\bdia\b|eroski|consum|alcampo|supermerc|caprabo|bonpreu|condis/i,'Mercado'],
  [/renfe|\bmetro\b|\bemt\b|uber|cabify|bolt|taxi|gasolin|repsol|cepsa|galp|parking|aparcam|blablacar|ouigo|iryo|vueling|ryanair|iberia/i,'Transporte'],
  [/netflix|spotify|hbo|disney|prime video|youtube|dazn|filmin/i,'Assinaturas pessoais'],
  [/openai|chatgpt|anthropic|claude|github|copilot|cursor|midjourney|replicate|perplexity/i,'IA e APIs'],
  [/notion|figma|canva|adobe|vercel|netlify|slack|zoom|google workspace|dropbox|1password|namecheap|godaddy|cloudflare|hetzner|digitalocean|amazon web/i,'Ferramentas e SaaS'],
  [/restaur|\bbar\b|cafe|cafeter|glovo|just ?eat|uber ?eats|mcdonald|burger|telepizza|pizz/i,'Restaurantes'],
  [/farmaci|clinica|hospital|dentist|sanitas|adeslas|asisa|gimnasio|\bgym\b|decathlon/i,'Saúde'],
  [/endesa|iberdrola|naturgy|holaluz|vodafone|movistar|orange|\bdigi\b|yoigo|masmovil|agua|telefonica|jazztel/i,'Contas'],
  [/alquiler|\balq\b|arrend|comunidad|hipoteca/i,'Moradia'],
  [/amazon|zara|h&m|primark|ikea|el corte|aliexpress|pccomponentes|mediamarkt|fnac|shein/i,'Compras'],
  [/\bcine\b|teatro|ticketmaster|entradas|steam|playstation|nintendo|xbox/i,'Lazer'],
  [/curso|udemy|coursera|libreria|universidad|academia|platzi/i,'Educação'],
  [/prestamo|préstamo|intereses|financiaci/i,'Dívidas e juros']];
const kwCat=d=>{const k=KW.find(([r])=>r.test(d));return k?k[1]:null};
const normDesc=s=>String(s||'').toLowerCase().replace(/[0-9]+/g,' ').replace(/[^a-záéíóúñüçãõ ]+/g,' ').trim().split(/\s+/).slice(0,2).join(' ');
function learnedCats(){const m={};S.lanc.filter(x=>x.tipo==='d').forEach(x=>{m[normDesc(x.desc)]=x.cat});return m}
function parseCSV(text){
  text=String(text).replace(/^﻿/,'');
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const delim=[';','\t',','].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],c='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;
    else if(ch===delim){row.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(c);c='';if(row.some(z=>z.trim()))rows.push(row);row=[]}
    else c+=ch}
  row.push(c);if(row.some(z=>z.trim()))rows.push(row);
  return rows;
}
function parseNum(s){
  s=String(s==null?'':s).trim();if(!s)return NaN;
  const neg=/^\(.*\)$/.test(s)||/^[\s(]*-/.test(s);
  s=s.replace(/[^\d.,]/g,'');
  if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(s.includes(',')){const p=s.split(',');s=(p.length===2&&p[1].length<=2)?p[0]+'.'+p[1]:s.replace(/,/g,'')}
  else if(s.includes('.')){const p=s.split('.');if(!(p.length===2&&p[1].length<=2))s=s.replace(/\./g,'')}
  const v=parseFloat(s);return isNaN(v)?NaN:(neg?-v:v);
}
function parseDate(s,fmt){
  const m=String(s||'').trim().match(/(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})/);if(!m)return null;
  let y,mo,d;if(fmt==='ymd'){y=m[1];mo=m[2];d=m[3]}else if(fmt==='mdy'){mo=m[1];d=m[2];y=m[3]}else{d=m[1];mo=m[2];y=m[3]}
  y=+y;mo=+mo;d=+d;if(y<100)y+=2000;if(mo<1||mo>12||d<1||d>31||y<2000||y>2100)return null;
  return y+'-'+pad(mo)+'-'+pad(d);
}
function parseImp(){
  imp.msg='';imp.rows=null;imp.table=parseCSV(imp.raw);
  if(!imp.table.length){imp.msg='Erro: não encontrei linhas no arquivo.';return}
  const h=imp.table[0].map(z=>String(z).trim().toLowerCase());
  const find=r=>h.findIndex(z=>r.test(z));
  const di=find(/fecha|data|date/),de=find(/concepto|descr|detalle|movimiento|hist[óo]rico|memo|texto/);
  const deb=find(/cargo|d[eé]bito|debit|salida|retir|sa[ií]da/),cre=find(/abono|cr[eé]dito|credit|entrada|ingreso/);
  const va=find(/importe|valor|amount|quantia|montante|cantidad/),sa=find(/saldo|balance/),dc=deb>=0&&cre>=0;
  const vcol=dc?deb:(va>=0?va:2),ccol=dc?cre:-1;
  imp.hasHdr=h.some(z=>/[a-z]/.test(z))&&isNaN(parseNum(imp.table[0][vcol]))&&(ccol<0||isNaN(parseNum(imp.table[0][ccol])));
  imp.map={d:di>=0?di:0,desc:de>=0?de:1,v:vcol,c:ccol,s:sa>=0?sa:-1};
  const sample=String((imp.table[imp.hasHdr?1:0]||[])[imp.map.d]||'');imp.fmt=/^\d{4}/.test(sample.trim())?'ymd':'dmy';
  buildImpRows();
}
function buildImpRows(){
  const t=imp.table,learned=learnedCats(),ex=new Set(S.lanc.map(x=>x.data+'|'+Math.round(x.valor*100)+'|'+normDesc(x.desc)));
  imp.rows=[];
  for(let i=imp.hasHdr?1:0;i<t.length&&imp.rows.length<500;i++){
    const r=t[i],data=parseDate(r[imp.map.d],imp.fmt),desc=String(r[imp.map.desc]||'').trim();let v;
    if(imp.map.c>=0){const d=parseNum(r[imp.map.v]),c=parseNum(r[imp.map.c]);if(isNaN(d)&&isNaN(c))continue;v=(isNaN(c)?0:Math.abs(c))-(isNaN(d)?0:Math.abs(d))}
    else v=parseNum(r[imp.map.v]);
    if(!data||isNaN(v)||!desc)continue;if(imp.inv)v=-v;
    const tipo=v<0?'d':'r',valor=Math.abs(v);
    const cat=tipo==='d'?(learned[normDesc(desc)]||kwCat(desc)||'Outros'):(/n[oó]mina|salari|sueldo/i.test(desc)?'Salário':'Outras rendas');
    const dup=ex.has(data+'|'+Math.round(valor*100)+'|'+normDesc(desc));
    imp.rows.push({data,desc,valor,tipo,cat,dup,saldo:imp.map.s>=0?parseNum(r[imp.map.s]):NaN,inc:!dup&&!(tipo==='r'&&S.renda.length>0)});
  }
  if(!imp.rows.length)imp.msg='Erro: nenhuma linha válida. Confira as colunas e o formato da data.';
}
function importPanel(){
  const cols=imp.table&&imp.table[0]?imp.table[0].map((z,i)=>imp.hasHdr?(String(z).trim()||'Coluna '+(i+1)):'Coluna '+(i+1)):[];
  const colOpts=(v,opt)=>(opt?`<option value="-1" ${v<0?'selected':''}>(nenhuma)</option>`:'')+cols.map((z,i)=>`<option value="${i}" ${i===v?'selected':''}>${esc(z)}</option>`).join('');
  const sel=(k,l,v,opt)=>`<div class="field"><label>${l}</label><select data-impmap="${k}">${colOpts(v,opt)}</select></div>`;
  const n=imp.rows?imp.rows.filter(r=>r.inc).length:0;
  return `<section class="panel"><h2>Importar extrato do banco (CSV)</h2>
    <div class="small muted">Exporte o extrato em CSV no site ou app do banco, escolha o arquivo ou cole o texto. O app reconhece colunas de valor único ou de débito e crédito, sugere a categoria e você confere antes de importar. Nada sai do seu computador.</div>
    <div class="field" style="max-width:360px"><label for="csvFile">Arquivo CSV</label><input id="csvFile" type="file" accept=".csv,.txt,text/csv"></div>
    <div class="field"><label for="csvIn">Ou cole o conteúdo</label><textarea id="csvIn" placeholder="Fecha;Concepto;Importe">${esc(imp.raw)}</textarea></div>
    <div><button class="btn" data-act="csvRead">Ler extrato</button></div>
    ${imp.rows&&imp.rows.length?`<div class="form">
      <div class="field"><label for="impMoeda">Moeda do extrato</label><select id="impMoeda" data-impmoeda="1">${moedaOpts(imp.moeda)}</select></div>
      <div class="field"><label for="impConta">Conta do extrato</label><select id="impConta" data-impconta="1"><option value="">(não vincular)</option>${S.contas.map(a=>`<option value="${a.id}" ${a.id===imp.conta?'selected':''}>${esc(a.nome)}</option>`).join('')}</select></div>
      <div class="field"><label for="impFmt">Formato da data</label><select id="impFmt" data-impfmt="1"><option value="dmy" ${imp.fmt==='dmy'?'selected':''}>dia/mês/ano</option><option value="ymd" ${imp.fmt==='ymd'?'selected':''}>ano-mês-dia</option><option value="mdy" ${imp.fmt==='mdy'?'selected':''}>mês/dia/ano</option></select></div>
      <label class="check"><input type="checkbox" data-impinv="1" ${imp.inv?'checked':''}>Gastos aparecem positivos</label></div>
    <div class="form">${sel('d','Coluna da data',imp.map.d)}${sel('desc','Coluna da descrição',imp.map.desc)}${sel('v',imp.map.c>=0?'Coluna de débito (saída)':'Coluna do valor',imp.map.v)}${sel('c','Coluna de crédito (entrada)',imp.map.c,true)}${sel('s','Coluna de saldo',imp.map.s,true)}</div>
    <div class="small muted">${imp.rows.length} linha(s) lida(s). Entradas começam desmarcadas se você já cadastrou renda fixa, para não contar em dobro. Linhas já existentes também. ${imp.conta&&imp.map.s>=0?'Ao importar, o saldo da conta será atualizado com o saldo da última linha do extrato.':'Escolha a conta e a coluna de saldo para conferir o saldo da conta com o banco.'}</div>
    <div class="scroll"><table class="tbl"><thead><tr><th></th><th>Data</th><th>Descrição</th><th>Valor</th><th>Categoria</th></tr></thead><tbody>${imp.rows.map((r,i)=>`<tr><td><input type="checkbox" data-impinc="${i}" ${r.inc?'checked':''} aria-label="Importar linha ${i+1}"></td><td>${fmtD(r.data)}</td><td>${esc(r.desc)}${r.dup?' <span class="tag">já existe</span>':''}</td><td class="num ${r.tipo==='r'?'good':''}">${r.tipo==='r'?'+':'−'} ${fmtM(r.valor,imp.moeda)}</td><td><select data-impcat="${i}" aria-label="Categoria da linha ${i+1}">${(r.tipo==='r'?Object.keys(RCATS):Object.keys(DCATS)).map(k=>`<option ${k===r.cat?'selected':''}>${esc(k)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    <div><button class="btn" data-act="csvDo" ${n?'':'disabled'}>Importar ${n} lançamento(s)</button></div>`:''}
    ${imp.msg?`<div class="small ${imp.msg.startsWith('Erro')?'bad':'good'}" role="status">${esc(imp.msg)}</div>`:''}
  </section>`;
}
function fillEdit(){
  const x=S.lanc.find(y=>y.id===editLanc);if(!x)return;const g=id=>document.getElementById(id);
  g('lt').value=x.tipo;g('lc').innerHTML=x.tipo==='r'?rOpts():optGroups(true);g('lc').value=x.cat;g('ld').value=x.desc;
  g('lm').value=x.moeda||'EUR';g('lv').value=x.valor;g('ldt').value=x.data;g('lr').checked=!!x.rec;g('lcta').value=x.conta||'';
}
function vLanc(){
  const c=calc(cur);
  let L=[...c.L].sort((a,b)=>b.data.localeCompare(a.data));
  const f={p:x=>x.tipo==='d'&&['n','d'].includes(DCATS[x.cat]),w:x=>x.tipo==='d'&&DCATS[x.cat]==='w',i:x=>x.tipo==='d'&&DCATS[x.cat]==='i',r:x=>x.tipo==='r'}[filt];
  if(f)L=L.filter(f);
  const hoje=cur+'-'+pad(cur===baseMes()?now.getDate():1),ed=editLanc?S.lanc.find(x=>x.id===editLanc):null;
  const moedaSel=i=>`<div class="field"><label for="${i}">Moeda</label><select id="${i}">${moedaOpts()}</select></div>`;
  return `
  <section class="panel"><h2>Renda fixa mensal</h2>
    <div class="small muted">Salário e contratos que se repetem todo mês. Com 14 pagas, junho e dezembro entram em dobro. Clientes e projetos contam como renda de trabalho.</div>
    <div class="list">${S.renda.length?S.renda.map(r=>`<div class="row"><div class="main"><b>${esc(r.nome)}</b><span class="tag ${RCATS[r.cat]==='w'?'work':''}">${esc(r.cat)}</span>${r.pagas===14?' <span class="tag">14 pagas</span>':''}</div><span class="num">${money(r,true)}</span><button class="btn ghost sm" data-act="delRenda" data-id="${r.id}">Remover</button></div>`).join(''):'<div class="empty">Nenhuma renda cadastrada.</div>'}</div>
    <form class="form" id="fRenda">
      <div class="field" style="flex:2 1 160px"><label for="rn">Descrição</label><input id="rn" required placeholder="Salário líquido"></div>
      <div class="field"><label for="rc">Tipo</label><select id="rc">${rOpts()}</select></div>
      ${moedaSel('rm')}
      <div class="field"><label for="rv">Valor por paga</label><input id="rv" type="number" step="0.01" min="0" required></div>
      <div class="field"><label for="rp">Pagas por ano</label><select id="rp"><option value="12">12 (mensal)</option><option value="14">14 (pagas extras)</option></select></div>
      <button class="btn" type="submit">Adicionar renda</button>
    </form>
  </section>
  <section class="panel"><h2>${ed?'Editar lançamento':'Novo lançamento'}</h2>
    <form class="form" id="fLanc">
      <div class="field"><label for="lt">Tipo</label><select id="lt"><option value="d">Saída (gasto)</option><option value="r">Entrada extra</option></select></div>
      <div class="field" style="flex:2 1 170px"><label for="ld">Descrição</label><input id="ld" required placeholder="Ex.: Créditos de API"></div>
      <div class="field"><label for="lc">Categoria</label><select id="lc">${optGroups(true)}</select></div>
      ${moedaSel('lm')}
      <div class="field"><label for="lv">Valor</label><input id="lv" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label for="ldt">Data</label><input id="ldt" type="date" value="${hoje}" required></div>
      <div class="field"><label for="lcta">Conta (opcional)</label><select id="lcta"><option value="">(nenhuma)</option>${S.contas.map(a=>`<option value="${a.id}">${esc(a.nome)}</option>`).join('')}</select></div>
      <label class="check"><input type="checkbox" id="lr">Repetir todo mês</label>
      <button class="btn" type="submit">${ed?'Salvar':'Adicionar'}</button>${ed?'<button class="btn ghost" type="button" data-act="cancelEdit">Cancelar</button>':''}
    </form>
  </section>
  ${importPanel()}
  <section class="panel"><h2>Lançamentos do mês</h2>
    <div class="field" style="max-width:260px"><label for="flt">Mostrar</label><select id="flt">
      ${[['todos','Tudo'],['p','Gastos pessoais'],['w','Gastos de trabalho (IA e ferramentas)'],['i','Investimentos'],['r','Entradas extras']].map(([k,l])=>`<option value="${k}" ${k===filt?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="list">${L.length?L.map(x=>`<div class="row"><div class="main"><b>${esc(x.desc)}</b><span class="small muted">${fmtD(x.data)} · <span class="tag ${(x.tipo==='d'?DCATS[x.cat]:RCATS[x.cat])==='w'?'work':''}">${esc(x.cat)}</span>${x.rec?' · <span class="tag">mensal</span>':''}</span></div><span class="num ${x.tipo==='r'?'good':''}">${x.tipo==='r'?'+':'−'} ${money(x,x.tipo==='r')}</span>
      <button class="btn ghost sm" data-act="editLanc" data-id="${x.id}">Editar</button>${x.rec?`<button class="btn ghost sm" data-act="endSerie" data-id="${x.id}">Encerrar série</button>`:''}<button class="btn ghost sm" data-act="delLanc" data-id="${x.id}">${x.rec?'Excluir série':'Excluir'}</button></div>`).join(''):'<div class="empty">Nada para mostrar neste mês.</div>'}</div>
  </section>`;
}
