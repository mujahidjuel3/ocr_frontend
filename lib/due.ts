import type { Invoice } from "./api";

export type DueBucket = "due_soon" | "due_today" | "overdue" | "paid" | "no_due";

const MS_DAY = 24 * 60 * 60 * 1000;

export function startOfUtcDay(value = new Date()): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function classifyDue(invoice: Invoice, today = startOfUtcDay()): DueBucket {
  const payment = (invoice.paymentStatus ?? "").toLowerCase();
  if (payment === "paid") return "paid";
  const due = parseDueDate(invoice.dueDate);
  if (!due) return "no_due";
  const diffDays = Math.round((due.getTime() - today.getTime()) / MS_DAY);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due_today";
  if (diffDays <= 3) return "due_soon";
  return "no_due";
}

export function dueLabel(bucket: DueBucket): string {
  switch (bucket) {
    case "due_soon":
      return "Due soon";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "paid":
      return "Paid";
    default:
      return "No due date";
  }
}

export function isActionableDue(bucket: DueBucket): boolean {
  return bucket === "due_soon" || bucket === "due_today" || bucket === "overdue";
}
