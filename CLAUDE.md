# NautaConnect browser extension — agent rules

- All code, comments, and commit messages are written in English.
- User-facing strings live in `_locales/en` and `_locales/es` — always add both; never hardcode UI text.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`). Subject ≤ 50 chars.
- Do not add `Co-Authored-By` trailers or any AI attribution to commits.
- Vanilla JavaScript only, Manifest V3, no build step, no npm dependencies (Node is used solely to run tests).
- One codebase, two manifests: `manifest.json` (Chrome) and `manifest.firefox.json` (Firefox). Keep them in sync.
- The ETECSA portal protocol is documented in [SPECS.md](SPECS.md); any change to endpoints or parsing must update it.
- Never commit real Nauta credentials, tokens, or captures containing them. Test fixtures must be anonymized.
