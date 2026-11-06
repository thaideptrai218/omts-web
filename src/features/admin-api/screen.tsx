"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import { DataTable, ErrorNotice, Field, OperationHeading, Paging, Select, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { subjectLabel as subjectTypeLabel } from "@/shared/presentation/actor-label";
import { adminAccount, adminActivity, adminPage } from "./contracts";
import { adminRequest } from "./repository";
type Account = z.infer<typeof adminAccount>;
const date = (value: string | null) => value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa có";
export function AdminScreen() {
  const { identity } = useApiWorkspace();
  return identity.subjectType === "SystemAdministrator" ? <AdminWorkspace /> : <p role="alert">Bạn không có quyền quản trị hệ thống.</p>;
}
function AdminWorkspace() {
  const [search, setSearch] = useState(""), [applied, setApplied] = useState(""), [type, setType] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1), [tab, setTab] = useState("accounts"), [selected, setSelected] = useState<Account>();
  const remote = useRemote(useCallback((signal: AbortSignal) => { const q = new URLSearchParams({ page: String(page) }); if (applied) q.set("search", applied); if (type) q.set("type", type); if (status) q.set("statusId", status); return adminRequest(q, adminPage, undefined, signal); }, [page, applied, type, status]));
  const detail = useMutation();
  async function open(id: string) { const record = await detail.run(() => adminRequest(new URLSearchParams({ id }), adminAccount), true); if (record) setSelected(record); }
  return <section><OperationHeading title="Quản trị tài khoản hệ thống" description="Tra cứu tài khoản, kiểm soát truy cập và theo dõi thao tác quản trị." icon="roles" />
    <div role="group" aria-label="Nội dung quản trị" className="my-5 flex gap-2 border-b border-border pb-3"><Button className="w-auto" variant={tab === "accounts" ? "primary" : "secondary"} onClick={() => setTab("accounts")}>Tất cả tài khoản</Button><Button className="w-auto" variant={tab === "activity" ? "primary" : "secondary"} onClick={() => setTab("activity")}>Nhật ký quản trị</Button></div>
    {tab === "activity" ? <Activity /> : <><form className="mb-5 grid items-end gap-3 rounded-card bg-surface-subtle p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setApplied(search.trim()); setPage(1); }}><Field label="Tên hoặc tên đăng nhập" type="search" value={search} onChange={e => setSearch(e.target.value)} /><Select label="Loại tài khoản" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">Tất cả loại</option>{adminAccount.shape.subjectType.options.map(v => <option key={v} value={v}>{subjectTypeLabel(v)}</option>)}</Select><Select label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="301">Đang hoạt động</option><option value="302">Đã khóa</option></Select><div className="flex gap-2"><Button type="submit">Tìm kiếm</Button><Button type="button" variant="secondary" onClick={remote.reload}>Tải lại</Button></div></form><ErrorNotice error={remote.error || detail.error} />
    {remote.loading ? <Skeleton /> : remote.data && <><p className="mb-3 text-sm text-text-muted">{remote.data.total} tài khoản phù hợp</p><DataTable headings={["Tài khoản", "Loại tài khoản", "Liên hệ", "Trạng thái", "Lần đăng nhập gần nhất", "Chi tiết"]} empty={!remote.data.items.length}>{remote.data.items.map(v => <tr key={v.id}><td><p className="font-semibold">{v.displayName}</p><p className="font-mono text-xs text-text-muted">{v.username}</p></td><td>{subjectTypeLabel(v.subjectType)}</td><td>{v.phoneNumber || v.email || "Chưa cung cấp"}</td><td><StatusPill tone={v.statusId === 301 ? "success" : "neutral"}>{v.statusId === 301 ? "Đang hoạt động" : v.statusId === 302 ? "Đã khóa" : "Chưa hoạt động"}</StatusPill></td><td>{date(v.lastLoginAt)}</td><td><Button className="w-auto" variant="secondary" disabled={detail.pending} onClick={() => void open(v.id)}>Xem tài khoản</Button></td></tr>)}</DataTable><Paging page={page} total={remote.data.total} onChange={setPage} /></>}
    {selected && <AccountDetail key={selected.id} record={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); remote.reload(); }} />}</>}
  </section>;
}
function AccountDetail({ record, onClose, onSaved }: { record: Account; onClose(): void; onSaved(): void }) {
  const [reason, setReason] = useState("");
  const editor = useOperationEditor(onClose, !!reason);
  const canChange = ["Staff", "Trader"].includes(record.subjectType) && [301, 302].includes(record.statusId);
  const label = record.statusId === 301 ? "Khóa tài khoản" : "Mở khóa tài khoản";
  return <Dialog open title={record.displayName} size="lg" dismissible={false} onOpenChange={() => {}}>{editor.dialog}<dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Tên đăng nhập", record.username], ["Loại tài khoản", subjectTypeLabel(record.subjectType)], ["Số điện thoại", record.phoneNumber || "Chưa cung cấp"], ["Email", record.email || "Chưa cung cấp"], ["Ngày tạo", date(record.createdAt)], ["Đăng nhập gần nhất", date(record.lastLoginAt)], ["Trạng thái", record.statusId === 301 ? "Đang hoạt động" : record.statusId === 302 ? "Đã khóa" : "Chưa hoạt động"]].map(([label, value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>
    {canChange ? <form className="mt-5 space-y-3 border-t border-border pt-4" onSubmit={e => { e.preventDefault(); void editor.submit(`${label} ${record.username}? ${record.statusId === 301 ? "Các phiên đăng nhập hiện có sẽ bị kết thúc." : ""}`, () => adminRequest(new URLSearchParams(), adminAccount, { id: record.id, action: record.statusId === 301 ? "lock" : "unlock", reason: reason.trim(), rowVersion: record.rowVersion })).then(ok => { if (ok) onSaved(); }); }}><Field label="Lý do *" required maxLength={1000} value={reason} disabled={editor.disabled} onChange={e => setReason(e.target.value)} /><ErrorNotice error={editor.mutation.error} /><Button className="w-auto" type="submit" disabled={editor.disabled || !reason.trim()}>{label}</Button></form> : <p className="mt-5 text-sm text-text-muted">Tài khoản Chủ nhiệm và Quản trị viên được bảo vệ khỏi thao tác khóa tại đây.</p>}
    <Button className="mt-4 w-auto" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button></Dialog>;
}
function Activity() {
  const remote = useRemote(useCallback((signal: AbortSignal) => adminRequest(new URLSearchParams({ activity: "1" }), adminActivity, undefined, signal), []));
  return <><div className="mb-3 flex items-center justify-between"><p className="text-sm text-text-muted">100 thao tác quản trị gần nhất · giờ Việt Nam</p><Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại</Button></div><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : remote.data && <DataTable headings={["Thời điểm", "Người thao tác", "Tài khoản", "Thay đổi", "Lý do"]} empty={!remote.data.length}>{remote.data.map(v => <tr key={v.id}><td>{date(v.occurredAt)}</td><td>{v.actorName || "Quản trị viên"}</td><td>{v.recordCode}</td><td>{v.action === "AdminAccount.Locked" ? "Đang hoạt động → Đã khóa" : v.action === "AdminAccount.Unlocked" ? "Đã khóa → Đang hoạt động" : "Thay đổi trạng thái tài khoản"}</td><td>{v.reason}</td></tr>)}</DataTable>}</>;
}
