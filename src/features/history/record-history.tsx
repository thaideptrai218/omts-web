"use client";
import { useCallback, useState } from "react";
import { Skeleton, useRemote } from "@/features/operations/ui";
import type { HistoryEntry } from "./history-contracts";
import { HistoryTable } from "./history-table";
import { readRecordHistory, type HistoryKind } from "./history-repository";

/** Who, when, what, why (reason and note) and the changed fields of one record, as a table. */
export const HistoryEntries = ({ entries }: { entries: readonly HistoryEntry[] }) => <HistoryTable entries={entries} />;

export function RecordHistoryList({ kind, id, zoneId }: { kind: HistoryKind; id: string; zoneId: string }) {
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
    {open && <div className="mt-2"><RecordHistoryList kind={kind} id={id} zoneId={zoneId} /></div>}
  </section>;
}

/**
 * "Xem lịch sử" of a record that was changed after it was made: the history is read when the card opens and the section appears only when it holds more than the
 * creation entry (a record never edited or removed has nothing to show); an unreadable history hides it too.
 */
export function EditedRecordHistory({ kind, id, zoneId }: { kind: HistoryKind; id: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readRecordHistory(kind, id, zoneId, signal), [kind, id, zoneId]));
  const [open, setOpen] = useState(false);
  if (!remote.data || remote.data.length <= 1) return null;
  return <section aria-label="Lịch sử" className="mt-3 border-t border-border pt-2">
    <button type="button" className="text-xs font-semibold underline" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Ẩn lịch sử" : "Xem lịch sử"}</button>
    {open && <div className="mt-2"><HistoryEntries entries={remote.data} /></div>}
  </section>;
}
