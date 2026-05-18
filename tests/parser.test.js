import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

await import("../parser.js");

const parser = globalThis.VisibleCaptureParser;
const SAMPLE_URL = "file:///visible-capture/sample.html";
const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BODY",
  "DIV",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "UL"
]);
const VOID_TAGS = new Set(["AREA", "BASE", "BR", "COL", "EMBED", "HR", "IMG", "INPUT", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"]);

class MiniTextNode {
  constructor(text, ownerDocument) {
    this.nodeType = 3;
    this.textContent = text;
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
  }
}

class MiniElement {
  constructor(tagName, attributes, ownerDocument) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(
      Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value])
    );
    this.childNodes = [];
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === 1);
  }

  get hidden() {
    return this.getAttribute("hidden") != null;
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent || "").join("");
  }

  get innerText() {
    return collectVisibleText(this).replace(/\n{3,}/g, "\n\n").trim();
  }

  getAttribute(name) {
    const key = name.toLowerCase();
    return this.attributes.has(key) ? this.attributes.get(key) : null;
  }

  matches(selector) {
    return splitSelectorList(selector).some((part) => matchesSelectorChain(this, part));
  }

  closest(selector) {
    let current = this;

    while (current && current.nodeType === 1) {
      if (current.matches(selector)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const selectors = splitSelectorList(selector);

    for (const descendant of descendantsOf(this)) {
      if (selectors.some((part) => matchesSelectorChain(descendant, part))) {
        matches.push(descendant);
      }
    }

    return matches;
  }

  contains(node) {
    let current = node;

    while (current) {
      if (current === this) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  getClientRects() {
    return [{}];
  }
}

class MiniDocument {
  constructor() {
    this.nodeType = 9;
    this.childNodes = [];
    this.ownerDocument = this;
    this.defaultView = {
      getComputedStyle(element) {
        const style = parseStyle(element.getAttribute("style") || "");
        return {
          display: style.display || "",
          visibility: style.visibility || "",
          opacity: style.opacity || ""
        };
      }
    };
  }

  appendChild(child) {
    child.parentElement = null;
    this.childNodes.push(child);
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === 1);
  }

  get title() {
    return this.querySelector("title")?.textContent.trim() || "";
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const selectors = splitSelectorList(selector);

    for (const descendant of descendantsOf(this)) {
      if (selectors.some((part) => matchesSelectorChain(descendant, part))) {
        matches.push(descendant);
      }
    }

    return matches;
  }
}

function parseStyle(styleText) {
  return Object.fromEntries(
    String(styleText)
      .split(";")
      .map((part) => part.split(":").map((piece) => piece.trim()))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key.toLowerCase(), value])
  );
}

function isHiddenForText(element) {
  if (!element || element.nodeType !== 1) {
    return false;
  }

  if (
    element.hidden ||
    element.getAttribute("aria-hidden") === "true" ||
    ["SCRIPT", "STYLE", "TEMPLATE"].includes(element.tagName)
  ) {
    return true;
  }

  const style = parseStyle(element.getAttribute("style") || "");
  return style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse";
}

function collectVisibleText(node) {
  if (node.nodeType === 3) {
    return node.textContent;
  }

  if (isHiddenForText(node)) {
    return "";
  }

  const pieces = node.childNodes.map((child) => {
    const text = collectVisibleText(child);
    if (child.nodeType === 1 && BLOCK_TAGS.has(child.tagName)) {
      return `\n${text}\n`;
    }

    return text;
  });

  return pieces.join("");
}

function descendantsOf(node) {
  const descendants = [];
  const stack = [...(node.childNodes || [])];

  while (stack.length > 0) {
    const current = stack.shift();
    if (current.nodeType === 1) {
      descendants.push(current);
      stack.unshift(...current.childNodes);
    }
  }

  return descendants;
}

