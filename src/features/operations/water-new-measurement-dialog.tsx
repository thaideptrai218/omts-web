import { useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import * as c from "./contracts";
import { DataTable, ErrorNotice, Field, Select, businessTime, displayTime, statusLabel, toApiTime, useMutation } from "./ui";
import { toOptionalNumber, waterRepository as repository, type WaterRecognition } from "./water-measurement-shared";

type NewMeasurementProps = {
  zoneId: string;
  zoneName: string;
  onClose(): void;
  onSaved(record: c.WaterMeasurement, ocr?: WaterRecognition): void;
};

type MeasurementAttempt = { mode: string; photo?: File; payload: z.infer<typeof c.recordWaterSchema> };

/** Records a new measurement by manual entry or OCR; keeps the attempt stable while its outcome is uncertain. */
export function NewMeasurement({ zoneId, zoneName, onClose, onSaved }: NewMeasurementProps) {
  const confirmation = useActionDialog();
  const [initialValues] = useState(() => ({ measuredAt: businessTime(), ph: "", salinity: "" }));
  const [mode, setMode] = useState("manual");
  const [photo, setPhoto] = useState<File>();
  const [values, setValues] = useState(initialValues);
  const [clientOperationId] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState<c.WaterHistory>();
  const attempt = useRef<MeasurementAttempt>(undefined);
  const mutation = useMutation();
  const dirty = !!photo || mode !== "manual" || JSON.stringify(values) !== JSON.stringify(initialValues);
  const close = async () => {
    const discardMessage =
      "Bỏ phép đo chưa xác nhận? Nếu lần gửi trước chưa rõ kết quả, hãy kiểm tra lịch sử nháp trước khi tạo phép đo mới.";
    if (!mutation.busy() && (!dirty || await confirmation.confirm(discardMessage))) onClose();
  };

  async function save(confirm: boolean) {
    // Reuse the previous payload (same clientOperationId) when the last submit's outcome is unknown.
    if (!mutation.uncertain) {
      attempt.current = {
        mode,
        photo,
        payload: {
          clientOperationId,
          measuredAt: toApiTime(values.measuredAt),
          ph: toOptionalNumber(values.ph),
          salinity: toOptionalNumber(values.salinity),
          confirm,
        },
      };
    }
    const current = attempt.current;
    if (!current) return;
    if (current.mode === "ocr" && current.photo) {
      const result = await mutation.run(() =>
        repository.upload("recognize", [current.photo!], { clientOperationId }, c.recognitionSchema, undefined, zoneId));
      if (result) onSaved(result.measurement, result.ocr);
    } else {
      const result = await mutation.run(() => current.photo
        ? repository.upload("record-photo", [current.photo], current.payload, c.waterSchema, undefined, zoneId)
        : repository.write("record", current.payload, c.waterSchema, undefined, zoneId));
      if (result) onSaved(result);
    }
  }

  async function loadReviewHistory() {
    const params = { zoneId, status: "All", page: "1", pageSize: "100" };
    const result = await mutation.run(() => repository.read("list", params, c.waterHistorySchema), true);
    if (result) setReview(result);
  }

  const canConfirm = !mutation.pending && !mutation.blocked && !!values.measuredAt && values.ph !== "" && values.salinity !== "";

  return (
    <Dialog
      open
      title={`Ghi phép đo · ${zoneName}`}
      size="lg"
      dismissible={!mutation.pending}
      onOpenChange={(open) => { if (!open) close(); }}
    >
      {confirmation.dialog}
      <ErrorNotice error={mutation.error} />
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        void save(submitter?.value === "confirm");
      }}>
        <fieldset disabled={mutation.pending || mutation.uncertain} className="space-y-4">
          <Select label="Cách ghi" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="manual">Nhập tay</option>
            <option value="ocr">Nhận dạng từ ảnh</option>
          </Select>
          <Field
            label={mode === "ocr" ? "Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)" : "Ảnh máy đo (không bắt buộc)"}
            type="file"
            required={mode === "ocr"}
            accept="image/jpeg,image/png"
            onChange={(e) => setPhoto(e.target.files?.[0])}
          />
          {mode === "manual" && (
            <>
              <Field
                label="Thời điểm đo (giờ Việt Nam)"
                type="datetime-local"
                value={values.measuredAt}
                onChange={(e) => setValues((current) => ({ ...current, measuredAt: e.target.value }))}
              />
              <Field
                label="pH (0–14)"
                type="number"
                min="0"
                max="14"
                step="0.01"
                value={values.ph}
                onChange={(e) => setValues((current) => ({ ...current, ph: e.target.value }))}
              />
              <Field
                label="Độ mặn (0–100 ‰)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.salinity}
                onChange={(e) => setValues((current) => ({ ...current, salinity: e.target.value }))}
              />
            </>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          {mutation.uncertain ? (
            <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>
              Xác nhận lại lượt đang chờ
            </Button>
          ) : mode === "ocr" ? (
            <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !photo}>
              Nhận dạng và lưu nháp
            </Button>
          ) : (
            <>
              <Button className="w-auto" type="submit" value="draft" isPending={mutation.pending} disabled={mutation.blocked}>
                Lưu nháp
              </Button>
              <Button className="w-auto" type="submit" value="confirm" disabled={!canConfirm}>Lưu và xác nhận</Button>
            </>
          )}
        </div>
      </form>
      {mutation.blocked && (
        <div className="my-4 rounded-control border border-border p-4">
          <p>Chưa gửi lại phép đo. Bản nháp trên màn hình vẫn được giữ.</p>
          <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending} onClick={loadReviewHistory}>
            Tải lịch sử để đối chiếu
          </Button>
          {review && (
            <>
              <DataTable headings={["Thời gian", "pH", "Độ mặn", "Trạng thái"]}>
                {review.items.map((row) => (
                  <tr key={row.id}>
                    <td>{displayTime(row.measuredAt)}</td>
                    <td>{row.ph ?? "—"}</td>
                    <td>{row.salinity ?? "—"}</td>
                    <td>{statusLabel(row.statusCode)}</td>
                  </tr>
                ))}
              </DataTable>
              <p>Đang xem {review.items.length}/{review.total} phép đo mới nhất.</p>
              <Button className="mt-3 w-auto" variant="secondary" onClick={mutation.reviewed}>
                Đã đối chiếu, cho phép xác nhận lại phép đo đang nhập
              </Button>
            </>
          )}
        </div>
      )}
      <Button className="mt-5 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
    </Dialog>
  );
}
