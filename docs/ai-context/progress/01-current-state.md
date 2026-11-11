# 01 — Trạng thái hiện tại (09/11/2026)

## Đã hoàn thành
- **Nền tảng**: Next.js + BFF + Redis; phiên mã hóa; CSRF; điều phối đăng nhập một-lần-chờ (G1); xác minh OTP (G2); thông báo/hộp thư; shell menu ngang (nhánh experiment); landing + boot screen; font Be Vietnam Pro.
- **Hai chế độ**: mock chạy không cần backend; API với đăng nhập → quyền/hồ sơ → đăng xuất qua BFF. Vercel mock: https://omts-web.vercel.app
- **Tài khoản & quyền**: hồ sơ HTX (v2: tên viết tắt, MST, địa chỉ, điện thoại bắt buộc; năm thành lập, link xã hội, giới thiệu Vi/En, ảnh bìa 5 MB, logo 2 MB), chứng nhận HTX, nhân viên thời vụ, tài khoản nội bộ, 3 vai trò cố định (ma trận chỉ đọc), thu hồi grant có lý do, hồ sơ cá nhân, tùy chọn thông báo theo catalog loại tài khoản.
- **Vùng & bè**: vùng nuôi (giấy phép dùng chung, gia hạn giữ bản cũ), bè (ảnh, làn theo ngày, chi phí theo phiếu nhập, hiển thị lưới), bản đồ vị trí (VietMap, không nhúng Google Maps).
- **Nuôi trồng**: chu kỳ (tạo/sửa/hủy, lịch sử, tiến độ làn), thả giống, vật tư, thu hoạch, hiệu chỉnh có lý do, nhật ký chu kỳ, loại công việc/đơn giá, đo nước (nhập tay/OCR, phiên bản, ngưỡng, tổng quan), sản lượng nuôi, truy xuất lô, trang công khai `/origin/[token]`.
- **Mua hàng & công nợ**: phiếu nhập (v1 và v2 qua cờ), thanh toán NCC, chứng nhận NCC, hàng đợi thanh toán Kế toán, sao kê công nợ NCC/khách có xuất file.
- **Bán hàng**: danh mục sản phẩm, khách hàng, hóa đơn bán (VietQR + QR tự dựng), thanh toán khách, yêu cầu mua của Trader (kg), duyệt đăng ký Trader, khiếu nại chất lượng (Trader gửi, Owner phản hồi).
- **Nhân sự**: phân công/chấm công/nghỉ phép (nhánh/integration), cài đặt kỳ lương.
- **Quản trị**: nhật ký thao tác Owner, admin tài khoản SysAdmin (API).
- **Chất lượng**: ~335 file test; báo cáo gần nhất (09/11): `tsc`, lint, build sạch; vitest 3.214 passed. Không có gì trong đợt đó được xác minh trên trình duyệt thật với backend sống.

## Đang lỗi / còn mở
- **GitGuardian**: 11 vị trí lịch sử (52 commit) trên PR Web; chủ repo xử lý sau; không bypass, không viết lại lịch sử.
- **FRAME ONLY**: bảng lương, chi lương, trả hàng bán, 3 báo cáo bán hàng; dashboard Owner là dữ liệu mẫu.
- **Chờ backend**: xem [`../tasks/02-backlog-waiting-on-backend.md`](../tasks/02-backlog-waiting-on-backend.md).
- **Tài liệu lệch**: README/PROJECT_CONTEXT/REVIEW_GUIDE lỗi thời (xem `../tasks/03-backlog-web-only.md`).
- **Mâu thuẫn dữ liệu demo**: mật khẩu mock giữa README và runbook/quyết định 03/11.
- **Test chập chờn**: một test gỡ-liên-kết nhân viên fail một lần khi chạy song song, pass 40/40 khi chạy riêng.
- **Cây làm việc chưa commit**: refactor landing (8 file mới, 4 file sửa) — xem `05-git-state.md`.
- **Không tích hợp một nhánh backend duy nhất**: `develop` canonical (`629e481d`, 247 endpoint), nhánh khác là tập con.

## Bước tiếp theo (đề xuất)
1. Commit refactor landing đang dở (sau khi chạy lint/typecheck/test/build).
2. Chạy Web với backend `develop` mới nhất ở runtime mới; kiểm tay đợt 09/11 trên trình duyệt ở 360/1024 px.
3. Đồng bộ README, PROJECT_CONTEXT, REVIEW_GUIDE; thống nhất mật khẩu demo.
4. Xin người dùng quyết các mục trong [`../tasks/04-backlog-needs-decision.md`](../tasks/04-backlog-needs-decision.md), đầu tiên: chiến lược merge nhánh Web vào `develop` (tag v3.0.0 dự kiến 21/11/2026) và nhánh review chính thức.
5. Chọn một mục "chờ backend" đã có contract và tách thành task nhỏ.
