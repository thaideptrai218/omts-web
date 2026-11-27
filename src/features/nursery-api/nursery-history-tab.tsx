"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { HistoryTable, type HistoryPresentation } from "@/features/history/history-table";
import { nurseryDisplayText } from "./nursery-display-text";
import { nurseryHistoryAction, nurseryHistoryChangeLabel, nurseryHistoryValue } from "./nursery-history-presentation";
import { nurseryService } from "./service";

/** The nursery words its actions and fields its own way (a batch is "ươm", not "chốt"); the table and its columns are the shared ones. */
const presentation: HistoryPresentation = {
  action: nurseryHistoryAction,
  line: (change, style) => style === "set"
    ? `${nurseryHistoryChangeLabel(change)}: ${nurseryHistoryValue(change, change.to)}`
    : `${nurseryHistoryChangeLabel(change)}: ${nurseryHistoryValue(change, change.from)} → ${nurseryHistoryValue(change, change.to)}`,
};

export function NurseryHistoryTab({ id, zoneId }: { id: string; zoneId: string }) {
  const history = useRemote(useCallback((signal: AbortSignal) => nurseryService.history(id, zoneId, signal), [id, zoneId]));
  if (history.loading) return <Skeleton />;
  if (history.error || !history.data) return <div className="space-y-2 text-sm"><p>Chưa xem được lịch sử đợt ươm này.</p>
    <Button key="retry-nursery-history" type="button" variant="secondary" className="w-auto" onClick={history.reload}>Tải lại lịch sử</Button></div>;
  // An old transfer wording in a reason or a note must not direct anyone into a workflow that no longer exists.
  const entries = history.data.entries.map(entry => ({ ...entry, reason: nurseryDisplayText(entry.reason) ?? null, note: nurseryDisplayText(entry.note) ?? null }));
  return <HistoryTable entries={entries} presentation={presentation} />;
}
