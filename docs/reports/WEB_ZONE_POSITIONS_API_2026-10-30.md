# Vị trí vùng và bè qua API — 30/10/2026

Đã thêm luồng còn thiếu cho GET `/api/zones/map`, từ danh sách Vùng nuôi. Dữ liệu qua repository → BFF `/api/zone-map` → backend; trả ID/tên/mã/trạng thái/tọa độ và bè đang dùng. Tìm vùng hoặc bè, lọc vùng ngừng dùng, tải lại, mở tọa độ trong Google Maps. Tọa độ thiếu không được tự điền, giá trị0 hợp lệ. Đây là bảng vị trí; chưa phải bản đồ nhúng.

BFF chỉ nhận GET và một boolean `includeDiscontinued`, không nhận target/zone tùy ý; chỉ application session của Owner/Staff. Backend giới hạn vùng qua FarmingLookupAccess. Schema loại trường thừa, kiểm tọa độ; session đổi trong lúc tải thì bỏ dữ liệu. Cookie/token không xuống payload, response private/no-store.

Kiểm chứng:12 tests BFF/component đạt (query injection/duplicate, actor, đổi phiên, dữ liệu sai, thiếu/zero coordinates, search raft/filter). Lint/typecheck/build39/39 đạt. HTTP trên built app3002/backend8080: Owner7 vùng, quanlyvung1 chỉDEMO-01, quanlyvung2 chỉDEMO-02, Accountant7 vùng; Trader403, anonymous401. Có kiểm duplicate query400; tất cả phiên QA logout. Không ghi dữ liệu nghiệp vụ. Chưa có kiểm chứng browser/viewport cho modal mới; component tests không thay thế kiểm đó.

Fetch backend origin/develop vẫn953f597. Đối chiếu route controllers phát hiện map chưa có màn; không có notification-inbox API, không đưa dev inbox vào product. Các luồng còn lại trong [bảng phụ thuộc](WEB_API_REMAINING_ENDPOINTS_2026-10-29.md) tiếp tục chờ contract/backend: Staff email OR phone, tạo/reset account secret-free, ba role cố định/cấp grant, xóa chứng nhận có ID/version, ngân hàng HTX, các nghiệp vụ SRS v2. Không tuyên bố toàn SRS hoàn thành, không merge backend/Web hoặc đổi Jira.

Built-product regression được bổ sung route `/api/zone-map`:55 assertions đạt, gồm anonymous401/no-store/no Set-Cookie cho route mới (tránh static mock404).
