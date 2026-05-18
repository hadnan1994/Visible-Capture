# Contributing

Thanks for helping improve Visible Capture. This project is intentionally simple: it captures visible page data after a user click, stores rows locally, and exports CSV.

## Development Setup

```sh
git clone <repository-url>
cd visible-capture
npm install
npm test
```

To test the extension in Chrome, load this folder as an unpacked extension from `chrome://extensions`.

## Coding Style

- Keep JavaScript small, readable, and dependency-light.
- Prefer generic DOM logic over special cases.
- Keep UI copy plain and non-technical.
- Keep user-facing examples fictional and generic.
- Add comments for compliance-sensitive behavior when the boundary is not obvious.
- Do not add remotely hosted runtime code.

## Testing Requirements

- Run `npm test` before opening a pull request.
- Add or update tests when parser, storage, CSV, or permission behavior changes.
- Manually test the sample table and sample card pages for user-facing changes.

## Pull Request Checklist

- The change is user-initiated and active-tab-only.
- Tests pass with `npm test`.
- No host permissions were added.
- No telemetry, analytics, external API calls, or remote runtime code were added.
- No crawling, background capture, auto-pagination, link opening, or page navigation was added.
- No login automation, credential handling, cookie handling, token handling, or session storage was added.
- No bypass features were added for CAPTCHA, bot checks, rate limits, paywalls, or access controls.
- No site-specific targeting, selectors, screenshots, examples, or instructions were added.
- Public docs stay generic, clear, and respectful of responsible use.

## Project Boundaries

Visible Capture is a local-first productivity tool. It should not become a crawler, account automation tool, site-specific extractor, or hosted data service. Changes outside that scope should be declined.
