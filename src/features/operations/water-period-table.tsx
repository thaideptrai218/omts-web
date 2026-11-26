"use client";
import { INDICATORS, boundsOf, formatReading } from "./water-chart-model";
import { gapText, tableOfPeriods, type WaterChartData } from "./water-chart-periods";
import local from "./water-screen.module.css";

/**
 * "Số liệu chi tiết theo kỳ": the same periods as the chart. A period without a measurement is left out; one muted line says which
 * stretches were left out. Average, lowest and highest per indicator, and the number of measurements once per row.
 */
export function WaterPeriodTable({ data }: { data: WaterChartData }) {
  const { rows, gaps } = tableOfPeriods(data.periods), gap = gapText(gaps);
  if (!rows.length) return null;
  return <details className={`${local.card} ${local.periodTable}`}>
    <summary>Số liệu chi tiết theo kỳ · {rows.length} kỳ có lượt đo</summary>
    {gap && <p className={local.gapLine}>{gap}</p>}
    <div className={local.periodScroll}>
      <table>
        <thead>
          <tr><th scope="col" rowSpan={2}>Kỳ</th><th scope="col" rowSpan={2} className={local.num}>Lượt đo</th>
            {INDICATORS.map(indicator => <th key={indicator.key} scope="colgroup" colSpan={3}>{indicator.title}{indicator.unit ? ` (${indicator.unit})` : ""}</th>)}</tr>
          <tr>{INDICATORS.flatMap(indicator => ["Trung bình", "Thấp nhất", "Cao nhất"].map(name => <th key={`${indicator.key}-${name}`} scope="col" className={local.num}>{name}</th>))}</tr>
        </thead>
        <tbody>{rows.map(period => <tr key={period.key}>
          <th scope="row">{period.label}</th><td className={local.num}>{period.count}</td>
          {INDICATORS.flatMap(indicator => {
            const { average, minimum, maximum } = period[indicator.key], bounds = boundsOf(data, indicator.key);
            const low = minimum !== null && bounds[0] !== null && minimum < bounds[0], high = maximum !== null && bounds[1] !== null && maximum > bounds[1];
            return [
              <td key={`${indicator.key}-avg`} className={local.num}>{average === null ? "—" : formatReading(average)}</td>,
              <td key={`${indicator.key}-min`} className={`${local.num} ${low ? local.outside : ""}`}>{minimum === null ? "—" : formatReading(minimum)}</td>,
              <td key={`${indicator.key}-max`} className={`${local.num} ${high ? local.outside : ""}`}>{maximum === null ? "—" : formatReading(maximum)}</td>,
            ];
          })}
        </tr>)}</tbody>
      </table>
    </div>
  </details>;
}
