# Decisões de projeto

🌐 [English](../en/DESIGN-DECISIONS.md) · **Português** · [Español](../es/DECISIONES.md) · [← README](../../README.pt-BR.md)

Cada decisão registra o contexto, a escolha e o preço pago por ela.

## 1. Local-first com SQLite
**Contexto:** dados financeiros são sensíveis e o uso é de uma pessoa só.
**Escolha:** tudo num SQLite local, sem contas nem servidor remoto.
**Preço:** não há sincronização entre aparelhos. Mitigação: backup diário, pasta extra de backup e exportação em texto.

## 2. Gravar o estado inteiro numa transação
**Escolha:** `PUT /api/state` valida tudo e substitui as tabelas dentro de um `BEGIN IMMEDIATE`; qualquer erro desfaz.
**Por quê:** é simples de raciocinar e impossível de deixar o banco pela metade.
**Preço:** custo proporcional ao tamanho do estado. Medido: com 20 mil lançamentos a tela renderiza em cerca de 50 ms.

## 3. Dinheiro em centavos e câmbio por transação
**Escolha:** `INTEGER` em centavos no banco; cada item em moeda estrangeira guarda o câmbio do dia.
**Por quê:** evita erro de arredondamento e impede que mudar o câmbio hoje reescreva a receita de meses antigos
(uma falha real encontrada na auditoria).

## 4. JavaScript simples, sem framework e sem build
**Escolha:** módulos clássicos carregados em ordem, estado global e renderização por *template strings*.
**Por quê:** zero cadeia de ferramentas, fácil de ler e de empacotar.
**Preço:** não há tipos nem componentes. O arquivo único para publicar é gerado por `tools/bundle.py`.
**Se crescer:** migrar para módulos ES e TypeScript, mantendo o motor financeiro como funções puras.

## 5. Motor financeiro no navegador; servidor só persiste
**Por quê:** a tela recalcula a cada clique e as ferramentas da IA executam ao lado dos dados. O servidor valida e grava.

## 6. A chave da API fica só no servidor local
**Escolha:** o navegador chama `/api/llm`; o servidor monta a requisição com o SDK oficial.
**Por quê:** a chave nunca aparece no JavaScript, no estado, no backup nem na tela (`/api/settings` só diz se existe).

## 7. IA com ferramentas (tool use), não com os dados no prompt
**Escolha:** a IA pede ao app cálculos (`visao_geral`, `simular_dividas`, `previsao_caixa`…) e só recebe agregados.
**Por quê:** (a) não inventa números, (b) a privacidade é decidida por quais ferramentas existem, (c) o motor local
continua sendo a fonte da verdade, com testes.

## 8. Não treinar um modelo próprio
Treinar um LLM não faria sentido para este problema. O ganho vem de **dados corretos, regras testadas e um modelo
bom que usa ferramentas**. O coach funciona por regras locais mesmo sem a IA.

## 9. Modelo padrão e recurso de reserva
Padrão `claude-opus-5-5`, trocável em ajustes. O app liga o recurso de reserva (*fallback*) da API para o caso de uma
resposta ser recusada por segurança. A requisição não envia parâmetros de amostragem nem desativa o raciocínio, e os
blocos de raciocínio voltam intactos a cada volta do laço de ferramentas (coberto por teste).

## 10. Janela via Edge/Chrome no pacote portátil
**Contexto:** `pywebview` no Windows depende de `pythonnet`, .NET e WebView2.
**Escolha:** o pacote portátil abre o endereço local no Edge/Chrome em modo aplicativo (`--app=`), que o Windows 10/11
já traz. O `pywebview` continua sendo usado se estiver instalado (build com PyInstaller).
**Preço:** o ciclo de vida da janela precisa ser inferido: por isso o sinal de vida (`ping`/`bye`).

## 11. Pacote Windows montado a partir do Linux
**Escolha:** launcher em Go (cross-compilação trivial) + Python oficial do NuGet + bibliotecas nativas baixadas com
`pip download --platform win_amd64`. Nada é instalado no Windows e o resultado é uma pasta que se apaga.
**Preço:** sem assinatura digital paga, o SmartScreen avisa; e o pacote não pôde ser executado em Windows real aqui.

## 12. Heurísticas transparentes
Os limites das regras (60/40, 1,5× a média etc.) são fixos e visíveis. Cada ação do coach traz uma tabela
"como o app chegou a isso" para que dê para discordar com argumentos.

## 13. Servidor falso da API em testes
Um servidor HTTP de mentira (`tests/fake_anthropic.py`) imita a API e registra o que recebeu. Assim os testes conferem
cabeçalhos, corpo, `fallbacks`, ausência de parâmetros proibidos e a devolução intacta dos blocos de raciocínio,
sem chave nem custo.
