import { useCallback, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import * as c from "./contracts";
import { loadOptions } from "./lookups";
import { DataTable, ErrorNotice, Field, Select, businessTime, displayTime, statusLabel, toApiTime, useMutation, useRemote } from "./ui";
import { WaterValueFields } from "./water-value-fields";
import { waterRepository as repository, type WaterRecognition } from "./water-measurement-shared";

type NewMeasurementProps = {
  zoneId: string;
  zoneName: string;
  onClose(): void;
  onSaved(record: c.WaterMeasurement, ocr?: WaterRecognition): void;
};

type Recognition = z.infer<typeof c.recognitionSchema>;
const IN_USE_RAFT = "101";
const emptyValues = { raftId: "", measuredAt: "", ph: "", salinity: "", temperature: "" };
const readValue = (field: { value: number } | null | undefined) => field ? String(field.value) : "";

/**
 * Records a measurement in two steps (backend WATER-01): the meter photo is read first (recognize, nothing is saved),
 * then the user confirms every value and the raft and the measurement is recorded with the returned photo key.
 */
export function NewMeasurement({ zoneId, zoneName, onClose, onSaved }: NewMeasurementProps) {
  const confirmation = useActionDialog();
  const { notify } = useToast();
  const [photo, setPhoto] = useState<File>();
  const [recognition, setRecognition] = useState<Recognition>();
  const [values, setValues] = useState(emptyValues);
  const [clientOperationId] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState<c.WaterHistory>();
  const attempt = useRef<z.infer<typeof c.recordWaterSchema>>(undefined);
  const mutation = useMutation();
  const rafts = useRemote(useCallback((signal: AbortSignal) => loadOptions("rafts", signal, { zoneId, statusId: IN_USE_RAFT }), [zoneId]));
  const dirty = !!photo || !!recognition || JSON.stringify(values) !== JSON.stringify(emptyValues);
  const close = async () => {
    const discardMessage = "Bỏ phép đo chưa lưu? Nếu lần gửi trước chưa rõ kết quả, hãy kiểm tra lịch sử trước khi ghi phép đo mới.";
    if (!mutation.busy() && (!dirty || await confirmation.confirm(discardMessage))) onClose();
  };

  async function recognize() {
    if (!photo) return;
    const result = await mutation.run(() => repository.upload("recognize", [photo], {}, c.recognitionSchema, undefined, zoneId));
    if (!result) return;
    setRecognition(result);
    setValues((current) => ({
      ...current,
      measuredAt: businessTime(result.ocr.measuredAt?.value ?? result.measuredAt),
      ph: readValue(result.ocr.ph),
      salinity: readValue(result.ocr.salinity),
      temperature: readValue(result.ocr.temperature),
    }));
  }

  async function save() {
    if (!recognition) return;
    // Reuse the previous payload (same clientOperationId) when the last submit's outcome is unknown.
    if (!mutation.uncertain) {
      attempt.current = {
        raftId: values.raftId,
        measuredAt: toApiTime(values.measuredAt) ?? "",
        ph: Number(values.ph),
        salinity: Number(values.salinity),
        temperature: Number(values.temperature),
        photoKey: recognition.photoKey,
        clientOperationId,
      };
    }
    const payload = attempt.current;
    if (!payload) return;
    const result = await mutation.run(() => repository.write("record", payload, c.waterSchema, undefined, zoneId));
    if (result) { notify({ tone: "success", title: `Đã ghi phép đo tại bè ${result.raftCode}.` }); onSaved(result, recognition.ocr); }
  }

  async function loadReviewHistory() {
    const result = await mutation.run(() => repository.read("list", { zoneId, status: "All", page: "1", pageSize: "100" }, c.waterHistorySchema), true);
    if (result) setReview(result);
  }

  const filled = !!values.raftId && !!values.measuredAt && values.ph !== "" && values.salinity !== "" && values.temperature !== "";
  const setField = (key: keyof typeof emptyValues) => (e: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: e.target.value }));

  return (
    <Dialog open title={`Ghi phép đo · ${zoneName}`} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
      {confirmation.dialog}
      <ErrorNotice error={mutation.error || rafts.error} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void (recognition ? save() : recognize()); }}>
        <fieldset disabled={mutation.pending || mutation.uncertain} className="space-y-4">
          <CollapsibleSection title="Ảnh máy đo" description="Ảnh dùng để đọc các chỉ số nước." columns={1}>
          <Field
            label="Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)"
            type="file"
            required
            accept="image/jpeg,image/png"
            disabled={!!recognition}
            onChange={(e) => setPhoto(e.target.files?.[0])}
          />
          </CollapsibleSection>
          {recognition && (
            <>
              {recognition.ocr.warning && <p role="status" className="rounded-control bg-primary-soft p-3">{recognition.ocr.warning.text}</p>}
              {recognition.thresholdWarning && <p role="alert" className="rounded-control border border-danger p-3 text-danger">{recognition.thresholdWarning.text}</p>}
              <CollapsibleSection title="Phép đo" description="Đối chiếu thời gian, bè và chỉ số với ảnh máy đo." columns={2}>
              <Select label="Bè đo *" value={values.raftId} required onChange={setField("raftId")}>
                <option value="">Chọn bè đang sử dụng</option>
                {(rafts.data ?? []).map((raft) => <option key={raft.id} value={raft.id}>{String(raft.code)}</option>)}
              </Select>
              <WaterValueFields values={values} onChange={(key, value) => setField(key)({ target: { value } })} />
              </CollapsibleSection>
            </>
          )}
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3">
          <Button key="discard" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { void close(); }}>Bỏ qua</Button>
          {mutation.uncertain ? (
            <Button key="retry-save" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Gửi lại lượt đang chờ</Button>
          ) : recognition ? (
            <Button key="save" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !filled}>Lưu phép đo</Button>
          ) : (
            <Button key="recognize" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !photo}>Nhận dạng từ ảnh</Button>
          )}
        </div>
      </form>
      {mutation.blocked && (
        <div className="my-4 rounded-control border border-border p-4">
          <p>Chưa gửi lại phép đo. Các giá trị trên màn hình vẫn được giữ.</p>
          <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={loadReviewHistory}>Tải lịch sử để đối chiếu</Button>
          {review && (
            <>
              <DataTable headings={["Thời gian", "Bè", "pH", "Độ mặn", "Nhiệt độ", "Trạng thái"]}>
                {review.items.map((row) => (
                  <tr key={row.id}>
                    <td>{displayTime(row.measuredAt)}</td>
                    <td>{row.raftCode}</td>
                    <td>{row.ph}</td>
                    <td>{row.salinity}</td>
                    <td>{row.temperature}</td>
                    <td>{statusLabel(row.statusCode)}</td>
                  </tr>
                ))}
              </DataTable>
              <p>Đang xem {review.items.length}/{review.total} phép đo mới nhất.</p>
              <Button className="mt-3 w-auto" variant="secondary" onClick={mutation.reviewed}>
                Đã đối chiếu, cho phép gửi lại phép đo đang nhập
              </Button>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
