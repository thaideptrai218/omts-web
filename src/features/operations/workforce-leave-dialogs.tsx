"use client";
import styles from "./workforce-screen.module.css";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Note, Paging, Select, Skeleton, operationError, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { ReviewLeave } from "./workforce-review-dialog";
import { isPending, requestStatus, requestTypeLabel, requestWhat, type EmployeeRequest } from "./workforce-request-labels";
import { workforceRepository as repository } from "./workforce-shared";

export { ReviewLeave };
const PAGE_SIZE = 10;
/** One call per request, one after another; a batch is limited like the attendance batches. */
const MAX_BATCH = 30;
type Outcome = { id: string; name: string; ok: boolean; message: string };

/**
 * Owner-only list of employee requests (leave, missed check-in, missed check-out), filtered by type. Pending ones can be answered one by one,
 * or ticked and approved / rejected together (a rejection needs a reason, the same for all ticked requests).
 */
export function OwnerLeavesDialog({ onClose, onChanged }: { onClose(): void; onChanged?(): void }) {
  const rows = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("leaves", {}, z.array(c.leaveSchema), signal), []));
  const [selected, setSelected] = useState<EmployeeRequest>(), [page, setPage] = useState(1), [type, setType] = useState<"" | EmployeeRequest["type"]>("");
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set()), [rejecting, setRejecting] = useState(false), [reason, setReason] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[]>(), [problem, setProblem] = useState<string>();
  const editor = useOperationEditor(onClose, false);
  const filtered = rows.data?.filter((row) => !type || row.type === type);
  const currentPage = Math.min(page, Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE)));
  const visibleRows = filtered?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pendingRows = filtered?.filter(isPending) ?? [];
  const chosen = pendingRows.filter((row) => ticked.has(row.id));

  async function review(approved: boolean) {
    if (!chosen.length || chosen.length > MAX_BATCH) return;
    if (!approved && !reason.trim()) return setProblem("Nhập lý do từ chối (dùng chung cho các yêu cầu đã chọn).");
    setProblem(undefined);
    const result = await editor.submit(`${approved ? "Duyệt" : "Từ chối"} ${chosen.length} yêu cầu đã chọn? ${approved ? "Giờ vào, giờ ra đã xin bù sẽ được ghi vào chấm công." : "Không ghi gì vào chấm công."}`, async () => {
      const done: Outcome[] = [];
      for (const request of chosen) {
        const payload = c.reviewLeaveSchema.safeParse({ approved, response: approved ? "" : reason.trim(), rowVersion: request.rowVersion });
        const answer = payload.success ? await repository.write("review-leave", payload.data, c.leaveSchema, request.id) : undefined;
        done.push({ id: request.id, name: `${request.employeeName} · ${requestTypeLabel[request.type]}`, ok: answer?.status === "success",
          message: answer?.status === "success" ? (approved ? "Đã duyệt." : "Đã từ chối.") : answer ? operationError(answer) : "Yêu cầu không hợp lệ." });
      }
      return { status: "success" as const, data: done };
    });
    if (!result) return;
    setOutcomes(result);
    setTicked(new Set(result.filter((item) => !item.ok).map((item) => item.id)));
    setRejecting(false); setReason("");
    rows.reload(); onChanged?.();
  }

  return (
    <Dialog open size="lg" title="Duyệt yêu cầu của nhân viên" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
      {editor.dialog}
      <ErrorNotice error={problem ?? rows.error ?? editor.mutation.error} />
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Loại yêu cầu" value={type} onChange={(e) => { setType(e.target.value as typeof type); setPage(1); setTicked(new Set()); }}>
          <option value="">Tất cả</option>
          {Object.entries(requestTypeLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <Button variant="secondary" className="w-auto" disabled={rows.loading || editor.pending} onClick={rows.reload}>Tải lại yêu cầu</Button>
      </div>
      {chosen.length > 0 && <div role="group" aria-label="Duyệt hàng loạt" className="my-3 flex flex-wrap items-center gap-3 rounded-control border border-border p-3">
        <strong>Đã chọn {chosen.length} yêu cầu{chosen.length > MAX_BATCH ? ` (tối đa ${MAX_BATCH})` : ""}</strong>
        <Button className="w-auto" disabled={editor.disabled || chosen.length > MAX_BATCH} onClick={() => void review(true)}>Duyệt đã chọn</Button>
        <Button className="w-auto" variant="secondary" disabled={editor.disabled || chosen.length > MAX_BATCH} onClick={() => setRejecting((value) => !value)}>Từ chối đã chọn</Button>
        {rejecting && <div className="grid w-full gap-2">
          <Note label="Lý do từ chối *" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button className="w-auto" variant="danger" disabled={editor.disabled} isPending={editor.pending} onClick={() => void review(false)}>Xác nhận từ chối</Button>
        </div>}
      </div>}
      {outcomes && <div className={styles.bulkResults} role="status">
        <strong>Kết quả: {outcomes.filter((item) => item.ok).length}/{outcomes.length} yêu cầu đã xử lý</strong>
        <ul>{outcomes.map((item) => <li key={item.id} className={item.ok ? undefined : styles.bulkFail}>{item.name}: {item.message}</li>)}</ul>
      </div>}
      {rows.loading ? <Skeleton /> : filtered && (
        <DataTable headings={["Chọn", "Nhân viên", "Loại", "Nội dung", "Lý do", "Trạng thái", "Phản hồi", "Thao tác"]} empty={!filtered.length}>
          {visibleRows?.map((r) => (
            <tr key={r.id}>
              <td>{isPending(r) && <input type="checkbox" aria-label={`Chọn yêu cầu của ${r.employeeName}`} checked={ticked.has(r.id)} disabled={editor.disabled}
                onChange={(e) => setTicked((current) => { const next = new Set(current); if (e.target.checked) next.add(r.id); else next.delete(r.id); return next; })} />}</td>
              <td>{r.employeeName}</td>
              <td>{requestTypeLabel[r.type]}</td>
              <td>{requestWhat(r)}</td>
              <td>{r.reason}</td>
              <td>{requestStatus(r)}</td>
              <td>{r.response || "—"}</td>
              <td>{isPending(r) && <button className="text-primary underline" disabled={editor.disabled} onClick={() => setSelected(r)}>Phản hồi</button>}</td>
            </tr>
          ))}
        </DataTable>
      )}
      {filtered && <div className={styles.paging}><Paging page={currentPage} total={filtered.length} pageSize={PAGE_SIZE} disabled={rows.loading} onChange={setPage} /></div>}
      {selected && <ReviewLeave key={selected.id} record={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); rows.reload(); onChanged?.(); }} />}
      <Button className="mt-4" variant="secondary" onClick={onClose}>Đóng</Button>
    </Dialog>
  );
}
