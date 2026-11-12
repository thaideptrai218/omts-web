"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageFileInput } from "@/components/form/image-file-input";
import { PhotoPicker } from "@/components/form/photo-picker";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { farmingFieldError } from "@/features/cultivation-api/farming-problem";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Note, useMutation } from "@/features/operations/ui";
import { messageCatalog } from "@/shared/messages/message-catalog";
import { damageValues, incidentActionLabel, outOfServiceValues, repairValues, restoreValues, type IncidentAction, type LaneIncident } from "./lane-incident-contracts";
import { LaneIncidentHistory } from "./lane-incident-history";
import { laneIncidentRepository } from "./lane-incident-repository";
import { LaneIncidentStock, type MaterialLine, type StockItem } from "./lane-incident-stock";

type Props = { action: IncidentAction; raftId: string; raftCode: string; zoneId: string; laneNumber: number; rowVersion: string; hasSeed: boolean; cycleRowVersion?: string; onClose(): void; onSaved(): void; onStateChange?(state: { dirty: boolean; pending: boolean }): void };
/** One repair command posts its material lines atomically; photo failures never replay that command. */
export function LaneIncidentForm({ action, raftId, raftCode, zoneId, laneNumber, rowVersion, hasSeed, cycleRowVersion, onClose, onSaved, onStateChange }: Props) {
  const [reason, setReason] = useState(""), [file, setFile] = useState<File>(), [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<File[]>([]), [photoBusy, setPhotoBusy] = useState(false), [photoError, setPhotoError] = useState<string>();
  const [lines, setLines] = useState<MaterialLine[]>([]), [stock, setStock] = useState<StockItem[]>();
  const [unavailable, setUnavailable] = useState(false), [eventSaved, setEventSaved] = useState(false);
  const [incidentId, setIncidentId] = useState<string>(), [photoFailure, setPhotoFailure] = useState(false), [photoUncertain, setPhotoUncertain] = useState(false), [compared, setCompared] = useState(false);
  const [comparedIncidents, setComparedIncidents] = useState<LaneIncident[]>([]);
  const mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  const dirty = !!reason || !!file || !!photos.length || !!lines.length || eventSaved;
  useEffect(() => { onStateChange?.({ dirty, pending: mutation.pending || photoBusy }); }, [dirty, mutation.pending, photoBusy, onStateChange]);
  useEffect(() => () => onStateChange?.({ dirty: false, pending: false }), [onStateChange]);
  const loaded = useCallback((items: StockItem[]) => setStock(items), []);
  const code = mutation.failure?.code;
  const knownError = code && Object.hasOwn(messageCatalog, code) ? messageCatalog[code as keyof typeof messageCatalog] : undefined;
  const target = { id: raftId, zoneId, laneNumber };
  async function uploadPhoto(savedId: string) {
    if (!file) return;
    const result = await laneIncidentRepository.photo(target, savedId, file);
    if (result.status === "success") { setFile(undefined); setPhotoFailure(false); onSaved(); return; }
    setPhotoFailure(true); setPhotoUncertain(result.uncertain); setCompared(false);
    setError(result.uncertain ? "Sự cố đã lưu. Ảnh chưa được xác nhận; tải lịch sử để đối chiếu trước khi gửi lại ảnh." : "Sự cố đã lưu. Chưa gửi được ảnh; bạn có thể gửi lại riêng ảnh.");
  }
  async function retryPhoto() {
    if (!incidentId || mutation.busy()) return;
    if (photoUncertain && (!compared || !await confirmation.confirm("Đã đối chiếu lịch sử và xác nhận ảnh này chưa được lưu? Chỉ gửi lại ảnh, không ghi lại sự cố."))) return;
    setError(undefined);
    await mutation.run(async () => { await uploadPhoto(incidentId); return { status: "success", data: true }; });
  }
  async function cancel() {
    if (!photoBusy && !mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi sự cố chưa lưu?"))) onClose();
  }
  async function save() {
    if (photoBusy || mutation.busy() || mutation.blocked || unavailable || eventSaved) return;
    if (action === "damage") {
      const bad = photoValidationMessage(photos.length); setPhotoError(bad);
      if (bad) return;
    }
    const withStock = action === "repair" || action === "restore";
    const schema = action === "damage" ? damageValues : action === "repair" ? repairValues : action === "restore" ? restoreValues : outOfServiceValues;
    const body = { rowVersion, ...(reason.trim() || !withStock ? { reason: reason.trim() } : {}),
      ...(withStock ? lines.length ? { materials: lines.map(line => ({ itemId: line.itemId, quantity: Number(line.quantity), unit: stock?.find(item => item.id === line.itemId)?.unit })) } : {}
      : action === "discontinue" && hasSeed ? { confirm: true, cycleRowVersion } : {}) };
    const parsed = schema.safeParse(body);
    if (!parsed.success) { setError(withStock ? "Số lượng vật tư phải lớn hơn 0, tối đa 3 số lẻ; lý do tối đa 500 ký tự." : "Nhập lý do (tối đa 500 ký tự)."); return; }
    if (withStock && lines.length && (!stock || lines.some(line => !stock.some(item => item.id === line.itemId && item.statusId === 101 && Number(line.quantity) <= item.onHand)))) {
      setError("Số lượng vật tư phải nằm trong tồn kho hiện có."); return;
    }
    if (action === "discontinue" && hasSeed && !cycleRowVersion) { setError("Chưa tải được phiên bản chu kỳ. Tải lại làn trước khi ngừng hoạt động."); return; }
    if (file && (!['image/jpeg', 'image/png'].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)) { setError("Ảnh phải là JPEG hoặc PNG, tối đa 10 MB."); return; }
    setError(undefined);
    if (action !== "repair" && !await confirmation.confirm(action === "restore" ? `Khôi phục hoạt động làn ${laneNumber}? Làn sẽ lại xuất hiện trong danh sách thả giống và thu hoạch.` : action === "discontinue" ? `Ngừng hoạt động làn ${laneNumber}? ${hasSeed ? "Một sự kiện mất giống không số lượng sẽ được ghi nhận; làn được coi là đã kết thúc khi đóng chu kỳ." : "Làn sẽ không xuất hiện trong danh sách chọn."}` : `Báo hỏng làn ${laneNumber}? Làn sẽ bị chặn thả giống và thu hoạch cho tới khi sửa xong.`)) return;
    let missing = false;
    const saved = await mutation.run(async () => {
      const result = await laneIncidentRepository.save(action, target, parsed.data, action === "damage" ? photos : undefined);
      if (result.status === "error" && result.httpStatus === 404) missing = true;
      return result;
    });
    if (missing) { setUnavailable(true); return; }
    if (!saved) return;
    setEventSaved(true);
    notify({ tone: "success", title: `Đã ${action === "damage" ? "báo hỏng" : action === "repair" ? "sửa" : action === "restore" ? "khôi phục hoạt động" : "ngừng hoạt động"} làn ${laneNumber} · ${raftCode}.` });
    if (file) {
      if (!saved.incident?.id) { setError("Sự cố đã lưu. Chưa có mã sự cố để gửi ảnh; hãy tải lại lịch sử làn trước khi bổ sung ảnh."); return; }
      setIncidentId(saved.incident.id);
      await mutation.run(async () => { await uploadPhoto(saved.incident!.id); return { status: "success", data: true }; });
      return;
    }
    onSaved();
  }
  return <form noValidate aria-label={`${incidentActionLabel[action]} làn ${laneNumber}`} onSubmit={event => { event.preventDefault(); void save(); }} className="mt-3 space-y-3">
    {confirmation.dialog}
    <fieldset disabled={mutation.pending || mutation.blocked || unavailable || eventSaved} className="grid gap-3">
      <Note label={action === "repair" ? "Nội dung sửa (tùy chọn)" : action === "restore" ? "Lý do khôi phục (tùy chọn)" : action === "damage" ? "Ghi chú sự cố: khi nào, làn nào, hỏng thế nào *" : "Lý do *"} required={action === "damage" || action === "discontinue"} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
      {action === "repair" || action === "restore" ? <LaneIncidentStock lines={lines} onChange={setLines} onLoaded={loaded} />
        : action === "damage" ? <PhotoPicker files={photos} onChange={value => { setPhotos(value); setPhotoError(undefined); }} onBusyChange={setPhotoBusy} error={photoError || farmingFieldError(mutation.failure?.problem, "Photos")} />
        : <ImageFileInput label="Ảnh sự cố (tùy chọn, JPEG/PNG, tối đa 10 MB)" accept="image/jpeg,image/png" onChange={event => setFile(event.target.files?.[0])} />}
      {action === "discontinue" && hasSeed && <p className="text-sm">Làn đang có giống: sẽ ghi sự kiện mất giống không số lượng và coi làn đã kết thúc khi đóng chu kỳ.</p>}
    </fieldset>
    {unavailable ? <p className="text-sm text-text-muted">Chưa có thao tác khả dụng cho làn này.</p> : <ErrorNotice error={error || mutation.failure?.problem?.message || knownError || mutation.error} />}
    {mutation.blocked && <p className="text-sm">Cần tải lại làn để đối chiếu kết quả trước khi thực hiện tiếp.</p>}
    {photoFailure && <div className="flex flex-wrap gap-2">
      {photoUncertain && <Button key="compare-photo" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={async () => {
        const result = await mutation.run(() => laneIncidentRepository.history(target), true);
        if (result) { setCompared(true); setComparedIncidents(result.incidents); setError(`Lịch sử hiện có ${result.incidents.find(value => value.id === incidentId)?.photos?.length ?? 0} ảnh cho sự cố này. Hãy xem ảnh trong Lịch sử trước khi xác nhận gửi lại.`); }
      }}>Đối chiếu ảnh trong lịch sử</Button>}
      <Button key="retry-photo" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoUncertain && !compared} onClick={() => void retryPhoto()}>Gửi lại ảnh</Button>
    </div>}
    {compared && <LaneIncidentHistory incidents={comparedIncidents} />}
    <div className="flex flex-wrap justify-end gap-2">
      {eventSaved || mutation.blocked ? <Button key="reload-incident" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={onSaved}>Tải lại làn</Button>
        : <Button key="cancel-incident" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={() => void cancel()}>Bỏ qua</Button>}
      <Button key="save-incident" type="submit" className="w-auto" isPending={mutation.pending} disabled={photoBusy || mutation.blocked || unavailable || eventSaved || lines.length > 0 && !stock}>Lưu</Button>
    </div>
  </form>;
}
