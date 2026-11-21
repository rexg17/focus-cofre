# Contributing · Como contribuir · Cómo contribuir

🌐 [English](#english) · [Português](#português) · [Español](#español)

## English
1. Run the tests before starting: `python -m unittest discover -s tests` and `node tests/logic.test.js`.
2. Changing a financial rule? Write the check first in `tests/logic.test.js` (build a state and assert the number).
3. Changing the database? Add the column to `EXTRA_COLS` and the migration to `db.migrate()`, plus a test in `tests/test_app.py`.
4. Changing a screen? Run `python tests/e2e/rodar_llm.py tests/e2e/fluxos.js` and check the phone width (no horizontal scroll).
5. Never commit the API key, databases (`*.db`) or `settings.json`: `.gitignore` already excludes them.
6. The app interface is in Portuguese (Brazil); error messages say what happened and what to do. Documentation lives in `docs/en`, `docs/pt-BR` and `docs/es`: when you change one, update the other two.

## Português
1. Rode os testes antes de começar: `python -m unittest discover -s tests` e `node tests/logic.test.js`.
2. Mudança de regra financeira? Escreva primeiro a verificação em `tests/logic.test.js` (monte um estado e confira o número).
3. Mudança no banco? Acrescente a coluna em `EXTRA_COLS` e a migração em `db.migrate()`, e um teste em `tests/test_app.py`.
4. Mudança de tela? Rode `python tests/e2e/rodar_llm.py tests/e2e/fluxos.js` e confira a largura de celular (sem rolagem lateral).
5. Nunca envie a chave da API, bancos de dados (`*.db`) nem `settings.json`: o `.gitignore` já os exclui.
6. A interface do app está em português do Brasil; mensagens de erro dizem o que aconteceu e o que fazer. A documentação fica em `docs/en`, `docs/pt-BR` e `docs/es`: ao mudar uma, atualize as outras duas.

## Español
1. Ejecuta las pruebas antes de empezar: `python -m unittest discover -s tests` y `node tests/logic.test.js`.
2. ¿Cambias una regla financiera? Escribe primero la comprobación en `tests/logic.test.js` (monta un estado y verifica la cifra).
3. ¿Cambias la base de datos? Añade la columna en `EXTRA_COLS` y la migración en `db.migrate()`, y una prueba en `tests/test_app.py`.
4. ¿Cambias una pantalla? Ejecuta `python tests/e2e/rodar_llm.py tests/e2e/fluxos.js` y comprueba la anchura de móvil (sin desplazamiento horizontal).
5. No subas nunca la clave de la API, las bases de datos (`*.db`) ni `settings.json`: el `.gitignore` ya los excluye.
6. La interfaz de la app está en portugués de Brasil; los mensajes de error dicen qué ha pasado y qué hacer. La documentación está en `docs/en`, `docs/pt-BR` y `docs/es`: al cambiar una, actualiza las otras dos.
