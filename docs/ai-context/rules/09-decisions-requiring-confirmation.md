# 09 — Việc bắt buộc hỏi người dùng trước

Dừng lại, trình bày đề xuất và chờ xác nhận trước khi:

## Thay đổi nghiệp vụ
- Thêm hoặc bớt một bước nghiệp vụ.
- Đổi actor hoặc phạm vi vùng.
- Đổi chuyển trạng thái.
- Đổi trường bắt buộc hoặc validation.
- Đổi dữ liệu QR công khai.
- Đổi hành vi offline/conflict.
- Đổi ranh giới Web/Mobile.
- Giải quyết một câu hỏi SRS còn mở.

## Thay đổi kỹ thuật nhạy cảm
- Lưu phiên, xử lý refresh token, ranh giới SSR/CSR, bảo vệ route, payload quyền, caching.

## Đang chờ quyết định (xem đầy đủ trong `progress/open-questions.md`)
- Yêu cầu mua: đơn vị kg (đã merge) hay số lồng + staffing (nhánh chưa merge). Khi nhánh merge phải xác nhận lại.
- Chuyển người đã đăng nhập từ `/` sang `/dashboard`.
- Thương lái có thấy giá trên hóa đơn của mình không; lương có cho trả từng phần không.
- Precompute/job/read model cho dashboard.
- Triển khai production: nhà cung cấp, backend HTTPS, Redis TLS, vòng đời khóa.
- Khối ngân hàng HTX (WEB-COOP-BANK-01).
- Chính sách phiên nhàn rỗi/dài hạn/thiết bị dùng chung.
- Chiến lược merge nhánh Web vào `develop`.

## Quyết định ghi nhận mới nhất
- 09/11/2026: người dùng yêu cầu nối hàng loạt mọi màn đã có API, không hỏi lại cho đến khi backend merge xong. Không mở rộng sang phạm vi chưa có API.
