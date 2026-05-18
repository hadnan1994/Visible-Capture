(function (root) {
  "use strict";

  const MAX_CARD_FIELDS = 8;
  const MAX_CARD_TEXT_LENGTH = 2400;
  const IGNORED_CONTAINER_SELECTOR = [
    "nav",
    "header",
    "footer",
    "aside",
    "form",
    "script",
    "style",
    "template",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
    "[role='complementary']",
    "[role='form']",
    "[role='search']",
    "[role='menu']",
    "[role='menubar']",
    "[role='dialog']",
    "[aria-modal='true']"
  ].join(",");
  const IGNORED_NAME_PATTERN = /\b(cookie|consent|banner|filter|menu|nav|toolbar|pagination|modal|dialog|subscribe|newsletter)\b/i;

  function normalizeWhitespace(text) {
    return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  }

  function normalizeLines(text) {
    return String(text == null ? "" : text)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(normalizeWhitespace)
      .filter(Boolean);
  }

  function getRawElementText(element) {
    if (!element) {
      return "";
    }

    if (typeof element.innerText === "string") {
      return element.innerText;
    }

    return element.textContent || "";
  }

  function getStyleValue(element, property) {
    if (!element) {
      return "";
    }

    const doc = element.ownerDocument;
    const view = (doc && doc.defaultView) || root;

    if (view && typeof view.getComputedStyle === "function") {
      const style = view.getComputedStyle(element);
      if (style) {
        return style[property] || "";
      }
    }

    const inlineStyle = typeof element.getAttribute === "function" ? element.getAttribute("style") || "" : "";
    const match = inlineStyle.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, "i"));
    return match ? match[1].trim() : "";
  }

  function elementName(element) {
    const id = typeof element.getAttribute === "function" ? element.getAttribute("id") || "" : "";
    const className = typeof element.getAttribute === "function" ? element.getAttribute("class") || "" : "";
    const role = typeof element.getAttribute === "function" ? element.getAttribute("role") || "" : "";
    const ariaLabel = typeof element.getAttribute === "function" ? element.getAttribute("aria-label") || "" : "";

    return `${id} ${className} ${role} ${ariaLabel}`;
  }

  function hasSelectorMatch(element, selector) {
    return Boolean(element && typeof element.matches === "function" && element.matches(selector));
  }

  function isVisible(element) {
    if (!element || element.nodeType !== 1) {
      return false;
    }

    let current = element;
    while (current && current.nodeType === 1) {
      if (current.hidden || current.getAttribute("hidden") != null || current.getAttribute("aria-hidden") === "true") {
        return false;
      }

      if (current.tagName === "INPUT" && current.getAttribute("type") === "hidden") {
        return false;
      }

      const display = getStyleValue(current, "display");
      const visibility = getStyleValue(current, "visibility");
      const opacity = Number.parseFloat(getStyleValue(current, "opacity"));

      if (
        display === "none" ||
        visibility === "hidden" ||
        visibility === "collapse" ||
        opacity === 0
      ) {
        return false;
      }

      current = current.parentElement;
    }

    if (typeof element.getClientRects === "function") {
      const rects = element.getClientRects();
      if (rects && rects.length === 0 && normalizeWhitespace(getRawElementText(element)).length === 0) {
        return false;
      }
    }

    return true;
  }

  function getVisibleText(element) {
    if (!isVisible(element)) {
      return "";
    }

    return normalizeWhitespace(getRawElementText(element));
  }

  function getVisibleLines(element) {
    if (!isVisible(element)) {
      return [];
    }

    return normalizeLines(getRawElementText(element))
      .filter((line, index, lines) => line !== lines[index - 1]);
  }

  function toAbsoluteHref(href, baseUrl) {
    const value = normalizeWhitespace(href);

    if (!value || value === "#" || value.startsWith("#") || /^javascript:/i.test(value)) {
      return "";
    }

    try {
      return new URL(value, baseUrl || root.location && root.location.href).href;
    } catch {
      return value;
    }
  }

  function extractLinks(element, baseUrl) {
    if (!element || typeof element.querySelectorAll !== "function") {
      return [];
    }

    const links = [];
    const seen = new Set();

    for (const anchor of Array.from(element.querySelectorAll("a[href]"))) {
      if (!isVisible(anchor)) {
        continue;
      }

      const href = toAbsoluteHref(anchor.getAttribute("href") || "", baseUrl);
      if (!href || seen.has(href)) {
        continue;
      }

      seen.add(href);
      links.push(href);
    }

    return links;
  }

  function looksLikeHeaderRow(cells) {
    const values = cells.map((cell) => {
      if (typeof cell === "string") {
        return normalizeWhitespace(cell);
      }

      return normalizeWhitespace(cell && cell.text ? cell.text : getVisibleText(cell));
    }).filter(Boolean);

    if (values.length < 2) {
      return false;
    }

    const uniqueCount = new Set(values.map((value) => value.toLowerCase())).size;
    const shortCount = values.filter((value) => value.length <= 40 && value.split(/\s+/).length <= 5).length;
    const numericCount = values.filter((value) => /^[$€£]?\d[\d,.\s%/-]*$/.test(value)).length;

    return uniqueCount === values.length && shortCount / values.length >= 0.75 && numericCount / values.length < 0.5;
  }

  function makeUniqueHeaders(headers, width = headers.length) {
    const seen = new Map();

    return Array.from({ length: width }, (_value, index) => headers[index]).map((header, index) => {
      const base = normalizeWhitespace(header) || `Column ${index + 1}`;
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base} ${count + 1}`;
    });
  }

  function generateHeaders(width) {
    return Array.from({ length: width }, (_value, index) => `Column ${index + 1}`);
  }

  function cellsForRow(row) {
    return Array.from(row.querySelectorAll("th,td"))
      .filter((cell) => cell.parentElement === row && isVisible(cell))
      .map((cell) => ({
        element: cell,
        text: getVisibleText(cell),
        isHeader: cell.tagName === "TH"
      }))
      .filter((cell) => cell.text || extractLinks(cell.element).length > 0);
  }

  function rowsForTable(table) {
    return Array.from(table.querySelectorAll("tr"))
      .filter((row) => row.closest("table") === table && isVisible(row))
      .map((row) => ({
        element: row,
        cells: cellsForRow(row)
      }))
      .filter((row) => row.cells.length > 0);
  }

  function hasUsefulShape(rowModels) {
    if (rowModels.length < 2) {
      return false;
    }

    const widths = rowModels.map((row) => row.cells.length).filter((width) => width >= 2);
    if (widths.length < 2) {
      return false;
    }

    const visibleText = rowModels.flatMap((row) => row.cells.map((cell) => cell.text)).join(" ");
    if (normalizeWhitespace(visibleText).length < 8) {
      return false;
    }

    const consistentRows = widths.filter((width) => width === widths[0]).length;
    return consistentRows >= 2;
  }

  function headerFromThead(table, baseUrl) {
    const headerRows = Array.from(table.querySelectorAll("thead tr"))
      .filter((row) => row.closest("table") === table && isVisible(row))
      .map((row) => ({
        element: row,
        cells: cellsForRow(row)
      }))
      .filter((row) => row.cells.length >= 2);

    return headerRows.length > 0 ? headerRows[0] : null;
  }

  function buildRow(kind, source, fields, rawText) {
    return {
      kind,
      source,
      fields: { ...fields },
      rawText,
      ...fields
    };
  }

  function buildTableRow(cells, headers, tableIndex, locationHref, capturedAt) {
    const fields = {};
    const allLinks = [];

    headers.forEach((header, index) => {
      const cell = cells[index];
      const text = cell ? cell.text : "";
      const cellLinks = cell ? extractLinks(cell.element, locationHref) : [];

      fields[header] = text;

      if (cellLinks.length > 0) {
        fields[`${header} Link`] = cellLinks[0];
        allLinks.push(...cellLinks);
      }
    });

    const uniqueLinks = Array.from(new Set(allLinks));
    if (uniqueLinks.length > 0) {
      fields["Primary Link"] = uniqueLinks[0];
      fields["All Links"] = uniqueLinks.join("\n");
    }

    const rawText = cells.map((cell) => cell.text).filter(Boolean).join(" | ");
    fields["Source Page URL"] = locationHref || "";
    fields["Captured At"] = capturedAt;
    fields["Raw Text"] = rawText;

    return buildRow("table", `Table ${tableIndex + 1}`, fields, rawText);
  }

  function extractTables(doc, locationHref = "") {
    const capturedAt = new Date().toISOString();
    const rows = [];
    const tables = Array.from(doc.querySelectorAll("table")).filter(isVisible);

    tables.forEach((table, tableIndex) => {
      const rowModels = rowsForTable(table);
      if (!hasUsefulShape(rowModels)) {
        return;
      }

      const theadHeader = headerFromThead(table, locationHref);
      const firstRow = rowModels[0];
      const headerRow = theadHeader || (
        firstRow && (firstRow.cells.some((cell) => cell.isHeader) || looksLikeHeaderRow(firstRow.cells))
          ? firstRow
          : null
      );
      const width = Math.max(...rowModels.map((row) => row.cells.length));
      const headerTexts = headerRow
        ? headerRow.cells.map((cell) => cell.text)
        : generateHeaders(width);
      const headers = makeUniqueHeaders(
        headerTexts.length < width
          ? [...headerTexts, ...generateHeaders(width).slice(headerTexts.length)]
          : headerTexts.slice(0, width)
      );
      const dataRows = rowModels.filter((row) => !headerRow || row.element !== headerRow.element);

      for (const row of dataRows) {
        if (row.cells.length < 2) {
          continue;
        }

        rows.push(buildTableRow(row.cells, headers, tableIndex, locationHref, capturedAt));
      }
    });

    return rows;
  }

  function isIgnoredContainer(element) {
    if (!element || typeof element.closest !== "function") {
      return false;
    }

    if (element.closest(IGNORED_CONTAINER_SELECTOR)) {
      return true;
    }

    let current = element;
    while (current && current.nodeType === 1) {
      if (IGNORED_NAME_PATTERN.test(elementName(current))) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  function directElementChildren(element) {
    return Array.from(element && element.children ? element.children : []);
  }

  function hasOnlyButtons(element) {
    const children = directElementChildren(element).filter(isVisible);
    return children.length > 0 &&
      getVisibleLines(element).length < 3 &&
      children.every((child) => hasSelectorMatch(child, "button,a,[role='button']"));
  }

  function textLineScore(element) {
    const lines = getVisibleLines(element);
    const shortLines = lines.filter((line) => line.length > 1 && line.length <= 90);

    return {
      lines,
      shortLines
    };
  }

  function isCardCandidate(element) {
    if (!isVisible(element) || isIgnoredContainer(element) || hasOnlyButtons(element)) {
      return false;
    }

    const text = getVisibleText(element);
    if (text.length < 12 || text.length > MAX_CARD_TEXT_LENGTH) {
      return false;
    }

    const { lines, shortLines } = textLineScore(element);
    const links = extractLinks(element);
    const fieldLikeLines = lines.filter((line) => /^.{2,50}:\s*.+$/.test(line));

    return lines.length >= 3 || links.length > 0 || fieldLikeLines.length >= 2 || shortLines.length >= 3;
  }

  function structureSignature(element) {
    const tagName = element.tagName || "";
    const role = element.getAttribute("role") || "";
    const childTags = directElementChildren(element)
      .filter(isVisible)
      .slice(0, 6)
      .map((child) => child.tagName || "")
      .join(">");
    const lineBucket = Math.min(getVisibleLines(element).length, 6);
    const hasLink = extractLinks(element).length > 0 ? "link" : "plain";
    const hasHeading = element.querySelector("h1,h2,h3,h4,h5,h6,strong,b,a") ? "heading" : "body";

    return `${tagName}|${role}|${childTags}|lines:${lineBucket}|${hasLink}|${hasHeading}`;
  }

  function repeatedSiblingGroups(doc) {
    const parents = Array.from(doc.querySelectorAll("body,main,section,article,div,ul,ol,[role='list']"))
      .filter((parent) => isVisible(parent) && !isIgnoredContainer(parent));
    const groups = [];

    for (const parent of parents) {
      const buckets = new Map();

      for (const child of directElementChildren(parent)) {
        if (!isCardCandidate(child)) {
          continue;
        }

        const signature = structureSignature(child);
        const bucket = buckets.get(signature) || [];
        bucket.push(child);
        buckets.set(signature, bucket);
      }

      for (const bucket of buckets.values()) {
        if (bucket.length >= 2) {
          groups.push(bucket);
        }
      }
    }

    return groups.sort((left, right) => {
      if (left[0].children.length !== right[0].children.length) {
        return right[0].children.length - left[0].children.length;
      }

      return right.length - left.length;
    });
  }

  function titleFromCard(card) {
    const preferred = card.querySelector("h1,h2,h3,h4,h5,h6,strong,b,a");
    const preferredText = preferred && isVisible(preferred) ? getVisibleText(preferred) : "";
    const lines = getVisibleLines(card);

    return preferredText || lines[0] || "";
  }

  function firstMeaningfulHref(card, locationHref) {
    return extractLinks(card, locationHref)[0] || "";
  }

  function buildGenericRowFromCard(card, locationHref = "", capturedAt = new Date().toISOString()) {
    const lines = getVisibleLines(card);
    const title = titleFromCard(card);
    const links = extractLinks(card, locationHref);
    const rawText = lines.join(" | ");
    const fields = {
      Title: title,
      "Source Page URL": locationHref || "",
      "Captured At": capturedAt,
      "Raw Text": rawText
    };

    if (links.length > 0) {
      fields["Primary Link"] = firstMeaningfulHref(card, locationHref);
      fields["All Links"] = links.join("\n");
    }

    let fieldIndex = 1;
    for (const line of lines) {
      if (fieldIndex > MAX_CARD_FIELDS) {
        break;
      }

      if (line === title) {
        continue;
      }

      fields[`Field ${fieldIndex}`] = line;
      fieldIndex += 1;
    }

    return buildRow("card", "Repeated cards", fields, rawText);
  }

  function extractCards(doc, locationHref = "") {
    const capturedAt = new Date().toISOString();
    const groups = repeatedSiblingGroups(doc);
    const used = new Set();
    const rows = [];

    for (const group of groups) {
      for (const card of group) {
        if (used.has(card) || Array.from(used).some((usedCard) => usedCard.contains(card))) {
          continue;
        }

        used.add(card);
        rows.push(buildGenericRowFromCard(card, locationHref, capturedAt));
      }

      if (rows.length > 0) {
        break;
      }
    }

    return rows;
  }

  function buildDedupKey(row) {
    const fields = row && row.fields ? row.fields : row || {};
    const primaryLink = normalizeWhitespace(fields["Primary Link"] || (row && row["Primary Link"]));
    if (primaryLink) {
      return `primary-link:${primaryLink.toLowerCase()}`;
    }

    const rawText = normalizeWhitespace(fields["Raw Text"] || (row && row.rawText) || (row && row["Raw Text"]));
    if (rawText) {
      return `raw-text:${rawText.toLowerCase()}`;
    }

    const values = Object.entries(fields)
      .filter(([key]) => !["Source Page URL", "Captured At"].includes(key))
      .map(([key, value]) => [normalizeWhitespace(key), normalizeWhitespace(value)])
      .filter(([key, value]) => key || value)
      .sort(([left], [right]) => left.localeCompare(right));

    return `values:${JSON.stringify(values).toLowerCase()}`;
  }

  function dedupeRows(rows) {
    const seen = new Set();
    const output = [];

    for (const row of rows) {
      const key = buildDedupKey(row);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      output.push(row);
    }

    return output;
  }

  function captureVisiblePageData(doc, locationHref = "") {
    const tableRows = extractTables(doc, locationHref);
    const cardRows = tableRows.length > 0 ? [] : extractCards(doc, locationHref);
    const rows = dedupeRows(tableRows.length > 0 ? tableRows : cardRows);

    return {
      rows,
      summary: {
        tableRows: tableRows.length,
        cardRows: cardRows.length,
        totalRows: rows.length
      }
    };
  }

  function tableMatrixToRows(headers, bodyRows, source = "Table") {
    const width = Math.max(headers.length, ...bodyRows.map((row) => row.length), 0);
    const finalHeaders = makeUniqueHeaders(
      Array.from({ length: width }, (_value, index) => headers[index] || `Column ${index + 1}`)
    );

    return bodyRows.map((cells) => {
      const fields = {};
      finalHeaders.forEach((header, index) => {
        fields[header] = normalizeWhitespace(cells[index] || "");
      });
      const rawText = cells.map(normalizeWhitespace).filter(Boolean).join(" | ");
      fields["Raw Text"] = rawText;
      return buildRow("table", source, fields, rawText);
    });
  }

  function extractKeyValueFields(lines) {
    const fields = {};

    for (const line of lines) {
      const match = normalizeWhitespace(line).match(/^([^:]{2,50}):\s*(.+)$/);
      if (match) {
        fields[match[1]] = match[2];
      }
    }

    return fields;
  }

  root.VisibleCaptureParser = {
    captureVisiblePageData,
    extractTables,
    extractCards,
    isVisible,
    getVisibleText,
    extractLinks,
    normalizeWhitespace,
    looksLikeHeaderRow,
    makeUniqueHeaders,
    buildGenericRowFromCard,
    buildDedupKey,
    normalizeText: normalizeWhitespace,
    normalizeMultilineText: (text) => normalizeLines(text).join("\n"),
    ensureUniqueHeaders: makeUniqueHeaders,
    tableMatrixToRows,
    extractKeyValueFields,
    extractTableRows: extractTables,
    extractCardRows: extractCards,
    makeRowKey: buildDedupKey,
    captureVisibleData: captureVisiblePageData
  };
})(globalThis);
