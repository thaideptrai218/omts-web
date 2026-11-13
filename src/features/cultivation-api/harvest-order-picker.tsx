"use client";
import { useState } from "react";
import type { z } from "zod";
import { SelectBox } from "@/components/ui/select-box";
import type { HarvestOrderView } from "./harvest-order-filter";
import type { harvestOrder } from "./records-contracts";
import { orderGatherHint, orderProgressText, orderRemainingCages, orderTripsText } from "./harvest-order-cages";

type Order = z.infer<typeof harvestOrder>;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const day = (iso: string) => iso.split("-").reverse().join("/");
const notice = "rounded-control border border-border bg-surface-subtle p-3 text-sm text-text-muted";

/** First choice for a new trip: the request whose work plan sends the harvest to this raft, else the first the backend lists (earliest agreed pickup). */
export const defaultHarvestOrderId = (orders: readonly Order[]) => (orders.find(order => order.plannedOnRaft) ?? orders[0])?.id ?? "";

/**
 * The purchase request a trip harvests for (decision of 11/11/2026): the backend refuses a trip without one. Only requests for the oyster the raft farms
 * can be picked (rule of 13/11/2026); the others stay hidden unless asked for, then show greyed out with the reason and cannot be chosen.
 */
export function HarvestOrderPicker({ view, value, onChange, error }: { view: HarvestOrderView; value: string; onChange(id: string): void; error?: string }) {
  const [showOthers, setShowOthers] = useState(false);
  const { selectable, mismatched, seedName } = view;
  const picked = selectable.find(order => order.id === value);
  const others = mismatched.length > 0 && <div className="grid gap-1">
    <button key="toggle-mismatched-orders" type="button" aria-expanded={showOthers} className="w-fit min-h-8 text-xs font-medium text-primary underline underline-offset-4" onClick={() => setShowOthers(current => !current)}>
      {showOthers ? "Ẩn đơn không khớp loại hàu" : `Hiện cả đơn không khớp loại hàu (${mismatched.length})`}</button>
    {showOthers && <ul aria-label="Đơn không khớp loại hàu đang nuôi" className="grid gap-1 text-xs text-text-muted">
      {mismatched.map(({ order, reason }) => <li key={order.id} className="rounded-control border border-dashed border-border p-2 opacity-80">
        <span className="font-medium">{order.code} · {order.customerName} · {order.productName}</span><br />{reason}. Không ghi nhận thu hoạch cho đơn này được.</li>)}
    </ul>}
  </div>;
  if (!selectable.length) return <div className="grid gap-2">
    <p role="status" className={notice}>{view.filtering
      ? `Chưa có đơn mua nào khớp loại hàu của giống đang nuôi${seedName ? ` (${seedName})` : ""}. Chuyến thu hoạch chỉ gắn được với đơn mua đúng loại hàu của bè.`
      : "Chưa có đơn mua nào cần thu. Chuyến thu hoạch gắn với một đơn mua khách đã đặt, đã chấp nhận và chưa được đánh dấu thu xong."}</p>
    {others}
  </div>;
  return <div className="grid gap-1">
    <label className="grid gap-1 text-sm font-medium">Đơn mua cần thu *
      <SelectBox className="omts-control" value={value} required aria-invalid={!!error} onChange={event => onChange(event.target.value)}>
        {selectable.map(order => <option key={order.id} value={order.id}>{order.code} · {order.customerName} · {order.productName}{orderRemainingCages(order) !== undefined ? ` · còn ${n(orderRemainingCages(order)!)} lồng` : ""}{order.plannedOnRaft ? " · lập kế hoạch cho bè này" : ""}</option>)}
      </SelectBox>
    </label>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {picked && <p className="text-xs text-text-muted">{orderProgressText(picked)}{orderTripsText(picked) ? `: ${orderTripsText(picked)}` : ""} · lấy hàng {day(picked.pickupDate)}{picked.workDate ? ` · ngày làm ${day(picked.workDate)}` : ""}</p>}
    {picked && orderGatherHint(picked) && <p className="text-xs text-text-muted">{orderGatherHint(picked)}</p>}
    {others}
  </div>;
}
