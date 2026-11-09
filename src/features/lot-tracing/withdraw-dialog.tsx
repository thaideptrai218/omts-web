"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note } from "@/features/operations/ui";
import type { WithdrawPreview, Withdrawn } from "./withdraw-contracts";
import { maxReasonLength } from "./withdraw-contracts";
import { reasonProblem } from "./withdraw-format";
import { WithdrawalNoticeList } from "./withdrawal-notice-list";
import s from "./lot-tracing.module.css";

type Props = { preview: WithdrawPreview; result?: Withdrawn; pending: boolean; uncertain: boolean; error?: string; onConfirm(reason: string): void; onClose(): void };

/**
 * TRACE-04: thu hồi thông tin nguồn gốc của lô đã công bố. Bước 1 liệt kê khách hàng và hóa đơn sẽ nhận thông báo,
 * bước 2 yêu cầu lý do (chỉ lưu nội bộ) rồi xác nhận. Sau khi thu hồi, hộp thoại giữ nguyên để chủ hợp tác xã thấy khách cần gọi điện.
 */
export function WithdrawDialog({ preview, result, pending, uncertain, error, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState(""), [touched, setTouched] = useState(false);
  const problem = reasonProblem(reason), locked = pending || uncertain;
  const title = result ? "Đã thu hồi thông tin nguồn gốc" : "Thu hồi thông tin nguồn gốc";
  return (
    <Dialog open title={title} size="lg" dismissible={!pending} onOpenChange={(open) => !open && onClose()}>
      <div className={s.dialogBody}>
        <p><strong className={s.code}>{preview.lotCode}</strong></p>
        {result ? (
          <>
            <p role="status" className={s.success}>Trang nguồn gốc của lô {result.lot.lotCode} không còn hiển thị thông tin nguồn gốc.</p>
            <WithdrawalNoticeList notices={result.notices} walkInInvoiceCodes={result.walkInInvoiceCodes} />
            <div className={s.dialogActions}><Button className="w-auto" onClick={onClose}>Đóng</Button></div>
          </>
        ) : (
          <form noValidate onSubmit={(event) => { event.preventDefault(); setTouched(true); if (!problem && !locked) onConfirm(reason.trim()); }}>
            <p className={s.question}>Thu hồi thông tin nguồn gốc của lô {preview.lotCode}? Trang nguồn gốc sẽ chỉ còn hiển thị ngày thu hồi và hệ thống nhắn tin cho các khách hàng dưới đây.</p>
            {preview.noticeCode ? <p className={s.hint}>Không có hóa đơn bán nào đang hiệu lực bán lô này nên không có khách hàng để thông báo.</p> : (
              <WithdrawalAudience preview={preview} />
            )}
            <div className={s.field}>
              <Note label="Lý do thu hồi (chỉ lưu nội bộ, không hiển thị cho khách hàng)" value={reason} maxLength={maxReasonLength} required disabled={locked} aria-invalid={touched && Boolean(problem)} aria-describedby="withdraw-reason-help"
                onChange={(event) => setReason(event.target.value)} onBlur={() => setTouched(true)} />
              <p id="withdraw-reason-help" role={touched && problem ? "alert" : undefined} className={touched && problem ? s.error : s.muted}>{touched && problem ? problem : `Bắt buộc, tối đa ${maxReasonLength} ký tự.`}</p>
            </div>
            <ErrorNotice error={error} />
            {uncertain && <p role="alert" className={s.warn}>Chưa rõ lệnh thu hồi đã được ghi hay chưa. Hệ thống sẽ không gửi lại. Hãy đóng hộp thoại để tải lại trạng thái lô và xem mục Thông báo đã gửi.</p>}
            <div className={s.dialogActions}>
              <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>{uncertain ? "Đóng và kiểm tra lại" : "Hủy"}</Button>
              {!uncertain && <Button className="w-auto" type="submit" variant="danger" isPending={pending} pendingLabel="Đang thu hồi...">Thu hồi nguồn gốc</Button>}
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

/** Khách hàng sẽ được nhắn tin (mỗi khách một lần) và hóa đơn bán lẻ chỉ để chủ hợp tác xã biết. */
function WithdrawalAudience({ preview }: { preview: WithdrawPreview }) {
  return (
    <div>
      <h3 className={s.h3}>Khách hàng sẽ nhận thông báo ({preview.traders.length})</h3>
      {preview.traders.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="sr-only">Khách hàng sẽ nhận thông báo thu hồi</caption>
            <thead><tr><th scope="col">Khách hàng</th><th scope="col">Hóa đơn</th><th scope="col">Số điện thoại</th></tr></thead>
            <tbody>
              {preview.traders.map((trader) => (
                <tr key={trader.customerId}>
                  <th scope="row">{trader.customerName || "—"}</th>
                  <td className={s.code}>{trader.invoiceCodes.join(", ")}</td>
                  <td className={s.code}>{trader.phoneNumber ?? <span className={s.mark}>Chưa có số điện thoại, cần gọi điện</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview.walkInInvoiceCodes.length > 0 && <p className={s.hint}>Hóa đơn bán lẻ không có khách hàng để thông báo: <span className={s.code}>{preview.walkInInvoiceCodes.join(", ")}</span>.</p>}
    </div>
  );
}
