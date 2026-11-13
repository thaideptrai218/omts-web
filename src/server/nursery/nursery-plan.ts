import "server-only";
import { z } from "zod";
import { nurseryDetail, nurseryHistory, nurseryList, nurseryLots, nurserySaved } from "./nursery-response-schemas";

const guid = z.guid();
const quantity = z.number().finite().nonnegative().refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, "Chỉ nhập tối đa 2 chữ số thập phân.");
const positive = quantity.refine(value => value > 0, "Số lượng phải lớn hơn 0.");
const reason = z.string().trim().min(1).max(1000);
const rowVersion = z.string().min(1).max(200);
export const createValues = z.strictObject({ seedLotId: guid, quantity: positive, startDate: z.iso.date(), note: z.string().max(1000).optional() });
export const updateValues = z.strictObject({ quantity: positive.optional(), startDate: z.iso.date().optional(), note: z.string().max(1000).optional(), rowVersion,
  keepPhotoIds: z.array(guid).max(3).optional() });
// V2: completing a nursery only records survivors, date and photos; no raft allocation.
export const completeValues = z.strictObject({ survivors: quantity, completedOn: z.iso.date().optional(), rowVersion });
const cancelValues = z.strictObject({ reason, rowVersion });
const survivorsValues = z.strictObject({ survivors: quantity, reason, rowVersion });
const closeValues = z.strictObject({ reason: z.string().trim().max(1000).optional(), rowVersion });
const querySchema = z.strictObject({ action: z.enum(["list", "detail", "seed-lots", "history", "create", "update", "cancel", "complete", "survivors", "close", "photo"]),
  id: guid.optional(), zoneId: guid.optional(), status: z.enum(["all", "nursing", "completed", "closed", "cancelled"]).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(), search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().max(100000).optional(), pageSize: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(["code", "startDate", "quantityIn", "status"]).optional(), sortDir: z.enum(["asc", "desc"]).optional(),
  stage: z.enum(["start", "completion"]).optional(), photoId: guid.optional(),
});
export type NurseryPlan = { action: string; id?: string; zoneId?: string; method: "GET" | "POST" | "PUT"; path: string;
  permission: "View" | "Create" | "Edit"; schema: z.ZodType; validator?: z.ZodType; multipart?: boolean; stage?: "start" | "completion"; photoId?: string };
export function planNursery(method: string, query: URLSearchParams): NurseryPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  const result = querySchema.safeParse(Object.fromEntries(query));
  if (!result.success) return;
  const { action, id, zoneId, stage, photoId, ...filters } = result.data;
  const base = { action, id, zoneId, method: "GET" as const, permission: "View" as const };
  const basePath = "/api/nursery-batches";
  if (method === "GET" && action === "list" && !id && !stage && !photoId) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, zoneId })) if (value !== undefined) params.set(key, String(value));
    return { ...base, path: `${basePath}?${params}`, schema: nurseryList };
  }
  if (Object.values(filters).some(value => value !== undefined)) return;
  if (method === "GET" && action === "seed-lots" && zoneId && !id && !stage && !photoId) return { ...base, path: `${basePath}/seed-lots?zoneId=${zoneId}`, schema: nurseryLots };
  if (method === "POST" && action === "create" && zoneId && !id && !stage && !photoId) return { ...base, method: "POST", permission: "Create", path: `/api/zones/${zoneId}/nursery-batches`, schema: nurserySaved, validator: createValues, multipart: true };
  if (!id || !zoneId) return;
  if (method === "GET" && action === "photo" && photoId && stage) return { ...base, path: `${basePath}/${id}`, schema: nurseryDetail, stage, photoId };
  if (stage || photoId) return;
  if (method === "GET" && ["detail", "history"].includes(action)) return { ...base, path: `${basePath}/${id}${action === "history" ? "/history" : ""}`, schema: action === "history" ? nurseryHistory : nurseryDetail };
  if (method !== "POST") return;
  if (action === "update" || action === "complete") return { ...base, method: action === "update" ? "PUT" : "POST", permission: action === "complete" ? "Create" : "Edit",
    path: `${basePath}/${id}${action === "complete" ? "/complete" : ""}`, schema: nurserySaved, validator: action === "complete" ? completeValues : updateValues, multipart: true };
  const validators: Record<string, z.ZodType> = { cancel: cancelValues, survivors: survivorsValues, close: closeValues };
  if (validators[action]) return { ...base, method: "POST", permission: "Edit", path: `${basePath}/${id}/${action}`, schema: nurserySaved, validator: validators[action] };
}
