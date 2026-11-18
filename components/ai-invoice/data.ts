import {
  Archive,
  BellRing,
  FileCheck2,
  FileText,
  Link2,
  PenLine,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const navLinks = [
  { href: "#workflow", label: "How it works" },
  { href: "#workspace", label: "Invoices" },
  { href: "#features", label: "Features" },
  { href: "#impact", label: "Impact" },
] as const;

export const footerLinks = [
  ...navLinks,
  { href: "#problems", label: "Problems" },
  { href: "#roadmap", label: "Planned" },
  { href: "#demo", label: "Request a demo" },
] as const;

export const demoMailto =
  "mailto:?subject=Shohoz%20Software%20%E2%80%94%20AI%20Invoice%20Processing%20demo&body=Hello%2C%0A%0AI%20would%20like%20to%20schedule%20a%20walkthrough%20of%20the%20AI%20Invoice%20Processing%20proposal.%0A%0AName%3A%20%0ABusiness%3A%20%0A";

export const problems = [
  {
    problem: "Paper invoices get lost",
    today: "Copies sit in drawers, chats, and inboxes, so a purchase is hard to find later.",
    proposal: "Keep the file with the record",
    change: "The original invoice stays attached to a searchable purchase record.",
  },
  {
    problem: "Manual entry creates errors",
    today: "Retyping supplier, lines, and totals is where quantities and amounts drift.",
    proposal: "Start from an editable draft",
    change: "Staff correct proposed fields instead of typing the invoice from a blank form.",
  },
  {
    problem: "Product names rarely match",
    today: "The wording on a supplier invoice seldom matches the product name in Shohoz POS.",
    proposal: "Confirm a suggested match",
    change: "The draft suggests a supplier and a product. A person confirms both before save.",
  },
  {
    problem: "Due dates slip past",
    today: "Once the paper is filed, the payment date is easy to miss.",
    proposal: "Keep the due date visible",
    change: "The due date stays on the invoice record, with a reminder before it passes.",
  },
] as const;

export const steps = [
  {
    number: "01",
    title: "Upload Invoice",
    text: "A photo or PDF is added from the web application and kept with the draft.",
  },
  {
    number: "02",
    title: "AI Extracts Information",
    text: "Supplier, invoice number, date, line items, and total are proposed as fields to review.",
  },
  {
    number: "03",
    title: "Review & Match Products",
    text: "Someone confirms the supplier, each product, and any line the read got wrong.",
  },
  {
    number: "04",
    title: "Save Purchase to Shohoz POS",
    text: "The reviewed draft is saved as a purchase record. Nothing is saved before that check.",
  },
] as const;

export const features: readonly { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Invoice Upload", text: "Add a photo or PDF and keep it beside the draft.", icon: FileText },
  { title: "OCR Text Extraction", text: "Propose supplier, dates, line items, and total from the file.", icon: Sparkles },
  { title: "Editable Invoice Draft", text: "Correct any field before a purchase is created.", icon: PenLine },
  { title: "Supplier Matching", text: "Suggest an existing supplier and require a confirmation.", icon: Link2 },
  { title: "Product Matching", text: "Suggest a Shohoz product for each invoice line.", icon: Search },
  { title: "Duplicate Detection", text: "Flag an invoice number or file that looks already stored.", icon: FileCheck2 },
  { title: "Invoice Search & Archive", text: "Find a past invoice by supplier, number, or date.", icon: Archive },
  { title: "Due Date Reminders", text: "Show invoices that are coming due, before the date passes.", icon: BellRing },
];

export const services = [
  { title: "OCR Engine", text: "Proposed reading of the invoice into fields." },
  { title: "PostgreSQL", text: "Proposed store for drafts, matches, and purchases." },
  { title: "Redis & BullMQ", text: "Queue for document jobs waiting to be processed." },
  { title: "Private File Storage", text: "Proposed home for the original photo or PDF." },
] as const;

export const enhancements = [
  { title: "Missing Document Alerts", text: "Notice when a purchase has no invoice, or an invoice never became a purchase." },
  { title: "Product Price History", text: "Keep a supplier’s past prices and surface a line that moved sharply." },
  { title: "Business Reports", text: "Summaries of invoice volume, purchases, and amounts still due." },
  { title: "Pharmacy Batch & Expiry Tracking", text: "Capture batch and expiry when the invoice prints them." },
  { title: "Mobile Application", text: "Photograph an invoice on a phone, then use the same review step." },
  { title: "External POS/ERP Integrations", text: "Offer the same flow to systems outside Shohoz POS." },
] as const;

export const impacts = [
  {
    title: "Reduced manual data entry",
    text: "Staff correct a draft instead of retyping every supplier line.",
  },
  {
    title: "Faster invoice processing",
    text: "The path from a file to a purchase record is one review, not a fresh form.",
  },
  {
    title: "Better purchase record management",
    text: "The invoice, the match, and the purchase stay together and can be found again.",
  },
  {
    title: "Improved business visibility",
    text: "Suppliers, amounts, and due dates are on record instead of buried in paper.",
  },
] as const;
