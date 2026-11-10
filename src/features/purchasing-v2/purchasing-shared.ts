"use client";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import * as c from "./contracts";

/** Shared repositories, types and helpers of the purchase receipt and supplier payment screens. */
export const receiptsRepository = createOperationsRepository("purchase-receipts");
export const paymentsRepository = createOperationsRepository("supplier-payments");

export type Receipt = z.infer<typeof c.receipt>;
export type Payment = z.infer<typeof c.payment>;

export type SupplierPaymentDraft = {
  supplierId: string;
  amount?: number;
  note?: string;
  kind?: "Payment" | "PaidBack";
};

/** Current identity plus a cooperative-wide permission check for one purchasing area. */
export function useAccess(area: "purchase-receipts" | "supplier-payments") {
  const context = useApiWorkspace();
  return {
    identity: context.identity,
    allowed: (action: string) =>
      operationAllowed(area, context.identity, context.permissions.functionPermissions, action),
  };
}

/** Receipt statuses 1701 draft / 1702 completed / 1703 cancelled; 1802 is a cancelled payment. */
export const stateLabel = (n: number) =>
  n === 1701 ? "Nháp" : n === 1702 ? "Hoàn thành" : n === 1703 || n === 1802 ? "Đã hủy" : "Đã ghi nhận";

const raftOptionsSchema = z.array(z.object({ id: z.guid(), code: z.string(), zoneCode: z.string() }));

/** Rafts that receipt lines can be assigned to. */
export const loadReceiptRafts = (signal: AbortSignal) =>
  receiptsRepository.read("rafts", {}, raftOptionsSchema, signal);
