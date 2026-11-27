"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { raftSchema, type Raft } from "@/features/farming-api/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import styles from "./raft-photo-frame.module.css";

const MAX_PHOTO = 10 * 1024 * 1024, MAX_PHOTOS = 3, TYPES = ["image/jpeg", "image/png"];
/**
 * The raft's photos, on the left of "Thông tin" like the photos of an input item: the main photo, thumbnails under it and, for those who may edit photos,
 * add and remove (a raft keeps up to three; remove one to put another in its place). The photos are read here, when the tab opens.
 */
export function RaftPhotoFrame({ raftId, raftCode, canEdit }: { raftId: string; raftCode: string; canEdit: boolean }) {
  const repository = useMemo(() => createOperationsRepository("raft-details"), []), mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id: raftId }, raftSchema, signal), [repository, raftId]));
  const [saved, setSaved] = useState<Raft>(), [shown, setShown] = useState(0), [fileError, setFileError] = useState<string>(), input = useRef<HTMLInputElement>(null);
  const record = saved ?? remote.data, photos = record?.photos ?? [], current = Math.min(shown, Math.max(0, photos.length - 1));
  async function add(file: File | undefined) {
    if (!file || !canEdit || mutation.busy() || mutation.blocked) return;
    if (file.size < 1 || file.size > MAX_PHOTO || !TYPES.includes(file.type)) { setFileError("Ảnh phải là JPEG hoặc PNG, tối đa 10 MB."); return; }
    setFileError(undefined);
    const result = await mutation.run(() => repository.upload("upload-photo", [file], {}, raftSchema, raftId));
    if (result) { notify({ tone: "success", title: `Đã thêm ảnh bè ${result.code}.` }); setSaved(result); setShown(result.photos.length - 1); }
  }
  async function remove() {
    const photo = photos[current];
    if (!photo || !canEdit || mutation.busy() || mutation.blocked) return;
    if (!(await confirmation.confirm(`Xóa ảnh ${photo.sortOrder} của bè? Ảnh bị xóa khỏi hồ sơ bè và không khôi phục được.`))) return;
    const result = await mutation.run(() => repository.post("delete-photo", { id: raftId, photoId: photo.id }, raftSchema));
    if (result) { notify({ tone: "success", title: `Đã xóa ảnh bè ${result.code}.` }); setSaved(result); setShown(0); }
  }
  if (remote.loading) return <div className={styles.gallery}><Skeleton /></div>;
  return <div className={styles.gallery} aria-label="Ảnh bè">
    {confirmation.dialog}
    <span className={styles.photoMain}>{photos[current]
      // eslint-disable-next-line @next/next/no-img-element -- address streamed by the BFF photo route, not for the image optimiser of Next
      ? <img key={record?.rowVersion} src={photos[current].url} alt={`Ảnh ${photos[current].sortOrder} của bè ${raftCode}`} />
      : remote.error ? "Không tải được ảnh" : "Chưa có ảnh bè"}</span>
    {photos.length > 1 && <span className={styles.thumbs}>{photos.map((photo, index) => <button key={photo.id} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-current={index === current} onClick={() => setShown(index)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
      <img src={photo.url} alt="" /></button>)}</span>}
    {canEdit && <span className={styles.tools}>
      <input ref={input} type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label="Chọn ảnh bè" onChange={event => { void add(event.target.files?.[0]); event.target.value = ""; }} />
      {photos.length < MAX_PHOTOS && <Button type="button" variant="ghost" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => input.current?.click()}><InterfaceIcon name="add" className="size-4" />Thêm ảnh</Button>}
      {photos.length > 0 && <Button type="button" variant="ghost" className="w-auto" disabled={mutation.pending || mutation.blocked} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa ảnh</Button>}
    </span>}
    {canEdit && photos.length >= MAX_PHOTOS && <p className="text-xs text-text-muted">Bè đã có đủ {MAX_PHOTOS} ảnh. Xóa một ảnh để thêm ảnh khác.</p>}
    <ErrorNotice error={fileError || mutation.error || remote.error} />
    {remote.error && <Button type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại ảnh</Button>}
  </div>;
}
