"use client";
import type { z } from "zod";
import { SelectBox } from "@/components/ui/select-box";
import type { harvestOrder } from "./records-contracts";

type Order = z.infer<typeof harvestOrder>;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const day = (iso: string) => iso.split("-").reverse().join("/");

/** First choice for a new trip: the request whose work plan sends the harvest to this raft, else the first the backend lists (earliest agreed pickup). */
export const defaultHarvestOrderId = (orders: readonly Order[]) => (orders.find(order => order.plannedOnRaft) ?? orders[0])?.id ?? "";

/** The purchase request a trip harvests for (decision of 11/11/2026): the backend refuses a trip without one. */
export function HarvestOrderPicker({ orders, value, onChange }: { orders: readonly Order[]; value: string; onChange(id: string): void }) {
  if (!orders.length) return <p role="status" className="rounded-control border border-border bg-surface-subtle p-3 text-sm text-text-muted">
    Chưa có yêu cầu mua nào đang chờ thu hoạch. Chuyến thu hoạch cần gắn với một yêu cầu mua đã chấp nhận và chưa được đánh dấu thu xong.</p>;
  const picked = orders.find(order => order.id === value);
  return <div className="grid gap-1">
    <label className="grid gap-1 text-sm font-medium">Yêu cầu mua *
      <SelectBox className="omts-control" value={value} required onChange={event => onChange(event.target.value)}>
        {orders.map(order => <option key={order.id} value={order.id}>{order.code} · {order.customerName} · {order.productName}{order.plannedOnRaft ? " · lập kế hoạch cho bè này" : ""}</option>)}
      </SelectBox>
    </label>
    {picked && <p className="text-xs text-text-muted">Đã thu {n(picked.harvestedCages)}/{n(picked.acceptedCages)} lồng · lấy hàng {day(picked.pickupDate)}{picked.workDate ? ` · ngày làm ${day(picked.workDate)}` : ""}</p>}
  </div>;
}
