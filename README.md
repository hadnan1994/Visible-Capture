# Visible Page Data Capture

> A local-first Chrome extension for capturing visible tables and repeated card data from pages you are authorized to use.

`MIT License` `Chrome Extension` `Local First` `No Telemetry`

Visible Page Data Capture, also called Visible Capture, helps turn visible page data into a local CSV file. It runs only after you click the capture button, reads only the active tab, and keeps saved rows on your computer.

## Why This Exists

Many people need to move visible information into spreadsheets for personal organization, operations, research, inventory tracking, and administrative work. Sometimes that data is already visible on a page, but copying it by hand is slow and error-prone.

Visible Capture provides a simple local workflow: capture visible rows, review them, skip duplicates, and export a CSV.

## What It Does

- Captures visible HTML tables.
- Captures repeated visible cards/lists.
- Stores rows locally.
- Exports CSV.
- Copies CSV to clipboard.
- Preserves raw text for review.
- Works without external services.

## What It Does Not Do

- Does not log in.
- Does not store credentials.
- Does not crawl websites.
- Does not auto-click pagination.
- Does not open detail pages.
- Does not bypass CAPTCHA, bot checks, rate limits, paywalls, or access controls.
- Does not upload data.
- Does not call external APIs.
- Does not include site-specific extraction logic.

## Screenshots

Screenshots are planned for the first packaged release.

| Screenshot | Placeholder |
| --- | --- |
| Popup screenshot | `screenshots/popup.png` |
| Preview screenshot | `screenshots/preview.png` |
| CSV opened in spreadsheet screenshot | `screenshots/csv-spreadsheet.png` |

## Installation For Users

1. Download the latest release ZIP.
2. Unzip it.
3. Open Chrome.
4. Go to `chrome://extensions`.
5. Turn on Developer Mode.
6. Click Load unpacked.
7. Select the extension folder.

## Usage

1. Open a page with a visible table or repeated list/card data.
2. Click the extension icon.
3. Click Capture Visible Data.
4. Review saved rows.
5. Manually move to another page if needed.
6. Capture again.
7. Click Download CSV.
8. Open the CSV in Excel, Numbers, Google Sheets, or LibreOffice.

## Privacy

All data stays on your computer. Visible Capture stores captured rows in `chrome.storage.local` and does not upload data, call external services, include analytics, or load remotely hosted runtime code.

## Responsible Use

Only use this extension with data you are authorized to record or export. Respect website terms, privacy, rate limits, and access controls.

## Permissions Explained

- `activeTab`: allows capture from the current tab only after you click the extension.
- `scripting`: allows the popup to inject the local parser into the active tab after your click.
- `storage`: saves captured rows locally in Chrome extension storage.
- `downloads`: saves the generated CSV file to your computer.

The extension does not request host permissions.

## Development

```sh
git clone <repository-url>
cd visible-capture
npm install
npm test
```

To run the extension locally:

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on Developer Mode.
4. Click Load unpacked.
5. Select this project folder.

## Project Structure

- `manifest.json`: Chrome Extension Manifest V3 metadata and permissions.
- `popup.html`, `popup.css`, `popup.js`: popup interface and user-triggered actions.
- `contentScript.js`: active-tab capture entry point injected only after a user click.
- `parser.js`: generic visible table and repeated card/list parser.
- `storage.js`: local saved-row state and deduplication helpers.
- `csv.js`: CSV header ordering, escaping, copy, and download helpers.
- `sample-data/`: fictional local pages for manual testing.
- `tests/`: Node test suite.
- `icons/`: packaged extension icons.

## Testing

Run the full test suite:

```sh
npm test
```

Run the placeholder lint command:

```sh
npm run lint
```

## Manual QA Checklist

- Extension loads unpacked in Chrome.
- Popup opens.
- Capture button does not run automatically.
- Capture button only runs after user click.
- Captures visible rows from sample table page.
- Captures visible cards from sample card page.
- Does not navigate.
- Does not click pagination.
- Does not open detail pages.
- Does not make network requests.
- Stores rows locally.
- Deduplicates rows.
- Preview shows first 10 rows.
- Download CSV works.
- Copy CSV works.
- Clear rows works after confirmation.
- CSV opens in Excel.
- Raw Text is preserved.

## Release Checklist

- Run tests.
- Load unpacked extension.
- Test on sample table page.
- Test on sample card page.
- Confirm no host permissions.
- Confirm no background crawling.
- Confirm no credentials are stored.
- Confirm no external network calls.
- Zip the extension folder.
- Create GitHub release.

## Roadmap

- Better card detection.
- Column naming assistant.
- JSON export.
- XLSX export.
- User-defined field mapping.
- Import/export saved capture sessions.

## Contributing

Contributions are welcome. Please read `CONTRIBUTING.md` before opening a pull request.

## Security

Please report security issues using the process in `SECURITY.md`.

## License

MIT. See `LICENSE`.
