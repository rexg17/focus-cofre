# Security and privacy

🌐 **English** · [Português](../pt-BR/SEGURANCA-E-PRIVACIDADE.md) · [Español](../es/SEGURIDAD-Y-PRIVACIDAD.md) · [← README](../../README.md)

## Threat model

The app is local: the main risks are **another page or program trying to use the local server**, and **data leaving the
computer without you knowing**. Defending against malware already running as the same user is not a goal.

## Local server

| Threat | Defence |
|---|---|
| An external site calling `127.0.0.1` | No CORS headers (the browser blocks reading) and a mandatory **per-session token** (`X-Cofre-Token`), compared in constant time |
| *DNS rebinding* | The `Host` header must be `127.0.0.1` or `localhost` |
| *Path traversal* on static files | The path is resolved and must be inside `web/`, with allowed extensions only (tested: `/js/../../app.py` → 404) |
| Malicious or corrupted input | Strict validation of types, sizes and values (`db.save_state`); body limits (state 20 MB, AI 2 MB, restore 10 KB) |
| SQL injection | Parameterized queries only; table names are constants |
| Restoring an arbitrary file | Backup name validated by a regular expression (`cofre-YYYY-MM-DD.db`), integrity check and a safety copy before restoring |

The server does not log request contents.

## Claude API key

- Stored in `settings.json`, in the user's data folder, with `0600` permission where supported.
- **Never** sent to the browser: `/api/settings` only says whether a key exists. It is also not part of the state or backups.
- Limitation: the file is plain text. Turn on disk encryption (BitLocker).

## What is sent to the AI (and what is not)

**Sent:** the messages you type and the results of the 10 tools: totals, averages, deadlines, progress and category names.
**Never sent:** client names, entry descriptions, account or debt names, the API key and the database. An end-to-end test
creates "secret" texts and checks that none of them appear in any API request.
The screen shows the last request under "What the app sends to the AI".
Messages you type are free text: whatever you write goes along.

## Data at rest and backups

The database is **not encrypted** by the app. Daily backups (last 14) stay in the data folder; an extra folder
(OneDrive, Dropbox, USB stick) can be configured. Whoever syncs that folder to the cloud puts the data there.

## Known gaps

- No database encryption (disk encryption recommended).
- Unsigned binary: SmartScreen warns on first run.
- No authentication between local processes of the same user.
- Tax rates and platform requirements are educational references and may be out of date.
