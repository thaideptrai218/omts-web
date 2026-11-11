"use client";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { HarvestSettings } from "./harvest-settings";
import { useAllowed } from "./records-shared";
import { z } from "zod";
import { RaftCycleWorkspace } from "@/features/cycles-api/raft-cycle-workspace";
import { Skeleton } from "@/features/operations/ui";
import { zoneCycle } from "./contracts";
import { RecordsRaftPanel } from "./records-raft-panel";
import { cycleRepo, type RecordsArea as Area } from "./records-shared";

const titles: Record<Area, string> = { seeding: "Thả giống", "material-usages": "Sử dụng vật tư", harvest: "Thu hoạch" };
const loadRaftRows = (zoneId: string, signal: AbortSignal) => cycleRepo.read("list", { zoneId }, z.array(zoneCycle), signal);

/** Seeding, material-usage or harvest records: one row per raft of the chosen zone, each opening its records in place. */
export function CultivationRecordsScreen({ area }: { area: Area }) {
  const [settings, setSettings] = useState(false);
  const allowed = useAllowed("harvest", "");
  if (settings) return <HarvestSettings onClose={() => setSettings(false)} />;
  // useSearchParams needs a Suspense boundary.
  return <Suspense fallback={<Skeleton />}>
    <RaftCycleWorkspace storageKey={area} icon={area === "material-usages" ? "material" : "raft"} title={titles[area]} area={area} loadRows={loadRaftRows}
      actions={area === "harvest" && allowed("Owner") ? <Button type="button" variant="secondary" className="w-auto" onClick={() => setSettings(true)}>Thiết lập thu hoạch</Button> : undefined}
      renderDetail={({ row, zoneId }) => <RecordsRaftPanel area={area} row={row} zoneId={zoneId} />} />
  </Suspense>;
}
