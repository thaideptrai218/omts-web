"use client";

import { Button } from "@/components/ui/button";

export function SessionServiceState({ title = "Chưa thể tải trang" }: { title?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 py-12">
      <section aria-labelledby="session-service-title" className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        <p className="text-sm font-semibold text-primary">OMTS</p>
        <h1 id="session-service-title" className="mt-3 text-2xl font-semibold text-text">{title}</h1>
        <p className="mt-3 leading-7 text-text-muted">Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau ít phút.</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>Thử lại</Button>
      </section>
    </div>
  );
}
