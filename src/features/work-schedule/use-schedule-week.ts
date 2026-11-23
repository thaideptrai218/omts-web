"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { operationError } from "@/features/operations/ui";
import { weekDays, type DayState } from "./schedule-model";
import { scheduleService } from "./schedule-service";

/** Seven independent reads: a failed day never erases the other six. Key the consumer by week. */
export function useScheduleWeek(monday: string) {
  const [days, setDays] = useState<DayState[]>(() => weekDays(monday).map((day) => ({ day, rows: [], loading: true })));
  const requests = useRef(new Map<string, AbortController>());

  const load = useCallback(async (day: string) => {
    requests.current.get(day)?.abort();
    const controller = new AbortController();
    requests.current.set(day, controller);
    setDays((current) => current.map((entry) => entry.day === day ? { day, rows: [], loading: true } : entry));
    try {
      const result = await scheduleService.day(day, controller.signal);
      if (controller.signal.aborted) return;
      setDays((current) => current.map((entry) => entry.day !== day ? entry : result.status === "success"
        ? { day, rows: result.data.filter((row) => row.date === day), loading: false }
        : { day, rows: [], loading: false, error: operationError(result) }));
    } catch {
      if (!controller.signal.aborted) setDays((current) => current.map((entry) => entry.day === day
        ? { day, rows: [], loading: false, error: "Không tải được lịch. Kiểm tra kết nối rồi thử lại." } : entry));
    }
  }, []);

  useEffect(() => {
    const activeRequests = requests.current;
    // Defer the initial state writes; all seven requests then start without waiting for one another.
    void Promise.resolve().then(() => {
      if (!disposed) for (const day of weekDays(monday)) void load(day);
    });
    let disposed = false;
    return () => { disposed = true; activeRequests.forEach((controller) => controller.abort()); };
  }, [monday, load]);

  return { days, retry: load };
}
