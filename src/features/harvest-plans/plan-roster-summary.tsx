"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/operations/ui";
import type { PlanRoster } from "./contracts";
import { countedPeople } from "./plan-roster-logic";

/**
 * The head of the roster: the number of people needed (typed from the Owner's experience, editable until the plan is over) and how many have confirmed against it.
 * A shortage is an amber line, never red and never a block; without a number the screen says so instead of a green tick.
 */
export function PlanRosterSummary({ roster, canEdit, pending, onSave }: { roster: PlanRoster; canEdit: boolean; pending: boolean; onSave(value: number | null): Promise<string | undefined> }) {
  const { summary } = roster, counted = countedPeople(summary), required = summary.requiredPeople;
  const [editing, setEditing] = useState(false), [value, setValue] = useState(""), [problem, setProblem] = useState<string>();
  const percent = required ? Math.min(100, Math.round((counted / required) * 100)) : 0;
  const short = required != null && summary.missing > 0;

  function start() { setValue(required == null ? "" : String(required)); setProblem(undefined); setEditing(true); }
  async function save() {
    const text = value.trim(), number = text === "" ? null : Number(text);
    if (number !== null && (!Number.isInteger(number) || number < 1 || number > 500)) { setProblem("Nhập số người từ 1 đến 500, hoặc để trống."); return; }
    const failure = await onSave(number);
    if (failure) setProblem(failure); else setEditing(false);
  }

  return <section aria-label="Số người cần" className="rounded-control border border-border p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-text-muted">Số người cần</p>
        {editing
          ? <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <div className="w-32"><Field label="Số người cần" type="number" inputMode="numeric" min={1} max={500} step={1} value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></div>
            <Button className="w-auto" type="submit" isPending={pending} pendingLabel="Đang lưu...">Lưu</Button>
            <Button className="w-auto" type="button" variant="secondary" disabled={pending} onClick={() => setEditing(false)}>Bỏ qua</Button>
          </form>
          : <p className="flex items-center gap-3"><strong className="text-2xl tabular-nums">{required ?? "Chưa nhập"}</strong>
            {canEdit && <button type="button" className="text-sm font-medium text-primary underline underline-offset-4" onClick={start}>{required == null ? "Nhập số người cần" : "Sửa"}</button>}</p>}
        {problem && <p role="alert" className="mt-1 text-sm text-danger">{problem}</p>}
      </div>
      <p className="text-sm" aria-live="polite">
        <strong className="tabular-nums">Đã xác nhận {counted}{required != null ? ` / cần ${required}` : ""}</strong>
        {summary.external > 0 && <span className="text-text-muted"> (có {summary.external} người ngoài hệ thống)</span>}
        {short && <span className="ml-2 font-medium text-warning">Thiếu {summary.missing} người</span>}
        {required != null && !short && <span className="ml-2 font-medium text-success">Đủ người</span>}
        {required == null && <span className="ml-2 text-text-muted">Chưa nhập số người cần</span>}
      </p>
    </div>
    {required != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Người đã xác nhận" aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(counted, required)}>
      <div className={`h-full rounded-full ${short ? "bg-warning" : "bg-success"}`} style={{ width: `${percent}%` }} />
    </div>}
    <p className="mt-2 text-xs text-text-muted">{summary.invited > 0 ? `${summary.invited} người chưa trả lời. ` : ""}{summary.declined > 0 ? `${summary.declined} người từ chối. ` : ""}Người chưa trả lời hoặc từ chối không được tính.</p>
  </section>;
}
