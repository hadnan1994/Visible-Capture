Prompt 1 — Create Public-Ready Project Skeleton

Create the full project skeleton for a public MIT Chrome Extension named Visible Page Data Capture.

Repository folder:

visible-page-data-capture/

Create this structure:

visible-page-data-capture/
  README.md
  LICENSE
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  SECURITY.md
  CHANGELOG.md
  manifest.json
  popup.html
  popup.css
  popup.js
  contentScript.js
  parser.js
  csv.js
  storage.js
  sample-data/
    simple-table.html
    card-list.html
  screenshots/
    .gitkeep
  icons/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  tests/
    parser.test.js
    csv.test.js
    storage.test.js
  package.json
  .gitignore

Manifest requirements:

Use Manifest V3.
Name: Visible Page Data Capture
Short name: Visible Capture
Description: Capture visible table and card data from the active tab and export it locally.
Version: 0.1.0
Default popup: popup.html
Permissions:
activeTab
scripting
storage
downloads
Do not add host permissions.

Create placeholder icons or simple generated PNG icons.

Add MIT License.

Add starter public-facing docs:

README.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md

Add sample local HTML files:

sample-data/simple-table.html
sample-data/card-list.html

The sample data must be fictional and generic.

Add package.json with:

"type": "module"
test script using Node’s built-in test runner or Vitest
lint placeholder script

Add .gitignore for Node and extension development.

Important constraints:

No crawler language.
No site-specific examples.
No specific website references.
No login automation.
No credential storage.
No external API calls.
No telemetry.
No remotely hosted code.

Deliver all files with working initial content.


---

# Prompt 2 — Build Beautiful Popup UI and Local Storage

Implement the popup UI and storage layer.

Files to update:

- `popup.html`
- `popup.css`
- `popup.js`
- `storage.js`

Popup content:

Title:

```text
Visible Capture

Subtitle:

Capture visible page data into CSV.

Status cards:

Current page
Rows found on current page
Total saved rows
Duplicate skipped
Last capture

Buttons:

Capture Visible Data
Preview Saved Rows
Download CSV
Copy CSV
Clear Saved Rows

Compliance note:

Only use this with data you are authorized to record or export. This tool only reads the active tab after you click capture.

Help section:

How to use:
1. Open a page with a visible table or list.
2. Click Capture Visible Data.
3. Review saved rows.
4. Manually move to another page if needed.
5. Capture again.
6. Download CSV.

UX requirements:

Beautiful, modern, polished popup
Dad-friendly / non-technical
Large readable buttons
Soft spacing
Good contrast
Clear success and error states
Preview table limited to first 10 saved rows
Disable Download and Copy when no rows exist
Confirm before clearing saved rows
Keyboard-friendly where reasonable

Storage requirements:

Use chrome.storage.local.

Store:

rows array
duplicate skipped count
last capture timestamp

Expose functions:

getState()
setState(state)
addRows(newRows)
clearState()
buildDedupKey(row)

Generic deduplication:

If Primary Link exists, use it.
Else if Raw Text exists, use normalized Raw Text.
Else use normalized JSON string of row values.

addRows(newRows) should return:

added count
duplicate count
total count

Popup behavior:

On open, load current state.
On Capture button click:
Use chrome.scripting.executeScript to run the active-tab capture.
Only run after user click.
Request rows from contentScript.js.
Add returned rows to local storage.
Update status.
On Preview:
Show a compact preview table inside the popup.
Limit to first 10 rows.
On Clear:
Confirm, then clear.
Handle errors gracefully with plain-English messages.

Important constraints:

Do not auto-run on page load.
Do not crawl.
Do not auto-click pagination.
Do not fetch background URLs.
Do not request host permissions.
Only act when the user clicks the popup button.

Deliver working code.


---

# Prompt 3 — Implement Generic Table and Card Capture

Implement the active-tab capture and generic parser.

Files to update:

- `contentScript.js`
- `parser.js`
- `tests/parser.test.js`

Core behavior:

1. `contentScript.js` should run only when injected by the popup after user action.

2. It should inspect the current active page DOM.

3. It should detect visible data in this order:
   - Useful HTML tables
   - Repeated card/list elements

4. It should not:
   - Click anything
   - Navigate
   - Fetch URLs
   - Open tabs
   - Access credentials
   - Read cookies
   - Run in the background

5. It should return parsed rows to `popup.js`.

## Table Detection

Detect visible `<table>` elements.

A useful table has:

- At least 2 rows
- At least 2 columns
- Visible text content
- Not clearly a layout-only table

Extract:

- Headers from `<thead>` when available
- Else from first row if it looks like headers
- Else generate `Column 1`, `Column 2`, etc.

For every row:

- Extract visible cell text
- Preserve links inside cells where available
- Add metadata:
  - `Source Page URL`
  - `Captured At`
  - `Raw Text`

## Card/List Detection

If no useful table is found, detect repeated card/list elements.

Generic strategy:

- Find visible elements with meaningful text.
- Group sibling elements with similar structure.
- Prefer elements that:
  - Have at least 3 text lines
  - Have a link or multiple short fields
  - Repeat at least 2 times under the same parent
- Ignore:
  - nav
  - header
  - footer
  - aside
  - forms
  - buttons-only areas
  - cookie banners
  - filter panels
  - menus
  - tiny UI controls
  - hidden elements

For every card:

- Extract first strong heading/link as `Title`
- Extract remaining meaningful text lines into:
  - `Field 1`
  - `Field 2`
  - `Field 3`
  - `Field 4`
  - `Field 5`
  - `Field 6`
  - `Field 7`
  - `Field 8`
- Extract first meaningful href as `Primary Link`
- Extract all hrefs as `All Links`
- Add:
  - `Source Page URL`
  - `Captured At`
  - `Raw Text`

Parser functions to implement:

- `captureVisiblePageData(document, locationHref)`
- `extractTables(document, locationHref)`
- `extractCards(document, locationHref)`
- `isVisible(element)`
- `getVisibleText(element)`
- `extractLinks(element, baseUrl)`
- `normalizeWhitespace(text)`
- `looksLikeHeaderRow(cells)`
- `makeUniqueHeaders(headers)`
- `buildGenericRowFromCard(card, locationHref)`
- `buildDedupKey(row)`

Tests:

1. Extracts rows from `sample-data/simple-table.html`.
2. Extracts generated headers when table headers are missing.
3. Extracts repeated cards from `sample-data/card-list.html`.
4. Ignores hidden elements.
5. Preserves primary link.
6. Preserves all links.
7. Preserves raw text.
8. Adds `Source Page URL`.
9. Adds `Captured At`.
10. Uses generic dedup key.
11. Does not require website-specific selectors.

Important constraints:

- No site-specific logic.
- No specific domain names.
- No crawler behavior.
- No login handling.
- No credential handling.
- No network requests.

Deliver working parser and tests.
Prompt 4 — Implement CSV Export, Clipboard Copy, and Download

Implement CSV creation, clipboard copy, and local download.

Files to update:

csv.js
popup.js
tests/csv.test.js

CSV requirements:

Export all detected columns.
Preserve stable column ordering:
Common data columns first
Extra dynamic columns next
Metadata columns last:
Source Page URL
Captured At
Raw Text
If rows have different columns, export the union of columns.
Use UTF-8 with BOM so Excel opens it correctly.
Escape correctly:
commas
quotes
newlines
empty fields
Filename format:
visible-capture-YYYY-MM-DD.csv
Download CSV should use chrome.downloads.download.
Copy CSV should copy the CSV content to clipboard.
If no rows are captured:
disable buttons
show clear message

CSV functions:

rowsToCsv(rows)
escapeCsvValue(value)
getOrderedHeaders(rows)
buildCsvBlob(rows)
buildDownloadFilename(date)

Tests:

Escapes values containing commas.
Escapes values containing quotes.
Escapes values containing newlines.
Handles empty fields.
Builds union columns.
Places metadata columns last.
Includes UTF-8 BOM.
Creates filename in correct format.

Important constraints:

No external APIs.
No network calls.
No remote code.
No credential handling.
No crawling.

Deliver working CSV export and copy behavior.


---

# Prompt 5 — Final Public README, Contributor Docs, QA, and Release Polish

Finish the project so it is public GitHub ready.

Files to update:

- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `popup.css`
- `popup.js`
- `manifest.json`
- tests as needed

## README Requirements

Create a beautiful public-facing README.

Include:

```md
# Visible Page Data Capture

