"use client";
import { useCallback, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { EditorFrame, RecordFormFooter, useAllowed } from "@/features/cultivation-api/records-shared";
import { fmt } from "@/features/purchase-documents/document-parts";
import { ErrorNotice, Skeleton, operationError, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import type { CageRow, CageSheet } from "./cage-contracts";
import { CageNextInput } from "./cage-next-input";
import { CageSheetTable } from "./cage-sheet-table";
import { CageSheetTotals, CageTraderStatus } from "./cage-sheet-summary";
import { cageErrorText, sumKg } from "./cage-weighing-math";
import { LOT } from "./contracts";
import { lotRepository } from "./repository";

export { weighComparison } from "./cage-weighing-math";
type Lot = z.infer<typeof harvestDetail>;

/**
 * "Cân thực tế" at the port, inline in the opened row: the weighing sheet of the lot. The kg are typed cage by cage (Enter adds the next one and keeps the focus) and every cage is saved at once;
 * the kg of the lot are the sum of the cages only after "Hoàn tất". A closed lot, or an account without the Edit right in the zone, sees the same sheet read only.
 * An add carries a `clientOperationId`; when its answer is lost, sending the same text again reuses it, so a cage is never weighed twice.
 */
export function LotWeighForm({ lot, zoneId, onClose, onSaved }: { lot: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const { notify } = useToast(), confirmation = useActionDialog(), allowed = useAllowed("harvest", zoneId);
  const remote = useRemote(useCallback((signal: AbortSignal) => lotRepository.cages(lot.id, zoneId, signal), [lot.id, zoneId]));
  const editor = useOperationEditor(onClose, false);
  const [fresh, setFresh] = useState<CageSheet>(), [error, setError] = useState<string>(), [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState<{ text: string; operationId: string }>();
  const sheet = fresh ?? remote.data;

  /** One write of the sheet: shows its refusal in Vietnamese and keeps the answer (the whole sheet) when it works. */
  async function send<T>(action: "cage" | "complete", call: () => Promise<WorkspaceResult<T>>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true); setError(undefined);
    let result: WorkspaceResult<T>;
    try { result = await call(); } catch { result = { status: "error", httpStatus: 0, uncertain: true }; }
    setBusy(false);
    if (result.status === "success") return result.data;
    setError(cageErrorText(result, action) ?? (result.httpStatus === 0 ? "Chưa gửi được, mạng đang chập chờn. Số vừa nhập vẫn còn, bấm lại để gửi." : operationError(result)));
    return undefined;
  }

  async function add(kg: number, productId: string | undefined, text: string) {
    // The same text sent again after an answer that did not arrive keeps its operation id, so the API weighs it once.
    const operationId = retry?.text === text ? retry.operationId : crypto.randomUUID();
    setRetry({ text, operationId });
    const next = await send("cage", () => lotRepository.addCage(lot.id, zoneId, { kg, ...(productId ? { productId } : {}), clientOperationId: operationId }));
    if (!next) return false;
    setFresh(next); setRetry(undefined);
    return true;
  }
  async function update(cage: CageRow, kg: number, productId: string | undefined) {
    const next = await send("cage", () => lotRepository.updateCage(lot.id, zoneId, { cageId: cage.id, kg, ...(productId ? { productId } : {}) }));
    if (next) setFresh(next);
    return Boolean(next);
  }
  async function remove(cage: CageRow) {
    if (!await confirmation.confirm(`Xóa lồng số ${cage.number} (${fmt(cage.kg)} kg) khỏi phiếu cân? Số lồng này sẽ không được dùng lại.`)) return;
    const next = await send("cage", () => lotRepository.removeCage(lot.id, zoneId, cage.id));
    if (next) setFresh(next);
  }
  async function complete(current: CageSheet) {
    const missing = current.harvestedCages - current.cages.length;
    if (missing > 0 && !await confirmation.confirm(`Mới cân ${fmt(current.cages.length)} trên ${fmt(current.harvestedCages)} lồng đã thu. Vẫn hoàn tất với số kg này?`)) return;
    const saved = await send("complete", () => lotRepository.weigh(lot.id, zoneId, { rowVersion: current.rowVersion }));
    if (!saved) return;
    notify({ tone: "success", title: `Đã hoàn tất cân lô ${lot.lotCode}: ${fmt(sumKg(current.cages.map((cage) => cage.kg)))} kg.` });
    onSaved();
  }

  const title = `Cân thực tế lô ${lot.lotCode}`;
  if (remote.loading) return <EditorFrame inline title={title} editor={editor}><Skeleton /></EditorFrame>;
  if (!sheet) return <EditorFrame inline title={title} editor={editor}><ListStateMessage error={remote.error ?? "Không tải được phiếu cân."} onRetry={remote.reload} retryLabel="Tải lại phiếu cân" /><RecordFormFooter><Button type="button" variant="secondary" onClick={onClose}>Đóng</Button></RecordFormFooter></EditorFrame>;

  const closed = sheet.statusId === LOT.closed, editable = sheet.canEdit && allowed("Edit") && !closed;
  const total = sumKg(sheet.cages.map((cage) => cage.kg)), lines = lot.productLines ?? [];
  return <EditorFrame inline title={title} editor={editor}>
    {confirmation.dialog}
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 rounded-control border border-border bg-surface-subtle p-3 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Lô cần cân">
        <div><dt className="text-xs text-text-muted">Mã lô</dt><dd className="font-mono">{lot.lotCode}</dd></div>
        <div><dt className="text-xs text-text-muted">Bè</dt><dd>{lot.raftCode}</dd></div>
        <div><dt className="text-xs text-text-muted">Sản phẩm</dt><dd>{lines.length ? lines.map((line) => line.productName).join(", ") : "—"}</dd></div>
        <div><dt className="text-xs text-text-muted">Số lồng mang lên</dt><dd className="tabular-nums">{fmt(sheet.harvestedCages || lot.cageCount)} lồng <span className="block text-xs text-text-muted">quy đổi ≈ {fmt(sheet.estimatedKg || lot.estimatedKg)} kg, chỉ tham khảo</span></dd></div>
      </dl>
      {!editable && <p role="status" className="rounded-control border border-border bg-surface-subtle p-3 text-sm">{closed ? "Lô đã đóng, phiếu cân chỉ để xem." : "Bạn chỉ xem được phiếu cân của lô này."}</p>}
      {editable && <CageNextInput sheet={sheet} pending={busy} onAdd={add} />}
      <ErrorNotice error={error} />
      <CageSheetTable sheet={sheet} editable={editable} pending={busy} onUpdate={update} onRemove={(cage) => void remove(cage)} />
      <CageSheetTotals sheet={sheet} />
      <CageTraderStatus sheet={sheet} />
      {sheet.weighedAt && !sheet.needsCompleting && sheet.weighedKg != null && <p role="status" className="text-sm text-text-muted">Đã hoàn tất cân: <strong>{fmt(sheet.weighedKg)} kg</strong>.</p>}
      {sheet.needsCompleting && sheet.weighedKg != null && <p role="status" className="text-sm text-warning">Phiếu cân đã đổi so với lần hoàn tất trước ({fmt(sheet.weighedKg)} kg). Bấm Hoàn tất để cập nhật số kg của lô.</p>}
    </div>
    <RecordFormFooter>
      <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Đóng</Button>
      {editable && <Button type="button" isPending={busy} disabled={busy || !sheet.needsCompleting || !sheet.cages.length} onClick={() => void complete(sheet)}>Hoàn tất · {fmt(total)} kg</Button>}
    </RecordFormFooter>
  </EditorFrame>;
}
