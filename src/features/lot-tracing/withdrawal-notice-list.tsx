import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { StatusPill } from "@/components/ui/management-page";
import type { WithdrawalNotice } from "./withdraw-contracts";
import { channelLabel, deliveryLabel, deliveryTone, toCallCount } from "./withdraw-format";
import s from "./lot-tracing.module.css";

type Props = { notices: readonly WithdrawalNotice[]; walkInInvoiceCodes: readonly string[] };

/** Danh sách thông báo thu hồi theo khách hàng, kèm trạng thái gửi; khách có `toCall` được nêu rõ để chủ hợp tác xã gọi điện (BR-TRACE-07). */
export function WithdrawalNoticeList({ notices, walkInInvoiceCodes }: Props) {
  const calls = toCallCount(notices);
  return (
    <div>
      {calls > 0 && <p role="alert" className={s.warn}>Có {calls} khách hàng chưa nhận được tin nhắn. Hãy gọi điện báo cho họ.</p>}
      {notices.length === 0 ? <p className={s.hint}>Không có khách hàng nào được gửi thông báo.</p> : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="sr-only">Thông báo thu hồi đã gửi cho khách hàng</caption>
            <thead><tr><th scope="col">Khách hàng</th><th scope="col">Hóa đơn</th><th scope="col">Số điện thoại</th><th scope="col">Trạng thái gửi</th><th scope="col">Trong ứng dụng</th></tr></thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.customerId}>
                  <th scope="row">{notice.customerName || "—"}</th>
                  <td className={s.code}>{notice.invoiceCodes.map(code => <Link key={code} className="mr-2 underline" href={farmingReferenceHref("salesInvoice", { code })}>{code}</Link>)}</td>
                  <td className={s.code}>{notice.phoneNumber ?? "Chưa có số điện thoại"}</td>
                  <td><StatusPill tone={deliveryTone(notice.deliveryStatusId)}>{channelLabel(notice.channel)}: {deliveryLabel(notice.deliveryStatusId)}</StatusPill>{notice.toCall && <span className={s.mark}>Cần gọi điện</span>}</td>
                  <td>{notice.notifiedInApp ? "Đã gửi" : "Không có tài khoản"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {walkInInvoiceCodes.length > 0 && <p className={s.hint}>Hóa đơn bán lẻ không có khách hàng để thông báo: <span className={s.code}>{walkInInvoiceCodes.map(code => <Link key={code} className="mr-2 underline" href={farmingReferenceHref("salesInvoice", { code })}>{code}</Link>)}</span>.</p>}
    </div>
  );
}
