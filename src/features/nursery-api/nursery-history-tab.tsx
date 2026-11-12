"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HistoryEntries } from "@/features/history/record-history";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { nurseryService } from "./service";

const actionLabels: Record<string, string> = { Created: "Bắt đầu ươm", Edited: "Chỉnh sửa đợt ươm", Cancelled: "Hủy đợt ươm",
  Completed: "Hoàn tất ươm", SurvivorsCorrected: "Sửa số sống sót (ước tính)", AllocationsChanged: "Chuyển phân bổ giữa các bè" };
export function NurseryHistoryTab({ id, zoneId }: { id: string; zoneId: string }) {
  const history = useRemote(useCallback((signal: AbortSignal) => nurseryService.history(id, zoneId, signal), [id, zoneId]));
  if (history.loading) return <Skeleton />;
  if (history.error || !history.data) return <div className="space-y-2 text-sm"><p>Chưa xem được lịch sử đợt ươm này.</p>
    <Button key="retry-nursery-history" type="button" variant="secondary" className="w-auto" onClick={history.reload}>Tải lại lịch sử</Button></div>;
  const entries = history.data.entries.map(entry => ({ ...entry, action: entry.actionLabel || actionLabels[entry.action.split(".").at(-1) ?? entry.action] || "Cập nhật đợt ươm",
    changes: entry.changes.map(change => ({ ...change, label: `${change.label || change.field}${change.unit ? ` (${change.unit})` : ""}` })) }));
  return <HistoryEntries entries={entries} />;
}
