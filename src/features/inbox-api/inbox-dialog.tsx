"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { displayTime, ErrorNotice, Paging, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { readInbox, markInboxRead } from "./repository";
export function InboxDialog({ onClose }: { onClose(): void }) {
  const [page, setPage] = useState(1), [notice, setNotice] = useState<string>();
  const inbox = useRemote(useMemo(() => (signal: AbortSignal) => readInbox(page, signal), [page]));
  const mutation = useMutation();
  async function mark(id?: string) {
    const result = await mutation.run(() => markInboxRead(id ? { action: "read", id } : { action: "read-all" }));
    if (result) { setNotice("Đã đánh dấu thông báo là đã đọc."); inbox.reload(); }
  }
  return <Dialog open title="Thông báo" size="lg" onOpenChange={(open) => { if (!open && !mutation.busy()) onClose(); }}>
    <div className="flex flex-wrap items-center gap-3"><Button className="w-auto" variant="secondary" disabled={inbox.loading || mutation.pending} onClick={inbox.reload}>Tải lại</Button>
      <Button className="w-auto" disabled={!inbox.data?.unreadCount || inbox.loading || mutation.pending || mutation.blocked} onClick={() => void mark()}>Đánh dấu tất cả đã đọc</Button>
      {inbox.data && <p>{inbox.data.unreadCount} chưa đọc</p>}</div>
    <ErrorNotice error={inbox.error || mutation.error} />
    {mutation.uncertain && <p role="alert">Chưa xác định được kết quả. Hãy tải lại để đối chiếu; thao tác không được tự gửi lại.</p>}
    {notice && <p role="status" className="mt-3 text-primary">{notice}</p>}
    {inbox.loading ? <Skeleton /> : inbox.data && <>
      {!inbox.data.items.length && <p className="my-5">Không có thông báo trong trang này.</p>}
      <ul className="my-4 space-y-4">{inbox.data.items.map((row) => <li key={row.id} className={`rounded-control border p-4 ${row.readAt ? "border-border" : "border-primary"}`}>
        <h3 className="break-words font-semibold">{row.title}</h3><p className="mt-2 text-sm text-text-muted">{displayTime(row.createdAt)} · {row.readAt ? "Đã đọc" : "Chưa đọc"}{row.isMandatory ? " · Bắt buộc" : ""}</p>
        {row.body && <p className="mt-3 whitespace-pre-wrap break-words">{row.body}</p>}
        {row.relatedRecordCode && <p className="mt-2 break-words text-sm">Tham chiếu: {row.relatedRecordCode}</p>}
        {!row.readAt && <Button className="mt-3 w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => void mark(row.id)}>Đánh dấu đã đọc</Button>}
      </li>)}</ul><Paging page={page} total={inbox.data.total} disabled={inbox.loading || mutation.pending} onChange={setPage} />
    </>}
    <Button className="mt-4 w-auto" variant="secondary" disabled={mutation.pending} onClick={onClose}>Đóng</Button>
  </Dialog>;
}
