"use client";
import type { Dispatch, SetStateAction } from "react";
import { MoneyField, UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { Field, Select } from "@/features/operations/ui";
import type { Receipt } from "./purchasing-shared";
import styles from "./purchasing.module.css";

/** One editable receipt line; numbers stay as typed text until save. */
export type ReceiptLineDraft = {
  itemId: string;
  quantity: string;
  unitPrice: string;
  supplierLotCode: string;
  raftId: string;
};

export const blankReceiptLine = (): ReceiptLineDraft => ({
  itemId: "",
  quantity: "",
  unitPrice: "",
  supplierLotCode: "",
  raftId: "",
});

/** Editable item lines of a receipt; add/remove buttons only appear when the receipt is editable. */
export function ReceiptLineFields({
  record,
  lines,
  setLines,
  items,
  rafts,
  editable,
}: {
  record: Receipt | null;
  lines: ReceiptLineDraft[];
  setLines: Dispatch<SetStateAction<ReceiptLineDraft[]>>;
  items: ApiRecord[] | undefined;
  rafts: { id: string; code: string; zoneCode: string }[] | undefined;
  editable: boolean;
}) {
  const changeLine = (index: number, field: keyof ReceiptLineDraft, value: string) =>
    setLines((v) => v.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  return (
    <>
      {lines.map((line, index) => (
        <div key={index} className={styles.receiptLine}>
          <Select
            label={`Dòng ${index + 1} · Vật tư`}
            value={line.itemId}
            onChange={(e) => changeLine(index, "itemId", e.target.value)}
          >
            <option value="">Chọn vật tư</option>
            {/* Keep a saved item selectable when it is no longer in the active catalogue. */}
            {record?.lines[index]?.itemId && !items?.some((v) => v.id === line.itemId) && (
              <option value={line.itemId}>{record.lines[index].itemName}</option>
            )}
            {items?.map((v) => (
              <option key={v.id} value={v.id}>
                {String(v.code)} · {String(v.name)} ({String(v.unit)})
              </option>
            ))}
          </Select>
          <Select
            label="Bè sử dụng (giống/vật tư)"
            value={line.raftId}
            onChange={(e) => changeLine(index, "raftId", e.target.value)}
          >
            <option value="">Không chọn bè</option>
            {rafts?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.zoneCode} · {v.code}
              </option>
            ))}
          </Select>
          <UnitField
            label="Số lượng"
            unit={String(items?.find((v) => v.id === line.itemId)?.unit ?? "đơn vị")}
            decimals={3}
            min={0.001}
            value={line.quantity}
            onChange={(next) => changeLine(index, "quantity", next)}
          />
          <MoneyField
            label="Đơn giá"
            min={0}
            value={line.unitPrice}
            onChange={(next) => changeLine(index, "unitPrice", next)}
          />
          <Field
            label="Mã lô của nhà cung cấp (giống)"
            value={line.supplierLotCode}
            onChange={(e) => changeLine(index, "supplierLotCode", e.target.value)}
          />
          {editable && (
            <Button type="button" variant="secondary" onClick={() => setLines((v) => v.filter((_, i) => i !== index))}>
              Bỏ dòng {index + 1}
            </Button>
          )}
        </div>
      ))}
      {editable && (
        <Button type="button" variant="secondary" onClick={() => setLines((v) => [...v, blankReceiptLine()])}>
          Thêm dòng
        </Button>
      )}
    </>
  );
}
