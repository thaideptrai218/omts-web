"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ErrorNotice, businessToday, useMutation } from "@/features/operations/ui";
import type { CreateSheetBody, PeriodType, SheetDetail } from "./contracts";
import { monthOptions, periodLabel } from "./payroll-model";
import { PayrollScopePicker } from "./payroll-scope-picker";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** "Thêm bảng tính lương": pay period kind, work period, and which employees the sheet covers. */
export function PayrollCreateDialog({ onClose, onCreated, onOpenExisting }: { onClose(): void; onCreated(sheet: SheetDetail): void; onOpenExisting?(id: string): void }) {
  const months = useMemo(() => monthOptions(businessToday()), []);
  const [type, setType] = useState<PeriodType>("Monthly"), [month, setMonth] = useState(months[0].value);
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [scope, setScope] = useState<"All" | "Selected">("All");
  const [picked, setPicked] = useState<ReadonlyMap<string, string>>(new Map()), [problem, setProblem] = useState<string>();
  const save = useMutation();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const range = type === "Monthly" ? months.find((option) => option.value === month) : { from, to };
    if (!range?.from || !range.to) return setProblem("Hãy chọn kỳ làm việc.");
    if (range.from > range.to) return setProblem("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    if (scope === "Selected" && !picked.size) return setProblem("Hãy chọn ít nhất một nhân viên.");
    setProblem(undefined);
    const body: CreateSheetBody = { periodType: type, from: range.from, to: range.to, scope, ...(scope === "Selected" ? { employeeIds: [...picked.keys()] } : {}) };
    const sheet = await save.run(() => payrollRepository.create(body));
    if (sheet) onCreated(sheet);
  }
  // The true cause comes from the backend: 409 = this period already has a sheet (with its id), 400 on the period = no hours / overlaps another sheet (Vietnamese hint).
  // 400 on "Period" also carries the id of the overlapping sheet; its code ("BLxxxxxx") is named in the hint.
  const cause = save.failure?.hrProblem, existingId = cause?.existingId && (save.failure?.httpStatus === 409 || cause.field === "Period") ? cause.existingId : undefined;
  const existingCode = /BL\d+/.exec(cause?.hint ?? "")?.[0];
  const duplicate = save.failure?.httpStatus === 409 && (existingId || !save.failure.code || save.failure.code === "MSG-GEN-02") ? "Đã có bảng lương cho kỳ làm việc này."
    : cause?.field === "Period" && cause.hint ? `Kỳ làm việc chưa hợp lệ: ${cause.hint}` : undefined;
  return <Dialog open size="md" title="Thêm bảng tính lương" dismissible={!save.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <form onSubmit={(event) => void submit(event)} noValidate>
      <ErrorNotice error={problem ?? duplicate ?? save.error} />
      {existingId && <p className="mb-2 text-sm text-text-muted">Kỳ này đang trùng một bảng lương còn hiệu lực của cùng nhân viên. Hãy hủy bảng đó nếu chưa chốt, hoặc chọn kỳ không trùng.</p>}
      {existingId && onOpenExisting && <button type="button" className={`${s.link} mb-3 text-sm`} onClick={() => onOpenExisting(existingId)}>{existingCode ? `Mở bảng lương ${existingCode}` : "Mở bảng lương đã có"}</button>}
      <p className="mb-3 text-sm text-text-muted">Bảng lương chỉ gồm nhân viên có giờ công trong kỳ; kỳ không được trùng một bảng lương đang hiệu lực của cùng nhân viên.</p>
      <fieldset disabled={save.pending} className={`min-w-0 ${s.formGrid}`}>
        <label htmlFor="payroll-period-type">Kỳ hạn trả lương</label>
        <SelectBox id="payroll-period-type" value={type} onChange={(event) => setType(event.target.value as PeriodType)}>
          {(["Monthly", "Custom"] as const).map((key) => <option key={key} value={key}>{periodLabel[key]}</option>)}
        </SelectBox>
        {type === "Monthly"
          ? <><label htmlFor="payroll-month">Kỳ làm việc</label>
            <SelectBox id="payroll-month" value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectBox></>
          : <><span className={s.label}>Kỳ làm việc</span>
            <div className={s.inline}><DatePickerField label="Từ ngày" value={from} onChange={setFrom} /><span aria-hidden="true">-</span><DatePickerField label="Đến ngày" value={to} onChange={setTo} /></div></>}
        <span className={s.label} id="payroll-scope-label">Phạm vi áp dụng</span>
        <div className={s.inline} role="radiogroup" aria-labelledby="payroll-scope-label">
          <label><input type="radio" name="payroll-scope" checked={scope === "All"} onChange={() => setScope("All")} />Tất cả nhân viên</label>
          <label><input type="radio" name="payroll-scope" checked={scope === "Selected"} onChange={() => setScope("Selected")} />Tùy chọn</label>
        </div>
        {scope === "Selected" && <div className={s.span2}><PayrollScopePicker picked={picked} onChange={setPicked} /></div>}
      </fieldset>
      <div className={s.dialogActions}>
        <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={save.pending} onClick={onClose}>Bỏ qua</Button>
        <Button key="save" className="w-auto" type="submit" isPending={save.pending}>Lưu</Button>
      </div>
    </form>
  </Dialog>;
}
