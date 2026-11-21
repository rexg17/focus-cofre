# Financial engine

🌐 **English** · [Português](../pt-BR/MOTOR-FINANCEIRO.md) · [Español](../es/MOTOR-FINANCIERO.md) · [← README](../../README.md)

Business rules live in `web/js/02-calculos.js`, `08-coach.js`, `09b-canal.js` and `09c-cerebro.js`.
Everything is computed in euros; amounts in other currencies are converted with the transaction's FX rate.

## Available income and the split rule

```
income       = personal income + work income (salary × payments, extra income, paid projects, channel)
available    = income − work cost (AI and tools) − tax reserve
free balance = available − needs − wants − invested
```
The default 50/30/20 rule (needs/wants/invest) is configurable. **Extra pay:** with 14 payments a year, June and
December count double.

## Essential cost and targets

- **Average essential cost** = average of needs over the last 3 months (current and two previous) **excluding** debt
  payments, **plus** the minimum payment of active debts. It excludes work costs (they disappear if the work stops).
- **Cash target** = cash months (default 1) × essential. **Emergency-fund target** = months (default 6) × essential.
- The target **does not depend on the month shown on screen** and is not inflated by extra debt payments (real flaws
  the audit found and the tests now cover).

## Monthly capacity

Average, over the last 3 months with income, of `free balance + invested + paid toward debt`. Adding back what was
paid toward debt prevents paying off debt from "reducing" the capacity to save.

## Steps

1. Get organized (income, accounts and ≥ 8 entries/subscriptions) → 2. Build the cash buffer → 3. Pay off debts →
4. Emergency fund → 5. Invest every month (target % of available income) → 6. Extra income (target set by the user).

The current step is the first one not completed. Each step has progress from 0 to 100%.

## Next action

A set of rules produces candidates with a priority and details (`det`), for example: negative balance (98), late
payments (90), pending check-in (88), cash below target (85), debt (80), emergency fund (60–75), limits exceeded (65),
missing tax reserve (62). The highest priority becomes "your next action", with the table of numbers behind it.

## Monthly plan ("pay yourself first")

Distributes the monthly capacity: cash (up to 60% if there are more goals) → highest-interest debt (up to 70% of the
remainder if the emergency fund is incomplete) → emergency fund → invest the surplus.

## Debts (avalanche)

Each month: monthly interest (`rate/12`), the minimum payment on every debt, and all the remaining budget on the
**highest-interest** debt. Returns months until paid off and total estimated interest (limit of 600 months).

## Health score (0–100)

| Component | Weight |
|---|---|
| Emergency fund | 25 |
| Debts | 20 |
| Savings this month | 20 |
| Cash | 15 |
| Work income (concentration on one client lowers it) | 10 |
| Consistency (consecutive weeks of check-in, max 4) | 10 |

## Cash forecast (6 months)

Starting balance = cash accounts. Each month: inflows (salary × payments, recurring inflows, expected projects, average
channel revenue) − outflows (recurring fixed costs, subscriptions, the **larger of** average variable spending and
explicit entries, minimum debt payments). The balance shown is before transfers to the emergency fund or debts.

## Habits and anomalies

- **Category above normal:** this month's spending > 1.5× the average of the 3 previous months, with average ≥ € 20 and difference ≥ € 30.
- **One-off expense:** amount > 4× the category median over the last 90 days (minimum 5 entries and € 80).
- **Trends:** slope (linear regression) of the savings rate and spending over the last 4 months; the coefficient of variation of work income flags volatile income.

## Estimated account balance

`reported balance + Σ entries linked to the account dated after the last update`, converting currencies.
Importing a statement with a balance column updates the account's balance and date.

## Content channel

Monetization requirements (YouTube and Twitch) live in an editable table in the code; the app warns that they change.
**Estimated date:** linear regression over the last weeks of a cumulative metric (subscribers, hours, followers);
needs ≥ 3 records and positive growth. Rolling-window metrics (minutes in 30 days, etc.) show status only.

## Tax on gains (Spain, reference)

Savings-income scale by bracket: 19% up to € 6,000, 21% up to € 50,000, 23% up to € 200,000, 27% up to € 300,000,
28% above. Applied to the total gain as if everything were sold. It is an educational estimate; confirm current values.
