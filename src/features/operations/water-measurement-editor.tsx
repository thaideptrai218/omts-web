import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import * as c from "./contracts";
import { loadOptions } from "./lookups";
import { operationAllowed } from "./permissions";
import { ErrorNotice, Field, Note, Select, businessTime, displayTime, statusLabel, toApiTime, useMutation, useRemote } from "./ui";
import { MeasurementEvidenceAside, MeasurementOcrNotices } from "./water-measurement-editor-panels";
import { waterRepository as repository, type WaterRecognition } from "./water-measurement-shared";

type MeasurementEditorMode = "view" | "correct" | "void";

type MeasurementEditorProps = {
  readOnly?: boolean;
  record: c.WaterMeasurement;
  ocr?: WaterRecognition;
  onClose(): void;
  onSaved(record: c.WaterMeasurement, ocr?: WaterRecognition): void;
  onOpen(id: string): Promise<void>;
};

const IN_USE_RAFT = "101";
const SUBMIT_LABELS: Record<Exclude<MeasurementEditorMode, "view">, string> = {
  correct: "Lưu bản hiệu chỉnh",
  void: "Xác nhận hủy phép đo",
};

/** Measurement dialog: read an Active record, correct it in place, or void it (backend WATER-02, no version history). */
export function MeasurementEditor({ record, ocr, onClose, onSaved, readOnly = false }: MeasurementEditorProps) {
  const confirmation = useActionDialog();
  const context = useApiWorkspace();
  const permissions = context.permissions.functionPermissions;
  const canEdit = !readOnly && record.statusCode === "ACTIVE" && operationAllowed("water", context.identity, permissions, "Edit", record.zoneId);
  const [mode, setMode] = useState<MeasurementEditorMode>("view");
  const [values, setValues] = useState({
    raftId: record.raftId,
    measuredAt: businessTime(record.measuredAt),
    ph: String(record.ph),
    salinity: String(record.salinity),
    temperature: String(record.temperature),
    reason: "",
  });
  const [initial] = useState(() => JSON.stringify(values));
  const mutation = useMutation();
  const [latest, setLatest] = useState<c.WaterMeasurement>();
  const dirty = JSON.stringify(values) !== initial;
  const rafts = useRemote(useCallback((signal: AbortSignal) => mode === "correct"
    ? loadOptions("rafts", signal, { zoneId: record.zoneId, statusId: IN_USE_RAFT })
    : Promise.resolve({ status: "success" as const, data: [] }), [mode, record.zoneId]));

  const close = async () => {
    if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các giá trị chưa lưu?"))) onClose();
  };

  async function save() {
    const body = mode === "void"
      ? { reason: values.reason }
      : {
        raftId: values.raftId,
        measuredAt: toApiTime(values.measuredAt),
        ph: Number(values.ph),
        salinity: Number(values.salinity),
        temperature: Number(values.temperature),
        reason: values.reason,
      };
    if (mode === "void" && !await confirmation.confirm("Hủy phép đo này? Phép đo sẽ bị loại khỏi dữ liệu đang sử dụng.")) return;
    const result = await mutation.run(() => repository.write(mode, body, c.waterSchema, record.id));
    if (result) onSaved(result);
  }

  async function loadLatest() {
    const result = await mutation.run(() => repository.read("detail", { id: record.id }, c.waterSchema), true);
    if (result) setLatest(result);
  }

  const valuesLocked = mode !== "correct";
  const actionsDisabled = mutation.pending || mutation.blocked;
  const raftOptions = [...(rafts.data ?? []).map((raft) => ({ id: raft.id, code: String(raft.code) }))];
  if (!raftOptions.some((raft) => raft.id === record.raftId)) raftOptions.unshift({ id: record.raftId, code: record.raftCode });

  return (
    <Dialog
      open
      title={`Phép đo ${record.zoneCode} · ${statusLabel(record.statusCode)}`}
      size="xl"
      dismissible={!mutation.pending}
      onOpenChange={(open) => { if (!open) close(); }}
    >
      {confirmation.dialog}
      <ErrorNotice error={mutation.error} />
      {record.thresholdExceeded && (
        <p role="alert" className="mb-4 rounded-control border border-danger p-4 text-danger">Vượt ngưỡng: {record.violatedValues}</p>
      )}
      <MeasurementOcrNotices ocr={ocr} />
      <div className="my-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.2fr)]">
        <MeasurementEvidenceAside record={record} />
        <div className="min-w-0">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <fieldset disabled={mutation.pending || mode === "view"} className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Bè đo *"
                required
                disabled={valuesLocked}
                value={values.raftId}
                onChange={(e) => setValues((current) => ({ ...current, raftId: e.target.value }))}
              >
                {raftOptions.map((raft) => <option key={raft.id} value={raft.id}>{raft.code}</option>)}
              </Select>
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
              <Field
                label="Nhiệt độ (°C) *"
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={valuesLocked}
                value={values.temperature}
                onChange={(e) => setValues((current) => ({ ...current, temperature: e.target.value }))}
              />
              {mode !== "view" && (
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
        {canEdit && (
          <>
            <Button className="w-auto" variant="secondary" disabled={actionsDisabled} onClick={() => setMode("correct")}>Hiệu chỉnh</Button>
            <Button className="w-auto" variant="danger" disabled={actionsDisabled} onClick={() => setMode("void")}>Hủy phép đo</Button>
          </>
        )}
      </div>
      {record.voidReason && <p className="my-3">Lý do hủy: {record.voidReason}</p>}
      {mutation.blocked && (
        <div className="my-4 rounded-control border border-border p-4">
          <p>Bản đang nhập được giữ. Hãy đối chiếu phép đo hiện tại trên hệ thống.</p>
          <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={loadLatest}>Tải phép đo hiện tại để đối chiếu</Button>
          {latest && (
            <div className="mt-4 space-y-3">
              <p>
                {statusLabel(latest.statusCode)} · {displayTime(latest.measuredAt)} · bè {latest.raftCode} · pH {latest.ph} · Độ mặn {latest.salinity} ‰ · Nhiệt độ {latest.temperature} °C
              </p>
              <Button
                className="w-auto"
                variant="secondary"
                onClick={async () => { if (!dirty || await confirmation.confirm("Bỏ bản đang nhập và dùng dữ liệu hiện tại?")) onSaved(latest); }}
              >
                Dùng dữ liệu hiện tại
              </Button>
            </div>
          )}
        </div>
      )}
      <Button className="mt-4 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
    </Dialog>
  );
}
