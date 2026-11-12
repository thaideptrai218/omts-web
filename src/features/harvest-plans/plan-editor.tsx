"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, QuantityStepper, SideRow, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import styles from "./plans.module.css";
import { PLAN, type EligibleRaft, type PlanDraft, type PlanView } from "./contracts";
import { PlanCoverage } from "./plan-coverage";
import { PlanLanePicker } from "./plan-lane-picker";
import { usePlanAccess, type PlanAccess } from "./plan-access";
import { PLANS_PATH, planHref, planStatusLabel } from "./plan-labels";
import { blankFormLine, buildPlanBody, coverage, formLineOf, formOf, laneSelectable, planFormProblem, plannedCages, shortageText, type FormLine, type PlanForm } from "./plan-logic";
import { useOrderNeeds } from "./plan-order-needs";
import { PlanOrderPicker } from "./plan-order-picker";
import { errorText, planRepository, problemText } from "./repository";

type Start = { plan?: PlanView; copy?: PlanView; drafts: PlanDraft[] };

/**
 * Create a harvest plan, or change one that is not finished (Owner). `orderIds` starts a new plan for those orders: they are linked and the pickup time of the
 * first one is the planned time. A line is a zone, a raft of it (only rafts that can be harvested are offered, each with the product it farms; with orders linked, only
 * those farming a product the orders still need, with a free lane) and its lanes. The side column sets what the orders still need of each product against the
 * cages the lines expect; a plan that is already given out only lets the lines without a lot and without a skipped lane change.
 */
export function PlanEditorPage({ id, copyFrom, orderIds = [] }: { id?: string; copyFrom?: string; orderIds?: readonly string[] }) {
  const access = usePlanAccess(), orderKey = orderIds.join(",");
  const remote = useRemote<Start>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<Start>> => {
    if (id || copyFrom) {
      const result = await planRepository.detail((id ?? copyFrom)!, signal);
      return result.status === "success" ? { status: "success", data: id ? { plan: result.data, drafts: [] } : { copy: result.data, drafts: [] } } : result;
    }
    const drafts: PlanDraft[] = [];
    for (const orderId of orderKey ? orderKey.split(",") : []) {
      const result = await planRepository.orderDraft(orderId, signal);
      if (result.status !== "success") return result;
      drafts.push(result.data);
    }
    return { status: "success", data: { drafts } };
  }, [id, copyFrom, orderKey]));
  const rafts = useRemote<EligibleRaft[]>(useCallback((signal: AbortSignal) => planRepository.eligibleRafts(undefined, signal), []));
  if (!(id ? access.edit : access.create)) return <ListStateMessage>Bạn không có quyền lập hoặc sửa kế hoạch thu hoạch.</ListStateMessage>;
  if (remote.loading || rafts.loading) return <Skeleton />;
  const failure = remote.error ?? rafts.error;
  if (failure || !remote.data || !rafts.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { remote.reload(); rafts.reload(); }} retryLabel="Tải lại" />;
  const { plan } = remote.data;
  if (plan && (!plan.allowedActions.includes("Edit") || plan.statusId === PLAN.completed || plan.statusId === PLAN.cancelled)) return <ListStateMessage>Kế hoạch {plan.code} ở trạng thái {planStatusLabel[plan.statusId]} nên không sửa được.</ListStateMessage>;
  return <Editor access={access} start={remote.data} eligible={rafts.data} />;
}

function initialForm(start: Start): PlanForm {
  if (start.plan) return formOf(start.plan, vnLocal(start.plan.plannedAt));
  // A copy keeps the rafts and the lanes; the code, the orders, the time and everything done on the original start over.
  if (start.copy) return { ...formOf(start.copy, nowLocal()), code: "", orderIds: [], rowVersion: undefined, lines: start.copy.lines.map((line) => ({ ...formLineOf(line, false), id: undefined })) };
  const first = start.drafts[0];
  return { code: "", plannedAt: first?.plannedAt ? vnLocal(first.plannedAt) : nowLocal(), note: "", orderIds: start.drafts.map((draft) => draft.salesOrder.id), lines: [] };
}

