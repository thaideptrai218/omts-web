"use client";
import { StatusPill } from "@/components/ui/management-page";
import { deliveryStatus, invoiceStatus, paidState, paymentStatus } from "./invoice-labels";

/** The four states an invoice row shows, drawn like the receipt status: the same pill, green for done, red for what needs attention, grey otherwise. */
export const INVOICE = { completed: 3501, cancelled: 3502 } as const;

export const InvoiceStatus = ({ statusId }: { statusId: number }) =>
  <StatusPill tone={statusId === INVOICE.completed ? "success" : statusId === INVOICE.cancelled ? "danger" : "neutral"}>{invoiceStatus(statusId)}</StatusPill>;

/** Money collected for a completed invoice; a cancelled invoice has none (`isPaid` is null). */
export const PaidStatus = ({ isPaid }: { isPaid: boolean | null }) => isPaid === null ? <>—</> : <StatusPill tone={isPaid ? "success" : "danger"}>{paidState(isPaid)}</StatusPill>;

/** 1601 sending, 1602 sent, 1603 not sent. */
export const DeliveryStatus = ({ statusId }: { statusId: number }) =>
  <StatusPill tone={statusId === 1602 ? "success" : statusId === 1603 ? "danger" : "neutral"}>{deliveryStatus(statusId)}</StatusPill>;

/** 3601 awaiting confirmation, 3602 confirmed, 3603 cancelled. */
export const PaymentStatus = ({ statusId }: { statusId: number }) =>
  <StatusPill tone={statusId === 3602 ? "success" : statusId === 3603 ? "danger" : "neutral"}>{paymentStatus(statusId)}</StatusPill>;
