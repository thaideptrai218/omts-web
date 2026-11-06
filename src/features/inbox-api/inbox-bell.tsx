"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import Link from "next/link";
import { displayTime, useRemote } from "@/features/operations/ui";
import { readInbox } from "./repository";

export function InboxBell() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inbox = useRemote(useMemo(() => (signal: AbortSignal) => readInbox(1, signal), []));
  const { reload } = inbox;
  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener("omts-inbox-changed", refresh);
    return () => window.removeEventListener("omts-inbox-changed", refresh);
  }, [reload]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={root} className="relative shrink-0">
    <button type="button" aria-label="Thông báo" title="Thông báo" aria-expanded={open} aria-haspopup="true" className="relative grid size-8 place-items-center rounded-control text-text-muted hover:bg-surface-subtle hover:text-primary" onClick={() => { if (!open) inbox.reload(); setOpen(!open); }}>
      <InterfaceIcon name="bell" />{Boolean(inbox.data?.unreadCount) && <span className="absolute right-0 top-0 size-2 rounded-full bg-danger" aria-label={`${inbox.data!.unreadCount} thông báo chưa đọc`} />}
    </button>
    {open && <div className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-3 shadow-lg" role="region" aria-label="Thông báo gần đây">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2"><strong className="text-sm">Thông báo gần đây</strong><span className="text-xs text-text-muted">{inbox.data?.unreadCount ?? 0} chưa đọc</span></div>
      {inbox.loading && <p role="status" className="py-4 text-sm">Đang tải thông báo...</p>}
      {inbox.error && <p role="alert" className="py-4 text-sm text-danger">{inbox.error}</p>}
      {inbox.data && <ul className="divide-y divide-border">{inbox.data.items.slice(0, 5).map((row) => <li key={row.id}><Link onClick={() => setOpen(false)} href={`/notifications/${row.id}?page=1`} className="block py-3 text-sm hover:text-primary"><span className="block font-medium">{row.title}</span><span className="mt-1 block text-xs text-text-muted">{displayTime(row.createdAt)} · {row.readAt ? "Đã đọc" : "Chưa đọc"}</span></Link></li>)}</ul>}
      {inbox.data && inbox.data.items.length === 0 && <p className="py-4 text-sm text-text-muted">Chưa có thông báo.</p>}
      <Link onClick={() => setOpen(false)} href="/notifications" className="block border-t border-border pt-3 text-center text-sm font-semibold text-primary hover:underline">Xem tất cả thông báo</Link>
    </div>}
  </div>;
}
