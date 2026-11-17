"use client";
import { StatusPill } from "@/components/ui/management-page";
import { RETURN, type Outcome } from "./return-contracts";

export const RETURNS_PATH = "/operations/sales-returns";
export const NEW_RETURN_PATH = "/sales/returns/new";
/** A return is opened in its list by its code (TL000001). */
export const salesReturnHref = (code: string) => `${RETURNS_PATH}?code=${encodeURIComponent(code)}`;
/** The editor of a new return for one invoice, named by its code: ids do not belong in an address. */
export const newReturnHref = (invoiceCode: string) => `${NEW_RETURN_PATH}?invoice=${encodeURIComponent(invoiceCode)}`;

export const returnStatusLabel: Record<number, string> = { [RETURN.recorded]: "Đã ghi nhận", [RETURN.cancelled]: "Đã hủy" };
export const outcomeLabel: Record<Outcome, string> = { BackForSale: "Bán lại", ThrownAway: "Hủy bỏ" };
export const offerText = (offer: string | null | undefined) => offer === "ReturnAllGoods" ? "Trả lại toàn bộ hàng" : offer === "PriceCutWholeInvoice" ? "Giảm giá cả hóa đơn" : "Chưa chọn cách xử lý";

export function ReturnStatus({ statusId }: { statusId: number }) {
  return <StatusPill tone={statusId === RETURN.recorded ? "success" : statusId === RETURN.cancelled ? "danger" : "neutral"}>{returnStatusLabel[statusId] ?? "Chưa rõ"}</StatusPill>;
}