> A local-first Chrome extension for capturing visible tables and repeated card data from pages you are authorized to use.

Badges:
- MIT License
- Chrome Extension
- Local First
- No Telemetry

## Why This Exists

Explain that many people need to move visible information into spreadsheets for personal organization, operations, research, inventory tracking, and administrative work.

Keep this generic.

Do not mention any specific website.

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

Add placeholders:
- Popup screenshot
- Preview screenshot
- CSV opened in spreadsheet screenshot

## Installation for Users

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

All data stays on your computer.

## Responsible Use

Only use this extension with data you are authorized to record or export. Respect website terms, privacy, rate limits, and access controls.

## Permissions Explained

Explain:
- `activeTab`
- `scripting`
- `storage`
- `downloads`

## Development

Include:
- clone
- npm install
- npm test
- load unpacked extension

## Project Structure

Explain main files.

## Testing

Explain test command.

## Roadmap

Include reasonable future ideas:
- Better card detection
- Column naming assistant
- JSON export
- XLSX export
- User-defined field mapping
- Import/export saved capture sessions

## Contributing

Point to CONTRIBUTING.md.

## Security

Point to SECURITY.md.

## License

MIT
Contributor Docs

CONTRIBUTING.md should include:

Welcome note
Development setup
Coding style
Testing requirements
Pull request checklist
Rule against adding crawling, credential handling, bypass features, telemetry, or site-specific targeting

SECURITY.md should include:

How to report security issues
Privacy/security principles
No credential handling policy

CODE_OF_CONDUCT.md should use a standard, concise contributor covenant style.

CHANGELOG.md should start with:

# Changelog

## 0.1.0 - Initial development

- Initial public MIT release.
- Visible table capture.
- Repeated card/list capture.
- Local storage.
- CSV export.
Manual QA Checklist

Add this to README or a separate section:

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
Release Checklist

Add this:

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
Final Code Polish
Improve popup styling.
Add helpful empty states.
Add clear error states.
Add comments around compliance-sensitive boundaries:
active-tab-only behavior
no crawling
no auto-pagination
no credential handling
no external calls
Ensure test suite passes.
Ensure no site-specific names, selectors, URLs, screenshots, or examples exist anywhere in the repo.

Deliver final public-ready version.