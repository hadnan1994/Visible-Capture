(function (root) {
  "use strict";

  function captureVisiblePageData() {
    const parser = root.VisibleCaptureParser;

    if (!parser || typeof parser.captureVisiblePageData !== "function") {
      return {
        ok: false,
        error: "The visible-page parser is not available.",
        rows: [],
        summary: {
          tableRows: 0,
          cardRows: 0,
          totalRows: 0
        }
      };
    }

    try {
      const result = parser.captureVisiblePageData(root.document, root.location && root.location.href);

      return {
        ok: true,
        title: root.document && root.document.title ? root.document.title : "",
        url: root.location && root.location.href ? root.location.href : "",
        rows: result.rows,
        summary: result.summary
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : "Visible page capture failed.",
        rows: [],
        summary: {
          tableRows: 0,
          cardRows: 0,
          totalRows: 0
        }
      };
    }
  }

  root.VisibleCaptureContentScript = { captureVisiblePageData };
})(globalThis);

globalThis.VisibleCaptureContentScript.captureVisiblePageData();
