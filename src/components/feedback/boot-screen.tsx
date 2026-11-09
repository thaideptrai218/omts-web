import { BrandMark } from "@/components/brand/brand-mark";

/**
 * Màn tải toàn trang dùng chung khi tải lại trang hoặc khôi phục phiên.
 * Căn giữa, có thương hiệu và thanh tiến trình chạy liên tục; trình đọc màn hình nghe được qua role="status".
 * Hoạt họa tự tắt khi người dùng bật "giảm chuyển động" (xem globals.css).
 */
export function BootScreen({ message = "Đang tải hệ thống..." }: { message?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6" role="status" aria-live="polite" aria-busy="true">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
        <div className="omts-boot-mark"><BrandMark /></div>
        <div className="omts-boot-track" aria-hidden="true"><span className="omts-boot-bar" /></div>
        <p className="text-sm font-medium text-text-muted">{message}</p>
      </div>
    </main>
  );
}
