# Motor financeiro

🌐 [English](../en/FINANCIAL-ENGINE.md) · **Português** · [Español](../es/MOTOR-FINANCIERO.md) · [← README](../../README.pt-BR.md)

Regras de negócio em `web/js/02-calculos.js`, `08-coach.js`, `09b-canal.js` e `09c-cerebro.js`.
Tudo é calculado em euros; valores em outras moedas são convertidos pelo câmbio da transação.

## Renda disponível e regra de divisão

```
renda        = renda pessoal + renda de trabalho (salário × pagas, rendas extras, projetos pagos, canal)
disponível   = renda − custo de trabalho (IA e ferramentas) − reserva fiscal
saldo livre  = disponível − necessidades − desejos − investido
```
A regra padrão 50/30/20 (necessidades/desejos/investir) é configurável. **Pagas extras:** com 14 pagas, junho e
dezembro entram em dobro.

## Custo essencial e metas

- **Custo essencial médio** = média das necessidades dos últimos 3 meses (mês atual e dois anteriores) **sem** os
  pagamentos de dívida + **pagamento mínimo** das dívidas ativas. Não inclui custos de trabalho (somem se o trabalho parar).
- **Meta do caixa** = meses de caixa (padrão 1) × essencial. **Meta da reserva** = meses (padrão 6) × essencial.
- A meta **não depende do mês aberto na tela** nem é inflada por pagamentos extras de dívida (falhas reais que a
  auditoria encontrou e os testes agora cobrem).

## Capacidade mensal

Média, nos últimos 3 meses com renda, de `saldo livre + investido + pago em dívidas`. Devolver o que foi pago de
dívida evita que quitar dívida "reduza" a capacidade de guardar.

## Degraus

1. Organizar (renda, contas e ≥ 8 lançamentos/assinaturas) → 2. Formar o caixa → 3. Quitar dívidas →
4. Reserva de emergência → 5. Investir todo mês (meta % da renda disponível) → 6. Renda extra (meta definida pelo usuário).

O degrau atual é o primeiro não concluído. Cada degrau tem progresso de 0 a 100%.

## Próxima ação

Um conjunto de regras produz candidatos com prioridade e detalhes (`det`), por exemplo: saldo negativo (98),
pagamentos atrasados (90), check-in pendente (88), caixa abaixo da meta (85), dívida (80), reserva (60-75),
limites estourados (65), reserva fiscal ausente (62). A de maior prioridade vira "sua próxima ação", com a tabela de
números que a justifica.

## Plano do mês ("pague-se primeiro")

Distribui a capacidade mensal: caixa (até 60% se houver mais metas) → dívida de maior juros (até 70% do restante se a
reserva está incompleta) → reserva → investir o excedente.

## Dívidas (avalanche)

Cada mês: juros mensais (`taxa/12`), pagamento mínimo de todas as dívidas e todo o restante do orçamento na de
**maior juros**. Devolve meses até quitar e juros totais estimados (limite de 600 meses).

## Nota de saúde (0–100)

| Componente | Peso |
|---|---|
| Reserva de emergência | 25 |
| Dívidas | 20 |
| Poupança do mês | 20 |
| Caixa | 15 |
| Renda de trabalho (concentração em um cliente reduz) | 10 |
| Constância (semanas seguidas de check-in, máx. 4) | 10 |

## Previsão de caixa (6 meses)

Saldo inicial = contas de caixa. Cada mês: entradas (salário × pagas, entradas recorrentes, projetos previstos, média da
receita do canal) − saídas (fixos recorrentes, assinaturas, **maior entre** o gasto variável médio e os lançamentos
explícitos, pagamento mínimo das dívidas). O saldo mostrado é antes de transferir para reserva ou dívida.

## Hábitos e anomalias

- **Categoria acima do normal:** gasto do mês > 1,5× a média dos 3 meses anteriores, com média ≥ € 20 e diferença ≥ € 30.
- **Despesa isolada:** valor > 4× a mediana da categoria nos últimos 90 dias (mínimo de 5 lançamentos e € 80).
- **Tendências:** inclinação (regressão linear) da taxa de poupança e do gasto nos últimos 4 meses; coeficiente de
  variação da renda de trabalho para avisar de renda volátil.

## Saldo estimado de contas

`saldo informado + Σ lançamentos vinculados à conta com data > data da última atualização`, convertendo moedas.
Importar um extrato com coluna de saldo atualiza o saldo e a data da conta.

## Canal de conteúdo

Requisitos de monetização (YouTube e Twitch) ficam em uma tabela editável no código; o app avisa que mudam.
**Data estimada:** regressão linear sobre as últimas semanas de uma métrica cumulativa (inscritos, horas, seguidores);
exige ≥ 3 registros e crescimento positivo. Métricas de janela móvel (minutos em 30 dias etc.) mostram só o status.

## Imposto sobre ganhos (Espanha, referência)

Escala de poupança por faixas: 19% até € 6.000, 21% até € 50.000, 23% até € 200.000, 27% até € 300.000, 28% acima.
Aplicada ao ganho total como se tudo fosse resgatado. É uma estimativa educativa; confirme valores vigentes.
