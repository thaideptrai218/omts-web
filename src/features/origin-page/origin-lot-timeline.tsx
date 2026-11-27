import { JourneyLine, type JourneyStep } from "@/features/public-site/journey-line";
import type { ProvenanceLot } from "@/server/public/origin-page-schema";
import type { OriginCopy } from "./origin-copy";
import { formatOriginDate } from "./origin-format";
import s from "./origin-lot.module.css";

const date = (iso: string) => ({ iso, text: formatOriginDate(iso) });
/** Số ngày đã trôi qua kể từ lần thả giống đầu tiên, khớp với "số ngày nuôi". */
const dayNumber = (iso: string, first: string) => Math.round((Date.parse(iso) - Date.parse(first)) / 86_400_000);

/** Hành trình của lô, chỉ dựng từ dữ liệu API: thả giống rồi thu hoạch. Ngày hóa đơn đã ở đầu trang nên không lặp lại thành một bước. */
export function OriginLotTimeline({ lot, copy }: { lot: ProvenanceLot; copy: OriginCopy }) {
  const origin = lot.origin;
  if (!origin) return null;
  const first = origin.seedings.map((seeding) => seeding.seedingDate).sort()[0];
  const badge = (iso: string) => (first ? copy.dayBadge(dayNumber(iso, first)) : undefined);
  const steps: JourneyStep[] = [
    ...origin.seedings.map((seeding, index): JourneyStep => ({
      key: `seed-${index}`, icon: "seeding", date: date(seeding.seedingDate), badge: badge(seeding.seedingDate), title: copy.seededStep, detail: seeding.seedItemName,
    })),
    { key: "harvest", icon: "harvest", date: date(origin.harvestDate), badge: badge(origin.harvestDate), title: copy.harvestStep },
  ];
  return (
    <section aria-labelledby={`journey-${lot.lotCode}`}>
      <h4 id={`journey-${lot.lotCode}`} className={s.blockTitle}>{copy.journey}</h4>
      {origin.seedings.length === 0 ? <p className={s.muted}>{copy.noSeeding}</p> : null}
      <JourneyLine steps={steps} label={copy.journey} />
    </section>
  );
}
