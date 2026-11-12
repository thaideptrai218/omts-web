import type { AllocationInput, NurseryDetail } from "./contracts";
import { quantityText } from "./contracts";
import { allocationDifference } from "./allocation-calculations";

export function validateCompletion(batch: NurseryDetail, survivorsText: string, allocations: AllocationInput[]) {
  const survivors = Number(survivorsText);
  if (!survivorsText || !Number.isFinite(survivors) || survivors < 0 || survivors > batch.quantityIn) return `Số sống sót (ước tính): nhập từ 0 đến ${quantityText(batch.quantityIn)}.`;
  if (survivors < batch.allocations.reduce((sum, item) => sum + item.seeded, 0)) return "Số sống sót (ước tính) không được nhỏ hơn số đã thả.";
  if (allocations.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0)) return "Phân bổ: số mảnh cho mỗi bè phải lớn hơn 0.";
  if (allocations.some(item => item.targetYieldKg != null && (!Number.isFinite(item.targetYieldKg) || item.targetYieldKg <= 0))) return "Sản lượng dự kiến: nhập số kg lớn hơn 0 hoặc bỏ trống.";
  const difference = allocationDifference(survivors, allocations);
  if (difference) return `Phân bổ ${difference > 0 ? "thiếu" : "thừa"} ${quantityText(Math.abs(difference))}. Tổng phân bổ phải bằng số sống sót (ước tính).`;
  for (const old of batch.allocations) {
    const next = allocations.find(item => item.raftId === old.raftId);
    if (!old.canChange && (!next || next.quantity !== old.quantity || next.targetYieldKg !== (old.targetYieldKg ?? undefined))) return `Bè ${old.raftCode}: chu kỳ đã chốt, giữ nguyên phân bổ.`;
    if ((next?.quantity ?? 0) < old.seeded) return `Bè ${old.raftCode}: không được giảm dưới ${quantityText(old.seeded)} đã thả.`;
  }
}
