"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { postAuth, withAuthLock } from "../api/api-auth-client";

export function InvalidSessionRecovery() {
  const pending = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  async function recover() {
    if (pending.current) return;
    pending.current = true;
    setIsPending(true);
    setError(false);
    try {
      const result = await withAuthLock(() => postAuth("session/recover"));
      if (!result.destination) throw new Error("Recovery unavailable");
      // Full document navigation drops the previous account's client tree/cache.
      window.location.replace(result.destination);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8" aria-labelledby="session-recovery-title">
      <h1 id="session-recovery-title" className="text-2xl font-semibold text-text">Kiểm tra lại phiên đăng nhập</h1>
      <p className="mt-3 leading-7 text-text-muted">Phiên đăng nhập hiện không dùng được. Tiếp tục để kiểm tra và trở về bước phù hợp.</p>
      {error && <p role="alert" className="mt-4 text-sm text-danger">Chưa thể kết nối. Vui lòng thử lại.</p>}
      <Button className="mt-6" isPending={isPending} pendingLabel="Đang kiểm tra..." onClick={recover}>
        Tiếp tục
      </Button>
    </section>
  );
}
