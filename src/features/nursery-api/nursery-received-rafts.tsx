import Link from "next/link";
import { cycleJourneyLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { quantityText, type NurseryDetail } from "./contracts";

export function NurseryReceivedRafts({ batch }: { batch: NurseryDetail }) {
  if (!batch.allocations.length) return <p className="text-sm text-text-muted">Chưa chuyển mảnh sang bè nuôi.</p>;
  return <ul aria-label="Bè đã nhận" className="divide-y divide-border text-sm">{batch.allocations.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
    <p><Link className="font-medium text-primary underline" href={farmingReferenceHref("raft", { zoneId: batch.zoneId, recordId: row.raftId })}>{row.raftCode}</Link>
      {` · ${quantityText(row.quantity)} · đã thả ${quantityText(row.seeded)}`}
      <span className="text-xs text-text-muted">{` · còn ${quantityText(row.remaining ?? row.quantity - row.seeded)}`}{row.targetYieldKg != null ? ` · dự kiến ${quantityText(row.targetYieldKg, "kg")}` : ""}</span>
    </p>
    <Link className="shrink-0 text-xs text-primary underline" href={cycleJourneyLink({ zoneId: batch.zoneId, raftId: row.raftId, cycleId: row.cycleId })!}>{row.canChange ? "Xem nuôi trên bè" : "Xem đợt nuôi đã kết thúc"}</Link>
  </li>)}</ul>;
}
