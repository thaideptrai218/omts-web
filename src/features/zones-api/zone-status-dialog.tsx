"use client";
import { StatusConfirmDialog } from "@/features/farming-management/status-confirm-dialog";
import type { ZoneDetail } from "./zone-model";

export type ZoneStatusAction = "discontinue" | "reactivate";

/** Stopping or resuming a zone: same one-step confirmation as the employee status dialog. */
export function ZoneStatusDialog({ action, zone, pending, busy, onCancel, onConfirm }: {
  action: ZoneStatusAction; zone: ZoneDetail; pending: boolean; busy(): boolean; onCancel(): void; onConfirm(): void;
}) {
  const stopping = action === "discontinue";
  return <StatusConfirmDialog title={stopping ? "Ngừng sử dụng vùng?" : "Sử dụng lại vùng?"} subject={`${zone.code} · ${zone.name}`}
    description={stopping ? "Hồ sơ và lịch sử vẫn được giữ. Vùng chỉ ngừng được khi không còn bè đang sử dụng." : "Vùng xuất hiện trở lại trong các danh mục đang sử dụng. Hồ sơ giấy phép vẫn được kiểm tra riêng."}
    confirmLabel={stopping ? "Xác nhận ngừng sử dụng" : "Xác nhận sử dụng lại"} pending={pending} busy={busy} onCancel={onCancel} onConfirm={onConfirm} />;
}
