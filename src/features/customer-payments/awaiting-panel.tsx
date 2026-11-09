"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { control, ErrorNotice, money, operationError, Paging, Skeleton, useRemote } from "@/features/operations/ui";
import { awaiting, confirmed } from "./contracts";
import s from "./payments-screen.module.css";

const repository = createOperationsRepository("customer-payments");
const methods = { Cash: "Tiền mặt", OtherTransfer: "Chuyển khoản", VietQrInvoice: "VietQR" } as const;

/** Tab "Chờ xác nhận" (DEBT-02.2): kế toán xác nhận hoặc hủy các khoản đã ghi nhận, lưu một lần; Chủ HTX nhận một thông báo gộp. */
export function AwaitingPanel({ canEdit }: { canEdit: boolean }) {
  const [page, setPage] = useState(1), [picked, setPicked] = useState<ReadonlySet<string>>(new Set()), [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string>(), [done, setDone] = useState<string>();
  const list = useRemote(useCallback((signal: AbortSignal) => repository.read("awaiting", { page: String(page), pageSize: "20" }, awaiting, signal), [page]));
  const rows = list.data?.page.items ?? [], toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function save(kind: "confirm" | "cancel") {
    setBusy(true); setError(undefined); setDone(undefined);
    const ids = [...picked], body = kind === "confirm" ? { confirm: ids, cancel: [] } : { confirm: [], cancel: ids.map((id) => ({ id, reason: reason.trim() })) };
    const result = await repository.write("confirm", body, confirmed);
    setBusy(false);
    if (result.status !== "success") { setError(operationError(result)); return; }
    setPicked(new Set()); setCancelling(false); setReason(""); setDone(`Đã xác nhận ${result.data.confirmed.length}, đã hủy ${result.data.cancelled.length} khoản.`); list.reload();
  }

  return (
    <section className={s.card} aria-labelledby="await-title">
      <div className={s.head}>
        <h2 id="await-title" className={s.h2}>Khoản chờ xác nhận</h2>
        {list.data && <span className={s.muted}>Tổng {money(list.data.totalAmount)} · {list.data.page.total} khoản</span>}
      </div>
      <ErrorNotice error={list.error ?? error} />
      {done && <p role="status" className={s.ok}>{done}</p>}
      {list.loading ? <Skeleton /> : !rows.length ? <p className={s.empty}>{list.data?.message ? "Không có khoản nào đang chờ xác nhận." : "Không có dữ liệu."}</p> : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th scope="col" className={s.check}><span className="sr-only">Chọn</span></th><th scope="col">Mã</th><th scope="col">Khách hàng</th><th scope="col">Hình thức</th><th scope="col">Ngày</th><th scope="col" className={s.right}>Số tiền</th></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id}>
                  <td className={s.check}><input type="checkbox" aria-label={`Chọn ${p.code}`} disabled={busy || !canEdit} checked={picked.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td className={s.num}><strong>{p.code}</strong><small>{p.kind === "PaidBack" ? "Trả lại khách" : "Khách thanh toán"}</small></td>
                  <td>{p.customer?.name ?? "—"}</td>
                  <td>{methods[p.method]}{p.bankReference && <small>{p.bankReference}</small>}</td>
                  <td className={s.num}>{new Intl.DateTimeFormat("vi-VN").format(new Date(p.paymentDate))}</td>
                  <td className={`${s.right} ${s.num}`}><strong>{money(p.amount)}</strong></td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <Paging page={page} total={list.data?.page.total ?? 0} pageSize={20} disabled={busy} onChange={(p) => { setPicked(new Set()); setPage(p); }} />
          {canEdit ? (
            <div className={s.actions}>
              <Button className="w-auto" isPending={busy && !cancelling} disabled={!picked.size || busy} onClick={() => void save("confirm")}>Xác nhận {picked.size || ""} khoản đã chọn</Button>
              <Button className="w-auto" variant="danger" disabled={!picked.size || busy} onClick={() => setCancelling(true)}>Hủy khoản đã chọn</Button>
            </div>
          ) : <p className={s.hint}>Bạn chỉ có quyền xem các khoản chờ xác nhận.</p>}
        </>
      )}
      {cancelling && (
        <Dialog open title="Hủy các khoản đã chọn" dismissible={!busy} onOpenChange={(open) => { if (!open && !busy) setCancelling(false); }}>
          <label className={s.field}><span>Lý do hủy (bắt buộc, áp dụng cho {picked.size} khoản)</span><textarea className={control} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <ErrorNotice error={error} />
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => setCancelling(false)}>Quay lại</Button>
            <Button className="w-auto" variant="danger" isPending={busy} disabled={!reason.trim()} onClick={() => void save("cancel")}>Hủy khoản đã chọn</Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
