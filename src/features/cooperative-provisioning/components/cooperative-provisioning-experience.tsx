"use client";

import { RestrictedAccessIcon } from "@/components/feedback/restricted-access-icon";
import { CooperativeProvisioningForm } from "@/features/cooperative-provisioning/components/cooperative-provisioning-form";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft"
      >
        <RestrictedAccessIcon />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Không có quyền khởi tạo hợp tác xã
      </h1>
      <p className="mt-3 leading-7 text-text-muted">
        Chức năng này chỉ dành cho Quản trị viên hệ thống được cấp quyền.
      </p>
    </section>
  );
}

export function CooperativeProvisioningExperience() {
  const { state } = useAuth();

  if (state.status !== "authenticated") return null;
  if (
    !hasEffectivePermission(
      state.account.access,
      "platform.cooperative.provision",
    )
  ) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Quản trị nền tảng</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Khởi tạo hợp tác xã
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
          Xác minh hồ sơ, tạo thông tin sơ bộ và cấp tài khoản cho Chủ hợp tác xã đầu tiên.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-labelledby="provisioning-form-title"
          className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7"
        >
          <div className="border-b border-border pb-5">
            <h2 className="text-xl font-semibold text-text" id="provisioning-form-title">
              Hồ sơ khởi tạo
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Các trường có dấu * là bắt buộc. Thông tin chỉ được gửi khi bạn xác nhận ở bước cuối.
            </p>
          </div>
          <div className="mt-5">
            <CooperativeProvisioningForm />
          </div>
        </section>

        <aside aria-label="Lưu ý về quy trình" className="space-y-4">
          <section className="rounded-card border border-primary/20 bg-primary-soft p-5 text-primary-hover">
            <h2 className="font-semibold">Sau khi khởi tạo</h2>
            <ol className="mt-3 space-y-3 text-sm leading-6">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                Bàn giao trực tiếp tài khoản và mật khẩu tạm thời cho Owner.
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                Owner đăng nhập và đổi mật khẩu trong vòng 24 giờ.
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                Owner tự hoàn thiện hồ sơ HTX trong chức năng hồ sơ.
              </li>
            </ol>
          </section>

          <p className="rounded-control border border-border bg-surface p-4 text-sm leading-6 text-text-muted shadow-card">
            Màn hình này không tự tạo vùng nuôi, khách hàng, đơn hàng hoặc quyền nhân viên.
          </p>
        </aside>
      </div>
    </div>
  );
}