function splitSelectorList(selector) {
  const parts = [];
  let current = "";
  let bracketDepth = 0;

  for (const char of selector) {
    if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth -= 1;
    }

    if (char === "," && bracketDepth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function splitSelectorChain(selector) {
  const parts = [];
  let current = "";
  let bracketDepth = 0;

  for (const char of selector.trim()) {
    if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth -= 1;
    }

    if (/\s/.test(char) && bracketDepth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function matchesSelectorChain(element, selector) {
  const parts = splitSelectorChain(selector);
  if (parts.length === 0 || !matchesSimpleSelector(element, parts.at(-1))) {
    return false;
  }

  let current = element.parentElement;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    while (current && !matchesSimpleSelector(current, parts[index])) {
      current = current.parentElement;
    }

    if (!current) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

function matchesSimpleSelector(element, selector) {
  const tagMatch = selector.match(/^[a-z0-9-]+/i);
  const tagName = tagMatch ? tagMatch[0].toUpperCase() : "";
  const attrMatches = Array.from(selector.matchAll(/\[([^\]=]+)(?:=['"]?([^'"\]]+)['"]?)?\]/g));

  if (tagName && element.tagName !== tagName) {
    return false;
  }

  for (const match of attrMatches) {
    const attrName = match[1];
    const expectedValue = match[2];
    const actualValue = element.getAttribute(attrName);

    if (actualValue == null) {
      return false;
    }

    if (expectedValue != null && actualValue !== expectedValue) {
      return false;
    }
  }

  return Boolean(tagName || attrMatches.length > 0);
}

function parseAttributes(attributeText) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;

  while ((match = attributePattern.exec(attributeText)) !== null) {
    attributes[match[1]] = match[2] || match[3] || match[4] || "";
  }

  return attributes;
}

function parseHtml(html) {
  const document = new MiniDocument();
  const stack = [document];
  const tokenPattern = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[^>]+>|[^<]+/gi;
  let match;

  while ((match = tokenPattern.exec(html)) !== null) {
    const token = match[0];

    if (token.startsWith("<!--") || /^<!doctype/i.test(token)) {
      continue;
    }

    if (token.startsWith("</")) {
      const tagName = token.slice(2, -1).trim().toUpperCase();

      while (stack.length > 1) {
        const current = stack.pop();
        if (current.tagName === tagName) {
          break;
        }
      }

      continue;
    }

    if (token.startsWith("<")) {
      const raw = token.slice(1, -1).trim();
      const selfClosing = raw.endsWith("/");
      const tagName = raw.replace(/\/$/, "").trim().split(/\s+/)[0];
      const attributeText = raw.slice(tagName.length).replace(/\/$/, "");
      const element = new MiniElement(tagName, parseAttributes(attributeText), document);

      stack.at(-1).appendChild(element);

      if (!selfClosing && !VOID_TAGS.has(element.tagName)) {
        stack.push(element);
      }

      continue;
    }

    if (token.trim()) {
      stack.at(-1).appendChild(new MiniTextNode(token, document));
    }
  }

  return document;
}

function docFromSample(path) {
  return parseHtml(readFileSync(new URL(path, import.meta.url), "utf8"));
}

test("extracts rows from sample-data/simple-table.html", () => {
  const doc = docFromSample("../sample-data/simple-table.html");
  const result = parser.captureVisiblePageData(doc, SAMPLE_URL);

  assert.equal(result.rows.length, 3);
  assert.equal(result.summary.tableRows, 3);
  assert.equal(result.summary.cardRows, 0);
  assert.equal(result.rows[0].fields.Item, "Notebook Set");
  assert.equal(result.rows[0].fields.Category, "Office");
});

test("extracts generated headers when table headers are missing", () => {
  const doc = parseHtml(`
    <main>
      <table>
        <tr><td>Notebook Set</td><td>24</td></tr>
        <tr><td>Desk Lamp</td><td>8</td></tr>
      </table>
    </main>
  `);
  const rows = parser.extractTables(doc, SAMPLE_URL);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].fields["Column 1"], "Notebook Set");
  assert.equal(rows[0].fields["Column 2"], "24");
});

test("extracts repeated cards from sample-data/card-list.html", () => {
  const doc = docFromSample("../sample-data/card-list.html");
  const result = parser.captureVisiblePageData(doc, SAMPLE_URL);

  assert.equal(result.rows.length, 3);
  assert.equal(result.summary.tableRows, 0);
  assert.equal(result.summary.cardRows, 3);
  assert.equal(result.rows[0].fields.Title, "Atlas Review");
  assert.match(result.rows[0].fields["Field 1"], /Owner: Morgan Lee/);
});

test("ignores hidden elements", () => {
  const doc = parseHtml(`
    <main>
      <table>
        <tr><th>Name</th><th>Status</th></tr>
        <tr><td>Visible Item</td><td>Ready</td></tr>
        <tr hidden><td>Hidden Item</td><td>Hidden</td></tr>
      </table>
    </main>
  `);
  const rows = parser.extractTables(doc, SAMPLE_URL);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].fields.Name, "Visible Item");
  assert.doesNotMatch(rows[0].fields["Raw Text"], /Hidden Item/);
});

