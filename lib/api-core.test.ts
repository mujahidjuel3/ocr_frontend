import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, apiBaseUrl, errorMessage } from "./api-core.ts";

describe("API client", () => {
  it("requires an API origin", () => {
    assert.throws(() => apiBaseUrl(undefined), ApiError);
    assert.equal(apiBaseUrl("http://localhost:3001/"), "http://localhost:3001");
  });

  it("reads Nest validation messages", () => {
    assert.equal(errorMessage({ message: ["file is required"] }, "failed"), "file is required");
    assert.equal(errorMessage({ message: "Authentication is required" }, "failed"), "Authentication is required");
    assert.equal(errorMessage(null, "failed"), "failed");
  });
});
