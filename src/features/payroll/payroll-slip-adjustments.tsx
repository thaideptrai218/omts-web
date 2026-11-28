"use client";
import { useState } from "react";
import { MoneyInput } from "@/components/form/money-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, Money, useMutation } from "@/features/operations/ui";
import { adjustmentLine, maxAdjustmentLines, maxAdjustmentReason, type AdjustmentLine, type SlipDetail } from "./contracts";
import { adjustmentTotals } from "./payroll-model";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

export type Draft = { key: number; kind: AdjustmentLine["kind"]; amount: number | null; reason: string };
const kindText: Record<AdjustmentLine["kind"], string> = { Bonus: "+ Thưởng", Deduction: "− Khấu trừ" };
const sign = (kind: AdjustmentLine["kind"]) => kind === "Bonus" ? "+" : "−";

/** Why a draft cannot be sent, as one sentence; the same rules the backend answers 400 for, so the Owner fixes them before the request. */
export function adjustmentIssue(drafts: readonly Draft[], slip: Pick<SlipDetail, "mainPay" | "shiftPay">): string | undefined {
  if (drafts.length > maxAdjustmentLines) return `Tối đa ${maxAdjustmentLines} dòng thưởng hoặc khấu trừ.`;
  for (const [index, draft] of drafts.entries()) {
    const parsed = adjustmentLine.safeParse({ kind: draft.kind, amount: draft.amount ?? 0, reason: draft.reason });
    if (parsed.success) continue;
    const field = parsed.error.issues[0]?.path[0];
    return field === "amount" ? `Dòng ${index + 1}: nhập số tiền là số nguyên từ 1 đồng.` : `Dòng ${index + 1}: nhập lý do, tối đa ${maxAdjustmentReason} ký tự.`;
  }
  const { bonus, deduction } = adjustmentTotals(drafts.map(draft => ({ kind: draft.kind, amount: draft.amount ?? 0 })));
  return deduction > slip.mainPay + slip.shiftPay + bonus ? "Khấu trừ không được lớn hơn thu nhập của phiếu lương." : undefined;
}

/** The + and − lines of a payslip with their reasons, read only: the explanation behind the Thưởng and Khấu trừ rows. */
export function PayrollSlipAdjustmentList({ slip }: { slip: Pick<SlipDetail, "adjustments"> }) {
  if (!slip.adjustments.length) return null;
  return <section className={s.adjustments} aria-label="Thưởng và khấu trừ">
    <h4 className={s.sectionTitle}>Thưởng / Khấu trừ</h4>
    <div className={s.subTable}><table className={s.table}><caption className="sr-only">Thưởng và khấu trừ của phiếu lương</caption>
      <thead><tr><th scope="col">Loại</th><th scope="col" className={s.right}>Số tiền</th><th scope="col">Lý do</th></tr></thead>
      <tbody>{slip.adjustments.map((line, index) => <tr key={index}><td>{kindText[line.kind]}</td><td className={s.right}>{sign(line.kind)}<Money value={line.amount} /></td><td className={s.wrap}>{line.reason}</td></tr>)}</tbody>
    </table></div>
  </section>;
}

/**
 * "Thưởng / Khấu trừ — PL…": the + lines and the − lines of an internal employee's payslip in two sections, each line an amount and a reason.
 * A save replaces the whole list (PUT adjustments); the sheet recalculates and `onSaved` makes the payslip and the sheet read themselves again.
 */
