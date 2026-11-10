import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import * as c from "./contracts";
import { operationAllowed } from "./permissions";
import { useWaterEditingPresence } from "./use-water-editing-presence";
import { ErrorNotice, Field, Note, businessTime, displayTime, statusLabel, toApiTime, useMutation } from "./ui";
import {
  MeasurementEvidenceAside,
  MeasurementLatestVersionReview,
  MeasurementOcrNotices,
  MeasurementVersionHistory,
} from "./water-measurement-editor-panels";
import { toOptionalNumber, waterRepository as repository, type WaterRecognition } from "./water-measurement-shared";

type MeasurementEditorMode = "view" | "confirm" | "correct" | "void";

type MeasurementEditorProps = {
  readOnly?: boolean;
  record: c.WaterMeasurement;
  ocr?: WaterRecognition;
  onClose(): void;
  onSaved(record: c.WaterMeasurement, ocr?: WaterRecognition): void;
  onOpen(id: string): Promise<void>;
};

const SUBMIT_LABELS: Record<Exclude<MeasurementEditorMode, "view">, string> = {
  confirm: "Xác nhận số đo",
  correct: "Lưu bản hiệu chỉnh",
  void: "Xác nhận hủy phép đo",
};

/** Reads the record; when it is the newest one the newest version detail is returned as-is. */
async function readNewestVersion(recordId: string) {
  const current = await repository.read("detail", { id: recordId }, c.waterSchema);
  if (current.status !== "success" || current.data.isLatestVersion) return current;
  const newest = [...current.data.versions].sort((a, b) => b.recordVersion - a.recordVersion)[0];
  return newest ? repository.read("detail", { id: newest.id }, c.waterSchema) : current;
}

