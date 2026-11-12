import { z } from "zod";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";

const fields: Record<string, string> = { Photos: "Ảnh", Survivors: "Số sống sót (ước tính)", Quantity: "Số mảnh", "Seed lot": "Lô giống", "Start date": "Ngày bắt đầu", "Completed on": "Ngày hoàn tất", Zone: "Vùng nuôi", Note: "Ghi chú", Reason: "Lý do" };
const reasons: Record<string, string> = {
  NURSERY_NOT_NURSING: "Đợt không còn ở trạng thái Đang ươm. Hãy tải lại để đối chiếu.",
  NURSERY_NOT_COMPLETED: "Chỉ sửa số sống sót hoặc đóng đợt khi đã ươm xong. Hãy tải lại đợt ươm.",
  NURSERY_SURVIVORS_BELOW_SEEDED: "Số sống sót (ước tính) không được nhỏ hơn tổng đã thả.",
  NURSERY_ALREADY_CLOSED: "Đợt ươm đã đóng. Hãy tải lại để đối chiếu.",
  NURSERY_NOTHING_TO_CLOSE: "Kho ươm không còn mảnh để đóng đợt. Hãy tải lại để đối chiếu.",
};
const problemSchema = z.object({ field: z.string().optional(), fields: z.array(z.string()).optional(), hint: z.string().optional(), message: z.string().optional(), reasonCode: z.string().optional() });
export function nurseryProblemText(value: unknown, code?: string) {
  const problem = problemSchema.safeParse(value);
  if (!problem.success) return undefined;
  const p = problem.data, label = [...(p.fields ?? []), ...(p.field ? [p.field] : [])].map(field => fields[field] ?? (/[À-ỹ]/.test(field) ? field : "Dữ liệu nhập")).join(", ");
  const message = p.reasonCode && reasons[p.reasonCode] || (code === "MSG-INPUT-01" ? "Tồn kho đã thay đổi hoặc không đủ số mảnh. Hãy đối chiếu lại lô giống." : p.hint || (p.message && /[À-ỹ]/.test(p.message) ? p.message : undefined));
  return message ? `${label ? `${label}: ` : ""}${message}` : label ? `${label}: dữ liệu không hợp lệ. Hãy kiểm tra lại.` : undefined;
}
async function send<T>(action: string, query: Record<string, string>, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const form = body instanceof FormData;
    const response = await bffFetch(`/api/nursery?${new URLSearchParams({ ...query, action })}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", redirect: "error", cache: "no-store",
      signal: signal ?? AbortSignal.timeout(60_000), headers: { Accept: "application/json", ...(body === undefined ? {} : { "X-OMTS-Request": "web", ...(form ? {} : { "Content-Type": "application/json" }) }) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body) });
    const result = await response.json(), parsed = schema.safeParse(result.data);
    if (response.ok && result.status === "success" && parsed.success) return { status: "success", data: parsed.data };
    return { status: "error", httpStatus: response.status, code: result.code, uncertain: body !== undefined && (response.ok || response.status >= 500 || response.status === 401),
      nurseryMessage: nurseryProblemText(result.problem, result.code) } as WorkspaceResult<T>;
  } catch { return { status: "error", httpStatus: 0, uncertain: body !== undefined }; }
}
export const nurseryRepository = { read: <T>(action: string, query: Record<string, string>, schema: z.ZodType<T>, signal?: AbortSignal) => send(action, query, schema, undefined, signal),
  write: <T>(action: string, query: Record<string, string>, body: unknown, schema: z.ZodType<T>) => send(action, query, schema, body) };