export function PayrollAdjustmentsDialog({ slip, onClose, onSaved }: { slip: SlipDetail; onClose(): void; onSaved(): void }) {
  const initial = (): Draft[] => slip.adjustments.map((line, index) => ({ key: index, kind: line.kind, amount: line.amount, reason: line.reason }));
  const [drafts, setDrafts] = useState<Draft[]>(initial), [next, setNext] = useState(slip.adjustments.length), [issue, setIssue] = useState<string>();
  const mutation = useMutation(), { notify } = useToast();
  const changed = drafts.length !== slip.adjustments.length || drafts.some((draft, index) => { const line = slip.adjustments[index]; return draft.kind !== line.kind || draft.amount !== line.amount || draft.reason !== line.reason; });
  const update = (key: number, patch: Partial<Draft>) => { setIssue(undefined); setDrafts(current => current.map(draft => draft.key === key ? { ...draft, ...patch } : draft)); };
  const add = (kind: Draft["kind"]) => { setIssue(undefined); setDrafts(current => [...current, { key: next, kind, amount: null, reason: "" }]); setNext(next + 1); };
  async function save() {
    if (mutation.busy()) return;
    // Bonus lines first, then deductions, so the saved order matches the two sections.
    const ordered = [...drafts.filter(draft => draft.kind === "Bonus"), ...drafts.filter(draft => draft.kind === "Deduction")];
    const found = adjustmentIssue(ordered, slip);
    if (found) { setIssue(found); return; }
    setIssue(undefined);
    const saved = await mutation.run(() => payrollRepository.saveAdjustments(slip.id, { items: ordered.map(draft => ({ kind: draft.kind, amount: draft.amount!, reason: draft.reason.trim() })) }));
    if (!saved) return;
    notify({ tone: "success", title: `Đã lưu thưởng và khấu trừ của ${slip.employeeName}.` });
    onSaved();
    onClose();
  }
  const section = (kind: Draft["kind"], title: string, addLabel: string) => {
    const rows = drafts.filter(draft => draft.kind === kind);
    return <section className={s.adjustments} aria-label={title}>
      <h4 className={s.sectionTitle}>{title}</h4>
      <div className={s.subTable}><table className={s.table}><caption className="sr-only">{title}</caption>
        <thead><tr><th scope="col">Số tiền</th><th scope="col">Lý do</th><th scope="col"><span className="sr-only">Xóa dòng</span></th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={3} className={s.emptyCell}>Chưa có dòng nào.</td></tr> : rows.map((draft, index) => <tr key={draft.key}>
          <td><MoneyInput label={`${title}, dòng ${index + 1}: số tiền`} autoThousands min={1} value={draft.amount} disabled={mutation.pending} onChange={amount => update(draft.key, { amount })} /></td>
          <td><input className="omts-control" aria-label={`${title}, dòng ${index + 1}: lý do`} maxLength={maxAdjustmentReason} value={draft.reason} disabled={mutation.pending} onChange={event => update(draft.key, { reason: event.target.value })} /></td>
          <td><button type="button" className={s.removeButton} aria-label={`Xóa ${title.toLowerCase()}, dòng ${index + 1}`} title="Xóa dòng" disabled={mutation.pending} onClick={() => { setIssue(undefined); setDrafts(current => current.filter(item => item.key !== draft.key)); }}><InterfaceIcon name="trash" className="size-4" /></button></td>
        </tr>)}</tbody>
      </table></div>
      <div className={s.adjustActions}><Button className="w-auto" variant="secondary" type="button" disabled={mutation.pending || drafts.length >= maxAdjustmentLines} onClick={() => add(kind)}><InterfaceIcon name="add" className="mr-1 size-4" />{addLabel}</Button></div>
    </section>;
  };

  return <Dialog open size="lg" title={`Thưởng / Khấu trừ — ${slip.code}`} onOpenChange={open => { if (!open) onClose(); }}>
    <p className={s.muted}>{slip.employeeName}: thêm dòng thưởng, phụ cấp (+) hoặc khấu trừ (−) kèm lý do. Lưu xong, bảng lương tính lại thực nhận.</p>
    {section("Bonus", "Thưởng (+)", "Thêm thưởng")}
    {section("Deduction", "Khấu trừ (−)", "Thêm khấu trừ")}
    {issue && <p role="alert" className={s.fieldError}>{issue}</p>}
    <ErrorNotice error={mutation.failure?.hrProblem?.hint ?? mutation.error} />
    <footer className={s.footer}><div /><div>
      <Button className="w-auto" variant="secondary" type="button" disabled={mutation.pending} onClick={onClose}>Bỏ qua</Button>
      <Button className="w-auto" type="button" isPending={mutation.pending} disabled={!changed} onClick={() => void save()}>Lưu thưởng / khấu trừ</Button>
    </div></footer>
  </Dialog>;
}

/** The small reference-style icon button next to the Thưởng and Khấu trừ rows; it opens the adjustments popup. */
export function AdjustmentsButton({ label, onClick }: { label: string; onClick(): void }) {
  return <button type="button" className={s.reference} title={label} aria-label={label} onClick={onClick}><InterfaceIcon name="link" /></button>;
}
