"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import { backdateProblem, backdateWindow } from "@/shared/format/backdate-window";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, seedRepo } from "./records-shared";

/** Records a new seeding, or corrects/removes an existing one (a reason is required for both). */
export function SeedingForm({
  zoneId,
  raftId,
  cycleId,
  cycleStartDate,
  data,
  record,
  allowed,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  cycleId: string;
  /** Seeding cannot be dated before the cycle starts; undefined when the caller does not know it. */
  cycleStartDate?: string;
  data: z.infer<typeof c.seedingList>;
  record: z.infer<typeof c.seedingRecord> | null;
  allowed(action: string): boolean;
  onClose(): void;
  onSaved(): void;
}) {
  const lots = useRemote(
    useMemo(
      () => (signal: AbortSignal) => seedRepo.read("seed-lots", { id: raftId, zoneId }, c.seedLots, signal),
      [raftId, zoneId],
    ),
  );
  const dateWindow = useMemo(() => backdateWindow(businessToday(), cycleStartDate), [cycleStartDate]);
  const [date, setDate] = useState(record?.seedingDate ?? businessToday());
  const [lot, setLot] = useState(record?.seedLot.id ?? "");
  const [quantity, setQuantity] = useState(String(record?.quantity ?? ""));
  const [lanes, setLanes] = useState(record?.laneNumbers ?? []);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const dirty =
    date !== (record?.seedingDate ?? businessToday()) ||
    lot !== (record?.seedLot.id ?? "") ||
    quantity !== String(record?.quantity ?? "") ||
    JSON.stringify(lanes) !== JSON.stringify(record?.laneNumbers ?? []) ||
    !!reason;
  // The unit always comes from the Vật tư & Giống catalogue (the lot's unit), never a fixed word.
  const selectedLot = lots.data?.lots.find((v) => v.id === lot);
  const seedUnit = selectedLot?.unit ?? record?.seedLot.unit ?? "đơn vị";
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, dirty);
  const editable = record ? record.canCorrect && allowed("Edit") : data.canRecord && allowed("Create");
  const choices = Array.from(
    new Set([...data.lanes.filter((v) => v.canSeed).map((v) => v.laneNumber), ...(record?.laneNumbers ?? [])]),
  ).sort((a, b) => a - b);
  async function save() {
    // A correction keeps its original date even when that date is now older than 30 days.
    const dateProblem = date !== record?.seedingDate ? backdateProblem(date, dateWindow, "Ngày thả giống", !!cycleStartDate) : undefined;
    if (dateProblem) { setError(dateProblem); return; }
    const parsed = c.seedValues.safeParse({
      seedingDate: date,
      seedLotId: lot,
      quantity: Number(quantity),
      laneNumbers: lanes,
    });
    if (!parsed.success) {
      const labels: Record<string, string> = {
        seedingDate: "Ngày thả giống phải đúng ngày/tháng/năm",
        seedLotId: "Chọn lô giống",
        laneNumbers: "Chọn ít nhất một làn",
        quantity: "Số lượng giống phải lớn hơn 0",
      };
      setError(
        [
          ...new Set(
            parsed.error.issues.map((issue) => labels[String(issue.path[0])] ?? "Kiểm tra thông tin thả giống"),
          ),
        ].join(". ") + ".",
      );
      return;
    }
    if (record && !reason.trim()) {
      setError("Nhập lý do điều chỉnh hoặc xóa bản ghi.");
      return;
    }
    setError(undefined);
    if (
      await editor.submit(record ? "Lưu điều chỉnh thả giống?" : "Ghi nhận lần thả giống này?", () =>
        seedRepo.write(
          record ? "correct" : "record",
          { ...parsed.data, ...(record ? { reason, rowVersion: record.rowVersion } : {}) },
          z.object({ record: c.seedingRecord }),
          record?.id ?? cycleId,
          zoneId,
        ),
      )
    ) { notify({ tone: "success", title: `Đã lưu thả giống ${record?.seedLot.code ?? lots.data?.lots.find(v => v.id === lot)?.code ?? ""}.` }); onSaved(); }
  }
  return (
    <EditorFrame
      inline={!!record}
      title={record ? "Bản ghi thả giống" : "Ghi nhận thả giống"}
      editor={editor}
      error={error || lots.error}
    >
      {record && !record.canCorrect && (
        <p className="mb-4 text-sm text-text-muted">
          Bản ghi đang được khóa theo trạng thái chu kỳ hoặc lô thu hoạch. Không thể sửa hoặc xóa ở trạng thái này.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={!editable || editor.disabled} className="space-y-4">
          <Field label="Ngày thả giống *" type="date" required min={dateWindow.min} max={dateWindow.max} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Lô giống *" required value={lot} onChange={(e) => setLot(e.target.value)}>
            <option value="">Chọn lô giống</option>
            {record && !lots.data?.lots.some((v) => v.id === record.seedLot.id) && (
              <option value={record.seedLot.id}>{record.seedLot.code}</option>
            )}
            {lots.data?.lots.map((v) => (
              <option key={v.id} value={v.id}>
                {v.code} · {v.itemName ?? "Giống"} · {v.supplierName} · {v.unit}
              </option>
            ))}
          </Select>
          <UnitField
            key="seeding-quantity"
            label="Số lượng giống *"
            unit={seedUnit}
            decimals={3}
            min={0.001}
            required
            hint={selectedLot?.onHand != null ? `Còn ${selectedLot.onHand.toLocaleString("vi-VN")} ${seedUnit} trong lô` : undefined}
            value={quantity}
            onChange={setQuantity}
          />
          <LaneChoices lanes={choices} values={lanes} onChange={setLanes} />
          {record && (
            <Note label="Lý do điều chỉnh *" required value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
        </fieldset>
          <div className="flex justify-end gap-2 mt-4">
            <Button className="w-auto" key="discard-seeding" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
          {editable && (
            <Button className="w-auto" key="save-seeding" type="submit" disabled={editor.disabled || lots.loading || !!lots.error}>
              Lưu
            </Button>
          )}</div>
      </form>
      {lots.error && (
        <Button type="button" variant="secondary" onClick={lots.reload}>
          Tải lại lô giống
        </Button>
      )}
      {record?.canCorrect && allowed("Delete") && (
        <Button type="button"
          className="mt-3"
          variant="secondary"
          disabled={editor.disabled || !reason.trim()}
          onClick={async () => {
            if (
              await editor.submit("Gỡ bản ghi thả giống? Lý do sẽ được lưu trong nhật ký.", () =>
                seedRepo.write(
                  "remove",
                  { reason, rowVersion: record.rowVersion },
                  z.object({ done: z.literal(true) }),
                  record.id,
                  zoneId,
                ),
              )
            ) { notify({ tone: "success", title: `Đã xóa bản ghi thả giống ${record.seedLot.code}.` }); onSaved(); }
          }}
        >
          Xóa bản ghi thả giống
        </Button>
      )}
    </EditorFrame>
  );
}
