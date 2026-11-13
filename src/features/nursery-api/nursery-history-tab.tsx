"use client";
import { useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { nurseryDisplayText } from "./nursery-display-text";
import { nurseryHistoryAction, nurseryHistoryChangeLabel, nurseryHistorySummary, nurseryHistoryValue, type NurseryHistoryEntry } from "./nursery-history-presentation";
import { nurseryService } from "./service";

const blank = (value: unknown) => value === null || value === undefined || value === "";

function HistoryRow({ entry: raw }: { entry: NurseryHistoryEntry }) {
  const [open, setOpen] = useState(false), detailId = useId();
  // A field that is empty before and after carries no information ("— → —"), so it is not listed.
  const entry = { ...raw, changes: raw.changes.filter(change => !(blank(change.from) && blank(change.to))) };
  const time = entry.at.length > 10 ? displayTime(entry.at) : formatVietnameseDate(entry.at);
  const actor = entry.byName || "Hệ thống", summary = nurseryHistorySummary(entry);
  return <li className="min-w-0 rounded-control border border-border bg-surface text-xs">
    <button key="toggle-nursery-event" type="button" aria-expanded={open} aria-controls={detailId}
      className="flex min-h-9 w-full items-center gap-2 rounded-control px-2 py-2 text-left hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-primary"
      title={`${time} · ${actor} · ${summary}`} onClick={() => setOpen(value => !value)}>
      <time dateTime={entry.at} className="shrink-0 text-text-muted">{time}</time>
      <span className="min-w-0 flex-1 truncate">{actor} · <strong>{summary}</strong></span>
      <InterfaceIcon name={open ? "chevron-down" : "chevron-right"} />
    </button>
    {open && <div id={detailId} className="space-y-2 border-t border-border p-2">
      <p><strong>{nurseryHistoryAction(entry)}</strong> · {actor}{entry.byRole ? ` (${entry.byRole})` : ""} · {time}</p>
      {entry.changes.length > 0 && <dl className="grid gap-2">{entry.changes.map((change, index) => <div key={`${change.field}-${index}`} className="grid gap-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <dt className="text-text-muted">{nurseryHistoryChangeLabel(change)}</dt>
        <dd className="break-words">{nurseryHistoryValue(change, change.from)} → {nurseryHistoryValue(change, change.to)}</dd>
      </div>)}</dl>}
      {entry.reason && <p className="whitespace-pre-wrap break-words">Lý do: {nurseryDisplayText(entry.reason)}</p>}
      {entry.note && <p className="whitespace-pre-wrap break-words">Ghi chú: {nurseryDisplayText(entry.note)}</p>}
      {!entry.changes.length && !entry.reason && !entry.note && <p className="text-text-muted">Không có chi tiết bổ sung.</p>}
    </div>}
  </li>;
}

export function NurseryHistoryTab({ id, zoneId }: { id: string; zoneId: string }) {
  const history = useRemote(useCallback((signal: AbortSignal) => nurseryService.history(id, zoneId, signal), [id, zoneId]));
  if (history.loading) return <Skeleton />;
  if (history.error || !history.data) return <div className="space-y-2 text-sm"><p>Chưa xem được lịch sử đợt ươm này.</p>
    <Button key="retry-nursery-history" type="button" variant="secondary" className="w-auto" onClick={history.reload}>Tải lại lịch sử</Button></div>;
  if (!history.data.entries.length) return <p className="text-xs text-text-muted">Chưa có thay đổi nào được ghi lại.</p>;
  return <ol aria-label="Lịch sử thay đổi" className="grid gap-2">{history.data.entries.map((entry, index) => <HistoryRow key={`${entry.at}-${index}`} entry={entry} />)}</ol>;
}
