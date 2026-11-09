"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the payroll payment cancel endpoint once available.
 * SCR-LABOR-11 "Hủy thanh toán lương" dialog. The confirm button stays disabled.
 */
import { Dialog } from "@/components/ui/dialog";
import { Note } from "@/features/operations/ui";
import { PayrollDialogFooter } from "./payroll-dialogs";
import s from "./payroll-frame.module.css";

const SLIP_FIELDS = ["Mã phiếu chi", "Nhân viên", "Bảng lương", "Ngày thanh toán", "Số tiền", "Phương thức", "Người ghi nhận", "Trạng thái"] as const;

export function PayrollCancelPaymentDialog({ onClose }: Readonly<{ onClose(): void }>) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Hủy thanh toán lương" size="lg">
      <form className={s.dialogForm} onSubmit={(event) => event.preventDefault()}>
        <div className={s.split}>
          <section aria-labelledby="payroll-cancel-slip">
            <h3 id="payroll-cancel-slip" className={s.sub}>Phiếu chi lương cần hủy</h3>
            {/* TODO(api): values come from the selected payroll payment voucher. */}
            <dl className={s.rows}>{SLIP_FIELDS.map((field) => <div key={field}><dt>{field}</dt><dd>—</dd></div>)}</dl>
          </section>
          <section aria-labelledby="payroll-cancel-reason">
            <h3 id="payroll-cancel-reason" className={s.sub}>Lý do hủy</h3>
            <Note label="Lý do hủy thanh toán *" required data-dialog-initial-focus />
            <p className={s.muted}>Sau khi hủy, khoản này không còn tính là đã trả; số còn nợ của nhân viên tăng lại. Chủ hợp tác xã nhận thông báo.</p>
          </section>
        </div>
        <PayrollDialogFooter onClose={onClose} confirmLabel="Hủy thanh toán" danger />
      </form>
    </Dialog>
  );
}
