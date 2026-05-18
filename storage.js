(function (root) {
  "use strict";

  const STATE_KEY = "visibleCaptureState";
  const ROWS_KEY = "visibleCaptureRows";
  const META_KEY = "visibleCaptureMeta";
  const memoryStore = {};

  function createEmptyState() {
    return {
      rows: [],
      duplicateSkipped: 0,
      lastCaptureAt: "",
      lastRowsFound: 0
    };
  }

  function getChromeArea() {
    return root.chrome && root.chrome.storage && root.chrome.storage.local
      ? root.chrome.storage.local
      : null;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalizeForKey(value) {
    return normalizeText(value).toLowerCase();
  }

  function pickMemory(keys) {
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, memoryStore[key]]));
    }

    if (typeof keys === "string") {
      return { [keys]: memoryStore[keys] };
    }

    if (keys && typeof keys === "object") {
      return Object.fromEntries(
        Object.entries(keys).map(([key, fallback]) => [
          key,
          Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : fallback
        ])
      );
    }

    return { ...memoryStore };
  }

  function callChrome(method, args) {
    const area = getChromeArea();

    if (!area) {
      return null;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (value) => {
        if (settled) {
          return;
        }

        settled = true;
        const lastError = root.chrome && root.chrome.runtime && root.chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(value);
        }
      };

      try {
        const result = area[method](...args, done);
        if (result && typeof result.then === "function") {
          result.then(done, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async function storageGet(keys) {
    const chromeResult = callChrome("get", [keys]);
    if (chromeResult) {
      return chromeResult;
    }

    return pickMemory(keys);
  }

  async function storageSet(values) {
    const chromeResult = callChrome("set", [values]);
    if (chromeResult) {
      await chromeResult;
      return;
    }

    Object.assign(memoryStore, values);
  }

  function fieldEntriesFrom(row) {
    const entries = [];
    const skippedKeys = new Set(["kind", "source", "fields", "rawText", "Raw Text"]);

    for (const [key, value] of Object.entries(row && row.fields ? row.fields : {})) {
      entries.push([normalizeText(key), normalizeText(value)]);
    }

    for (const [key, value] of Object.entries(row || {})) {
      if (!skippedKeys.has(key) && typeof value !== "object") {
        entries.push([normalizeText(key), normalizeText(value)]);
      }
    }

    return entries.filter(([key, value]) => key || value);
  }

  function getRowValue(row, preferredNames) {
    const names = preferredNames.map((name) => name.toLowerCase());

    for (const [key, value] of Object.entries(row || {})) {
      if (names.includes(key.toLowerCase())) {
        return value;
      }
    }

    for (const [key, value] of Object.entries(row && row.fields ? row.fields : {})) {
      if (names.includes(key.toLowerCase())) {
        return value;
      }
    }

    return "";
  }

  function sanitizeRow(row) {
    const fields = {};

    for (const [key, value] of fieldEntriesFrom(row || {})) {
      fields[key || "Field"] = value;
    }

    const rawText = normalizeText(
      getRowValue(row, ["Raw Text"]) || row.rawText || Object.values(fields).join(" ")
    );
    const primaryLink = normalizeText(getRowValue(row, ["Primary Link"]));

    if (primaryLink && !Object.prototype.hasOwnProperty.call(fields, "Primary Link")) {
      fields["Primary Link"] = primaryLink;
    }

    return {
      kind: normalizeText(row && row.kind ? row.kind : "row"),
      source: normalizeText(row && row.source ? row.source : "current page"),
      fields,
      rawText
    };
  }

  function normalizedJsonValues(row) {
    const entries = fieldEntriesFrom(row || {});
    const values = entries.length > 0
      ? entries.map(([, value]) => normalizeText(value))
      : Object.values(row || {}).map((value) => {
          if (value && typeof value === "object") {
            return normalizeText(JSON.stringify(value));
          }

          return normalizeText(value);
        });

    return normalizeForKey(JSON.stringify(values.filter(Boolean)));
  }

  function buildDedupKey(row) {
    const primaryLink = normalizeForKey(getRowValue(row, ["Primary Link"]));
    if (primaryLink) {
      return `primary-link:${primaryLink}`;
    }

    const rawText = normalizeForKey(getRowValue(row, ["Raw Text"]) || row.rawText);
    if (rawText) {
      return `raw-text:${rawText}`;
    }

    return `values:${normalizedJsonValues(row)}`;
  }

  function normalizeState(state) {
    const empty = createEmptyState();
    const rows = Array.isArray(state && state.rows) ? state.rows.map(sanitizeRow) : empty.rows;

    return {
      rows,
      duplicateSkipped: Number.isFinite(Number(state && state.duplicateSkipped))
        ? Number(state.duplicateSkipped)
        : empty.duplicateSkipped,
      lastCaptureAt: normalizeText(state && state.lastCaptureAt ? state.lastCaptureAt : empty.lastCaptureAt),
      lastRowsFound: Number.isFinite(Number(state && state.lastRowsFound))
        ? Number(state.lastRowsFound)
        : empty.lastRowsFound
    };
  }

  function withLegacyMeta(state) {
    return {
      ...state,
      meta: {
        duplicateSkipped: state.duplicateSkipped,
        lastDuplicateSkipped: 0,
        lastRowsFound: state.lastRowsFound,
        lastCaptureAt: state.lastCaptureAt
      }
    };
  }

  function migrateLegacyState(stored) {
    if (stored && stored[STATE_KEY]) {
      return stored[STATE_KEY];
    }

    const legacyRows = Array.isArray(stored && stored[ROWS_KEY]) ? stored[ROWS_KEY] : [];
    const legacyMeta = stored && stored[META_KEY] ? stored[META_KEY] : {};

    if (legacyRows.length > 0 || Object.keys(legacyMeta).length > 0) {
      return {
        rows: legacyRows,
        duplicateSkipped: legacyMeta.duplicateSkipped || 0,
        lastCaptureAt: legacyMeta.lastCaptureAt || "",
        lastRowsFound: legacyMeta.lastRowsFound || 0
      };
    }

    return createEmptyState();
  }

  async function getState() {
    const stored = await storageGet({
      [STATE_KEY]: createEmptyState(),
      [ROWS_KEY]: [],
      [META_KEY]: {}
    });

    return withLegacyMeta(normalizeState(migrateLegacyState(stored)));
  }

  async function setState(state) {
    const nextState = normalizeState(state);
    await storageSet({ [STATE_KEY]: nextState });
    return withLegacyMeta(nextState);
  }

  async function addRows(newRows) {
    const incoming = Array.isArray(newRows) ? newRows : [];
    const state = await getState();
    const rows = [...state.rows];
    const knownKeys = new Set(rows.map(buildDedupKey));
    let added = 0;
    let duplicate = 0;

    for (const row of incoming) {
      const sanitized = sanitizeRow(row);
      const key = buildDedupKey(sanitized);

      if (knownKeys.has(key)) {
        duplicate += 1;
        continue;
      }

      knownKeys.add(key);
      rows.push(sanitized);
      added += 1;
    }

    await setState({
      rows,
      duplicateSkipped: state.duplicateSkipped + duplicate,
      lastCaptureAt: new Date().toISOString(),
      lastRowsFound: incoming.length
    });

    return {
      added,
      duplicate,
      total: rows.length
    };
  }

  async function clearState() {
    return setState(createEmptyState());
  }

  async function getRows() {
    const state = await getState();
    return state.rows;
  }

  async function mergeRows(rows) {
    const result = await addRows(rows);
    const state = await getState();

    return {
      rows: state.rows,
      added: result.added,
      duplicateSkipped: result.duplicate,
      totalRows: result.total,
      meta: {
        duplicateSkipped: state.duplicateSkipped,
        lastDuplicateSkipped: result.duplicate,
        lastRowsFound: state.lastRowsFound,
        lastCaptureAt: state.lastCaptureAt
      }
    };
  }

  async function clearRows() {
    const state = await clearState();
    return {
      rows: state.rows,
      meta: {
        duplicateSkipped: state.duplicateSkipped,
        lastDuplicateSkipped: 0,
        lastRowsFound: state.lastRowsFound,
        lastCaptureAt: state.lastCaptureAt
      }
    };
  }

  root.VisibleCaptureStorage = {
    STATE_KEY,
    ROWS_KEY,
    META_KEY,
    getState,
    setState,
    addRows,
    clearState,
    buildDedupKey,
    sanitizeRow,
    getRows,
    mergeRows,
    clearRows
  };
})(globalThis);
