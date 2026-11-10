# PROGRESS

> Cập nhật lần cuối: 09/11/2026. Nguồn chi tiết: `README.md` (mục Current status) và `docs/PROJECT_CONTEXT.md`. Khi sửa file này, ghi ngày và bằng chứng (lệnh, báo cáo).

## Đã hoàn thành
- Nền tảng Web: layout, thanh bên, ngày kiểu Việt, dashboard theo quyền.
- Chế độ mock chạy không cần backend; chế độ API với đăng nhập → quyền/hồ sơ → đăng xuất qua BFF.
- HTX, nhân sự, tài khoản, vai trò cố định (3 vai trò vùng), hồ sơ cá nhân, thông báo.
- Vùng nuôi (giấy phép dùng chung, gia hạn) và bè (ảnh, làn theo ngày, chi phí theo phiếu nhập).
- Phiếu nhập, thanh toán nhà cung cấp, đo nước, chứng nhận NCC, công nợ.
- Nhân sự theo vùng, hộp thư, yêu cầu Trader, bản đồ vị trí vùng/bè.
- Xác minh liên hệ/mật khẩu cho Trader (G2).
- Vercel mock: https://omts-web.vercel.app

## Đang lỗi / còn mở
- GitGuardian: 11 vị trí lịch sử (chủ repo xử lý sau).
- Luồng cần backend chưa có: xem backlog trong [TASKS.md](TASKS.md).
- Mâu thuẫn SRS/Jira cũ với quyết định đã duyệt: xem `docs/decisions/OPEN_QUESTIONS.md`.

## Bước tiếp theo
1. Chọn một mục backlog đã có contract backend, tách thành task nhỏ trong TASKS.md.
2. Rà lại README/PROJECT_CONTEXT khi backend đổi để PROGRESS không lệch.
3. Chạy `lint`, `typecheck`, `build` trước mỗi lần báo xong.

## Nhật ký
| Ngày | Việc | Kết quả |
| --- | --- | --- |
| 09/11/2026 | Tạo bộ `docs/ai-context/` | 6 file + README |
