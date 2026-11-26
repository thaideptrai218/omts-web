"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HarvestForm } from "@/features/cultivation-api/records-harvest-form";
import type { PlanAction, PlanLine, PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { shortHarvestWarning } from "./plan-roster-logic";
import { harvestPlanFor, lineCanHarvest } from "./plan-logic";

/** The zone manager's button on a plan line (a raft): "Thu hoạch" opens the harvest form with the raft fixed by the plan. It shows only while the API allows it and the line has no lot. */
export function PlanLineActions({ plan, line, access, onChanged }: { plan: Pick<PlanView, "id" | "code" | "allowedActions"> & Partial<Pick<PlanView, "orders" | "staffing">>; line: PlanLine; access: Pick<PlanAccess, "harvest">; onChanged(): void }) {
  const [open, setOpen] = useState(false), confirmation = useActionDialog();
  const can = (action: PlanAction) => plan.allowedActions.includes(action);
  if (!access.harvest || !lineCanHarvest(line) || !can("Harvest")) return null;
  return <span className="inline-flex flex-wrap gap-2">
    {confirmation.dialog}
    <Button className="w-auto" onClick={async () => { const warning = shortHarvestWarning(plan.staffing); if (!warning || await confirmation.confirm(warning)) setOpen(true); }}>Thu hoạch</Button>
    {open && <HarvestForm zoneId={line.zone.id} raftId={line.raftId} plan={harvestPlanFor(plan, line)} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged(); }} />}
  </span>;
}
