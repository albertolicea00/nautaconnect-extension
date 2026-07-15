# Contributing to the NautaConnect extension

Thanks for helping! This is a small, focused project — the bar for a good PR is low, the bar for keeping the extension tiny is high.

## Ground rules

- **All code, comments and commit messages are in English.** UI strings go to `_locales/en` **and** `_locales/es` — never hardcode user-facing text.
- **Vanilla JS, MV3, zero dependencies, no build step.** PRs adding npm packages, bundlers or frameworks will be declined.
- Both browsers matter: keep `manifest.json` (Chrome) and `manifest.firefox.json` in sync, and remember Firefox MV3 has no service-worker `importScripts` path — shared code is listed in `background.scripts`.
- Keep [SPECS.md](SPECS.md) in sync: any change to portal endpoints, parameters or parsing must update it in the same PR.
- Never commit real credentials or raw portal captures — fixtures must be anonymized (synthetic tokens/IPs).

## Dev setup

```sh
git clone <your fork>
cd nautaconnect-extension
node --test        # parser tests (Node 18+)
```

- **Chrome**: `chrome://extensions` → Developer mode → *Load unpacked* → repo root.
- **Firefox**: rename `manifest.firefox.json` to `manifest.json` (don't commit that), then `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on*.
- Package release zips with `./scripts/package.sh`.

## Commit style — Conventional Commits

```
<type>: <short imperative summary, ≤ 50 chars>

Optional body explaining *why*, wrapped at 72 chars.
```

Types used here: `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `refactor`.

Examples:

```
feat: show low-time warning in badge
fix: keep session when logout returns FAILURE
docs: document EtecsaQueryServlet quirks
```

One logical change per commit. No `Co-Authored-By` or tool-attribution trailers.

## Pull requests

1. Fork, branch from `main` (`feat/...`, `fix/...`).
2. Make sure `node --test` passes and the extension loads in both browsers.
3. If you touched the portal protocol and could verify it on a real ETECSA network, say so in the PR description — it is the only way to truly test it.
4. Fill in the PR template. Small PRs get reviewed fast.

## Reporting bugs

Use the issue templates. For anything involving credentials or session leakage, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
