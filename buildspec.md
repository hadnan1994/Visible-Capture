# Visible Page Data Capture — Public MIT Chrome Extension

## Project Goal

Build a public, MIT-licensed Chrome extension that helps users capture visible table or card-style data from the currently active browser tab and export it to CSV.

The extension is intended for users who need to organize data they are already authorized to view or record, especially when a website does not provide a convenient export button.

This must be a generic visible-page capture tool, not a crawler, scraper framework, or site-specific extractor.

## Product Name

Visible Page Data Capture

Alternative short name:

Visible Capture

## Public Repository Goal

This project should be suitable for a public GitHub repository under the MIT License.

The repo should be clean, professional, and welcoming to contributors.

The README should be beautiful, clear, and useful for both non-technical users and developers.

## Core Positioning

Use language like:

> A local-first Chrome extension for capturing visible tables and repeated card data from pages you are authorized to use.

Do not use language like:

- scraper
- crawler
- bot
- bypass
- harvest
- automate data extraction at scale
- target specific websites

## Important Compliance Constraints

This project must not be a crawler or automated scraper.

The extension must:

- Only run after the user clicks the extension button.
- Only read data from the currently active browser tab.
- Only capture data already visible or loaded in the current page DOM.
- Never automate login.
- Never store usernames, passwords, cookies, tokens, or session data.
- Never bypass CAPTCHA, bot protection, rate limits, paywalls, or access controls.
- Never auto-click pagination.
- Never open detail pages automatically.
- Never fetch protected URLs in the background.
- Never crawl result pages.
- Never call external APIs.
- Never upload data.
- Never include telemetry.
- Never include remotely hosted code.
- Never include site-specific selectors, examples, screenshots, or instructions.

The extension should be framed as a visible-page productivity and accessibility tool.

## User Workflow

1. User opens a web page containing a visible table or repeated card/list items.
2. User clicks the Chrome extension icon.
3. User clicks `Capture Visible Data`.
4. Extension detects visible table rows or repeated cards on the current page.
5. Extension previews captured rows.
6. User can manually navigate to another page if desired.
7. User clicks capture again.
8. Extension deduplicates locally.
9. User downloads CSV.
10. User opens CSV in Excel, Numbers, Google Sheets, LibreOffice, or another spreadsheet app.

## What This Extension Does

- Captures visible HTML tables from the active tab.
- Captures repeated card/list-style data from the active tab.
- Stores captured rows locally in Chrome extension storage.
- Deduplicates repeated rows.
- Exports CSV with Excel-friendly UTF-8 BOM.
- Copies CSV to clipboard.
- Preserves raw text for review.
- Works locally.

## What This Extension Does Not Do

- Does not log in.
- Does not store credentials.
- Does not crawl.
- Does not auto-click pagination.
- Does not open detail pages.
- Does not bypass CAPTCHA, bot checks, rate limits, paywalls, or access controls.
- Does not upload data.
- Does not call external APIs.
- Does not use remote code.
- Does not include site-specific extraction logic.
- Does not guarantee compatibility with every website.

## License

MIT License.

## Browser Support

Chrome latest stable.

## Extension Standard

Use Chrome Extension Manifest V3.

## Required Permissions

Use minimum permissions:

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "downloads"
  ]
}

Avoid host permissions.

Do not request broad host permissions.

Privacy Requirements
All processing local.
No analytics.
No telemetry.
No external network calls.
No credential handling.
No hidden background behavior.
No remote code.
Required Project Structure

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
Popup UX Requirements

The popup should be beautiful, simple, and clear.

Popup title:

Visible Capture

Subtitle:

Capture visible page data into CSV.

Status section:

Current page status
Rows found on current page
Total saved rows
Duplicate skipped count
Last capture timestamp

Buttons:

Capture Visible Data
Preview Saved Rows
Download CSV
Copy CSV
Clear Saved Rows

Compliance note visible in popup:

Only use this with data you are authorized to record or export. This tool only reads the active tab after you click capture.

Design requirements:

Modern, polished UI
No clutter
Large readable buttons
Soft spacing
Clear messages
Good contrast
Works in a small Chrome extension popup
Accessible labels
Keyboard-friendly where reasonable
Capture Strategy

The extension should detect two major content types:

1. HTML Tables

If one or more visible <table> elements are found:

Extract headers from <thead>, first row, or nearby labels.
Extract visible rows only.
Preserve links when available.
Add Source Page URL.
Add Captured At.
Add Raw Text.
2. Repeated Cards / Lists

If no useful table is found:

Detect repeated sibling elements with similar structure.
Prefer containers with multiple text fields and links.
Ignore navigation bars, menus, filters, footers, headers, ads, and tiny UI elements.
Extract visible text lines.
Extract links.
Create generic columns:
Title
Field 1
Field 2
Field 3
Field 4
Field 5
Field 6
Field 7
Field 8
Primary Link
All Links
Source Page URL
Captured At
Raw Text

The parser should be generic. It should not contain logic for any specific website.

Generic Data Fields

For table captures, use table headers where available.

For card captures, use this stable default order:

Title
Field 1
Field 2
Field 3
Field 4
Field 5
Field 6
Field 7
Field 8
Primary Link
All Links
Source Page URL
Captured At
Raw Text

If table captures and card captures are mixed, export a union of all columns while preserving common metadata columns at the end:

Source Page URL
Captured At
Raw Text
Deduplication Strategy

Use best-effort generic deduplication:

If a row has a primary link, use that.
Else use normalized row text.
Else use a hash of all field values.

Do not use site-specific identifiers.

CSV Requirements

CSV output should:

Use UTF-8 with BOM for Excel compatibility.
Use stable column order.
Escape commas, quotes, and newlines correctly.
Include all detected columns.
Preserve metadata columns:
Source Page URL
Captured At
Raw Text
Download filename format:
visible-capture-YYYY-MM-DD.csv
README Requirements

Create a polished, public-facing README.

The README should include:

Project title and tagline
Badges:
MIT License
Chrome Extension
Local First
No Telemetry
Short demo description
What it does
What it does not do
Screenshots section with placeholders
Installation for non-technical users
Installation for developers
Usage guide
Privacy section
Compliance and responsible use section
Permissions explained
Development setup
Project structure
Testing
Roadmap
Contributing
Security policy link
License

README tone:

Friendly
Clear
Professional
Public open-source quality
No references to any specific data website
No instructions for bypassing restrictions
No site-specific examples
Sample Data Requirements

Create two local sample HTML files:

sample-data/simple-table.html

A generic table of fictional inventory items.

Example columns:

Item ID
Name
Category
Location
Status
Price
sample-data/card-list.html

A generic card list of fictional items.

Each card should include:

Title
ID
Category
Location
Status
Price
Link

These are for testing the extension locally without targeting any real website.

Testing Requirements

Use Node’s built-in test runner or Vitest.

Tests should cover:

Parser Tests
Extracting a basic HTML table
Extracting a table with missing headers
Extracting repeated cards
Ignoring hidden elements
Preserving links
Preserving raw text
Adding metadata
Generic deduplication key generation
CSV Tests
Header order
Union columns
Escaping commas
Escaping quotes
Escaping newlines
UTF-8 BOM
Filename format
Storage Tests
Adding rows
Deduplicating rows
Clearing rows
Counting duplicates
Code Quality Requirements
Plain JavaScript, HTML, CSS
No framework required
No build step required for extension usage
Modular JS files
Testable parser and CSV modules
Comments around compliance-sensitive boundaries
No minified code in source
No external scripts
No remote assets
Final Deliverable

A complete public-ready MIT Chrome extension repository that can be loaded unpacked in Chrome and used locally.