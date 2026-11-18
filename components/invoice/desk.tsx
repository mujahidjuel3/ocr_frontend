"use client";

import { FormEvent, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  apiOrigin,
  approveInvoice,
  createProduct,
  createSupplier,
  deleteInvoice,
  downloadDocument,
  downloadProcessedInvoice,
  getInvoice,
  getOcrText,
  invoiceSummary,
  listInvoices,
  listJobs,
  listProducts,
  listSuppliers,
  previewDocument,
  reprocessInvoice,
  updateInvoice,
  uploadInvoice,
  watchJob,
  type Invoice,
  type InvoiceItem,
  type InvoiceQuery,
  type InvoiceSummary,
  type Job,
  type Page,
  type Product,
  type Supplier,
} from "@/lib/api";
import { classifyDue, dueLabel, isActionableDue, type DueBucket } from "@/lib/due";
import { headerReviewFields, lineItemsMessage, lineItemsNeedReview, reviewReasonLabel } from "@/lib/line-review";
import { sectionFromPath } from "@/lib/navigation";
import { OCR_LANGUAGE_OPTIONS } from "@/lib/ocr-language";
import { approvalMeansPurchaseDraft, canApprove, workflowLabel } from "@/lib/workflow";

type DraftItem = {
  rowKey: string;
  productId: string;
  productName: string;
  description: string;
  sku: string;
  barcode: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;
  matchStatus: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
  suggestions: InvoiceItem["suggestions"];
  sourceText: string;
  extractionConfidence: number | null;
  reviewReasons: string[];
  genericName: string;
  batchNumber: string;
  expiresOn: string;
};
type Draft = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  supplierName: string;
  supplierId: string;
  supplierTaxNumber: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  items: DraftItem[];
};

const emptyDraft: Draft = {
  invoiceNumber: "", invoiceDate: "", dueDate: "", supplierName: "", supplierId: "", supplierTaxNumber: "",
  currency: "", subtotal: "", discount: "", tax: "", grandTotal: "", items: [],
};

