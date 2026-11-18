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
};

export const APP_NAV: NavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "upload", href: "/upload", label: "Invoice Upload" },
  { id: "review", href: "/review", label: "Invoice Review" },
  { id: "archive", href: "/invoices", label: "Invoice Archive" },
  { id: "suppliers", href: "/suppliers", label: "Suppliers" },
  { id: "products", href: "/products", label: "Products" },
  { id: "due", href: "/due", label: "Due & Overdue" },
  { id: "settings", href: "/settings", label: "Settings" },
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
