import Link from "next/link";
import { cycleJourneyLink, farmingStepLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { quantityText, type NurseryDetail } from "./contracts";

export function NurseryUsage({ batch }: { batch: NurseryDetail }) {
  return <section aria-label="Đang dùng cho các bè" className="mt-4 border-t border-border pt-3">
    <h4 className="mb-2 text-sm font-semibold">Đang dùng cho các bè</h4>
    {!batch.usage.length ? <p className="text-sm text-text-muted">Chưa có bè lấy giống từ đợt ươm này.</p>
      : <ul aria-label="Các bè dùng giống" className="divide-y divide-border text-sm">{batch.usage.map(row => {
        const reference = { zoneId: batch.zoneId, raftId: row.raftId, cycleId: row.cycleId };
        return <li key={`${row.cycleId}-${row.raftId}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <p><Link className="font-medium text-primary underline" href={farmingReferenceHref("raft", { zoneId: batch.zoneId, recordId: row.raftId })}>{row.raftCode}</Link>
            {` · Đã thả ${quantityText(row.seeded)}`}
            <span className="text-xs text-text-muted">{` · Lần thả gần nhất: ${row.lastSeedingOn ? formatVietnameseDate(row.lastSeedingOn) : "—"}`}</span>
          </p>
          <div className="flex shrink-0 gap-3 text-xs text-primary underline">
            <Link href={cycleJourneyLink(reference)!}>Hành trình{row.cycleCode ? ` ${row.cycleCode}` : ""}</Link>
            <Link href={farmingStepLink("seeding", reference)}>Thả giống</Link>
          </div>
        </li>;
      })}</ul>}
  </section>;
}
