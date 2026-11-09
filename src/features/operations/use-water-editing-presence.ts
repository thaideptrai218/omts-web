import { useEffect, useState } from "react";
import { z } from "zod";
import * as c from "./contracts";
import { waterRepository as repository } from "./water-measurement-shared";

const HEARTBEAT_INTERVAL_MS = 4 * 60_000;

/**
 * Announces "I am editing this measurement" while correcting/voiding, refreshing every 4 minutes,
 * and releases the presence (after any in-flight heartbeat) when the mode changes or the dialog unmounts.
 */
export function useWaterEditingPresence(
  measurementId: string,
  canEdit: boolean,
  mode: string,
  initialEditors: c.WaterMeasurement["currentEditors"],
) {
  const [editors, setEditors] = useState(initialEditors);
  const [presenceError, setPresenceError] = useState(false);

  useEffect(() => {
    if (!canEdit || mode !== "correct" && mode !== "void") return;
    let active = true;
    let inFlight: Promise<unknown> = Promise.resolve();
    const heartbeat = () => {
      inFlight = repository.write("editing", {}, c.editingSchema, measurementId).then((result) => {
        if (!active) return;
        setPresenceError(result.status !== "success");
        if (result.status === "success") setEditors(result.data.otherEditors);
      });
    };
    heartbeat();
    const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
      void inFlight.finally(() =>
        repository.write("stop-editing", {}, z.object({ stopped: z.literal(true) }), measurementId));
    };
  }, [canEdit, mode, measurementId]);

  return { editors, presenceError };
}
