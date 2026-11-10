"use client";
import type { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { operationAllowed } from "./permissions";
import * as c from "./contracts";
import { createOperationsRepository } from "./repository";
import { loadOptions } from "./lookups";
import { Money } from "./ui";

/** Shared pieces of the purchase receipt list, editor and its sub-sections. */
export const receiptRepository = createOperationsRepository("purchase-receipts");

export type ReceiptLine = {
  key: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  supplierLotCode: string;
  actualSource: string;
};
export type ReceiptLines = ReceiptLine[];

export const blankLine = (): ReceiptLine => ({
  key: crypto.randomUUID(),
  itemId: "",
  quantity: "",
  unitPrice: "",
  supplierLotCode: "",
  actualSource: "",
});

type WorkspaceAccess = Pick<ReturnType<typeof useApiWorkspace>, "identity" | "permissions">;

/** Frontend gate for a purchase-receipt action, optionally scoped to one zone. */
export function receiptAllowed(context: WorkspaceAccess, action: string, zoneId?: string) {
  return operationAllowed(
    "purchase-receipts",
    context.identity,
    context.permissions.functionPermissions,
    action,
    zoneId,
  );
}

/** Loads rafts for a zone; resolves to an empty list when no zone is chosen yet. */
export function loadZoneRafts(signal: AbortSignal, zoneId: string, extra: Record<string, string> = {}) {
  return zoneId
    ? loadOptions("rafts", signal, { zoneId, ...extra })
    : Promise.resolve({ status: "success" as const, data: [] as ApiRecord[] });
}

export function ReceiptTotals({
  record,
}: {
  record: Pick<c.Receipt, "payable" | "paid" | "returned" | "outstanding">;
}) {
  return (
    <dl
      aria-label="Đối chiếu giá trị phiếu"
      className="my-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3 sm:grid-cols-4"
    >
      {[
        ["Phải trả", record.payable],
        ["Đã trả", record.paid],
        ["Hàng trả", record.returned],
        ["Còn nợ", record.outstanding],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-text-muted">{label}</dt>
          <dd
            className={`mt-1 text-sm font-semibold tabular-nums ${label === "Còn nợ" && Number(value) > 0 ? "text-amber-800" : "text-text"}`}
          >
            <Money value={Number(value)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
