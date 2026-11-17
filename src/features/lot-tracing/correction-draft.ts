import { logSavePayload, lotPreviewBody, seedingPreviewBody, type LogItem, type LotItem, type SeedingItem } from "./correction-contracts";
import { parseDecimal, parseNumberList } from "./trace-format";

/** Bản nháp sửa dữ liệu truy xuất: giữ chuỗi người dùng gõ, đổi thành thân yêu cầu đã kiểm tra hoặc nêu lỗi đầu tiên bằng tiếng Việt. */
export type Built<T> = { ok: true; value: T } | { ok: false; problem: string };
const fail = (problem: string): Built<never> => ({ ok: false, problem });
const needReason = "Hãy nhập lý do sửa.";
export const maxPhotos = 10;

export type SeedingDraft = { seedingDate: string; seedLotId: string; lanes: string; quantity: string; reason: string };
export const seedingDraftOf = (item: SeedingItem): SeedingDraft => ({ seedingDate: item.seedingDate, seedLotId: item.seedLot.id, lanes: item.laneNumbers.join(", "), quantity: String(item.quantity).replace(".", ","), reason: "" });

export function buildSeeding(draft: SeedingDraft): Built<ReturnType<typeof seedingPreviewBody.parse>> {
  const lanes = parseNumberList(draft.lanes), quantity = parseDecimal(draft.quantity);
  if (!draft.seedingDate) return fail("Hãy chọn ngày thả giống.");
  if (!draft.seedLotId) return fail("Hãy chọn lô giống.");
  if (!lanes?.length) return fail("Hãy nhập các làn bằng số, cách nhau bởi dấu phẩy.");
  if (!(quantity > 0)) return fail("Số lượng phải lớn hơn 0.");
  if (!draft.reason.trim()) return fail(needReason);
  const parsed = seedingPreviewBody.safeParse({ seedingDate: draft.seedingDate, seedLotId: draft.seedLotId, laneNumbers: lanes, quantity, reason: draft.reason });
  return parsed.success ? { ok: true, value: parsed.data } : fail("Các làn không được trùng nhau và lý do tối đa 1.000 ký tự.");
}

export type LotDraft = { lanes: string; finished: string; cageCount: string; estimatedKg: string; reason: string; keep: string[]; files: File[] };
export const lotDraftOf = (item: LotItem, keep: string[]): LotDraft => ({
  lanes: item.laneNumbers.join(", "), finished: item.finishedLaneNumbers.join(", "), cageCount: String(item.cageCount), estimatedKg: String(item.estimatedKg).replace(".", ","), reason: "", keep, files: [],
});
export function buildLot(draft: LotDraft): Built<ReturnType<typeof lotPreviewBody.parse>> {
  const lanes = parseNumberList(draft.lanes), finished = parseNumberList(draft.finished), cages = parseDecimal(draft.cageCount);
  const kg = draft.estimatedKg.trim() ? parseDecimal(draft.estimatedKg) : null;
  if (!lanes?.length) return fail("Hãy nhập các làn thu hoạch bằng số, cách nhau bởi dấu phẩy.");
  if (!finished) return fail("Làn đã thu xong chỉ gồm các số, cách nhau bởi dấu phẩy.");
  if (!finished.every((n) => lanes.includes(n))) return fail("Làn đã thu xong phải nằm trong các làn thu hoạch.");
  if (!Number.isInteger(cages) || cages <= 0) return fail("Số lồng phải là số nguyên lớn hơn 0.");
  if (kg !== null && !(kg > 0)) return fail("kg ước tính phải lớn hơn 0 hoặc để trống.");
  if (draft.keep.length + draft.files.length > maxPhotos) return fail(`Tối đa ${maxPhotos} ảnh cho mỗi lô.`);
  if (photoProblem(draft.files)) return fail(photoProblem(draft.files)!);
  if (!draft.reason.trim()) return fail(needReason);
  const parsed = lotPreviewBody.safeParse({ laneNumbers: lanes, finishedLaneNumbers: finished, cageCount: cages, estimatedKg: kg, keepPhotoKeys: draft.keep, reason: draft.reason });
  return parsed.success ? { ok: true, value: parsed.data } : fail("Các làn không được trùng nhau và lý do tối đa 1.000 ký tự.");
}

export type LogDraft = { visitDate: string; notes: string; reason: string; keep: string[]; files: File[] };
export const logDraftOf = (item: LogItem): LogDraft => ({ visitDate: item.visitDate, notes: item.notes ?? "", reason: "", keep: item.photos.map((p) => p.key), files: [] });
export function buildLog(draft: LogDraft): Built<Omit<ReturnType<typeof logSavePayload.parse>, "ownerApproved">> {
  if (!draft.visitDate) return fail("Hãy chọn ngày ghi nhật ký.");
  const photos = draft.keep.length + draft.files.length;
  if (photos < 1) return fail("Nhật ký cần ít nhất một ảnh.");
  if (photos > maxPhotos) return fail(`Tối đa ${maxPhotos} ảnh cho mỗi nhật ký.`);
  if (photoProblem(draft.files)) return fail(photoProblem(draft.files)!);
  if (!draft.reason.trim()) return fail(needReason);
  const parsed = logSavePayload.omit({ ownerApproved: true }).safeParse({ visitDate: draft.visitDate, notes: draft.notes.trim() || null, keepPhotoKeys: draft.keep, reason: draft.reason });
  return parsed.success ? { ok: true, value: parsed.data } : fail("Ghi chú tối đa 2.000 ký tự và lý do tối đa 1.000 ký tự.");
}

/** Ảnh mới chỉ nhận JPEG hoặc PNG dưới 10 MB (backend từ chối phần còn lại). */
export function photoProblem(files: readonly File[]) {
  return files.some((f) => !["image/jpeg", "image/png"].includes(f.type) || f.size > 10 * 1024 * 1024) ? "Ảnh phải là JPEG hoặc PNG, mỗi ảnh tối đa 10 MB." : undefined;
}
