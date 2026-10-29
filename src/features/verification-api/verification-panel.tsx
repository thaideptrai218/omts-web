"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/form/password-field";
import { ErrorNotice, Field, Select, Skeleton } from "@/features/operations/ui";
import { formatMessage, messageCatalog, type MessageCode } from "@/shared/messages/message-catalog";
import { createVerificationRepository } from "./repository";
import { verificationCommandSchema, type VerificationCommand, type VerificationPurpose, type VerificationResult, type VerificationView } from "./contracts";
const titles = { registration: "Đăng ký tài khoản thương lái", recovery: "Quên mật khẩu", contact: "Xác minh thông tin liên hệ", "password-email": "Đổi mật khẩu bằng mã email" };
export function verificationError(result: VerificationResult) {
  if (result.code === "VERIFICATION_UNSUPPORTED") return "Trình duyệt chưa hỗ trợ thao tác an toàn giữa các tab. Hãy cập nhật trình duyệt và mở lại trang.";
  if (result.code === "VERIFICATION_BUSY") return "Một thao tác đang diễn ra ở tab khác. Hãy chờ thao tác đó kết thúc rồi bấm lại.";
  if (result.code === "VERIFICATION_SESSION") return "Chưa thể kiểm tra phiên. Hãy trở về đăng nhập để kiểm tra lại.";
  if (result.code && Object.hasOwn(messageCatalog, result.code)) return formatMessage({ code: result.code as MessageCode });
  return result.uncertain ? "Chưa xác định được kết quả. Hãy đối chiếu trạng thái hiện tại trước khi bắt đầu lượt mới; hệ thống không tự gửi lại lệnh." : "Chưa thể thực hiện thao tác. Hãy kiểm tra trạng thái lượt xác minh và thử lại khi phù hợp.";
}
export function VerificationPanel({ purpose, onReady, onClose, onBusyChange, initialContact }: { purpose: VerificationPurpose; onReady?(flow: VerificationView): void; onClose?(): void; onBusyChange?(busy: boolean): void; initialContact?: { channel: "Email" | "Sms"; target: string } }) {
  const repository = useMemo(() => createVerificationRepository(), []), live = useRef(true), pending = useRef(false);
  const [flow, setFlow] = useState<VerificationView>(), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string>(), [completed, setCompleted] = useState<VerificationResult>();
  const [channel, setChannel] = useState<"Email" | "Sms">(initialContact?.channel ?? "Email"), [target, setTarget] = useState(initialContact?.target ?? ""), [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [now, setNow] = useState(() => Date.now());
  const run = useCallback(async (command: VerificationCommand) => {
    if (pending.current || !live.current) return undefined;
    pending.current = true; setBusy(true); onBusyChange?.(true); setError(undefined);
    try {
      const result = await repository.execute(command);
      if (!live.current) return undefined;
      if (result.status === "error") { setError(verificationError(result)); if (result.uncertain) setUncertain(true); }
      if (result.flow) setFlow(result.flow);
      if (result.status === "cancelled" || result.status === "empty") setFlow(undefined);
      if (result.status === "cancelled") { setUncertain(false); setCompleted(undefined); }
      if (result.status === "completed") {
        setCompleted(result); if (result.destination) window.location.replace(result.destination);
      }
      return result;
    } finally { pending.current = false; if (live.current) { setBusy(false); setLoaded(true); onBusyChange?.(false); } }
  }, [repository, onBusyChange]);
  useEffect(() => { live.current = true; void run({ op: "read", purpose }); return () => { live.current = false; }; }, [run, purpose]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const expired = !!flow && now >= Date.parse(flow.expiresAt), waiting = flow?.phase === "pending", halted = flow?.phase === "unknown" || flow?.phase === "failed" || uncertain;
  const seconds = flow?.nextResendAt ? Math.max(0, Math.ceil((Date.parse(flow.nextResendAt) - now) / 1000)) : 0;
  const validate = (command: unknown) => {
    const parsed = verificationCommandSchema.safeParse(command);
    if (!parsed.success) { setError("Hãy kiểm tra email/số điện thoại, mã 6 chữ số hoặc mật khẩu ít nhất 8 ký tự gồm chữ và số, nhập lại trùng khớp."); return undefined; }
    return parsed.data;
  };
  if (!loaded) return <Skeleton />;
  return <section aria-label={titles[purpose]} className="space-y-4"><h2 className="text-xl font-semibold">{titles[purpose]}</h2><ErrorNotice error={error} />
    {completed || flow?.phase === "done" ? <div className="space-y-3"><p role="status">{purpose === "registration" ? "Đã kết thúc lượt đăng ký. Hãy đăng nhập để kiểm tra tài khoản." : "Lượt xác minh đã kết thúc. Hãy kiểm tra thông tin đã lưu hoặc đăng nhập lại."}</p>
      {completed?.username && <p>Tên đăng nhập: <strong>{completed.username}</strong></p>}{completed?.oldDocumentsHidden && <p>Chứng từ cũ sẽ xuất hiện sau khi Chủ HTX hoàn tất liên kết hồ sơ.</p>}<Link className="font-semibold text-primary underline" href="/login">Về đăng nhập</Link></div>
      : !flow || flow.phase === "failed" && !uncertain ? <form noValidate className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); const command = validate({ op: "start", purpose, ...(purpose === "password-email" ? {} : { channel, target, ...(purpose === "contact" ? { currentPassword: password } : {}) }) });
        if (!command) return; const result = run(command); setPassword(""); setCode(""); await result;
      }}>
        {purpose === "password-email" ? <p>Mã sẽ được gửi tới email đã xác minh của tài khoản.</p> : <><Select label="Nhận mã qua" value={channel} disabled={busy} onChange={(event) => setChannel(event.target.value as "Email" | "Sms")}><option value="Email">Email</option><option value="Sms">SMS</option></Select>
          <Field label={channel === "Email" ? "Email cần xác minh" : "Số điện thoại cần xác minh"} type={channel === "Email" ? "email" : "tel"} maxLength={254} required value={target} disabled={busy} autoComplete={channel === "Email" ? "email" : "tel"} onChange={(event) => setTarget(event.target.value)} />
          {purpose === "contact" && <PasswordField id="contact-current-password" label="Mật khẩu hiện tại" autoComplete="current-password" required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />}</>}
        {purpose === "recovery" && <p className="text-sm text-text-muted">Nếu liên hệ thuộc tài khoản hợp lệ, hệ thống sẽ gửi mã. Câu trả lời không xác nhận tài khoản có tồn tại.</p>}
        <Button type="submit" className="w-auto" isPending={busy}>Gửi mã xác minh</Button>
      </form> : <div className="space-y-4"><p>Liên hệ: <strong>{flow.maskedTarget}</strong></p><p className="text-sm">{flow.phase === "verified" ? "Đã xác minh" : "Mã xác minh"} · Hết hạn lúc {new Date(flow.expiresAt).toLocaleTimeString("vi-VN")}{flow.sendsLeft !== null && flow.phase === "code" ? ` · Còn ${flow.sendsLeft} lần gửi lại` : ""}</p>
        {purpose === "recovery" && <p role="status">Nếu liên hệ thuộc tài khoản hợp lệ, mã xác minh đã được gửi tới liên hệ đó.</p>}
        {expired && <p role="alert">Lượt xác minh đã hết hạn. Hãy kết thúc lượt này và yêu cầu mã mới.</p>}{waiting && <p role="status">Thao tác đang được xử lý. Hãy kiểm tra trạng thái trước khi tiếp tục.</p>}{halted && <p>Hãy đối chiếu thông tin đã lưu trước khi kết thúc lượt này. Lệnh không được gửi lại tự động.</p>}
        {flow.phase === "code" && !halted && <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault(); const command = validate({ op: "verify", purpose, id: flow.id, code }); if (!command) return;
          const result = run(command); setCode(""); const next = await result;
          if (next?.status === "success" && next.flow?.phase === "verified" && purpose === "contact") onReady?.(next.flow);
        }}><Field label="Mã xác minh gồm 6 chữ số" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy || expired} onChange={(event) => setCode(event.target.value)} />
          <div className="flex flex-wrap gap-3"><Button type="submit" className="w-auto" isPending={busy} disabled={expired}>Xác minh mã</Button><Button className="w-auto" variant="secondary" disabled={busy || seconds > 0 || flow.sendsLeft === 0 || expired} onClick={() => { setCode(""); void run({ op: "resend", purpose, id: flow.id }); }}>Gửi lại mã{seconds ? ` (${seconds}s)` : ""}</Button></div></form>}
        {flow.phase === "verified" && !halted && !expired && (purpose === "contact" ? <div className="space-y-3"><p>Liên hệ đã xác minh, đang chờ Lưu thay đổi trong hồ sơ. Đóng hoặc hủy trước Lưu sẽ không thay liên hệ.</p><Button className="w-auto" disabled={busy} onClick={() => onReady?.(flow)}>Dùng liên hệ đã xác minh</Button></div>
          : <form noValidate className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const command = validate({ op: "complete", purpose, id: flow.id, newPassword, confirmPassword: confirmation }); if (!command) return; const result = run(command); setNewPassword(""); setConfirmation(""); await result; }}>
            <PasswordField id="verification-new-password" label="Mật khẩu mới" autoComplete="new-password" required value={newPassword} disabled={busy} hint="Ít nhất 8 ký tự, gồm chữ và số." onChange={(event) => setNewPassword(event.target.value)} />
            <PasswordField id="verification-password-confirmation" label="Nhập lại mật khẩu mới" autoComplete="new-password" required value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
            <Button type="submit" className="w-auto" isPending={busy}>{purpose === "registration" ? "Tạo tài khoản thương lái" : "Lưu mật khẩu mới"}</Button>
          </form>)}
        {(waiting || halted) && <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => void run({ op: "read", purpose })}>Kiểm tra trạng thái lượt xác minh</Button>}
        <Button className="w-auto" variant="secondary" disabled={busy || waiting} onClick={async () => { const result = await run({ op: "cancel", purpose, id: flow.id }); if (result?.status === "cancelled") onClose?.(); }}>Kết thúc lượt xác minh</Button>
      </div>}
    {onClose && <Button className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Để sau</Button>}
  </section>;
}
