"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/features/operations/ui";
import type { PayPeriod } from "./contracts";
import { periodDays, periodName, periodRange } from "./payroll-settings-draft";
import s from "./payroll-settings-screen.module.css";

/** Hai kỳ lương kế tiếp theo thiết lập đang chọn (xem trước từ backend, chưa lưu). */
export function PayrollPreviewPanel({ periods, loading, error, problem, onRetry }: {
  periods?: readonly PayPeriod[]; loading: boolean; error?: string; problem?: string; onRetry(): void;
}) {
  return (
    <section className={s.card} aria-labelledby="payroll-preview-title" aria-busy={loading}>
      <h2 id="payroll-preview-title" className={s.h2}>Kỳ lương kế tiếp</h2>
      {problem ? <p className={s.empty}>Chọn ngày tính lương hợp lệ để xem trước.</p>
        : error ? <><ErrorNotice error={error} /><Button type="button" className="w-auto" variant="secondary" onClick={onRetry}>Thử lại</Button></>
        : loading || !periods ? <div role="status" aria-label="Đang tính kỳ lương" className={s.skeleton}><div /><div /></div>
        : (
          <ol className={s.periods}>
            {periods.map((p, i) => (
              <li key={p.start}>
                <span className={s.badge}>{i === 0 ? "Kỳ kế tiếp" : "Kỳ sau đó"}</span>
                <strong className={s.num}>{periodName(p)}</strong>
                <span className={s.num}>{periodRange(p)} · {periodDays(p)} ngày</span>
              </li>))}
          </ol>)}
      <p className={s.muted}>Tính theo thiết lập đang chọn, chưa được lưu.</p>
    </section>
  );
}
