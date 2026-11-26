"use client";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useCodeProposal } from "@/features/api-workspace/use-code-proposal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, operationError, useMutation } from "@/features/operations/ui";
import { useCoordinateWarnings } from "@/features/farming-api/use-coordinate-warnings";
import styles from "@/features/farming-management/farming-management.module.css";
import { boundaryErrorText } from "@/features/zone-boundary/boundary-error-text";
import { ZoneBoundaryEditor, type BoundaryEditorValue } from "@/features/zone-boundary/zone-boundary-editor";
import { zoneBoundaryRepository } from "@/features/zone-boundary/zone-boundary-repository";
import { ZoneFormFields } from "./zone-form-fields";
import { applyMapPrefill, emptyZoneDraft, noMapFilled, readZoneDetail, validateZoneDraft, zoneBody, type MapFilled, type ZoneDraft, type ZoneField } from "./zone-model";

const repository = createWorkspaceRepository("zones");
type Created = { id: string; code: string; rowVersion: string };
type BoundaryStep = { pending: boolean; error?: string };
const laterHint = "Mở hồ sơ vùng, tab Thông tin, bấm Cập nhật ranh giới để lưu sau.";

/**
 * Creating a zone is one of the few pop-ups: grouped fields, `Bỏ qua` and `Lưu` in the footer. The licence-map section is optional: reading a photo
 * fills Địa điểm and Diện tích (never over what was typed) and the boundary is saved right after the zone, as a second call. If that second call
 * fails the zone stays created and the dialog offers `Thử lại` or `Bỏ qua`; the zone is never created twice.
 */
