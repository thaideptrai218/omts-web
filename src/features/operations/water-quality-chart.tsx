import { formatVietnameseDate } from "@/shared/format/date-only";
import { DataTable } from "./ui";
import type { WaterChartData } from "./water-measurement-shared";
import styles from "./water-screen.module.css";

const PERIOD_TABLE_HEADINGS = [
  "Kỳ",
  "pH trung bình / thấp nhất / cao nhất",
  "Lượt đo",
  "Độ mặn TB / thấp nhất / cao nhất (‰)",
  "Lượt đo",
];

/** Trend summary, pH + salinity charts and the per-period breakdown table. */
export function WaterQualityChart({ data }: { data: WaterChartData }) {
  const readings = data.periods.reduce((sum, period) => sum + period.ph.count + period.salinity.count, 0);
  const missing = data.periods.filter((period) => period.missing).length;

  return (
    <>
      {!readings && (
        <p className={styles.emptyChart}>
          Chưa có chỉ số đã xác nhận trong khoảng này. Chọn khoảng thời gian khác hoặc kiểm tra lịch sử bên dưới.
        </p>
      )}
      <div className="my-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-y border-border py-2.5 text-xs">
        <p className="text-text-muted">{formatVietnameseDate(data.from)} — {formatVietnameseDate(data.to)}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span><strong className="tabular-nums text-text">{readings}</strong> lượt ghi nhận chỉ số</span>
          <span className="text-text-muted">{missing} kỳ thiếu dữ liệu</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sky-700" /> Trung bình</span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-sky-200" /> Khoảng nhỏ nhất–lớn nhất
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-0 w-4 border-t border-dashed border-amber-700" /> Ngưỡng
          </span>
        </div>
      </div>
      <div className={styles.charts}>
        <IndicatorChart
          data={data}
          indicator="ph"
          title="Độ pH"
          min={data.thresholds.phMin}
          max={data.thresholds.phMax}
        />
        <IndicatorChart
          data={data}
          indicator="salinity"
          title="Độ mặn (‰)"
          min={data.thresholds.salinityMin}
          max={data.thresholds.salinityMax}
        />
      </div>
      <details className={styles.periodTable}>
        <summary>Số liệu chi tiết theo kỳ · {data.periods.length} kỳ</summary>
        <DataTable headings={PERIOD_TABLE_HEADINGS}>
          {data.periods.map((period) => (
            <tr key={period.period}>
              <td className="whitespace-nowrap">
                {period.period}
                {period.missing ? <span className="ml-2 text-xs text-text-muted">Thiếu dữ liệu</span> : ""}
              </td>
              <td className="tabular-nums">
                {period.ph.average ?? "—"} / {period.ph.minimum ?? "—"} / {period.ph.maximum ?? "—"}
              </td>
              <td className="tabular-nums">{period.ph.count}</td>
              <td className="tabular-nums">
                {period.salinity.average ?? "—"} / {period.salinity.minimum ?? "—"} / {period.salinity.maximum ?? "—"}
              </td>
              <td className="tabular-nums">{period.salinity.count}</td>
            </tr>
          ))}
        </DataTable>
      </details>
    </>
  );
}

type IndicatorChartProps = {
  data: WaterChartData;
  indicator: "ph" | "salinity";
  title: string;
  min: number | null;
  max: number | null;
};

// SVG geometry: plot area spans x 42..552 and y 25..185 inside a 600x230 viewBox.
function IndicatorChart({ data, indicator, title, min, max }: IndicatorChartProps) {
  const top = Math.max(1, ...data.periods.flatMap((period) => [period[indicator].maximum ?? 0]), max ?? 0) * 1.1;
  const x = (index: number) => 42 + index * 510 / Math.max(1, data.periods.length - 1);
  const y = (value: number) => 185 - value * 160 / top;

  // Average line; gaps (missing periods) start a new sub-path instead of bridging.
  let path = "";
  let previous = false;
  data.periods.forEach((period, index) => {
    const average = period[indicator].average;
    if (period.missing || average === null) {
      previous = false;
      return;
    }
    path += `${previous ? " L" : " M"}${x(index)} ${y(average)}`;
    previous = true;
  });

  const axisTop = Math.max(1, top);
  const ticks = [0, 1, 2, 3].map((index) => axisTop * index / 3);
  const ariaLabel =
    `${title}: đường trung bình và khoảng nhỏ nhất/lớn nhất; ngưỡng hiện tại ${min ?? "chưa đặt"} đến ${max ?? "chưa đặt"}`;

  return (
    <figure className="min-w-0 rounded-lg border border-border/80 bg-slate-50/70 px-3 pb-2 pt-3 sm:px-4">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[11px] tabular-nums text-text-muted">{min ?? "—"}–{max ?? "—"} · ngưỡng</span>
      </figcaption>
      <svg className="mt-2 w-full overflow-visible" viewBox="0 0 600 230" role="img" aria-label={ariaLabel}>
        {ticks.map((tick, index) => (
          <g key={index}>
            <line x1="42" y1={y(tick)} x2="552" y2={y(tick)} stroke="#dbe4e8" strokeWidth="1" />
            <text x="36" y={y(tick) + 4} textAnchor="end" fontSize="10" fill="#64748b">{Number(tick.toFixed(1))}</text>
          </g>
        ))}
        {[min, max].map((bound, index) => bound !== null && (
          <g key={index}>
            <line x1="42" x2="552" y1={y(bound)} y2={y(bound)} stroke="#a16207" strokeWidth="1.5" strokeDasharray="5 5" />
            <text x="556" y={y(bound) + 4} fontSize="10" fill="#854d0e">{bound}</text>
          </g>
        ))}
        {data.periods.map((period, index) => {
          const { maximum, minimum } = period[indicator];
          return !period.missing && minimum !== null && maximum !== null && (
            <line
              key={period.period}
              x1={x(index)}
              x2={x(index)}
              y1={y(minimum)}
              y2={y(maximum)}
              stroke="#7dd3fc"
              strokeWidth="7"
              strokeLinecap="round"
            >
              <title>{period.period}: {minimum} — {maximum}</title>
            </line>
          );
        })}
        <path d={path} fill="none" stroke="#075b73" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.periods.map((period, index) => {
          const { average } = period[indicator];
          return !period.missing && average !== null && (
            <circle key={period.period} cx={x(index)} cy={y(average)} r="4" fill="#075b73" stroke="white" strokeWidth="2">
              <title>{period.period}: trung bình {average}</title>
            </circle>
          );
        })}
        <text x="42" y="215" fontSize="12">{data.periods[0]?.period ?? ""}</text>
        <text x="552" y="215" textAnchor="end" fontSize="12">{data.periods.at(-1)?.period ?? ""}</text>
      </svg>
    </figure>
  );
}
