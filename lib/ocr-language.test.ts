import assert from "node:assert/strict";
import test from "node:test";
import { uploadLanguage } from "./ocr-language.ts";

test("upload sends English, Bengali, or a mixed pair and omits the default", () => {
  assert.equal(uploadLanguage("eng"), "eng");
  assert.equal(uploadLanguage("ben"), "ben");
  assert.equal(uploadLanguage("ben+eng"), "ben+eng");
  assert.equal(uploadLanguage(""), null);
  assert.equal(uploadLanguage("  "), null);
});
