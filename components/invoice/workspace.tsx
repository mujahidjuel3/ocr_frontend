"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { ApiError, type Invoice, type InvoiceItem, type Job, type Product, type Supplier } from "@/lib/api";
import { approveInvoice, clearToken, deleteInvoice, downloadDocument, downloadProcessedInvoice, getInvoice, getOcrText, listInvoices, listProducts, listSuppliers, login, me, readToken, register, reprocessInvoice, saveToken, updateInvoice, uploadInvoice, watchJob } from "@/lib/api";
import { apiOrigin } from "@/lib/api";
import { Container } from "@/components/ai-invoice/shared";
import { lineItemsMessage, reviewReasonLabel } from "@/lib/line-review";
import { OCR_LANGUAGE_OPTIONS } from "@/lib/ocr-language";

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
  lineTotal: string;
  matchStatus: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
  suggestions: InvoiceItem["suggestions"];
  sourceText: string;
  reviewReasons: string[];
};
type Draft = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierTaxNumber: string;
  supplierId: string;
  purchaseOrder: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  grandTotal: string;
  paymentStatus: string;
  items: DraftItem[];
};

const emptyDraft: Draft = {
  invoiceNumber: "", invoiceDate: "", dueDate: "", supplierName: "", supplierAddress: "", supplierPhone: "", supplierTaxNumber: "", supplierId: "",
  purchaseOrder: "", currency: "", subtotal: "", discount: "", tax: "", shipping: "", grandTotal: "", paymentStatus: "", items: [],
};

