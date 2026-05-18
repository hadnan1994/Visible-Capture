(function (root) {
  "use strict";

  const METADATA_HEADERS = ["Source Page URL", "Captured At", "Raw Text"];
  const INTERNAL_ROW_KEYS = new Set(["kind", "source", "fields", "rawText", "meta"]);

  function normalizeHeader(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalizeValue(value) {
    if (value == null) {
      return "";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  function escapeCsvValue(value) {
    const text = normalizeValue(value);
    const escaped = text.replace(/"/g, '""');

    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  function getRowValues(row) {
    const values = {};

    for (const [key, value] of Object.entries(row && row.fields ? row.fields : {})) {
      const header = normalizeHeader(key);
      if (header) {
        values[header] = value;
      }
    }

    for (const [key, value] of Object.entries(row || {})) {
      const header = normalizeHeader(key);
      if (!header || INTERNAL_ROW_KEYS.has(key) || typeof value === "object") {
        continue;
      }

      values[header] = value;
    }

    if (!Object.prototype.hasOwnProperty.call(values, "Raw Text") && row && row.rawText != null) {
      values["Raw Text"] = row.rawText;
    }

    return values;
  }

  function getOrderedHeaders(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const seenOrder = [];
    const seen = new Set();
    const counts = new Map();

    for (const row of safeRows) {
      const values = getRowValues(row);
      const rowHeaders = new Set(Object.keys(values));

      for (const header of rowHeaders) {
        counts.set(header, (counts.get(header) || 0) + 1);

        if (!seen.has(header)) {
          seen.add(header);
          seenOrder.push(header);
        }
      }
    }

    const nonMetadata = seenOrder.filter((header) => !METADATA_HEADERS.includes(header));
    const commonHeaders = nonMetadata.filter((header) => counts.get(header) === safeRows.length);
    const dynamicHeaders = nonMetadata.filter((header) => counts.get(header) !== safeRows.length);
    const metadataHeaders = METADATA_HEADERS.filter((header) => seen.has(header));

    return [...commonHeaders, ...dynamicHeaders, ...metadataHeaders];
  }

  function rowsToCsv(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const headers = getOrderedHeaders(safeRows);
    const lines = [headers.map(escapeCsvValue).join(",")];

    for (const row of safeRows) {
      const values = getRowValues(row);
      lines.push(headers.map((header) => escapeCsvValue(values[header])).join(","));
    }

    return `\uFEFF${lines.join("\r\n")}`;
  }

  function buildCsvBlob(rows) {
    return new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  }

  function buildDownloadFilename(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    const safeDate = Number.isNaN(value.getTime()) ? new Date() : value;
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const day = String(safeDate.getDate()).padStart(2, "0");

    return `visible-capture-${year}-${month}-${day}.csv`;
  }

  root.VisibleCaptureCsv = {
    rowsToCsv,
    escapeCsvValue,
    getOrderedHeaders,
    buildCsvBlob,
    buildDownloadFilename,
    escapeCell: escapeCsvValue,
    collectFieldHeaders: getOrderedHeaders,
    buildFileName: () => buildDownloadFilename()
  };
})(globalThis);
