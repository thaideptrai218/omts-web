"use client";
import Link from "next/link";
import { invoiceHref } from "@/features/customers/customer-links";
import type { EndOfDayReport, MoneyEntry } from "./end-of-day-contracts";
import { clockTime, EmptyNote, EndOfDaySection, FUND_LABEL, SOURCE_LABEL } from "./end-of-day-parts";
import styles from "./end-of-day-report.module.css";
import { count, kg, vnd } from "./report-format";
import { ReportTable, ReportTiles, type ReportColumn } from "./report-parts";

type Invoice = EndOfDayReport["sales"]["invoices"][number];
type SaleReturn = EndOfDayReport["sales"]["returns"][number];
type Fund = EndOfDayReport["money"]["byFund"][number];
type Product = EndOfDayReport["goods"]["products"][number];
type Lot = EndOfDayReport["goods"]["lots"][number];

/** Khối 1 - Bán hàng: hóa đơn hoàn tất và hàng trả trong ngày, kèm số đã thu ngay lúc lập hóa đơn. */
export function SalesSection({ sales }: Readonly<{ sales: EndOfDayReport["sales"] }>) {
  const { totals } = sales;
  const invoiceColumns: ReportColumn<Invoice>[] = [
    { key: "code", header: "Mã hóa đơn", cell: (row) => <Link href={invoiceHref(row.code)} className="font-semibold text-primary underline">{row.code}</Link>, total: "Tổng" },
    { key: "time", header: "Giờ", cell: (row) => clockTime(row.invoicedAt) },
    { key: "customer", header: "Khách hàng", cell: (row) => row.customer?.name ?? "Khách lẻ" },
    { key: "zone", header: "Vùng nuôi", cell: (row) => row.zoneName },
    { key: "kg", header: "Khối lượng", numeric: true, cell: (row) => kg(row.kg), total: kg(totals.kg) },
    { key: "total", header: "Tổng tiền", numeric: true, cell: (row) => vnd(row.total), total: vnd(totals.revenue) },
    { key: "paid", header: "Đã thu ngay", numeric: true, cell: (row) => vnd(row.paidNow), total: vnd(totals.paidNow) },
  ];
  const returnColumns: ReportColumn<SaleReturn>[] = [
    { key: "code", header: "Mã phiếu trả", cell: (row) => row.code, total: "Tổng" },
    { key: "invoice", header: "Hóa đơn gốc", cell: (row) => <Link href={invoiceHref(row.invoiceCode)} className="text-primary underline">{row.invoiceCode}</Link> },
    { key: "customer", header: "Khách hàng", cell: (row) => row.customerName ?? "Khách lẻ" },
    { key: "zone", header: "Vùng nuôi", cell: (row) => row.zoneName },
    { key: "value", header: "Giá trị trả", numeric: true, cell: (row) => vnd(row.value), total: vnd(totals.returnValue) },
  ];
  return (
    <EndOfDaySection title="Bán hàng" summary={`${count(totals.invoiceCount)} hóa đơn · thuần ${vnd(totals.netRevenue)}`}>
      <ReportTiles label="Tổng hợp bán hàng trong ngày" tiles={[
        { label: "Số hóa đơn", value: count(totals.invoiceCount) },
        { label: "Doanh thu", value: vnd(totals.revenue) },
        { label: "Hàng trả", value: vnd(totals.returnValue), hint: `${count(totals.returnCount)} phiếu trả` },
        { label: "Doanh thu thuần", value: vnd(totals.netRevenue) },
        { label: "Đã thu ngay", value: vnd(totals.paidNow), hint: "Tiền thu lúc lập hóa đơn" },
      ]} />
      <h3 className={styles.subTitle}>Hóa đơn bán</h3>
      {sales.invoices.length ? <ReportTable caption="Hóa đơn bán trong ngày" columns={invoiceColumns} rows={sales.invoices} rowKey={(row) => row.id} /> : <EmptyNote>Không có hóa đơn bán nào trong ngày.</EmptyNote>}
      <h3 className={styles.subTitle}>Hàng trả</h3>
      {sales.returns.length ? <ReportTable caption="Hàng trả trong ngày" columns={returnColumns} rows={sales.returns} rowKey={(row) => row.id} /> : <EmptyNote>Không có phiếu trả hàng nào trong ngày.</EmptyNote>}
    </EndOfDaySection>
  );
}

