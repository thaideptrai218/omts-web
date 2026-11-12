import type { CycleRow } from "@/features/cycles-api/cycle-model";
import { estimatedLoss } from "./allocation-calculations";
import { quantityText, type AllocationInput, type NurseryDetail } from "./contracts";
import { NurseryReviewTable } from "./nursery-review-table";

export function NurseryReviewStep({ batch, mode, survivors, completedOn, photoCount, allocations, rafts, reason }: {
  batch: NurseryDetail; mode: "complete" | "survivors" | "allocations"; survivors: number;
  completedOn: string; photoCount: number; allocations: AllocationInput[]; rafts: readonly CycleRow[]; reason: string;
}) {
  const loss = estimatedLoss(batch.quantityIn, survivors);
  return <section aria-label="Xem lại" className="min-w-0 space-y-3">
    <NurseryReviewTable rows={[["Số mảnh vào ươm", quantityText(batch.quantityIn)],
      ...(mode === "survivors" ? [["Sống sót cũ → mới (ước tính)", `${quantityText(batch.survivors)} → ${quantityText(survivors)}`] as const] : [["Sống sót (ước tính)", quantityText(survivors)] as const]),
      ["Hao hụt (ước tính)", `${quantityText(loss.lossPieces)} · ${loss.lossPercent.toLocaleString("vi-VN")}%`],
      ...(mode === "complete" ? [["Ngày hoàn tất", completedOn.split("-").reverse().join("/")] as const, ["Ảnh hiện trường", `${photoCount} ảnh`] as const] : [["Lý do điều chỉnh", reason] as const])]} />
    {!!allocations.length && <div className="min-w-0"><h3 className="mb-2 text-sm font-semibold">Bè đã nhận</h3>
      <table className="w-full table-fixed text-left text-xs sm:text-sm"><thead><tr>{["Bè nuôi", "Số mảnh", "Sản lượng dự kiến (kg)"].map(label => <th key={label} scope="col" className="break-words border-b border-border p-2">{label}</th>)}</tr></thead>
        <tbody>{allocations.map(item => <tr key={item.raftId} className="border-b border-border">
          <th scope="row" className="break-words p-2 font-medium">{rafts.find(raft => raft.raftId === item.raftId)?.raftCode ?? batch.allocations.find(old => old.raftId === item.raftId)?.raftCode ?? "Bè nuôi"}</th>
          <td className="break-words p-2">{quantityText(item.quantity)}</td><td className="break-words p-2">{quantityText(item.targetYieldKg, "kg")}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {mode === "complete" && <p className="text-sm font-medium">{survivors === 0 ? "Hoàn tất đợt ươm, không có mảnh nào chuyển sang bè" : `Bắt đầu nuôi ở ${allocations.length} bè.`}</p>}
  </section>;
}
