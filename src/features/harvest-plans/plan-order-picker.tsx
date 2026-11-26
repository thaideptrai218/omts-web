"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { ORDER, type OrderView } from "@/features/sales-orders/contracts";
import { orderRepository } from "@/features/sales-orders/repository";
import Link from "next/link";
import { approxKgText, kgPerCageOfUnit } from "@/shared/format/approx-kg";
import { PLAN, type PlanView } from "./contracts";
import { planHref } from "./plan-labels";
import { planRepository } from "./repository";

type Entry = { id: string; code: string; customer: string; pickupAt: string | null };

const approxOf = (line: OrderView["lines"][number]) => {
  const text = approxKgText(line.quantity - line.deliveredQuantity, kgPerCageOfUnit({ name: line.unitName, factor: line.factor }));
  return text ? ` (${text})` : "";
};

/** What is still to deliver of an order, by product: ordered minus delivered, in the unit of each line (read once for the editor, which also sums it). */
function Remaining({ order, loading }: { order?: OrderView; loading: boolean }) {
  if (!order) return <small>{loading ? "Đang tải hàng của đơn…" : "Không tải được hàng của đơn."}</small>;
  const left = order.lines.filter((line) => line.quantity > line.deliveredQuantity);
  return <small>{left.length ? `Còn lại: ${left.map((line) => `${line.productName} ${fmt(line.quantity - line.deliveredQuantity)} ${line.unitName}${approxOf(line)}`).join(" · ")}` : "Đơn đã giao đủ."}</small>;
}

/**
 * The orders a plan serves, as many as needed: a search box over the orders that are still open (Phiếu tạm or Đang giao) of any zone, and each chosen order as a
 * chip that can be taken off, with what is left to deliver of it for reference. Orders already linked stay listed even when the order has since closed.
 */
export function PlanOrderPicker({ value, known, ownPlanId, details, detailsLoading, disabled, onToggle }: { value: readonly string[]; known: PlanView["orders"]; ownPlanId?: string; details?: ReadonlyMap<string, OrderView>; detailsLoading: boolean; disabled?: boolean; onToggle(orderId: string, picked: boolean): void }) {
  const [term, setTerm] = useState(""), [query, setQuery] = useState(""), [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => new Map<string, Entry>(known.map((order) => [order.id, { id: order.id, code: order.code, customer: order.customer?.name ?? "", pickupAt: null }])));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setQuery(term.trim()), 250); return () => clearTimeout(timer); }, [term]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const remote = useRemote(useCallback((signal: AbortSignal) => open
    ? orderRepository.list({ statusIds: `${ORDER.draft},${ORDER.delivering}`, ...(query ? { search: query } : {}), page: "1", pageSize: "20", sortBy: "code", sortDir: "desc" }, signal)
    : Promise.resolve({ status: "success" as const, data: undefined }), [open, query]));
  // An order has at most one active plan (MSG-PLAN-08): the orders that already have one, other than the plan being changed, are listed with its code and cannot be chosen.
  const planned = useRemote(useCallback((signal: AbortSignal) => open
    ? planRepository.list({ page: "1", pageSize: "100" }, signal)
    : Promise.resolve({ status: "success" as const, data: undefined }), [open]));
  const planOf = new Map((planned.data?.items ?? []).filter((plan) => plan.statusId !== PLAN.cancelled && plan.id !== ownPlanId).flatMap((plan) => plan.orders.map((order) => [order.id, plan.code] as const)));
  const found = (remote.data?.items ?? []).filter((row) => !value.includes(row.id));
  const pick = (row: (typeof found)[number]) => {
    setSeen((current) => new Map(current).set(row.id, { id: row.id, code: row.code, customer: row.walkInCustomer ? "Khách lẻ" : row.customerName ?? "", pickupAt: row.pickupAt ?? null }));
    onToggle(row.id, true); setTerm("");
  };
  return <fieldset className="grid min-w-0 gap-2" aria-label="Đơn đặt hàng liên kết">
    <legend className="mb-1 text-[13px] font-semibold">Đơn đặt hàng liên kết</legend>
    {value.map((id) => {
      const order = seen.get(id);
      return <div key={id} className={purchaseStyles.supplierChosen}><InterfaceIcon name="request" />
        <span><strong>{order?.code ?? "Đơn đặt hàng"}</strong>{(order?.customer || order?.pickupAt) && <small>{[order.customer, order.pickupAt ? `hẹn ${viDateTime(order.pickupAt)}` : ""].filter(Boolean).join(" · ")}</small>}<Remaining order={details?.get(id)} loading={detailsLoading} /></span>
        {!disabled && <button type="button" aria-label={`Bỏ đơn ${order?.code ?? ""}`.trim()} title="Bỏ đơn" onClick={() => onToggle(id, false)}><InterfaceIcon name="close" /></button>}</div>;
    })}
    {!disabled && <div ref={root} className={`${purchaseStyles.finder} ${purchaseStyles.supplierFinder}`} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <InterfaceIcon name="search" />
      <input type="search" aria-label="Tìm đơn đặt hàng" placeholder="Tìm đơn theo mã hoặc khách hàng" maxLength={100} value={term} onFocus={() => setOpen(true)} onChange={(event) => { setTerm(event.target.value); setOpen(true); }} />
      {open && <div className={purchaseStyles.finderList}>
        {remote.loading ? <p className={purchaseStyles.empty}>Đang tìm…</p> : remote.error ? <p className={purchaseStyles.empty} role="alert">{remote.error}</p> : <>
          {found.map((row) => planOf.has(row.id) ? <div key={row.id} className={purchaseStyles.empty} aria-disabled="true"><span>{row.code}{row.walkInCustomer ? " · Khách lẻ" : row.customerName ? ` · ${row.customerName}` : ""}</span> <small>Đã có kế hoạch <Link href={planHref(planOf.get(row.id)!)} target="_blank">{planOf.get(row.id)}</Link></small></div> : <button key={row.id} type="button" onClick={() => pick(row)}><span>{row.code}{row.walkInCustomer ? " · Khách lẻ" : row.customerName ? ` · ${row.customerName}` : ""}</span><small>{row.pickupAt ? `hẹn ${viDateTime(row.pickupAt)}` : ""}</small></button>)}
          {!found.length && <p className={purchaseStyles.empty}>Không có đơn đặt hàng đang mở phù hợp.</p>}</>}
      </div>}
    </div>}
  </fieldset>;
}
