"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/features/operations/ui";
import type { ZoneOverviewItem } from "./contracts";
import { useWaterZoneOverview } from "./use-water-zone-overview";
import { absoluteTimeText, describeValueOutside, isMeasurementStale, relativeTimeText, RECENT_MEASUREMENT_HOURS } from "./water-overview-logic";
import s from "./water-zone-overview.module.css";

function SkeletonGrid() {
  return (
    <div role="status" aria-label="Đang tải tổng quan vùng" className={s.grid}>
      {[1, 2, 3, 4, 5, 6].map((id) => <div key={id} className={s.skeleton} />)}
    </div>
  );
}

/** Huy hiệu cảnh báo luôn có biểu tượng và chữ, không chỉ dựa vào màu. */
function AlertBadge({ alert }: { alert: boolean }) {
  return alert
    ? <span className={`${s.badge} ${s.badgeAlert}`}><span aria-hidden="true">▲</span>Đang cảnh báo</span>
    : <span className={`${s.badge} ${s.badgeOk}`}><span aria-hidden="true">●</span>Không cảnh báo</span>;
}

function ZoneCard({ item, now, onSelect }: { item: ZoneOverviewItem; now: number; onSelect(zoneId: string): void }) {
  const stale = isMeasurementStale(item.latestMeasuredAt, now);
  return (
    <li>
      <button type="button" className={`${s.card} ${item.hasWaterAlert ? s.cardAlert : ""}`} onClick={() => onSelect(item.zoneId)}
        aria-label={`Xem lịch sử đo của vùng ${item.zoneCode} ${item.zoneName}`}>
        <span className={s.cardHead}>
          <span className={s.code}>{item.zoneCode}</span>
          <AlertBadge alert={item.hasWaterAlert} />
        </span>
        <span className={s.name}>{item.zoneName}</span>
        <span className={s.status}>{item.zoneStatus}</span>
        <span className={s.time}>
          <span className={stale ? s.stale : undefined}>
            {stale && item.latestMeasuredAt && <span aria-hidden="true">◷ </span>}{relativeTimeText(item.latestMeasuredAt, now)}
          </span>
          {item.latestMeasuredAt && <small>{absoluteTimeText(item.latestMeasuredAt)}</small>}
          {stale && <small className={s.stale}>Chưa đo gần đây</small>}
        </span>
        {item.valuesOutside.length > 0 && (
          <ul className={s.outside}>{item.valuesOutside.map((v) => <li key={v.indicator}>{describeValueOutside(v)}</li>)}</ul>
        )}
      </button>
    </li>
  );
}

/** WATER-03 bước 1: lưới vùng với lần đo mới nhất và cảnh báo; chọn một vùng để xem lịch sử đo. */
export function WaterZoneOverview({ onSelectZone }: { onSelectZone(zoneId: string): void }) {
  const { items, error, loading, now, reload, summary } = useWaterZoneOverview();
  return (
    <section aria-labelledby="water-overview-title" className={s.wrap}>
      <div className={s.head}>
        <h2 id="water-overview-title" className={s.title}>Tổng quan chất lượng nước theo vùng</h2>
        {!error && <Button className="w-auto" variant="secondary" isPending={loading} onClick={reload}>Tải lại</Button>}
      </div>
      {summary && (
        <dl className={s.summary} aria-label="Tóm tắt">
          <div><dt>Số vùng</dt><dd>{summary.total}</dd></div>
          <div className={summary.alerting ? s.summaryAlert : undefined}><dt>Vùng đang cảnh báo</dt><dd>{summary.alerting}</dd></div>
          <div><dt>Vùng chưa đo gần đây</dt><dd>{summary.stale}</dd></div>
        </dl>
      )}
      <ErrorNotice error={error} />
      {error && !loading && <Button className="w-auto" variant="secondary" onClick={reload}>Thử lại</Button>}
      {loading && !items ? <SkeletonGrid /> : items && (items.length === 0
        ? <p className={s.empty}>Chưa có vùng nào bạn được phép xem chất lượng nước.</p>
        : (
          <>
            <ul className={s.grid}>{items.map((item) => <ZoneCard key={item.zoneId} item={item} now={now} onSelect={onSelectZone} />)}</ul>
            <p className={s.note}>“Chưa đo gần đây” nghĩa là chưa có lần đo nào trong {RECENT_MEASUREMENT_HOURS} giờ qua.</p>
          </>
        ))}
    </section>
  );
}
