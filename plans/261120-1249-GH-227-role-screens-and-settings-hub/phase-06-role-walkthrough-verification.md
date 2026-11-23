# Phase 6 — Kiểm thử theo vai trò

**Trạng thái:** Chờ

## Kịch bản (API thật, 3 tài khoản: owner, quanlyvung1, ketoan)
1. Owner: tạo `quanlyvung2` + Vùng X trong 1 màn; đặt lại mật khẩu; sao chép người dùng; xem tab Vai trò.
2. Owner: thử cấp Kế toán thứ hai → thấy cảnh báo, OK vẫn lưu (hoặc bị chặn nếu chọn chặn).
3. quanlyvung1: dashboard "Việc hôm nay"; vào Kế hoạch thu hoạch (xem / tạo nếu phase 5c), giao việc, chấm công, thả giống, thu hoạch; không thấy Thiết lập, Tài khoản.
4. quanlyvung1 mở URL Owner-only → thông báo không có quyền, không crash.
5. ketoan: Sổ quỹ, công nợ, bảng lương xem/xuất; không thấy Nuôi trồng ghi.
6. Kiểm 360 px và 1024 px các màn mới.

## Tự động
- vitest các file đã đổi; 1 `tsc`; eslint file đổi. Không chạy full suite/CI.
- Ghi kết quả vào `plans/261120-1249-GH-227-role-screens-and-settings-hub/reports/`.
