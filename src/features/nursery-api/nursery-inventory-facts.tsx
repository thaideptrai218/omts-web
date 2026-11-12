import { Facts } from "@/features/farming-management/detail-parts";
import { quantityText, type NurseryDetail } from "./contracts";

export function NurseryInventoryFacts({ batch }: { batch: NurseryDetail }) {
  const loss = batch.survivors == null ? null : Math.max(0, batch.quantityIn - batch.survivors) + (batch.closeLossPieces ?? 0);
  const lossPercent = loss == null || batch.quantityIn <= 0 ? null : loss / batch.quantityIn * 100;
  return <section aria-label="Kho ươm" className="mt-4 border-t border-border pt-3">
    <h4 className="mb-2 text-sm font-semibold">Kho ươm</h4>
    <Facts items={[["Vào ươm", quantityText(batch.quantityIn)], ["Sống sót (ước tính)", quantityText(batch.survivors)],
      ["Đã thả", quantityText(batch.seeded)], ["Còn lại", quantityText(batch.remaining)],
      ["Hao hụt (ước tính)", loss == null ? "—" : `${quantityText(loss)}${lossPercent == null ? "" : ` · ${lossPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}`],
      ...(batch.closeLossPieces == null ? [] : [["Hao hụt khi đóng (ước tính)", quantityText(batch.closeLossPieces)]] as const)]} />
  </section>;
}
