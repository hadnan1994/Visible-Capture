import "./csv.js";
import "./storage.js";

const csv = globalThis.VisibleCaptureCsv;
const storage = globalThis.VisibleCaptureStorage;

const elements = {
  captureButton: document.querySelector("#capture-button"),
  previewButton: document.querySelector("#preview-button"),
  downloadButton: document.querySelector("#download-button"),
  copyButton: document.querySelector("#copy-button"),
  clearButton: document.querySelector("#clear-button"),
  currentPageStatus: document.querySelector("#current-page-status"),
  currentRowCount: document.querySelector("#current-row-count"),
  totalRowCount: document.querySelector("#total-row-count"),
  duplicateCount: document.querySelector("#duplicate-count"),
  lastCapture: document.querySelector("#last-capture"),
  message: document.querySelector("#message"),
  previewPanel: document.querySelector("#preview-panel"),
  previewCount: document.querySelector("#preview-count"),
  previewTableWrap: document.querySelector("#preview-table-wrap")
};

let isBusy = false;

function setMessage(text, tone = "neutral") {
  elements.message.textContent = text;
  elements.message.classList.toggle("success", tone === "success");
  elements.message.classList.toggle("error", tone === "error");
}

function formatTimestamp(value) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  elements.captureButton.disabled = nextBusy;
  elements.previewButton.disabled = nextBusy;
  elements.downloadButton.disabled = nextBusy;
  elements.copyButton.disabled = nextBusy;
  elements.clearButton.disabled = nextBusy;
}

function setSavedRowsAvailability(hasRows) {
  if (isBusy) {
    return;
  }

  elements.previewButton.disabled = !hasRows;
  elements.downloadButton.disabled = !hasRows;
  elements.copyButton.disabled = !hasRows;
  elements.clearButton.disabled = !hasRows;
}

function getRowDetails(row) {
  const fieldText = Object.entries(row.fields || {})
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");

  return row.rawText || fieldText || "No preview text available.";
}

function createTextCell(tagName, text, className = "") {
  const cell = document.createElement(tagName);
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }

  return cell;
}

function renderPreview(rows) {
  const visibleRows = rows.slice(0, 10);
  elements.previewTableWrap.replaceChildren();
  elements.previewCount.textContent = `${visibleRows.length} of ${rows.length} shown`;

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-preview";
    empty.textContent = "No saved rows yet. Capture visible data first.";
    elements.previewTableWrap.append(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "preview-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.append(
    createTextCell("th", "#", "preview-index"),
    createTextCell("th", "Type", "preview-kind"),
    createTextCell("th", "Details")
  );
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  visibleRows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.append(
      createTextCell("td", String(index + 1), "preview-index"),
      createTextCell("td", row.kind || "row", "preview-kind"),
      createTextCell("td", getRowDetails(row))
    );
    tbody.append(tr);
  });

  table.append(thead, tbody);
  elements.previewTableWrap.append(table);
}

async function refreshStatus() {
  const state = await storage.getState();
  const hasRows = state.rows.length > 0;

  elements.currentRowCount.textContent = String(state.lastRowsFound || 0);
  elements.totalRowCount.textContent = String(state.rows.length);
  elements.duplicateCount.textContent = String(state.duplicateSkipped || 0);
  elements.lastCapture.textContent = formatTimestamp(state.lastCaptureAt);
  elements.currentPageStatus.textContent = state.lastCaptureAt ? "Last capture saved" : "Ready";

  setSavedRowsAvailability(hasRows);

  if (!hasRows) {
    elements.previewPanel.hidden = true;
    if (elements.message.textContent === "Ready.") {
      setMessage("No saved rows yet. Capture visible data to create a CSV.");
    }
  } else if (!elements.previewPanel.hidden) {
    renderPreview(state.rows);
  }

  return state;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== "number") {
    throw new Error("I could not find the active tab.");
  }

  return tab.id;
}

