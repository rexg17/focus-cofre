# Testing

🌐 **English** · [Português](../pt-BR/TESTES.md) · [Español](../es/PRUEBAS.md) · [← README](../../README.md)

A layered strategy. Each layer catches a different kind of error.

| Layer | Where | What it covers | Count |
|---|---|---|---|
| Unit and integration (Python) | `tests/test_app.py` | Database, validation, migrations, restore, local API, token, window lifecycle, AI bridge | 26 tests |
| Financial logic (Node + Chromium) | `tests/logic.test.js` | The calculation engine running in a real browser, with built states | 32 checks |
| End to end (browser) | `tests/e2e/` | Complete flows against the real server and a fake Claude API server | 2 scripts |

## How to run

```bash
python -m unittest discover -s tests
npm install --no-save playwright && npx playwright install chromium
node tests/logic.test.js
python tests/e2e/rodar_llm.py                        # coach conversation
python tests/e2e/rodar_llm.py tests/e2e/fluxos.js    # statement, channel, currencies, backup
```

## What the tests prove (examples)

- **Engine correctness:** the emergency-fund target does not change with the month shown; pausing a subscription does
  not alter the past; changing the FX rate does not rewrite recorded revenue; 14 payments double June and December; the
  avalanche pays off in N months; savings tax on a € 10,000 gain = € 1,980; channel date forecast (50 subscribers/week →
  105 days).
- **Database:** money in cents with no rounding error; all-or-nothing writes; migration of old databases (including the
  rebuild of `projetos`); restore with a safety copy and invalid names rejected.
- **Security:** token required, foreign `Host` blocked, path traversal blocked, API key never returned.
- **AI bridge (fake server):** the SDK sends `fallbacks="default"`, the beta header, `effort`, the tools and the system
  prompt; it does **not** send `temperature` or `thinking`; the reasoning block comes back untouched on the next turn;
  Haiku does not receive `fallbacks`; a 401 becomes a clear message.
- **Privacy:** "secret" texts that were entered never appear in API requests.
- **Interface:** statement with debit/credit and balance columns, import in R$, channel date forecast, US$ revenue
  converted, backup restore, no horizontal scroll on phones in every tab.

## Real flaws that the tests and the audit found

These flaws existed and were fixed, each with a regression test:

1. The emergency-fund target changed with the month the screen showed.
2. Pausing a subscription today altered the cost of past months.
3. Paying extra debt **raised** the essential cost and the emergency-fund target (paying debt "punished" the user).
4. All amounts in reais used the current FX rate, including old months.
5. Statements with debit/credit columns read zero rows, and the import had no currency choice.
6. The channel tab scrolled sideways on phones (a flex container with an auto margin shrinking to its content).

## What is not covered

- Running the package on **real Windows** and the Edge/Chrome window.
- A real Claude API call (the format is tested against a fake server).
- Automated accessibility tests and large-scale load tests.
