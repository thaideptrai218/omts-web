import type { AllocationInput, NurseryDetail } from "./contracts";
import { quantityText } from "./contracts";
import { allocationDifference } from "./allocation-calculations";
import { nurseryDraftNumber } from "./nursery-allocation-draft";

export function validateSurvivors(batch: NurseryDetail, survivorsText: string): string | undefined {
  const survivors = nurseryDraftNumber(survivorsText);
  if (!survivorsText.trim() || !Number.isFinite(survivors) || survivors < 0 || survivors > batch.quantityIn) return `Sống sót (ước tính): nhập từ 0 đến ${quantityText(batch.quantityIn)}.`;
  if (survivors < batch.allocations.reduce((sum, item) => sum + item.seeded, 0)) return "Số sống sót (ước tính) không được nhỏ hơn số đã thả.";
}

const validPrecision = (value: number) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;

export function validateCompletion(batch: NurseryDetail, survivorsText: string, allocations: AllocationInput[]): string | undefined {
  const resultError = validateSurvivors(batch, survivorsText);
  if (resultError) return resultError;
  const survivors = nurseryDraftNumber(survivorsText);
  if (survivors > 0 && !allocations.length) return "Chọn ít nhất một bè cùng vùng để chuyển số mảnh sống sót (ước tính) sang nuôi.";
  if (new Set(allocations.map(item => item.raftId)).size !== allocations.length) return "Mỗi bè chỉ được chọn một lần.";
  if (allocations.some(item => !validPrecision(item.quantity) || item.quantity <= 0)) return "Số mảnh chuyển sang bè: nhập số lớn hơn 0, tối đa 2 chữ số thập phân cho mỗi bè.";
  if (allocations.some(item => item.targetYieldKg != null && (!validPrecision(item.targetYieldKg) || item.targetYieldKg <= 0))) return "Sản lượng dự kiến: nhập số kg lớn hơn 0, tối đa 2 chữ số thập phân hoặc bỏ trống.";
  const difference = allocationDifference(survivors, allocations);
  if (difference) return `Số mảnh chuyển sang bè ${difference > 0 ? "còn thiếu" : "đang thừa"} ${quantityText(Math.abs(difference))}. Tổng đã chuyển phải bằng số sống sót (ước tính).`;
  for (const old of batch.allocations) {
    const next = allocations.find(item => item.raftId === old.raftId);
    if (!old.canChange && (!next || next.quantity !== old.quantity || next.targetYieldKg !== (old.targetYieldKg ?? undefined))) return `Bè ${old.raftCode}: đã kết thúc nuôi, giữ nguyên số mảnh đã chuyển và sản lượng dự kiến.`;
    if ((next?.quantity ?? 0) < old.seeded) return `Bè ${old.raftCode}: không được giảm dưới ${quantityText(old.seeded)} đã thả.`;
  }
}

export function validateCompletionResult(batch: NurseryDetail, survivors: string, completedOn: string, photoCount: number, today: string): string | undefined {
  return validateSurvivors(batch, survivors)
    ?? (!/^\d{4}-\d{2}-\d{2}$/.test(completedOn) || completedOn < batch.startDate || completedOn > today ? "Ngày hoàn tất: chọn từ ngày bắt đầu đến hôm nay." : undefined)
    ?? (photoCount < 1 || photoCount > 3 ? "Ảnh: cần từ 1 đến 3 ảnh hoàn tất ươm." : undefined);
}
