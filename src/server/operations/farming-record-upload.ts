import "server-only";
import { z } from "zod";
import * as c from "@/features/cultivation-api/records-contracts";
import { cycle, cycleValues } from "@/features/cultivation-api/contracts";
import { cultivationLog, logValues, logCorrection } from "@/features/cultivation-api/logs-contracts";
import type { OperationArea } from "@/features/operations/permissions";
import type { OperationPlan } from "./operation-plan";
import { readOperationUpload } from "./bounded-body";

export const farmingRecordUploadActions = ["seeding-record", "seeding-correct", "harvest-record", "harvest-correct", "log-record", "log-correct", "cycle-start"] as const;
export function farmingRecordUpload(area: OperationArea, action: string, id?: string, zoneId?: string) {
  if (!id || !zoneId) return;
  const base = { area, action, zoneId };
  let plan: OperationPlan, validator: z.ZodType, requiredPhotos = false;
  if (area === "seeding" && ["seeding-record", "seeding-correct"].includes(action)) {
    const correcting = action === "seeding-correct";
    plan = { ...base, path: correcting ? `/api/seeding-records/${id}` : `/api/cultivation-cycles/${id}/seeding-records`, method: correcting ? "PUT" : "POST", permission: correcting ? "Edit" : "Create", schema: z.object({ record: c.seedingRecord }) };
    validator = correcting ? c.seedCorrection : c.seedValues; requiredPhotos = !correcting;
  } else if (area === "harvest" && ["harvest-record", "harvest-correct"].includes(action)) {
    const correcting = action === "harvest-correct";
    plan = { ...base, path: correcting ? `/api/harvest-lots/${id}` : `/api/rafts/${id}/harvest-lots`, method: correcting ? "PUT" : "POST", permission: correcting ? "Edit" : "Create", schema: correcting ? c.harvestCorrected : c.harvestSaved };
    validator = correcting ? c.harvestCorrection : c.harvestValues; requiredPhotos = !correcting;
  } else if (area === "cultivation-cycles" && ["log-record", "log-correct"].includes(action)) {
    const correcting = action === "log-correct";
    plan = { ...base, path: correcting ? `/api/cultivation-logs/${id}` : `/api/cultivation-cycles/${id}/cultivation-logs`, method: correcting ? "PUT" : "POST", permission: correcting ? "LogsEdit" : "LogsCreate", schema: z.object({ log: cultivationLog }) };
    validator = correcting ? logCorrection : logValues;
  } else if (area === "cultivation-cycles" && action === "cycle-start") {
    plan = { ...base, path: `/api/rafts/${id}/cultivation-cycles`, method: "POST", permission: "Create", schema: z.object({ cycle }).transform(value => value.cycle) };
    validator = cycleValues; requiredPhotos = true;
  } else return;
  return { plan, validator, requiredPhotos };
}

/** Arrays repeat, while lanePercents is one JSON string, as required by B2 model binding. */
export function appendFarmingFields(form: FormData, values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (key === "lanePercents") { form.append(key, JSON.stringify(value)); continue; }
    for (const part of Array.isArray(value) ? value : [value]) form.append(key, String(part));
  }
}
export async function farmingRecordPayload(request: Request, target: NonNullable<ReturnType<typeof farmingRecordUpload>>) {
  const input = await readOperationUpload(request, false, { optionalFile: true, maxFiles: 3, maxBytes: 31 * 1024 * 1024 });
  if (!input) return { error: "Photos", hint: "Chọn tối đa 3 ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB." } as const;
  const values = target.validator.safeParse(input.payload);
  if (!values.success) return { error: values.error.issues.some(issue => issue.path[0] === "lanePercents") ? "LanePercent" : "Fields", hint: "Kiểm tra lại các trường đã nhập." } as const;
  const fields = values.data as Record<string, unknown>;
  const kept = Array.isArray(fields.keepPhotoIds) ? fields.keepPhotoIds.length : Array.isArray(fields.keepPhotoKeys) ? fields.keepPhotoKeys.length : 0;
  if (input.files.some(file => !["image/jpeg", "image/png"].includes(file.type)) || kept + input.files.length > 3 || target.requiredPhotos && !input.files.length)
    return { error: "Photos", hint: `Đã chọn ${kept + input.files.length} ảnh; ${target.requiredPhotos ? "cần từ 1 đến 3" : "chỉ được tối đa 3"} ảnh JPEG/PNG.` } as const;
  const form = new FormData(); appendFarmingFields(form, fields);
  for (const file of input.files) form.append("photos", file, file.name);
  return { form };
}
