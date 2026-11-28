import type { ReactNode } from "react";
import { SelectedZonesProvider } from "@/features/api-workspace/selected-zones";

export { headerZoneIds, headerZones, inUseZonesMock } from "./header-zone-rows";

/** Test double for the header zone chip: the real provider over the three zones of header-zone-rows, so a screen's zone filter and the header can be checked as one state. */
const accountId = "header-zones-test";
/** Starts the header on a subset (or on every zone when `ids` is empty); the choice lives in localStorage like the real header. */
export function chooseHeaderZones(ids: readonly string[]) {
  localStorage.clear();
  if (ids.length) localStorage.setItem(`omts.selected-zones.v1.${accountId}`, JSON.stringify({ kind: "ids", ids }));
}
export function HeaderZones({ children }: { children: ReactNode }) {
  return <SelectedZonesProvider accountId={accountId} enabled>{children}</SelectedZonesProvider>;
}
