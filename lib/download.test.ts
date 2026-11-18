import assert from "node:assert/strict";
import test from "node:test";
import { filenameFromDisposition } from "./download.ts";

test("download uses the original filename and a processed PDF name", () => {
  assert.equal(filenameFromDisposition('attachment; filename="scan.png"; filename*=UTF-8\'\'scan.png', "fallback"), "scan.png");
  assert.equal(
    filenameFromDisposition("attachment; filename=\"invoice-_.pdf\"; filename*=UTF-8''invoice-%E0%A6%9A%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%A8.pdf", "fallback"),
    "invoice-চালান.pdf",
  );
  assert.equal(filenameFromDisposition(null, "invoice-id"), "invoice-id");
});