// Compliance boundary: capture is active-tab-only and user-initiated from the
// Capture button. The extension injects local files, does not navigate, does
// not click pagination, does not open detail pages, does not handle credentials,
// and does not make external calls.
async function captureFromActiveTab() {
  const tabId = await getActiveTabId();

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["parser.js"]
  });

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["contentScript.js"]
  });

  const result = execution && execution.result;
  if (!result || result.ok !== true) {
    throw new Error((result && result.error) || "I could not read visible rows from this page.");
  }

  return Array.isArray(result.rows) ? result.rows : [];
}

// No capture runs on popup load. This handler is the only path that reads the
// active tab, and it is wired only to the user's Capture button click.
async function handleCapture() {
  let finalPageStatus = "";

  setBusy(true);
  elements.currentPageStatus.textContent = "Capturing";
  setMessage("Checking the visible page now...");

  try {
    const rows = await captureFromActiveTab();
    const result = await storage.addRows(rows);
    await refreshStatus();

    if (rows.length === 0) {
      finalPageStatus = "No rows found";
      setMessage("No visible table or list rows were found on this page.", "error");
      return;
    }

    finalPageStatus = "Captured";
    setMessage(
      `Captured ${rows.length} rows. Added ${result.added}; skipped ${result.duplicate} duplicates.`,
      "success"
    );
  } catch (error) {
    finalPageStatus = "Needs attention";
    setMessage(error.message || "Something went wrong during capture.", "error");
  } finally {
    setBusy(false);
    await refreshStatus();
    if (finalPageStatus) {
      elements.currentPageStatus.textContent = finalPageStatus;
    }
  }
}

async function handlePreview() {
  try {
    const state = await storage.getState();

    if (state.rows.length === 0) {
      setMessage("There are no saved rows to preview yet.", "error");
      return;
    }

    elements.previewPanel.hidden = !elements.previewPanel.hidden;
    if (!elements.previewPanel.hidden) {
      renderPreview(state.rows);
      setMessage("Showing the first 10 saved rows.", "success");
    }
  } catch (error) {
    setMessage(error.message || "I could not open the preview.", "error");
  }
}

async function handleDownload() {
  try {
    const state = await storage.getState();
    if (state.rows.length === 0) {
      setMessage("There are no saved rows to download yet.", "error");
      return;
    }

    const blob = csv.buildCsvBlob(state.rows);
    const url = URL.createObjectURL(blob);

    try {
      await chrome.downloads.download({
        url,
        filename: csv.buildDownloadFilename(),
        saveAs: true
      });
      setMessage("CSV download started.", "success");
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    setMessage(error.message || "I could not start the CSV download.", "error");
  }
}

async function handleCopy() {
  try {
    const state = await storage.getState();
    if (state.rows.length === 0) {
      setMessage("There are no saved rows to copy yet.", "error");
      return;
    }

    await navigator.clipboard.writeText(csv.rowsToCsv(state.rows));
    setMessage("CSV copied to the clipboard.", "success");
  } catch (error) {
    setMessage(error.message || "I could not copy the CSV.", "error");
  }
}

async function handleClear() {
  const confirmed = window.confirm("Clear all saved rows from this extension?");
  if (!confirmed) {
    setMessage("Saved rows were left unchanged.");
    return;
  }

  try {
    await storage.clearState();
    elements.previewPanel.hidden = true;
    await refreshStatus();
    setMessage("Saved rows cleared.", "success");
  } catch (error) {
    setMessage(error.message || "I could not clear the saved rows.", "error");
  }
}

elements.captureButton.addEventListener("click", handleCapture);
elements.previewButton.addEventListener("click", handlePreview);
elements.downloadButton.addEventListener("click", handleDownload);
elements.copyButton.addEventListener("click", handleCopy);
elements.clearButton.addEventListener("click", handleClear);

refreshStatus().catch((error) => {
  setMessage(error.message || "I could not load the saved rows.", "error");
});
