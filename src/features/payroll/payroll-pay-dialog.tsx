"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Money, useMutation } from "@/features/operations/ui";
import type { SheetDetail } from "./contracts";
import { rangeLabel } from "./payroll-model";
import { PaymentHeaderFields, digits, newPaymentHeader, paidAtInstant } from "./payroll-payment-fields";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** "Thanh toán lương" of a finalized sheet: one row per payslip, the amount defaults to what is still owed and may be partial. */
export function PayrollPayDialog({ sheet, onClose, onPaid }: { sheet: SheetDetail; onClose(): void; onPaid(vouchers: number): void }) {
  const [header, setHeader] = useState(newPaymentHeader);
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(sheet.slips.filter((slip) => slip.outstanding > 0).map((slip) => slip.id)));
  const [amounts, setAmounts] = useState<Readonly<Record<string, string>>>(() => Object.fromEntries(sheet.slips.map((slip) => [slip.id, String(slip.outstanding)])));
  const [submitted, setSubmitted] = useState(false);
  const pay = useMutation();
  const value = (id: string) => Number(amounts[id] || 0);
  const invalid = (id: string, outstanding: number) => checked.has(id) && (value(id) < 1 || value(id) > outstanding);
  const total = sheet.slips.reduce((sum, slip) => sum + (checked.has(slip.id) ? value(slip.id) : 0), 0);
  const anyInvalid = sheet.slips.some((slip) => invalid(slip.id, slip.outstanding));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!checked.size || anyInvalid) return;
    const lines = sheet.slips.filter((slip) => checked.has(slip.id)).map((slip) => ({ slipId: slip.id, amount: value(slip.id) }));
    const result = await pay.run(() => payrollRepository.pay(sheet.id, { paidAt: paidAtInstant(header.paidAt), method: header.method, note: header.note.trim(), lines }));
    if (result) onPaid(result.vouchers.length);
  }
  return <Dialog open size="lg" title="Thanh toán lương" dismissible={!pay.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <form onSubmit={(event) => void submit(event)} noValidate>
      <ErrorNotice error={pay.error} />
      <dl className={`${s.facts} mb-4`} aria-label="Bảng lương cần thanh toán">
        <div><dt>Bảng lương</dt><dd>{sheet.code} · {sheet.name}</dd></div><div><dt>Kỳ làm việc</dt><dd>{rangeLabel(sheet.from, sheet.to)}</dd></div>
        <div><dt>Còn cần trả</dt><dd><Money value={sheet.outstanding} /></dd></div>
      </dl>
      <fieldset disabled={pay.pending} className="min-w-0">
        <div className={s.formGrid}><PaymentHeaderFields value={header} onChange={setHeader} /></div>
        <div className={`${s.payTable} mt-4`}><table className={s.table}>
          <caption className="sr-only">Phiếu lương cần thanh toán</caption>
          <thead><tr><th scope="col" className={s.checkCell}><span className="sr-only">Chọn</span></th><th scope="col">Mã phiếu lương</th><th scope="col">Nhân viên</th><th scope="col" className={s.right}>Lương thực nhận</th><th scope="col" className={s.right}>Đã trả</th><th scope="col" className={s.right}>Còn cần trả</th><th scope="col" className={s.right}>Tiền trả nhân viên</th></tr></thead>
          <tbody>{sheet.slips.map((slip) => {
            const off = slip.outstanding <= 0, bad = submitted && invalid(slip.id, slip.outstanding);
            return <tr key={slip.id}>
              <td className={s.checkCell}><input type="checkbox" aria-label={`Trả ${slip.employeeName}`} disabled={off} checked={checked.has(slip.id)}
                onChange={(event) => setChecked((current) => { const next = new Set(current); if (event.target.checked) next.add(slip.id); else next.delete(slip.id); return next; })} /></td>
              <td className={s.mono}>{slip.code}</td><td>{slip.employeeName}</td><td className={s.right}><Money value={slip.net} /></td><td className={s.right}><Money value={slip.paid} /></td><td className={s.right}><Money value={slip.outstanding} /></td>
              <td className={s.right}><input type="text" inputMode="numeric" aria-label={`Tiền trả ${slip.employeeName}`} aria-invalid={bad || undefined} disabled={off || !checked.has(slip.id)} value={amounts[slip.id] ?? ""}
                onChange={(event) => setAmounts((current) => ({ ...current, [slip.id]: digits(event.target.value) }))} />
                {bad && <div className={s.fieldError} role="alert">Từ 1 đến {new Intl.NumberFormat("vi-VN").format(slip.outstanding)}</div>}</td>
            </tr>;
          })}</tbody>
        </table></div>
        <p className={s.payTotal}>Tổng tiền trả: <strong><Money value={total} /></strong></p>
      </fieldset>
      <div className={s.dialogActions}>
        <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pay.pending} onClick={onClose}>Bỏ qua</Button>
        <Button key="create" className="w-auto" type="submit" isPending={pay.pending} disabled={!checked.size || total < 1}>Tạo phiếu chi</Button>
      </div>
    </form>
  </Dialog>;
}