/** Khối 2 - Thu chi: các dòng sổ quỹ trong ngày, gom theo quỹ (tiền mặt, ngân hàng, ví điện tử). */
export function MoneySection({ money }: Readonly<{ money: EndOfDayReport["money"] }>) {
  const { totals } = money;
  const fundColumns: ReportColumn<Fund>[] = [
    { key: "fund", header: "Quỹ", cell: (row) => FUND_LABEL[row.fund], total: "Tổng" },
    { key: "receipts", header: "Thu", numeric: true, cell: (row) => vnd(row.receipts), total: vnd(totals.receipts) },
    { key: "payments", header: "Chi", numeric: true, cell: (row) => vnd(row.payments), total: vnd(totals.payments) },
    { key: "net", header: "Chênh lệch", numeric: true, cell: (row) => vnd(row.net), total: vnd(totals.net) },
  ];
  const entryColumns: ReportColumn<MoneyEntry>[] = [
    { key: "time", header: "Giờ", cell: (row) => clockTime(row.occurredAt) },
    { key: "code", header: "Mã phiếu", cell: (row) => row.code ?? "—" },
    { key: "source", header: "Nguồn", cell: (row) => SOURCE_LABEL[row.source] ?? "Thu chi khác" },
    { key: "fund", header: "Quỹ", cell: (row) => FUND_LABEL[row.fund] },
    { key: "party", header: "Đối tượng", cell: (row) => row.partyName ?? "—" },
    { key: "receipt", header: "Thu", numeric: true, cell: (row) => row.direction === "Receipt" ? vnd(row.amount) : "" },
    { key: "payment", header: "Chi", numeric: true, cell: (row) => row.direction === "Payment" ? vnd(row.amount) : "" },
    { key: "note", header: "Ghi chú", cell: (row) => row.note ?? "" },
  ];
  return (
    <EndOfDaySection title="Thu chi" summary={`Thu ${vnd(totals.receipts)} · chi ${vnd(totals.payments)}`}>
      <ReportTiles label="Tổng hợp thu chi trong ngày" tiles={[
        { label: "Tổng thu", value: vnd(totals.receipts) },
        { label: "Tổng chi", value: vnd(totals.payments) },
        { label: "Chênh lệch", value: vnd(totals.net) },
      ]} />
      <h3 className={styles.subTitle}>Theo quỹ</h3>
      {money.byFund.length ? <ReportTable caption="Thu chi theo quỹ" columns={fundColumns} rows={money.byFund} rowKey={(row) => row.fund} /> : <EmptyNote>Không có khoản thu chi nào trong ngày.</EmptyNote>}
      <h3 className={styles.subTitle}>Chi tiết thu chi</h3>
      {money.entries.length ? <ReportTable caption="Chi tiết thu chi trong ngày" columns={entryColumns} rows={money.entries} rowKey={(row) => `${row.source}:${row.code ?? row.occurredAt}:${row.direction}:${row.fund}`} /> : <EmptyNote>Không có dòng sổ quỹ nào trong ngày.</EmptyNote>}
      <p className={styles.note}>Tiền mặt đang chờ Kế toán xác nhận chưa vào sổ quỹ nhưng đã nằm trong số &ldquo;Đã thu ngay&rdquo; của hóa đơn.</p>
    </EndOfDaySection>
  );
}

/** Khối 3 - Hàng hóa: kg bán theo sản phẩm và các lô thu hoạch đã cân trong ngày. */
export function GoodsSection({ goods }: Readonly<{ goods: EndOfDayReport["goods"] }>) {
  const { totals } = goods;
  const productColumns: ReportColumn<Product>[] = [
    { key: "code", header: "Mã sản phẩm", cell: (row) => row.code ?? "—", total: "Tổng" },
    { key: "name", header: "Sản phẩm", cell: (row) => row.name },
    { key: "kg", header: "Khối lượng bán", numeric: true, cell: (row) => kg(row.kg), total: kg(totals.soldKg) },
  ];
  const lotColumns: ReportColumn<Lot>[] = [
    { key: "code", header: "Mã lô", cell: (row) => row.lotCode, total: "Tổng" },
    { key: "zone", header: "Vùng nuôi", cell: (row) => row.zoneName },
    { key: "time", header: "Giờ cân", cell: (row) => clockTime(row.weighedAt) },
    { key: "kg", header: "Khối lượng cân", numeric: true, cell: (row) => kg(row.weighedKg), total: kg(totals.weighedKg) },
  ];
  return (
    <EndOfDaySection title="Hàng hóa" summary={`Bán ${kg(totals.soldKg)} · ${count(totals.lotCount)} lô đã cân`}>
      <h3 className={styles.subTitle}>Hàng bán theo sản phẩm</h3>
      {goods.products.length ? <ReportTable caption="Khối lượng bán theo sản phẩm" columns={productColumns} rows={goods.products} rowKey={(row) => row.productId} /> : <EmptyNote>Không có hàng bán nào trong ngày.</EmptyNote>}
      <h3 className={styles.subTitle}>Lô thu hoạch đã cân</h3>
      {goods.lots.length ? <ReportTable caption="Lô thu hoạch đã cân trong ngày" columns={lotColumns} rows={goods.lots} rowKey={(row) => row.id} /> : <EmptyNote>Không có lô thu hoạch nào được cân trong ngày.</EmptyNote>}
    </EndOfDaySection>
  );
}
