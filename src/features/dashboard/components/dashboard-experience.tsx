"use client";

import Link from "next/link";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-2xl motion-safe:animate-pulse" role="status">
      <div className="h-5 w-32 rounded bg-slate-200" />
      <div className="mt-4 h-10 w-64 rounded bg-slate-200" />
      <div className="mt-3 h-5 w-full rounded bg-slate-200" />
      <span className="sr-only">Đang kiểm tra phiên đăng nhập...</span>
    </div>
  );
}

function LoginRequired() {
  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-xl text-primary"
      >
        🔒
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Cần đăng nhập
      </h1>
      <p className="mt-3 leading-7 text-text-muted">
        Hãy đăng nhập để mở khu vực làm việc của bạn.
      </p>
      <Link
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
        href="/login"
      >
        Đi đến trang đăng nhập
      </Link>
    </section>
  );
}

function DashboardContent({ displayName }: { displayName: string }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Không gian làm việc</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Tổng quan
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Truy cập nhanh các chức năng phù hợp với quyền và phạm vi làm việc của bạn.
        </p>
      </header>

      <section
        aria-labelledby="welcome-title"
        className="relative overflow-hidden rounded-card border border-primary/15 bg-gradient-to-br from-primary to-primary-hover p-6 text-white shadow-card sm:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-16 size-48 rounded-full border border-white/15"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 right-16 size-40 rounded-full bg-white/5"
        />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold text-white/80">Chào mừng trở lại</p>
          <h2
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            id="welcome-title"
          >
            {displayName}
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-white/85">
            Chọn một mục trong thanh điều hướng để bắt đầu công việc. OMTS chỉ hiển thị
            những chức năng tài khoản của bạn được phép sử dụng.
          </p>
        </div>
      </section>
    </div>
  );
}

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-xl"
      >
        ⛔
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Chưa được cấp quyền
      </h1>
      <p className="mt-3 leading-7 text-text-muted">
        Tài khoản của bạn chưa có quyền xem khu vực tổng quan.
      </p>
    </section>
  );
}

export function DashboardExperience() {
  const { state } = useAuth();

  if (state.status === "loading") return <DashboardSkeleton />;
  if (state.status === "anonymous") return <LoginRequired />;
  if (!hasEffectivePermission(state.account.access, "workspace.overview.view")) {
    return <PermissionDenied />;
  }

  return <DashboardContent displayName={state.account.displayName} />;
}
