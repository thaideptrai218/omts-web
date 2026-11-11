"use client";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftFormFields } from "./raft-form-fields";
import { DISCONTINUED, laneStatusLabel, parseRaftDetail, raftBody, raftDraftOf, raftStatusLabel, validateRaftDraft, type RaftDetail, type RaftDraft, type RaftField } from "./raft-model";

const repository = createWorkspaceRepository("rafts");
/** "Thông tin": read-only facts, or the same grid as inputs with `Bỏ qua` / `Lưu` in the footer. */
export function RaftInfoTab({ raft, zoneLabel, canEdit, busy, dirtyRef, onSaved, onReload, onStatus }: {
  raft: RaftDetail; zoneLabel: string; canEdit: boolean; busy: boolean; dirtyRef: RefObject<boolean>;
  onSaved(raft: RaftDetail): void; onReload(): void; onStatus(): void;
}) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<RaftDraft>(() => raftDraftOf(raft));
  const [errors, setErrors] = useState<Partial<Record<RaftField, string>>>({}), [reloaded, setReloaded] = useState(false);
  const mutation = useMutation();
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(raftDraftOf(raft));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const discontinued = raft.statusId === DISCONTINUED, locked = busy || mutation.pending;

  function begin() { setDraft(raftDraftOf(raft)); setErrors({}); setReloaded(false); mutation.reviewed(); setEditing(true); }
  function cancel() { if (mutation.busy()) return; setEditing(false); setErrors({}); mutation.reviewed(); }
  async function save() {
    if (!editing || mutation.busy() || mutation.blocked || busy) return;
    const found = validateRaftDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const result = await mutation.run(() => repository.mutate("update", raftBody(draft, raft.rowVersion), raft.id));
    if (!result) return;
    const record = parseRaftDetail(result);
    setEditing(false);
    if (record) onSaved(record); else onReload();
  }
  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
      {editing ? <RaftFormFields draft={draft} setDraft={setDraft} errors={errors} /> : <Facts items={[
        ["Mã bè", raft.code], ["Vùng nuôi", zoneLabel], ["Kích thước", raft.size], ["Số làn đang dùng", raft.laneCount ?? raft.lanes.length], ["Trạng thái", raftStatusLabel(raft.statusId)],
        ["Vị trí", raft.location], ["Vĩ độ", raft.latitude], ["Kinh độ", raft.longitude], ["Tình trạng bè", raft.conditionNotes],
      ]} />}
    </fieldset>
    {!editing && raft.lanes.length > 0 && <p className={styles.hint}>{raft.lanes.map(lane => `Làn ${lane.laneNumber}: ${laneStatusLabel(lane.statusId).toLocaleLowerCase("vi")}`).join(" · ")}</p>}
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
