import Link from "next/link";

/** `workspaceError` words every HTTP 403 as "Bạn không có quyền ..."; a retry cannot change that answer, so screens must not offer one. */
export const isPermissionDenied = (error?: string) => !!error && error.startsWith("Bạn không có quyền");

/** The one way out of a screen the user may not use. */
export function BackToOverviewLink() {
  return <Link href="/dashboard" className="w-fit text-[13px] font-semibold text-primary underline-offset-2 hover:underline">Về tổng quan</Link>;
}

/** Permission-denied state: says what happened and what to do instead of a "Tải lại" that would be refused again. */
export function PermissionDeniedNotice({ message = "Bạn không có quyền xem chức năng này." }: { message?: string }) {
  return <div role="alert" className="grid gap-2 rounded-card border border-border bg-surface p-6">
    <p>{message}</p>
    <p className="text-[13px] text-text-muted">Nếu cần dùng chức năng này, hãy nhờ Chủ hợp tác xã cấp quyền cho tài khoản của bạn.</p>
    <BackToOverviewLink />
  </div>;
}
