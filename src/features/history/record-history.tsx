"use client";
import { useCallback, useState } from "react";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { historyActionLabel, historyChangeText, type HistoryEntry } from "./history-contracts";
import { readRecordHistory, type HistoryKind } from "./history-repository";

/** Who, when, what, why (reason and note) and the changed fields of one record. */
export function HistoryEntries({ entries }: { entries: readonly HistoryEntry[] }) {
  if (!entries.length) return <p className="text-xs text-text-muted">Chưa có thay đổi nào được ghi lại.</p>;
  return <ol aria-label="Lịch sử thay đổi" className="grid gap-2">
    {entries.map((entry, index) => <li key={`${entry.at}-${index}`} className="rounded-control border border-border bg-surface p-2 text-xs">
      <p><strong>{historyActionLabel(entry.action)}</strong> · {entry.at.length > 10 ? displayTime(entry.at) : formatVietnameseDate(entry.at)}
        {entry.byName ? ` · ${entry.byName}${entry.byRole ? ` (${entry.byRole})` : ""}` : ""}</p>
      {entry.reason && <p>Lý do: {entry.reason}</p>}
      {entry.note && <p>Ghi chú: {entry.note}</p>}
      {entry.changes.length > 0 && <ul className="mt-1 list-disc pl-4">{entry.changes.map(change => <li key={change.field}>{historyChangeText(change)}</li>)}</ul>}
    </li>)}
  </ol>;
}

function Loaded({ kind, id, zoneId }: { kind: HistoryKind; id: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readRecordHistory(kind, id, zoneId, signal), [kind, id, zoneId]));
  if (remote.loading) return <Skeleton />;
  // An error (also a 404 from a backend without the history endpoint) is an empty state with a retry, never a broken screen.
  if (remote.error || !remote.data) return <p className="text-xs text-text-muted">Chưa xem được lịch sử của bản ghi này. <button type="button" className="underline" onClick={remote.reload}>Tải lại</button></p>;
  return <HistoryEntries entries={remote.data} />;
}

/** "Lịch sử" of a record, loaded only when opened (so a screen without the backend endpoint costs nothing). */
export function RecordHistory({ kind, id, zoneId }: { kind: HistoryKind; id: string; zoneId: string }) {
  const [open, setOpen] = useState(false);
  return <section aria-label="Lịch sử" className="mt-3 border-t border-border pt-2">
    <button type="button" className="text-xs font-semibold underline" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Ẩn lịch sử" : "Lịch sử"}</button>
    {open && <div className="mt-2"><Loaded kind={kind} id={id} zoneId={zoneId} /></div>}
  </section>;
}
