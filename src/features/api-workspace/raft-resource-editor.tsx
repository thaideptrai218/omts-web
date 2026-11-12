"use client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { RaftCreateDialog } from "@/features/rafts-api/raft-create-dialog";
import { RaftDetailPanel } from "@/features/rafts-api/raft-detail-panel";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { createWorkspaceRepository, type ApiRecord } from "./workspace-repository";

/** Legacy workspace entry points share the production raft editor and its in-place detail. */
export function RaftResourceEditor({ record, canEdit, zones, zoneId, onClose, onSaved }: {
  record: ApiRecord | null; canEdit: boolean; zones: ApiRecord[]; zoneId: string;
  onClose(): void; onSaved(record: ApiRecord): void;
}) {
  const guard = useUnsavedGuard();
  const { notify } = useToast();
  const zone = zones.find(entry => entry.id === zoneId);
  const zoneLabel = zone ? String(zone.code ?? zone.name) : "";
  async function changed() {
    if (!record) return;
    notify({ tone: "success", title: `Đã cập nhật bè ${String(record.code ?? "")}.` });
    const result = await createWorkspaceRepository("rafts").detail(record.id);
    if (result.status === "success") onSaved(result.data);
  }
  if (!record) return <RaftCreateDialog zoneId={zoneId} zoneLabel={zoneLabel} onClose={onClose} onCreated={saved => {
    notify({ tone: "success", title: `Đã thêm bè ${String(saved.code ?? "")}.` }); onSaved(saved);
  }} />;
  return <div>
    {guard.dialog}
    <RaftDetailPanel id={record.id} zoneId={zoneId} zoneLabel={zoneLabel} access={{ edit: canEdit, photoEdit: canEdit, cycles: false, costs: false }} guard={guard} onChanged={() => void changed()} />
    <Button key="close-raft" type="button" variant="secondary" className="mt-3 w-auto" onClick={() => void guard.leave(onClose)}>Thu gọn</Button>
  </div>;
}
