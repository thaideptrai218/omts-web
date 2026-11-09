"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { control, ErrorNotice, Field, Note } from "@/features/operations/ui";
import { buildCorrection, initialCorrection, type CorrectionFields, type CorrectionForm } from "./invoice-correction-form";
import { InvoiceChangeQuestionDialog } from "./invoice-change-question-dialog";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { vnd } from "./invoice-labels";
import { useInvoiceChange } from "./use-invoice-change";
import s from "./invoice-list.module.css";

type Props = { invoice: InvoiceDetail; onClose(): void; onDone(invoice: InvoiceDetail): void; onReload(): void };

/**
 * Hộp thoại sửa hóa đơn (SALE-07, chỉ Chủ HTX): sửa lỗi nhập liệu hoặc nhập giảm giá sau khiếu nại. PHỤ THUỘC nhánh backend chưa gộp feature/OMTS-224-correct-cancel.
 * Hóa đơn được gửi lại cho khách sau khi sửa; công nợ đổi một lần cùng lượt lưu.
 */
export function InvoiceCorrectionDialog({ invoice, onClose, onDone, onReload }: Props) {
  const [form, setForm] = useState<CorrectionForm>(() => initialCorrection(invoice)), [problem, setProblem] = useState<string>();
  const change = useInvoiceChange<CorrectionFields>("correct", invoice, onDone), busy = change.pending;
  const patch = (next: Partial<CorrectionForm>) => { setForm((f) => ({ ...f, ...next })); setProblem(undefined); };
  const setLine = (key: string, next: Partial<CorrectionForm["lines"][number]>) => patch({ lines: form.lines.map((l) => (l.key === key ? { ...l, ...next } : l)) });
  const lots = [...new Map(form.lines.map((l) => [l.harvestLotId, l.lotCode])).entries()];
  const priceCut = form.kind === "PriceCutAfterClaim";

  function submit() {
    const built = buildCorrection(form, invoice);
    if ("problem" in built) { setProblem(built.problem); return; }
    void change.submit(built.fields);
  }
  return (
    <>
      <Dialog open title={`Sửa hóa đơn ${invoice.code}`} size="lg" dismissible={!busy} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
        <fieldset className="grid gap-1" disabled={busy}><legend className="text-xs font-semibold">Loại chỉnh sửa</legend>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="correction-kind" checked={!priceCut} onChange={() => patch({ kind: "DataEntryError" })} />Sửa lỗi nhập liệu (dòng hàng, giảm giá, thu khác)</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="correction-kind" checked={priceCut} onChange={() => patch({ kind: "PriceCutAfterClaim" })} />Giảm giá sau khiếu nại chất lượng</label>
        </fieldset>
        {priceCut ? (
          <div className={s.field}><Field label="Khoản giảm giá (₫)" inputMode="numeric" value={form.cut} disabled={busy} onChange={(e) => patch({ cut: e.target.value })} />
            <p className={s.muted}>Tổng cộng hiện tại {vnd(invoice.total)}. Các dòng hàng không thay đổi.</p></div>
        ) : (
          <>
            <div role="group" aria-label="Các dòng hàng">
              {form.lines.map((line, index) => (
                <div key={line.key} className={s.lineEditor}>
                  <div><strong>{line.productName}</strong><span className={s.sub}>Lô {line.lotCode}</span></div>
                  <label className={s.field}>kg<input className={control} inputMode="decimal" aria-label={`Dòng ${index + 1}: số kg`} value={line.kg} disabled={busy} onChange={(e) => setLine(line.key, { kg: e.target.value })} /></label>
                  <label className={s.field}>Đơn giá (₫)<input className={control} inputMode="numeric" aria-label={`Dòng ${index + 1}: đơn giá`} value={line.unitPrice} disabled={busy} onChange={(e) => setLine(line.key, { unitPrice: e.target.value })} /></label>
                  <Button type="button" className="w-auto" variant="secondary" disabled={busy || form.lines.length === 1} onClick={() => patch({ lines: form.lines.filter((l) => l.key !== line.key) })}>Bỏ dòng</Button>
                </div>))}
            </div>
            <fieldset className="mt-3 grid gap-1" disabled={busy}><legend className="text-xs font-semibold">Đã bán hết lô</legend>
              {lots.map(([lot, code]) => (
                <label key={lot} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!form.notWholeLots.includes(lot)}
                  onChange={(e) => patch({ notWholeLots: e.target.checked ? form.notWholeLots.filter((x) => x !== lot) : [...form.notWholeLots, lot] })} />Lô {code}</label>))}
            </fieldset>
            <div className={s.formGrid}>
              <div className={s.field}><Field label="Giảm giá (₫)" inputMode="numeric" value={form.discount} disabled={busy} onChange={(e) => patch({ discount: e.target.value })} /></div>
              <div className={s.field}><Field label="Thu khác (₫)" inputMode="numeric" value={form.otherCharges} disabled={busy} onChange={(e) => patch({ otherCharges: e.target.value })} /></div>
            </div>
          </>
        )}
        <div className={s.field}><Note label="Lý do sửa (bắt buộc)" maxLength={500} value={form.reason} disabled={busy} onChange={(e) => patch({ reason: e.target.value })} /></div>
        <ErrorNotice error={problem ?? change.error} />
        {change.blocked && <p role="alert" className={s.warning}>Chưa xác nhận được kết quả. <button type="button" className={s.linkButton} onClick={onReload}>Tải lại hóa đơn để đối chiếu</button></p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Đóng</Button>
          <Button type="button" className="w-auto" isPending={busy} disabled={change.blocked} onClick={submit}>Lưu chỉnh sửa</Button>
        </div>
      </Dialog>
      {change.question && <InvoiceChangeQuestionDialog question={change.question} action="correction" onAnswer={change.answer} onBack={change.dismissQuestion} />}
    </>
  );
}
