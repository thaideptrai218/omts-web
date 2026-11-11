"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import type { SheetDetail } from "./contracts";
import { CancelSheetDialog, FinalizeDialog } from "./payroll-confirm-dialogs";
import { PayrollPayDialog } from "./payroll-pay-dialog";
import { PayrollReloadMenu } from "./payroll-reload-menu";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

export type DetailTab = "info" | "slips" | "payments";
type Dialogs = "finalize" | "cancel" | "pay" | undefined;

/**
 * Actions of the open sheet, by status. Every button has its own key and an explicit type: React reuses a button node when the
 * button at the same place changes (e.g. "Chốt lương" -> "Thanh toán" after finalizing), and a node reused as a submit button
 * would submit the surrounding form by accident.
 */
export function PayrollDetailFooter({ sheet, tab, onChanged }: { sheet: SheetDetail; tab: DetailTab; onChanged(notice: string): void }) {
  const [dialog, setDialog] = useState<Dialogs>();
  const change = useMutation(), file = useMutation();
  const provisional = sheet.status === "Provisional", cancellable = provisional || sheet.status === "Creating", finalized = sheet.status === "Finalized";
  const close = () => setDialog(undefined);
  async function run(action: () => ReturnType<typeof payrollRepository.cancel>, notice: string) {
    const updated = await change.run(action);
    if (updated) { close(); onChanged(notice); }
  }
  return <>
    <ErrorNotice error={file.error ?? (dialog ? undefined : change.error)} />
    <footer role="group" aria-label="Thao tác bảng lương" className={s.footer}>
    <div>
      {provisional && <PayrollReloadMenu key="reload" pending={change.pending} onPick={(mode) => void run(() => payrollRepository.reload(sheet.id, mode), "Đã tải lại dữ liệu bảng lương.")} />}
      {cancellable && <Button key="cancel" className="w-auto" variant="ghost" type="button" onClick={() => { change.reviewed(); setDialog("cancel"); }}><InterfaceIcon name="trash" className="size-4" />Hủy bỏ</Button>}
      {sheet.status !== "Creating" && <Button key="export" className="w-auto" variant="ghost" type="button" isPending={file.pending} onClick={() => void file.run(() => payrollRepository.exportSheet(sheet.id), true)}><InterfaceIcon name="download" className="size-4" />Xuất file</Button>}
    </div>
    <div>
      {provisional && <Button key="finalize" className="w-auto" type="button" onClick={() => { change.reviewed(); setDialog("finalize"); }}><InterfaceIcon name="lock" className="size-4" />Chốt lương</Button>}
      {finalized && tab !== "info" && <Button key="pay" className="w-auto" type="button" disabled={sheet.outstanding <= 0} title={sheet.outstanding <= 0 ? "Không còn khoản cần trả" : undefined} onClick={() => setDialog("pay")}><InterfaceIcon name="payment" className="size-4" />Thanh toán</Button>}
    </div>
    </footer>
    {dialog === "finalize" && <FinalizeDialog periodEnd={sheet.to} pending={change.pending} error={change.error} onClose={close} onConfirm={(month) => void run(() => payrollRepository.finalize(sheet.id, month), "Đã chốt lương. Dữ liệu trong kỳ đã được khóa.")} />}
    {dialog === "cancel" && <CancelSheetDialog name={sheet.name} pending={change.pending} error={change.error} onClose={close} onConfirm={() => void run(() => payrollRepository.cancel(sheet.id), "Đã hủy bảng lương.")} />}
    {dialog === "pay" && <PayrollPayDialog sheet={sheet} onClose={close} onPaid={(count) => { close(); onChanged(`Đã tạo ${count} phiếu chi. Các phiếu chi xuất hiện trong Sổ quỹ.`); }} />}
  </>;
}
