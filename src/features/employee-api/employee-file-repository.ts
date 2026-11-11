import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { suggestedFileName } from "@/features/operations/repository";
import { employeeFileMime, employeeImportResultSchema, type EmployeeImportResult } from "./employee-file-contract";

const endpoint = "/api/operations/employees";
type FileQuery = Record<string, string | undefined>;

/** `ids` is repeated (ids=a&ids=b); empty values are left out. */
function fileQuery(action: string, values: FileQuery, ids: readonly string[] = []) {
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(values)) if (value) query.set(key, value);
  for (const id of ids) query.append("ids", id);
  return query;
}

/** Streams a workbook to the browser: the name comes from the BFF's Content-Disposition. */
async function download(action: "export" | "import-template", values: FileQuery, ids: readonly string[], fallbackName: string): Promise<WorkspaceResult<true>> {
  try {
    const response = await bffFetch(`${endpoint}?${fileQuery(action, values, ids)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      const value = await response.json().catch(() => ({}));
      return { status: "error", httpStatus: response.status, code: typeof value.code === "string" ? value.code : undefined, uncertain: false };
    }
    if (!response.headers.get("content-type")?.startsWith(employeeFileMime)) return { status: "error", httpStatus: 502, uncertain: false };
    const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
    link.href = url; link.download = suggestedFileName(response.headers.get("content-disposition")) ?? fallbackName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { status: "success", data: true };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}

/** Multipart upload of the import workbook; the answer lists the rows that were skipped. */
async function upload(file: File): Promise<WorkspaceResult<EmployeeImportResult>> {
  try {
    const form = new FormData();
    form.append("file", file, file.name);
    const response = await bffFetch(`${endpoint}?action=import`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", headers: { "X-OMTS-Request": "web" }, body: form, signal: AbortSignal.timeout(60_000) });
    const value = await response.json();
    const parsed = employeeImportResultSchema.safeParse(value.data);
    if (response.ok && value.status === "success" && parsed.success) return { status: "success", data: parsed.data };
    // A write whose answer is unknown must never be replayed blindly: the user reloads the list first.
    return { status: "error", httpStatus: response.status, code: typeof value.code === "string" ? value.code : undefined, uncertain: response.status === 401 || response.status >= 500 || response.ok };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}

export const employeeFileRepository = {
  exportFile: (values: FileQuery, ids: readonly string[] = []) => download("export", values, ids, "employees.xlsx"),
  template: () => download("import-template", {}, [], "employees-import-template.xlsx"),
  importFile: upload,
};
