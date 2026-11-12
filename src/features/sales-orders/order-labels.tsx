"use client";
import { StatusPill } from "@/components/ui/management-page";
import { newPlanHref } from "@/features/harvest-plans/plan-labels";
import { ORDER, type OrderSource } from "./contracts";

export const ORDERS_PATH = "/sales/orders";
/** An order is opened in its list by its code. */
export const orderHref = (code: string) => `${ORDERS_PATH}?code=${encodeURIComponent(code)}`;
export const orderStatusLabel: Record<number, string> = { 4101: "Phiếu tạm", 4102: "Đang giao", 4103: "Hoàn thành", 4104: "Đã hủy" };
export const sourceLabel: Record<OrderSource, string> = { App: "Ứng dụng", Phone: "Điện thoại", AtPort: "Tại cảng" };
export const orderSourceOptions: readonly (readonly [OrderSource, string])[] = [["App", "Ứng dụng"], ["Phone", "Điện thoại"], ["AtPort", "Tại cảng"]];
export const advanceMethodLabel: Record<string, string> = { Cash: "Tiền mặt", OtherTransfer: "Chuyển khoản", VietQrInvoice: "VietQR", EWallet: "Ví điện tử" };

const tone = (statusId: number) => statusId === ORDER.completed ? "success" as const : statusId === ORDER.cancelled ? "danger" as const : "neutral" as const;
export function OrderStatus({ statusId }: { statusId: number }) {
  return <StatusPill tone={tone(statusId)}>{orderStatusLabel[statusId] ?? ""}</StatusPill>;
}

/**
 * Where "Xử lý đặt hàng" (the invoice made from the order) and "Lập kế hoạch thu hoạch" lead. A screen comes with its own module: until a route is
 * set here the button is not shown, even when the API allows the action.
 */
export const processOrderHref = (orderId: string): string | undefined => `/sales/invoices/new?order=${encodeURIComponent(orderId)}`;
/** The harvest plan editor, started for this order. */
export const planHarvestHref = (orderId: string): string | undefined => newPlanHref([orderId]);
