import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import type { SeedForwardTrace } from "./contracts";
import { formatDay, formatNumber, originLabel, originTone } from "./trace-format";
import s from "./lot-tracing.module.css";

/**
 * Truy xuất xuôi từ lô giống / nhà cung cấp: các lô thu hoạch lớn lên từ lô giống đó, hóa đơn đã bán chúng và khách (để báo khi giống lỗi).
 * Tên khách chỉ hiện khi người xem có quyền xem hóa đơn của vùng hóa đơn; không thì ghi rõ là bị ẩn.
 */
export function SeedForwardTable({ result }: { result: SeedForwardTrace }) {
  const invoices = result.lots.reduce((sum, row) => sum + row.invoices.length, 0);
  return (
    <section className={s.card} aria-labelledby="seed-forward-title">
      <div className={s.cardHead}><h2 id="seed-forward-title">Từ lô giống đến khách hàng</h2><span className={s.muted}>{result.lots.length} lô thu hoạch · {invoices} hóa đơn</span></div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th scope="col">Lô thu hoạch</th><th scope="col">Thu hoạch</th><th scope="col">Nguồn gốc</th><th scope="col">Hóa đơn</th><th scope="col">Khách hàng</th><th scope="col" className={s.right}>kg</th></tr></thead>
          <tbody>
            {result.lots.flatMap(({ lot, invoices: rows }) => (rows.length ? rows : [undefined]).map((inv, index) => (
              <tr key={`${lot.id}-${inv?.invoiceId ?? "none"}`}>
                <th scope="row">{index === 0 ? <><Link href={farmingReferenceHref("lot", { code: lot.lotCode })}>{lot.lotCode}</Link><div className={s.muted}>Bè {lot.raftCode} · {lot.zoneCode}</div></> : null}</th>
                <td>{index === 0 ? formatDay(lot.harvestDate) : null}</td>
                <td>{index === 0 ? <StatusPill tone={originTone(lot.originState)}>{originLabel(lot.originState)}</StatusPill> : null}</td>
                {inv ? <>
                  <td><Link href={farmingReferenceHref("salesInvoice", { code: inv.invoiceCode })}>{inv.invoiceCode}</Link><div className={s.muted}>{formatDay(inv.invoiceDate)} · {inv.zoneCode}</div></td>
                  <td>{inv.walkIn ? "Khách lẻ" : inv.customerName ?? <span className={s.muted}>Ẩn (không có quyền xem hóa đơn vùng {inv.zoneCode})</span>}{inv.customerPhone ? <div className={s.muted}>{inv.customerPhone}</div> : null}</td>
                  <td className={s.num}>{formatNumber(inv.kg)}</td>
                </> : <td colSpan={3} className={s.muted}>Lô chưa nằm trên hóa đơn bán nào.</td>}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <p className={s.hint}>Không tính hóa đơn đã hủy. Chỉ gồm các lô thuộc vùng bạn được truy xuất.</p>
    </section>
  );
}
