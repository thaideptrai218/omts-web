# W3.2 — Chuẩn bị đọc phiên BFF cho browser

Ngày26/10/2026. Repo `omts-web`, nhánh `feature/OMTS-132-web-foundation`, baseline c2415cc.

## Kết quả

Đã chuẩn bị contract/reader GET session và test ghép các tầng. **Chưa mount reader vào UI/AuthProvider, chưa đổi mock sang API, chưa bật refresh hoặc POST login.** W3.2 còn mở phần tích hợp UI/browser cùng W3.4/W4. Không thêm role/actor/quyền mới hoặc sửa SRS/Jira.

Đã đọc lại Jira OMTS-201, gồm ngữ cảnh parent OMTS-118 và dependency OMTS-198 trong mô tả; dùng contract schemas hiện tại làm snapshot, không gọi hoặc fetch backend mới. Các xung đột hệ thống quản trị/contact/temp-password delivery đã biết không bị tự chốt. Không đọc lại Figma vì lượt này không thay UI/layout.

Trên baseline c2415cc, GitHub build-test, Gitleaks và pr-title SUCCESS; GitGuardian FAILURE. Đây là trạng thái commit baseline, không phải CI của diff chưa push. Finding lịch sử vẫn theo báo cáo bàn giao; không tắt scanner/phân loại incident thay chủ repo.

## Các micro-task

| Mục | Thực hiện | Kiểm tra |
| --- | --- | --- |
| W3.1b4 proposal | Viết đề xuất một lượt login chờ cho mỗi browser, tab khác chờ/đối chiếu; không tự resend credentials khi mất phản hồi | Đã gửi câu hỏi; chưa triển khai cơ chế hoặc cookie mới |
| W3.2a | Schema riêng cho BFF response, không dùng token DTO backend như session browser | Kiểm status/body, phase/đích, field allowlist, permission scope và không suy quyền từ subject label |
| W3.2b | Reader chỉ GET đường dẫn cố định `/api/auth/session`, cookies same-origin, no-store, redirect error | Chỉ trả data; không publish MSG19 toàn cục, sửa cookie, retry/refresh, đụng storage hoặc lưu snapshot giữa calls |
| W3.2c | Bổ sung isCurrent vào tracker hiện hữu; request/body có cùng deadline5s, caller hủy có trạng thái riêng | Kết quả200/401/503 về sau operation mới đều bị loại; aborted/buffered/stalled cases |
| W3.2d | Ghép gateway→DAL→HTTP→reader thật, resolution và backend giả | A/B đồng thời, limited phase, permissions failure, account mismatch và revoke trước khi publish |

`effectivePermissionKeys` được đưa thành const tuple duy nhất rồi suy ra type cũ, giúp schema/type dùng cùng danh sách. Nội dung sáu key không đổi; việc khai báo key không cấp quyền. Mapper backend vẫn là nguồn chuyển dữ liệu, backend vẫn kiểm quyền cuối cùng.

Response authenticated hiện chỉ có identity accountId/username/subjectType và permission projection. Không có displayName/organizationName/roleLabel đầy đủ để tạo AuthAccount hiện tại. Vì vậy reader trả snapshot riêng, không ép kiểu sang AuthSession hoặc lấy tên HTX thay tên người. Profile/UI adapter sẽ làm sau với nguồn đã được duyệt.

## Tự review và lỗi gặp

- **TS2339 ở fixture backend:** BackendRequest có cả login không chứa accessToken. Fake transport đọc token trước khi thu hẹp endpoint nên typecheck bắt lỗi. Đã kiểm chỉ identity/permissions được phép đi vào fixture rồi mới đọc token; endpoint khác ném lỗi fixture thay vì trả response permissions giả. Không thêm accessToken tùy chọn hoặc ép any để làm mất lỗi.
- **Kết quả cũ và lỗi mạng:** reader trả stale/cancelled riêng và kiểm lại sau await fetch/body. Không dùng generic API client hiện tại cho lát này vì client ấy có thể publish expiry khi protected401; kết quả đọc cũ không được tự làm phiên mới mất trạng thái.
- **Quyền và gate:** parser giữ OwnRecords/AssignedZone và scope theo vùng; không tạo quyền theo tên role, không coi403 onboarding là authenticated. Schema nhận cặp phase/đích cụ thể, không nhận URL ngoài hoặc đích dashboard cho limited session.
- **Giới hạn parser:** nó kiểm cấu trúc DTO từ BFF, không xác thực phiên hay tự kiểm quyền record. JSON.parse không thay cho server authorization. Reader chưa có bộ đọc stream giới hạn byte riêng; response đến từ BFF cùng origin do nhóm quản lý, cần kiểm kích thước projection thực tế trước tích hợp browser, không mặc định đây là HTTP client cho URL tùy ý.

## Kiểm chứng cuối lượt

- Focused5 files (tests mới và tracker cũ):64 PASS;62 cases mới so với baseline.
- Full run cuối `npm test -- --maxWorkers=4`: **1.566 PASS,31 Redis SKIP;134 files PASS/4 SKIP**,13.99giây. Lượt trước đó FAIL ở hook Next/ESLint:1557 PASS/40 SKIP,1 suite FAIL;9 skip phát sinh do hook lỗi, không phải chủ động skip thêm. Chạy riêng hook file với1 worker đạt9/9 trong2.29giây. Không đổi timeout/config; nguyên nhân nạp plugin chậm của lần fail chưa được chứng minh đã khắc phục triệt để.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS. Build không có product POST login; API-mode/mock blockade hiện hữu được giữ.
- `npm run test:session-pages`: **24 built-product HTTP assertions PASS**. Đây là kiểm ứng dụng đã build ở API mode không có credentials/Redis, không phải login QA, HTTPS hoặc browser acceptance.
- `git diff --check`: PASS.92 bài local đều có trong roadmap, bài92 được gitignore và không có learning file được track. Không đổi env/dependencies/backend/DB/Jira.
- Web mock đã được mở lại bằng production start tại `http://127.0.0.1:3000/login`; không bật API/refresh. Thay đổi lượt này chưa commit/push, theo checklist chỉ công bố khi được yêu cầu.

Fixture không dùng Redis hay backend thật; test handler không phải Next/browser cookie acceptance. Không chạy lại negative compiler builds vì không thêm/sửa server-only product module hoặc ranh giới import; các thay đổi production là schema/reader browser và API nhỏ trên tracker hiện hữu.

## Phần còn chờ

- WEB-API-08b chờ chốt hành vi cạnh tranh login. Dù đồng ý hành vi, giao thức bootstrap/cookie/Redis và mất response sau HTTP handoff vẫn cần review; không coi Web Locks hoặc biến RAM là lời giải đã hoàn tất.
- W3.2e/W3.4: AuthProvider/API composition, UI profile/label, SSR/hydration/reload/new tab/back/prefetch và logout race. Màn chưa nối không được gọi mock mutation trong phiên API.
- MSG06 structured metadata, contact gate alignment, refresh idempotency, QA accounts và production deployment vẫn theo decision register. Không đổi các câu hỏi này thành Done bằng test fixture.

Bài học92 được ghi tại `docs/learning/92-doc-phien-bff-va-ket-qua-ve-muon.md`, chỉ local theo gitignore. README repo vẫn tiếng Anh. Không merge develop, không cập nhật Jira Done.
