# Security Policy

## Supported versions

Only the latest release receives security fixes.

## How credentials are handled

- Your Nauta username and password are stored with `chrome.storage.local`, scoped to this extension. **Browsers do not encrypt extension storage at rest** — anyone with access to your OS user profile could read it. This is a deliberate trade-off for a no-dependency extension; if your threat model includes local attackers, prefer the native NautaConnect apps, which use the OS keychain/credential manager.
- Credentials are only ever sent to `https://secure.etecsa.net:8443` (the official ETECSA portal), over HTTPS, exactly like the portal's own login form.
- Session tokens (`CSRFHW`, `ATTRIBUTE_UUID`) are kept in extension storage for the lifetime of the session so you can log out even after a browser restart.
- No telemetry, no analytics, no third-party requests. The only host permission is the ETECSA portal.

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub Security Advisories ("Report a vulnerability" on the repository's Security tab). Do not open public issues for security problems. You should get a response within a week.

## Scope notes

- This is an unofficial client. Vulnerabilities in the portal itself (`secure.etecsa.net`) belong to ETECSA.
- Anything that could leak Nauta credentials or session tokens (logs, error reports, unintended hosts) is in scope.
