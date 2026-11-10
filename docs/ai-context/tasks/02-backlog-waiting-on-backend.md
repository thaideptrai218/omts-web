# 02 — Backlog: chờ backend

Chưa làm được trọn vẹn cho đến khi backend có endpoint/merge. Không bịa API.

- [ ] **Danh sách hóa đơn bán (SALE-05)**: chưa có endpoint list, chỉ `GET /{id}`.
- [ ] **Hóa đơn của khách tự xem (A1)** `GET /api/me/sales-invoices` (+ `/{id}`) không lộ giá nội bộ; và bộ chọn hóa đơn của Trader cho khiếu nại (hiện chọn qua `?invoiceId=`).
- [ ] **Merge `OMTS-224-correct-cancel`** (sửa/hủy hóa đơn + VietQR) và **`OMTS-225-claim-submit-respond`** (khiếu nại). Màn và dialog Web đã có nhưng ẩn đến khi API trả dữ liệu. Hai nhánh xung đột ở cột migration `ExpiredReminderSentAt` — thứ tự merge chưa rõ.
- [ ] **Phiếu trả hàng bán (CLAIM-03)**: chỉ có khung, chưa có endpoint tạo.
- [ ] **Bảng lương (LABOR-10) và chi lương (LABOR-11)**: chỉ có khung; cài đặt kỳ lương (LABOR-16) đã nối.
- [ ] **Báo cáo bán hàng REPORT-01/02/03** và **số liệu tổng hợp dashboard** (doanh thu, công nợ, cảnh báo nước, việc chờ) — dashboard Owner vẫn là dữ liệu mẫu.
- [ ] **Workforce, my-work, nghỉ phép trên `develop` (A4)**: `/api/workforce/*`, `/api/me/workforce`, `/api/me/leave-requests` chưa có ở `develop`; các màn đó trả 502 trên develop.
- [ ] **Nhật ký hoạt động Manager** `GET /api/zones/{zoneId}/activity` (đề xuất, chưa công bố) và **hợp đồng đánh dấu thu hoạch** (OMTS-221).
- [ ] **Trang truy xuất công khai `/origin/{token}`** (nhánh `OMTS-222-origin-page`): `PublicBaseUrl` backend phải trỏ vào origin của Web (A5). Rút công bố (nhánh `trace-withdraw`).
- [ ] **Sự kiện/thông báo để Owner nhận phiếu nhập** từ Manager/Kế toán.
- [ ] **Kích hoạt liên hệ Staff** bằng email-hoặc-SĐT (backend hiện chỉ SĐT); **tạo tài khoản** với username sinh tự động và giao mật khẩu không lộ bí mật.
- [ ] **Mã thông báo có cấu trúc**: MSG06 (`user_name`, `time`), MSG24 (tên nhân viên có cấu trúc), MSG-SALE-13/14/20/21, MSG-CLAIM-03 (A6) trong catalog dùng chung.
- [ ] **Actor SysAdmin và API quản trị nền tảng**: danh sách toàn bộ tài khoản, tạo, khóa, audit. Backend đã bỏ actor này từ 22/10; chỉ runtime họp có tài khoản `sysadmin`; `/system/cooperatives/new` API không trả quyền.
- [ ] **An toàn migrate vai trò cố định**: grant có ngày hoặc vai trò ngừng có thể sống lại khi bỏ ngày hiệu lực — tích hợp phải dừng thay vì mở rộng quyền.
- [ ] **Xóa chứng nhận theo ID/version** nguyên tử.
- [ ] **Làm mới token (refresh) có idempotency**: chính sách mất phản hồi chưa thống nhất.
- [ ] **Runtime 8082 có khớp `develop` `629e481d` không**: có API trong source không chứng minh runtime có.
- [ ] **Chuỗi thu hoạch → bàn giao → bán hàng/thanh toán** đầy đủ.
- [ ] **Triển khai Vercel với API thật**: cần backend HTTPS ổn định + Redis có TLS/xác thực; bản preview nằm sau Vercel Authentication; thiếu `/api/auth/*` thật thì F5 mất phiên.
