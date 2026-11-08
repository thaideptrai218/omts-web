"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { DataTable, displayTime, ErrorNotice, Paging, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { markInboxRead, readInbox } from "./repository";
import { NotificationDetailBody } from "./notification-detail";

export function InboxListScreen({ initialPage = 1 }: { initialPage?: number }) {
  const [page, setPage] = useState(initialPage), [unreadOnly, setUnreadOnly] = useState(false), [expanded, setExpanded] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const inbox = useRemote(useMemo(() => (signal: AbortSignal) => readInbox(page, signal, unreadOnly), [page, unreadOnly]));
  const mutation = useMutation();
  async function markAll() {
    if (await mutation.run(() => markInboxRead({ action: "read-all" }))) { setNotice("Đã đánh dấu tất cả thông báo là đã đọc."); setPage(1); inbox.reload(); }
  }
  return <section><ManagementHeading title="Thông báo" description="Mới nhất trước. Bấm vào nội dung để xem chi tiết ngay trong danh sách." icon="bell"><Button className="w-auto" variant="secondary" disabled={!inbox.data?.unreadCount || mutation.pending || mutation.blocked} onClick={() => void markAll()}>Đánh dấu tất cả đã đọc</Button></ManagementHeading>
    <FilterWorkspace filters={<><fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold">Trạng thái đọc</legend>{[{ value: false, label: "Tất cả thông báo" }, { value: true, label: "Chưa đọc" }].map(option => <label key={option.label} className="flex items-center gap-2 text-sm"><input type="radio" name="inbox-read-filter" checked={unreadOnly === option.value} onChange={() => { setUnreadOnly(option.value); setPage(1); setExpanded(undefined); }} />{option.label}</label>)}</fieldset><p className="text-xs leading-5 text-text-muted">Thông báo chỉ thuộc tài khoản đang đăng nhập. Quyền mở hồ sơ được kiểm tra lại khi bạn bấm xem.</p></>}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted">{inbox.data ? `${inbox.data.total} thông báo · ${inbox.data.unreadCount} chưa đọc` : "Đang tải thông báo…"}</p><Button className="w-auto" variant="secondary" disabled={inbox.loading || mutation.pending} onClick={inbox.reload}>Tải lại</Button></div>
      <ErrorNotice error={inbox.error || mutation.error} />{mutation.uncertain && <p role="alert">Chưa xác định được kết quả. Hãy tải lại để đối chiếu; thao tác không được tự gửi lại.</p>}{notice && <p role="status" className="my-3 text-sm text-primary">{notice}</p>}
      {inbox.loading ? <Skeleton /> : <DataTable headings={["Thông báo", "Nội dung", "Thời gian", "Trạng thái"]} empty={!inbox.data?.items.length}>{inbox.data?.items.map(row => <Fragment key={row.id}><tr className={!row.readAt ? "bg-primary-soft/30" : ""}><td className="min-w-40 max-w-64 font-medium">{row.title}</td><td className="min-w-56"><button type="button" aria-expanded={expanded === row.id} aria-controls={`notification-${row.id}`} className="w-full text-left text-sm leading-6 hover:text-primary" onClick={() => setExpanded(expanded === row.id ? undefined : row.id)}><span className={row.readAt ? "line-clamp-2" : "line-clamp-2 font-semibold"}>{row.body || row.title}</span><span className="mt-1 block text-xs font-medium text-primary">{expanded === row.id ? "Thu gọn chi tiết ↑" : "Xem chi tiết ↓"}</span></button></td><td className="min-w-32 text-xs text-text-muted">{displayTime(row.createdAt)}</td><td><StatusPill>{row.readAt ? "Đã đọc" : "Chưa đọc"}</StatusPill></td></tr>{expanded === row.id && <tr><td colSpan={4} id={`notification-${row.id}`} className="border-l-2 border-primary bg-surface-subtle p-5"><NotificationDetailBody row={row} onMarked={() => { if (unreadOnly && page > 1) { setPage(1); setExpanded(undefined); } else inbox.reload(); }} /></td></tr>}</Fragment>)}</DataTable>}
      {inbox.data && <div className="mt-4"><Paging page={page} total={inbox.data.total} disabled={inbox.loading || mutation.pending} onChange={next => { setPage(next); setExpanded(undefined); }} /></div>}
    </FilterWorkspace>
  </section>;
}
export function InboxDetailScreen({ id, page, unreadOnly = false }: { id: string; page: number; unreadOnly?: boolean }) {
  const router = useRouter();
  const inbox = useRemote(useMemo(() => (signal: AbortSignal) => readInbox(page, signal, unreadOnly), [page, unreadOnly]));
  const row = inbox.data?.items.find(item => item.id === id);
  return <section><Link href="/notifications" className="text-sm font-medium text-primary hover:underline">← Tất cả thông báo</Link><div className="my-5"><ManagementHeading title="Chi tiết thông báo" description="Nội dung thông báo và hồ sơ liên quan." icon="bell" /></div><ErrorNotice error={inbox.error} />{inbox.loading ? <Skeleton /> : row ? <div className="max-w-4xl border-t border-border pt-5"><NotificationDetailBody row={row} onMarked={() => { if (unreadOnly) router.push("/notifications"); else inbox.reload(); }} /></div> : !inbox.error && <p className="py-6 text-sm text-text-muted">Không tìm thấy thông báo ở trang {page}. Danh sách có thể đã thay đổi.</p>}{inbox.error && <Button className="mt-4 w-auto" variant="secondary" onClick={inbox.reload}>Tải lại thông báo</Button>}</section>;
}
