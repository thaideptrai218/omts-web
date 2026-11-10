"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "@/features/customer-lookup/customer-search";
import { control, ErrorNotice, money, useRemote } from "@/features/operations/ui";
import { createOperationsRepository } from "@/features/operations/repository";
import { openPurchaseRequest } from "./contracts";
import type { Draft, PaymentMode, Totals } from "./invoice-draft";
import s from "./invoice-screen.module.css";

const sales = createOperationsRepository("sales-invoices");
/** `saving` = khóa nhập liệu (đang gửi hoặc đang có giao dịch VietQR chờ); `savingMode` = cách thanh toán đang được gửi. */
type Props = { draft: Draft; sums: Totals; problem?: string; error?: string; saving: boolean; savingMode?: PaymentMode; canVietQr: boolean; onChange(update: (d: Draft) => Draft): void; onSubmit(mode: PaymentMode): void };

/** Cột phải (dính khi cuộn): khách hàng, yêu cầu mua, tổng tiền, thanh toán và nút lập hóa đơn. */
export function InvoiceSummaryPanel({ draft, sums, problem, error, saving, savingMode, canVietQr, onChange, onSubmit }: Props) {
  return (
    <aside id="invoice-summary" className={s.summary} aria-label="Tổng tiền và thanh toán">
      <section className={s.card}>
        <h2 className={s.h2}>Khách hàng</h2>
        <div className={s.seg} role="group" aria-label="Loại khách">
          <button type="button" aria-pressed={draft.walkIn} disabled={saving} onClick={() => onChange((d) => ({ ...d, walkIn: true, customer: null, requestId: null }))}>Khách lẻ</button>
          <button type="button" aria-pressed={!draft.walkIn} disabled={saving} onClick={() => onChange((d) => ({ ...d, walkIn: false }))}>Khách có hồ sơ</button>
        </div>
        {!draft.walkIn && <CustomerPicker draft={draft} disabled={saving} onChange={onChange} />}
      </section>

      <section className={s.card} aria-live="polite">
        <h2 className={s.h2}>Tổng tiền</h2>
        <dl className={s.sums}>
          <div><dt>Tổng khối lượng</dt><dd>{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(sums.totalKg)} kg</dd></div>
          <div><dt>Tiền hàng</dt><dd>{money(sums.subtotal)}</dd></div>
        </dl>
        <MoneyField label="Giảm giá" value={draft.discount} disabled={saving} onChange={(v) => onChange((d) => ({ ...d, discount: v }))} />
        <MoneyField label="Thu khác" value={draft.otherCharges} disabled={saving} onChange={(v) => onChange((d) => ({ ...d, otherCharges: v }))} />
        <p className={s.total}><span>Tổng cộng</span><strong className={s.num}>{money(sums.total)}</strong></p>
      </section>

      <section className={s.card}>
        <h2 className={s.h2}>Thanh toán</h2>
        <MoneyField label="Tiền mặt nhận" value={draft.cash} disabled={saving} onChange={(v) => onChange((d) => ({ ...d, cash: v }))} />
        {sums.rest > 0 && (
          <label className={s.check}><input type="checkbox" checked={draft.payLater} disabled={saving} onChange={(e) => onChange((d) => ({ ...d, payLater: e.target.checked }))} />
            <span>Ghi nợ phần còn lại <strong>{money(sums.rest)}</strong><small>Cần Chủ hợp tác xã đồng ý.</small></span></label>
        )}
        {sums.extra > 0 && <p className={s.hint}>Khách đưa dư {money(sums.extra)}: hệ thống sẽ hỏi trừ vào công nợ hay trả lại.</p>}
        <ErrorNotice error={error} />
        {problem && draft.lines.length > 0 && <p className={s.hint} role="note">{problem}</p>}
        <div className={s.payActions}>
          <Button isPending={savingMode === "standard"} pendingLabel="Đang lập hóa đơn…" disabled={!!problem || saving} onClick={() => onSubmit("standard")}>Lập hóa đơn</Button>
          <Button variant="secondary" isPending={savingMode === "vietQr"} pendingLabel="Đang tạo mã VietQR…" disabled={!canVietQr || saving} onClick={() => onSubmit("vietQr")}>Thanh toán VietQR</Button>
        </div>
        {canVietQr && <p className={s.hint}>VietQR thu {money(sums.rest)} bằng chuyển khoản; hóa đơn được lưu khi ngân hàng báo đã nhận tiền.</p>}
      </section>
    </aside>
  );
}

function MoneyField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange(v: string): void }) {
  return <label className={s.field}><span>{label}</span><input inputMode="numeric" className={`${control} ${s.num}`} placeholder="0" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function CustomerPicker({ draft, disabled, onChange }: { draft: Draft; disabled: boolean; onChange: Props["onChange"] }) {
  const requests = useRemote(useCallback((signal: AbortSignal) => draft.customer ? sales.read("open-requests", { customerId: draft.customer.id }, z.array(openPurchaseRequest), signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [draft.customer]));
  return (
    <div className={s.stack}>
      <CustomerSearch value={draft.customer} disabled={disabled} onSelect={(customer) => onChange((d) => ({ ...d, customer, requestId: null }))} />
      {draft.customer && !!requests.data?.length && (
        <label className={s.field}><span>Liên kết yêu cầu mua</span>
          <SelectBox className={control} disabled={disabled} value={draft.requestId ?? ""} onChange={(e) => onChange((d) => ({ ...d, requestId: e.target.value || null }))}>
            <option value="">Không liên kết</option>
            {requests.data.map((r) => <option key={r.id} value={r.id}>{r.productName} · {r.acceptedKg} kg · lấy {r.pickupDate}</option>)}
          </SelectBox></label>
      )}
    </div>
  );
}
