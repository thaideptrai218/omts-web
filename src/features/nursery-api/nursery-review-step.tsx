import { estimatedLoss } from "./nursery-inventory";
import { quantityText, type NurseryDetail } from "./contracts";
import { NurseryReviewTable } from "./nursery-review-table";
import { formatVietnameseDate } from "@/shared/format/date-only";

export function NurseryReviewStep({ batch, mode, survivors, completedOn, photoCount, reason }: {
  batch: NurseryDetail; mode: "complete" | "survivors"; survivors: number;
  completedOn: string; photoCount: number; reason: string;
}) {
  const loss = estimatedLoss(batch.quantityIn, survivors);
  return <section aria-label="Xem lại" className="min-w-0 space-y-3">
    <NurseryReviewTable rows={[["Vào ươm", quantityText(batch.quantityIn)],
      ...(mode === "survivors" ? [["Sống sót cũ → mới (ước tính)", `${quantityText(batch.survivors)} → ${quantityText(survivors)}`] as const] : [["Sống sót (ước tính)", quantityText(survivors)] as const]),
      ["Hao hụt (ước tính)", `${quantityText(loss.lossPieces)} · ${loss.lossPercent.toLocaleString("vi-VN")}%`],
      ...(mode === "complete" ? [["Ngày hoàn tất", formatVietnameseDate(completedOn)] as const, ["Ảnh hiện trường", `${photoCount} ảnh`] as const] : [["Đã thả", quantityText(batch.seeded)] as const, ["Lý do điều chỉnh", reason] as const])]} />
    {survivors === 0 && <p className="text-sm font-medium">Đợt ươm sẽ không còn mảnh để thả.</p>}
  </section>;
}
