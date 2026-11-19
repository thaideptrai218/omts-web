"use client";
import { useState, type ReactNode } from "react";

export type HistoryOrder = "newest" | "oldest";

/** The moment of an entry in ms: an entry with no or an unreadable time counts as the oldest, so it never jumps above real events. */
const momentOf = (at: string | null | undefined) => {
  const value = at ? Date.parse(at.length === 10 ? `${at}T00:00:00+07:00` : at) : Number.NaN;
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

/** Entries by time; the order the caller gave breaks ties (a later step of the same minute stays above its start when newest first). */
export function sortHistory<T>(entries: readonly T[], at: (entry: T) => string | null | undefined, order: HistoryOrder): T[] {
  const sign = order === "newest" ? -1 : 1;
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => sign * (momentOf(at(a.entry)) - momentOf(at(b.entry))) || sign * (a.index - b.index)).map(item => item.entry);
}

/** History lists are read newest first by default (the last step, e.g. "Hoàn tất ươm", on top); the button flips to oldest first and back. */
export function HistoryOrderToggle({ order, onChange }: { order: HistoryOrder; onChange(next: HistoryOrder): void }): ReactNode {
  return <button type="button" className="mb-2 text-xs font-semibold underline" aria-label={order === "newest" ? "Đang xếp mới nhất trước, xếp cũ nhất trước" : "Đang xếp cũ nhất trước, xếp mới nhất trước"}
    onClick={() => onChange(order === "newest" ? "oldest" : "newest")}>{order === "newest" ? "Mới nhất trước ↓" : "Cũ nhất trước ↑"}</button>;
}

export function useHistoryOrder(): [HistoryOrder, (next: HistoryOrder) => void] {
  return useState<HistoryOrder>("newest");
}
