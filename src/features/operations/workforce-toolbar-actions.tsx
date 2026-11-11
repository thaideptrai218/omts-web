"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, managementStyles } from "@/components/ui/management-screen/management-table";
import { operationAllowed } from "./permissions";
import type { WorkforceBoard, WorkforceForm } from "./workforce-board-state";
import { workforceColumns } from "./workforce-columns";
import styles from "./workforce-screen.module.css";

/** The less frequent actions live in a "..." menu so the toolbar stays one low row. Owner-only items stay Owner-only. */
function MoreMenu({ board }: { board: WorkforceBoard }) {
  const { context, editor, allowed } = board;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const isOwner = context.identity.subjectType === "CooperativeOwner";
  const dialogs: [WorkforceForm, string][] = [
    ...(allowed("Edit") ? [["crew", "Đổi việc trong ngày"] as [WorkforceForm, string]] : []),
    ...(isOwner ? [["settings", "Thiết lập chấm công"] as [WorkforceForm, string], ["leaves", "Duyệt nghỉ phép"] as [WorkforceForm, string]] : []),
  ];
  const jobTypes = operationAllowed("job-types", context.identity, context.permissions.functionPermissions);
  if (!dialogs.length && !jobTypes) return null;
  return <div ref={root} className={managementStyles.picker} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button type="button" className={managementStyles.iconButton} aria-label="Thao tác khác" title="Thao tác khác" aria-haspopup="true" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true" className={styles.dots}>⋯</span>
    </button>
    {open && <div id={panel} className={managementStyles.pickerPanel}>
      {dialogs.map(([key, label]) => <button key={key} type="button" className={styles.menuItem} disabled={editor.disabled} onClick={() => { setOpen(false); board.setForm(key); }}>{label}</button>)}
      {jobTypes && <Link className={styles.menuItem} href="/operations/job-types">Loại công việc &amp; đơn giá</Link>}
    </div>}
  </div>;
}

/** Toolbar buttons: create, column chooser, "..." menu, disabled help. */
export function WorkforceToolbarActions({ board, visibleKeys, onColumns }: { board: WorkforceBoard; visibleKeys: readonly string[]; onColumns(keys: string[]): void }) {
  const offered = workforceColumns.filter((column) => column.modes.includes(board.mode));
  return <>
    {board.allowed("Create") && <Button type="button" className="w-auto" disabled={board.editor.disabled} onClick={() => board.setForm("assign")}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo phân công</Button>}
    <MoreMenu board={board} />
    <ColumnPicker columns={offered} visible={visibleKeys} onChange={onColumns} />
    <HelpLink />
  </>;
}
