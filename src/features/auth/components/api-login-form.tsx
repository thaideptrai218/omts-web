"use client";
import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Button } from "@/components/ui/button";
import { loginWithApi, logoutWithApi } from "../api/api-auth-client";
import { formatMessage, messageCatalog, type MessageCode } from "@/shared/messages/message-catalog";

export function ApiLoginForm() {
  const [error, setError] = useState<string>();
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(false);
  return <section className="login-panel">
    <p className="login-eyebrow">CHÀO MỪNG TRỞ LẠI</p>
    <h1 className="login-title">Đăng nhập hệ thống</h1>
    <p className="login-description">Đăng nhập để quản lý hoạt động nuôi hàu, mua bán và thông tin truy xuất nguồn gốc.</p>
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
    <div className="login-links mt-5 flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link href="/recover">Quên mật khẩu</Link><Link href="/register">Đăng ký thương lái</Link></div>
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
