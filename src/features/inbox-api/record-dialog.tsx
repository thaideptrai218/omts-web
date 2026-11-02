"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { waterSchema, type WaterMeasurement } from "@/features/operations/contracts";
import { MeasurementEditor, WaterScreen } from "@/features/operations/water-screen";
import { licenseSchema, type License } from "@/features/farming-api/contracts";
import { LicenseEditor } from "@/features/farming-api/license-screen";
import { businessToday, ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { OpenedNotification } from "./contracts";

type RecordView = { kind: "water"; record: WaterMeasurement } | { kind: "license"; record: License };
export function NotificationRecordDialog({ opened, onClose }: { opened: OpenedNotification; onClose(): void }) {
  if (opened.recordType === "FarmingZone") return <Dialog open title="Đo nước theo thông báo" size="xl" onOpenChange={(open) => { if (!open) onClose(); }}><WaterScreen initialZoneId={opened.recordId} /><Button className="mt-4 w-auto" variant="secondary" onClick={onClose}>Về hộp thư</Button></Dialog>;
  return <NotificationRecordLoader opened={opened} onClose={onClose} />;
}
function NotificationRecordLoader({ opened, onClose }: { opened: OpenedNotification; onClose(): void }) {
  const load = useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<RecordView>> => {
    if (opened.recordType === "WaterMeasurement") {
      const result = await createOperationsRepository("water").read("detail", { id: opened.recordId }, waterSchema, signal);
      if (result.status === "error") return result;
      return result.data.id === opened.recordId && result.data.zoneId === opened.zoneId
        ? { status: "success", data: { kind: "water", record: result.data } } : { status: "error", httpStatus: 502, uncertain: false };
    }
    if (opened.recordType === "ZoneComplianceDocument") {
      const result = await createOperationsRepository("zone-licenses").read("detail", { id: opened.recordId, asOf: businessToday() }, licenseSchema, signal);
      if (result.status === "error") return result;
      return result.data.id === opened.recordId ? { status: "success", data: { kind: "license", record: result.data } } : { status: "error", httpStatus: 502, uncertain: false };
    }
    return { status: "error", httpStatus: 400, uncertain: false };
  }, [opened.recordType, opened.recordId, opened.zoneId]);
  const remote = useRemote(load);
  if (remote.data) return <NotificationRecordEditor initial={remote.data} onClose={onClose} />;
  return <Dialog open title="Hồ sơ liên quan" onOpenChange={(open) => { if (!open) onClose(); }}>
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />{remote.error && <Button variant="secondary" onClick={remote.reload}>Tải lại hồ sơ</Button>}
  </Dialog>;
}
function NotificationRecordEditor({ initial, onClose }: { initial: RecordView; onClose(): void }) {
  const [value, setValue] = useState(initial), [mode, setMode] = useState<"view" | "update" | "replace">("view"), [serial, setSerial] = useState(0), [error, setError] = useState<string>();
  if (value.kind === "license") return <LicenseEditor key={serial} mode={mode} record={value.record} zoneId={value.record.zones[0]?.id ?? ""} zones={[]}
    onClose={onClose} onMode={(next) => { if (next !== "create") { setMode(next); setSerial((current) => current + 1); } }}
    onNavigate={(record) => { setValue({ kind: "license", record }); setMode("view"); setSerial((current) => current + 1); }}
    onSaved={(record) => { setValue({ kind: "license", record }); setMode("view"); setSerial((current) => current + 1); }} />;
  return <>{error && <Dialog open title="Chưa tải được phiên bản" onOpenChange={(open) => { if (!open) setError(undefined); }}><p role="alert">{error}</p><Button onClick={() => setError(undefined)}>Về hồ sơ</Button></Dialog>}<MeasurementEditor key={serial} record={value.record} onClose={onClose}
    onSaved={(record) => { setValue({ kind: "water", record }); setSerial((current) => current + 1); }} onOpen={async (id) => {
      const next = await createOperationsRepository("water").read("detail", { id }, waterSchema);
      if (next.status === "success" && next.data.id === id) { setValue({ kind: "water", record: next.data }); setError(undefined); setSerial((current) => current + 1); }
      else setError("Chưa thể tải phiên bản phép đo. Hãy đóng hồ sơ và thử mở lại.");
    }} /></>;
}
