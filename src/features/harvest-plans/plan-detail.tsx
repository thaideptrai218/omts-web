"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import docStyles from "@/features/purchase-documents/purchases.module.css";
import { productHref } from "@/features/products/product-helpers";
import { ProductSizeChip } from "@/features/products/product-size";
import { LotLink } from "@/features/products/lot-link";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { PLAN, type PlanAction, type PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PLANS_PATH, PlanStatus } from "./plan-labels";
import { planNextStepHint, planTotals } from "./plan-logic";
import { PlanLineActions } from "./plan-line-actions";
import { PlanStaffingTab } from "./plan-staffing-tab";
import styles from "./plans.module.css";
import { errorText, planRepository, type Result } from "./repository";

type Tab = "info" | "staffing";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "staffing" as const, label: "Nhân công" }];
const dash = (value: string | null | undefined) => value || "—";
const zoneCodes = (zones: readonly { code: string }[]) => zones.map((zone) => zone.code).join(", ") || "—";

/** The row opened under the list: the plan with its lines (one raft each), and the buttons the API allows now, and under "Nhân công" the employees chosen for each line. */
export function PlanDetailPanel({ id, access, onChanged }: { id: string; access: PlanAccess; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được kế hoạch thu hoạch."} onRetry={remote.reload} retryLabel="Tải lại kế hoạch" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${remote.data.code}`}>
    <Subtabs<Tab> label="Nội dung kế hoạch thu hoạch" tabs={tabs} value={tab} onChange={setTab} />
    {tab === "info" ? <Body key={remote.data.rowVersion} plan={remote.data} access={access} onChanged={() => { remote.reload(); onChanged(); }} /> : <PlanStaffingTab key={remote.data.rowVersion} plan={remote.data} access={access} />}
  </section>;
}

function Body({ plan, access, onChanged }: { plan: PlanView; access: PlanAccess; onChanged(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const can = (action: PlanAction) => plan.allowedActions.includes(action);
  const totals = planTotals(plan.lines);
  const hint = planNextStepHint(plan.statusId, access.owner ? "owner" : "zone");

  async function run(work: () => Promise<Result<unknown>>, done: string) {
    setPending(true); setError(undefined);
    const result = await work();
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: done }); onChanged(); } else setError(errorText(result));
  }
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy kế hoạch thu hoạch ${plan.code}? Nhập lý do hủy.`);
    if (reason) await run(() => planRepository.cancel(plan.id, reason, plan.rowVersion), `Đã hủy kế hoạch thu hoạch ${plan.code}.`);
  }
  async function assign() {
    if (await confirmation.confirm(`Giao kế hoạch ${plan.code} cho quản lý ${plan.zones.length > 1 ? "các vùng" : "vùng"} ${zoneCodes(plan.zones)}? Quản lý vùng sẽ được báo và thu hoạch theo kế hoạch.`)) await run(() => planRepository.assign(plan.id, plan.rowVersion), `Đã giao ${plan.code} cho quản lý vùng.`);
  }
  async function receive() {
    if (await confirmation.confirm(`Nhận kế hoạch thu hoạch ${plan.code}? Sau khi nhận, bạn ghi lô thu hoạch cho từng bè.`)) await run(() => planRepository.receive(plan.id, plan.rowVersion), `Đã nhận kế hoạch ${plan.code}.`);
  }
  async function handOver() {
    if (await confirmation.confirm(`Bàn giao kế hoạch ${plan.code} cho chủ? Chủ hợp tác xã sẽ được báo để kiểm tra và hoàn thành.`)) await run(() => planRepository.handOver(plan.id, plan.rowVersion), `Đã bàn giao ${plan.code} cho chủ.`);
  }
  async function finish() {
    if (await confirmation.confirm(`Hoàn thành kế hoạch ${plan.code}?`)) await run(() => planRepository.finish(plan.id, plan.rowVersion), `Đã hoàn thành ${plan.code}.`);
  }

  return <div className={listStyles.tabBody}>{confirmation.dialog}
    <header className={docStyles.head}><div><h3>{plan.code}</h3><PlanStatus statusId={plan.statusId} /></div></header>
    {hint && <p className="text-sm text-text-muted" data-testid="plan-next-step">{hint}</p>}
    <div className={`${docStyles.headFacts} ${styles.planFacts}`}>
      <div><span>Thời gian dự kiến:</span><strong>{viDateTime(plan.plannedAt)}</strong></div>
      <div><span>Vùng:</span>{plan.zones.length ? <strong className="flex flex-wrap gap-x-2">{plan.zones.map((zone) => <Link key={zone.id} className={docStyles.link} href={farmingReferenceHref("zone", { recordId: zone.id, search: zone.code })}>{zone.code}</Link>)}</strong> : <strong>—</strong>}</div>
      <div><span>Đơn đặt hàng:</span>{plan.orders.length ? <strong className="flex flex-wrap gap-x-2">{plan.orders.map((order) => <Link key={order.id} className={docStyles.link} href={orderHref(order.code)}>{order.code}</Link>)}</strong> : <strong>—</strong>}</div>
      <div><span>Người tạo:</span><strong>{dash(plan.createdBy?.name)}</strong></div>
      <div><span>Giao lúc:</span><strong>{plan.assignedAt ? viDateTime(plan.assignedAt) : "—"}</strong></div>
      {plan.statusId === PLAN.cancelled
        ? <><div><span>Hủy lúc:</span><strong>{plan.cancelledAt ? viDateTime(plan.cancelledAt) : "—"}</strong></div>
          <div><span>Lý do hủy:</span><span className={docStyles.danger}>{dash(plan.cancelReason)}</span></div></>
        : <div><span>Hoàn thành lúc:</span><strong>{plan.completedAt ? viDateTime(plan.completedAt) : "—"}</strong></div>}
    </div>
    <div className={docStyles.innerScroll}><table className={docStyles.inner} aria-label="Dòng của kế hoạch thu hoạch"><thead><tr><th>Vùng</th><th>Bè</th><th>Sản phẩm</th><th className={docStyles.num}>Lồng dự kiến</th><th>Lô thu hoạch</th><th /></tr></thead>
      <tbody>{plan.lines.map((line) => <tr key={line.id}>
        <td>{line.zone.code}</td>
        <td><Link className={docStyles.link} href={farmingReferenceHref("raft", { zoneId: line.zone.id, recordId: line.raftId, search: line.raftCode })}>{line.raftCode}</Link>{line.note && <span className={docStyles.sub}>{line.note}</span>}</td>
        <td>{line.expectedProduct ? <><Link className={docStyles.link} href={productHref(line.expectedProduct.code)}>{line.expectedProduct.name} ({line.expectedProduct.code})</Link> <ProductSizeChip size={line.expectedProduct} /></> : "—"}</td>
        <td className={docStyles.num}>{line.expectedCageCount == null ? "—" : line.expectedCageCount.toLocaleString("vi-VN")}</td>
        <td>{line.lot ? <LotLink className={docStyles.link} code={line.lot.lotCode} /> : "—"}</td>
        <td><PlanLineActions plan={plan} line={line} access={access} onChanged={onChanged} /></td>
      </tr>)}
      {!plan.lines.length && <tr><td colSpan={6} className={docStyles.empty}>Kế hoạch chưa có dòng nào.</td></tr>}</tbody></table></div>
    <div className={docStyles.foot}>
      <textarea className={docStyles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly value={plan.note ?? ""} />
      <div className={docStyles.sums}>
        <div><span>Số bè</span><span>{totals.rafts}</span></div>
        <div><span>Lồng dự kiến</span><span>{totals.cages == null ? "—" : totals.cages.toLocaleString("vi-VN")}</span></div>
        <div><span>Đã thu</span><span>{plan.progress.linesDone}/{plan.progress.lines} bè</span></div>
      </div>
    </div>
    <ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>
        {access.create && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => router.push(`${PLANS_PATH}/new?copy=${plan.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
        {can("Cancel") && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy kế hoạch</Button>}
      </div>
      <div>
        {can("Edit") && access.edit && <Button className="w-auto" disabled={pending} onClick={() => router.push(`${PLANS_PATH}/${plan.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
        {can("Assign") && access.edit && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void assign()}><InterfaceIcon name="check" className="size-4" />Giao QLV</Button>}
        {can("Receive") && access.harvest && <Button className="w-auto" disabled={pending} onClick={() => void receive()}><InterfaceIcon name="check" className="size-4" />Nhận kế hoạch</Button>}
        {can("HandOver") && access.harvest && <Button className="w-auto" disabled={pending} onClick={() => void handOver()}><InterfaceIcon name="check" className="size-4" />Bàn giao cho chủ</Button>}
        {can("Finish") && access.edit && <Button className="w-auto" disabled={pending} onClick={() => void finish()}><InterfaceIcon name="check" className="size-4" />Hoàn thành</Button>}
      </div>
    </footer>
  </div>;
}
