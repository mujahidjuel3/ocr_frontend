import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api-core.ts";
import { classifyAuthFailure, isNetworkFailure, isUnauthorizedStatus } from "./errors.ts";

describe("classifyAuthFailure", () => {
  it("maps credential and network failures", () => {
    assert.equal(classifyAuthFailure(new ApiError(401, "Invalid email or password")).kind, "invalid_credentials");
    assert.equal(classifyAuthFailure(new ApiError(0, "unreachable")).kind, "network");
    assert.equal(classifyAuthFailure(new ApiError(500, "boom")).kind, "server");
    assert.equal(classifyAuthFailure(new ApiError(409, "exists")).kind, "conflict");
  });

  it("detects unauthorized and network helpers", () => {
    assert.equal(isUnauthorizedStatus(401), true);
    assert.equal(isUnauthorizedStatus(403), false);
    assert.equal(isNetworkFailure(new ApiError(0, "down")), true);
    assert.equal(isNetworkFailure(new ApiError(401, "nope")), false);
  });
});
