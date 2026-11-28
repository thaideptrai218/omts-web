"use client";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { stateLabel } from "@/features/farming-api/contracts";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { useCoordinateWarnings } from "@/features/farming-api/use-coordinate-warnings";
import { boundaryAreaHa } from "@/features/zone-boundary/boundary-geometry";
import { outsideRaftsText } from "@/features/zone-boundary/boundary-error-text";
import type { BoundaryWarning } from "@/features/zone-boundary/boundary-contract";
import { ZoneBoundaryDialog } from "./zone-boundary-dialog";
import { ZoneFormFields } from "./zone-form-fields";
import { DISCONTINUED, parseZoneDetail, validateZoneDraft, zoneBody, zoneDraftOf, zoneStatusLabel, type ZoneDetail, type ZoneDraft, type ZoneField } from "./zone-model";
import local from "./zone-tabs.module.css";

const repository = createWorkspaceRepository("zones");
/** "Ranh giới" row: where the licensed sea area came from and how big it is, or that there is none yet. */
export function boundarySummary(zone: Pick<ZoneDetail, "boundary">): string {
  if (!zone.boundary) return "Chưa có";
  const count = zone.boundary.features.length, area = boundaryAreaHa(zone.boundary);
  return `Theo sơ đồ cấp phép, ${count} vùng, ${area.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ha`;
}

/**
 * "Thông tin": read-only facts, or the same grid as inputs with `Bỏ qua` / `Lưu` in the footer.
 * The boundary has its own actions (Owner, zone In Use): `Cập nhật ranh giới` opens the editor dialog and `Xóa ranh giới` is asked of the panel.
 */
export function ZoneInfoTab({ zone, canEdit, canBoundary, canSeeLicense, busy, dirtyRef, onSaved, onReload, onStatus, onClearBoundary }: {
  zone: ZoneDetail; canEdit: boolean; canBoundary: boolean; canSeeLicense: boolean; busy: boolean; dirtyRef: RefObject<boolean>;
  onSaved(zone: ZoneDetail): void; onReload(): void; onStatus(): void; onClearBoundary(): void;
}) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<ZoneDraft>(() => zoneDraftOf(zone));
  const [errors, setErrors] = useState<Partial<Record<ZoneField, string>>>({}), [reloaded, setReloaded] = useState(false);
  const [boundaryOpen, setBoundaryOpen] = useState(false), [outside, setOutside] = useState<BoundaryWarning["details"]>();
  const mutation = useMutation(), warnCoordinates = useCoordinateWarnings();
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
    warnCoordinates(result);
    const record = parseZoneDetail(result);
    setEditing(false);
    if (record) onSaved(record); else onReload();
  }
  const boundaryActions = canBoundary && !editing;
  const outsideText = outsideRaftsText(outside);
  return <>
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
        {editing ? <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} /> : <Facts items={[
          ["Mã vùng", zone.code], ["Tên vùng", zone.name], ["Địa điểm", zone.location], ["Diện tích (ha)", zone.area?.toLocaleString("vi-VN")],
          ["Trạng thái", zoneStatusLabel(zone.statusId)], ["Ranh giới", boundarySummary(zone)],
          ...(canSeeLicense ? [["Hồ sơ giấy phép", zone.licenseState ? stateLabel(zone.licenseState) : "Xem ở tab Giấy phép"] as const] : []),
        ]} />}
      </fieldset>
      {outsideText && <div role="status" className={styles.alert}><p>{outsideText}</p><div><Button key="seen" type="button" className="w-auto" variant="secondary" onClick={() => setOutside(undefined)}>Đã xem</Button></div></div>}
      <ErrorNotice error={mutation.error} />
      {mutation.blocked && <div role="alert" className={styles.alert}><p>Chưa xác nhận được kết quả lưu. Hãy tải hồ sơ mới để đối chiếu; nội dung đang nhập vẫn được giữ.</p><div>
        <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => { onReload(); setReloaded(true); }}>Tải hồ sơ mới để đối chiếu</Button>
        {reloaded && !busy && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReloaded(false); }}>Đã đối chiếu, tiếp tục sửa</Button>}
      </div></div>}
      {(canEdit || boundaryActions) && <TabFooter
        left={boundaryActions && zone.boundary ? <button key="clear-boundary" type="button" className={local.footLink} disabled={locked} onClick={onClearBoundary}><InterfaceIcon name="trash" className="size-4" />Xóa ranh giới</button> : undefined}
        right={editing
          ? <><Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={cancel}>Bỏ qua</Button>
            <Button key="save" type="submit" className="w-auto" disabled={busy || mutation.blocked} isPending={mutation.pending}>Lưu</Button></>
          : <>{canEdit && <Button key="status" type="button" className="w-auto" variant="secondary" disabled={locked} onClick={onStatus}>{discontinued ? "Sử dụng lại vùng" : "Ngừng sử dụng vùng"}</Button>}
            {boundaryActions && <Button key="boundary" type="button" className="w-auto" variant="secondary" disabled={locked} onClick={() => setBoundaryOpen(true)}><InterfaceIcon name="zone" className="size-4" />Cập nhật ranh giới</Button>}
            {canEdit && !discontinued && <Button key="edit" type="button" className="w-auto" disabled={locked} onClick={begin}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}</>} />}
    </form>
    {boundaryOpen && <ZoneBoundaryDialog zone={zone} busy={busy} onReload={onReload} onClose={() => setBoundaryOpen(false)}
      onSaved={(record, warnings) => { setBoundaryOpen(false); setOutside(warnings.find(warning => warning.code === "RAFTS_OUTSIDE_ZONE_BOUNDARY")?.details ?? undefined); onSaved(record); }} />}
  </>;
}
