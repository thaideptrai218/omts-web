"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, money, operationError, useMutation } from "@/features/operations/ui";
import type { PayableEmployee } from "./contracts";
import { PaymentHeaderFields, digits, newPaymentHeader, paidAtInstant } from "./payroll-payment-fields";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** KiotViet "Thanh toán lương" outside a sheet: pay an employee any amount; with nothing outstanding it is an advance (tạm ứng). */
/** With `employee` (opened from the employee profile) the person is fixed and the search is not shown. */
export function StandalonePaymentDialog({ employee, onClose, onPaid }: { employee?: PayableEmployee; onClose(): void; onPaid(): void }) {
  const [results, setResults] = useState<readonly PayableEmployee[]>(), [loadError, setLoadError] = useState<string>(), [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState(""), [includeAll, setIncludeAll] = useState(false), [chosen, setChosen] = useState<PayableEmployee | undefined>(employee);
  const [amount, setAmount] = useState(""), [header, setHeader] = useState(newPaymentHeader), [submitted, setSubmitted] = useState(false);
  const pay = useMutation();
  // Server search, debounced. By default only employees who still have outstanding pay; the advance option lists every active employee.
  useEffect(() => {
    if (employee) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void payrollRepository.payable(search, includeAll, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "success") { setResults(result.data.items); setLoadError(undefined); } else { setResults([]); setLoadError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [employee, search, includeAll, attempt]);
  const options = chosen && !results?.some((employee) => employee.employeeId === chosen.employeeId) ? [chosen, ...(results ?? [])] : results;
  const value = Number(amount || 0);
  const advance = !!chosen && chosen.outstanding <= 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!chosen || value < 1) return;
    const result = await pay.run(() => payrollRepository.payStandalone({ employeeId: chosen.employeeId, amount: value, paidAt: paidAtInstant(header.paidAt), method: header.method, note: header.note.trim() }));
    if (result) onPaid();
  }
  return <Dialog open size="md" title="Thanh toán lương" dismissible={!pay.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <form onSubmit={(event) => void submit(event)} noValidate>
      <ErrorNotice error={loadError ?? pay.error} />
      {loadError && <button type="button" className="mb-3 text-sm underline" onClick={() => { setResults(undefined); setAttempt((count) => count + 1); }}>Tải lại danh sách nhân viên</button>}
      <fieldset disabled={pay.pending} className={`min-w-0 ${s.formGrid}`}>
        {employee ? <><span className={s.label}>Nhân viên</span><strong>{employee.name}</strong></> : <><label htmlFor="payroll-employee-search">Nhân viên</label><div className="grid gap-2">
          <input id="payroll-employee-search" type="search" placeholder="Tìm theo tên hoặc mã nhân viên" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className={s.inline}><input type="checkbox" checked={includeAll} onChange={(event) => { setIncludeAll(event.target.checked); setResults(undefined); }} />Tạm ứng cho nhân viên không còn nợ</label>
          <select aria-label="Chọn nhân viên" value={chosen?.employeeId ?? ""} aria-invalid={submitted && !chosen || undefined} onChange={(event) => setChosen(options?.find((employee) => employee.employeeId === event.target.value))}>
            <option value="">{results ? (results.length ? "Chọn nhân viên" : "Không có nhân viên phù hợp") : "Đang tải..."}</option>
            {options?.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.name} ({employee.code}) - còn cần trả {money(employee.outstanding)}</option>)}
          </select>
        </div></>}
        <label htmlFor="payroll-amount">Số tiền chi</label>
        <div>
          <input id="payroll-amount" type="text" inputMode="numeric" value={amount} aria-invalid={submitted && value < 1 || undefined} aria-describedby={advance ? "payroll-advance-help" : undefined} onChange={(event) => setAmount(digits(event.target.value))} />
          {advance && <p id="payroll-advance-help" className={s.muted}>Nhân viên không còn phiếu lương cần trả: khoản này là tạm ứng lương và sẽ được trừ vào kỳ lương tiếp theo khi chốt lương.</p>}
          {submitted && value < 1 && <p className={s.fieldError} role="alert">Nhập số tiền lớn hơn 0.</p>}
        </div>
        <PaymentHeaderFields value={header} onChange={setHeader} />
      </fieldset>
      <div className={s.dialogActions}>
        <Button key="skip" className="w-auto" variant="secondary" type="button" disabled={pay.pending} onClick={onClose}>Bỏ qua</Button>
        <Button key="create" className="w-auto" type="submit" isPending={pay.pending}>Tạo phiếu chi</Button>
      </div>
    </form>
  </Dialog>;
}
