"use client";
import { useToast } from "@/components/ui/toast-provider";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { raftSchema, type Raft } from "@/features/farming-api/contracts";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { laneStatusLabel } from "./raft-model";

const MAX_PHOTO = 10 * 1024 * 1024, MAX_PHOTOS = 3;
/** "Ảnh và làn": up to three raft photos (upload for those who may edit) and the lanes of the raft. */
export function RaftPhotoTab({ raftId, canEdit }: { raftId: string; canEdit: boolean }) {
  const repository = useMemo(() => createOperationsRepository("raft-details"), []), mutation = useMutation();
  const [saved, setSaved] = useState<Raft>(), [latest, setLatest] = useState<Raft>(), [file, setFile] = useState<File>(), [fileError, setFileError] = useState<string>(), [fileKey, setFileKey] = useState(0);
  const { notify } = useToast();
  const detail = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id: raftId }, raftSchema, signal), [repository, raftId]));
  const record = saved ?? detail.data;
  async function upload() {
    if (!file || !canEdit || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.upload("upload-photo", [file], {}, raftSchema, raftId));
    if (result) { notify({ tone: "success", title: `Đã thêm ảnh bè ${result.code}.` }); setSaved(result); setFile(undefined); setFileKey(value => value + 1); }
  }
  if (detail.loading) return <Skeleton />;
  if (detail.error || !record) return <ListStateMessage error={detail.error ?? "Không tải được ảnh và làn của bè."} onRetry={detail.reload} retryLabel="Tải lại" />;
  const canAdd = canEdit && record.photos.length < MAX_PHOTOS;
  return <form noValidate onSubmit={event => { event.preventDefault(); void upload(); }}>
    <ErrorNotice error={mutation.error || fileError} />
    {saved && <p role="status" className={styles.hint}>Đã cập nhật ảnh bè.</p>}
    {record.photos.length ? <ul className="grid gap-3 sm:grid-cols-3" aria-label="Ảnh bè">{record.photos.map(photo => <li key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer" className={styles.link}>
      <Image key={record.rowVersion} src={photo.url} alt={`Ảnh ${photo.sortOrder} của bè ${record.code}`} width={600} height={400} unoptimized className="max-h-48 w-full rounded-control object-contain" />Xem ảnh gốc</a></li>)}</ul>
      : <p className={styles.hint}>Chưa có ảnh bè.</p>}
    {canEdit && !canAdd && <p className={styles.hint}>Bè đã có đủ {MAX_PHOTOS} ảnh.</p>}
    {canAdd && <fieldset disabled={mutation.pending || mutation.blocked} className="mt-3 min-w-0 border-0 p-0">
      <Field key={fileKey} label="Thêm ảnh bè (JPEG/PNG, tối đa 10 MB)" type="file" accept="image/jpeg,image/png" onChange={event => {
        const selected = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
        if (selected && (selected.size < 1 || selected.size > MAX_PHOTO || !["image/jpeg", "image/png"].includes(selected.type))) { setFileError("Ảnh phải là JPEG hoặc PNG, tối đa 10 MB."); event.target.value = ""; } else setFile(selected);
      }} /></fieldset>}
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Chưa gửi lại ảnh. Hãy đối chiếu ảnh hiện tại trên hệ thống.</p><div>
      <Button key="compare" type="button" className="w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => { const current = await mutation.run(() => repository.read("detail", { id: raftId }, raftSchema), true); if (current) setLatest(current); }}>Tải ảnh hiện tại để đối chiếu</Button>
      {latest && <><span>Hệ thống đang có {latest.photos.length} ảnh bè.</span><Button key="adopt" type="button" className="w-auto" variant="secondary" onClick={() => { setSaved(latest); setLatest(undefined); setFile(undefined); setFileKey(value => value + 1); mutation.reviewed(); }}>Đã đối chiếu, dùng dữ liệu hiện tại</Button></>}
    </div></div>}
    <h4 className="mt-5 text-sm font-semibold">Các làn của bè</h4>
    {record.lanes.length === 0 ? <p className={styles.hint}>Bè chưa có làn.</p> : <table className={styles.subTable}><thead><tr><th scope="col">Làn</th><th scope="col">Trạng thái</th></tr></thead>
      <tbody>{record.lanes.map(lane => <tr key={lane.id}><td>Làn {lane.laneNumber}</td><td>{laneStatusLabel(lane.statusId)}</td></tr>)}</tbody></table>}
    {canAdd && <TabFooter right={<Button key="save-photo" type="submit" className="w-auto" isPending={mutation.pending} disabled={!file || mutation.blocked}>Lưu ảnh bè</Button>} />}
  </form>;
}
