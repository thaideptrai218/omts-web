"use client";
import { MoneyField } from "@/components/form/number-fields";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import * as c from "./contracts";
import type { ReceiptFormValues } from "./receipt-payload";
import { Field, MethodOptions, Note, Select, businessToday } from "./ui";

/**
 * Supplier, zone, date, raft and payment fields of the receipt form. The saved supplier/zone/raft stay
 * selectable even when they are no longer active or allowed, so an existing receipt still displays them.
 */
export function ReceiptHeaderFields({
  record,
  values,
  change,
  activeSuppliers,
  allowedZones,
  rafts,
}: {
  record: c.Receipt | null;
  values: ReceiptFormValues;
  change(key: keyof ReceiptFormValues, value: string): void;
  activeSuppliers: ApiRecord[];
  allowedZones: ApiRecord[];
  rafts: ApiRecord[] | undefined;
}) {
  return (
    <>
      <Select
        label="Nhà cung cấp *"
        required
        value={values.supplierId}
        onChange={(e) => change("supplierId", e.target.value)}
      >
        <option value="">Chọn nhà cung cấp</option>
        {record &&
          !activeSuppliers.some((row) => row.id === record.supplier.id) &&
          values.supplierId === record.supplier.id && (
            <option value={record.supplier.id}>{record.supplier.name} (ngừng dùng)</option>
          )}
        {activeSuppliers.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.name)}
          </option>
        ))}
      </Select>
      <Select label="Vùng nuôi *" required value={values.zoneId} onChange={(e) => change("zoneId", e.target.value)}>
        <option value="">Chọn vùng nuôi</option>
        {record && !allowedZones.some((row) => row.id === record.zone.id) && (
          <option value={record.zone.id}>{record.zone.name}</option>
        )}
        {allowedZones.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.name)}
          </option>
        ))}
      </Select>
      <Field
        label="Ngày nhập"
        type="date"
        max={businessToday()}
        value={values.receiptDate}
        onChange={(e) => change("receiptDate", e.target.value)}
      />
      <Select
        label="Bè (bắt buộc với vật tư bè)"
        value={values.raftId}
        onChange={(e) => change("raftId", e.target.value)}
      >
        <option value="">Chưa chọn bè</option>
        {record?.raft &&
          values.raftId === record.raft.id &&
          values.zoneId === record.zone.id &&
          !rafts?.some((row) => row.id === record.raft?.id) && (
            <option value={record.raft.id}>{record.raft.code}</option>
          )}
        {rafts?.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.code)}
          </option>
        ))}
      </Select>
      <MoneyField
        label="Chiết khấu"
        min={0}
        autoThousands
        value={values.discountAmount}
        onChange={(next) => change("discountAmount", next)}
      />
      <MoneyField
        label="Trả ngay"
        min={0}
        autoThousands
        value={values.amountPaidNow}
        onChange={(next) => change("amountPaidNow", next)}
      />
      <Select
        label="Hình thức trả ngay"
        value={values.paidNowMethod}
        onChange={(e) => change("paidNowMethod", e.target.value)}
      >
        <option value="">Chọn nếu có trả ngay</option>
        <MethodOptions />
      </Select>
      <Note label="Ghi chú" maxLength={1000} value={values.notes} onChange={(e) => change("notes", e.target.value)} />
    </>
  );
}
