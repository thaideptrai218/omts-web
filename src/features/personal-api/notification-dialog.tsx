"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { formatMessage } from "@/shared/messages/message-catalog";
import { categoryLabels, channelLabels, notificationCellKey, notificationPatch, notificationReason, notificationSelections, type NotificationCatalog } from "./contracts";
import { createPersonalRepository } from "./repository";

export function NotificationApiDialog({ onClose }: { onClose(): void }) {
  const load = useCallback((signal: AbortSignal) => createPersonalRepository().notifications(signal), []);
  const remote = useRemote(load);
  if (remote.data) return <NotificationApiEditor initial={remote.data} onClose={onClose} />;
  return <Dialog open title="Tùy chọn thông báo" onOpenChange={(open) => { if (!open) onClose(); }}>
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && <Button className="w-auto" onClick={remote.reload}>Tải lại tùy chọn</Button>}
  </Dialog>;
}
export function NotificationApiEditor({ initial, onClose }: { initial: NotificationCatalog; onClose(): void }) {
  const repository = useMemo(() => createPersonalRepository(), []), mutation = useMutation();
  const [catalog, setCatalog] = useState(initial), [values, setValues] = useState(() => notificationSelections(initial));
  const [notice, setNotice] = useState<string>(), [discard, setDiscard] = useState(false), [latest, setLatest] = useState<NotificationCatalog>(), [reviewing, setReviewing] = useState(false);
  const patch = notificationPatch(catalog, values), dirty = patch.length > 0;
  const blocked = mutation.blocked || reviewing || mutation.failure?.code === "MSG21" || mutation.failure?.code === "MSG23";
  const error = mutation.failure?.code === "MSG21" ? formatMessage({ code: "MSG21", params: { channel_name: "đã chọn" } }) : mutation.failure?.code === "MSG23" ? formatMessage({ code: "MSG23" }) : mutation.error;
  function requestClose() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  return <Dialog open title={discard ? "Bỏ thay đổi thông báo?" : "Tùy chọn thông báo"} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) requestClose(); }}>
    {discard ? <div><p>Các lựa chọn chưa lưu sẽ bị bỏ.</p><div className="mt-5 flex flex-wrap gap-3"><Button className="w-auto" onClick={onClose}>Bỏ thay đổi và đóng</Button><Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button></div></div> : <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault(); if (mutation.busy() || blocked || !dirty) return; setNotice(undefined);
      const next = await mutation.run(() => repository.saveNotifications(patch));
      if (next) { setCatalog(next.categories); setValues(notificationSelections(next.categories)); setNotice(next.notice ?? "Đã lưu tùy chọn thông báo."); }
    }}>
      <p className="text-sm text-text-muted">Chọn kênh nhận cho từng nhóm. Push được quản lý trên ứng dụng di động.</p>
      <ErrorNotice error={error} />{notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
      {!catalog.length && <p>Chưa có tùy chọn thông báo dành cho tài khoản này.</p>}
      {catalog.map((row) => <fieldset key={row.category} disabled={mutation.pending} className="min-w-0 rounded-card border border-border p-3 sm:p-4"><legend className="px-1 font-semibold">{categoryLabels[row.category]}</legend>
        <div className="grid gap-3 sm:grid-cols-2">{row.channels.map((cell) => {
          const key = notificationCellKey(row.category, cell.channel), reason = notificationReason(row, cell), reasonId = `notify-${row.category}-${cell.channel}`;
          return <div key={cell.channel} className="min-w-0 rounded-control bg-surface-subtle p-3"><label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
            <span>{channelLabels[cell.channel]}</span><input className="size-5 shrink-0 accent-primary" type="checkbox" aria-label={`${categoryLabels[row.category]} · ${channelLabels[cell.channel]}`} aria-describedby={reason ? reasonId : undefined}
              checked={values[key] ?? cell.enabled} disabled={!!reason || blocked || mutation.pending} onChange={(event) => { setNotice(undefined); setValues({ ...values, [key]: event.target.checked }); }} /></label>
            {reason && <p className="mt-1 text-xs leading-5 text-text-muted" id={reasonId}>{reason}</p>}
          </div>;
        })}</div>
      </fieldset>)}
      {(mutation.error || blocked) && <section className="space-y-3 rounded-control border border-border p-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
        setReviewing(true); setLatest(undefined); const next = await mutation.run(() => repository.notifications(), true); if (next) setLatest(next);
      }}>Tải thiết lập hiện tại để đối chiếu</Button>
        {latest && <div className="space-y-3"><h3 className="font-semibold">Thiết lập hiện tại trên hệ thống</h3>{latest.map((row) => <div key={row.category} className="text-sm"><p className="font-semibold">{categoryLabels[row.category]}</p>{row.channels.map((cell) => <p key={cell.channel}>{channelLabels[cell.channel]}: {cell.enabled ? "Bật" : "Tắt"}{!cell.eligible ? " · Chưa đủ điều kiện" : ""}</p>)}</div>)}
          {!mutation.uncertain ? <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setCatalog(latest); setValues(notificationSelections(latest)); setLatest(undefined); setReviewing(false); setNotice(undefined); mutation.reviewed(); }}>Dùng thiết lập đã lưu</Button>
            : <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại tùy chọn trước khi thực hiện lượt mới.</p>}
        </div>}
      </section>}
      <div className="flex flex-wrap gap-3 border-t border-border pt-4"><Button type="submit" className="w-auto" isPending={mutation.pending} disabled={blocked || !dirty}>Lưu tùy chọn</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={requestClose}>Đóng</Button></div>
    </form>}
  </Dialog>;
}