test("preserves primary link", () => {
  const doc = parseHtml(`
    <main>
      <ul>
        <li><a href="/alpha"><strong>Alpha Card</strong></a><p>Owner: Morgan</p><p>Status: Ready</p></li>
        <li><a href="/beta"><strong>Beta Card</strong></a><p>Owner: Riley</p><p>Status: Review</p></li>
      </ul>
    </main>
  `);
  const rows = parser.extractCards(doc, SAMPLE_URL);

  assert.equal(rows[0].fields["Primary Link"], "file:///alpha");
});

test("preserves all links", () => {
  const doc = parseHtml(`
    <main>
      <section>
        <article>
          <h2><a href="/alpha">Alpha Card</a></h2>
          <p>Owner: Morgan</p>
          <p><a href="details/alpha">Details</a></p>
        </article>
        <article>
          <h2><a href="/beta">Beta Card</a></h2>
          <p>Owner: Riley</p>
          <p><a href="details/beta">Details</a></p>
        </article>
      </section>
    </main>
  `);
  const rows = parser.extractCards(doc, SAMPLE_URL);

  assert.match(rows[0].fields["All Links"], /file:\/\/\/alpha/);
  assert.match(rows[0].fields["All Links"], /file:\/\/\/visible-capture\/details\/alpha/);
});

test("preserves raw text", () => {
  const doc = docFromSample("../sample-data/card-list.html");
  const rows = parser.extractCards(doc, SAMPLE_URL);

  assert.match(rows[0].fields["Raw Text"], /Atlas Review/);
  assert.match(rows[0].rawText, /Priority: Medium/);
});

test("adds Source Page URL", () => {
  const doc = docFromSample("../sample-data/simple-table.html");
  const rows = parser.extractTables(doc, SAMPLE_URL);

  assert.equal(rows[0].fields["Source Page URL"], SAMPLE_URL);
});

test("adds Captured At", () => {
  const doc = docFromSample("../sample-data/simple-table.html");
  const rows = parser.extractTables(doc, SAMPLE_URL);

  assert.ok(rows[0].fields["Captured At"]);
  assert.ok(Number.isFinite(Date.parse(rows[0].fields["Captured At"])));
});

test("uses generic dedup key", () => {
  const first = {
    fields: {
      "Raw Text": "  Alpha   Beta  ",
      "Source Page URL": "file:///one.html",
      "Captured At": "2026-05-18T00:00:00.000Z"
    }
  };
  const second = {
    fields: {
      "Raw Text": "Alpha Beta",
      "Source Page URL": "file:///two.html",
      "Captured At": "2026-05-18T00:01:00.000Z"
    }
  };

  assert.equal(parser.buildDedupKey(first), parser.buildDedupKey(second));
});

test("does not require website-specific selectors", () => {
  const doc = parseHtml(`
    <main>
      <section>
        <div class="alpha-shape"><h2>North Record</h2><p>Owner: Avery</p><p>Status: Ready</p></div>
        <div class="beta-shape"><h2>South Record</h2><p>Owner: Quinn</p><p>Status: Pending</p></div>
      </section>
    </main>
  `);
  const rows = parser.extractCards(doc, SAMPLE_URL);

  assert.equal(rows.length, 2);
  assert.equal(rows[1].fields.Title, "South Record");
});
