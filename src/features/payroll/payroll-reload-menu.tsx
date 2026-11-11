"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import s from "./payroll-screen.module.css";

export type ReloadMode = "All" | "WorkingDaysOnly";

/** "Tải lại dữ liệu" with the two KiotViet choices in a small inline menu (not a dialog). */
export function PayrollReloadMenu({ pending, onPick }: { pending: boolean; onPick(mode: ReloadMode): void }) {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  const choose = (mode: ReloadMode) => { setOpen(false); onPick(mode); };
  return <div ref={root} className={s.menuHost} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <Button className="w-auto" variant="ghost" type="button" aria-haspopup="menu" aria-expanded={open} isPending={pending} onClick={() => setOpen((value) => !value)}><InterfaceIcon name="refresh" className="size-4" />Tải lại dữ liệu</Button>
    {open && <div role="menu" className={s.menu}>
      <button key="all" type="button" role="menuitem" autoFocus onClick={() => choose("All")}>Tải lại toàn bộ dữ liệu</button>
      <button key="days" type="button" role="menuitem" onClick={() => choose("WorkingDaysOnly")}>Chỉ cập nhật dữ liệu theo ngày làm việc</button>
    </div>}
  </div>;
}
