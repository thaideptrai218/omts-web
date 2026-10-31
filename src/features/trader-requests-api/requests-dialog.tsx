"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { displayTime, ErrorNotice, Note, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { readTraderRequests, decideTraderRequest } from "./repository";
import type { TraderRequest } from "./contracts";
export function TraderRequestsDialog({ onClose }: { onClose(): void }) {
  const [rejected, setRejected] = useState(false), [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{ row: TraderRequest; action: "approve" | "reject" }>();
  const [reason, setReason] = useState(""), [notice, setNotice] = useState<string>();
  const list = useRemote(useMemo(() => (signal: AbortSignal) => readTraderRequests(rejected, signal), [rejected])), mutation = useMutation();
  const choose = (row: TraderRequest, action: "approve" | "reject") => { if (mutation.busy() || mutation.blocked) return; setSelection({ row, action }); setReason(""); setNotice(undefined); };
  async function decide() {
    if (!selection || selection.action === "reject" && !reason.trim()) return;
    const result = await mutation.run(() => decideTraderRequest(selection.action === "approve"
      ? { action: "approve", accountId: selection.row.accountId, confirmed: true }
      : { action: "reject", accountId: selection.row.accountId, confirmed: true, reason: reason.trim() }));
    if (result) { setSelection(undefined); setReason(""); setNotice(result.status === "ACTIVE" ? `Đã duyệt yêu cầu của ${result.displayName}.` : `Đã từ chối yêu cầu của ${result.displayName}.`); list.reload(); }
  }
  const rows = list.data?.filter((row) => `${row.displayName} ${row.phoneNumber ?? ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <Dialog open title="Yêu cầu thương lái" size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open && !mutation.busy()) onClose(); }}>
    <div className="flex flex-wrap gap-3"><label>Trạng thái<select className="ml-2 rounded-control border border-border-strong p-3" disabled={mutation.pending || !!selection} value={String(rejected)} onChange={(event) => setRejected(event.target.value === "true")}><option value="false">Chờ duyệt</option><option value="true">Đã từ chối</option></select></label>
      <Button className="w-auto" variant="secondary" disabled={list.loading || mutation.pending} onClick={list.reload}>Tải lại danh sách</Button></div>
    <label className="mt-4 block">Tìm tên hoặc số điện thoại<input className="mt-2 min-h-12 w-full rounded-control border border-border-strong p-3" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <ErrorNotice error={list.error || mutation.error} />
    {mutation.uncertain && <p role="alert">Chưa xác định được kết quả. Hãy tải danh sách để đối chiếu; yêu cầu và lý do vẫn được giữ, thao tác không tự gửi lại.</p>}
    {notice && <p role="status" className="mt-3 text-primary">{notice}</p>}
    {selection && <form className="mt-4 rounded-control border border-primary p-4" onSubmit={(event) => { event.preventDefault(); void decide(); }}>
      <h3 className="font-semibold">{selection.action === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}: {selection.row.displayName}</h3>
      <p className="mt-2 break-words">Số điện thoại: {selection.row.phoneNumber ?? "—"}</p>
      {selection.row.note && <p className="mt-2 whitespace-pre-wrap break-words">Ghi chú: {selection.row.note}</p>}
      {selection.action === "approve" ? <p className="my-3">Tài khoản thương lái sẽ được mở và liên kết hồ sơ khách hàng.</p>
        : <div className="my-3"><Note label="Lý do từ chối (thương lái sẽ thấy)" required maxLength={1000} disabled={mutation.pending || mutation.blocked} value={reason} onChange={(event) => setReason(event.target.value)} /></div>}
      <div className="mt-3 flex flex-wrap gap-3"><Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || selection.action === "reject" && !reason.trim()}>{selection.action === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}</Button>
        <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setSelection(undefined); setReason(""); }}>Hủy xác nhận</Button></div>
    </form>}
    {list.loading ? <Skeleton /> : <ul className="my-4 space-y-3">{rows?.map((row) => <li key={row.accountId} className="rounded-control border border-border p-4">
      <h3 className="break-words font-semibold">{row.displayName}</h3><p className="mt-2">{row.phoneNumber ?? "Chưa có số điện thoại"}</p><p className="mt-2 text-sm text-text-muted">{row.requestedAt ? displayTime(row.requestedAt) : "Chưa có thời điểm yêu cầu"}</p>
      {row.note && <p className="mt-3 whitespace-pre-wrap break-words">{row.note}</p>}{row.rejectionReason && <p className="mt-3 whitespace-pre-wrap break-words">Lý do từ chối: {row.rejectionReason}</p>}
      {row.status === "PENDING_APPROVAL" && <div className="mt-3 flex flex-wrap gap-3"><Button className="w-auto" disabled={mutation.pending || mutation.blocked || !!selection} onClick={() => choose(row, "approve")}>Duyệt yêu cầu</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked || !!selection} onClick={() => choose(row, "reject")}>Từ chối yêu cầu</Button></div>}
    </li>)}</ul>}
    {rows && !rows.length && <p className="my-4">Không có yêu cầu phù hợp.</p>}
    <Button className="mt-4 w-auto" variant="secondary" disabled={mutation.pending} onClick={onClose}>Đóng</Button>
  </Dialog>;
}
