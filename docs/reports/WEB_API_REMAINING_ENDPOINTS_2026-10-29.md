# Các luồng API Web còn lại sau đợt hồ sơ/thông báo — 29/10/2026

Đây là bản theo dõi phạm vi, không tính phần trăm SRS từ số endpoint. Backend chạy ở develop953f597, fetch origin trong lượt này vẫn cùng SHA; không merge hoặc đổi backend runtime.

| Nhóm | Đã có luồng Web API | Phần còn lại/điều kiện |
| --- | --- | --- |
| Phiên | Login, bootstrap/session/recovery phiên, logout, current-password change | Refresh tự động chưa có retry/idempotency được duyệt; không bật |
| Hồ sơ cá nhân | Xem identity/contact/verified/grants; lưu tên; contact start/verify→chờ Save/confirm; partial success/MSG06/giữ nháp | G2 đã duyệt và nối; Staff activation email OR phone vẫn chờ backend; không tự áp contact sau OTP |
| Thông báo | GET/PUT catalog theo actor, patch các ô hợp lệ, bắt buộc, Push read-only | Devices POST/DELETE là Mobile; Zalo chưa cấu hình ở backend, không giả lập eligible |
| Trước login | API login/session, đăng ký Trader Email/SMS, recovery/reset, verifications start/resend/verify/complete thật | [G2 đã nối](WEB_G2_VERIFICATION_API_2026-10-29.md); OTP delivery hiện là Fake; email-only Trader có thể vào contact gate của backend, chưa bỏ gate |
| Account/grants | List/detail/update/lock/unlock, grant history và revoke hiện hữu | Create/reset vẫn trả temporaryPassword, trái secret-free; grant create/preview phụ thuộc role codes ổn định; chưa tự nối |
| Roles | List/detail, ma trận chỉ đọc, catalog functions và impact | Backend còn custom Create/Copy/rename, chỉ hai role seed; không suy code cho đúng ba role, chưa bật role writes |
| HTX | Thông tin/ngành nghề/preview/save/logo | Ngân hàng WEB-COOP-BANK-01 chờ BA/backend; chưa có profile-history endpoint |
| Nhà cung cấp | Hồ sơ, đọc/tải/upload chứng nhận JPEG/PNG/PDF, private proxy và version sau upload | Delete certificate chỉ nhận index; chờ backend kiểm ID/version nguyên tử để tránh xóa nhầm khi danh sách đổi |
| FARM | Zones/licenses/renewal/files; raft/lane/layout/photo/dated condition/source | Manager đọc license chờ backend; vật tư bè qua INP, không dựng UC76/77 cũ |
| INP/ENV | Receipt/return/cancel/copy/invoice/cost/export; payments/debt/allocation; manual/OCR/confirm/correct/void/history/chart/threshold/export | OwnRecords-only chờ backend enforce creator scope; signed private evidence hiện hỗ trợ Local; không giả vờ OCR thật khi Fake provider |
| Các nghiệp vụ khác | Không thêm màn ghi mock vào API mode | Cultivation cycles/seeding/log/write-off, harvest/sales/customer finance/QR publication, workforce/payroll cần backend chạy có endpoint đúng contract |

Các API DevInbox dùng riêng môi trường Development để tester xem Fake OTP/OCR; không đưa vào product UI hoặc dùng làm nguồn quyền. Public backend cooperative-logo endpoints đã có; Web private owner logo proxy không mở rộng payload QR.

## Nhánh backend chưa deploy

- `origin/feature/OMTS-212-lab@c92787b`: workforce/payroll nằm trên nhánh riêng; audit trước đã chỉ ra auth/employee source cũ thiếu unlink. Không coi controllers trên nhánh đó là API đã có trong runtime953f597; không merge để tự xử lý.
- `origin/feature/OMTS-216-legacy-cleanup@0fa690b`: dọn entity/scaffolding và migration; không thêm controller. Không chạy migration xóa dữ liệu demo.
- `origin/feature/OMTS-216-message-catalogue@56b4a2f`: đổi MSG cũ sang mã theo nhóm và thêm MessageCode/NoticeCode, gồm notification response. Không có Http route mới trong diff controller. PR19 còn OPEN/DRAFT; Web đã thêm compatibility mã lỗi mới/legacy và notification notice, bỏ hai trường bè luôn-null. Fixture kiểm hai contract; HTTP thật vẫn ở953f597. Không lấy metadata chưa deploy để đóng vấn đề runtime hiện tại.

Đã đọc các diff liên quan, không tuyên bố audit toàn bộ business logic của hai nhánh mới. Không đánh Jira Done và không coi Web draft là full SRS acceptance. Các kết quả QA cụ thể ở [báo cáo luồng cá nhân/quyền](WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md).

Đã đọc13 ticket cập nhật28/10: OMTS-216 In Progress, OMTS-217–227 To Do, OMTS-212 Done là LAB cũ. Các thiết kế FARM/PURCHASE/WATER/LABOR v2 chưa thay runtime; fixed-role mới của Jira khác quyết định Web đã duyệt, chưa tự áp. Chi tiết ở [báo cáo Jira/PR19](WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md).
