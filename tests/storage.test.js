import test from "node:test";
import assert from "node:assert/strict";

const backingStore = {};

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((key) => [key, backingStore[key]]));
        }

        if (typeof keys === "string") {
          return { [keys]: backingStore[keys] };
        }

        return Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [
            key,
            Object.prototype.hasOwnProperty.call(backingStore, key) ? backingStore[key] : fallback
          ])
        );
      },
      async set(values) {
        Object.assign(backingStore, values);
      }
    }
  },
  runtime: {}
};

await import("../storage.js");

const storage = globalThis.VisibleCaptureStorage;

test("mergeRows stores new rows and skips duplicates", async () => {
  await storage.clearRows();

  const first = await storage.mergeRows([
    {
      kind: "table",
      source: "Table 1",
      fields: { Name: "Atlas", Status: "Ready" },
      rawText: "Atlas | Ready"
    }
  ]);
  const second = await storage.mergeRows([
    {
      kind: "table",
      source: "Table 2",
      fields: { Status: "Ready", Name: "Atlas" },
      rawText: "Atlas | Ready"
    }
  ]);

  assert.equal(first.added, 1);
  assert.equal(second.added, 0);
  assert.equal(second.duplicateSkipped, 1);
  assert.equal(second.totalRows, 1);
});

test("clearRows resets rows and metadata", async () => {
  await storage.clearRows();
  const state = await storage.getState();

  assert.equal(state.rows.length, 0);
  assert.equal(state.meta.duplicateSkipped, 0);
  assert.equal(state.meta.lastCaptureAt, "");
});
