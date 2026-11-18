const REASON_LABELS: Record<string, string> = {
  "missing-quantity": "Quantity was not found on this row",
  "missing-unit-price": "Unit price was not found on this row",
  "missing-line-total": "Line total was not found on this row",
  "missing-description": "Product description was not found on this row",
  "line-total-mismatch": "Quantity, unit price, discount, and tax do not reconcile with the line total",
  "ambiguous-column": "A value could belong to more than one column",
  "ambiguous-row": "The row boundary is uncertain",
  "unparsed-amount": "A numeric cell was left blank because it is not a money amount",
  "low-confidence": "The row has weak layout evidence",
};

export function reviewReasonLabel(code: string): string {
  return REASON_LABELS[code] ?? "This row needs review";
}

export function headerReviewFields(fields: string[]): string[] {
  return fields.filter((field) => !field.startsWith("items."));
}

export function lineItemsNeedReview(fields: string[]): boolean {
  return fields.some((field) => field.startsWith("items."));
}

/** Null when rows exist. Queued and running jobs do not use the empty-extraction message. */
export function lineItemsMessage(status: string, count: number, error: string | null): string | null {
  if (count > 0) return null;
  if (status === "queued" || status === "uploaded") return "OCR is queued. Line items appear after the worker finishes.";
  if (status === "processing") return "OCR is running. Line items appear after extraction finishes.";
  if (status === "failed") return error || "Processing failed before line items were saved.";
  return "No line items were extracted.";
}
