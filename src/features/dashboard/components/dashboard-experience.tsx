"use client";

import Link from "next/link";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";

const foundationItems = [
  {
    description: "Bố cục tự chuyển giữa drawer mobile và sidebar desktop.",
    title: "Điều hướng responsive",
  },
  {
    description: "UI chỉ gọi service contract, chưa phụ thuộc API hoặc mock storage.",
    title: "Ranh giới dữ liệu",
  },
  {
    description: "Quyền theo vùng sẽ được bổ sung sau khi payload backend được xác nhận.",
    title: "Permission-ready",
  },
] as const;

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

function DashboardContent() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">OMTS Web</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Tổng quan
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Đây là trang mẫu để kiểm tra application shell trước khi các module nghiệp vụ được triển khai.
        </p>
      </header>

      <section aria-labelledby="foundation-title">
        <h2 className="text-lg font-semibold text-text" id="foundation-title">
          Nền tảng hiện có
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {foundationItems.map((item) => (
            <article
              className="rounded-card border border-border bg-surface p-5 shadow-sm"
              key={item.title}
            >
              <h3 className="font-semibold text-text">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{item.description}</p>
            </article>
          ))}
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

  return <DashboardContent />;
}
