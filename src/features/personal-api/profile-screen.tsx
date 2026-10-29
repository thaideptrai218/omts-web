"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { updateProfileRequestSchema, type ProfileViewDto } from "./contracts";
import { createPersonalRepository } from "./repository";
import { NotificationApiDialog } from "./notification-dialog";

export function PersonalApiScreen() {
  const load = useCallback((signal: AbortSignal) => createPersonalRepository().profile(signal), []);
  const remote = useRemote(load);
  return <section className="max-w-4xl"><h1 className="text-3xl font-semibold">Hồ sơ cá nhân</h1>
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && !remote.data && <Button className="mt-4 w-auto" onClick={remote.reload}>Tải lại hồ sơ</Button>}
    {remote.data && <PersonalApiEditor initial={remote.data} />}
  </section>;
}
export function PersonalApiEditor({ initial }: { initial: ProfileViewDto }) {
  const repository = useMemo(() => createPersonalRepository(), []), mutation = useMutation();
  const [record, setRecord] = useState(initial), [displayName, setDisplayName] = useState(initial.displayName);
  const [fieldError, setFieldError] = useState<string>(), [notice, setNotice] = useState<string>(), [latest, setLatest] = useState<ProfileViewDto>();
  const [discard, setDiscard] = useState(false), [notifications, setNotifications] = useState(false);
  const input = useRef<HTMLInputElement>(null), dirty = displayName !== record.displayName;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function adopt(next: ProfileViewDto, preserve: boolean) { setRecord(next); if (!preserve) setDisplayName(next.displayName); setLatest(undefined); setFieldError(undefined); setNotice(undefined); mutation.reviewed(); }
  const typeLabel = { CooperativeOwner: "Chủ hợp tác xã", Staff: "Tài khoản nội bộ", Trader: "Thương lái", SystemAdministrator: "Quản trị hệ thống" }[record.subjectType];
  return <div className="mt-6 space-y-5">
    <ErrorNotice error={mutation.error} />{notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
    <section className="rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Thông tin tài khoản"><dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="text-sm text-text-muted">Tên đăng nhập</dt><dd className="mt-1 break-words font-semibold">{record.username}</dd></div><div><dt className="text-sm text-text-muted">Loại tài khoản</dt><dd className="mt-1">{typeLabel}</dd></div>
      <div className="sm:col-span-2"><dt className="text-sm text-text-muted">ID tài khoản</dt><dd className="mt-1 break-all text-sm">{record.accountId}</dd></div>
    </dl></section>
    <form noValidate className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6" onSubmit={async (event) => {
      event.preventDefault(); if (mutation.busy() || mutation.blocked || !dirty) return;
      const values = updateProfileRequestSchema.safeParse({ displayName: displayName.trim(), rowVersion: record.rowVersion });
      if (!values.success) { setFieldError("Tên hiển thị là bắt buộc, tối đa 200 ký tự."); input.current?.focus(); return; }
      setFieldError(undefined); setNotice(undefined);
      const next = await mutation.run(() => repository.saveProfile(values.data.displayName, values.data.rowVersion));
      if (next) { setRecord(next); setDisplayName(next.displayName); setNotice("Đã lưu hồ sơ cá nhân."); }
    }}>
      <Field ref={input} label="Tên hiển thị" required autoComplete="name" disabled={mutation.pending} value={displayName} aria-invalid={!!fieldError} aria-describedby={fieldError ? "personal-name-error" : undefined} onChange={(event) => setDisplayName(event.target.value)} />
      {fieldError && <p className="text-sm text-danger" id="personal-name-error">{fieldError}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" className="w-auto" isPending={mutation.pending} disabled={!dirty || mutation.blocked}>Lưu thay đổi</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending || !dirty} onClick={() => setDiscard(true)}>Hủy thay đổi</Button></div>
    </form>
    <section className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Thông tin liên hệ"><h2 className="text-xl font-semibold">Thông tin liên hệ</h2>
      <dl className="grid gap-4 sm:grid-cols-2">{[["Email", record.email, record.emailVerified], ["Số điện thoại", record.phoneNumber, record.phoneVerified]].map(([label, value, verified]) => <div key={String(label)}><dt className="text-sm text-text-muted">{label}</dt><dd className="mt-1 break-all">{value || "Chưa có"}</dd><dd className="mt-1 text-sm text-text-muted">{value ? verified ? "Đã xác minh" : "Chưa xác minh" : "Chưa có thông tin xác minh"}</dd></div>)}</dl>
    </section>
    <section className="space-y-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Vai trò và vùng được cấp"><h2 className="text-xl font-semibold">Vai trò và vùng được cấp</h2>
      {record.grants.length ? <ul className="space-y-2">{record.grants.map((grant, index) => <li key={`${grant.role}:${grant.zoneId}:${index}`} className="rounded-control bg-surface-subtle p-3"><p className="font-semibold">{grant.role}</p><p className="mt-1 text-sm">{grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên trong danh mục"}</p></li>)}</ul>
        : <p className="text-text-muted">{record.subjectType === "CooperativeOwner" ? "Chủ HTX quản lý theo loại tài khoản." : "Chưa có cặp vùng – vai trò đang hiệu lực."}</p>}
    </section>
    <div className="flex flex-wrap gap-3"><Link className="rounded-control border border-border px-4 py-3 font-semibold text-primary" href="/account/security">Đổi mật khẩu</Link><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setNotifications(true)}>Tùy chọn thông báo</Button></div>
    {mutation.blocked && <section className="space-y-4 rounded-card border border-border bg-surface p-4"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
      const next = await mutation.run(() => repository.profile(), true); if (next) setLatest(next);
    }}>Tải hồ sơ mới để đối chiếu</Button>{latest && <div className="space-y-3 break-words"><h2 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h2><p>Tên hiển thị: {latest.displayName}</p><p>Email: {latest.email || "Chưa có"} · {latest.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</p><p>Số điện thoại: {latest.phoneNumber || "Chưa có"} · {latest.phoneVerified ? "Đã xác minh" : "Chưa xác minh"}</p>
      <p>Vùng – vai trò: {latest.grants.map((grant) => `${grant.role} / ${grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên"}`).join("; ") || "Không có"}</p>
      {!mutation.uncertain ? <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, true)}>Đã đối chiếu, giữ tên đang nhập</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, false)}>Dùng hồ sơ đã lưu</Button></div>
        : <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại hồ sơ trước khi thực hiện lượt mới.</p>}
    </div>}</section>}
    {discard && <Dialog open title="Bỏ thay đổi hồ sơ?" onOpenChange={(open) => { if (!open) setDiscard(false); }}><p>Tên hiển thị chưa lưu sẽ bị bỏ.</p><div className="mt-5 flex flex-wrap gap-3"><Button className="w-auto" onClick={() => { setDisplayName(record.displayName); setFieldError(undefined); setDiscard(false); }}>Bỏ thay đổi</Button><Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button></div></Dialog>}
    {notifications && <NotificationApiDialog onClose={() => setNotifications(false)} />}
  </div>;
}
