# Testes

🌐 [English](../en/TESTING.md) · **Português** · [Español](../es/PRUEBAS.md) · [← README](../../README.pt-BR.md)

Estratégia em camadas. Cada camada pega um tipo diferente de erro.

| Camada | Onde | O que cobre | Quantidade |
|---|---|---|---|
| Unidade e integração (Python) | `tests/test_app.py` | Banco, validação, migrações, restauração, API local, token, ciclo de vida da janela, ponte com a IA | 26 testes |
| Lógica financeira (Node + Chromium) | `tests/logic.test.js` | O motor de cálculo executado no navegador real, com estados montados | 32 verificações |
| Ponta a ponta (navegador) | `tests/e2e/` | Fluxos completos contra o servidor real e um servidor falso da API do Claude | 2 roteiros |

## Como rodar

```bash
python -m unittest discover -s tests
npm install --no-save playwright && npx playwright install chromium
node tests/logic.test.js
python tests/e2e/rodar_llm.py                        # conversa com o coach
python tests/e2e/rodar_llm.py tests/e2e/fluxos.js    # extrato, canal, moedas, backup
```

## O que os testes provam (exemplos)

- **Corretude do motor:** a meta da reserva não muda conforme o mês aberto; pausar uma assinatura não altera o passado;
  mudar o câmbio não reescreve receita já registrada; 14 pagas dobram junho e dezembro; avalanche quita em N meses;
  imposto de poupança de € 10.000 de ganho = € 1.980; previsão de data do canal (50 inscritos/semana → 105 dias).
- **Banco:** valores em centavos sem erro de arredondamento; gravação tudo-ou-nada; migração de bancos antigos
  (incluindo a recriação de `projetos`); restauração com cópia de segurança e nomes inválidos rejeitados.
- **Segurança:** token obrigatório, `Host` estranho bloqueado, *path traversal* bloqueado, chave da API nunca devolvida.
- **Ponte com a IA (servidor falso):** o SDK envia `fallbacks="default"`, o cabeçalho de beta, `effort`, as ferramentas e
  o sistema; **não** envia `temperature` nem `thinking`; o bloco de raciocínio volta intacto na volta seguinte;
  Haiku não recebe `fallbacks`; erro 401 vira mensagem clara.
- **Privacidade:** textos "secretos" cadastrados nunca aparecem em requisições à API.
- **Interface:** extrato com colunas de débito/crédito e saldo, importação em R$, previsão de data do canal, receita em
  US$ convertida, restauração de backup, sem rolagem lateral no celular em todas as abas.

## Falhas reais que os testes e a auditoria encontraram

Estas falhas existiram e foram corrigidas, cada uma com teste de regressão:

1. A meta da reserva mudava conforme o mês que a tela mostrava.
2. Pausar uma assinatura hoje alterava o custo de meses passados.
3. Pagar dívida a mais **aumentava** o custo essencial e a meta da reserva (pagar dívida "punia" o usuário).
4. Todos os valores em reais usavam o câmbio atual, inclusive meses antigos.
5. Extratos com colunas de débito/crédito liam zero linhas e a importação não tinha escolha de moeda.
6. A aba do canal rolava para o lado no celular (contêiner flexível com margem automática encolhendo ao conteúdo).

## O que não está coberto

- Execução do pacote em **Windows real** e a janela do Edge/Chrome.
- Chamada real à API do Claude (o formato é testado contra um servidor falso).
- Testes de acessibilidade automatizados e de carga em grande escala.
