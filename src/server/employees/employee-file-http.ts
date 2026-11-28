import "server-only";
import { employeeFileMime, employeeImportMaxBytes, employeePhotoMaxBytes } from "@/features/employee-api/employee-file-contract";
import type { createCsrfGuard } from "../auth/csrf-guard";
import { readBoundedBytes } from "../operations/bounded-body";

type Guard = Extract<ReturnType<typeof createCsrfGuard>, { status: "available" }>["guard"];
// The multipart envelope adds boundaries and part headers around the file.
const envelopeBytes = 64 * 1024;
const maxExportBytes = 32 * 1024 * 1024;

export const isEmployeeUpload = (request: Request) =>
  request.method === "POST" && /^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") ?? "");

export type EmployeeUpload = { status: "ok"; form: FormData } | { status: "rejected"; httpStatus: number } | { status: "invalid" };

/** Returns the file to forward (under a fixed name) or undefined to refuse; `head` is the first bytes of the upload. */
type Accept = (entry: File, head: Uint8Array) => Promise<File | undefined>;

/**
 * Reads one uploaded file: same-origin CSRF headers first (nothing is consumed on failure), then a bounded body, exactly one
 * `file` part of at least 4 and at most `maxBytes` bytes, and whatever `accept` checks (signature). The browser's file name is
 * never forwarded. File contents are never logged or echoed.
 */
async function readUpload(request: Request, guard: Guard, maxBytes: number, accept: Accept): Promise<EmployeeUpload> {
  const headers = guard.checkHeaders(request, "POST");
  if (headers.status !== "allowed") return { status: "rejected", httpStatus: headers.status === "rejected" ? headers.httpStatus : 503 };
  if (request.headers.has("content-encoding")) return { status: "invalid" };
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > maxBytes + envelopeBytes)) return { status: "invalid" };
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, maxBytes + envelopeBytes, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const entry = form.get("file");
    if (!(entry instanceof File) || [...form.keys()].length !== 1 || entry.size < 4 || entry.size > maxBytes) return { status: "invalid" };
    const forwarded = await accept(entry, new Uint8Array(await entry.slice(0, 8).arrayBuffer()));
    if (!forwarded) return { status: "invalid" };
    const upstream = new FormData();
    upstream.append("file", forwarded, forwarded.name);
    return { status: "ok", form: upstream };
  } catch { return { status: "invalid" }; }
}

/** The import workbook: an .xlsx name and the zip signature, at most 2 MB. */
export const readEmployeeImportUpload = (request: Request, guard: Guard) => readUpload(request, guard, employeeImportMaxBytes, async (entry, head) =>
  /\.xlsx$/i.test(entry.name) && head[0] === 0x50 && head[1] === 0x4b ? new File([await entry.arrayBuffer()], "employees-import.xlsx", { type: employeeFileMime }) : undefined);

/** The photo: a JPEG or PNG by its signature (not by the type the browser claims), at most 2 MB. */
export const readEmployeePhotoUpload = (request: Request, guard: Guard) => readUpload(request, guard, employeePhotoMaxBytes, async (entry, head) => {
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47, jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!png && !jpeg) return undefined;
  return new File([await entry.arrayBuffer()], png ? "photo.png" : "photo.jpg", { type: png ? "image/png" : "image/jpeg" });
});

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
