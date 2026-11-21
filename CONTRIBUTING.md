# Como contribuir

1. Rode os testes antes de começar: `python -m unittest discover -s tests` e `node tests/logic.test.js`.
2. Mudança de regra financeira? Escreva primeiro a verificação em `tests/logic.test.js` (monte um estado e confira o número).
3. Mudança no banco? Acrescente a coluna em `EXTRA_COLS` e a migração em `db.migrate()`, e um teste em `tests/test_app.py`.
4. Mudança de tela? Rode `python tests/e2e/rodar_llm.py tests/e2e/fluxos.js` e confira a largura de celular (sem rolagem lateral).
5. Não envie a chave da API, bancos de dados (`*.db`) nem `settings.json`: o `.gitignore` já os exclui.
6. Textos de interface em português; mensagens de erro dizem o que aconteceu e o que fazer.
