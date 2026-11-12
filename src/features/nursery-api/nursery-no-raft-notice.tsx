import Link from "next/link";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import type { NurseryDetail } from "./contracts";
import { formatVietnameseDate } from "@/shared/format/date-only";

export function NurseryNoRaftNotice({ batch, rafts }: {
  batch: Pick<NurseryDetail, "zoneId" | "zoneCode">; rafts: readonly CycleRow[];
}) {
  const busy = rafts.filter(row => row.cycle && !row.cycle.closeDate);
  const inactive = rafts.filter(row => row.raftStatusId !== 101);
  const codes = (rows: readonly CycleRow[]) => `${rows.slice(0, 5).map(row => row.raftCode).join(", ")}${rows.length > 5 ? ` và ${rows.length - 5} bè khác` : ""}`;
  return <div className="rounded-control border border-border bg-surface p-3 text-sm">
    <p>{!rafts.length ? `Vùng ${batch.zoneCode} chưa có bè nuôi để chuyển sang. Tạo bè mới cho vùng này.`
      : `Vùng ${batch.zoneCode} chưa có bè trống để chuyển sang. Bè đang nuôi chưa kết thúc sẽ không nhận thêm. Tạo bè mới cho vùng này hoặc kết thúc nuôi ở bè hiện có.`}</p>
    {!!busy.length && <ul className="mt-2 space-y-1 text-xs text-text-muted" aria-label="Bè đang bận">{busy.map(row => <li key={row.raftId} className="break-words">{row.raftCode} · đang nuôi từ {formatVietnameseDate(row.cycle!.startDate)}</li>)}</ul>}
    {!!inactive.length && <p className="mt-1 text-text-muted">Bè ngừng sử dụng: {codes(inactive)}.</p>}
    <Link className="mt-2 inline-flex min-h-9 items-center text-primary underline" href={`/farming/rafts?zoneId=${encodeURIComponent(batch.zoneId)}&create=1`} target="_blank" rel="noopener noreferrer">Tạo bè nuôi cho vùng này<span className="sr-only"> (mở trong thẻ mới)</span></Link>
  </div>;
}
