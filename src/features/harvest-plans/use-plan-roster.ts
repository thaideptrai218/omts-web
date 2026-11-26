"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanRoster } from "./contracts";
import { describeRosterChanges } from "./plan-roster-logic";
import { planRepository, rosterErrorText } from "./repository";

export const ROSTER_POLL_MS = 5000;

/**
 * The roster of a plan kept near real time: read once, then every 5 seconds while the page is visible and `active` (a plan that is Completed or Cancelled is read once and left alone).
 * A read that finds the same `rosterVersion` changes nothing on screen. The hook keeps the last good roster when a poll fails, tells when it was updated, and reports who confirmed or declined
 * since the last read (`news`), except for what the caller itself changed (`accept`).
 */
export function usePlanRoster(planId: string, active: boolean) {
  const [roster, setRoster] = useState<PlanRoster>(), [error, setError] = useState<string>(), [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date>(), [news, setNews] = useState<string[]>([]);
  const current = useRef<PlanRoster | undefined>(undefined), inFlight = useRef(false);

  /** A roster the caller got from its own change: shown at once, never announced as news. */
  const accept = useCallback((next: PlanRoster) => { current.current = next; setRoster(next); setUpdatedAt(new Date()); setError(undefined); setLoading(false); }, []);

  const read = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const result = await planRepository.roster(planId, signal);
    inFlight.current = false;
    if (signal?.aborted) return;
    if (result.status !== "success") { setLoading(false); setError(rosterErrorText(result) ?? "Không tải được danh sách nhân công."); return; }
    setError(undefined); setLoading(false); setUpdatedAt(new Date());
    if (current.current?.rosterVersion === result.data.rosterVersion) return;
    const fresh = describeRosterChanges(current.current, result.data);
    current.current = result.data; setRoster(result.data);
    if (fresh.length) setNews(fresh);
  }, [planId]);

  useEffect(() => {
    const controller = new AbortController();
    // The first read starts after the effect body, like the other readers of the app, so no state is set while the effect runs.
    void Promise.resolve().then(() => read(controller.signal));
    if (!active) return () => { controller.abort(); inFlight.current = false; };
    const visible = () => document.visibilityState === "visible";
    const timer = setInterval(() => { if (visible()) void read(controller.signal); }, ROSTER_POLL_MS);
    const onVisible = () => { if (visible()) void read(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); inFlight.current = false; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [read, active]);

  return { roster, error, loading, updatedAt, news, dismissNews: () => setNews([]), accept, refresh: () => read() };
}
