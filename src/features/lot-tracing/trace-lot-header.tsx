"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { orderHref } from "@/features/sales-orders/order-labels";
import { StatusPill } from "@/components/ui/management-page";
import type { LotTrace } from "./contracts";
import { Marks } from "./trace-backward-panel";
import { formatDateTime, formatDay, formatNumber, lotStatusLabel, originLabel, originTone } from "./trace-format";
import s from "./lot-tracing.module.css";

type Props = { trace: LotTrace; exporting: boolean; publishing: boolean; onExport(): void; onPublish(): void; onCorrect(): void };

/** Đầu kết quả: lô, trạng thái, trạng thái công bố và ba thao tác theo quyền mà backend trả về (canPublish, canCorrect, canExport). */
export function TraceLotHeader({ trace, exporting, publishing, onExport, onPublish, onCorrect }: Props) {
  return (
    <section id="trace-lot" className={s.card} aria-labelledby="lot-title">
      <div className={s.cardHead}>
        <div>
          <h2 id="lot-title" className={s.lotTitle}>Lô <span className={s.code}>{trace.lotCode}</span></h2>
          <div className={s.pills}>
            <span>Trạng thái lô <StatusPill>{lotStatusLabel(trace.statusId)}</StatusPill></span>
            <span>Công bố nguồn gốc <StatusPill tone={originTone(trace.originState)}>{originLabel(trace.originState)}</StatusPill></span>
          </div>
        </div>

      </div>
      <dl className={s.facts}>
        <div><dt>Thu hoạch</dt><dd>{formatDateTime(trace.harvestedAt)}</dd></div>
        <div><dt>Số lồng</dt><dd className={s.num}>{trace.cageCount}</dd></div>
        {trace.weighedKg != null
          ? <div><dt>kg (Cân tại cảng)</dt><dd className={s.num}>{formatNumber(trace.weighedKg)}{trace.weighedAt ? ` · cân lúc ${formatDateTime(trace.weighedAt)}` : ""}</dd></div>
          : <div><dt>kg (Ước tính, chưa cân tại cảng)</dt><dd className={s.num}>{formatNumber(trace.estimatedKg)}</dd></div>}
        <div><dt>kg trên hóa đơn</dt><dd className={s.num}>{formatNumber(trace.invoicedKg)}</dd></div>
        {trace.harvestPlan
          ? <div><dt>Kế hoạch thu hoạch</dt><dd>{trace.harvestPlan.code} <span className={s.muted}>({trace.harvestPlan.status}, {formatDay(trace.harvestPlan.plannedDate)})</span></dd></div>
          : <div><dt>Kế hoạch thu hoạch</dt><dd className={s.muted}>Lô không gắn kế hoạch</dd></div>}
        {trace.harvestPlan && trace.harvestPlan.orders.length > 0 && <div><dt>Đơn đặt hàng</dt><dd>{trace.harvestPlan.orders.map((order, index) => <span key={order.id}>{index > 0 ? ", " : ""}<Link href={orderHref(order.code)}>{order.code}</Link></span>)}</dd></div>}
        {trace.publishedAt && <div><dt>Công bố lúc</dt><dd>{formatDateTime(trace.publishedAt)}</dd></div>}
        {trace.withdrawnAt && <div><dt>Thu hồi lúc</dt><dd>{formatDateTime(trace.withdrawnAt)}</dd></div>}
      </dl>
      {trace.originState === "NotPublished" && trace.invoices.length > 0 && <div role="status" className={s.warn}><strong>Lô đã bán nhưng chưa công bố.</strong> Lô có trên {trace.invoices.length} hóa đơn bán. Khi công bố, trang nguồn gốc của mọi hóa đơn có mã QR bán lô này sẽ hiển thị thông tin nguồn gốc.</div>}
      {(trace.openClaims ?? []).length > 0 && <div role="status" className={s.alertClaim}><strong>Có khiếu nại đang mở.</strong> {(trace.openClaims ?? []).map((claim) => `${claim.code} (hóa đơn ${claim.invoiceCode})`).join(", ")}. Trạng thái lô không tự đổi; hãy xử lý khiếu nại ở mục Khiếu nại.</div>}
      {trace.corrections.length > 0 && <p className={s.hint}>Dữ liệu thu hoạch của lô đã được sửa ngày {formatDay(trace.corrections[0].correctedAt)}. <Marks marks={trace.corrections} /></p>}
        <div className={s.actions}>
          {trace.canCorrect && <Button type="button" className="w-auto" variant="secondary" onClick={onCorrect}>Sửa dữ liệu truy xuất của bè {trace.raftCode}</Button>}
          {trace.canExport && <Button type="button" className="w-auto" variant="secondary" isPending={exporting} pendingLabel="Đang xuất..." onClick={onExport}>Xuất file</Button>}
          {trace.canPublish && <Button type="button" className="w-auto" isPending={publishing} pendingLabel="Đang kiểm tra..." onClick={onPublish}>{trace.originState === "Withdrawn" ? "Công bố lại" : "Công bố"}</Button>}
        </div>
    </section>
  );
}
