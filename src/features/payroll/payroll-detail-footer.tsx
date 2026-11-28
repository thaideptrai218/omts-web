"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/ui/export-menu";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ErrorNotice, businessToday, useMutation } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { SheetDetail } from "./contracts";
import { CancelSheetDialog } from "./payroll-confirm-dialogs";
import { dayAfter, formatDateTime, leftOutLines } from "./payroll-model";
import { FinalizeDialog } from "./payroll-finalize-dialog";
import { PayrollReloadMenu } from "./payroll-reload-menu";
import { payrollRepository } from "./repository";
import { usePayrollOwner, usePayrollWriter } from "./use-payroll-writer";
import s from "./payroll-screen.module.css";

export type DetailTab = "info" | "slips" | "payments";
type Dialogs = "finalize" | "cancel" | undefined;

/**
 * Actions of the open sheet, by status, laid out like the KiotViet sheet: "Hủy bỏ" on the left, when the data was last calculated with "Tải lại dữ liệu" in the middle, "Chốt lương" (only once the period has ended, a hint with the first day before) and
 * "Xuất file" on the right. Wages are paid from the "Phiếu lương" tab. Every button has its own key and an explicit type: React reuses a button node when the
 * button at the same place changes (e.g. "Chốt lương" -> "Thanh toán" after finalizing), and a node reused as a submit button
 * would submit the surrounding form by accident.
 */
export function PayrollDetailFooter({ sheet, onChanged }: { sheet: SheetDetail; onChanged(notice: string): void }) {
  const [dialog, setDialog] = useState<Dialogs>();
  const change = useMutation(), file = useMutation(), writer = usePayrollWriter(), owner = usePayrollOwner();
  const provisional = sheet.status === "Provisional" && writer, finalizable = sheet.status === "Provisional" && owner, periodEnded = businessToday() > sheet.to, cancellable = owner && (sheet.status === "Provisional" || sheet.status === "Creating");
  const close = () => setDialog(undefined);
  async function run(action: () => ReturnType<typeof payrollRepository.cancel>, notice: string) {
    const updated = await change.run(action);
    if (updated) { close(); onChanged([notice, ...leftOutLines(updated.leftOut)].join(" ")); }
  }
  return <>
    <ErrorNotice error={file.error ?? (dialog ? undefined : change.error)} />
    <footer role="group" aria-label="Thao tác bảng lương" className={s.footer}>
    <div>
      {cancellable && <Button key="cancel" className="w-auto" variant="ghost" type="button" onClick={() => { change.reviewed(); setDialog("cancel"); }}><InterfaceIcon name="trash" className="size-4" />Hủy bỏ</Button>}
    </div>
    <div className={s.sheetFootNote}>
      {sheet.calculatedAt && <span>Dữ liệu được cập nhật vào: <strong>{formatDateTime(sheet.calculatedAt)}</strong></span>}
      {provisional && <PayrollReloadMenu key="reload" pending={change.pending} onPick={(mode) => void run(() => payrollRepository.reload(sheet.id, mode), "Đã tải lại dữ liệu bảng lương.")} />}
    </div>
    <div>
      {finalizable && !periodEnded && <span key="finalize-hint" className={s.sheetFootNote}>Chốt được từ {formatVietnameseDate(dayAfter(sheet.to))}</span>}
      {finalizable && periodEnded && <Button key="finalize" className="w-auto" type="button" onClick={() => { change.reviewed(); setDialog("finalize"); }}><InterfaceIcon name="lock" className="size-4" />Chốt lương</Button>}
      {sheet.status !== "Creating" && <ExportMenu key="export" pending={file.pending} onPick={(format) => void file.run(() => payrollRepository.exportSheet(sheet.id, format), true)} />}
    </div>
    </footer>
    {dialog === "finalize" && <FinalizeDialog sheet={sheet} pending={change.pending} error={change.error} problem={change.failure?.hrProblem} onClose={close}
      onConfirm={(month, expected) => void run(() => payrollRepository.finalize(sheet.id, month, expected), "Đã chốt lương. Dữ liệu trong kỳ đã được khóa.")} />}
    {dialog === "cancel" && <CancelSheetDialog name={sheet.name} pending={change.pending} error={change.error} onClose={close} onConfirm={() => void run(() => payrollRepository.cancel(sheet.id), "Đã hủy bảng lương.")} />}
  </>;
}