/** Full measurement dialog: confirm a draft, correct or void a confirmed record, and browse versions. */
export function MeasurementEditor({ record, ocr, onClose, onSaved, onOpen, readOnly = false }: MeasurementEditorProps) {
  const confirmation = useActionDialog();
  const context = useApiWorkspace();
  const permissions = context.permissions.functionPermissions;
  const canCreate = !readOnly && operationAllowed("water", context.identity, permissions, "Create", record.zoneId);
  const canEdit = !readOnly && operationAllowed("water", context.identity, permissions, "Edit", record.zoneId);
  const [mode, setMode] = useState<MeasurementEditorMode>(
    record.statusCode === "DRAFT" && canCreate ? "confirm" : "view",
  );
  const [values, setValues] = useState({
    measuredAt: businessTime(record.measuredAt),
    ph: record.ph == null ? "" : String(record.ph),
    salinity: record.salinity == null ? "" : String(record.salinity),
    reason: "",
  });
  const [initial] = useState(() => JSON.stringify(values));
  const [baseline, setBaseline] = useState(record);
  const mutation = useMutation();
  const [latest, setLatest] = useState<c.WaterMeasurement>();
  const dirty = JSON.stringify(values) !== initial;

  const { editors, presenceError } = useWaterEditingPresence(baseline.id, canEdit, mode, record.currentEditors);

  const close = async () => {
    if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các giá trị chưa lưu?"))) onClose();
  };

  async function save() {
    const original = baseline;
    const valuesBody = {
      measuredAt: toApiTime(values.measuredAt),
      ph: toOptionalNumber(values.ph),
      salinity: toOptionalNumber(values.salinity),
    };
    const body = mode === "void"
      ? { reason: values.reason, recordVersion: original.recordVersion }
      : mode === "correct"
        ? { ...valuesBody, reason: values.reason, recordVersion: original.recordVersion }
        : valuesBody;
    if (mode === "void" && !await confirmation.confirm("Hủy phép đo này? Phép đo sẽ bị loại khỏi dữ liệu đang sử dụng.")) return;
    const result = await mutation.run(() => repository.write(mode, body, c.waterSchema, original.id));
    if (result) onSaved(result);
  }

  async function recognizeAgain() {
    const result = await mutation.run(() => repository.write("recognize-again", {}, c.recognitionSchema, record.id));
    if (result) onSaved(result.measurement, result.ocr);
  }

  async function openVersion(id: string) {
    if (!dirty || await confirmation.confirm("Bỏ các giá trị chưa lưu để xem phiên bản này?")) void onOpen(id);
  }

  async function loadLatest() {
    const result = await mutation.run(() => readNewestVersion(record.id), true);
    if (result) setLatest(result);
  }

  const valuesLocked = mode === "view" || mode === "void";
  const actionsDisabled = mutation.pending || mutation.blocked;
  const canEditLatest = record.isLatestVersion && canEdit;
  const canRecognizeAgain = record.statusCode === "DRAFT" && record.photoUrl
    && record.ocrDraft.ph === null && record.ocrDraft.salinity === null && canCreate;
  const thresholds = record.thresholdsUsed;

  return (
    <Dialog
      open
      title={`Phép đo ${record.zoneCode} · ${statusLabel(record.statusCode)} · v${record.recordVersion}`}
      size="xl"
      dismissible={!mutation.pending}
      onOpenChange={(open) => { if (!open) close(); }}
    >
      {confirmation.dialog}
      <ErrorNotice error={mutation.error} />
      {baseline.id !== record.id && (
        <p className="my-3">Bản nháp đang dựa trên phiên bản v{baseline.recordVersion} vừa được đối chiếu.</p>
      )}
      {record.thresholdExceeded && (
        <p role="alert" className="mb-4 rounded-control border border-danger p-4 text-danger">Vượt ngưỡng: {record.violatedValues}</p>
      )}
      <MeasurementOcrNotices ocr={ocr} />
      <div className="my-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.2fr)]">
        <MeasurementEvidenceAside record={record} />
        <div className="min-w-0">
          {editors.length > 0 && (
            <p role="status" className="my-4 rounded-control bg-primary-soft p-4">
              Đang có người sửa: {editors.map((editor) => `${editor.name} từ ${displayTime(editor.startedAt)}`).join("; ")}. Bạn vẫn có thể sửa; khi lưu hệ thống kiểm tra phiên bản mới nhất.
            </p>
          )}
          {presenceError && <p role="status" className="my-3">Chưa tải được thông tin người đang sửa.</p>}
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <fieldset disabled={mutation.pending || mode === "view"} className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Thời điểm đo (giờ Việt Nam) *"
                required
                type="datetime-local"
                disabled={valuesLocked}
                value={values.measuredAt}
                onChange={(e) => setValues((current) => ({ ...current, measuredAt: e.target.value }))}
              />
              <Field
                label="pH *"
                required
                type="number"
                min="0"
                max="14"
                step="0.01"
                disabled={valuesLocked}
                value={values.ph}
                onChange={(e) => setValues((current) => ({ ...current, ph: e.target.value }))}
              />
              <Field
                label="Độ mặn (‰) *"
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={valuesLocked}
                value={values.salinity}
                onChange={(e) => setValues((current) => ({ ...current, salinity: e.target.value }))}
              />
              {(mode === "correct" || mode === "void") && (
                <Note
                  label={mode === "correct" ? "Lý do hiệu chỉnh *" : "Lý do hủy *"}
                  required
                  maxLength={1000}
                  value={values.reason}
                  onChange={(e) => setValues((current) => ({ ...current, reason: e.target.value }))}
                />
              )}
            </fieldset>
            {mode !== "view" && (
              <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>
                {SUBMIT_LABELS[mode]}
              </Button>
            )}
          </form>
        </div>
      </div>
      <div className="my-5 flex flex-wrap gap-2">
        {record.statusCode === "CONFIRMED" && canEditLatest && (
          <Button className="w-auto" variant="secondary" disabled={actionsDisabled} onClick={() => setMode("correct")}>Hiệu chỉnh</Button>
        )}
        {["DRAFT", "CONFIRMED"].includes(record.statusCode) && canEditLatest && (
          <Button className="w-auto" variant="danger" disabled={actionsDisabled} onClick={() => setMode("void")}>Hủy phép đo</Button>
        )}
        {canRecognizeAgain && (
          <Button className="w-auto" variant="secondary" disabled={actionsDisabled || dirty} onClick={recognizeAgain}>
            Nhận dạng lại ảnh
          </Button>
        )}
      </div>
      {thresholds && (
        <div className="my-4 rounded-control bg-primary-soft p-4">
          <h3 className="font-semibold">Ngưỡng đã dùng khi xác nhận</h3>
          <p>pH: {thresholds.phMin ?? "—"} — {thresholds.phMax ?? "—"}; độ mặn: {thresholds.salinityMin ?? "—"} — {thresholds.salinityMax ?? "—"} ‰</p>
        </div>
      )}
      {record.correctionReason && <p className="my-3">Lý do hiệu chỉnh: {record.correctionReason}</p>}
      {record.voidReason && <p className="my-3">Lý do hủy: {record.voidReason}</p>}
      <MeasurementVersionHistory disabled={mutation.pending} onOpenVersion={openVersion} versions={record.versions} />
      {mutation.blocked && (
        <MeasurementLatestVersionReview
          canKeepDraft={mode === "correct" && !!latest?.isLatestVersion && latest.statusCode === "CONFIRMED"}
          latest={latest}
          onKeepDraft={(newest) => { setBaseline(newest); mutation.reviewed(); setLatest(undefined); }}
          onLoadLatest={loadLatest}
          onUseLatest={async (newest) => {
            if (!dirty || await confirmation.confirm("Bỏ bản đang nhập và dùng dữ liệu mới?")) onSaved(newest);
          }}
          pending={mutation.pending}
        />
      )}
      <Button className="mt-4 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
    </Dialog>
  );
}
