# 04 — Backlog: cần quyết định

Không tự giải quyết; trình bày đề xuất và chờ người dùng/BA.

| # | Quyết định | Bối cảnh |
| --- | --- | --- |
| 1 | Yêu cầu mua: **kg (đang dùng, backend develop)** hay **số lồng + staffing (nhánh `cors-zalo-mini-app`, PR20 chưa merge)** | Quyết định 09/11 ghi đè P2: Web theo backend đã merge (kg), bỏ UI staffing/ca; Owner accept/decline trực tiếp. Khi nhánh staffing merge phải xác nhận lại |
| 2 | Người đã đăng nhập vào `/` có chuyển sang `/dashboard` không | Cần đọc phiên ở trang công khai |
| 3 | Thương lái có thấy giá trên hóa đơn của mình không (A1) | Ảnh hưởng hợp đồng `/api/me/sales-invoices` |
| 4 | Lương có cho trả từng phần nhiều lần không (B2/B3) | Ảnh hưởng thiết kế chi lương |
| 5 | Dashboard: precompute/job/read model, độ tươi và phạm vi dữ liệu | `DASHBOARD_LOADING_AND_AGGREGATION_PROPOSAL.md` (27/10): mới làm phần frontend |
| 6 | Triển khai production: nhà cung cấp, backend HTTPS, Redis TLS, bền vững/failover, vòng đời khóa, kho bí mật, xoay khóa, giới hạn thu hồi/retry | WEB-API-01 mở |
| 7 | Khối ngân hàng HTX (WEB-COOP-BANK-01) | BA muốn giữ chờ; Jira muốn chuyển sang PAY-01 |
| 8 | Chính sách phiên nhàn rỗi/dài hạn/thiết bị dùng chung | NFR-01 mặc định 15 phút / 7 ngày / 30 ngày; chưa bàn |
| 9 | Chiến lược merge nhánh Web vào `develop` | Nhánh feature chưa từng merge; tag v3.0.0 dự kiến 21/11/2026 |
| 10 | Chủ sở hữu xử lý lịch sử GitGuardian | 11 vị trí lịch sử; chủ repo xử lý sau |
| 11 | Refresh token: chính sách mất phản hồi/idempotency | WEB-API-02 |
| 12 | WEB-API-04: đăng xuất offline (UC07), ý định thu hồi trong BFF, phản hồi logout cũ đến sau login mới | Có đề xuất tombstone + nợ thu hồi có giới hạn; chưa chọn nơi lưu |
| 13 | WEB-AUTH-02: hình dạng hợp đồng cổng sau đăng nhập; WEB-API-06: danh mục vai trò mặc định (OMTS-123 còn To Do), ngữ nghĩa OwnRecords theo thực thể, ràng buộc `platform.cooperative.provision` | Hoãn |
| 14 | Provisioning HTX có thuộc phạm vi Web không (`/system/cooperatives/new`) | Hiện chỉ mock |
| 15 | Bảng màu chuẩn (teal token vs xanh shell), shell ngang là bản cuối?, dark mode, breadcrumb, logo chính thức/SVG | Xem `../design/08-known-inconsistencies.md` |
| 16 | Đưa `test:boundary`/`serialization`/`cookies` vào CI; thêm rate limit/header bảo mật toàn app | Xem `../architecture/09-open-technical-questions.md` |
| 17 | Zone status Việt hóa; vùng ngừng có tính "không đo gần đây"; ngưỡng 24h tạm; trạng thái chu kỳ "Open/Closed" đúng chưa; Manager/Accountant có `SALES_INVOICES`, `CUSTOMER_PAYMENTS`, `CUSTOMERS` View không | `WEB_SALES_PAYMENTS_LANDING_2026-11-09.md` |
