# Đồng bộ #21–#23 cho tester — 02/11/2026

Người dùng đã duyệt cả D1/D2/D3 trong [quyết định](../decisions/WEB_BACKEND_21_23_ALIGNMENT_PROPOSAL_2026-10-31.md). Backend PR25 đã ghép stack #21@6b7ce1c/#23@51420c6/#22@8078fce tại 08ebaf0; Mobile cùng PR5 và Web cùng PR3. Chưa merge develop.

## Đã đồng bộ

- Permissions nhận roleCode và fixed permissions không dataScope. Adapter vẫn giao với effective function/action/zone summary; role label không cấp quyền. Cooperative-wide payments/suppliers/customers dùng đúng summary toàn HTX từ một grant vùng theo D1. Payload legacy vẫn phải có dataScope; actor/identity/session checks giữ nguyên.
- Role list/matrix chỉ đọc, bỏ gọi impact, không hiện bộ lọc trạng thái role. Lịch sử grant hiển thị GrantedAt/người cấp/người thu hồi, không dựng ngày hiệu lực giả; DTO cũ vẫn đọc được. G1/G2, cookie/Redis, không auto refresh/replay giữ nguyên.
- Catalog notification mới cho cả Web/Mobile sửa optional Push, khóa mandatory và luôn giữ inbox. BFF kiểm từng thay đổi với catalog mới đọc theo đúng phiên; không bắt buộc có device để lưu. Notice ưu tiên hơn success, dịch MSG-ACCOUNT-21; schema cũ vẫn được Web hỗ trợ.
- Inbox Web/Mobile đọc DTO cũ và v2, dịch atomic messageParams WATER/FARM và không trả metadata người nhận. Web nhận ack 204 cũ hoặc 200 mới, kiểm ID/readAt/page; malformed v2 không fallback sang cũ.
- Danh mục Material, next-code/seedUnit, Resume, Address/Email. Vật tư đã dùng khóa group/unit và vẫn sửa code; item/NCC đã ngừng chỉ đọc trước Resume, certificate upload ẩn khi ngừng. Tổng nợ NCC không lấy từ detail. Duplicate/validation metadata chỉ chiếu field cho phép và ID UUID; xem bản ghi trùng qua GET riêng, giữ nháp.

## Kiểm tra

- Web: lint/typecheck và build 41 routes PASS; 186 targeted tests/26 files PASS. Bao gồm scope cố định, thiếu dataScope legacy, catalog Push mới/fresh validation, mandatory/unoffered Push, notice, inbox v2, proposal Owner-only, certificate discontinued và duplicate metadata.
- Backend: build 0 warning/error; 253 application + 2 domain + 849 API tests PASS. 128 test SQL/provider skip vì thiếu dịch vụ; guard migration mới đã compile, skip riêng. EF không có model change chờ. CI phải được đối chiếu SHA mới; không dùng kết quả lịch sử làm bằng chứng cho lần này.
- Mobile: lint/types, 10 contract tests, build PASS; cảnh báo chunk lớn còn. Chưa chạy thiết bị Zalo/provider.
- Web build ở thư mục riêng; không thay .next của máy tester đang chạy. Thay đổi local .gitignore/.vercel giữ ngoài commit này; Mobile Expo gốc và backend develop giữ nguyên.

## Chưa nhận là hoàn tất

- QA3003 chưa chuyển sang contract mới hoặc kiểm browser trong đợt này. Docker Engine chưa trả lời CLI sau khởi động; không có API/SQL QA hoạt động được xác nhận.
- Preflight lịch sử phát hiện một stored-effective grant có nguy cơ mở lại quyền khi bỏ ngày hiệu lực. Migration đã chặn cả expired/future/discontinued/duplicate trước khi xóa schema; cần review dữ liệu cụ thể hoặc QA tách biệt, không tự revoke/reset/reseed bản cũ. Giữ backup/database/files cũ.
- /open notification theo record ID/deep-link còn cần nối/kiểm ở client; không tính việc đọc/đánh đọc là đã hoàn tất open-related-record.
- Employee profile API upstream vẫn RequireCooperativeOwner dù matrix có LABOR_WORKERS cho Manager. Web giữ gate đúng endpoint; chưa tự mở vùng/dữ liệu cá nhân.
- Tạo/reset Staff account và onboarding email-or-phone vẫn chờ các contract đã chốt trước đây. Những màn chưa có API không mở bằng mock. GitGuardian history findings chưa được suppress/rewrite.
