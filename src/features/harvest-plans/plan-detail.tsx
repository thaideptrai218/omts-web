"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { LotLink } from "@/features/products/lot-link";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { PLAN, type PlanAction, type PlanLine, type PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PLANS_PATH, PlanStatus } from "./plan-labels";
import { laneChip, planTotals } from "./plan-logic";
import { PlanLineActions } from "./plan-line-actions";
import styles from "./plans.module.css";
import { errorText, planRepository, type Result } from "./repository";

const dash = (value: string | null | undefined) => value || "—";
const zoneCodes = (zones: readonly { code: string }[]) => zones.map((zone) => zone.code).join(", ") || "—";

/** The row opened under the list: the plan with its lines and lanes, and the buttons the API allows now. */
export function PlanDetailPanel({ id, access, onChanged }: { id: string; access: PlanAccess; onChanged(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.detail(id, signal), [id]));
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được kế hoạch thu hoạch."} onRetry={remote.reload} retryLabel="Tải lại kế hoạch" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${remote.data.code}`}><Body key={remote.data.rowVersion} plan={remote.data} access={access} onChanged={() => { remote.reload(); onChanged(); }} /></section>;
}

function LaneChips({ plan, line, access, onChanged, setError }: { plan: PlanView; line: PlanLine; access: PlanAccess; onChanged(): void; setError(text: string | undefined): void }) {
  const { notify } = useToast();
  const canUnskip = access.harvest && plan.allowedActions.includes("SkipLane") && !line.lot;
  async function unskip(lane: number) {
    setError(undefined);
    const result = await planRepository.unskipLanes(plan.id, line.id, [lane]);
    if (result.status === "success") { notify({ tone: "success", title: `Đã bỏ đánh dấu không thu luống ${lane}.` }); onChanged(); } else setError(errorText(result));
  }
  return <span className={styles.chips}>{line.lanes.map((lane) => {
    const chip = laneChip(lane);
    return <span key={lane.laneNumber} className={styles.chip} data-state={chip.state} title={chip.title}>
      {chip.state === "Harvested" && chip.lotCode ? <>Luống {lane.laneNumber}: Đã thu · <LotLink code={chip.lotCode} /></> : chip.text}
      {canUnskip && lane.state === "Skipped" && <button type="button" className="ml-1 text-primary underline" aria-label={`Bỏ đánh dấu không thu luống ${lane.laneNumber}`} onClick={() => void unskip(lane.laneNumber)}>Hoàn tác</button>}
    </span>;
  })}</span>;
}

function Body({ plan, access, onChanged }: { plan: PlanView; access: PlanAccess; onChanged(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const can = (action: PlanAction) => plan.allowedActions.includes(action);
  const totals = planTotals(plan.lines);

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
  async function finish() {
    const open = plan.lines.filter((line) => !line.lot).length;
    if (await confirmation.confirm(`Kết thúc kế hoạch ${plan.code}?${open ? ` Còn ${open} dòng chưa có lô thu hoạch; các luống còn lại được để nguyên.` : ""}`)) await run(() => planRepository.finish(plan.id, plan.rowVersion), `Đã kết thúc ${plan.code}.`);
  }

  return <div className={listStyles.tabBody}>{confirmation.dialog}
    <header className={issueStyles.head}><div><h3>{plan.code}</h3><PlanStatus statusId={plan.statusId} /></div></header>
    <div className={issueStyles.headFacts}>
      <div><span>Thời gian dự kiến:</span><strong>{viDateTime(plan.plannedAt)}</strong></div>
      <div><span>Vùng:</span><strong>{zoneCodes(plan.zones)}</strong></div>
      <div><span>Số bè / luống:</span><strong>{totals.rafts} bè · {totals.lanes} luống</strong></div>
      <div><span>Lồng dự kiến:</span><strong>{totals.cages == null ? "—" : totals.cages.toLocaleString("vi-VN")}</strong></div>
      <div><span>Đã thu:</span><strong>{plan.progress.linesDone}/{plan.progress.lines} dòng · {plan.progress.lanesHarvested}/{plan.progress.lanes} luống</strong></div>
      <div><span>Không thu:</span><strong>{plan.progress.lanesSkipped} luống</strong></div>
      <div><span>Người tạo:</span><strong>{dash(plan.createdBy?.name)}</strong></div>
      {plan.assignedAt && <div><span>Giao lúc:</span><strong>{viDateTime(plan.assignedAt)}</strong></div>}
      {plan.completedAt && <div><span>Hoàn thành lúc:</span><strong>{viDateTime(plan.completedAt)}</strong></div>}
      {plan.statusId === PLAN.cancelled && <>
        <div><span>Hủy lúc:</span><strong>{plan.cancelledAt ? viDateTime(plan.cancelledAt) : "—"}</strong></div>
        <div><span>Lý do hủy:</span><span className={issueStyles.danger}>{dash(plan.cancelReason)}</span></div>
      </>}
      <div><span>Đơn đặt hàng:</span>{plan.orders.length ? <strong className="flex flex-wrap gap-x-2">{plan.orders.map((order) => <Link key={order.id} className={issueStyles.link} href={orderHref(order.code)}>{order.code}</Link>)}</strong> : <strong>—</strong>}</div>
    </div>
    <div className={issueStyles.innerScroll}><table className={issueStyles.inner}><thead><tr><th>Vùng</th><th>Bè</th><th>Luống</th><th>Sản phẩm</th><th className={issueStyles.num}>Lồng dự kiến</th><th>Lô thu hoạch</th><th /></tr></thead>
      <tbody>{plan.lines.map((line) => <tr key={line.id}>
        <td>{line.zone.code}</td>
        <td>{line.raftCode}{line.note && <span className={issueStyles.sub}>{line.note}</span>}</td>
        <td><LaneChips plan={plan} line={line} access={access} onChanged={onChanged} setError={setError} /></td>
        <td>{line.expectedProduct ? `${line.expectedProduct.name} (${line.expectedProduct.code})` : "—"}</td>
        <td className={issueStyles.num}>{line.expectedCageCount == null ? "—" : line.expectedCageCount.toLocaleString("vi-VN")}</td>
        <td>{line.lot ? <LotLink className={issueStyles.link} code={line.lot.lotCode} /> : "—"}</td>
        <td><PlanLineActions plan={plan} line={line} access={access} onChanged={onChanged} /></td>
      </tr>)}
      {!plan.lines.length && <tr><td colSpan={7} className={issueStyles.empty}>Kế hoạch chưa có dòng nào.</td></tr>}</tbody></table></div>
    {plan.note && <p className="whitespace-pre-wrap text-sm">{plan.note}</p>}
    <ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>
        {can("Cancel") && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}
        {access.create && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => router.push(`${PLANS_PATH}/new?copy=${plan.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
      </div>
      <div>
        {can("Assign") && access.edit && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void assign()}><InterfaceIcon name="check" className="size-4" />Giao QLV</Button>}
        {can("Finish") && access.edit && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void finish()}><InterfaceIcon name="check" className="size-4" />Kết thúc</Button>}
        {can("Edit") && access.edit && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(`${PLANS_PATH}/${plan.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
      </div>
    </footer>
  </div>;
}
