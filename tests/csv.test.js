import test from "node:test";
import assert from "node:assert/strict";

await import("../csv.js");

const csv = globalThis.VisibleCaptureCsv;

test("escapes values containing commas", () => {
  assert.equal(csv.escapeCsvValue("Alpha, Beta"), "\"Alpha, Beta\"");
});

test("escapes values containing quotes", () => {
  assert.equal(csv.escapeCsvValue('Alpha "Beta"'), '"Alpha ""Beta"""');
});

test("escapes values containing newlines", () => {
  assert.equal(csv.escapeCsvValue("Alpha\nBeta"), "\"Alpha\nBeta\"");
});

test("handles empty fields", () => {
  const output = csv.rowsToCsv([
    {
      fields: {
        Name: "Atlas",
        Status: "",
        "Source Page URL": "file:///sample.html",
        "Captured At": "2026-05-18T12:00:00.000Z",
        "Raw Text": "Atlas"
      }
    },
    {
      fields: {
        Name: "Beacon",
        "Source Page URL": "file:///sample.html",
        "Captured At": "2026-05-18T12:00:00.000Z",
        "Raw Text": "Beacon"
      }
    }
  ]);

  assert.match(output, /Atlas,,file:\/\/\/sample\.html/);
  assert.match(output, /Beacon,,file:\/\/\/sample\.html/);
});

test("builds union columns", () => {
  const headers = csv.getOrderedHeaders([
    {
      fields: {
        Name: "Atlas",
        Status: "Ready",
        "Source Page URL": "file:///one.html",
        "Captured At": "2026-05-18T12:00:00.000Z",
        "Raw Text": "Atlas Ready"
      }
    },
    {
      fields: {
        Name: "Beacon",
        Quantity: "4",
        "Source Page URL": "file:///two.html",
        "Captured At": "2026-05-18T12:01:00.000Z",
        "Raw Text": "Beacon 4"
      }
    }
  ]);

  assert.deepEqual(headers, [
    "Name",
    "Status",
    "Quantity",
    "Source Page URL",
    "Captured At",
    "Raw Text"
  ]);
});

test("places metadata columns last", () => {
  const headers = csv.getOrderedHeaders([
    {
      fields: {
        Title: "Atlas",
        "Raw Text": "Atlas raw",
        "Source Page URL": "file:///sample.html",
        "Captured At": "2026-05-18T12:00:00.000Z",
        "Field 1": "Owner: Morgan"
      }
    }
  ]);

  assert.deepEqual(headers.slice(-3), ["Source Page URL", "Captured At", "Raw Text"]);
});

test("includes UTF-8 BOM", () => {
  const output = csv.rowsToCsv([
    {
      fields: {
        Name: "Atlas",
        "Raw Text": "Atlas"
      }
    }
  ]);

  assert.equal(output.charCodeAt(0), 0xfeff);
});

test("buildCsvBlob creates a UTF-8 CSV blob", async () => {
  const blob = csv.buildCsvBlob([
    {
      fields: {
        Name: "Atlas",
        "Raw Text": "Atlas"
      }
    }
  ]);

  assert.equal(blob.type, "text/csv;charset=utf-8");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
});

test("creates filename in correct format", () => {
  assert.equal(
    csv.buildDownloadFilename(new Date(2026, 4, 18, 9, 30)),
    "visible-capture-2026-05-18.csv"
  );
});
