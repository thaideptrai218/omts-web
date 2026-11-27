"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftFormFields } from "./raft-form-fields";
import { RaftConditionNoteCard } from "./raft-condition-note";
import { useRaftLaneLock } from "./use-raft-lane-lock";
import { RaftCurrentState } from "./raft-current-state-group";
import { RaftPhotoFrame } from "./raft-photo-frame";
import photoStyles from "./raft-photo-frame.module.css";
import { formatRaftSize } from "./raft-size";
import { useCoordinateWarnings } from "@/features/farming-api/use-coordinate-warnings";
import { DISCONTINUED, parseRaftDetail, raftBody, raftDraftOf, validateRaftDraft, type RaftDetail, type RaftDraft, type RaftField } from "./raft-model";

const repository = createWorkspaceRepository("rafts");
/**
 * "Thông tin": the "Hiện trạng" line from the raft record, then the facts, or the same grid as inputs with `Bỏ qua` / `Lưu` in the footer.
 * `onOpenCycles` (when the account may read cycles) makes the open cycle in "Hiện trạng" a link to the "Chu kỳ nuôi" tab.
 */
export function RaftInfoTab({ raft, zoneId, zoneLabel, canEdit, canEditPhotos = false, busy, dirtyRef, onSaved, onReload, onStatus, onOpenCycles }: {
  raft: RaftDetail; zoneId: string; zoneLabel: string; canEdit: boolean; /** May add and remove raft photos (the Owner). */ canEditPhotos?: boolean; busy: boolean; dirtyRef: RefObject<boolean>;
  onSaved(raft: RaftDetail): void; onReload(): void; onStatus(): void; onOpenCycles?(): void;
}) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<RaftDraft>(() => raftDraftOf(raft));
  const [errors, setErrors] = useState<Partial<Record<RaftField, string>>>({}), [reloaded, setReloaded] = useState(false);
  const mutation = useMutation(), warnCoordinates = useCoordinateWarnings();
  // The lane count is locked while a cycle is open: the record says so; only a backend that does not send it makes editing read the cycle history.
  const laneLock = useRaftLaneLock(raft.id, raft.currentCycle === undefined ? undefined : raft.currentCycle !== null, editing), laneCountLocked = laneLock.reason;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(raftDraftOf(raft));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const discontinued = raft.statusId === DISCONTINUED, locked = busy || mutation.pending;

  function begin() { setDraft(raftDraftOf(raft)); setErrors({}); setReloaded(false); mutation.reviewed(); setEditing(true); }
  function cancel() { if (mutation.busy()) return; setEditing(false); setErrors({}); mutation.reviewed(); }
  async function save() {
    if (!editing || mutation.busy() || mutation.blocked || busy) return;
    const found = validateRaftDraft(draft, raft.lanes);
    setErrors(found);
    if (Object.keys(found).length || (laneCountLocked && draft.laneCount !== raftDraftOf(raft).laneCount)) return;
    const result = await mutation.run(() => repository.mutate("update", raftBody(draft, raft.rowVersion, raft.lanes), raft.id));
    if (!result) return;
    warnCoordinates(result);
    const record = parseRaftDetail(result);
    setEditing(false);
    if (record) onSaved(record); else onReload();
  }
  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
      {!editing && <RaftCurrentState cycle={raft.currentCycle} onOpenCycles={onOpenCycles} />}
      {editing ? <RaftFormFields draft={draft} setDraft={setDraft} errors={errors} zoneId={zoneId} selfId={raft.id} laneCountLocked={laneCountLocked} lanes={raft.lanes} canEditLaneLengths={raft.lanes.some(lane => lane.lineLengthM !== undefined)} />
        : <div className={photoStyles.infoBody}>
          <RaftPhotoFrame raftId={raft.id} raftCode={raft.code} canEdit={canEditPhotos} />
          <div>
            <Facts items={[
        ["Mã bè", raft.code], ["Vùng nuôi", <Link key="zone" className={styles.link} href={farmingReferenceHref("zone", { recordId: zoneId })}>{zoneLabel}</Link>], ["Kích thước", formatRaftSize(raft.lengthM && raft.widthM ? `${raft.lengthM} m x ${raft.widthM} m` : raft.size)], ["Số làn", `${raft.laneCount ?? raft.lanes.filter(lane => lane.statusId !== 2002).length} làn`],
        ["Vị trí", raft.location], ["Trên bản đồ", raft.latitude != null && raft.longitude != null ? <Link key="map" className={styles.link} href={farmingReferenceHref("zone", { recordId: zoneId, tab: "map" })}>Xem trên bản đồ</Link> : "Chưa đặt vị trí trên bản đồ"],
      ]} />
            <RaftConditionNoteCard value={raft.conditionNotes} />
          </div>
        </div>}
    </fieldset>
    {editing && laneLock.failed && <Button key="retry-cycle" type="button" variant="secondary" className="w-auto" onClick={laneLock.reload}>Kiểm tra lại chu kỳ</Button>}
    <ErrorNotice error={mutation.error} />
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Chưa xác nhận được kết quả lưu. Hãy tải hồ sơ mới để đối chiếu; nội dung đang nhập vẫn được giữ.</p><div>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => { onReload(); setReloaded(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reloaded && !busy && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReloaded(false); }}>Đã đối chiếu, tiếp tục sửa</Button>}
    </div></div>}
    {canEdit && <TabFooter right={editing
      ? <><Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={cancel}>Bỏ qua</Button>
        <Button key="save" type="submit" className="w-auto" disabled={busy || mutation.blocked} isPending={mutation.pending}>Lưu</Button></>
      : <><Button key="status" type="button" className="w-auto" variant="secondary" disabled={locked} onClick={onStatus}>{discontinued ? "Sử dụng lại bè" : "Ngừng sử dụng bè"}</Button>
        {!discontinued && <Button key="edit" type="button" className="w-auto" disabled={locked} onClick={begin}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}</>} />}
  </form>;
}
