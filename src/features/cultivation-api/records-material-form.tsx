"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { farmingStepLink } from "@/features/farming-management/entity-links";
import { UnitField } from "@/components/form/number-fields";
import { loadOptions } from "@/features/operations/lookups";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { farmingErrorText } from "./farming-error-text";
import { EditorFrame, RecordFormFooter, materialRepo } from "./records-shared";

/** Records several material lines for one repair job, or corrects a single saved line (with a reason). */
export function MaterialForm({
  zoneId,
  raftId,
  cycleId,
  record,
  allowed,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  cycleId?: string;
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
  // The unit is the item's catalogue unit, so the quantity box never shows a bare number.
  const unitOf = (itemId: string) => String(items.data?.find((v) => v.id === itemId)?.unit ?? (record?.itemId === itemId ? record.unit : "đơn vị"));
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, dirty);
  // Stock check (409 MSG-INPUT-01): on hand and balance after, in the unit of the item the backend names.
  const stockError = editor.mutation.failure ? farmingErrorText(editor.mutation.failure, editor.mutation.failure.problem?.itemId ? unitOf(editor.mutation.failure.problem.itemId) : undefined) : undefined;
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
    ) { notify({ tone: "success", title: record ? `Đã cập nhật sử dụng vật tư ${record.itemCode}.` : "Đã ghi nhận sử dụng vật tư.", action: { label: "Bước tiếp theo →", href: farmingStepLink("harvest", { zoneId, raftId, cycleId }) } }); onSaved(); }
  }
  return (
    <EditorFrame
      inline={!!record}
      title={record ? "Bản ghi sử dụng vật tư" : "Ghi nhận sử dụng vật tư"}
      editor={editor}
      error={error || stockError || items.error}
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
              <UnitField
                key={`material-quantity-${index}`}
                label="Số lượng *"
                accessibleName={`Dòng ${index + 1}: số lượng vật tư`}
                unit={unitOf(line.itemId)}
                decimals={3}
                min={0.001}
                required
                value={line.quantity}
                onChange={(quantity) => setLines((v) => v.map((r, i) => (i === index ? { ...r, quantity } : r)))}
              />
              {!record && lines.length > 1 && (
                <Button
                  className="w-auto justify-self-start sm:col-span-2"
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
              className="w-auto justify-self-start"
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
        </fieldset>
        <RecordFormFooter>
          <Button className="w-auto" key="discard-material" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
          {editable && (
            <Button className="w-auto" key="save-material" type="submit" disabled={editor.disabled || items.loading || !!items.error}>
              Lưu
            </Button>
          )}
        </RecordFormFooter>
      </form>
      {record?.canEdit && allowed("Delete") && <Button type="button" className="mt-3" variant="secondary" disabled={editor.disabled || !reason.trim()} onClick={async () => {
        if (await editor.submit(`Xóa lần sử dụng ${record.itemCode}? Vật tư được trả về kho và lý do được lưu trong nhật ký.`, () => materialRepo.write("remove", { reason, rowVersion: record.rowVersion }, z.object({ done: z.literal(true) }), record.id, zoneId))) { notify({ tone: "success", title: `Đã xóa lần sử dụng ${record.itemCode}.` }); onSaved(); }
      }}>Xóa lần sử dụng</Button>}
      {items.error && (
        <Button type="button" variant="secondary" onClick={items.reload}>
          Tải lại vật tư
        </Button>
      )}
    </EditorFrame>
  );
}
