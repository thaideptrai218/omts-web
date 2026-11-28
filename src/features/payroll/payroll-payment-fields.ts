import { toApiTime } from "@/features/operations/ui";
import type { PaymentMethod } from "./contracts";

export type PaymentHeader = { paidAt: string; method: PaymentMethod; note: string; cashAccountId: string };
/** The account to send with the payment: only a bank transfer names one (the backend refuses an account with cash). */
export const accountField = (header: PaymentHeader) => header.method === "BankTransfer" && header.cashAccountId ? { cashAccountId: header.cashAccountId } : {};
/** ISO-8601 instant of the picked local (Vietnam) time. */
export const paidAtInstant = (value: string) => new Date(toApiTime(value) ?? "").toISOString();
