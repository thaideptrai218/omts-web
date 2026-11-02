# Mở hồ sơ thông báo và điểm vào Vercel — 02/11/2026

## Quyết định trong chat

- Chỉ nối API đã có; chờ nhóm backend bổ sung chuỗi thu hoạch→cân/giao→giao dịch/hóa đơn→khách thanh toán.
- GitGuardian để chủ repo xử lý. Không suppress check hoặc viết lại lịch sử.
- Giữ thay đổi local, không merge develop.

## Thay đổi Web

- `/` dẫn đến `/login` thay trang giới thiệu OMTS không có lối vào. Login bootstrap hiện có quyết định tiếp tục phiên hoặc hiện đăng nhập; không đổi G1/G2, cookie, refresh hoặc caching policy.
- BFF `GET /api/inbox?open=<notificationId>` gọi `/api/me/notifications/{id}/open`, kiểm lại phiên sau response, kiểm notificationId/recordType/UUID/zone, bỏ URL tùy ý hoặc metadata người nhận. Không tự gọi `/read` hoặc suy UUID từ mã hiển thị.
- Hộp thư mở phép đo bằng editor đang có, nhắc đo vào đúng vùng, giấy phép bằng luồng hồ sơ hiện có và tài khoản bằng deep-link đã hỗ trợ. Đọc chi tiết tiếp tục qua BFF/endpoint thật có kiểm quyền. Parent dialog giữ hộp thư khi quay lại và không đóng vượt hồ sơ đang mở.
-403/404/response sai ID hoặc sai vùng giữ thông báo và trạng thái đã đọc. Bản ghi lịch sử thiếu ID vẫn xem nội dung; không tạo ID giả để mở.

## Kiểm tra

37 targeted tests PASS: open/recheck, forged/duplicate query, mất phiên, mất quyền/hồ sơ, ID/vùng bị thay, quay lại hộp thư và account deep-link. Lint/types/build PASS.63 built-product assertions PASS, gồm `/` vào login, bảo vệ route, cookie recovery, unavailable Redis và compiled UI checks. Chưa tính kết quả này là QA role end-to-end hoặc TLS/browser acceptance.

## Vercel thực tế trước cập nhật

Project `omts-web`, team `thaibeo-s-projects`, production deployment `dpl_3dA4EYiBZq68NBeeVw9m7zDRWQi5` báo Ready. Framework Next.js/root đúng. URL deployment ngẫu nhiên yêu cầu Vercel auth; alias https://omts-web.vercel.app/ truy cập công khai bình thường. Bên trong deployment cũ, `/` chỉ hiện giới thiệu OMTS; `/login` có UI nhưng báo dịch vụ không khả dụng. CLI xác nhận **không có environment production**.

Bản sửa route cần deployment mới; deployment ID cũ là artifact bất biến. Dùng URL chính cho tester. Thiếu backend HTTPS/Redis/G1-G2 configuration không được che bằng mock; đã hỏi người dùng thông tin môi trường, chưa thay credentials hay Deployment Protection.

## QA local

Docker Desktop được khởi động lại bằng các tiến trình chính phiên này đã mở; database/volume không bị xóa/reset. Engine vẫn chưa chạy; Windows từ chối khởi động `vmcompute` do quyền hiện tại. Đã yêu cầu người dùng mở Docker Desktop bằng Administrator. Chưa nâng DB, chưa tự sửa grant preflight nguy hiểm, chưa đổi mật khẩu hoặc seed QA.

## API backend

Đã fetch22remote refs và pull --ff-only; develop953f597 và integration946df70 đều up-to-date. Không có API nghiệp vụ harvest/handover/invoice/customer-payment mới. PR27/28 có thay đổi purchase/farm/certification lớn, khác quyết định cũ nên chỉ đối chiếu, chưa tự ghép hoặc migration. [Báo cáo thiếu API](HARVEST_TO_TRANSACTION_API_GAP_2026-11-02.md), [runbook tester](../testing/TESTER_RUNBOOK_2026-11-02.md).
