"use client";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import * as c from "./contracts";
import { blankLine, type ReceiptLine, type ReceiptLines } from "./receipt-shared";
import { Field, Select } from "./ui";

/** Editable goods lines of a receipt ("Hàng nhập"); rows can be added and removed freely. */
export function ReceiptLineItemsFieldset({
  record,
  lines,
  setLines,
  activeItems,
}: {
  record: c.Receipt | null;
  lines: ReceiptLines;
  setLines: Dispatch<SetStateAction<ReceiptLines>>;
  activeItems: ApiRecord[];
}) {
  const changeLine = (key: string, field: keyof ReceiptLine, value: string) =>
    setLines((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  return (
    <fieldset className="space-y-4 rounded-control border border-border p-4 sm:col-span-2">
      <legend>Hàng nhập</legend>
      {lines.map((row, index) => (
        <div className="grid gap-3 border-b border-border pb-4 sm:grid-cols-3" key={row.key}>
          <Select
            label={`Dòng ${index + 1} · Vật tư`}
            value={row.itemId}
            onChange={(e) => changeLine(row.key, "itemId", e.target.value)}
          >
            <option value="">Chọn vật tư</option>
            {/* Keep an item that is no longer active selectable so existing lines still display. */}
            {row.itemId && !activeItems.some((item) => item.id === row.itemId) && (
              <option value={row.itemId}>
                {record?.lines.find((line) => line.itemId === row.itemId)?.itemName ?? "Vật tư đã ngừng dùng"} (ngừng
                dùng)
              </option>
            )}
            {activeItems.map((item) => (
              <option key={item.id} value={item.id}>
                {String(item.code)} · {String(item.name)} ({String(item.unit)})
              </option>
            ))}
          </Select>
          <Field
            label="Số lượng"
            type="number"
            min="0.001"
            max="1000000000"
            step="0.001"
            value={row.quantity}
            onChange={(e) => changeLine(row.key, "quantity", e.target.value)}
          />
          <Field
            label="Đơn giá (đồng)"
            type="number"
            min="0"
            step="1"
            value={row.unitPrice}
            onChange={(e) => changeLine(row.key, "unitPrice", e.target.value)}
          />
          <Field
            label="Mã lô nhà cung cấp"
            maxLength={100}
            value={row.supplierLotCode}
            onChange={(e) => changeLine(row.key, "supplierLotCode", e.target.value)}
          />
          <Field
            label="Nguồn thực tế"
            maxLength={500}
            value={row.actualSource}
            onChange={(e) => changeLine(row.key, "actualSource", e.target.value)}
          />
          <Button
            className="self-end"
            variant="secondary"
            onClick={() => setLines((current) => current.filter((line) => line.key !== row.key))}
          >
            Bỏ dòng {index + 1}
          </Button>
        </div>
      ))}
      <Button className="w-auto" variant="secondary" onClick={() => setLines((current) => [...current, blankLine()])}>
        Thêm dòng hàng
      </Button>
    </fieldset>
  );
}
