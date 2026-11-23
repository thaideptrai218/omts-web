import type { Metadata } from "next";
import { BrandMark } from "@/components/brand/brand-mark";
import { NotFoundActions } from "@/components/feedback/not-found-actions";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

/** Vietnamese 404 with the app look; it renders outside the app shell, so the only way out is the two buttons. */
export default function NotFound() {
  return <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-surface-subtle px-4 py-10 text-center">
    <BrandMark compact />
    <p className="text-sm font-semibold tracking-wide text-primary">Lỗi 404</p>
    <h1 className="text-2xl font-semibold text-text">Không tìm thấy trang</h1>
    <p className="max-w-md text-sm leading-6 text-text-muted">Đường dẫn này không tồn tại hoặc đã được đổi. Hãy kiểm tra lại địa chỉ, hoặc quay về tổng quan để chọn chức năng từ menu.</p>
    <NotFoundActions />
  </main>;
}
