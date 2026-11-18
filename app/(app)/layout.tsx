import { InvoiceApp } from "@/components/invoice/InvoiceApp";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InvoiceApp />
      <div className="hidden" aria-hidden>
        {children}
      </div>
    </>
  );
}
