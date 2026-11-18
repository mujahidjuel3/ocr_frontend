import type { InvoiceStatus } from "./api";

/** Maps backend invoice status to proposal-facing workflow labels. */
export function workflowLabel(status: InvoiceStatus | string): string {
  switch (status) {
    case "uploaded":
    case "queued":
    case "processing":
      return "Processing";
    case "extracted":
    case "review_required":
      return "Review Required";
    case "approved":
      return "Draft Created";
    case "failed":
      return "Failed / Needs Attention";
    default:
      return status.replaceAll("_", " ");
  }
}

export function canApprove(status: InvoiceStatus | string): boolean {
  return status === "extracted" || status === "review_required";
}

export function approvalMeansPurchaseDraft(): string {
  return "Approval creates a purchase draft record in this system. Shohoz POS stock/accounting posting only happens when POS_API_URL is configured on the backend.";
}
