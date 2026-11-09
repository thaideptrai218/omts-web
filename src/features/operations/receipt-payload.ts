import type { ReceiptLines } from "./receipt-shared";

/** Header fields of the receipt form, kept as strings exactly as typed. */
export type ReceiptFormValues = {
  supplierId: string;
  zoneId: string;
  raftId: string;
  receiptDate: string;
  discountAmount: string;
  amountPaidNow: string;
  paidNowMethod: string;
  notes: string;
};

/**
 * Converts the form into the save payload: blank optional fields become null,
 * fully empty line rows are dropped and numeric text is converted to numbers.
 */
export function buildReceiptPayload(
  values: ReceiptFormValues,
  lines: ReceiptLines,
  complete: boolean,
  rowVersion: string | null,
) {
  return {
    ...values,
    raftId: values.raftId || null,
    receiptDate: values.receiptDate || null,
    discountAmount: Number(values.discountAmount || 0),
    amountPaidNow: Number(values.amountPaidNow || 0),
    paidNowMethod: values.paidNowMethod || null,
    notes: values.notes || null,
    complete,
    rowVersion,
    lines: lines
      .filter((row) => row.itemId || row.quantity || row.unitPrice || row.supplierLotCode || row.actualSource)
      .map((row) => ({
        itemId: row.itemId,
        quantity: row.quantity === "" ? null : Number(row.quantity),
        unitPrice: row.unitPrice === "" ? null : Number(row.unitPrice),
        supplierLotCode: row.supplierLotCode || null,
        actualSource: row.actualSource || null,
      })),
  };
}

/** Completing a receipt needs a receipt date and at least one line, each with item, quantity and unit price. */
export function missingCompletionData(values: ReceiptFormValues, payload: ReturnType<typeof buildReceiptPayload>) {
  return (
    !values.receiptDate ||
    !payload.lines.length ||
    payload.lines.some((row) => !row.itemId || row.quantity === null || row.unitPrice === null)
  );
}
