"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { updateProfileRequestSchema, type ProfileViewDto } from "./contracts";
import { createPersonalRepository } from "./repository";
import { NotificationApiDialog } from "./notification-dialog";
import { VerificationPanel, verificationError } from "@/features/verification-api/verification-panel";
import { createVerificationRepository } from "@/features/verification-api/repository";
import type { VerificationView } from "@/features/verification-api/contracts";

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
  const [contactFlow, setContactFlow] = useState<VerificationView>(), [contactDialog, setContactDialog] = useState<{ channel: "Email" | "Sms"; target: string }>();
  const [contactBusy, setContactBusy] = useState(false), [contactSaving, setContactSaving] = useState(false), [contactError, setContactError] = useState<string>(), [contactUncertain, setContactUncertain] = useState(false), [profileRefreshRequired, setProfileRefreshRequired] = useState(false);
  const saveLock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const input = useRef<HTMLInputElement>(null), nameDirty = displayName !== record.displayName, dirty = nameDirty || !!contactFlow;
  const pending = mutation.pending || contactSaving || contactBusy;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function adopt(next: ProfileViewDto, preserve: boolean) { setRecord(next); if (!preserve) setDisplayName(next.displayName); setLatest(undefined); setFieldError(undefined); setNotice(undefined); mutation.reviewed(); }
  const typeLabel = { CooperativeOwner: "Chủ hợp tác xã", Staff: "Tài khoản nội bộ", Trader: "Thương lái", SystemAdministrator: "Quản trị hệ thống" }[record.subjectType];
  return <div className="mt-6 space-y-5">
    <ErrorNotice error={mutation.error || contactError} />{notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
    <section className="rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Thông tin tài khoản"><dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="text-sm text-text-muted">Tên đăng nhập</dt><dd className="mt-1 break-words font-semibold">{record.username}</dd></div><div><dt className="text-sm text-text-muted">Loại tài khoản</dt><dd className="mt-1">{typeLabel}</dd></div>
      <div className="sm:col-span-2"><dt className="text-sm text-text-muted">ID tài khoản</dt><dd className="mt-1 break-all text-sm">{record.accountId}</dd></div>
    </dl></section>
    <form noValidate className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6" onSubmit={async (event) => {
      event.preventDefault(); if (saveLock.current || pending || mutation.busy() || mutation.blocked || contactUncertain || profileRefreshRequired || !dirty) return;
      if (contactFlow && (contactFlow.phase !== "verified" || Date.parse(contactFlow.expiresAt) <= Date.now())) { setContactError("Liên hệ cần được xác minh lại trước khi lưu. Bản nháp vẫn được giữ."); return; }
      const values = updateProfileRequestSchema.safeParse({ displayName: displayName.trim(), rowVersion: record.rowVersion });
      if (!values.success) { setFieldError("Tên hiển thị là bắt buộc, tối đa 200 ký tự."); input.current?.focus(); return; }
      setFieldError(undefined); setNotice(undefined); setContactError(undefined); saveLock.current = true;
      let nameSaved = false;
      try {
        if (nameDirty) {
          const next = await mutation.run(() => repository.saveProfile(values.data.displayName, values.data.rowVersion));
          if (!next || !alive.current) return;
          setRecord(next); setDisplayName(next.displayName); nameSaved = true; setNotice("Đã lưu tên hiển thị.");
        }
        if (contactFlow && alive.current) {
          setContactSaving(true);
          const result = await createVerificationRepository().execute({ op: "complete", purpose: "contact", id: contactFlow.id });
          if (!alive.current) return;
          if (result.status === "completed") {
            setContactFlow(undefined);
            if (result.profile) setRecord(result.profile); else setProfileRefreshRequired(true);
            setNotice(`${nameSaved ? "Đã lưu tên hiển thị và thông tin liên hệ." : "Đã lưu thông tin liên hệ."}${result.oldDocumentsHidden ? " Chứng từ cũ sẽ hiện sau khi Chủ HTX hoàn tất liên kết." : ""}${!result.profile ? " Hãy tải lại hồ sơ để lấy phiên bản mới trước khi sửa tiếp." : ""}`);
          } else {
            setContactError(`${nameSaved ? "Tên hiển thị đã được lưu. Phần liên hệ chưa được xác nhận; nháp vẫn được giữ. " : ""}${verificationError(result)}`);
            if (result.uncertain) setContactUncertain(true);
            else if (!["VERIFICATION_BUSY", "VERIFICATION_UNSUPPORTED", "VERIFICATION_SESSION"].includes(result.code ?? "")) setContactFlow({ ...contactFlow, phase: "failed" });
          }
        }
      } finally { saveLock.current = false; if (alive.current) setContactSaving(false); }
    }}>
      <Field ref={input} label="Tên hiển thị" required autoComplete="name" disabled={pending || profileRefreshRequired} value={displayName} aria-invalid={!!fieldError} aria-describedby={fieldError ? "personal-name-error" : undefined} onChange={(event) => setDisplayName(event.target.value)} />
      {fieldError && <p className="text-sm text-danger" id="personal-name-error">{fieldError}</p>}
      {contactFlow && <p className="break-words rounded-control border border-border p-3">{contactFlow.channel === "Email" ? "Email" : "Số điện thoại"}: {contactFlow.maskedTarget} · {contactFlow.phase === "verified" ? "Đã xác minh, chờ Lưu thay đổi" : "Cần xác minh lại, bản nháp được giữ"}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" className="w-auto" isPending={pending} disabled={!dirty || mutation.blocked || contactUncertain || profileRefreshRequired || !!contactFlow && contactFlow.phase !== "verified"}>Lưu thay đổi</Button><Button className="w-auto" variant="secondary" disabled={pending || !dirty} onClick={() => setDiscard(true)}>Hủy thay đổi</Button></div>
    </form>
    <section className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Thông tin liên hệ"><h2 className="text-xl font-semibold">Thông tin liên hệ</h2>
      <dl className="grid gap-4 sm:grid-cols-2">{[["Email", record.email, record.emailVerified], ["Số điện thoại", record.phoneNumber, record.phoneVerified]].map(([label, value, verified]) => <div key={String(label)}><dt className="text-sm text-text-muted">{label}</dt><dd className="mt-1 break-all">{value || "Chưa có"}</dd><dd className="mt-1 text-sm text-text-muted">{value ? verified ? "Đã xác minh" : "Chưa xác minh" : "Chưa có thông tin xác minh"}</dd></div>)}</dl>
      <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={pending || contactUncertain || profileRefreshRequired} onClick={() => setContactDialog({ channel: "Email", target: record.emailVerified ? "" : record.email ?? "" })}>{record.email && !record.emailVerified ? "Xác minh email hiện có" : record.email ? "Đổi email" : "Thêm email"}</Button>
        <Button className="w-auto" variant="secondary" disabled={pending || contactUncertain || profileRefreshRequired} onClick={() => setContactDialog({ channel: "Sms", target: record.phoneVerified ? "" : record.phoneNumber ?? "" })}>{record.phoneNumber && !record.phoneVerified ? "Xác minh số điện thoại hiện có" : record.phoneNumber ? "Đổi số điện thoại" : "Thêm số điện thoại"}</Button></div>
    </section>
    <section className="space-y-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Vai trò và vùng được cấp"><h2 className="text-xl font-semibold">Vai trò và vùng được cấp</h2>
      {record.grants.length ? <ul className="space-y-2">{record.grants.map((grant, index) => <li key={`${grant.role}:${grant.zoneId}:${index}`} className="rounded-control bg-surface-subtle p-3"><p className="font-semibold">{grant.role}</p><p className="mt-1 text-sm">{grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên trong danh mục"}</p></li>)}</ul>
        : <p className="text-text-muted">{record.subjectType === "CooperativeOwner" ? "Chủ HTX quản lý theo loại tài khoản." : "Chưa có cặp vùng – vai trò đang hiệu lực."}</p>}
    </section>
    <div className="flex flex-wrap gap-3"><Link className="rounded-control border border-border px-4 py-3 font-semibold text-primary" href="/account/security">Đổi mật khẩu</Link><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => setNotifications(true)}>Tùy chọn thông báo</Button></div>
    {(contactUncertain || profileRefreshRequired) && <section className="space-y-3 rounded-card border border-border p-4"><p>Hãy tải hồ sơ và đối chiếu liên hệ đã lưu. Lệnh Lưu không được gửi lại tự động.</p><Button className="w-auto" variant="secondary" disabled={pending} onClick={async () => { const next = await mutation.run(() => repository.profile(), true); if (next && alive.current) setLatest(next); }}>Tải hồ sơ mới để đối chiếu</Button>{latest && <div className="space-y-2 break-words"><p>Tên đã lưu: {latest.displayName}</p><p>Email: {latest.email || "Chưa có"} · {latest.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</p><p>Số điện thoại: {latest.phoneNumber || "Chưa có"} · {latest.phoneVerified ? "Đã xác minh" : "Chưa xác minh"}</p>{!contactUncertain && <Button className="w-auto" variant="secondary" onClick={() => { setRecord(latest); setLatest(undefined); setProfileRefreshRequired(false); }}>Đã đối chiếu phiên bản hồ sơ</Button>}</div>}</section>}
    {mutation.blocked && <section className="space-y-4 rounded-card border border-border bg-surface p-4"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
      const next = await mutation.run(() => repository.profile(), true); if (next) setLatest(next);
    }}>Tải hồ sơ mới để đối chiếu</Button>{latest && <div className="space-y-3 break-words"><h2 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h2><p>Tên hiển thị: {latest.displayName}</p><p>Email: {latest.email || "Chưa có"} · {latest.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</p><p>Số điện thoại: {latest.phoneNumber || "Chưa có"} · {latest.phoneVerified ? "Đã xác minh" : "Chưa xác minh"}</p>
      <p>Vùng – vai trò: {latest.grants.map((grant) => `${grant.role} / ${grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên"}`).join("; ") || "Không có"}</p>
      {!mutation.uncertain ? <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, true)}>Đã đối chiếu, giữ tên đang nhập</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, false)}>Dùng hồ sơ đã lưu</Button></div>
        : <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại hồ sơ trước khi thực hiện lượt mới.</p>}
    </div>}</section>}
    {discard && <Dialog open title="Bỏ thay đổi hồ sơ?" dismissible={!pending} onOpenChange={(open) => { if (!open && !pending) setDiscard(false); }}><p>Tên hiển thị và liên hệ chưa lưu sẽ bị bỏ. Thông tin đã lưu trên hệ thống được giữ.</p><ErrorNotice error={contactError} /><div className="mt-5 flex flex-wrap gap-3"><Button className="w-auto" isPending={contactSaving} disabled={pending} onClick={async () => {
      if (saveLock.current) return; saveLock.current = true;
      try {
        if (contactFlow) {
          setContactSaving(true); const result = await createVerificationRepository().execute({ op: "cancel", purpose: "contact", id: contactFlow.id });
          if (!alive.current) return;
          if (result.status !== "cancelled" && !(Date.parse(contactFlow.expiresAt) <= Date.now() && !result.uncertain)) { setContactError(verificationError(result)); return; }
        }
        setContactFlow(undefined); setDisplayName(record.displayName); setFieldError(undefined); setDiscard(false); setContactError(undefined); setNotice(undefined);
      } finally { saveLock.current = false; if (alive.current) setContactSaving(false); }
    }}>Bỏ thay đổi</Button><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => setDiscard(false)}>Tiếp tục sửa</Button></div></Dialog>}
    {contactDialog && <Dialog open title="Xác minh liên hệ" dismissible={!contactBusy} onOpenChange={(open) => { if (!open && !contactBusy) setContactDialog(undefined); }}><VerificationPanel purpose="contact" initialContact={contactDialog} onBusyChange={setContactBusy} onClose={() => setContactDialog(undefined)} onReady={(flow) => { setContactFlow(flow); setContactDialog(undefined); setContactError(undefined); setNotice("Liên hệ đã xác minh, chờ Lưu thay đổi."); }} /></Dialog>}
    {notifications && <NotificationApiDialog onClose={() => setNotifications(false)} />}
  </div>;
}
