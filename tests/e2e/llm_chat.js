const {chromium}=require('playwright');
const t0=s=>s.trim().replace(/\s+/g,' ');
(async()=>{const b=await chromium.launch();const c=await b.newContext({colorScheme:'dark',viewport:{width:1100,height:900}});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('http://127.0.0.1:8765/');
await p.fill('#dgS','2100');await p.fill('#dgC','450');await p.fill('#dgD','2000');await p.fill('#dgJ','19');await p.fill('#dgM','80');await p.click('#fDiag button.btn');
// dados sensíveis que NÃO podem sair do computador
await p.click('[data-tab=lanc]');await p.fill('#ld','SEGREDO-DESC mercado');await p.fill('#lv','40');await p.click('#fLanc button.btn');
await p.click('[data-tab=trab]');await p.fill('#pc','SEGREDO-CLIENTE');await p.fill('#pd','Site');await p.fill('#pv','500');await p.click('#fProj button.btn');
await p.click('[data-tab=caixa]');await p.fill('#cn2','Banco Secreto');await p.fill('#csd','100');await p.click('#fConta button.btn');
await p.click('[data-tab=coach]');
console.log('sem chave -> pede configuração:',(await p.textContent('#view')).includes('Conecte o Claude'));
await p.click('[data-tab=aj]');await p.fill('#llmKey','sk-ant-e2e-123456');await p.click('[data-act=llmSave]');await p.waitForFunction(()=>document.body.textContent.includes('Chave da API configurada'));
console.log('chave salva:',(await p.textContent('#view')).includes('Chave da API configurada'));
console.log('campo da chave não mostra a chave:',!(await p.content()).includes('sk-ant-e2e-123456'));
await p.click('[data-act=llmTest]');await p.waitForFunction(()=>document.body.textContent.includes('Conexão ok'));
console.log('teste de conexão ok');
await p.click('[data-tab=coach]');
await p.fill('#chatIn','Como estou financeiramente?');await p.click('#fChat button.btn');
await p.waitForFunction(()=>document.body.textContent.includes('Resposta final do coach.'),null,{timeout:15000});
console.log('resposta exibida com quebra de linha:',(await p.innerHTML('#chatLog')).includes('Resposta final do coach.<br>Segunda linha.'));
console.log('ferramenta usada:',t0(await p.textContent('#view')).match(/Ferramentas usadas[^.]*\./)?.[0]);
await p.setViewportSize({width:400,height:800});console.log('sem rolagem lateral no celular com o chat aberto:',!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
console.log('errs',errs);await b.close()})()
