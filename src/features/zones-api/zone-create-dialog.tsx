"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { ZoneFormFields } from "./zone-form-fields";
import { emptyZoneDraft, validateZoneDraft, zoneBody, type ZoneDraft, type ZoneField } from "./zone-model";

const repository = createWorkspaceRepository("zones");
/** Creating a zone is one of the few pop-ups: grouped fields, `Bỏ qua` and `Lưu` in the footer. */
export function ZoneCreateDialog({ onClose, onCreated }: { onClose(): void; onCreated(): void }) {
  const [draft, setDraft] = useState<ZoneDraft>(emptyZoneDraft), [errors, setErrors] = useState<Partial<Record<ZoneField, string>>>({});
  const mutation = useMutation(), confirmation = useActionDialog();
  const dirty = JSON.stringify(draft) !== JSON.stringify(emptyZoneDraft);
  async function close() { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); }
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    const found = validateZoneDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const created = await mutation.run(() => repository.mutate("create", zoneBody(draft)));
    if (created) onCreated();
  }
  return <Dialog open size="lg" title="Thêm vùng nuôi" dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>
    {confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked} className="min-w-0">
        <CollapsibleSection title="Thông tin vùng"><ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["code", "name", "location", "area"]} /></CollapsibleSection>
        <CollapsibleSection title="Tọa độ"><ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["latitude", "longitude"]} /></CollapsibleSection>
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
