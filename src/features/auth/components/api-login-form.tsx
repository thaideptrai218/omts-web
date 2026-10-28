"use client";
import { useState } from "react";
import { LoginForm } from "./login-form";
import { Button } from "@/components/ui/button";
import { loginWithApi, logoutWithApi } from "../api/api-auth-client";
import { formatMessage, messageCatalog, type MessageCode } from "@/shared/messages/message-catalog";

export function ApiLoginForm() {
  const [error, setError] = useState<string>();
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(false);
  return <section className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
    <h1 className="text-3xl font-semibold">Đăng nhập OMTS</h1>
    <LoginForm formError={error} onSubmit={async (values) => {
      setError(undefined); setReset(false);
      const result = await loginWithApi(values);
      if (result.destination) { window.location.replace(result.destination); return true; }
      if (result.status === "rejected" && result.code && Object.hasOwn(messageCatalog, result.code)) {
        setError(formatMessage({ code: result.code as MessageCode }));
      } else if (result.status === "unsupported") {
        setError("Trình duyệt chưa hỗ trợ đăng nhập an toàn giữa các tab. Hãy cập nhật Chrome, Edge, Firefox hoặc Safari và mở lại trang.");
      } else if (result.status === "waited") {
        setError("Thao tác ở tab khác đã kết thúc. Hãy bấm Đăng nhập để tiếp tục.");
      } else {
        setError(result.status === "pending" ? "Một lượt đăng nhập đang được xử lý. Hãy kiểm tra lại phiên."
          : "Chưa thể xác nhận phiên đăng nhập. Hãy kiểm tra lại trước khi tiếp tục.");
        setReset(true);
      }
      return result.status === "waited";
    }} />
    {reset && <div className="mt-4 grid gap-3">
      <Button variant="secondary" onClick={() => window.location.reload()}>Kiểm tra lại phiên</Button>
      <Button variant="secondary" isPending={pending} onClick={async () => {
        setPending(true);
        const result = await logoutWithApi();
        setPending(false);
        if (result.destination) window.location.replace(result.destination);
        else setError("Chưa thể kết thúc lượt đăng nhập. Hãy thử lại khi có kết nối.");
      }}>Kết thúc lượt đăng nhập này</Button>
    </div>}
  </section>;
}
