import { receiptHref, returnHref } from "@/features/input-items/stock-kind";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import type { SeedLotDetail } from "./contracts";

export type TimelineEntry = { key: string; at: string | null; title: string; detail: string; href?: string };
const qty = (value: number, unit: string) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value)} ${unit}`.trim();
const issueKinds: Record<string, string> = { Use: "Xuất dùng", Disposal: "Xuất hủy" };

/**
 * "Lịch sử" of a seed lot, made from what the API says happened to it: the receipt, each nursery batch, each seeding, each return and each issue, newest first.
 * An event with no time is put last: the lot is never shown with an invented date.
 */
export function seedLotTimeline(lot: SeedLotDetail): TimelineEntry[] {
  const unit = lot.unitName, entries: TimelineEntry[] = [
    { key: `receipt-${lot.receiptId}`, at: lot.receivedAt, title: "Nhập lô", detail: `Phiếu ${lot.receiptCode}: ${qty(lot.receivedQty, unit)}`, href: receiptHref(lot.receiptCode, "Seed") },
    ...lot.nurseryBatches.map((batch) => ({ key: `nursery-${batch.id}`, at: batch.startDate ?? null, title: "Bắt đầu ươm", detail: `Đợt ${batch.code}: ${qty(batch.quantityIn, unit)}`, href: farmingReferenceHref("nursery", { code: batch.code }) })),
    ...lot.seedings.map((seeding) => ({ key: `seeding-${seeding.id}`, at: seeding.seededAt ?? null, title: "Thả giống", detail: `${[seeding.raftCode && `Bè ${seeding.raftCode}`, seeding.zoneCode && `vùng ${seeding.zoneCode}`].filter(Boolean).join(", ") || "Bè"}: ${qty(seeding.quantity, unit)}` })),
    ...lot.returns.map((item) => ({ key: `return-${item.id}`, at: item.returnedAt ?? null, title: "Trả hàng nhà cung cấp", detail: `Phiếu ${item.code}: ${qty(item.quantity, unit)}`, href: returnHref(item.code, "Seed") })),
    ...lot.issues.map((item) => ({ key: `issue-${item.id}`, at: item.issuedAt ?? null, title: issueKinds[item.kind] ?? "Xuất kho", detail: `Phiếu ${item.code}: ${qty(item.quantity, unit)}` })),
  ];
  const time = (entry: TimelineEntry) => entry.at ? new Date(entry.at.length === 10 ? `${entry.at}T00:00:00+07:00` : entry.at).getTime() : Number.POSITIVE_INFINITY;
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => (Number.isFinite(time(a.entry)) ? 0 : 1) - (Number.isFinite(time(b.entry)) ? 0 : 1) || time(b.entry) - time(a.entry) || a.index - b.index).map(({ entry }) => entry);
}
