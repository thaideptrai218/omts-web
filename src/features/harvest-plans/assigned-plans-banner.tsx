"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { usePlanAccess } from "./plan-access";
import { planHref } from "./plan-labels";
import { lineCanHarvest, plannedLaneNumbers } from "./plan-logic";
import { PlanLineActions } from "./plan-line-actions";
import styles from "./plans.module.css";
import { planRepository } from "./repository";

/**
 * "Kế hoạch được giao" above the harvest records of a raft: the plans given out that still have a line in the zone for this raft to harvest, each line with its
 * lanes and expected cages and the two buttons. Nothing is shown when the zone has no such line; a failed read is left out of the way of the screen.
 */
export function AssignedPlansBanner({ zoneId, raftId, onChanged }: { zoneId: string; raftId: string; onChanged(): void }) {
  const access = usePlanAccess();
  const remote = useRemote(useCallback((signal: AbortSignal) => access.viewHarvests ? planRepository.assigned(signal) : Promise.resolve({ status: "success" as const, data: [] }), [access.viewHarvests]));
  const rows = (remote.data ?? []).flatMap((plan) => plan.lines.filter((line) => line.zone.id === zoneId && line.raftId === raftId && lineCanHarvest(line)).map((line) => ({ plan, line })));
  if (!rows.length) return null;
  return <section className={styles.banner} aria-label="Kế hoạch được giao">
    <h3>Kế hoạch thu hoạch được giao</h3>
    <div>{rows.map(({ plan, line }) => <div key={line.id} className={styles.bannerLine}>
      <span>
        <Link className="text-primary underline" href={planHref(plan.code)}>{plan.code}</Link> · dự kiến {viDateTime(plan.plannedAt)} · bè {line.raftCode} · luống {plannedLaneNumbers(line).join(", ")}
        {line.expectedProduct ? ` · ${line.expectedProduct.name}` : ""}{line.expectedCageCount ? ` · khoảng ${line.expectedCageCount.toLocaleString("vi-VN")} lồng` : ""}
        {line.note ? ` · ${line.note}` : ""}
      </span>
      <PlanLineActions plan={plan} line={line} access={access} onChanged={() => { remote.reload(); onChanged(); }} />
    </div>)}</div>
  </section>;
}
