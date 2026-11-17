"use client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import type { LotTrace } from "./contracts";
import { Marks } from "./trace-backward-panel";
import { formatDateTime, formatDay, formatNumber, lotStatusLabel, originLabel, originTone } from "./trace-format";
import s from "./lot-tracing.module.css";

type Props = { trace: LotTrace; exporting: boolean; publishing: boolean; onExport(): void; onPublish(): void; onCorrect(): void };

/** Đầu kết quả: lô, trạng thái, trạng thái công bố và ba thao tác theo quyền mà backend trả về (canPublish, canCorrect, canExport). */
export function TraceLotHeader({ trace, exporting, publishing, onExport, onPublish, onCorrect }: Props) {
  return (
    <section className={s.card} aria-labelledby="lot-title">
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
        <div><dt>kg ước tính</dt><dd className={s.num}>{formatNumber(trace.estimatedKg)}</dd></div>
        <div><dt>kg trên hóa đơn</dt><dd className={s.num}>{formatNumber(trace.invoicedKg)}</dd></div>
        {trace.publishedAt && <div><dt>Công bố lúc</dt><dd>{formatDateTime(trace.publishedAt)}</dd></div>}
        {trace.withdrawnAt && <div><dt>Thu hồi lúc</dt><dd>{formatDateTime(trace.withdrawnAt)}</dd></div>}
      </dl>
      {trace.originState === "NotPublished" && trace.invoices.length > 0 && <p className={s.hint}>Lô có trên {trace.invoices.length} hóa đơn bán. Khi công bố, trang nguồn gốc của mọi hóa đơn có mã QR bán lô này sẽ hiển thị thông tin nguồn gốc.</p>}
      {trace.corrections.length > 0 && <p className={s.hint}>Dữ liệu thu hoạch của lô đã được sửa ngày {formatDay(trace.corrections[0].correctedAt)}. <Marks marks={trace.corrections} /></p>}
        <div className={s.actions}>
          {trace.canCorrect && <Button type="button" className="w-auto" variant="secondary" onClick={onCorrect}>Sửa dữ liệu truy xuất của bè {trace.raftCode}</Button>}
          {trace.canExport && <Button type="button" className="w-auto" variant="secondary" isPending={exporting} pendingLabel="Đang xuất..." onClick={onExport}>Xuất file</Button>}
          {trace.canPublish && <Button type="button" className="w-auto" isPending={publishing} pendingLabel="Đang kiểm tra..." onClick={onPublish}>{trace.originState === "Withdrawn" ? "Công bố lại" : "Công bố"}</Button>}
        </div>
    </section>
  );
}
