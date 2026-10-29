"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { currentPasswordChangeSchema, type CurrentPasswordChangeFormValues } from "@/features/account-security/schemas/change-password-schema";
import { logoutWithApi, postAuth, withAuthLock } from "../api/api-auth-client";
import { isSrsMessageCode } from "@/shared/messages/backend-message-code";
import { formatMessage } from "@/shared/messages/message-catalog";

export function ApiSecurityGate({ phase, forced = true }: { phase: "password-change-required" | "contact-verification-required"; forced?: boolean }) {
  const form = useForm<CurrentPasswordChangeFormValues>({ resolver: zodResolver(currentPasswordChangeSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  return <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
    <h1 className="text-2xl font-semibold">{phase === "password-change-required" ? forced ? "Đổi mật khẩu tạm thời" : "Đổi mật khẩu" : "Xác minh thông tin liên hệ"}</h1>
    {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    {phase === "contact-verification-required" ? <p className="mt-4 leading-7">Tài khoản cần hoàn tất xác minh thông tin liên hệ trước khi sử dụng chức năng nghiệp vụ. Vui lòng liên hệ Chủ hợp tác xã hoặc bộ phận hỗ trợ.</p>
      : <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(async (values) => {
        setError(undefined);
        const result = await withAuthLock(() => postAuth("password", values));
        if (result.destination) { form.reset(); window.location.replace(result.destination); return; }
        if (result.status === "rejected" && (result.code === "MSG17" || result.code === "MSG-ACCOUNT-14")) setError("Mật khẩu hiện tại không đúng.");
        else if (result.status === "rejected" && isSrsMessageCode(result.code)) setError(formatMessage({ code: result.code }));
        else if (result.status === "rejected" || result.status === "invalid-input") setError("Vui lòng kiểm tra mật khẩu mới và mật khẩu nhập lại.");
        else { form.reset(); setUncertain(true); setError("Chưa xác nhận được kết quả đổi mật khẩu. Hãy kiểm tra lại phiên trước khi tiếp tục."); }
      })}>
        <PasswordField id="api-current-password" label="Mật khẩu hiện tại" autoComplete="current-password" required error={form.formState.errors.currentPassword?.message} {...form.register("currentPassword")} />
        <PasswordField id="api-new-password" label="Mật khẩu mới" autoComplete="new-password" required hint="Ít nhất 8 ký tự, gồm chữ và số." error={form.formState.errors.newPassword?.message} {...form.register("newPassword")} />
        <PasswordField id="api-confirm-password" label="Nhập lại mật khẩu mới" autoComplete="new-password" required error={form.formState.errors.confirmPassword?.message} {...form.register("confirmPassword")} />
        <Button type="submit" isPending={form.formState.isSubmitting} disabled={uncertain}>Đổi mật khẩu</Button>
        {uncertain && <Button variant="secondary" onClick={() => window.location.reload()}>Kiểm tra lại phiên</Button>}
      </form>}
    <Button className="mt-4" variant="secondary" isPending={loggingOut} disabled={form.formState.isSubmitting} onClick={async () => {
      setLoggingOut(true); const result = await logoutWithApi();
      if (result.destination) window.location.replace(result.destination);
      else { setLoggingOut(false); setError("Chưa thể đăng xuất. Vui lòng kiểm tra kết nối."); }
    }}>Đăng xuất</Button>
  </section>;
}
