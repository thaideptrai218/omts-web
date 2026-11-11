"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice } from "@/features/operations/ui";
import { expenseMonthOptions } from "./payroll-model";
import s from "./payroll-screen.module.css";

type Common = { pending: boolean; error?: string; onClose(): void };

/** "Xác nhận chốt lương": the month the wage cost is recognised in (default: month of the period end). */
export function FinalizeDialog({ periodEnd, pending, error, onClose, onConfirm }: Common & { periodEnd: string; onConfirm(expenseMonth: string): void }) {
  const [month, setMonth] = useState(periodEnd.slice(0, 7));
  return <Dialog open size="md" mobileLayout="compact" title="Xác nhận chốt lương" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <p>Dữ liệu lương và chấm công trong kỳ sẽ bị khóa, không thể thay đổi sau khi chốt. Hệ thống ghi nhận khoản tạm ứng (nếu có) vào bảng lương.</p>
    <div className={`${s.formGrid} mt-4`}>
      <label htmlFor="payroll-expense-month">Tháng ghi nhận chi phí lương nhân viên</label>
      <select id="payroll-expense-month" value={month} disabled={pending} onChange={(event) => setMonth(event.target.value)}>
        {expenseMonthOptions(periodEnd).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    <ErrorNotice error={error} />
    <div className={s.dialogActions}>
      <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pending} onClick={onClose}>Bỏ qua</Button>
      <Button key="confirm" className="w-auto" type="button" isPending={pending} onClick={() => onConfirm(month)}>Xác nhận</Button>
    </div>
  </Dialog>;
}

export function CancelSheetDialog({ name, pending, error, onClose, onConfirm }: Common & { name: string; onConfirm(): void }) {
  return <Dialog open size="md" mobileLayout="compact" title="Hủy bảng lương?" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <p>Bảng lương &quot;{name}&quot; sẽ chuyển sang trạng thái Đã hủy và không thể khôi phục.</p>
    <ErrorNotice error={error} />
    <div className={s.dialogActions}>
      <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pending} onClick={onClose}>Bỏ qua</Button>
      <Button key="agree" className="w-auto" variant="danger" type="button" isPending={pending} onClick={onConfirm}>Đồng ý</Button>
    </div>
  </Dialog>;
}