export function InvoiceDesk() {
  const fileId = useId();
  const origin = safeOrigin();
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenantName, logout, status } = useAuth();
  const section = sectionFromPath(pathname);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [recent, setRecent] = useState<Invoice[]>([]);
  const [activity, setActivity] = useState<Job[]>([]);
  const [failedJobs, setFailedJobs] = useState<Job[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState(0);
  const [page, setPage] = useState<Page<Invoice> | null>(null);
  const [filters, setFilters] = useState<InvoiceQuery>({ page: 1, status: "", q: "", from: "", to: "" });
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [baseline, setBaseline] = useState<Draft>(emptyDraft);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ocrText, setOcrText] = useState("");
  const [ocrLanguage, setOcrLanguage] = useState("");
  const [preview, setPreview] = useState<{ url: string; mimeType: string } | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [dueRows, setDueRows] = useState<Invoice[]>([]);
  const [dueLoading, setDueLoading] = useState(false);

  const person = user?.name ?? "";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (section === "dashboard") void loadOverview();
    if (section === "archive") void loadInvoices(filters);
    if (section === "suppliers" || section === "products" || section === "review") void loadCatalog();
    if (section === "due") void loadDue();
  }, [status, section]);

  useEffect(() => {
    if (!job || status !== "authenticated" || job.status === "completed" || job.status === "failed") return;
    const controller = new AbortController();
    watchJob(job.id, setJob, controller.signal)
      .then(async (done) => {
        if (done.status === "completed") await openInvoice(done.invoiceId);
        else setError(done.error || "OCR failed");
        if (section === "dashboard") await loadOverview();
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        fail(reason);
      });
    return () => controller.abort();
  }, [job?.id, job?.status, status]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  function fail(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 0) {
      setError(reason.message);
      return;
    }
    setError(reason instanceof ApiError ? reason.message : "Something went wrong");
  }

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const [counts, invoices, jobs, failed] = await Promise.all([
        invoiceSummary(),
        listInvoices({ page: 1, pageSize: 20 }),
        listJobs({ pageSize: 5 }),
        listJobs({ status: "failed", pageSize: 5 }),
      ]);
      setSummary(counts);
      setRecent(invoices.data.slice(0, 5));
      setDuplicateWarnings(invoices.data.filter((row) => row.duplicateReason || row.duplicateOfId).length);
      setActivity(jobs.data);
      setFailedJobs(failed.data);
    } catch (reason) {
      fail(reason);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvoices(query: InvoiceQuery) {
    setLoading(true);
    setError("");
    try {
      setPage(await listInvoices({ ...query, pageSize: 10 }));
    } catch (reason) {
      fail(reason);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    try {
      const [supplierRows, productRows] = await Promise.all([listSuppliers(), listProducts()]);
      setSuppliers(supplierRows);
      setProducts(productRows);
    } catch (reason) {
      fail(reason);
    }
  }

  async function loadDue() {
    setDueLoading(true);
    setError("");
    try {
      const first = await listInvoices({ page: 1, pageSize: 50 });
      const pages = Math.min(5, Math.max(1, Math.ceil(first.meta.total / first.meta.pageSize)));
      const rows = [...first.data];
      for (let pageNumber = 2; pageNumber <= pages; pageNumber += 1) {
        const next = await listInvoices({ page: pageNumber, pageSize: 50 });
        rows.push(...next.data);
      }
      setDueRows(rows.filter((row) => isActionableDue(classifyDue(row)) || (row.dueDate && (row.paymentStatus ?? "").toLowerCase() !== "paid")));
    } catch (reason) {
      fail(reason);
    } finally {
      setDueLoading(false);
    }
  }

  async function openInvoice(invoiceId: string) {
    const next = await getInvoice(invoiceId);
    const nextDraft = toDraft(next);
    setInvoice(next);
    setDraft(nextDraft);
    setBaseline(nextDraft);
    const recognized = await getOcrText(invoiceId);
    setOcrText(recognized.text ?? "");
    setOcrLanguage(next.ocrLanguageHint ?? "");
    setPreview(null);
    setError("");
    router.push("/review");
    await loadCatalog();
    try {
      setPreview(await previewDocument(invoiceId));
    } catch {
      // Preview is optional until the user requests it again.
    }
  }

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) {
      setError("Choose a PDF, JPG, JPEG, or PNG invoice.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Choose a file smaller than 20 MB.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    setProgress(0);
    setFileLabel(`${file.name} · ${formatBytes(file.size)}`);
    setInvoice(null);
    try {
      const created = await uploadInvoice(file, setProgress, ocrLanguage);
      setProgress(100);
      setJob({ id: created.jobId, invoiceId: created.invoiceId, status: "queued", attempts: 0, error: null, createdAt: "", startedAt: null, finishedAt: null });
      setNotice("The file is stored. Processing starts when the worker picks up the job.");
    } catch (reason) {
      setProgress(null);
      if (reason instanceof ApiError && reason.status === 409) {
        setError(reason.message || "This file was already uploaded.");
      } else {
        fail(reason);
      }
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!invoice || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await updateInvoice(invoice.id, {
        invoiceNumber: text(draft.invoiceNumber),
        invoiceDate: text(draft.invoiceDate),
        dueDate: text(draft.dueDate),
        supplierName: text(draft.supplierName),
        supplierTaxNumber: text(draft.supplierTaxNumber),
        supplierId: text(draft.supplierId),
        currency: text(draft.currency),
        subtotal: text(draft.subtotal),
        discount: text(draft.discount),
        tax: text(draft.tax),
        grandTotal: text(draft.grandTotal),
        items: draft.items.map((item) => ({
          productId: text(item.productId),
          productName: text(item.productName),
          description: text(item.description),
          sku: text(item.sku),
          barcode: text(item.barcode),
          quantity: text(item.quantity),
          unit: text(item.unit),
          unitPrice: text(item.unitPrice),
          discount: text(item.discount),
          tax: text(item.tax),
          lineTotal: text(item.lineTotal),
        })),
      });
      const nextDraft = toDraft(saved);
      setInvoice(saved);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setNotice("Changes saved. Extracted values you did not edit were left as stored.");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!invoice || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await approveInvoice(invoice.id);
      setInvoice(saved);
      setNotice(saved.pos.connected ? saved.pos.message : `${saved.pos.message} ${approvalMeansPurchaseDraft()}`);
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function reprocess() {
    if (!invoice || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await reprocessInvoice(invoice.id, ocrLanguage);
      setJob({ id: next.jobId, invoiceId: next.invoiceId, status: "queued", attempts: 0, error: null, createdAt: "", startedAt: null, finishedAt: null });
      router.push("/upload");
      setNotice("The invoice was queued again.");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!invoice || busy) return;
    setBusy(true);
    try {
      await deleteInvoice(invoice.id);
      setInvoice(null);
      setDraft(emptyDraft);
      setNotice("Invoice removed from the list. The file fingerprint is kept so the same file is not processed twice.");
      router.push("/invoices");
      await loadInvoices(filters);
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function showPreview() {
    if (!invoice || busy) return;
    setBusy(true);
    try {
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview(await previewDocument(invoice.id));
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  const dueGroups = useMemo(() => groupDue(dueRows), [dueRows]);

  return (
    <div>
      {!origin ? <Alert>Set NEXT_PUBLIC_API_URL to the NestJS API origin and restart the frontend.</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <p className="mb-4 rounded-md border border-shohoz-line bg-white px-3 py-2 text-sm text-shohoz-ink">{notice}</p> : null}

      {section === "dashboard" ? (
        <Overview
          loading={loading}
          summary={summary}
          recent={recent}
          activity={activity}
          failedJobs={failedJobs}
          duplicateWarnings={duplicateWarnings}
          onOpen={(id) => void openInvoice(id).catch(fail)}
          onUpload={() => router.push("/upload")}
        />
      ) : null}

      {section === "archive" ? (
        <InvoiceList
          loading={loading}
          page={page}
          filters={filters}
          setFilters={setFilters}
          onSearch={() => void loadInvoices({ ...filters, page: 1 })}
          onPage={(next) => { const query = { ...filters, page: next }; setFilters(query); void loadInvoices(query); }}
          onOpen={(id) => void openInvoice(id).catch(fail)}
        />
      ) : null}

      {section === "upload" ? (
        <UploadPanel
          fileId={fileId}
          fileLabel={fileLabel}
          progress={progress}
          job={job}
          language={ocrLanguage}
          busy={busy}
          setLanguage={setOcrLanguage}
          onFile={onFile}
        />
      ) : null}

      {section === "review" ? (
        invoice ? (
          <Review
            invoice={invoice}
            draft={draft}
            baseline={baseline}
            suppliers={suppliers}
            products={products}
            ocrText={ocrText}
            ocrLanguage={ocrLanguage}
            setOcrLanguage={setOcrLanguage}
            preview={preview}
            busy={busy}
            setDraft={setDraft}
            onSave={save}
            onApprove={() => void approve()}
            onReprocess={() => void reprocess()}
            onDelete={() => void remove()}
            onPreview={() => void showPreview()}
            onDownload={() => void downloadDocument(invoice.id).catch(fail)}
            onDownloadProcessed={() => void downloadProcessedInvoice(invoice.id).catch(fail)}
          />
        ) : (
          <EmptyState
            title="Invoice Review"
            body="Open an invoice from the archive, dashboard, or finish an upload to review OCR results here."
            actionLabel="Go to archive"
            onAction={() => router.push("/invoices")}
          />
        )
      ) : null}

      {section === "due" ? (
        <DuePanel
          loading={dueLoading}
          groups={dueGroups}
          onOpen={(id) => void openInvoice(id).catch(fail)}
        />
      ) : null}

      {section === "suppliers" ? (
        <SupplierPanel
          suppliers={suppliers}
          name={supplierName}
          setName={setSupplierName}
          busy={busy}
          onCreate={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              await createSupplier({ name: supplierName });
              setSupplierName("");
              setNotice("Supplier saved in this tenant.");
              await loadCatalog();
            } catch (reason) { fail(reason); } finally { setBusy(false); }
          }}
        />
      ) : null}

      {section === "products" ? (
        <ProductPanel
          products={products}
          name={productName}
          sku={productSku}
          setName={setProductName}
          setSku={setProductSku}
          busy={busy}
          onCreate={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              await createProduct({ name: productName, sku: productSku || undefined });
              setProductName("");
              setProductSku("");
              setNotice("Product saved in this tenant's catalog.");
              await loadCatalog();
            } catch (reason) { fail(reason); } finally { setBusy(false); }
          }}
        />
      ) : null}

      {section === "settings" ? (
        <section className="max-w-lg rounded-lg border border-shohoz-line bg-white p-4">
          <h1 className="text-lg font-semibold">Settings</h1>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-shohoz-muted">Name</dt><dd>{person || "—"}</dd></div>
            <div><dt className="text-shohoz-muted">Email</dt><dd>{user?.email || "—"}</dd></div>
            <div><dt className="text-shohoz-muted">Business</dt><dd>{tenantName || "—"}</dd></div>
          </dl>
          <button type="button" className="mt-4 rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white" onClick={logout}>Sign out</button>
        </section>
      ) : null}
    </div>
  );
}

function Overview({ loading, summary, recent, activity, failedJobs, duplicateWarnings, onOpen, onUpload }: {
  loading: boolean;
  summary: InvoiceSummary | null;
  recent: Invoice[];
  activity: Job[];
  failedJobs: Job[];
  duplicateWarnings: number;
  onOpen: (id: string) => void;
  onUpload: () => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-shohoz-body">Invoice activity for the authenticated business.</p>
        </div>
        <button type="button" className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white" onClick={onUpload}>Upload invoice</button>
      </div>
      {loading && !summary ? <p className="mt-4 text-sm text-shohoz-muted">Loading invoices…</p> : null}
      {summary ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Total invoices" value={summary.total} />
          <Metric label="Processing" value={summary.processing} />
          <Metric label="Review required" value={summary.awaitingReview} />
          <Metric label="Approved" value={summary.approved} />
          <Metric label="Failed" value={summary.failed} />
          <Metric label="Duplicate warnings" value={duplicateWarnings} hint="From the latest invoice page" />
        </dl>
      ) : null}
      <p className="mt-2 text-xs text-shohoz-muted">Review required includes extracted and review_required statuses. Processing includes uploaded, queued, and processing.</p>
      {failedJobs.length ? (
        <div className="mt-4 rounded-md border border-red-200 bg-white p-3" role="alert">
          <h2 className="text-sm font-semibold text-red-800">Failed jobs</h2>
          <ul className="mt-2 space-y-1 text-sm">{failedJobs.map((job) => <li key={job.id}>{workflowLabel(job.status)}{job.error ? ` — ${job.error}` : ""}</li>)}</ul>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent invoice activity">
          {recent.length === 0 ? <Empty>No invoices yet.</Empty> : recent.map((row) => <InvoiceButton key={row.id} invoice={row} onOpen={onOpen} />)}
        </Panel>
        <Panel title="Recent processing">
          {activity.length === 0 ? <Empty>No processing jobs yet.</Empty> : (
            <ul className="space-y-2 text-sm">{activity.map((job) => <li key={job.id} className="flex justify-between gap-3"><span>{workflowLabel(job.status)}</span><span className="text-shohoz-muted">{job.durationMs != null ? `${job.durationMs} ms` : job.error || ""}</span></li>)}</ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function DuePanel({ loading, groups, onOpen }: {
  loading: boolean;
  groups: Record<"overdue" | "due_today" | "due_soon", Invoice[]>;
  onOpen: (id: string) => void;
}) {
  const total = groups.overdue.length + groups.due_today.length + groups.due_soon.length;
  return (
    <section>
      <h1 className="text-xl font-semibold">Due & Overdue</h1>
      <p className="mt-1 text-sm text-shohoz-body">
        Derived from invoice <code className="text-xs">dueDate</code> and <code className="text-xs">paymentStatus</code> fields returned by the archive API.
        Email/in-app reminder delivery, partial-payment ledgers, and reminder cancellation are not available until backend reminder APIs exist.
      </p>
      {loading ? <p className="mt-4 text-sm text-shohoz-muted">Loading due invoices…</p> : null}
      {!loading && total === 0 ? <Empty>No due-soon or overdue invoices in the loaded archive pages.</Empty> : null}
      {(["overdue", "due_today", "due_soon"] as const).map((bucket) => (
        <div key={bucket} className="mt-4">
          <h2 className="text-sm font-semibold">{dueLabel(bucket)} ({groups[bucket].length})</h2>
          {groups[bucket].length === 0 ? <Empty>None.</Empty> : (
            <div className="mt-2 space-y-2">
              {groups[bucket].map((row) => (
                <button key={row.id} type="button" className="block w-full rounded-md border border-shohoz-line bg-white px-3 py-2 text-left text-sm" onClick={() => onOpen(row.id)}>
                  <span className="font-semibold">{row.invoiceNumber || "Unnumbered"}</span>
                  <span className="mt-1 block text-shohoz-muted">
                    {row.supplierName || "No supplier"} · due {row.dueDate || "—"} · {row.grandTotal || "—"} · {row.paymentStatus || "payment unknown"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function groupDue(rows: Invoice[]): Record<"overdue" | "due_today" | "due_soon", Invoice[]> {
  const groups: Record<"overdue" | "due_today" | "due_soon", Invoice[]> = { overdue: [], due_today: [], due_soon: [] };
  for (const row of rows) {
    const bucket: DueBucket = classifyDue(row);
    if (bucket === "overdue" || bucket === "due_today" || bucket === "due_soon") groups[bucket].push(row);
  }
  return groups;
}

function InvoiceList({ loading, page, filters, setFilters, onSearch, onPage, onOpen }: {
  loading: boolean;
  page: Page<Invoice> | null;
  filters: InvoiceQuery;
  setFilters: (query: InvoiceQuery) => void;
  onSearch: () => void;
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  const totalPages = page ? Math.max(1, Math.ceil(page.meta.total / page.meta.pageSize)) : 1;
  return (
    <section>
      <h1 className="text-xl font-semibold">Invoice Archive</h1>
      <p className="mt-1 text-sm text-shohoz-body">Search and filter stored invoices. Supplier-id filtering is not exposed by the list API; use supplier name search instead.</p>
      <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <label className="text-sm font-medium">Search<input className={fieldClass} value={filters.q ?? ""} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Number or supplier" /></label>
        <label className="text-sm font-medium">Status
          <select className={fieldClass} value={filters.status ?? ""} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All</option>
            {["uploaded", "queued", "processing", "extracted", "review_required", "approved", "failed"].map((status) => <option key={status} value={status}>{workflowLabel(status)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Uploaded from<input className={fieldClass} type="date" value={filters.from ?? ""} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label className="text-sm font-medium">Uploaded to<input className={fieldClass} type="date" value={filters.to ?? ""} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button className="self-end rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button>
      </form>
      {loading ? <p className="mt-4 text-sm text-shohoz-muted">Loading invoices…</p> : null}
      {!loading && page && page.data.length === 0 ? <Empty>No invoices match these filters.</Empty> : null}
      {page && page.data.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-shohoz-line bg-white md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-shohoz-mist text-shohoz-muted"><tr><th className="px-3 py-2 font-medium">Number</th><th className="px-3 py-2 font-medium">Supplier</th><th className="px-3 py-2 font-medium">Invoice date</th><th className="px-3 py-2 font-medium">Due</th><th className="px-3 py-2 font-medium">Total</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Uploaded</th></tr></thead>
              <tbody>{page.data.map((row) => (
                <tr key={row.id} className="border-t border-shohoz-line">
                  <td className="px-3 py-2"><button type="button" className="font-semibold text-shohoz" onClick={() => onOpen(row.id)}>{row.invoiceNumber || "Unnumbered"}</button></td>
                  <td className="px-3 py-2">{row.supplierName || "—"}</td>
                  <td className="px-3 py-2">{row.invoiceDate || "—"}</td>
                  <td className="px-3 py-2">{row.dueDate || "—"}</td>
                  <td className="px-3 py-2">{row.grandTotal || "—"}</td>
                  <td className="px-3 py-2">{workflowLabel(row.status)}</td>
                  <td className="px-3 py-2">{row.createdAt.slice(0, 10)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-4 space-y-2 md:hidden">{page.data.map((row) => <InvoiceButton key={row.id} invoice={row} onOpen={onOpen} />)}</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-shohoz-muted">{page.meta.total} invoices</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-shohoz-line bg-white px-3 py-1.5 disabled:opacity-50" disabled={(filters.page ?? 1) <= 1} onClick={() => onPage((filters.page ?? 1) - 1)}>Previous</button>
              <button type="button" className="rounded-md border border-shohoz-line bg-white px-3 py-1.5 disabled:opacity-50" disabled={(filters.page ?? 1) >= totalPages} onClick={() => onPage((filters.page ?? 1) + 1)}>Next</button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function UploadPanel({ fileId, fileLabel, progress, job, language, busy, setLanguage, onFile }: {
  fileId: string;
  fileLabel: string;
  progress: number | null;
  job: Job | null;
  language: string;
  busy: boolean;
  setLanguage: (value: string) => void;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Invoice Upload</h1>
      <p className="mt-1 text-sm text-shohoz-body">PDF, JPG, or PNG. Use a clear, high-resolution scan for best field fill. For Intertek/Mushak/English invoices choose OCR language English. On mobile you can use the camera.</p>
      <form
        className="mt-4 rounded-lg border border-dashed border-shohoz/40 bg-white p-6"
        onSubmit={(event) => event.preventDefault()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (!busy) void onFile(event.dataTransfer.files?.[0]); }}
      >
        <label className="mb-3 block text-sm font-medium">OCR language
          <select className={fieldClass} value={language} onChange={(event) => setLanguage(event.target.value)}>
            {OCR_LANGUAGE_OPTIONS.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label htmlFor={fileId} className={`inline-flex cursor-pointer rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white ${busy ? "pointer-events-none opacity-60" : ""}`}>Choose file or take photo</label>
        <input
          id={fileId}
          className="sr-only"
          type="file"
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          capture="environment"
          disabled={busy}
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <p className="mt-3 text-sm text-shohoz-muted">Or drop a file here. {fileLabel}</p>
        {progress != null ? (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded bg-shohoz-soft">
              <div className="h-full bg-shohoz transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-sm">Upload progress {progress}%</p>
          </div>
        ) : null}
      </form>
      {job ? <Stages job={job} /> : null}
    </section>
  );
}

function Stages({ job }: { job: Job }) {
  const running = job.status === "active";
  const finished = job.status === "completed";
  const failed = job.status === "failed";
  const rows = [
    { label: "File uploaded", state: "done" },
    { label: "OCR processing", state: finished || running ? (running ? "current" : "done") : failed ? "failed" : "pending" },
    { label: "Extracting invoice information", state: finished ? "done" : "pending" },
    { label: "Validating invoice", state: finished ? "done" : "pending" },
    { label: "Ready for review", state: finished ? "done" : "pending" },
  ];
  return (
    <ol className="mt-4 space-y-2 rounded-lg border border-shohoz-line bg-white p-4 text-sm">
      {rows.map((row) => <li key={row.label} className="flex items-center justify-between gap-3"><span>{row.label}</span><span className="text-shohoz-muted">{row.state === "done" ? "Done" : row.state === "current" ? "Running" : row.state === "failed" ? "Failed" : "Waiting"}</span></li>)}
      {job.status === "queued" ? <li className="text-shohoz-muted">Queued. OCR has not started yet.</li> : null}
      {running ? <li className="text-shohoz-muted">OCR is running. Extraction and validation are marked done only after the job completes.</li> : null}
      {failed ? <li className="text-red-800" role="alert">{job.error || "Processing failed."} {job.attempts ? `Attempts: ${job.attempts}.` : ""}</li> : null}
    </ol>
  );
}

function readPages(value: unknown): Array<{ page: number; text: string }> {
  if (!Array.isArray(value)) return [];
  const pages: Array<{ page: number; text: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { text?: unknown; page?: unknown };
    if (typeof record.text !== "string" || !record.text) continue;
    pages.push({ page: typeof record.page === "number" ? record.page : pages.length + 1, text: record.text });
  }
  return pages;
}

function Review({ invoice, draft, baseline, suppliers, products, ocrText, ocrLanguage, setOcrLanguage, preview, busy, setDraft, onSave, onApprove, onReprocess, onDelete, onPreview, onDownload, onDownloadProcessed }: {
  invoice: Invoice;
  draft: Draft;
  baseline: Draft;
  suppliers: Supplier[];
  products: Product[];
  ocrText: string;
  ocrLanguage: string;
  setOcrLanguage: (value: string) => void;
  preview: { url: string; mimeType: string } | null;
  busy: boolean;
  setDraft: (draft: Draft) => void;
  onSave: (event: FormEvent) => void;
  onApprove: () => void;
  onReprocess: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onDownloadProcessed: () => void;
}) {
  function updateItem(index: number, patch: Partial<DraftItem>) {
    setDraft({ ...draft, items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }
  function addItem() {
    setDraft({ ...draft, items: [...draft.items, emptyDraftItem()] });
  }
  function removeItem(index: number) {
    setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) });
  }
  const headerChecks = headerReviewFields(invoice.uncertainFields);
  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{draft.invoiceNumber || "Unnumbered invoice"}</h1>
          <p className="text-sm text-shohoz-muted">
            {workflowLabel(invoice.status)}
            {invoice.ocrProvider ? ` · ${invoice.ocrProvider}` : ""}
            {invoice.ocrLanguages?.length ? ` · ${invoice.ocrLanguages.join("+")}` : ""}
            {invoice.ocrConfidence ? ` · engine score ${invoice.ocrConfidence}` : ""}
            {invoice.supplierMatch ? ` · Supplier ${invoice.supplierMatch}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">Save edits</button>
          <button className="rounded-md border border-shohoz-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={busy || !canApprove(invoice.status)} type="button" onClick={onApprove}>Approve purchase draft</button>
          <label className="text-sm font-medium">OCR language
            <select className={fieldClass} value={ocrLanguage} onChange={(event) => setOcrLanguage(event.target.value)}>
              {OCR_LANGUAGE_OPTIONS.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-shohoz disabled:opacity-60" type="button" disabled={busy || invoice.status === "approved" || invoice.status === "processing"} onClick={onReprocess}>Retry processing</button>
        </div>
      </div>
      <p className="rounded-md border border-shohoz-line bg-white p-3 text-sm text-shohoz-body">{approvalMeansPurchaseDraft()} OCR results are never auto-approved.</p>
      {invoice.status === "failed" ? <Alert>{invoice.job?.error || "Processing failed before extraction was saved."}</Alert> : null}
      {invoice.status === "queued" || invoice.status === "processing" ? <p className="rounded-md border border-shohoz-line bg-white p-3 text-sm">{lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null)}</p> : null}
      {invoice.duplicateReason ? <Alert>Possible duplicate: {invoice.duplicateReason}</Alert> : null}
      {(invoice.missingFields.length > 0 || headerChecks.length > 0 || lineItemsNeedReview(invoice.uncertainFields) || invoice.totalsValid === false) ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {invoice.missingFields.length ? `Missing: ${invoice.missingFields.join(", ")}. ` : ""}
          {headerChecks.length ? `Check: ${headerChecks.join(", ")}. ` : ""}
          {lineItemsNeedReview(invoice.uncertainFields) ? "Some line items need review. " : ""}
          {invoice.totalsValid === false ? "The totals do not reconcile. " : ""}
          {invoice.missingFields.length >= 8
            ? "OCR could not map enough invoice fields from this scan. Reprocess with OCR language English for Latin invoices, upload a clearer PDF/photo, or type the values below — then Save edits and Download processed invoice PDF."
            : "Edit any wrong value, Save edits, then Approve or Download processed invoice PDF."}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-lg border border-shohoz-line bg-white p-4">
            <h2 className="text-sm font-semibold">Extracted invoice information</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Supplier" value={draft.supplierName} original={baseline.supplierName} onChange={(value) => setDraft({ ...draft, supplierName: value })} />
              <label className="text-sm font-medium">Matched supplier
                <select className={fieldClass} value={draft.supplierId} onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}>
                  <option value="">Unmatched</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <Field label="Invoice number" value={draft.invoiceNumber} original={baseline.invoiceNumber} onChange={(value) => setDraft({ ...draft, invoiceNumber: value })} />
              <Field label="Invoice date" value={draft.invoiceDate} original={baseline.invoiceDate} onChange={(value) => setDraft({ ...draft, invoiceDate: value })} />
              <Field label="Due date" value={draft.dueDate} original={baseline.dueDate} onChange={(value) => setDraft({ ...draft, dueDate: value })} />
              <Field label="Currency" value={draft.currency} original={baseline.currency} onChange={(value) => setDraft({ ...draft, currency: value })} />
              <Field label="Tax / VAT number" value={draft.supplierTaxNumber} original={baseline.supplierTaxNumber} onChange={(value) => setDraft({ ...draft, supplierTaxNumber: value })} />
              <Field label="Subtotal" value={draft.subtotal} original={baseline.subtotal} onChange={(value) => setDraft({ ...draft, subtotal: value })} />
              <Field label="Discount" value={draft.discount} original={baseline.discount} onChange={(value) => setDraft({ ...draft, discount: value })} />
              <Field label="VAT / Tax" value={draft.tax} original={baseline.tax} onChange={(value) => setDraft({ ...draft, tax: value })} />
              <Field label="Grand total" value={draft.grandTotal} original={baseline.grandTotal} onChange={(value) => setDraft({ ...draft, grandTotal: value })} />
            </div>
          </section>

          <section className="rounded-lg border border-shohoz-line bg-white p-4">
            <h2 className="text-sm font-semibold">Line items</h2>
            <p className="mt-1 text-sm text-shohoz-muted">Confirm supplier and product matches before approval. Suggestions come from this tenant catalog.</p>
            <div className="mt-3 space-y-4">
              {draft.items.map((item, index) => {
                const original = baseline.items.find((candidate) => candidate.rowKey === item.rowKey) ?? emptyDraftItem(item.rowKey);
                return (
                  <div key={item.rowKey} className={item.reviewReasons.length ? "rounded-md border border-amber-300 bg-amber-50 p-3" : "border-t border-shohoz-line pt-3"}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Line {index + 1}{item.reviewReasons.length ? " · Needs review" : ""}</p>
                      <button type="button" className="rounded-md px-2 py-1 text-sm font-semibold text-red-800" onClick={() => removeItem(index)}>Remove line</button>
                    </div>
                    {item.reviewReasons.length ? <p className="mb-2 text-sm text-amber-950">{item.reviewReasons.map(reviewReasonLabel).join(". ")}.</p> : null}
                    {typeof item.extractionConfidence === "number" ? <p className="mb-2 text-xs text-shohoz-muted">Heuristic score {item.extractionConfidence.toFixed(2)}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Product" value={item.productName} original={original.productName} onChange={(value) => updateItem(index, { productName: value })} />
                      <Field label="Description" value={item.description} original={original.description} onChange={(value) => updateItem(index, { description: value })} />
                      <Field label="SKU" value={item.sku} original={original.sku} onChange={(value) => updateItem(index, { sku: value })} />
                      <Field label="Quantity" value={item.quantity} original={original.quantity} onChange={(value) => updateItem(index, { quantity: value })} />
                      <Field label="Unit price" value={item.unitPrice} original={original.unitPrice} onChange={(value) => updateItem(index, { unitPrice: value })} />
                      <Field label="Discount" value={item.discount} original={original.discount} onChange={(value) => updateItem(index, { discount: value })} />
                      <Field label="VAT / Tax" value={item.tax} original={original.tax} onChange={(value) => updateItem(index, { tax: value })} />
                      <Field label="Line total" value={item.lineTotal} original={original.lineTotal} onChange={(value) => updateItem(index, { lineTotal: value })} />
                    </div>
                    {item.sourceText ? <p className="mt-2 whitespace-pre-wrap text-xs text-shohoz-muted">OCR line: {item.sourceText}</p> : null}
                    <label className="mt-2 block text-sm font-medium">Catalog product
                      <select className={fieldClass} value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })}>
                        <option value="">{item.matchStatus === "review" ? "Needs a choice" : "No catalog product"}</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
                      </select>
                    </label>
                    {item.suggestions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.suggestions.map((suggestion) => (
                          <button key={suggestion.productId} type="button" className="rounded-md border border-shohoz-line px-2 py-1 text-xs" onClick={() => updateItem(index, { productId: suggestion.productId })}>
                            Use {suggestion.name} · {suggestion.method} · {suggestion.confidence}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <button type="button" className="rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold" onClick={addItem}>Add line</button>
              {lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null) ? <Empty>{lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null)}</Empty> : null}
            </div>
          </section>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-lg border border-shohoz-line bg-white p-4">
            <h2 className="text-sm font-semibold">Original invoice</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold" onClick={onPreview}>Load preview</button>
              <button type="button" className="rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold" onClick={onDownload}>Download</button>
              <button type="button" className="rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold" onClick={onDownloadProcessed}>Processed PDF</button>
              <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-red-800" onClick={onDelete}>Delete</button>
            </div>
            {preview ? (
              preview.mimeType.startsWith("image/")
                ? <img src={preview.url} alt="Uploaded invoice" className="mt-3 max-h-[70vh] w-full rounded-md border border-shohoz-line object-contain" />
                : <iframe title="Uploaded invoice" src={preview.url} className="mt-3 h-[70vh] w-full rounded-md border border-shohoz-line" />
            ) : (
              <p className="mt-3 text-sm text-shohoz-muted">Preview loads beside the extracted fields on desktop.</p>
            )}
            {invoice.ocrWarnings?.length ? <ul className="mt-3 space-y-1 text-sm text-shohoz-body">{invoice.ocrWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
            {invoice.uncertainFields.includes("ocrText") ? <p className="mt-2 text-sm text-red-800">The engine score is low. Review the text before approving.</p> : null}
            {ocrText ? (
              <details className="mt-3" open={invoice.missingFields.length >= 6 || invoice.uncertainFields.includes("ocrText")}>
                <summary className="cursor-pointer text-sm font-semibold">OCR text</summary>
                <pre dir={invoice.ocrDirection === "rtl" ? "rtl" : "auto"} className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-shohoz-body">{ocrText}</pre>
              </details>
            ) : null}
            {readPages(invoice.ocrPages).map((page) => (
              <details key={`page-${page.page}`} className="mt-2"><summary className="cursor-pointer text-sm">Page {page.page}</summary><pre dir={invoice.ocrDirection === "rtl" ? "rtl" : "auto"} className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{page.text}</pre></details>
            ))}
            {invoice.activities.length ? (
              <div className="mt-3">
                <h3 className="text-sm font-semibold">Activity</h3>
                <ul className="mt-2 space-y-1 text-sm text-shohoz-body">{invoice.activities.map((activity) => <li key={activity.id}>{activity.action}{activity.detail ? ` — ${activity.detail}` : ""}</li>)}</ul>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </form>
  );
}

function SupplierPanel({ suppliers, name, setName, busy, onCreate }: { suppliers: Supplier[]; name: string; setName: (value: string) => void; busy: boolean; onCreate: (event: FormEvent) => void }) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onCreate}>
        <label className="text-sm font-medium">Name<input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <button className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">Add supplier</button>
      </form>
      {suppliers.length === 0 ? <Empty>No suppliers in this business yet.</Empty> : (
        <ul className="mt-4 divide-y divide-shohoz-line rounded-lg border border-shohoz-line bg-white">{suppliers.map((supplier) => <li key={supplier.id} className="px-3 py-2 text-sm">{supplier.name}{supplier.taxNumber ? ` · ${supplier.taxNumber}` : ""}</li>)}</ul>
      )}
    </section>
  );
}

function ProductPanel({ products, name, sku, setName, setSku, busy, onCreate }: { products: Product[]; name: string; sku: string; setName: (value: string) => void; setSku: (value: string) => void; busy: boolean; onCreate: (event: FormEvent) => void }) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Products</h1>
      <p className="mt-1 text-sm text-shohoz-muted">Tenant catalog used for invoice product matching.</p>
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onCreate}>
        <label className="text-sm font-medium">Name<input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="text-sm font-medium">SKU<input className={fieldClass} value={sku} onChange={(event) => setSku(event.target.value)} /></label>
        <button className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">Add product</button>
      </form>
      {products.length === 0 ? <Empty>No products in this business yet.</Empty> : (
        <ul className="mt-4 divide-y divide-shohoz-line rounded-lg border border-shohoz-line bg-white">{products.map((product) => <li key={product.id} className="px-3 py-2 text-sm">{product.name}{product.sku ? ` · ${product.sku}` : ""}</li>)}</ul>
      )}
    </section>
  );
}

function Field({ label, value, original, onChange }: { label: string; value: string; original: string; onChange: (value: string) => void }) {
  const changed = value.trim() !== original.trim();
  return (
    <label className="text-sm font-medium">{label}{changed ? <span className="ml-2 text-xs font-semibold text-shohoz">Edited</span> : null}
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-shohoz-line bg-white px-3 py-3">
      <dt className="text-xs text-shohoz-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {hint ? <p className="mt-1 text-[11px] text-shohoz-muted">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-shohoz-line bg-white p-4"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}

function InvoiceButton({ invoice, onOpen }: { invoice: Invoice; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="block w-full rounded-md border border-shohoz-line bg-white px-3 py-2 text-left text-sm" onClick={() => onOpen(invoice.id)}>
      <span className="font-semibold">{invoice.invoiceNumber || "Unnumbered"}</span>
      <span className="mt-1 block text-shohoz-muted">{invoice.supplierName || "No supplier"} · {workflowLabel(invoice.status)} · {invoice.grandTotal || "—"}</span>
      {invoice.duplicateReason ? <span className="mt-1 block text-xs text-amber-800">Duplicate warning</span> : null}
    </button>
  );
}

function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="rounded-lg border border-shohoz-line bg-white p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-shohoz-body">{body}</p>
      <button type="button" className="mt-4 rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white" onClick={onAction}>{actionLabel}</button>
    </section>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800" role="alert">{children}</p>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-shohoz-muted">{children}</p>;
}

function toDraft(invoice: Invoice): Draft {
  return {
    invoiceNumber: invoice.invoiceNumber ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    dueDate: invoice.dueDate ?? "",
    supplierName: invoice.supplierName ?? "",
    supplierId: invoice.supplierId ?? "",
    supplierTaxNumber: invoice.supplierTaxNumber ?? "",
    currency: invoice.currency ?? "",
    subtotal: invoice.subtotal ?? "",
    discount: invoice.discount ?? "",
    tax: invoice.tax ?? "",
    grandTotal: invoice.grandTotal ?? "",
    items: invoice.items.map((item) => ({
      ...emptyDraftItem(),
      productId: item.productId ?? "",
      productName: item.productName ?? "",
      description: item.description ?? "",
      sku: item.sku ?? "",
      barcode: item.barcode ?? "",
      quantity: item.quantity ?? "",
      unit: item.unit ?? "",
      unitPrice: item.unitPrice ?? "",
      discount: item.discount ?? "",
      tax: item.tax ?? "",
      lineTotal: item.lineTotal ?? "",
      matchStatus: item.matchStatus,
      matchMethod: item.matchMethod,
      matchConfidence: item.matchConfidence,
      suggestions: item.suggestions ?? [],
      sourceText: item.sourceText ?? "",
      extractionConfidence: item.extractionConfidence,
      reviewReasons: item.reviewReasons ?? [],
      genericName: item.genericName ?? "",
      batchNumber: item.batchNumber ?? "",
      expiresOn: item.expiresOn ?? "",
    })),
  };
}

let draftKey = 0;

function nextDraftKey(): string {
  draftKey += 1;
  return `line-${draftKey}`;
}

function emptyDraftItem(rowKey = nextDraftKey()): DraftItem {
  return {
    rowKey,
    productId: "",
    productName: "",
    description: "",
    sku: "",
    barcode: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    discount: "",
    tax: "",
    lineTotal: "",
    matchStatus: null,
    matchMethod: null,
    matchConfidence: null,
    suggestions: [],
    sourceText: "",
    extractionConfidence: null,
    reviewReasons: [],
    genericName: "",
    batchNumber: "",
    expiresOn: "",
  };
}

function text(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function safeOrigin(): string | null {
  try {
    return apiOrigin();
  } catch {
    return null;
  }
}

const fieldClass = "mt-1 w-full rounded-md border border-shohoz-line bg-white px-2 py-2 text-sm";
