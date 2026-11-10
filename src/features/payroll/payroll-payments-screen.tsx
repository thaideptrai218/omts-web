"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the payroll sheet payable-lines endpoint
 * (employees with outstanding pay, bank accounts) and the record-payroll-payment endpoint once available.
 * SCR-LABOR-11 "Thanh toán lương". Layout shell: no fetch, no mock data.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OperationHeading, Field, Note } from "@/features/operations/ui";
import { FrameTable } from "@/features/sales-reports/frame-parts";
import s from "./payroll-frame.module.css";

const HEADINGS = ["Nhân viên", "Lương (₫)", "Đã trả (₫)", "Còn nợ (₫)", "Tài khoản ngân hàng", "Số tiền trả lần này (₫)"];

export function PayrollPaymentsScreen() {
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [paidOn, setPaidOn] = useState("");
  const transfer = method === "transfer";
  return (
    <section>
      <button type="button" className={s.back} onClick={() => window.history.back()}><span aria-hidden="true">←</span> Quay lại bảng lương</button>
      <OperationHeading title="Thanh toán lương" description="Bảng lương — · Trạng thái — · Kỳ lương —" icon="payment" />
      <div className={s.payLayout}>
        <section className={s.card} aria-labelledby="payroll-payable-title">
          <h2 id="payroll-payable-title">Lao động thời vụ còn nợ lương của bảng lương — (kể cả nhân viên đã nghỉ)</h2>
          {/* TODO(api): payable rows (employee, pay, paid, outstanding, bank account); ticking a row selects it and the amount defaults to the outstanding balance. */}
          <FrameTable caption="Nhân viên còn nợ lương" headings={HEADINGS} rightAligned={[1, 2, 3, 5]} />
          <p className={s.muted}>Bấm ô chọn để chọn nhân viên; số tiền trả mặc định là số còn nợ và sửa được (không lớn hơn số còn nợ). Nhân viên cơ hữu không có lương trả qua OMTS.</p>
        </section>
        <form className={s.card} aria-labelledby="payroll-common-title" onSubmit={(event) => event.preventDefault()}>
          <h2 id="payroll-common-title">Thông tin thanh toán chung cho các nhân viên đã chọn</h2>
          <div className={s.dialogForm}>
            <Field type="date" label="Ngày thanh toán *" required value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
            <fieldset className={s.group}>
              <legend>Phương thức *</legend>
              <label className={s.check}><input type="radio" name="payroll-method" checked={!transfer} onChange={() => setMethod("cash")} />Tiền mặt</label>
              <label className={s.check}><input type="radio" name="payroll-method" checked={transfer} onChange={() => setMethod("transfer")} />Chuyển khoản</label>
            </fieldset>
            <Field label={transfer ? "Mã tham chiếu ngân hàng (bắt buộc khi chuyển khoản) *" : "Mã tham chiếu ngân hàng (bắt buộc khi chuyển khoản)"} required={transfer} autoComplete="off" />
            <Note label="Ghi chú" />
            <p className={s.lineStrong}><span>Tổng số tiền trả lần này (0 nhân viên)</span><span>—</span></p>
            <div className={s.dialogFoot}>
              {/* TODO(api): record the payment for the selected employees (ticked rows, common date, method, reference, note). */}
              <Button className="w-auto" disabled aria-disabled="true">Ghi nhận thanh toán</Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
