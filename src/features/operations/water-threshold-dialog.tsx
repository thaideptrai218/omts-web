import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import * as c from "./contracts";
import { DataTable, ErrorNotice, Field, Skeleton, useMutation, useRemote } from "./ui";
import { waterRepository as repository, type WaterZoneThresholds } from "./water-measurement-shared";

type ThresholdDialogProps = { zoneId: string; owner: boolean; onClose(): void; onSaved(): void };

const THRESHOLD_FIELDS = [
  ["phMin", "pH tối thiểu", "14"],
  ["phMax", "pH tối đa", "14"],
  ["salinityMin", "Độ mặn tối thiểu (‰)", "100"],
  ["salinityMax", "Độ mặn tối đa (‰)", "100"],
] as const;

/** Loads the zone thresholds, then opens the editor (read-only unless the user is the cooperative owner). */
export function ThresholdDialog({ zoneId, owner, onClose, onSaved }: ThresholdDialogProps) {
  const thresholds = useRemote(useMemo(
    () => (signal: AbortSignal) => repository.read("thresholds", { zoneId }, c.zoneThresholdsSchema, signal),
    [zoneId],
  ));
  if (thresholds.data) return <ThresholdEditor record={thresholds.data} owner={owner} onClose={onClose} onSaved={onSaved} />;
  return (
    <Dialog open title="Ngưỡng chất lượng nước" size="lg" onOpenChange={(open) => { if (!open) onClose(); }}>
      <ErrorNotice error={thresholds.error} />
      {thresholds.loading
        ? <Skeleton />
        : <Button className="w-auto" variant="secondary" onClick={thresholds.reload}>Tải lại ngưỡng</Button>}
    </Dialog>
  );
}

type ThresholdEditorProps = { record: WaterZoneThresholds; owner: boolean; onClose(): void; onSaved(): void };

function toThresholdFormValues(thresholds: WaterZoneThresholds["thresholds"]) {
  return Object.fromEntries(Object.entries(thresholds).map(([key, value]) => [key, value == null ? "" : String(value)]));
}

function ThresholdEditor({ record, owner, onClose, onSaved }: ThresholdEditorProps) {
  const confirmation = useActionDialog();
  const [values, setValues] = useState(toThresholdFormValues(record.thresholds));
  const [allZones, setAllZones] = useState(false);
  const [initial] = useState(() => JSON.stringify(values));
  const [localError, setLocalError] = useState<string>();
  const [latest, setLatest] = useState<WaterZoneThresholds[]>();
  const mutation = useMutation();
  const close = async () => {
    const unchanged = JSON.stringify(values) === initial && !allZones;
    if (!mutation.busy() && (unchanged || await confirmation.confirm("Bỏ các ngưỡng chưa lưu?"))) onClose();
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(undefined);
    const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : Number(value)]));
    if (!c.setThresholdsSchema.safeParse(body).success) {
      setLocalError("Mỗi chỉ số cần đủ hai ngưỡng hoặc để trống cả hai; tối thiểu phải nhỏ hơn tối đa.");
      return;
    }
    const question = allZones ? "Áp dụng các ngưỡng này cho tất cả vùng đang dùng?" : `Lưu ngưỡng mới cho ${record.zoneName}?`;
    if (!await confirmation.confirm(question)) return;
    void mutation.run(() => repository.write<WaterZoneThresholds | WaterZoneThresholds[]>(
      "set-thresholds",
      body,
      allZones ? z.array(c.zoneThresholdsSchema) : c.zoneThresholdsSchema,
      undefined,
      allZones ? undefined : record.zoneId,
    )).then((result) => { if (result) onSaved(); });
  }

  async function loadCurrentThresholds() {
    const result = await mutation.run(async () => {
      if (allZones) return repository.read("thresholds", {}, z.array(c.zoneThresholdsSchema));
      const response = await repository.read("thresholds", { zoneId: record.zoneId }, c.zoneThresholdsSchema);
      return response.status === "success" ? { status: "success" as const, data: [response.data] } : response;
    }, true);
    if (result) setLatest(result);
  }

  return (
    <Dialog open title="Ngưỡng nước" size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
      {confirmation.dialog}
      <form className="space-y-4" onSubmit={submit}>
        <p className="font-semibold">{record.zoneName}</p>
        <p className="text-sm text-text-muted">
          Ngưỡng mới áp dụng cho phép đo xác nhận sau khi lưu. Phép đo và cảnh báo cũ giữ ngưỡng đã dùng.
        </p>
        <ErrorNotice error={localError || mutation.error} />
        <fieldset disabled={!owner || mutation.pending || mutation.blocked} className="grid gap-4 sm:grid-cols-2">
          {THRESHOLD_FIELDS.map(([key, label, max]) => (
            <Field
              key={key}
              label={label}
              type="number"
              min="0"
              max={max}
              step="0.01"
              value={values[key]}
              onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.value }))}
            />
          ))}
          {owner && (
            <label className="flex items-start gap-3 sm:col-span-2">
              <input type="checkbox" checked={allZones} onChange={(e) => setAllZones(e.target.checked)} />
              <span>Áp dụng cho tất cả vùng đang sử dụng</span>
            </label>
          )}
        </fieldset>
        {mutation.blocked && (
          <div className="space-y-3">
            <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={loadCurrentThresholds}>
              Tải ngưỡng hiện tại để đối chiếu
            </Button>
            {latest && (
              <>
                <DataTable headings={["Vùng", "pH", "Độ mặn (‰)"]}>
                  {latest.map((row) => (
                    <tr key={row.zoneId}>
                      <td>{row.zoneName}</td>
                      <td>{row.thresholds.phMin ?? "—"} — {row.thresholds.phMax ?? "—"}</td>
                      <td>{row.thresholds.salinityMin ?? "—"} — {row.thresholds.salinityMax ?? "—"}</td>
                    </tr>
                  ))}
                </DataTable>
                <Button className="w-auto" variant="secondary" onClick={mutation.reviewed}>Đã đối chiếu, sửa tiếp bản đang nhập</Button>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {owner && <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu ngưỡng</Button>}
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng</Button>
        </div>
      </form>
    </Dialog>
  );
}