function Editor({ access, start, eligible }: { access: PlanAccess; start: Start; eligible: EligibleRaft[] }) {
  const router = useRouter(), { notify } = useToast(), confirmation = useActionDialog(), plan = start.plan, { identity } = useApiWorkspace();
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined); // Owner-only read: undefined for others, so cages are not turned into kg.
  const [form, setForm] = useState<PlanForm>(() => initialForm(start));
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const givenOut = !!plan && plan.statusId !== PLAN.draft;
  /** The rafts that can be chosen, with the rafts of the lines already on the plan (they may have stopped being eligible, e.g. their lot is recorded). */
  const catalog = useMemo(() => {
    const byId = new Map(eligible.map((raft) => [raft.raftId, raft]));
    for (const line of plan?.lines ?? []) if (!byId.has(line.raftId)) byId.set(line.raftId, { raftId: line.raftId, raftCode: line.raftCode, zone: line.zone, product: line.expectedProduct ?? null, lanes: line.lanes.map((lane) => ({ laneId: lane.laneId, laneNumber: lane.laneNumber, state: "InAnotherPlan" as const, planCode: plan?.code })) });
    return [...byId.values()];
  }, [eligible, plan]);
  const raftOf = (raftId: string) => catalog.find((raft) => raft.raftId === raftId);
  const productOf = (raftId: string) => raftOf(raftId)?.product?.id;
  const orders = useOrderNeeds(form.orderIds);
  const rows = useMemo(() => coverage(orders.needs, plannedCages(form.lines, (raftId) => catalog.find((raft) => raft.raftId === raftId)?.product?.id), kgPerCage), [orders.needs, form.lines, catalog, kgPerCage]);
  /**
   * With orders linked, only the rafts whose cycle farms a product the orders still need and that have a lane this plan can take are offered; the raft already on a
   * line stays so the line still reads. While the orders load nothing is offered; when they cannot be read, every raft is (the side block says so).
   */
  const linked = form.orderIds.length > 0 && !orders.error, wanted = useMemo(() => new Set(rows.map((row) => row.productId)), [rows]);
  const offered = (raft: EligibleRaft, onLine: boolean) => !linked || onLine
    || !orders.loading && !!raft.product && wanted.has(raft.product.id) && raft.lanes.some((lane) => laneSelectable(lane, plan?.code, []));
  const onLines = new Set(form.lines.map((line) => line.raftId));
  const zones = [...new Map(catalog.filter((raft) => offered(raft, onLines.has(raft.raftId)) || form.lines.some((line) => line.zoneId === raft.zone.id)).map((raft) => [raft.zone.id, raft.zone])).values()].sort((a, b) => a.code.localeCompare(b.code, "vi"));

  const patch = (change: Partial<PlanForm>) => { setForm((current) => ({ ...current, ...change })); setError(undefined); };
  const patchLine = (key: string, change: Partial<FormLine>) => patch({ lines: form.lines.map((line) => line.key === key ? { ...line, ...change } : line) });
  const addLine = () => patch({ lines: [...form.lines, blankFormLine(form.lines.at(-1)?.zoneId ?? (zones.length === 1 ? zones[0].id : ""))] });
  /** A new raft starts with no lanes; its cages start from what the orders still lack of its product after the other lines (the user can overwrite it). */
  function pickRaft(line: FormLine, raftId: string) {
    const product = productOf(raftId);
    const lacking = product ? coverage(orders.needs, plannedCages(form.lines, productOf, line.key), kgPerCage).find((row) => row.productId === product)?.cagesShort : 0;
    patchLine(line.key, { raftId, laneNumbers: [], ...(lacking ? { cages: String(lacking) } : {}) });
  }

  async function save(assign: boolean): Promise<void> {
    if (pending) return;
    const problem = planFormProblem(form);
    if (problem) { setError(problem); return; }
    const lacking = shortageText(rows);
    if (lacking && !(await confirmation.confirm(`KHT còn thiếu ${lacking} so với đơn đặt hàng. Vẫn ${assign ? "lưu và giao QLV" : "lưu"}?`))) return;
    setPending(true); setError(undefined);
    const body = buildPlanBody(form);
    const result = plan ? await planRepository.update(plan.id, body) : await planRepository.create(body);
    if (result.status !== "success") { setPending(false); setError(problemText(result)); return; }
    const saved = result.data;
    if (assign) {
      const given = await planRepository.assign(saved.id, saved.rowVersion);
      if (given.status !== "success") {
        setPending(false);
        notify({ tone: "danger", title: `Đã lưu ${saved.code} nhưng chưa giao được: ${errorText(given) ?? "không rõ lỗi"}` });
        router.push(planHref(saved.code));
        return;
      }
    }
    setPending(false);
    notify({ tone: "success", title: assign ? `Đã lưu và giao ${saved.code} cho quản lý vùng.` : `Đã lưu kế hoạch thu hoạch ${saved.code}.` });
    router.push(planHref(saved.code));
  }

  const title = plan ? `Sửa kế hoạch thu hoạch ${plan.code}` : "Lập kế hoạch thu hoạch";
  const sourceNote = start.copy ? `Sao chép từ kế hoạch ${start.copy.code}; kiểm tra lại thời gian, bè và luống.` : !plan && start.drafts.length ? `Lập từ đơn đặt hàng ${start.drafts.map((draft) => draft.salesOrder.code).join(", ")}: thêm dòng bè rồi chọn luống thu hoạch.` : undefined;
  const tools = <Button className="w-auto" variant="secondary" onClick={addLine}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm dòng bè</Button>;
  return <><EditorFrame title={title} backHref={PLANS_PATH} source={sourceNote} tools={tools}>
    <div className={purchaseStyles.editorBody}>
      <div className={purchaseStyles.linesPanel}>
        <table className={purchaseStyles.lines}><thead><tr>
          <th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th className={styles.selectCol}>Vùng</th><th className={styles.selectCol}>Bè</th><th>Luống dự tính</th><th className={purchaseStyles.num}>Lồng dự kiến</th><th>Ghi chú</th>
        </tr></thead><tbody>{form.lines.map((line, index) => {
          const position = index + 1, off = line.locked || pending, raft = raftOf(line.raftId);
          const taken = new Set(form.lines.filter((other) => other.key !== line.key).map((other) => other.raftId));
          const options = catalog.filter((row) => row.zone.id === line.zoneId && !taken.has(row.raftId) && offered(row, row.raftId === line.raftId));
          return <tr key={line.key}>
            <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" disabled={off} onClick={() => patch({ lines: form.lines.filter((other) => other.key !== line.key) })}><InterfaceIcon name="trash" /></button></td>
            <td className={purchaseStyles.narrow}>{position}</td>
            <td><SelectBox aria-label={`Vùng dòng ${position}`} className={purchaseStyles.cellSelect} value={line.zoneId} disabled={off} onChange={(event) => patchLine(line.key, { zoneId: event.target.value, raftId: "", laneNumbers: [] })}>
              <option value="">Chọn vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></td>
            <td><SelectBox aria-label={`Bè dòng ${position}`} className={purchaseStyles.cellSelect} value={line.raftId} disabled={off || !line.zoneId} onChange={(event) => pickRaft(line, event.target.value)}>
              <option value="">{!line.zoneId ? "Chọn vùng trước" : linked && orders.loading ? "Đang tải đơn hàng…" : "Chọn bè"}</option>
              {options.map((row) => <option key={row.raftId} value={row.raftId}>{row.raftCode}{row.product ? ` · ${row.product.name}` : ""}</option>)}</SelectBox>
              {raft && <span className={purchaseStyles.sub}>{raft.product ? `${raft.product.name} (${raft.product.code})` : "Chưa có sản phẩm"}</span>}
              {line.locked && <span className={purchaseStyles.sub}>Đã có lô hoặc luống không thu</span>}</td>
            <td>{raft ? line.locked ? <span>{line.laneNumbers.map((lane) => `Luống ${lane}`).join(", ")}</span>
              : <PlanLanePicker lanes={raft.lanes} ownPlanCode={plan?.code} label={`Luống dòng ${position}`} value={line.laneNumbers} disabled={off} onChange={(laneNumbers) => patchLine(line.key, { laneNumbers })} />
              : <span className={purchaseStyles.sub}>Chọn bè để chọn luống</span>}</td>
            <td className={purchaseStyles.num}><QuantityStepper label={`lồng dự kiến dòng ${position}`} value={line.cages} onChange={(cages) => patchLine(line.key, { cages: cages.replace(/[.,].*$/, "") })} /></td>
            <td><input className={purchaseStyles.lotInput} aria-label={`Ghi chú dòng ${position}`} placeholder="Ghi chú..." maxLength={500} disabled={off} value={line.note} onChange={(event) => patchLine(line.key, { note: event.target.value })} /></td>
          </tr>;
        })}</tbody></table>
        {!form.lines.length && <div className={purchaseStyles.emptyLines}><InterfaceIcon name="raft" /><strong>Chưa có dòng nào</strong><span>Bấm Thêm dòng bè để chọn vùng, bè và luống thu hoạch.</span></div>}
      </div>
      <aside className={purchaseStyles.side} aria-label="Thông tin kế hoạch thu hoạch">
        <div className={purchaseStyles.sideScroll}>
          <SideRow label="Mã kế hoạch"><input aria-label="Mã kế hoạch" maxLength={30} placeholder="Mã tự động" title="Để trống để hệ thống tự cấp mã" value={form.code} disabled={givenOut} onChange={(event) => patch({ code: event.target.value.replace(/\s/g, "") })} /></SideRow>
          <SideRow label="Thời gian dự kiến *"><DatePickerField label="Thời gian dự kiến" withTime value={form.plannedAt} onChange={(plannedAt) => patch({ plannedAt })} /></SideRow>
          <SideRow label="Trạng thái">{planStatusLabel[plan?.statusId ?? PLAN.draft]}</SideRow>
          {plan?.assignedAt && <SideRow label="Giao lúc">{viDateTime(plan.assignedAt)}</SideRow>}
          <PlanOrderPicker value={form.orderIds} known={[...(plan?.orders ?? []), ...start.drafts.map((draft) => draft.salesOrder)]} details={orders.byOrder} detailsLoading={orders.loading} disabled={pending} onToggle={(orderId, picked) => patch({ orderIds: picked ? [...form.orderIds, orderId] : form.orderIds.filter((value) => value !== orderId) })} />
          {form.orderIds.length > 0 && <PlanCoverage rows={rows} loading={orders.loading} error={orders.error} onRetry={orders.reload} />}
          <textarea className={purchaseStyles.sideNote} aria-label="Ghi chú" placeholder="Ghi chú" maxLength={1000} value={form.note} onChange={(event) => patch({ note: event.target.value })} />
          <ErrorNotice error={error} />
          {!access.owner && <p className={purchaseStyles.sub}>Chỉ Chủ hợp tác xã lập và giao kế hoạch thu hoạch.</p>}
          {plan && <Link className={purchaseStyles.sub} href={planHref(plan.code)}>Xem kế hoạch</Link>}
        </div>
        <div className={purchaseStyles.sideActions}>
          {givenOut ? <Button disabled={pending} onClick={() => void save(false)}>Lưu</Button> : <>
            <Button variant="secondary" disabled={pending} onClick={() => void save(false)}>Lưu tạm</Button>
            <Button disabled={pending} onClick={() => void save(true)}>Lưu &amp; Giao QLV</Button>
          </>}
        </div>
      </aside>
    </div>
  </EditorFrame>{confirmation.dialog}</>;
}
