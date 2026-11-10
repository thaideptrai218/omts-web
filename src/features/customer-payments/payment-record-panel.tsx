"use client";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "@/features/customer-lookup/customer-search";
import { control, ErrorNotice, Field, money, Skeleton } from "@/features/operations/ui";
import { toMoney } from "@/features/sales-invoices/invoice-draft";
import { PaymentQuestionDialog } from "./payment-question-dialog";
import { usePaymentRecorder } from "./use-payment-recorder";
import s from "./payments-screen.module.css";

/** Tab "Ghi nhận": chọn khách, xem công nợ và hóa đơn chưa trả, rồi ghi nhận thanh toán hoặc trả lại tiền. */
export function PaymentRecordPanel({ onRecorded }: { onRecorded: () => void }) {
  const r = usePaymentRecorder(onRecorded), f = r.form, data = r.info.data;
  const paying = f.kind === "Payment", amount = toMoney(f.amount);
  return (
    <div className={s.twoCol}>
      <section className={s.card} aria-labelledby="who-title">
        <h2 id="who-title" className={s.h2}>Khách hàng</h2>
        <CustomerSearch value={f.customer} disabled={r.saving} onSelect={(customer) => r.setForm({ customer, amount: "", collector: "" })} />
        {f.customer && (r.info.loading ? <Skeleton /> : r.info.error ? <p role="alert" className={s.error}>{r.info.error} <Button className="w-auto" variant="secondary" onClick={r.info.reload}>Thử lại</Button></p> : data && (
          <>
            <dl className={s.stats}>
              <div><dt>Công nợ hiện tại</dt><dd className={data.debt > 0 ? s.warn : ""}>{money(data.debt)}</dd></div>
              <div><dt>Cần trả lại khách</dt><dd>{money(data.owedBack)}</dd></div>
              <div><dt>Tuổi nợ</dt><dd>{data.debtAgeDays != null ? `${data.debtAgeDays} ngày` : "—"}</dd></div>
            </dl>
            <h3 className={s.h3}>Hóa đơn chưa trả (cũ nhất trước)</h3>
            {!data.unpaidInvoices.length ? <p className={s.hint}>Khách không có hóa đơn nào chưa trả.</p> : (
              <ul className={s.invoices}>{data.unpaidInvoices.map((i) => (
                <li key={i.id}><div><strong className={s.num}>{i.code}</strong><small>{new Intl.DateTimeFormat("vi-VN").format(new Date(i.invoiceDate))} · {i.ageDays} ngày</small></div><span className={s.num}>{money(i.unpaid)}</span></li>
              ))}</ul>
            )}
          </>
        ))}
      </section>

      <section className={s.card} aria-labelledby="pay-title">
        <div className={s.seg} role="group" aria-label="Loại giao dịch">
          <button type="button" aria-pressed={paying} disabled={r.saving} onClick={() => r.switchKind("Payment")}>Khách thanh toán</button>
          <button type="button" aria-pressed={!paying} disabled={r.saving} onClick={() => r.switchKind("PaidBack")}>Trả lại tiền cho khách</button>
        </div>
        <h2 id="pay-title" className={s.h2}>{paying ? "Ghi nhận khách thanh toán" : "Ghi nhận trả lại tiền"}</h2>
        <div className={s.grid}>
          <Field label="Ngày" type="date" value={f.date} disabled={r.saving} onChange={(e) => r.setForm({ date: e.target.value })} />
          <label className={s.field}><span>Số tiền (₫)</span><input inputMode="numeric" className={`${control} ${s.num}`} placeholder="0" value={f.amount} disabled={r.saving} onChange={(e) => r.setForm({ amount: e.target.value })} /></label>
          <label className={s.field}><span>Hình thức</span>
            <select className={control} value={f.method} disabled={r.saving} onChange={(e) => r.setForm({ method: e.target.value as "Cash" | "OtherTransfer" })}>
              <option value="Cash">Tiền mặt</option><option value="OtherTransfer">Chuyển khoản</option></select></label>
          {f.method === "Cash" && paying && (
            <label className={s.field}><span>Người nhận tiền mặt</span>
              <select className={control} value={f.collector} disabled={r.saving || !data} onChange={(e) => r.setForm({ collector: e.target.value })}>
                <option value="">Chọn người nhận</option>{data?.cashCollectors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          )}
          {f.method === "OtherTransfer" && <Field label="Mã giao dịch ngân hàng" value={f.bankReference} maxLength={100} disabled={r.saving} onChange={(e) => r.setForm({ bankReference: e.target.value })} />}
        </div>
        <label className={s.field}><span>Ghi chú</span><textarea className={control} rows={2} maxLength={500} value={f.note} disabled={r.saving} onChange={(e) => r.setForm({ note: e.target.value })} /></label>
        {!paying && data && <p className={s.hint}>Tối đa được trả lại {money(data.owedBack)}.</p>}
        {amount > 0 && paying && data && data.debt > 0 && amount > data.debt && <p className={s.hint}>Số tiền vượt công nợ: phần dư sẽ thành tiền cần trả lại khách (hệ thống sẽ hỏi xác nhận).</p>}
        <ErrorNotice error={r.error} />
        {r.notice && <p role="status" className={s.ok}>{r.notice}</p>}
        {r.problem && f.customer && f.amount && <p className={s.hint} role="note">{r.problem}</p>}
        <Button isPending={r.saving} pendingLabel="Đang ghi nhận…" disabled={!!r.problem} onClick={() => void r.submit()}>{paying ? "Ghi nhận thanh toán" : "Ghi nhận trả lại"}</Button>
      </section>
      {r.question && <PaymentQuestionDialog question={r.question} />}
    </div>
  );
}
