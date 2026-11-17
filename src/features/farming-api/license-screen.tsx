"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { loadOptions } from "@/features/operations/lookups";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { ZoneLicensesTab } from "@/features/zones-api/zone-licenses-tab";
/** Compatibility entry for the resource editor; the documents now stay in its opened detail. */
export function LicenseWorkspace({ zoneId, zoneName, onClose }: { zoneId: string; zoneName: string; onClose(): void }) {
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  return <section aria-label={`Giấy tờ vùng ${zoneName}`}>
    {zones.loading ? <Skeleton /> : zones.error || !zones.data ? <ListStateMessage error={zones.error ?? "Không tải được vùng nuôi."} onRetry={zones.reload} retryLabel="Tải lại" /> : <ZoneLicensesTab zoneId={zoneId} zones={zones.data} />}
    <TabFooter left={<Button key="close-licenses" type="button" className="w-auto" variant="ghost" onClick={onClose}>Thu gọn giấy tờ</Button>} />
  </section>;
}
export { LicenseEditor } from "./license-editor";
