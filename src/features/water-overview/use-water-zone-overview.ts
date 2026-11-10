"use client";
import { useCallback, useEffect, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";
import { zoneOverviewSchema } from "./contracts";
import { summarize } from "./water-overview-logic";

const repository = createOperationsRepository("water");
const REFRESH_CLOCK_MS = 60_000;

/** Đọc tổng quan vùng từ backend (qua BFF) và giữ đồng hồ để chữ "x phút trước" tự cập nhật mỗi phút. */
export function useWaterZoneOverview() {
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("zones-overview", {}, zoneOverviewSchema, signal), []));
  const reloadRemote = remote.reload;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_CLOCK_MS);
    return () => clearInterval(timer);
  }, []);
  // Tải lại thì cũng lấy mốc thời gian mới để tránh so sánh với đồng hồ cũ.
  const reload = useCallback(() => { setNow(Date.now()); reloadRemote(); }, [reloadRemote]);
  return { items: remote.data, error: remote.error, loading: remote.loading, now, reload, summary: remote.data ? summarize(remote.data, now) : undefined };
}
