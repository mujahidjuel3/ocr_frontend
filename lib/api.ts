import { ApiError, apiBaseUrl, errorMessage } from "./api-core";
import { clearAccessToken, readAccessToken } from "./auth/session";
import { filenameFromDisposition } from "./download";
import { uploadLanguage } from "./ocr-language";

export { ApiError };

export type AuthUser = { id: string; email: string; name: string; tenantId: string; tenantName: string };
export type AuthResponse = { accessToken: string; user: AuthUser };
export type MeResponse = { id: string; email: string; name: string; tenant: { id: string; name: string; slug: string } };
export type JobStatus = "queued" | "active" | "completed" | "failed";
export type InvoiceStatus = "uploaded" | "queued" | "processing" | "extracted" | "review_required" | "approved" | "failed";

export type Job = {
  id: string;
  invoiceId: string;
  status: JobStatus;
  attempts: number;
  error: string | null;
  durationMs?: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type InvoiceItem = {
  id: string;
  productName: string | null;
  sku: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  unitPrice: string | null;
  discount: string | null;
  tax: string | null;
  lineTotal: string | null;
  productId: string | null;
  matchStatus: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
  suggestions: Array<{ productId: string; name: string; method: string; confidence: number }>;
  barcode: string | null;
  batchNumber: string | null;
  expiresOn: string | null;
  genericName: string | null;
  sourceText: string | null;
  extractionConfidence: number | null;
  reviewReasons: string[];
};

export type Invoice = {
  id: string;
  status: InvoiceStatus;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  supplierName: string | null;
  supplierAddress: string | null;
  supplierPhone: string | null;
  supplierTaxNumber: string | null;
  supplierId: string | null;
  supplierMatch: string | null;
  duplicateOfId: string | null;
  duplicateReason: string | null;
  purchaseOrder: string | null;
  currency: string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  shipping: string | null;
  grandTotal: string | null;
  paymentStatus: string | null;
  ocrConfidence: string | null;
  ocrProvider: string | null;
  ocrLanguages: string[];
  ocrScripts: string[];
  ocrDirection: string | null;
  ocrWarnings: string[];
  ocrPages: unknown;
  ocrLanguageHint: string | null;
  missingFields: string[];
  uncertainFields: string[];
  totalsValid: boolean | null;
  fieldConfidence?: Record<string, number> | null;
  items: InvoiceItem[];
  job: { id: string; status: string; error: string | null } | null;
  activities: Array<{ id: string; action: string; detail: string | null; createdAt: string }>;
  createdAt: string;
};

export type InvoiceSummary = {
  total: number;
  processing: number;
  awaitingReview: number;
  approved: number;
  failed: number;
};

export type InvoiceQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type Supplier = { id: string; name: string; address: string | null; phone: string | null; taxNumber: string | null };
export type Product = { id: string; name: string; sku: string | null; unit: string | null };
export type Page<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let unauthorizedNotified = false;

/** Register a single handler for expired/invalid sessions. Avoids redirect loops by notifying once per clear. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
  unauthorizedNotified = false;
}

export function resetUnauthorizedLatch(): void {
  unauthorizedNotified = false;
}

export function apiOrigin(): string {
  return apiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

async function request<T>(path: string, init: RequestInit = {}, options: { auth?: boolean } = {}): Promise<T> {
  const requireAuth = options.auth !== false;
  const headers = new Headers(init.headers);
  const token = readAccessToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "The invoice service could not be reached. Check your connection and try again.");
  }

  if (response.status === 401) {
    // Only destroy a session when the backend rejected a credentialled request.
    if (requireAuth && token) notifyUnauthorized();
    throw new ApiError(401, errorMessage(await response.json().catch(() => null), "Authentication is required"));
  }

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(await response.json().catch(() => null), response.statusText || "Request failed"));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function notifyUnauthorized(): void {
  clearAccessToken("expired");
  if (unauthorizedNotified) return;
  unauthorizedNotified = true;
  onUnauthorized?.();
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, { auth: false });
}

export function register(input: { tenantName: string; name: string; email: string; password: string }): Promise<AuthResponse> {
  return request("/auth/register", { method: "POST", body: JSON.stringify(input) }, { auth: false });
}

export function me(): Promise<MeResponse> {
  return request("/auth/me");
}

export function invoiceSummary(): Promise<InvoiceSummary> {
  return request("/invoices/summary");
}

export function listInvoices(query: InvoiceQuery = {}): Promise<Page<Invoice>> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return request(`/invoices?${params.toString()}`);
}

export function listJobs(query: { page?: number; pageSize?: number; status?: string } = {}): Promise<Page<Job>> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 8));
  if (query.status) params.set("status", query.status);
  return request(`/ocr/jobs?${params.toString()}`);
}

export function getOcrText(invoiceId: string): Promise<{ invoiceId: string; text: string | null }> {
  return request(`/invoices/${invoiceId}/ocr-text`);
}

export function getInvoice(invoiceId: string): Promise<Invoice> {
  return request(`/invoices/${invoiceId}`);
}

export function getJob(jobId: string): Promise<Job> {
  return request(`/ocr/jobs/${jobId}`);
}

export function updateInvoice(invoiceId: string, body: unknown): Promise<Invoice> {
  return request(`/invoices/${invoiceId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function approveInvoice(invoiceId: string): Promise<Invoice & { pos: { connected: boolean; saved: boolean; message: string } }> {
  return request(`/invoices/${invoiceId}/approve`, { method: "POST" });
}

export function reprocessInvoice(invoiceId: string, language = ""): Promise<{ jobId: string; invoiceId: string; status: string }> {
  return request(`/invoices/${invoiceId}/reprocess`, { method: "POST", body: JSON.stringify({ language }) });
}

export function deleteInvoice(invoiceId: string): Promise<{ deleted: boolean }> {
  return request(`/invoices/${invoiceId}`, { method: "DELETE" });
}

export function listSuppliers(): Promise<Supplier[]> {
  return request("/suppliers");
}

export function createSupplier(body: { name: string; phone?: string; taxNumber?: string }): Promise<Supplier> {
  return request("/suppliers", { method: "POST", body: JSON.stringify(body) });
}

export function listProducts(): Promise<Product[]> {
  return request("/products");
}

export function createProduct(body: { name: string; sku?: string; unit?: string }): Promise<Product> {
  return request("/products", { method: "POST", body: JSON.stringify(body) });
}

export function uploadInvoice(file: File, onProgress: (percent: number) => void, language = ""): Promise<{ jobId: string; invoiceId: string; status: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const selected = uploadLanguage(language);
    if (selected) form.append("language", selected);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiOrigin()}/ocr/jobs`);
    const token = readAccessToken();
    if (token) xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, "The invoice service could not be reached. Check your connection and try again."));
    xhr.onload = () => {
      const body = parseJson(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as { jobId: string; invoiceId: string; status: string });
        return;
      }
      if (xhr.status === 401 && token) notifyUnauthorized();
      reject(new ApiError(xhr.status, errorMessage(body, "Upload failed")));
    };
    xhr.send(form);
  });
}

export async function watchJob(jobId: string, onUpdate: (job: Job) => void, signal: AbortSignal): Promise<Job> {
  while (!signal.aborted) {
    const job = await getJob(jobId);
    onUpdate(job);
    if (job.status === "completed" || job.status === "failed") return job;
    await wait(2000, signal);
  }
  throw new DOMException("Aborted", "AbortError");
}

export async function previewDocument(invoiceId: string): Promise<{ url: string; mimeType: string }> {
  const headers = new Headers();
  const token = readAccessToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/invoices/${invoiceId}/document`, { headers });
  } catch {
    throw new ApiError(0, "The invoice service could not be reached. Check your connection and try again.");
  }
  if (response.status === 401 && token) notifyUnauthorized();
  if (!response.ok) throw new ApiError(response.status, errorMessage(await response.json().catch(() => null), "The document could not be opened"));
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), mimeType: blob.type || "application/octet-stream" };
}

export async function downloadDocument(invoiceId: string): Promise<void> {
  await downloadBinary(`/invoices/${invoiceId}/document`, `invoice-${invoiceId}`);
}

export async function downloadProcessedInvoice(invoiceId: string): Promise<void> {
  await downloadBinary(`/invoices/${invoiceId}/processed.pdf`, `invoice-${invoiceId}.pdf`);
}

async function downloadBinary(path: string, fallbackName: string): Promise<void> {
  const headers = new Headers();
  const token = readAccessToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, { headers });
  } catch {
    throw new ApiError(0, "The invoice service could not be reached. Check your connection and try again.");
  }
  if (response.status === 401 && token) notifyUnauthorized();
  if (!response.ok) throw new ApiError(response.status, errorMessage(await response.json().catch(() => null), "Download failed"));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFromDisposition(response.headers.get("content-disposition"), fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
