import { supplierDocumentsSchema } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { SupplierDocuments } from "./contracts";
export async function supplierDocuments(id: string, files?: File[], signal?: AbortSignal): Promise<WorkspaceResult<SupplierDocuments>> {
  try {
    let form: FormData | undefined;
    if (files) { form = new FormData(); form.set("payload", "{}"); files.forEach((file) => form!.append("files", file, file.name)); }
    const response = await fetch(`/api/supplier-documents?id=${encodeURIComponent(id)}`, { method: form ? "POST" : "GET", body: form, credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(60_000), headers: form ? { "X-OMTS-Request": "web" } : {} });
    const result = await response.json();
    if (response.status === 200 && result.status === "success") { const value = supplierDocumentsSchema.safeParse(result.data); if (value.success) return { status: "success", data: value.data }; }
    return { status: "error", code: result.code, httpStatus: response.status, uncertain: !!files && (response.status >= 500 || response.ok || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: !!files }; }
}
