"use client";
import { useCallback, useEffect, useState } from "react";
import { useSelectedZones } from "@/features/api-workspace/selected-zones";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";
import { zoneOverviewSchema } from "./contracts";
import { dashboardZones, summarize } from "./water-overview-logic";

const repository = createOperationsRepository("water");
const REFRESH_CLOCK_MS = 60_000;

/** Đọc tổng quan các vùng đang sử dụng từ backend (qua BFF, một lần đọc cho mọi vùng) và giữ đồng hồ để chữ "x phút trước" tự cập nhật mỗi phút. */
export function useWaterZoneOverview() {
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("zones-overview", { inUseOnly: "true" }, zoneOverviewSchema, signal), []));
  const reloadRemote = remote.reload;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_CLOCK_MS);
    return () => clearInterval(timer);
  }, []);
  // Tải lại thì cũng lấy mốc thời gian mới để tránh so sánh với đồng hồ cũ.
  const reload = useCallback(() => { setNow(Date.now()); reloadRemote(); }, [reloadRemote]);
  // The zones chosen in the header narrow the grid; without a narrowing choice every zone shows.
  const { status, allSelected, selectedIds } = useSelectedZones();
  const inUse = remote.data && dashboardZones(remote.data);
  const items = inUse && status === "ready" && !allSelected ? inUse.filter(item => selectedIds.includes(item.zoneId)) : inUse;
  return { items, error: remote.error, loading: remote.loading, now, reload, summary: items ? summarize(items, now) : undefined };
}