export function InvoiceWorkspace() {
  const inputId = useId();
  const origin = safeOrigin();
  const [token, setToken] = useState("");
  const [tenant, setTenant] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [person, setPerson] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLanguage, setOcrLanguage] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readToken();
    if (!stored) return;
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    me().then((user) => { if (!ignore) setTenant(user.tenant.name); }).catch((reason) => fail(reason));
    refreshLists();
    return () => { ignore = true; };
  }, [token]);

  useEffect(() => {
    if (!job || !token) return;
    if (job.status === "completed" || job.status === "failed") return;
    const controller = new AbortController();
    watchJob(job.id, setJob, controller.signal)
      .then(async (done) => {
        if (done.status === "completed") await openInvoice(done.invoiceId);
        else setError(done.error || "OCR failed");
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        fail(reason);
      });
    return () => controller.abort();
  }, [job?.id, job?.status, token]);

  function fail(reason: unknown) {
    setError(reason instanceof ApiError ? reason.message : "Something went wrong");
    if (reason instanceof ApiError && reason.status === 401) {
      clearToken();
      setToken("");
    }
  }

  async function refreshLists() {
    const [invoices, supplierRows, productRows] = await Promise.all([listInvoices(), listSuppliers(), listProducts()]);
    setHistory(invoices.data);
    setSuppliers(supplierRows);
    setProducts(productRows);
  }

  async function openInvoice(invoiceId: string) {
    const next = await getInvoice(invoiceId);
    setInvoice(next);
    setDraft(toDraft(next));
    const recognized = await getOcrText(invoiceId);
    setOcrText(recognized.text ?? "");
    setOcrLanguage(next.ocrLanguageHint ?? "");
    setError("");
  }

  async function onAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = mode === "login"
        ? await login(email, password)
        : await register({ tenantName, name: person, email, password });
      saveToken(result.accessToken);
      setToken(result.accessToken);
      setTenant(result.user.tenantName);
      setPassword("");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    setProgress(0);
    setInvoice(null);
    try {
      const created = await uploadInvoice(file, setProgress, ocrLanguage);
      setProgress(null);
      setJob({ id: created.jobId, invoiceId: created.invoiceId, status: "queued", attempts: 0, error: null, createdAt: "", startedAt: null, finishedAt: null });
      await refreshLists();
    } catch (reason) {
      setProgress(null);
      fail(reason);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setBusy(true);
    setError("");
    try {
      const saved = await updateInvoice(invoice.id, {
        invoiceNumber: text(draft.invoiceNumber),
        invoiceDate: text(draft.invoiceDate),
        dueDate: text(draft.dueDate),
        supplierName: text(draft.supplierName),
        supplierAddress: text(draft.supplierAddress),
        supplierPhone: text(draft.supplierPhone),
        supplierTaxNumber: text(draft.supplierTaxNumber),
        supplierId: text(draft.supplierId),
        purchaseOrder: text(draft.purchaseOrder),
        currency: text(draft.currency),
        subtotal: text(draft.subtotal),
        discount: text(draft.discount),
        tax: text(draft.tax),
        shipping: text(draft.shipping),
        grandTotal: text(draft.grandTotal),
        paymentStatus: text(draft.paymentStatus),
        items: draft.items.map((item) => ({
          productId: text(item.productId),
          productName: text(item.productName),
          description: text(item.description),
          sku: text(item.sku),
          barcode: text(item.barcode),
          quantity: text(item.quantity),
          unit: text(item.unit),
          unitPrice: text(item.unitPrice),
          lineTotal: text(item.lineTotal),
        })),
      });
      setInvoice(saved);
      setDraft(toDraft(saved));
      setNotice("Invoice saved.");
      await refreshLists();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!invoice) return;
    setBusy(true);
    setError("");
    try {
      const saved = await approveInvoice(invoice.id);
      setInvoice(saved);
      setNotice(saved.pos.message);
      await refreshLists();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function reprocess() {
    if (!invoice) return;
    setBusy(true);
    setError("");
    try {
      const next = await reprocessInvoice(invoice.id, ocrLanguage);
      setInvoice(null);
      setJob({ id: next.jobId, invoiceId: next.invoiceId, status: "queued", attempts: 0, error: null, createdAt: "", startedAt: null, finishedAt: null });
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!invoice) return;
    setBusy(true);
    try {
      await deleteInvoice(invoice.id);
      setInvoice(null);
      setDraft(emptyDraft);
      setNotice("Invoice deleted.");
      await refreshLists();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="workspace" aria-labelledby="workspace-title" className="scroll-mt-20 bg-shohoz-mist py-8 sm:py-10">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-shohoz">Invoice desk</p>
            <h2 id="workspace-title" className="mt-1 font-serif text-2xl font-semibold text-shohoz-ink">Upload, review, and approve</h2>
          </div>
          {token ? (
            <button type="button" className="text-sm font-semibold text-shohoz" onClick={() => { clearToken(); setToken(""); setInvoice(null); }}>
              Sign out{tenant ? ` · ${tenant}` : ""}
            </button>
          ) : null}
        </div>
        {!origin ? (
          <p className="mt-4 rounded-md bg-white p-4 text-sm text-red-800" role="alert">Set NEXT_PUBLIC_API_URL to the NestJS API origin and restart the frontend.</p>
        ) : null}
        {error ? <p className="mt-4 rounded-md bg-white p-3 text-sm font-medium text-red-800" role="alert">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-md bg-white p-3 text-sm text-shohoz-ink">{notice}</p> : null}

        {origin && !token ? (
          <form onSubmit={onAuth} className="mt-4 grid max-w-md gap-3 rounded-lg bg-white p-4 ring-1 ring-shohoz-line">
            {mode === "register" ? (
              <>
                <label className="text-sm font-medium text-shohoz-ink">Business name<input className={fieldClass} value={tenantName} onChange={(event) => setTenantName(event.target.value)} required /></label>
                <label className="text-sm font-medium text-shohoz-ink">Your name<input className={fieldClass} value={person} onChange={(event) => setPerson(event.target.value)} required /></label>
              </>
            ) : null}
            <label className="text-sm font-medium text-shohoz-ink">Email<input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="text-sm font-medium text-shohoz-ink">Password<input className={fieldClass} type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
            <button type="button" className="text-left text-sm font-semibold text-shohoz" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create a business account" : "I already have an account"}
            </button>
            <p className="text-sm text-shohoz-muted">Development login is documented in backend/.env.example.</p>
          </form>
        ) : null}

        {origin && token ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <form
                className="rounded-lg border border-dashed border-shohoz/30 bg-white p-4"
                onSubmit={(event) => event.preventDefault()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); void onFile(event.dataTransfer.files?.[0]); }}
              >
                <label htmlFor={inputId} className="inline-flex cursor-pointer rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white">Choose invoice</label>
                <label className="ml-3 text-sm font-medium text-shohoz-ink">OCR language
                  <select className={`${fieldClass} ml-2`} value={ocrLanguage} onChange={(event) => setOcrLanguage(event.target.value)}>
                    {OCR_LANGUAGE_OPTIONS.map((option) => <option key={option.value || "default"} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <input id={inputId} className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ""; }} />
                <p className="mt-2 text-sm text-shohoz-muted">Drop a PDF, JPG, or PNG. The file is uploaded to the API.</p>
                {progress !== null ? <p className="mt-2 text-sm font-medium text-shohoz-ink">Uploading {progress}%</p> : null}
                {job ? <p className="mt-2 text-sm text-shohoz-ink">{job.status === "queued" ? "Queued. OCR has not started yet." : job.status === "active" ? "OCR is running." : `Job ${job.status}`}{job.durationMs != null ? ` · ${job.durationMs} ms` : ""}{job.error ? `: ${job.error}` : ""}</p> : null}
              </form>

              {invoice ? (
                <form onSubmit={save} className="mt-4 rounded-lg bg-white p-4 ring-1 ring-shohoz-line">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-shohoz-ink">{invoice.status.replaceAll("_", " ")}</h3>
                    <p className="text-sm text-shohoz-muted">{invoice.supplierMatch === "matched" ? "Supplier matched" : "Supplier needs a match"}{invoice.ocrConfidence ? ` · OCR ${invoice.ocrConfidence}` : ""}</p>
                  </div>
                  {invoice.status === "failed" ? <p className="mt-2 text-sm font-medium text-red-800" role="alert">{invoice.job?.error || "Processing failed before extraction was saved."}</p> : null}
                  {invoice.status === "queued" || invoice.status === "processing" ? <p className="mt-2 text-sm text-shohoz-body">{lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null)}</p> : null}
                  {invoice.duplicateReason ? <p className="mt-2 text-sm font-medium text-red-800" role="alert">Possible duplicate: {invoice.duplicateReason}</p> : null}
                  {(invoice.missingFields.length > 0 || invoice.uncertainFields.length > 0) ? (
                    <p className="mt-2 text-sm text-shohoz-body">
                      {invoice.missingFields.length ? `Missing: ${invoice.missingFields.join(", ")}. ` : ""}
                      {invoice.uncertainFields.length ? `Check: ${invoice.uncertainFields.join(", ")}.` : ""}
                    </p>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Invoice number" value={draft.invoiceNumber} onChange={(value) => setDraft({ ...draft, invoiceNumber: value })} />
                    <Field label="Invoice date" value={draft.invoiceDate} onChange={(value) => setDraft({ ...draft, invoiceDate: value })} />
                    <Field label="Due date" value={draft.dueDate} onChange={(value) => setDraft({ ...draft, dueDate: value })} />
                    <Field label="Supplier" value={draft.supplierName} onChange={(value) => setDraft({ ...draft, supplierName: value })} />
                    <label className="text-sm font-medium text-shohoz-ink">Matched supplier
                      <select className={fieldClass} value={draft.supplierId} onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}>
                        <option value="">Unmatched</option>
                        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                      </select>
                    </label>
                    <Field label="Tax / VAT number" value={draft.supplierTaxNumber} onChange={(value) => setDraft({ ...draft, supplierTaxNumber: value })} />
                    <Field label="Currency" value={draft.currency} onChange={(value) => setDraft({ ...draft, currency: value })} />
                    <Field label="Grand total" value={draft.grandTotal} onChange={(value) => setDraft({ ...draft, grandTotal: value })} />
                    <Field label="Subtotal" value={draft.subtotal} onChange={(value) => setDraft({ ...draft, subtotal: value })} />
                    <Field label="Tax" value={draft.tax} onChange={(value) => setDraft({ ...draft, tax: value })} />
                    <Field label="Discount" value={draft.discount} onChange={(value) => setDraft({ ...draft, discount: value })} />
                    <Field label="Shipping" value={draft.shipping} onChange={(value) => setDraft({ ...draft, shipping: value })} />
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-sm">
                      <thead className="text-shohoz-muted"><tr><th className="py-2 pr-2">Product</th><th className="py-2 pr-2">SKU</th><th className="py-2 pr-2">Qty</th><th className="py-2 pr-2">Price</th><th className="py-2 pr-2">Total</th><th className="py-2">Catalog</th></tr></thead>
                      <tbody>
                        {draft.items.map((item, index) => (
                          <tr key={item.rowKey} className={item.reviewReasons.length ? "border-t border-amber-300 bg-amber-50" : "border-t border-shohoz-line"}>
                            <td className="py-2 pr-2">
                              <input className={fieldClass} value={item.productName} aria-label={`Product ${index + 1}`} onChange={(event) => updateItem(index, { productName: event.target.value })} />
                              <input className={`${fieldClass} mt-1`} value={item.description} aria-label={`Description ${index + 1}`} placeholder="Description" onChange={(event) => updateItem(index, { description: event.target.value })} />
                              {item.reviewReasons.length ? <span className="mt-1 block text-xs text-amber-950">{item.reviewReasons.map(reviewReasonLabel).join(". ")}</span> : null}
                              {item.sourceText ? <span className="mt-1 block whitespace-pre-wrap text-xs text-shohoz-muted">OCR line: {item.sourceText}</span> : null}
                            </td>
                            <td className="py-2 pr-2"><input className={fieldClass} value={item.sku} aria-label={`SKU ${index + 1}`} onChange={(event) => updateItem(index, { sku: event.target.value })} /></td>
                            <td className="py-2 pr-2"><input className={fieldClass} value={item.quantity} aria-label={`Quantity ${index + 1}`} onChange={(event) => updateItem(index, { quantity: event.target.value })} /></td>
                            <td className="py-2 pr-2"><input className={fieldClass} value={item.unitPrice} aria-label={`Unit price ${index + 1}`} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} /></td>
                            <td className="py-2 pr-2"><input className={fieldClass} value={item.lineTotal} aria-label={`Line total ${index + 1}`} onChange={(event) => updateItem(index, { lineTotal: event.target.value })} /></td>
                            <td className="py-2">
                              <select className={fieldClass} value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })}>
                                <option value="">{item.matchStatus === "review" ? "Needs review" : item.productId ? "Matched" : "Unmatched"}</option>
                                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                              </select>
                              <span className="mt-1 block text-xs text-shohoz-muted">{item.matchMethod ? `${item.matchMethod} ${item.matchConfidence ?? ""}` : item.suggestions?.[0] ? `Suggestion: ${item.suggestions[0].name}` : "No automatic match"}</span>
                              <button type="button" className="mt-1 text-xs font-semibold text-red-800" onClick={() => removeItem(index)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" className="mt-3 rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold" onClick={addItem}>Add line</button>
                    {lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null) ? <p className="mt-3 text-sm text-shohoz-muted">{lineItemsMessage(invoice.status, draft.items.length, invoice.job?.error ?? null)}</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-md bg-shohoz px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">Save edits</button>
                    <button className="rounded-md bg-shohoz-soft px-4 py-2 text-sm font-semibold text-shohoz disabled:opacity-60" disabled={busy || (invoice.status !== "extracted" && invoice.status !== "review_required")} type="button" onClick={() => void approve()}>Approve</button>
                    <button className="rounded-md px-4 py-2 text-sm font-semibold text-shohoz disabled:opacity-60" type="button" disabled={busy || invoice.status === "approved" || invoice.status === "processing"} onClick={() => void reprocess()}>Reprocess</button>
                    <button className="rounded-md px-4 py-2 text-sm font-semibold text-shohoz" type="button" onClick={() => void downloadDocument(invoice.id).catch(fail)}>Download original</button>
                    <button className="rounded-md px-4 py-2 text-sm font-semibold text-shohoz" type="button" onClick={() => void downloadProcessedInvoice(invoice.id).catch(fail)}>Download processed invoice PDF</button>
                    <button className="rounded-md px-4 py-2 text-sm font-semibold text-red-800" type="button" onClick={() => void remove()}>Delete</button>
                  </div>
                  {ocrText ? <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-shohoz-mist p-3 text-xs text-shohoz-body">{ocrText}</pre> : null}
                  {invoice.activities.length ? (
                    <ul className="mt-4 space-y-1 text-sm text-shohoz-body">
                      {invoice.activities.map((activity) => <li key={activity.id}>{activity.action}{activity.detail ? ` — ${activity.detail}` : ""}</li>)}
                    </ul>
                  ) : null}
                </form>
              ) : null}
            </div>
            <aside className="rounded-lg bg-white p-4 ring-1 ring-shohoz-line">
              <h3 className="text-sm font-semibold text-shohoz-ink">History</h3>
              {history.length === 0 ? <p className="mt-2 text-sm text-shohoz-muted">No invoices yet.</p> : (
                <ul className="mt-2 space-y-2">
                  {history.map((row) => (
                    <li key={row.id}>
                      <button type="button" className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-shohoz-mist" onClick={() => void openInvoice(row.id).catch(fail)}>
                        <span className="block font-medium text-shohoz-ink">{row.invoiceNumber || "Unnumbered"}</span>
                        <span className="text-shohoz-muted">{row.status.replaceAll("_", " ")} · {row.grandTotal || "—"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        ) : null}
      </Container>
    </section>
  );

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setDraft((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  function addItem() {
    setDraft((current) => ({ ...current, items: [...current.items, emptyWorkspaceItem()] }));
  }

  function removeItem(index: number) {
    setDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium text-shohoz-ink">{label}<input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function toDraft(invoice: Invoice): Draft {
  return {
    invoiceNumber: invoice.invoiceNumber ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    dueDate: invoice.dueDate ?? "",
    supplierName: invoice.supplierName ?? "",
    supplierAddress: invoice.supplierAddress ?? "",
    supplierPhone: invoice.supplierPhone ?? "",
    supplierTaxNumber: invoice.supplierTaxNumber ?? "",
    supplierId: invoice.supplierId ?? "",
    purchaseOrder: invoice.purchaseOrder ?? "",
    currency: invoice.currency ?? "",
    subtotal: invoice.subtotal ?? "",
    discount: invoice.discount ?? "",
    tax: invoice.tax ?? "",
    shipping: invoice.shipping ?? "",
    grandTotal: invoice.grandTotal ?? "",
    paymentStatus: invoice.paymentStatus ?? "",
    items: invoice.items.map(toItem),
  };
}

function toItem(item: InvoiceItem): DraftItem {
  return {
    ...emptyWorkspaceItem(),
    productId: item.productId ?? "",
    matchStatus: item.matchStatus,
    matchMethod: item.matchMethod,
    matchConfidence: item.matchConfidence,
    suggestions: item.suggestions ?? [],
    productName: item.productName ?? "",
    description: item.description ?? "",
    sku: item.sku ?? "",
    barcode: item.barcode ?? "",
    quantity: item.quantity ?? "",
    unit: item.unit ?? "",
    unitPrice: item.unitPrice ?? "",
    lineTotal: item.lineTotal ?? "",
    sourceText: item.sourceText ?? "",
    reviewReasons: item.reviewReasons ?? [],
  };
}

let workspaceKey = 0;

function emptyWorkspaceItem(): DraftItem {
  workspaceKey += 1;
  return {
    rowKey: `workspace-line-${workspaceKey}`,
    productId: "",
    productName: "",
    description: "",
    sku: "",
    barcode: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
    matchStatus: null,
    matchMethod: null,
    matchConfidence: null,
    suggestions: [],
    sourceText: "",
    reviewReasons: [],
  };
}

function text(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function safeOrigin(): string | null {
  try {
    return apiOrigin();
  } catch {
    return null;
  }
}

const fieldClass = "mt-1 w-full rounded-md border border-shohoz-line bg-white px-2 py-1.5 text-sm text-shohoz-ink";
