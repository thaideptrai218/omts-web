import "server-only";
import { z } from "zod";
import * as k from "@/features/lot-tracing/correction-contracts";
import type { OperationPlan } from "./operation-plan";

export const lotTracingUploadActions = ["log-trace-correct", "lot-trace-correct"] as const;

/**
 * Sửa nhật ký nuôi và sửa lô thu hoạch của một chu kỳ đã đóng là PUT multipart ở backend (TRACE-03.1, TRACE-03.2).
 * Trả về kế hoạch, bộ kiểm tra phần payload JSON và tên trường tệp ("photos"); undefined nếu hành động lạ.
 * Quyền Correct = PROVENANCE Edit. Tổng ảnh giữ lại và ảnh mới phải từ 1 đến 10 với nhật ký, tối đa 10 với lô.
 */
export function lotTracingUpload(action: string, id: string) {
  if (!z.guid().safeParse(id).success) return;
  if (action === "log-trace-correct") {
    const plan: OperationPlan = { area: "lot-tracing", action, path: `/api/cultivation-logs/${id}/trace-correction`, method: "PUT", permission: "Correct", schema: k.logCorrected };
    return { plan, validator: k.logSavePayload, minPhotos: 1, maxPhotos: 10, fileField: "photos" };
  }
  if (action === "lot-trace-correct") {
    const plan: OperationPlan = { area: "lot-tracing", action, path: `/api/harvest-lots/${id}/trace-correction`, method: "PUT", permission: "Correct", schema: k.corrected };
    return { plan, validator: k.lotSavePayload, minPhotos: 0, maxPhotos: 10, fileField: "photos" };
  }
}
