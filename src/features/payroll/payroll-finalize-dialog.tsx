"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectBox } from "@/components/ui/select-box";
import { AttendanceCorrectionDialog } from "@/features/operations/workforce-correction-dialog";
import { ErrorNotice, Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { HrProblem } from "@/shared/messages/hr-problem";
import type { SheetDetail } from "./contracts";
import { FinalizeReasonList, TotalsChangedNotice, type AttendanceTarget } from "./payroll-finalize-problems";
import { expenseMonthOptions } from "./payroll-model";
import s from "./payroll-screen.module.css";

export type ExpectedTotals = { total: number; slips: number };

/** What the Owner is about to lock: employees, income, advances taken off and the amount to pay, summed from the viewed sheet. */
function Preview({ sheet }: { sheet: SheetDetail }) {
  const sum = (pick: (slip: SheetDetail["slips"][number]) => number) => sheet.slips.reduce((total, slip) => total + pick(slip), 0);
  return <dl className={s.previewGrid} aria-label="Xem trước bảng lương sẽ chốt">
    <div><dt>Số nhân viên</dt><dd>{sheet.employeeCount ?? sheet.slips.length}</dd></div>
    <div><dt>Tổng thu nhập</dt><dd><Money value={sum((slip) => slip.income)} /></dd></div>
    <div><dt>Tạm ứng trừ</dt><dd><Money value={sum((slip) => slip.deduction)} /></dd></div>
    <div><dt>Thực lĩnh</dt><dd><Money value={sheet.total} /></dd></div>
  </dl>;
}

/**
 * "Xác nhận chốt lương": the month the wage cost is recognised in, a preview of the totals and the warning that finalizing cannot be undone.
 * The totals viewed are sent with the request; when the backend refuses (not ready, or the sheet changed since it was viewed) the reasons
 * are listed here with a way to fix the attendance, or the old and new totals with a button to confirm the new ones.
 */
export function FinalizeDialog({ sheet, pending, error, problem, onClose, onConfirm }: {
  sheet: SheetDetail; pending: boolean; error?: string; problem?: HrProblem; onClose(): void; onConfirm(expenseMonth: string, expected: ExpectedTotals): void;
}) {
  const [month, setMonth] = useState(sheet.to.slice(0, 7));
  const [fixing, setFixing] = useState<AttendanceTarget>();
  const [fixed, setFixed] = useState<ReadonlySet<string>>(new Set());
  const changed = problem?.reasonCode === "TOTALS_CHANGED" && problem.currentTotal !== undefined && problem.currentSlips !== undefined;
  const reasons = !changed && problem?.items?.length ? problem.items : undefined;
  const viewed: ExpectedTotals = { total: sheet.total, slips: sheet.employeeCount ?? sheet.slips.length };
  return <>
    <Dialog open size="md" mobileLayout="compact" title="Xác nhận chốt lương" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Preview sheet={sheet} />
    <p className={s.warnNote}>Không thể hoàn tác: sau khi chốt, chấm công và lương đến hết ngày {formatVietnameseDate(sheet.to)} bị khóa. Khoản tạm ứng (nếu có) được trừ vào bảng lương này.</p>
    <div className={s.formGrid}>
      <label htmlFor="payroll-expense-month">Tháng ghi nhận chi phí lương nhân viên</label>
      <SelectBox id="payroll-expense-month" value={month} disabled={pending} onChange={(event) => setMonth(event.target.value)}>
        {expenseMonthOptions(sheet.to).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </SelectBox>
    </div>
    {changed && problem && <TotalsChangedNotice problem={problem} />}
    {reasons && <>
      <p role="alert" className="mt-3 text-sm text-danger">Chưa thể chốt: còn {reasons.length} việc cần xử lý.</p>
      <FinalizeReasonList items={reasons} fixed={fixed} onFix={setFixing} />
      {fixed.size > 0 && <p role="status" className={s.muted}>Đã sửa chấm công. Đóng hộp thoại này, chọn Tải lại để cập nhật bảng lương rồi chốt lại.</p>}
    </>}
    {!changed && !reasons && <ErrorNotice error={error} />}
    <div className={s.dialogActions}>
      <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pending} onClick={onClose}>Bỏ qua</Button>
      <Button key="confirm" className="w-auto" type="button" isPending={pending}
        onClick={() => onConfirm(month, changed && problem ? { total: problem.currentTotal!, slips: problem.currentSlips! } : viewed)}>
        {changed ? "Chốt theo số mới" : "Xác nhận chốt"}
      </Button>
    </div>
    </Dialog>
    {fixing && <AttendanceCorrectionDialog employeeId={fixing.employeeId} day={fixing.day} onClose={() => setFixing(undefined)}
      onSaved={() => { setFixed((current) => new Set(current).add(`${fixing.employeeId}|${fixing.day}`)); setFixing(undefined); }} />}
  </>;
}
