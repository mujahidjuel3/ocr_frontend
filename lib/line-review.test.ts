import assert from "node:assert/strict";
import test from "node:test";
import { headerReviewFields, lineItemsMessage, lineItemsNeedReview, reviewReasonLabel } from "./line-review.ts";

test("review labels describe line evidence and keep header checks separate", () => {
  assert.equal(reviewReasonLabel("missing-quantity"), "Quantity was not found on this row");
  assert.equal(reviewReasonLabel("line-total-mismatch"), "Quantity, unit price, discount, and tax do not reconcile with the line total");
  assert.deepEqual(headerReviewFields(["supplierName", "items.0", "items.0.missing-quantity"]), ["supplierName"]);
  assert.equal(lineItemsNeedReview(["items.1.ambiguous-row"]), true);
  assert.equal(lineItemsNeedReview(["grandTotal"]), false);
});

test("queued and failed invoices do not look like an empty extraction", () => {
  assert.equal(lineItemsMessage("queued", 0, null), "OCR is queued. Line items appear after the worker finishes.");
  assert.equal(lineItemsMessage("processing", 0, null), "OCR is running. Line items appear after extraction finishes.");
  assert.equal(lineItemsMessage("failed", 0, "Redis is unavailable"), "Redis is unavailable");
  assert.equal(lineItemsMessage("review_required", 0, null), "No line items were extracted.");
  assert.equal(lineItemsMessage("extracted", 2, null), null);
});
