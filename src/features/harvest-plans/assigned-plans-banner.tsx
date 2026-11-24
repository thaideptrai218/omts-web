"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice } from "@/features/operations/ui";
import { useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import type { PlanView } from "./contracts";
import { usePlanAccess } from "./plan-access";
import { planHref } from "./plan-labels";
import { lineCanHarvest } from "./plan-logic";
import { PlanLineActions } from "./plan-line-actions";
import styles from "./plans.module.css";
import { errorText, planRepository } from "./repository";

/**
 * "Kế hoạch được giao" above the harvest records of a raft: the plans given out that still have a line in the zone for this raft to harvest, each line with its
 * expected cages and the button. Nothing is shown when the zone has no such line; a failed read is left out of the way of the screen.
 */
export function AssignedPlansBanner({ zoneId, raftId, onChanged }: { zoneId: string; raftId: string; onChanged(): void }) {
  const access = usePlanAccess();
  const remote = useRemote(useCallback((signal: AbortSignal) => access.viewHarvests ? planRepository.assigned(signal) : Promise.resolve({ status: "success" as const, data: [] }), [access.viewHarvests]));
  const { notify } = useToast();
  const [pendingId, setPendingId] = useState<string>(), [error, setError] = useState<string>();
  const toReceive = (remote.data ?? []).filter((plan) => plan.allowedActions.includes("Receive") && access.harvest && plan.lines.some((line) => line.zone.id === zoneId && line.raftId === raftId));
  async function receive(plan: PlanView) {
    setPendingId(plan.id); setError(undefined);
    const result = await planRepository.receive(plan.id, plan.rowVersion);
    setPendingId(undefined);
    if (result.status === "success") { notify({ tone: "success", title: `Đã nhận kế hoạch ${plan.code}.` }); remote.reload(); onChanged(); } else setError(errorText(result));
  }
  const rows = (remote.data ?? []).flatMap((plan) => plan.lines.filter((line) => line.zone.id === zoneId && line.raftId === raftId && lineCanHarvest(line)).map((line) => ({ plan, line })));
  if (!rows.length && !toReceive.length) return null;
  return <section className={styles.banner} aria-label="Kế hoạch được giao">
    <h3>Kế hoạch thu hoạch được giao</h3>
    {toReceive.map((plan) => <div key={plan.id} className={styles.bannerLine}>
      <span><Link className="text-primary underline" href={planHref(plan.code)}>{plan.code}</Link> · dự kiến {viDateTime(plan.plannedAt)} · cần nhận để bắt đầu thu hoạch</span>
      <Button className="w-auto" isPending={pendingId === plan.id} onClick={() => void receive(plan)}>Nhận kế hoạch</Button>
    </div>)}
    <ErrorNotice error={error} />
    <div>{rows.map(({ plan, line }) => <div key={line.id} className={styles.bannerLine}>
      <span>
        <Link className="text-primary underline" href={planHref(plan.code)}>{plan.code}</Link> · dự kiến {viDateTime(plan.plannedAt)} · bè {line.raftCode}
        {line.expectedProduct ? ` · ${line.expectedProduct.name}` : ""}{line.expectedCageCount ? ` · khoảng ${line.expectedCageCount.toLocaleString("vi-VN")} lồng` : ""}
        {line.note ? ` · ${line.note}` : ""}
      </span>
      <PlanLineActions plan={plan} line={line} access={access} onChanged={() => { remote.reload(); onChanged(); }} />
    </div>)}</div>
  </section>;
}
