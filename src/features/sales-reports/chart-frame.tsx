import { useId } from "react";
import { FRAME_EMPTY_TEXT } from "./frame-parts";
import s from "./report-frame.module.css";

/** Dash patterns so line series differ by shape, not only by color. */
const DASHES = ["", "6 4", "2 3"] as const;

type ChartFrameProps = Readonly<{
  title: string;
  kind: "bar" | "line";
  /** Series names shown in the legend (one swatch pattern each). */
  legend: readonly string[];
  valueAxis: string;
  categoryAxis: string;
}>;

/**
 * Empty chart area: axes, gridlines, legend and axis titles without any data point.
 * The text alternative region tells screen-reader users there is nothing to plot.
 */
export function ChartFrame({ title, kind, legend, valueAxis, categoryAxis }: ChartFrameProps) {
  const id = useId();
  const grid = [40, 80, 120, 160];
  return (
    <figure className={`${s.card} ${s.chart}`} aria-labelledby={id}>
      <figcaption><h2 id={id}>{title}</h2></figcaption>
      <ul className={s.legend} aria-label="Chú giải">
        {legend.map((name, index) => (
          <li key={name}>
            <svg aria-hidden="true" viewBox="0 0 32 12">
              {kind === "bar"
                ? <rect x="2" y="2" width="28" height="8" fill="currentColor" />
                : <line x1="0" x2="32" y1="6" y2="6" stroke="currentColor" strokeWidth="2.5" strokeDasharray={DASHES[index % DASHES.length]} />}
            </svg>
            {name}
          </li>
        ))}
      </ul>
      <svg className={s.plot} viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {grid.map((position) => kind === "bar"
          ? <line key={position} x1={position * 3.5} x2={position * 3.5} y1="10" y2="180" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity=".5" />
          : <line key={position} x1="40" x2="590" y1={position} y2={position} stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity=".5" />)}
        <line x1="40" x2="40" y1="10" y2="180" stroke="currentColor" strokeWidth="1.5" />
        <line x1="40" x2="590" y1="180" y2="180" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <dl className={s.axes}>
        <div><dt>Trục dọc:</dt><dd>{valueAxis}</dd></div>
        <div><dt>Trục ngang:</dt><dd>{categoryAxis}</dd></div>
      </dl>
      <p className={s.alt} role="status">{FRAME_EMPTY_TEXT}</p>
    </figure>
  );
}
