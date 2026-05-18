# Security Policy

## Reporting Security Issues

Please report security issues privately to the project maintainers using the repository's preferred private contact path.

Include:

- A clear description of the issue.
- Steps to reproduce it.
- The affected version or commit, if known.
- Browser and operating system details, if relevant.

Do not include real credentials, private page data, cookies, tokens, or session values in reports.

## Privacy And Security Principles

Visible Capture should:

- Run capture only after a user clicks Capture Visible Data.
- Read only the active tab.
- Store captured rows locally.
- Avoid host permissions.
- Avoid external network calls.
- Avoid telemetry and analytics.
- Avoid remotely hosted runtime code.
- Avoid background capture.
- Avoid automatic navigation, auto-pagination, or link opening.
- Avoid site-specific targeting.

## No Credential Handling Policy

Visible Capture must never request, collect, store, inspect, transmit, or manage usernames, passwords, cookies, tokens, session data, or other credentials.

Changes that weaken this policy should not be accepted.