export function ZoneCreateDialog({ onClose, onCreated }: { onClose(): void; onCreated(): void }) {
  const [form, setForm] = useState<{ draft: ZoneDraft; filled: MapFilled }>({ draft: emptyZoneDraft, filled: noMapFilled }), [errors, setErrors] = useState<Partial<Record<ZoneField, string>>>({});
  const [boundary, setBoundary] = useState<BoundaryEditorValue>(), [boundaryOpen, setBoundaryOpen] = useState(false), [boundaryNote, setBoundaryNote] = useState<string>();
  const [created, setCreated] = useState<Created>(), [step, setStep] = useState<BoundaryStep>({ pending: false });
  const createdRef = useRef<Created>(undefined), latestBoundary = useRef<BoundaryEditorValue>(undefined), reads = useRef(0), saving = useRef(false);
  const mutation = useMutation(), confirmation = useActionDialog(), warnCoordinates = useCoordinateWarnings(), toast = useOptionalToast();
  const { draft, filled } = form;
  // Typing in a prefilled field makes it the user's value: the next read no longer replaces it.
  const setDraft: Dispatch<SetStateAction<ZoneDraft>> = action => setForm(current => {
    const next = typeof action === "function" ? action(current.draft) : action;
    return { draft: next, filled: { location: current.filled.location && next.location === current.draft.location, area: current.filled.area && next.area === current.draft.area } };
  });
  // The next free code (KV01...) is prefilled but stays editable; it does not count as a user change.
  const proposed = useCodeProposal(repository, code => setDraft(current => current.code ? current : { ...current, code }));
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...emptyZoneDraft, code: proposed }) || !!boundary?.touched;
  const busy = mutation.pending || step.pending;

  function boundaryChanged(value: BoundaryEditorValue) {
    latestBoundary.current = value; setBoundary(value); setBoundaryNote(undefined);
    if (value.readCount === reads.current) return;
    reads.current = value.readCount;
    if (value.prefill && !createdRef.current) { const prefill = value.prefill; setForm(current => applyMapPrefill(current.draft, current.filled, prefill)); }
  }
  /** The zone exists; a boundary that was not saved is left for later. */
  function leaveWithoutBoundary() {
    if (latestBoundary.current?.boundary && latestBoundary.current.touched) toast?.notify({ tone: "warning", title: "Đã thêm vùng nuôi nhưng chưa lưu ranh giới.", description: laterHint });
    onCreated();
  }
  async function close() {
    if (busy) return;
    if (createdRef.current) { leaveWithoutBoundary(); return; }
    if (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose();
  }
  /** Second call: save the boundary of the created zone. A retry first reads the zone again, so a stale row version or a save that did get through is not repeated blindly. */
  async function saveBoundary(zone: Created, reload: boolean) {
    const value = latestBoundary.current;
    if (!value?.boundary || !value.touched) { onCreated(); return; }
    if (saving.current) return;
    saving.current = true; setStep({ pending: true });
    let rowVersion = zone.rowVersion;
    if (reload) {
      const fresh = await readZoneDetail(zone.id);
      if (fresh.status !== "success") { saving.current = false; setStep({ pending: false, error: operationError(fresh) }); return; }
      if (fresh.data.boundary) { saving.current = false; onCreated(); return; }
      rowVersion = fresh.data.rowVersion;
    }
    const result = await zoneBoundaryRepository.save(zone.id, value.boundary, rowVersion);
    saving.current = false;
    if (result.status === "success") { onCreated(); return; }
    setStep({ pending: false, error: boundaryErrorText(result) ?? operationError(result) });
  }
  async function save() {
    if (busy || mutation.blocked) return;
    if (createdRef.current) { await saveBoundary(createdRef.current, true); return; }
    const found = validateZoneDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (boundary?.reading) { setBoundaryNote("Đang đọc ảnh sơ đồ cấp phép. Hãy đợi kết quả hoặc bấm Hủy trước khi lưu."); setBoundaryOpen(true); return; }
    if (boundary?.blocked) { setBoundaryNote("Sơ đồ cấp phép còn chỗ cần sửa. Sửa hoặc xóa các điểm báo lỗi, rồi lưu lại."); setBoundaryOpen(true); return; }
    const record = await mutation.run(() => repository.mutate("create", zoneBody(draft)));
    if (!record) return;
    warnCoordinates(record);
    const zone = { id: record.id, code: String(record.code ?? draft.code), rowVersion: String(record.rowVersion ?? "") };
    createdRef.current = zone; setCreated(zone);
    await saveBoundary(zone, false);
  }
  const failed = !!created && !step.pending && !!step.error, locked = busy || mutation.blocked || !!created;
  return <Dialog open size={boundaryOpen ? "xl" : "lg"} title="Thêm vùng nuôi" dismissible={!busy} onOpenChange={open => { if (!open) void close(); }}>
    {confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["code", "name"]} disabled={locked} />
      <CollapsibleSection title="Sơ đồ cấp phép (tùy chọn)" description="Đọc ảnh sơ đồ khu vực biển để lấy ranh giới, diện tích và địa điểm." columns={1} defaultOpen={false} onToggle={setBoundaryOpen}>
        <ZoneBoundaryEditor disabled={busy} onChange={boundaryChanged} />
        {boundaryNote && <p role="alert" className={styles.fieldError}>{boundaryNote}</p>}
      </CollapsibleSection>
      <CollapsibleSection title="Vị trí và diện tích" description="Không bắt buộc. Có thể điền từ sơ đồ cấp phép." columns={1}>
        <ZoneFormFields draft={draft} setDraft={setDraft} errors={errors} only={["location", "area"]} fromMap={filled} disabled={locked} />
      </CollapsibleSection>
      <ErrorNotice error={mutation.error} />
      {mutation.blocked && <p role="alert" className="text-sm">Chưa xác nhận được kết quả lưu. Hãy đóng cửa sổ này và tải lại danh sách để đối chiếu trước khi thêm lại.</p>}
      {created && <div role={failed ? "alert" : "status"} className={`${styles.alert} mt-4`}>
        {failed
          ? <p><strong>Vùng đã tạo, chưa lưu được ranh giới.</strong>{` Vùng ${created.code} đã có trong danh sách. Bấm Thử lại để lưu ranh giới (sửa các điểm nếu có báo lỗi), hoặc Bỏ qua để lưu sau.`}</p>
          : <p>{`Vùng ${created.code} đã được tạo. Đang lưu ranh giới...`}</p>}
        {failed && <p>{step.error}</p>}
        {failed && <p>{laterHint}</p>}
      </div>}
      <div className="mt-5 flex justify-end gap-3">
        {created
          ? <>
            <Button key="skip" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={leaveWithoutBoundary}>Bỏ qua, lưu ranh giới sau</Button>
            <Button key="retry" type="submit" className="w-auto" isPending={step.pending} disabled={boundary?.blocked || boundary?.reading}>Thử lại</Button>
          </>
          : <>
            <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => void close()}>Bỏ qua</Button>
            <Button key="save" type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
          </>}
      </div>
    </form>
  </Dialog>;
}
