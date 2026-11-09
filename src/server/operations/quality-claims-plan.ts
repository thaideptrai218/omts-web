import "server-only";
import { z } from "zod";
import * as c from "@/features/quality-claims/claim-contracts";
import type { OperationPlan } from "./operation-plan";

const id = z.guid();
const page = z.string().regex(/^[1-9]\d{0,6}$/), pageSize = z.string().regex(/^[1-9]\d{0,2}$/).refine((v) => Number(v) <= 100);
const index = z.string().regex(/^\d{1,2}$/).refine((v) => Number(v) < c.MAX_PHOTOS);
const traderRead = z.strictObject({ action: z.enum(["mine", "mine-detail", "photo"]), id: id.optional(), index: index.optional(), page: page.optional(), pageSize: pageSize.optional() });
const staffRead = z.strictObject({
  action: z.enum(["list", "detail", "photo"]), id: id.optional(), index: index.optional(), page: page.optional(), pageSize: pageSize.optional(),
  statusId: z.enum(["3701", "3702", "3703"]).optional(),
});
const staffWrite = z.strictObject({ action: z.enum(["accept", "reject"]), id, zoneId: z.undefined().optional(), body: z.unknown().default({}) });
const noDuplicateKeys = (query: URLSearchParams) => [...query.keys()].length === new Set(query.keys()).size;

/**
 * Kế hoạch gọi backend cho Báo vấn đề chất lượng của thương lái (CLAIM-01), phần JSON: danh sách báo cáo của tôi, một báo cáo, ảnh.
 * Gửi báo cáo là multipart nên đi qua claim-upload-plan.ts.
 * Quyền (plan.permission): "Mine" = chỉ tài khoản thương lái (backend [RequireTrader], dữ liệu của chính họ; hóa đơn/báo cáo của người khác trả 404).
 */
export function claimReportsPlan(method: string, query: URLSearchParams, _input?: unknown): OperationPlan | undefined {
  void _input;
  if (method !== "GET" || !noDuplicateKeys(query)) return;
  const parsed = traderRead.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, id: claimId, index: photoIndex, page: p, pageSize: size } = parsed.data;
  const base = { area: "claim-reports" as const, action, method: "GET" as const, permission: "Mine" };
  if (action === "mine" && !claimId && photoIndex === undefined) return { ...base, path: `/api/me/quality-claims?page=${p ?? 1}&pageSize=${size ?? 20}`, schema: c.claimsPage };
  if (!claimId || p || size) return;
  const path = `/api/me/quality-claims/${claimId}`;
  if (action === "mine-detail" && photoIndex === undefined) return { ...base, path, schema: c.traderClaim, expectedId: claimId };
  if (action === "photo" && photoIndex !== undefined) return { ...base, path, schema: c.traderClaim, expectedId: claimId, file: "photo", index: Number(photoIndex) };
}

/**
 * Kế hoạch gọi backend cho Khiếu nại chất lượng (CLAIM-02): danh sách, chi tiết, ảnh, chấp nhận, từ chối.
 * Quyền (plan.permission): "View" = QUALITY_CLAIMS View (Chủ HTX và Quản lý vùng, chỉ vùng của mình; Kế toán không có quyền);
 * "Respond" = chỉ Chủ HTX (backend [RequireCooperativeOwner]). Phản hồi chỉ được một lần khi khiếu nại còn Chờ phản hồi.
 */
export function qualityClaimsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (!noDuplicateKeys(query)) return;
  const area = "quality-claims" as const;
  if (method === "GET") {
    const parsed = staffRead.safeParse(Object.fromEntries(query));
    if (!parsed.success) return;
    const { action, id: claimId, index: photoIndex, page: p, pageSize: size, statusId } = parsed.data;
    const base = { area, action, method: "GET" as const, permission: "View" };
    if (action === "list" && !claimId && photoIndex === undefined) {
      const filter = new URLSearchParams({ page: p ?? "1", pageSize: size ?? "20" });
      if (statusId) filter.set("statusId", statusId);
      return { ...base, path: `/api/quality-claims?${filter}`, schema: c.claimsPage };
    }
    if (!claimId || p || size || statusId) return;
    const path = `/api/quality-claims/${claimId}`;
    if (action === "detail" && photoIndex === undefined) return { ...base, path, schema: c.staffClaim, expectedId: claimId };
    if (action === "photo" && photoIndex !== undefined) return { ...base, path, schema: c.staffClaim, expectedId: claimId, file: "photo", index: Number(photoIndex) };
    return;
  }
  const parsed = staffWrite.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: claimId, body } = parsed.data;
  const values = (action === "accept" ? c.acceptBody : c.rejectBody).safeParse(body);
  return values.success ? { area, action, method: "POST", permission: "Respond", path: `/api/quality-claims/${claimId}/${action}`, schema: c.staffClaim, expectedId: claimId, body: values.data } : undefined;
}
