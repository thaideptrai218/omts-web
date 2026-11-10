import type { LotTrace } from "./contracts";
import { formatDay, formatNumber } from "./trace-format";
import s from "./lot-tracing.module.css";

/** Truy xuất xuôi (TRACE-02 bước 2-3): hóa đơn bán có lô này, thương lái và số kg. Không tính hóa đơn đã hủy; giá chỉ hiện khi người xem có quyền xem hóa đơn. */
export function TraceForwardPanel({ trace }: { trace: LotTrace }) {
  return (
    <section className={s.card} aria-labelledby="forward-title">
      <div className={s.cardHead}><h2 id="forward-title">Truy xuất xuôi</h2><span className={s.muted}>{trace.invoices.length} hóa đơn</span></div>
      {!trace.invoices.length ? <p className={s.empty}>Lô này chưa nằm trên hóa đơn bán nào.</p> : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th scope="col">Hóa đơn</th><th scope="col">Ngày</th><th scope="col">Thương lái</th><th scope="col">Sản phẩm</th><th scope="col" className={s.right}>kg</th></tr></thead>
            <tbody>
              {trace.invoices.flatMap((inv) => [
                <tr key={inv.invoiceId}>
                  <th scope="row">{inv.invoiceCode}<div className={s.muted}>{inv.zoneCode}</div></th><td>{formatDay(inv.invoiceDate)}</td>
                  <td>{inv.walkIn ? "Khách lẻ" : inv.customerName ?? "—"}{inv.customerPhone ? <div className={s.muted}>{inv.customerPhone}</div> : null}</td>
                  <td>{inv.lines.map((l) => l.productName).join(", ") || "—"}</td><td className={s.num}>{formatNumber(inv.kg)}</td>
                </tr>,
                ...inv.returns.map((r) => <tr key={r.id}><th scope="row" className={s.muted}>Trả hàng {r.code}</th><td>{formatDay(r.returnDate)}</td><td className={s.muted}>{inv.customerName ?? "Khách lẻ"} ({inv.invoiceCode})</td><td>—</td><td className={s.num}>−{formatNumber(r.kg)}</td></tr>),
              ])}
            </tbody>
            <tfoot><tr><th scope="row" colSpan={4}>Tổng kg của lô trên hóa đơn</th><td className={s.num}><strong>{formatNumber(trace.invoicedKg)}</strong></td></tr></tfoot>
          </table>
        </div>
      )}
      <p className={s.hint}>Không tính hóa đơn đã hủy; hóa đơn đã sửa hiện theo giá trị mới nhất.</p>
    </section>
  );
}
