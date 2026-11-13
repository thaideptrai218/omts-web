"use client";
import { useMemo, useState } from "react";
import type { YieldGroup } from "./contracts";
import { formatKg } from "./yield-logic";
import { YieldTrendChart, zonePalette } from "./yield-trend-chart";
import { aggregateTrend, cumulative, type TrendMetric, type TrendUnit } from "./yield-trend-model";
import s from "./yield-screen.module.css";

const units: readonly (readonly [TrendUnit, string])[] = [["day", "Ngày"], ["week", "Tuần"], ["month", "Tháng"]];
const metrics: readonly (readonly [TrendMetric, string])[] = [["kg", "Kg ước tính"], ["cages", "Số lồng"]];

function Segment<T extends string>({ label, options, value, onChange }: { label: string; options: readonly (readonly [T, string])[]; value: T; onChange(next: T): void }) {
  return <div className={s.segment} role="group" aria-label={label}>{options.map(([key, text]) => <button key={key} type="button" className={s.pill} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}</div>;
}

/** Xu hướng thu hoạch theo kỳ (ngày/tuần/tháng) từ các lô trong kỳ; kg đều là ước tính từ số lồng. Mục tiêu chỉ hiện khi đang xem đúng một chu kỳ. */
export function YieldTrendSection({ groups }: { groups: readonly YieldGroup[] }) {
  const [unit, setUnit] = useState<TrendUnit>("week"), [metric, setMetric] = useState<TrendMetric>("kg"), [byZone, setByZone] = useState(false), [table, setTable] = useState(false);
  const buckets = useMemo(() => aggregateTrend(groups, unit), [groups, unit]);
  const zones = useMemo(() => [...new Set(groups.flatMap((group) => group.lots).filter((lot) => lot.inPeriod).map((lot) => lot.zoneCode))].sort(), [groups]);
  const single = groups.length === 1 && (groups[0].targetYieldKg ?? 0) > 0 ? groups[0] : undefined;
  const total = cumulative(buckets, metric), unitName = metric === "kg" ? "kg" : "lồng";
  return (
    <details className={s.section} open>
      <summary><strong>Xu hướng thu hoạch</strong><span className={s.muted}> · kg ước tính từ số lồng</span></summary>
      <div className={s.sectionBody}>
        <div className={s.chartTools}>
          <Segment<TrendUnit> label="Đơn vị thời gian" options={units} value={unit} onChange={setUnit} />
          <Segment<TrendMetric> label="Chỉ số" options={metrics} value={metric} onChange={setMetric} />
          <Segment label="Cách chia" options={[["total", "Tổng"], ["zone", "Theo vùng"]] as const} value={byZone ? "zone" : "total"} onChange={(next) => setByZone(next === "zone")} />
          <button type="button" className={s.linkBtn} aria-pressed={table} onClick={() => setTable((value) => !value)}>{table ? "Xem dạng biểu đồ" : "Xem dạng bảng"}</button>
        </div>
        {!buckets.length ? <p className={s.muted}>Chưa có lô thu hoạch trong kỳ để vẽ biểu đồ.</p>
          : table ? <div className={s.tableScroll}><table className={s.lots}>
            <caption className={s.srOnly}>Số liệu thu hoạch theo kỳ</caption>
            <thead><tr><th scope="col">Kỳ</th><th scope="col" className={s.num}>Kg ước tính</th><th scope="col" className={s.num}>Số lồng</th><th scope="col" className={s.num}>Cộng dồn ({unitName})</th></tr></thead>
            <tbody>{buckets.map((bucket, index) => <tr key={bucket.key}><th scope="row">{bucket.label}</th><td className={s.num}>{formatKg(bucket.kg)} kg</td><td className={s.num}>{formatKg(bucket.cages)} lồng</td><td className={s.num}>{formatKg(total[index])} {unitName}</td></tr>)}</tbody>
          </table></div>
            : <>
              <YieldTrendChart buckets={buckets} metric={metric} byZone={byZone} zones={zones} targetKg={single?.targetYieldKg} />
              <p className={s.legend}>
                {!byZone && <span><i className={s.swatch} style={{ background: "#2f8f83" }} />Cột: {unitName} theo kỳ</span>}
                {byZone && zones.map((zone, index) => <span key={zone}><i className={s.swatch} style={{ background: zonePalette[index % zonePalette.length] }} />{zone}</span>)}
                <span><i className={s.swatchLine} />Đường: cộng dồn ({formatKg(total.at(-1) ?? 0)} {unitName})</span>
                {single && metric === "kg" && <span><i className={s.swatchTarget} />Mục tiêu của chu kỳ</span>}
              </p>
            </>}
      </div>
    </details>
  );
}
