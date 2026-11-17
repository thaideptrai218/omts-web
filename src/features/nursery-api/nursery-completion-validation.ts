import type { NurseryDetail } from "./contracts";
import { quantityText } from "./contracts";
import { nurseryDraftNumber } from "./nursery-inventory";

export function validateSurvivors(batch: NurseryDetail, survivorsText: string): string | undefined {
  const survivors = nurseryDraftNumber(survivorsText);
  if (!survivorsText.trim() || !Number.isFinite(survivors) || survivors < 0 || survivors > batch.quantityIn) return `Sống sót (ước tính): nhập từ 0 đến ${quantityText(batch.quantityIn)}.`;
  if (survivors < batch.seeded) return `Số sống sót (ước tính) không được thấp hơn ${quantityText(batch.seeded)} đã thả.`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCompletionResult(batch: NurseryDetail, survivors: string, completedOn: string, photoCount: number, today: string): string | undefined {
  return validateSurvivors(batch, survivors)
    ?? (!validDate(completedOn) || completedOn < batch.startDate || completedOn > today ? "Ngày hoàn tất: chọn từ ngày bắt đầu đến hôm nay." : undefined)
    ?? (photoCount < 1 || photoCount > 3 ? "Ảnh: cần từ 1 đến 3 ảnh hoàn tất ươm." : undefined);
}
