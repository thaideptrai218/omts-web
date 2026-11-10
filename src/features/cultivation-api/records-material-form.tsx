"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { loadOptions } from "@/features/operations/lookups";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, materialRepo } from "./records-shared";

/** Records several material lines for one repair job, or corrects a single saved line (with a reason). */
export function MaterialForm({
  zoneId,
  raftId,
  record,
  allowed,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  record: z.infer<typeof c.materialRecord> | null;
  allowed(action: string): boolean;
  onClose(): void;
  onSaved(): void;
}) {
  const items = useRemote(
    useMemo(
      () => (signal: AbortSignal) => loadOptions("input-items", signal, { group: "Material", statusId: "101" }),
      [],
    ),
  );
  const [date, setDate] = useState(record?.usageDate ?? businessToday());
  const [repair, setRepair] = useState(record?.repairReason ?? "");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState(
    record ? [{ itemId: record.itemId, quantity: String(record.quantity) }] : [{ itemId: "", quantity: "" }],
  );
  const [error, setError] = useState<string>();
  const dirty =
    !!reason ||
    date !== (record?.usageDate ?? businessToday()) ||
    repair !== (record?.repairReason ?? "") ||
    JSON.stringify(lines) !==
      JSON.stringify(
        record ? [{ itemId: record.itemId, quantity: String(record.quantity) }] : [{ itemId: "", quantity: "" }],
      );
  const editor = useOperationEditor(onClose, dirty);
  const editable = record ? record.canEdit && allowed("Edit") : allowed("Create");
  async function save() {
    const parsed = c.materialValues.safeParse({
      usageDate: date,
      repairReason: repair,
      items: lines.map((v) => ({ itemId: v.itemId, quantity: Number(v.quantity) })),
    });
    if (!parsed.success || new Set(lines.map((v) => v.itemId)).size !== lines.length || (record && !reason.trim())) {
      setError("Nhập ngày, nội dung sửa chữa, vật tư không trùng, số lượng lớn hơn 0 và lý do khi điều chỉnh.");
      return;
    }
    setError(undefined);
    const body = record
      ? {
          raftId,
          usageDate: date,
          repairReason: repair,
          ...parsed.data.items[0],
          reason,
          rowVersion: record.rowVersion,
        }
      : parsed.data;
    if (
      await editor.submit("Lưu ghi nhận sử dụng vật tư?", () =>
        materialRepo.write<unknown>(
          record ? "correct" : "record",
          body,
          record ? z.object({ record: c.materialRecord }) : z.object({ records: z.array(c.materialRecord) }),
          record?.id ?? raftId,
          zoneId,
        ),
      )
    )
      onSaved();
  }
  return (
    <EditorFrame
      title={record ? "Bản ghi sử dụng vật tư" : "Ghi nhận sử dụng vật tư"}
      editor={editor}
      error={error || items.error}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={!editable || editor.disabled} className="space-y-4">
          <Field label="Ngày sử dụng *" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <Note
            label="Nội dung sửa chữa / bảo dưỡng *"
            required
            value={repair}
            onChange={(e) => setRepair(e.target.value)}
          />
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Vật tư *"
                required
                value={line.itemId}
                onChange={(e) => setLines((v) => v.map((r, i) => (i === index ? { ...r, itemId: e.target.value } : r)))}
              >
                <option value="">Chọn vật tư</option>
                {record && !items.data?.some((v) => v.id === record.itemId) && (
                  <option value={record.itemId}>
                    {record.itemCode} · {record.itemName}
                  </option>
                )}
                {items.data?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {String(v.code)} · {String(v.name)} · {String(v.unit)}
                  </option>
                ))}
              </Select>
              <Field
                label="Số lượng *"
                type="number"
                min="0.001"
                step="0.001"
                required
                value={line.quantity}
                onChange={(e) =>
                  setLines((v) => v.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))
                }
              />
              {!record && lines.length > 1 && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setLines((v) => v.filter((_, i) => i !== index))}
                >
                  Bỏ dòng {index + 1}
                </Button>
              )}
            </div>
          ))}
          {!record && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLines((v) => [...v, { itemId: "", quantity: "" }])}
            >
              Thêm vật tư
            </Button>
          )}
          {record && (
            <Note label="Lý do điều chỉnh *" required value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          {editable && (
            <Button type="submit" disabled={items.loading || !!items.error}>
              Lưu sử dụng vật tư
            </Button>
          )}
        </fieldset>
      </form>
      {items.error && (
        <Button variant="secondary" onClick={items.reload}>
          Tải lại vật tư
        </Button>
      )}
    </EditorFrame>
  );
}
