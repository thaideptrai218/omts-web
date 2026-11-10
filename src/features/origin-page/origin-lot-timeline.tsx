import type { ProvenanceLot } from "@/server/public/origin-page-schema";
import type { OriginCopy } from "./origin-copy";
import { formatOriginDate } from "./origin-format";
import s from "./origin-lot.module.css";

type Step = { key: string; date: string; label: string; detail?: string };

/** Hành trình của lô, chỉ dựng từ dữ liệu API: thả giống, thu hoạch, ngày hóa đơn. */
function buildSteps(lot: ProvenanceLot, invoiceDate: string | null, copy: OriginCopy): Step[] {
  const origin = lot.origin;
  if (!origin) return [];
  const steps: Step[] = origin.seedings.map((seeding, index) => ({
    key: `seed-${index}`, date: seeding.seedingDate, label: copy.seededStep, detail: seeding.seedItemName,
  }));
  steps.push({
    key: "harvest", date: origin.harvestDate, label: copy.harvestStep,
    detail: origin.daysOfFarming == null ? undefined : `${origin.daysOfFarming} ${copy.days}`,
  });
  if (invoiceDate) steps.push({ key: "sold", date: invoiceDate, label: copy.soldStep });
  return steps;
}

export function OriginLotTimeline({ lot, invoiceDate, copy }: { lot: ProvenanceLot; invoiceDate: string | null; copy: OriginCopy }) {
  const steps = buildSteps(lot, invoiceDate, copy);
  if (steps.length === 0) return null;
  return (
    <section aria-label={copy.journey}>
      <h4 className={s.galleryTitle}>{copy.journey}</h4>
      <ol className={s.timeline}>
        {steps.map((step) => (
          <li key={step.key} className={s.step}>
            <span className={s.stepDot} aria-hidden="true" />
            <time className={s.stepDate} dateTime={step.date}>{formatOriginDate(step.date)}</time>
            <span className={s.stepLabel}>{step.label}</span>
            {step.detail ? <span className={s.stepDetail}>{step.detail}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
