"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HarvestForm } from "@/features/cultivation-api/records-harvest-form";
import type { PlanAction, PlanLine, PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { harvestPlanFor, lineCanHarvest } from "./plan-logic";
import { SkipLanesDialog } from "./skip-lanes-dialog";

/**
 * The zone manager's two buttons on a plan line: "Thu hoạch" opens the harvest form with the raft and the lanes still to harvest fixed by the plan, and
 * "Không thu" opens the dialog to mark lanes that will not be harvested. Each shows only while the API allows it and the line has a lane left.
 */
export function PlanLineActions({ plan, line, access, onChanged }: { plan: Pick<PlanView, "id" | "code" | "allowedActions">; line: PlanLine; access: Pick<PlanAccess, "harvest">; onChanged(): void }) {
  const [mode, setMode] = useState<"harvest" | "skip">();
  const can = (action: PlanAction) => plan.allowedActions.includes(action);
  const open = access.harvest && lineCanHarvest(line);
  if (!open || !can("Harvest") && !can("SkipLane")) return null;
  const done = () => { setMode(undefined); onChanged(); };
  return <span className="inline-flex flex-wrap gap-2">
    {can("Harvest") && <Button className="w-auto" onClick={() => setMode("harvest")}>Thu hoạch</Button>}
    {can("SkipLane") && <Button className="w-auto" variant="secondary" onClick={() => setMode("skip")}>Không thu</Button>}
    {mode === "harvest" && <HarvestForm zoneId={line.zone.id} raftId={line.raftId} plan={harvestPlanFor(plan, line)} onClose={() => setMode(undefined)} onSaved={done} />}
    {mode === "skip" && <SkipLanesDialog planId={plan.id} planCode={plan.code} line={line} onClose={() => setMode(undefined)} onDone={done} />}
  </span>;
}
