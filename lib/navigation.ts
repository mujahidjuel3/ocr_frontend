export type AppSection =
  | "dashboard"
  | "upload"
  | "review"
  | "archive"
  | "suppliers"
  | "products"
  | "due"
  | "settings";

export type NavItem = {
  id: AppSection;
  href: string;
  label: string;
  /** When false, the item is shown but marked unavailable. */
  available: boolean;
  note?: string;
};

export const APP_NAV: NavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", available: true },
  { id: "upload", href: "/upload", label: "Invoice Upload", available: true },
  { id: "review", href: "/review", label: "Invoice Review", available: true },
  { id: "archive", href: "/invoices", label: "Invoice Archive", available: true },
  { id: "suppliers", href: "/suppliers", label: "Suppliers", available: true },
  { id: "products", href: "/products", label: "Products", available: true },
  {
    id: "due",
    href: "/due",
    label: "Due & Overdue",
    available: true,
    note: "Uses invoice due dates from the archive API. Reminder delivery is not available yet.",
  },
  { id: "settings", href: "/settings", label: "Settings", available: true },
];

export function sectionFromPath(pathname: string): AppSection {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/dashboard") return "dashboard";
  if (path.startsWith("/upload")) return "upload";
  if (path.startsWith("/review")) return "review";
  if (path.startsWith("/invoices") || path.startsWith("/archive")) return "archive";
  if (path.startsWith("/suppliers")) return "suppliers";
  if (path.startsWith("/products")) return "products";
  if (path.startsWith("/due")) return "due";
  if (path.startsWith("/settings") || path.startsWith("/account")) return "settings";
  return "dashboard";
}

export function hrefForSection(section: AppSection): string {
  return APP_NAV.find((item) => item.id === section)?.href ?? "/dashboard";
}
