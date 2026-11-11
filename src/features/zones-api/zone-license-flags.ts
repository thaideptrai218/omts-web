import { useEffect, useMemo, useState } from "react";
import { licenseOverviewSchema } from "@/features/farming-api/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday } from "@/features/operations/ui";

/** Licence flag per zone id: Missing | Expired | ExpiringSoon | NotYetEffective | Valid, computed from the zone's licence overview. */
export type ZoneLicenseFlags = ReadonlyMap<string, string>;

const severity = ["Missing", "Expired", "ExpiringSoon", "NotYetEffective", "Valid"] as const;
/**
 * The zone list only carries a badge (Expired / ExpiringSoon, null when fine, when there is no licence, or for staff), so "no badge" never means "Missing".
 * The real flag comes from the licence overview: any required type without a valid document is Missing, otherwise the worst state present.
 */
export function licenseFlagOf(rows: readonly { state: string }[]): string {
  if (!rows.length) return "Missing";
  const states = new Set(rows.map(row => row.state));
  return severity.find(state => states.has(state)) ?? "Valid";
}

const BATCH = 4;
/** Reads the licence overview of each zone lazily (a few at a time) once `enabled`; a zone that fails to load simply has no flag ("—"). */
export function useZoneLicenseFlags(zoneIds: readonly string[], enabled: boolean): { flags: ZoneLicenseFlags; loading: boolean } {
  const [flags, setFlags] = useState<ReadonlyMap<string, string>>(new Map()), [loading, setLoading] = useState(false);
  const key = useMemo(() => [...zoneIds].sort().join(","), [zoneIds]);
  useEffect(() => {
    if (!enabled || !key) return;
    const controller = new AbortController(), repository = createOperationsRepository("zone-licenses"), asOf = businessToday(), ids = key.split(",");
    void (async () => {
      setLoading(true);
      for (let start = 0; start < ids.length && !controller.signal.aborted; start += BATCH) {
        const batch = await Promise.all(ids.slice(start, start + BATCH).map(async id => {
          const result = await repository.read("list", { zoneId: id, asOf }, licenseOverviewSchema, controller.signal);
          return result.status === "success" ? [id, licenseFlagOf(result.data.licenses)] as const : undefined;
        }));
        if (controller.signal.aborted) return;
        setFlags(previous => new Map([...previous, ...batch.flatMap(entry => entry ? [entry] : [])]));
      }
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [enabled, key]);
  return { flags, loading: enabled && loading };
}
