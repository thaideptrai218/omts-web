import "server-only";
import { employeeFileMime, employeeImportMaxBytes } from "@/features/employee-api/employee-file-contract";
import type { createCsrfGuard } from "../auth/csrf-guard";
import { readBoundedBytes } from "../operations/bounded-body";

type Guard = Extract<ReturnType<typeof createCsrfGuard>, { status: "available" }>["guard"];
// The multipart envelope adds boundaries and part headers around the 2 MB file.
const envelopeBytes = 64 * 1024;
const maxExportBytes = 32 * 1024 * 1024;

export const isEmployeeImportUpload = (request: Request) =>
  request.method === "POST" && /^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") ?? "");

export type EmployeeUpload = { status: "ok"; form: FormData } | { status: "rejected"; httpStatus: number } | { status: "invalid" };

/**
 * Reads the import workbook: same-origin CSRF headers first (nothing is consumed on failure), then a bounded body, exactly one
 * `file` part, an .xlsx name, the zip signature and at most 2 MB. File contents are never logged or echoed.
 */
export async function readEmployeeImportUpload(request: Request, guard: Guard): Promise<EmployeeUpload> {
  const headers = guard.checkHeaders(request, "POST");
  if (headers.status !== "allowed") return { status: "rejected", httpStatus: headers.status === "rejected" ? headers.httpStatus : 503 };
  if (request.headers.has("content-encoding")) return { status: "invalid" };
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > employeeImportMaxBytes + envelopeBytes)) return { status: "invalid" };
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, employeeImportMaxBytes + envelopeBytes, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const entry = form.get("file");
    if (!(entry instanceof File) || [...form.keys()].length !== 1 || entry.size < 4 || entry.size > employeeImportMaxBytes || !/\.xlsx$/i.test(entry.name)) return { status: "invalid" };
    const head = new Uint8Array(await entry.slice(0, 2).arrayBuffer());
    if (head[0] !== 0x50 || head[1] !== 0x4b) return { status: "invalid" };
    // A fixed name: the browser's file name is neither needed by the backend nor worth forwarding.
    const upstream = new FormData();
    upstream.append("file", new File([await entry.arrayBuffer()], "employees-import.xlsx", { type: employeeFileMime }), "employees-import.xlsx");
    return { status: "ok", form: upstream };
  } catch { return { status: "invalid" }; }
}

/** The backend's own name when it is plain ASCII with .xlsx, otherwise a dated default. */
export function employeeFileName(disposition: string | null, action: "export" | "template", now = new Date()) {
  const named = /filename="?([A-Za-z0-9._-]{1,80}\.xlsx)"?/i.exec(disposition ?? "")?.[1];
  if (named) return named;
  return action === "template" ? "employees-import-template.xlsx" : `employees-${now.toISOString().slice(0, 10).replaceAll("-", "")}.xlsx`;
}

/** Reads a successful workbook answer, or undefined when it is not a workbook. */
export async function readEmployeeWorkbook(upstream: Response, signal: AbortSignal, timeoutMs: number) {
  if (upstream.headers.get("content-type")?.split(";")[0] !== employeeFileMime) return undefined;
  return readBoundedBytes(upstream.body, signal, maxExportBytes, timeoutMs);
}
