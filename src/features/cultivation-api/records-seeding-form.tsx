"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, seedRepo } from "./records-shared";

/** Records a new seeding, or corrects/removes an existing one (a reason is required for both). */
export function SeedingForm({
  zoneId,
  raftId,
  cycleId,
  data,
  record,
  allowed,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  cycleId: string;
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
  const editor = useOperationEditor(onClose, dirty);
  const editable = record ? record.canCorrect && allowed("Edit") : data.canRecord && allowed("Create");
  const choices = Array.from(
    new Set([...data.lanes.filter((v) => v.canSeed).map((v) => v.laneNumber), ...(record?.laneNumbers ?? [])]),
  ).sort((a, b) => a - b);
  async function save() {
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
    )
      onSaved();
  }
  return (
    <EditorFrame
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
          <Field label="Ngày thả giống *" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
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
          <Field
            label="Số lượng giống *"
            type="number"
            required
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <LaneChoices lanes={choices} values={lanes} onChange={setLanes} />
          {record && (
            <Note label="Lý do điều chỉnh *" required value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          {editable && (
            <Button type="submit" disabled={lots.loading || !!lots.error}>
              Lưu thả giống
            </Button>
          )}
        </fieldset>
      </form>
      {lots.error && (
        <Button variant="secondary" onClick={lots.reload}>
          Tải lại lô giống
        </Button>
      )}
      {record?.canCorrect && allowed("Delete") && (
        <Button
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
            )
              onSaved();
          }}
        >
          Xóa bản ghi thả giống
        </Button>
      )}
    </EditorFrame>
  );
}
