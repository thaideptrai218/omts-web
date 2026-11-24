import Link from "next/link";

/** `workspace-error.ts` words every HTTP 403 as "Bạn không có quyền ..."; a retry cannot change that answer. */
export const isPermissionDenied = (error?: string) => !!error && error.startsWith("Bạn không có quyền");

/** Permission-denied state: says so and offers the way out instead of a "Tải lại" that would 403 again. */
export function PermissionDeniedNotice({ message = "Bạn không có quyền xem chức năng này." }: { message?: string }) {
  return <div role="alert" className="grid gap-2 rounded-card border border-border bg-surface p-6">
    <p>{message}</p>
    <Link href="/dashboard" className="w-fit font-semibold text-primary underline-offset-2 hover:underline">Về tổng quan</Link>
  </div>;
}
