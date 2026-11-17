"use client";

const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Percentage of the plan reached; undefined without a usable plan. */
export function planPercent(actual: number, plan: number | null | undefined): number | undefined {
  return typeof plan === "number" && Number.isFinite(plan) && plan > 0 && Number.isFinite(actual) ? Math.round((actual / plan) * 1000) / 10 : undefined;
}

/**
 * Plan versus actual as a labelled bar (the cycle's own numbers: giống, kg mục tiêu).
 * Over 100% the bar turns amber and says so; it is a hint, never a block. `estimate` marks kg derived from cages ("ước tính").
 */
export function PlanBar({ label, actual, plan, unit, estimate = false, note, hideOverNote = false }: { label: string; actual: number; plan: number | null | undefined; unit: string; estimate?: boolean; note?: string; hideOverNote?: boolean }) {
  const percent = planPercent(actual, plan), over = percent !== undefined && percent > 100;
  return <div className="grid gap-1" data-testid="plan-bar">
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
      <span className="font-medium">{label}{estimate && <span className="ml-1 font-normal text-text-muted">(ước tính)</span>}</span>
      <span className="tabular-nums text-text-muted">{number(actual)}{percent !== undefined ? ` / ${number(plan as number)}` : ""} {unit}{percent !== undefined && <strong className={`ml-1 ${over ? "text-warning" : "text-text"}`}>{number(percent)}%</strong>}</span>
    </div>
    {percent !== undefined
      ? <div role="progressbar" aria-label={`${label} so với kế hoạch`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(percent))} aria-valuetext={`${number(percent)}% kế hoạch`} className="h-2 overflow-hidden rounded-full bg-surface-subtle">
        <div className={`h-full rounded-full ${over ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      : <p className="text-xs text-text-muted">Chưa lập kế hoạch cho chỉ tiêu này.</p>}
    {over && !hideOverNote && <p className="text-xs text-warning">Vượt kế hoạch {number(percent - 100)}%. Hãy kiểm tra lại số liệu đã nhập.</p>}
    {note && <p className="text-xs text-text-muted">{note}</p>}
  </div>;
}
