import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeReturnPath } from "./session.ts";

describe("safeReturnPath", () => {
  it("defaults and rejects open redirects", () => {
    assert.equal(safeReturnPath(null), "/dashboard");
    assert.equal(safeReturnPath(""), "/dashboard");
    assert.equal(safeReturnPath("//evil.example"), "/dashboard");
    assert.equal(safeReturnPath("https://evil.example"), "/dashboard");
    assert.equal(safeReturnPath("/login"), "/dashboard");
    assert.equal(safeReturnPath("/register?x=1"), "/dashboard");
  });

  it("keeps internal app paths", () => {
    assert.equal(safeReturnPath("/upload"), "/upload");
    assert.equal(safeReturnPath("/review"), "/review");
    assert.equal(safeReturnPath("/invoices?status=approved"), "/invoices?status=approved");
  });
});
