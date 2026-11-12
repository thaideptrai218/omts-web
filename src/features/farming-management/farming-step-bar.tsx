"use client";
import Link from "next/link";
import { farmingStepLink, type FarmingStep } from "./entity-links";

const steps: readonly [FarmingStep, string][] = [["cycle", "Chu kỳ"], ["seeding", "Thả giống"], ["material", "Vật tư"], ["harvest", "Thu hoạch"]];

/** A compact route map for the raft currently being worked on. */
export function FarmingStepBar({ current, zoneId, raftId, cycleId }: { current: FarmingStep; zoneId: string; raftId: string; cycleId?: string }) {
  return <nav aria-label="Các bước của bè" className="mb-3 flex flex-wrap items-center gap-1 border-b border-border pb-3 text-xs">
    {steps.map(([key, label], index) => <span key={key} className="flex items-center gap-1">
      {index > 0 && <span aria-hidden className="px-1 text-text-muted">→</span>}
      <Link href={farmingStepLink(key, { zoneId, raftId, cycleId })} aria-current={current === key ? "step" : undefined}
        className={`rounded-control px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-primary ${current === key ? "bg-primary text-white" : "text-text-muted hover:bg-surface-subtle hover:text-primary"}`}>{label}</Link>
    </span>)}
  </nav>;
}
