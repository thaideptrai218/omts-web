import { photoValidationMessage } from "@/components/form/photo-compression";
import { validateTargetYield } from "./cycle-model";

/** The form of "Bắt đầu chu kỳ nuôi": text values as typed (numbers keep the machine format of UnitField). */
export type CycleStartValues = { nurseryBatchId: string; productId: string; targetYieldKg: string; startDate: string; note: string };
export type CycleStartField = "nurseryBatchId" | "productId" | "targetYieldKg" | "startDate" | "photos";
export type CycleStartErrors = Partial<Record<CycleStartField, string>>;

export const emptyCycleStart = (today: string): CycleStartValues => ({ nurseryBatchId: "", productId: "", targetYieldKg: "", startDate: today, note: "" });

/** Required: a nursed batch, the farmed product, a yield above 0, a start date not after today and 1-3 plan photos. */
export function validateCycleStart(values: CycleStartValues, photoCount: number, today: string): CycleStartErrors {
  const errors: CycleStartErrors = {};
  if (!values.nurseryBatchId) errors.nurseryBatchId = "Chọn đợt ươm (loại giống đã ươm).";
  if (!values.productId) errors.productId = "Chọn loại hàu nuôi (sản phẩm bán).";
  const yieldError = validateTargetYield(values.targetYieldKg, true);
  if (yieldError) errors.targetYieldKg = yieldError;
  if (!values.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  else if (values.startDate > today) errors.startDate = "Ngày bắt đầu không được sau hôm nay.";
  const photos = photoValidationMessage(photoCount, true);
  if (photos) errors.photos = photos;
  return errors;
}

/** Multipart body of the start: `writeCycle` adds the raft (`id`) and the action; the batch is the only seed source of the cycle. */
export function cycleStartForm(values: CycleStartValues, photos: readonly File[]): FormData {
  const form = new FormData();
  form.set("nurseryBatchId", values.nurseryBatchId);
  form.set("productId", values.productId);
  form.set("startDate", values.startDate);
  form.set("targetYieldKg", String(Number(values.targetYieldKg.replace(",", "."))));
  if (values.note.trim()) form.set("note", values.note.trim());
  photos.forEach(photo => form.append("photos", photo, photo.name));
  return form;
}

type StartFailure = { code?: string; problem?: { field?: string; fields?: string[]; code?: string; reasonCode?: string; hint?: string } };
const fieldOf: Record<string, CycleStartField> = { nurserybatchid: "nurseryBatchId", "nursery batch": "nurseryBatchId", productid: "productId", product: "productId", targetyieldkg: "targetYieldKg", "target yield": "targetYieldKg", "target yield kg": "targetYieldKg", startdate: "startDate", "start date": "startDate", photos: "photos" };
/** 409 MSG-GEN-09 reasons about the batch (backend contract 0.7) and MSG-GEN-06, the answer for a raft that already has an open cycle. */
const batchReasons = /^NURSERY_(NOT_COMPLETED|NOT_NURSING|RAFT_OTHER_ZONE|POOL_EMPTY)$/;
const openCycle = /^(MSG-GEN-06|NURSERY_RAFT_HAS_OPEN_CYCLE)$/;

/** Puts a refusal at the input it names (batch, yield, date, photos); `general` is what no input owns, such as a raft that already has an open cycle. */
export function cycleStartFailure(failure: StartFailure | undefined, fallback: string | undefined): { errors: CycleStartErrors; general?: string } {
  const problem = failure?.problem, reasons = [failure?.code, problem?.code, problem?.reasonCode].filter((value): value is string => !!value);
  const hint = problem?.hint && /[À-ỹ]/.test(problem.hint) ? problem.hint : undefined;
  if (reasons.some(reason => openCycle.test(reason))) return { errors: {}, general: "Bè này đã có chu kỳ đang mở. Hãy tải lại danh sách để đối chiếu." };
  const owners = [problem?.field, ...(problem?.fields ?? [])].map(field => field ? fieldOf[field.toLowerCase()] : undefined);
  const named: CycleStartField | undefined = owners.find((owner): owner is CycleStartField => !!owner) ?? (reasons.some(reason => batchReasons.test(reason)) ? "nurseryBatchId" : undefined);
  if (!named) return { errors: {}, general: fallback };
  const text = named === "photos" ? "Chọn từ 1 đến 3 ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB."
    : named === "nurseryBatchId" ? hint ?? "Đợt ươm này không còn dùng được (đã hết mảnh, đã đóng hoặc không cùng vùng với bè). Hãy chọn đợt khác."
    : named === "productId" ? hint ?? "Loại hàu nuôi này không dùng được. Hãy chọn loại khác trong danh mục sản phẩm đang dùng."
    : hint ?? fallback ?? "Giá trị chưa hợp lệ.";
  return { errors: { [named]: text } };
}
