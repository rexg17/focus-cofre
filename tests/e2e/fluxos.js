const {chromium}=require('playwright');
const t0=s=>s.trim().replace(/\s+/g,' ');
(async()=>{const b=await chromium.launch();const c=await b.newContext({colorScheme:'dark',viewport:{width:1100,height:900}});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('http://127.0.0.1:8765/');
await p.fill('#dgS','2100');await p.click('#fDiag button.btn');
// conta e extrato com débito/crédito e saldo
await p.click('[data-tab=caixa]');await p.fill('#cn2','CC Espanha');await p.fill('#csd','1000');await p.click('#fConta button.btn');
await p.click('[data-tab=lanc]');
await p.fill('#csvIn','Fecha;Concepto;Cargo;Abono;Saldo\n05/11/2026;MERCADONA 12;45,30;;954,70\n06/11/2026;NETFLIX.COM;12,99;;941,71\n07/11/2026;BIZUM AMIGO;;20,00;961,71');
await p.click('[data-act=csvRead]');
console.log('colunas débito/crédito/saldo detectadas:',await p.$$eval('[data-impmap]',e=>e.map(x=>x.value).join(',')));
await p.selectOption('#impConta',{label:'CC Espanha'});
await p.click('[data-impinc="2"]');
await p.click('[data-act=csvDo]');
console.log('mensagem:',t0(await p.textContent('#view')).match(/\d+ lançamento\(s\) importado\(s\)\.[^.]*\.[^.]*\./)?.[0]);
await p.click('[data-tab=caixa]');
console.log('saldo da conta após o extrato:',t0(await p.textContent('.row:has-text("CC Espanha") .num')));
// extrato em reais
await p.click('[data-tab=lanc]');
await p.fill('#csvIn','Data;Descrição;Valor\n10/11/2026;PIX CLIENTE;"1.500,00"\n11/11/2026;DAS MEI;-75,90');
await p.click('[data-act=csvRead]');await p.selectOption('#impMoeda','BRL');
await p.click('[data-impinc="0"]');await p.click('[data-act=csvDo]');
await p.waitForTimeout(400);
// canal: 3 semanas de métricas e uma receita em dólar
await p.click('[data-tab=canal]');await p.fill('#cvn','XP Joga');await p.click('#fCanal button.btn');
const hoje=new Date();const iso=n=>{const d=new Date(hoje);d.setDate(d.getDate()-n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
for(const [n,subs,h] of [[14,100,300],[7,140,360],[0,180,430]]){await p.fill('#mdt',iso(n));await p.fill('#mk_subs',String(subs));await p.fill('#mk_horas',String(h));await p.click('#fMet button.btn')}
console.log('previsão de data do canal:',(await p.textContent('#view')).includes('No ritmo atual, chega em cerca de'));
await p.click('details[data-fold=rec] > summary');
await p.selectOption('#rcm','USD');await p.fill('#rcv','55');await p.click('#fRec button.btn');
await p.click('[data-tab=resumo]');
console.log('painel inclui receita do canal:',t0(await p.textContent('.stats .stat:nth-child(1)')));
// restaurar backup do início (estado vazio)
await p.waitForTimeout(500);
await p.click('[data-tab=aj]');await p.click('[data-act=listBk]');await p.click('[data-act=askRestore]');await p.click('[data-act=doRestore]');
await p.waitForFunction(()=>document.body.textContent.includes('Backup restaurado'));
await p.click('[data-tab=lanc]');
console.log('após restaurar, extrato vazio de novo:',(await p.textContent('#view')).includes('Nada para mostrar'));
console.log('errs',errs);await b.close()})()
