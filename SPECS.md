# NautaConnect extension — Technical Specifications

Manifest V3 browser extension (Chrome & Firefox) for the ETECSA Nauta captive portal (`https://secure.etecsa.net:8443/`). This document is the engineering reference: architecture, portal protocol, packaging and testing.

## 1. Requirements

- Chrome/Chromium 110+ (MV3 service worker), or Firefox 115+ (MV3 event scripts).
- Development: any editor. Node 18+ only if you want to run the tests. No build step, no npm packages.

## 2. Architecture

```
manifest.json            Chrome manifest (background.service_worker)
manifest.firefox.json    Firefox manifest (background.scripts + gecko id)
src/
  parse.js               Pure HTML/token parsing (shared with tests)
  background.js          Portal client, session state, messaging, badge
  popup/                 Toolbar popup (status, timers, connect/disconnect)
  options/               Options page (credentials, language)
_locales/en|es/          UI strings (messages.json)
icons/                   icon.svg + generated PNGs (16/32/48/128)
scripts/package.sh       Builds dist/nautaconnect-{chrome,firefox}.zip
test/                    Node tests + anonymized portal HTML fixtures
```

- **All portal traffic happens in the background script.** The popup and options pages only exchange messages with it (`getState`, `connect`, `disconnect`, `refreshTimeLeft`, `saveSettings`).
- The API namespace is resolved once (`browser` on Firefox, `chrome` elsewhere); both are used promise-style.
- One codebase, two manifests. Chrome requires a service worker; Firefox MV3 uses event pages (`background.scripts`), which also load `src/parse.js` explicitly since `importScripts` only exists in workers.

## 3. ETECSA portal protocol

Reverse-engineered from the official portal pages. **It can only be exercised on a real ETECSA network (Nauta WiFi / Nauta Hogar); there is no public sandbox.** Everything below must be re-verified on-network before a release.

Base URL: `https://secure.etecsa.net:8443`

### 3.1 Fetch login page

`GET /` (with `credentials: "include"` so the `JSESSIONID` cookie sticks). Parsed with `src/parse.js`:

| Token | Source | Regex |
|---|---|---|
| `CSRFHW` | hidden input | `name=["']CSRFHW["'][^>]*?value=["']([^"']*)["']` |
| `wlanuserip` | hidden input | same pattern, name `wlanuserip` |
| `loggerId` | hidden input | same pattern, name `loggerId` |

### 3.2 Login

`POST //LoginServlet` (double slash intentional — matches the portal form action) with `application/x-www-form-urlencoded` body:

`wlanuserip`, `wlanacname=""`, `wlanmac=""`, `firsturl=notFound.jsp`, `ssid=""`, `usertype=""`, `gotopage=/nauta_etecsa/LoginURL/pc_login.jsp`, `successpage=/nauta_etecsa/OnlineURL/pc_index.jsp`, `loggerId=<loggerId>+<username>`, `lang=es_ES`, `username`, `password`, `CSRFHW`.

- **Success**: body contains `ATTRIBUTE_UUID=<hex>` → regex `ATTRIBUTE_UUID=([A-Fa-f0-9]+)`. That UUID is the logout handle.
- **Failure**: body contains `alert("...")` → regex `alert\s*\(\s*["']([^"']+)["']`; the message is shown verbatim in the popup.

### 3.3 Logout

`GET /LogoutServlet?ATTRIBUTE_UUID=<uuid>&CSRFHW=<token>&wlanuserip=<ip>&username=<user>&remove=1`

Success ⇔ body contains `SUCCESS` (portal answers `logoutcallback('SUCCESS')`). On failure the stored session is kept so the user can retry — dropping it would strand them logged in.

### 3.4 Remaining time

`POST /EtecsaQueryServlet` with `op=getLeftTime&ATTRIBUTE_UUID=<uuid>&CSRFHW=<token>&wlanuserip=<ip>&username=<user>` → body contains `HH:MM:SS` → regex `(\d{1,3}:\d{2}:\d{2})`.

### 3.5 Session persistence

`{username, csrfhw, wlanuserip, attributeUUID, loginDate}` is written to `chrome.storage.local` right after login. Logout therefore works after closing every tab, restarting the browser, or the MV3 service worker being killed — the core promise of the extension.

## 4. State, badge and alarms

- Session state lives in storage, never in service-worker memory alone (MV3 workers die at will).
- While connected, `chrome.alarms` (1 min period) refreshes the toolbar badge with the elapsed time (`H:MM`), badge color `#00CCFF`. The popup computes seconds locally from `loginDate`.
- On worker wake-up, state is re-derived from storage.

## 5. Storage & security

| Data | Where |
|---|---|
| Credentials | `chrome.storage.local` (see [SECURITY.md](SECURITY.md) for the trade-off) |
| Session tokens, language | `chrome.storage.local` |

Only host permission: `https://secure.etecsa.net:8443/*`. Permissions: `storage`, `alarms`.

## 6. Localization

`_locales/en` and `_locales/es` (`messages.json`). The manifest name/description use `__MSG___` keys with `default_locale: en`. Because `chrome.i18n` cannot switch language at runtime, the popup/options load the chosen locale's `messages.json` directly (`fetch` of the packaged file) and apply it to `[data-i18n]` nodes; "auto" follows `chrome.i18n.getUILanguage()`.

## 7. Packaging

```sh
./scripts/package.sh
# → dist/nautaconnect-chrome.zip   (manifest.json)
# → dist/nautaconnect-firefox.zip  (manifest.firefox.json renamed to manifest.json)
```

Load unpacked for development: `chrome://extensions` → Load unpacked (repo root). Firefox: `about:debugging` → Load Temporary Add-on. For Firefox development from the repo root, temporarily rename `manifest.firefox.json` → `manifest.json`.

## 8. Testing

```sh
node --test
```

Runs the parser against anonymized HTML fixtures (login page, online page, failed login) — same fixtures as the sibling native apps. Tokens/IPs are synthetic.

The full login/logout flow **cannot be tested off-network**. On-network release checklist:

1. Connect with a valid account → badge timer starts.
2. Close the popup, restart the browser → state restored, Disconnect works.
3. Disconnect → portal confirms `SUCCESS`, badge clears.
4. Wrong password → portal alert message shown in the popup.
5. Remaining time matches the portal's own online page.

## 9. Roadmap

- **[nauta.cu](https://www.nauta.cu/) user portal integration**: balance, expiry, recharges and transfers from the popup. Separate host, separate auth (captcha involved) — kept out of v1.
- Low-time notifications via `chrome.notifications` fed by §3.4 polling.
- Store listings (Chrome Web Store / AMO) once the flow is field-verified.
