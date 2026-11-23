"use client";
import { useCallback } from "react";
import type { RemoteView } from "@/features/api-workspace/overview-card";
import { useSelectedZones } from "@/features/api-workspace/selected-zones";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useRemote } from "@/features/operations/ui";

/** Một vùng một lần đọc; quá số này thì bỏ bớt để màn Tổng quan không gọi API quá nhiều. */
const MAX_ZONES = 8;

/**
 * Đọc một API theo từng vùng đang chọn ở thanh trên (API ươm và nước chỉ đọc được một vùng một lần), tải song song.
 * Một vùng lỗi thì cả khối báo lỗi (có nút Thử lại) thay vì hiện số thiếu; `read` phải là hàm cố định (khai báo ngoài component).
 */
export function useZoneReads<T>(read: (zoneId: string, signal: AbortSignal) => Promise<WorkspaceResult<T>>): RemoteView<T[]> {
  const selection = useSelectedZones();
  const ready = selection.status === "ready";
  const key = ready ? selection.selectedIds.slice(0, MAX_ZONES).join(",") : "";
  const remote = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<T[]>> => {
    const results = await Promise.all((key ? key.split(",") : []).map((zoneId) => read(zoneId, signal)));
    const data: T[] = [];
    for (const result of results) {
      if (result.status !== "success") return result;
      data.push(result.data);
    }
    return { status: "success", data };
  }, [key, read]));
  // Danh sách vùng còn đang tải: giữ khung chờ thay vì hiện "không có việc".
  return selection.status === "loading" ? { loading: true, reload: remote.reload } : remote;
}
