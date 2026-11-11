"use client";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { stateLabel } from "@/features/farming-api/contracts";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { ZoneFormFields } from "./zone-form-fields";
import { DISCONTINUED, parseZoneDetail, validateZoneDraft, zoneBody, zoneDraftOf, zoneStatusLabel, type ZoneDetail, type ZoneDraft, type ZoneField } from "./zone-model";

const repository = createWorkspaceRepository("zones");
/** "Thông tin": read-only facts, or the same grid as inputs with `Bỏ qua` / `Lưu` in the footer. */
export function ZoneInfoTab({ zone, canEdit, canSeeLicense, busy, dirtyRef, onSaved, onReload, onStatus }: {
  zone: ZoneDetail; canEdit: boolean; canSeeLicense: boolean; busy: boolean; dirtyRef: RefObject<boolean>;
  onSaved(zone: ZoneDetail): void; onReload(): void; onStatus(): void;
}) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<ZoneDraft>(() => zoneDraftOf(zone));
  const [errors, setErrors] = useState<Partial<Record<ZoneField, string>>>({}), [reloaded, setReloaded] = useState(false);
  const mutation = useMutation();
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(zoneDraftOf(zone));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const discontinued = zone.statusId === DISCONTINUED;
  const locked = busy || mutation.pending;

  function begin() { setDraft(zoneDraftOf(zone)); setErrors({}); setReloaded(false); mutation.reviewed(); setEditing(true); }
  function cancel() { if (mutation.busy()) return; setEditing(false); setErrors({}); mutation.reviewed(); }
  async function save() {
    if (!editing || mutation.busy() || mutation.blocked || busy) return;
    const found = validateZoneDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const result = await mutation.run(() => repository.mutate("update", zoneBody(draft, zone.rowVersion), zone.id));
    if (!result) return;
    const record = parseZoneDetail(result);
    setEditing(false);
    if (record) onSaved(record); else onReload();
  }
  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
      {editing ? <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} /> : <Facts items={[
        ["Mã vùng", zone.code], ["Tên vùng", zone.name], ["Vị trí", zone.location], ["Diện tích (ha)", zone.area?.toLocaleString("vi-VN")],
        ["Trạng thái", zoneStatusLabel(zone.statusId)], ["Vĩ độ", zone.latitude], ["Kinh độ", zone.longitude],
        ...(canSeeLicense ? [["Hồ sơ giấy phép", zone.licenseState ? stateLabel(zone.licenseState) : "Thiếu hồ sơ"] as const] : []),
      ]} />}
    </fieldset>
    <ErrorNotice error={mutation.error} />
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Chưa xác nhận được kết quả lưu. Hãy tải hồ sơ mới để đối chiếu; nội dung đang nhập vẫn được giữ.</p><div>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => { onReload(); setReloaded(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reloaded && !busy && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReloaded(false); }}>Đã đối chiếu, tiếp tục sửa</Button>}
    </div></div>}
    {canEdit && <TabFooter right={editing
      ? <><Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={cancel}>Bỏ qua</Button>
        <Button key="save" type="submit" className="w-auto" disabled={busy || mutation.blocked} isPending={mutation.pending}>Lưu</Button></>
      : <><Button key="status" type="button" className="w-auto" variant="secondary" disabled={locked} onClick={onStatus}>{discontinued ? "Sử dụng lại vùng" : "Ngừng sử dụng vùng"}</Button>
        {!discontinued && <Button key="edit" type="button" className="w-auto" disabled={locked} onClick={begin}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}</>} />}
  </form>;
}
