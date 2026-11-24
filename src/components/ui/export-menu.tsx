"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";

/** Định dạng tệp báo cáo có thể tải về. */
export type ExportFormat = "pdf" | "xlsx";

const CHOICES: readonly (readonly [ExportFormat, string])[] = [["pdf", "PDF"], ["xlsx", "Excel (.xlsx)"]];

type ExportMenuProps = Readonly<{ onPick(format: ExportFormat): void; pending?: boolean; disabled?: boolean }>;

/**
 * Nút "Tải xuống ▾" với menu nhỏ chọn PDF hoặc Excel, dùng chung cho các báo cáo. Bàn phím: Enter/Space/↓ mở menu và vào mục đầu,
 * ↑/↓ di chuyển, Home/End nhảy đầu/cuối, Esc đóng và trả tiêu điểm về nút, Tab hoặc bấm ra ngoài thì đóng.
 */
export function ExportMenu({ onPick, pending, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), items = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  const close = (restoreFocus: boolean) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };
  const move = (event: KeyboardEvent, to: number) => { event.preventDefault(); items.current[(to + CHOICES.length) % CHOICES.length]?.focus(); };
  const onMenuKey = (event: KeyboardEvent) => {
    const at = items.current.findIndex((item) => item === document.activeElement);
    if (event.key === "Escape") { event.preventDefault(); close(true); }
    else if (event.key === "Tab") close(false);
    else if (event.key === "ArrowDown") move(event, at + 1);
    else if (event.key === "ArrowUp") move(event, at - 1);
    else if (event.key === "Home") move(event, 0);
    else if (event.key === "End") move(event, CHOICES.length - 1);
  };
  return (
    <div ref={root} className="relative">
      <Button ref={trigger} className="w-auto" variant="secondary" aria-haspopup="menu" aria-expanded={open} isPending={pending} disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } }}>
        <InterfaceIcon name="download" className="mr-1 size-4" />Tải xuống<span aria-hidden="true">▾</span>
      </Button>
      {open && (
        <div role="menu" aria-label="Chọn định dạng tệp" onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+4px)] z-20 grid min-w-44 rounded-control border border-border bg-surface p-1 shadow-lg">
          {CHOICES.map(([format, label], index) => (
            <button key={format} ref={(node) => { items.current[index] = node; }} type="button" role="menuitem"
              className="rounded px-3 py-2 text-left text-[13px] hover:bg-[var(--omts-color-primary-soft)] focus-visible:bg-[var(--omts-color-primary-soft)]"
              onClick={() => { close(true); onPick(format); }}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
