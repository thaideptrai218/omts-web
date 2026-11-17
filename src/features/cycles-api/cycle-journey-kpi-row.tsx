import type { StripItems } from "./cycle-journey-strip-model";

const tiles = [["nursery", "Ươm giống"], ["cycle", "Đợt nuôi"], ["seeding", "Thả giống"], ["harvest", "Thu hoạch"]] as const;

/**
 * The figures of the cycle at a glance (nursery survivors, days of farming, seeded against plan, harvested against target and lanes done).
 * Text only: the plan bars live in the step cards below, so nothing is drawn twice. Comes from the same `buildJourney` data as the cards.
 */
export function CycleJourneyKpiRow({ items }: { items: StripItems }) {
  return <dl aria-label="Tiến độ chính của đợt nuôi" className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    {tiles.map(([key, label]) => <div key={key} className="min-w-0 rounded-control border border-border bg-surface-subtle px-3 py-2">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium leading-snug">{items[key]?.figure ?? "—"}</dd>
    </div>)}
  </dl>;
}
