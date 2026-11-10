import "server-only";
import { z } from "zod";
import * as c from "@/features/quality-claims/claim-contracts";
import type { OperationPlan } from "./operation-plan";

export const claimUploadActions = ["claim-submit"] as const;

/**
 * Gửi báo cáo vấn đề chất lượng (CLAIM-01) là POST multipart ở backend: trường `description` và mỗi ảnh một phần tên `photos`
 * (1 đến 10 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB). `id` là mã hóa đơn của thương lái; hóa đơn của người khác trả 404.
 * Trả về kế hoạch, bộ kiểm tra phần payload JSON và tên trường tệp; undefined nếu hành động lạ hoặc mã hóa đơn sai.
 * Quyền (plan.permission) "Submit": chỉ tài khoản thương lái.
 */
export function claimUpload(action: string, id: string) {
  if (action !== "claim-submit" || !z.guid().safeParse(id).success) return;
  const plan: OperationPlan = { area: "claim-reports", action, path: `/api/me/sales-invoices/${id}/quality-claims`, method: "POST", permission: "Submit", schema: c.claimSaved };
  return { plan, validator: c.submitPayload, minPhotos: 1, maxPhotos: c.MAX_PHOTOS, fileField: "photos" };
}
