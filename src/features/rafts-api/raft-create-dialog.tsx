"use client";
import { useState } from "react";
import { useCodeProposal } from "@/features/api-workspace/use-code-proposal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository, type ApiRecord } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { RaftFormFields } from "./raft-form-fields";
import { useCoordinateWarnings } from "@/features/farming-api/use-coordinate-warnings";
import { emptyRaftDraft, raftBody, validateRaftDraft, type RaftDraft, type RaftField } from "./raft-model";

const repository = createWorkspaceRepository("rafts");
/** Creating a raft is a pop-up in the zone chosen in the filter column. */
export function RaftCreateDialog({ zoneId, zoneLabel, onClose, onCreated }: { zoneId: string; zoneLabel: string; onClose(): void; onCreated(record: ApiRecord): void }) {
  const [draft, setDraft] = useState<RaftDraft>(emptyRaftDraft), [errors, setErrors] = useState<Partial<Record<RaftField, string>>>({});
  const mutation = useMutation(), confirmation = useActionDialog(), warnCoordinates = useCoordinateWarnings();
  // The next free code ({zone}-B01...) is prefilled but stays editable; it does not count as a user change.
  const proposed = useCodeProposal(repository, code => setDraft(current => current.code ? current : { ...current, code }), zoneId);
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...emptyRaftDraft, code: proposed });
  async function close() { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); }
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    const found = validateRaftDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const created = await mutation.run(() => repository.mutate("create", raftBody(draft), undefined, zoneId));
    if (created) { warnCoordinates(created); onCreated(created); }
  }
  return <Dialog open size="lg" title="Thêm bè nuôi" description={`Vùng ${zoneLabel}`} dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>
    {confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked} className="min-w-0">
        <RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} only={["code"]} />
        <CollapsibleSection title="Thông tin bè" description="Kích thước, số làn và địa điểm bè."><RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} only={["size", "laneCount", "location"]} /></CollapsibleSection>
        <CollapsibleSection title="Vị trí trên bản đồ và tình trạng" description="Tọa độ và tình trạng hiện tại của bè."><RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} only={["latitude", "longitude", "conditionNotes"]} /></CollapsibleSection>
      </fieldset>
      <ErrorNotice error={mutation.error} />
      {mutation.blocked && <p role="alert" className="text-sm">Chưa xác nhận được kết quả lưu. Hãy đóng cửa sổ này và tải lại danh sách để đối chiếu trước khi thêm lại.</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button>
        <Button key="save" type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
      </div>
    </form>
  </Dialog>;
}
