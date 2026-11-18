import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Invoice } from "./api.ts";
import { classifyDue, parseDueDate, startOfUtcDay } from "./due.ts";

function sample(overrides: Partial<Invoice>): Invoice {
  return {
    id: "1",
    status: "approved",
    invoiceNumber: "A-1",
    invoiceDate: null,
    dueDate: null,
    supplierName: null,
    supplierAddress: null,
    supplierPhone: null,
    supplierTaxNumber: null,
    supplierId: null,
    supplierMatch: null,
    duplicateOfId: null,
    duplicateReason: null,
    purchaseOrder: null,
    currency: null,
    subtotal: null,
    discount: null,
    tax: null,
    shipping: null,
    grandTotal: null,
    paymentStatus: null,
    ocrConfidence: null,
    ocrProvider: null,
    ocrLanguages: [],
    ocrScripts: [],
    ocrDirection: null,
    ocrWarnings: [],
    ocrPages: null,
    ocrLanguageHint: null,
    missingFields: [],
    uncertainFields: [],
    totalsValid: null,
    items: [],
    job: null,
    activities: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("due helpers", () => {
  it("parses and classifies due dates", () => {
    const today = startOfUtcDay(new Date("2026-11-18T12:00:00.000Z"));
    assert.equal(parseDueDate("2026-11-18")?.toISOString(), "2026-11-18T00:00:00.000Z");
    assert.equal(classifyDue(sample({ dueDate: "2026-11-15" }), today), "overdue");
    assert.equal(classifyDue(sample({ dueDate: "2026-11-18" }), today), "due_today");
    assert.equal(classifyDue(sample({ dueDate: "2026-11-20" }), today), "due_soon");
    assert.equal(classifyDue(sample({ dueDate: "2026-11-20", paymentStatus: "paid" }), today), "paid");
    assert.equal(classifyDue(sample({ dueDate: "2026-12-01" }), today), "no_due");
  });
});
