"use client";
import { useState } from "react";
import { MoneyField } from "@/components/form/number-fields";
import { UnitInput } from "@/components/form/unit-input";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import * as c from "./contracts";
import { DataTable, Field, MethodOptions, Note, Select, businessToday } from "./ui";

export type ReceiptActionMode = "cancel" | "return";

/** Inline form for cancelling a receipt or returning goods to the supplier. */
export function ReceiptActionForm({
  mode,
  record,
  disabled,
  onCancel,
  onSubmit,
}: {
  mode: ReceiptActionMode;
  record: c.Receipt;
  disabled: boolean;
  onCancel(): void;
  onSubmit(action: ReceiptActionMode, body: Record<string, unknown>): Promise<void>;
}) {
  const confirmation = useActionDialog();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(businessToday());
  // "" = not chosen yet, "cancel" = cancel paid amounts, "keep" = keep them as unallocated supplier credit.
  const [cancelPayments, setCancelPayments] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState("0");
  const [reduction, setReduction] = useState("0");
  const [method, setMethod] = useState("Cash");

  function buildBody() {
    if (mode === "cancel") {
      return {
        reason,
        rowVersion: record.rowVersion,
        cancelPayments: cancelPayments === "" ? null : cancelPayments === "cancel",
      };
    }
    return {
      reason,
      returnDate: date,
      refundAmount: Number(refund),
      debtReductionAmount: Number(reduction),
      refundMethod: Number(refund) > 0 ? method : null,
      lines: record.lines
        .filter((row) => Number(quantities[row.id]) > 0)
        .map((row) => ({ receiptLineId: row.id, quantity: Number(quantities[row.id]) })),
    };
  }

  return (
    <form
      className="my-5 space-y-4 rounded-control border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const question =
          mode === "cancel"
            ? "Hủy phiếu với lý do và cách xử lý tiền đã chọn?"
            : "Ghi nhận trả hàng và các khoản hoàn tiền/giảm nợ đã nhập?";
        if (!(await confirmation.confirm(question))) return;
        void onSubmit(mode, buildBody());
      }}
    >
      {confirmation.dialog}
      <h3 className="font-semibold">{mode === "cancel" ? "Hủy phiếu nhập" : "Trả hàng nhà cung cấp"}</h3>
      <fieldset disabled={disabled} className="space-y-4">
        <Note label="Lý do *" required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        {mode === "cancel" ? (
          // Only ask how to handle paid amounts when the receipt has a recorded (1801) payment.
          record.payments.some((row) => row.statusId === 1801) && (
            <Select
              label="Xử lý khoản đã trả *"
              required
              value={cancelPayments}
              onChange={(e) => setCancelPayments(e.target.value)}
            >
              <option value="">Chọn cách xử lý</option>
              <option value="cancel">Hủy các khoản thanh toán của phiếu</option>
              <option value="keep">Giữ thành khoản chưa phân bổ của nhà cung cấp</option>
            </Select>
          )
        ) : (
          <>
            <Field
              label="Ngày trả *"
              required
              type="date"
              min={record.receiptDate ?? undefined}
              max={businessToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <DataTable headings={["Hàng", "Còn được trả", "Số lượng trả"]}>
              {record.lines.map((row) => (
                <tr key={row.id}>
                  <td>{row.itemName}</td>
                  <td>
                    {row.returnable} {row.unit}
                  </td>
                  <td>
                    <UnitInput
                      label={`Số lượng trả ${row.itemName}`}
                      unit={row.unit}
                      decimals={3}
                      min={0}
                      max={row.returnable}
                      disabled={row.returnable <= 0}
                      value={quantities[row.id] ? Number(quantities[row.id]) : null}
                      onChange={(next) => setQuantities((current) => ({ ...current, [row.id]: next === null ? "" : String(next) }))}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <p className="text-sm text-text-muted">
              Giá trị trả tính theo giá trị hàng sau chiết khấu và làm tròn tiền của phiếu. Tiền hoàn cộng giảm nợ phải
              khớp giá trị trả.
            </p>
            <MoneyField label="Tiền hoàn nhận lại" required min={0} autoThousands value={refund} onChange={setRefund} />
            <Select label="Hình thức hoàn tiền" value={method} onChange={(e) => setMethod(e.target.value)}>
              <MethodOptions />
            </Select>
            <MoneyField label="Giảm công nợ" required min={0} autoThousands value={reduction} onChange={setReduction} />
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button className="w-auto" type="submit">
            {mode === "cancel" ? "Xác nhận hủy phiếu" : "Ghi nhận trả hàng"}
          </Button>
          <Button className="w-auto" variant="secondary" onClick={onCancel}>
            Quay lại
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
