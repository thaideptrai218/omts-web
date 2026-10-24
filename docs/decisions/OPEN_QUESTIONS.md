# OMTS Web — câu hỏi mở cần quyết định

Tài liệu này ghi lại các điểm chưa thống nhất giữa SRS, Jira, Figma hoặc backend contract. Không triển khai một phương án như yêu cầu đã xác nhận cho tới khi trạng thái được chuyển từ `Open` sang `Decided` và có người xác nhận.

> Cập nhật23/10/2026: các mục WEB-API bên dưới là decision register cho lát API thật. WEB-AUTH-01/02 giữ lại lịch sử; phone-only trong nội dung cũ không thay quyết định frontend Staff email OR phone đã được Duy Thái chấp thuận ngày20/10. Chênh lệch với backend vẫn cần BA/backend alignment, không tự sửa SRS/Jira.

## WEB-AUTH-01 — Có cho phép đăng nhập bằng số điện thoại chưa xác minh không?

- **Trạng thái:** Decided — Phương án B
- **Ngày xác nhận:** 14/10/2026
- **Người xác nhận:** Duy Thái
- **Phạm vi:** UC02 / SCR-03 / BR-34
- **Ảnh hưởng code:** label và helper text của identifier; login request/response contract; mock service; validation; first-login tests; phone-verification gate.

### Bằng chứng đang mâu thuẫn

1. UC02 Normal Flow ghi identifier là `username, phone number or verified email`. Cách viết này chỉ yêu cầu email phải verified.
2. UC02 branch 3a cho phép Trader/Staff đăng nhập khi chưa có verified phone, sau đó chặn mọi chức năng khác và bắt thực hiện UC08.
3. Entity Account mô tả email chỉ dùng đăng nhập sau khi verified; số điện thoại nội bộ có thể do Cooperative Owner nhập và được người dùng xác minh ở lần đăng nhập đầu.
4. SCR-03 lại ghi `Username, verified phone number or email`, có thể được hiểu rằng số điện thoại cũng phải verified trước khi dùng làm identifier.

### Phương án A — Cho phép số điện thoại chưa verified làm identifier

Backend tìm account bằng username, phone number hoặc verified email. Sau khi password đúng, nếu Trader/Staff chưa verified phone thì session chỉ được dùng cho gate UC08; các chức năng khác chưa mở.

Ưu điểm: khớp UC02 Normal Flow và hỗ trợ trực tiếp first-login branch 3a. Việc biết số điện thoại không đủ đăng nhập vì người dùng vẫn cần password.

### Phương án B — Chỉ số điện thoại verified mới dùng để đăng nhập

Staff có số điện thoại chưa verified phải đăng nhập lần đầu bằng username và temporary password, sau đó xác minh phone. Số điện thoại chỉ trở thành identifier sau khi UC08 thành công.

Ưu điểm: khớp câu chữ hiện tại của SCR-03. Nhược điểm: UI/hướng dẫn first login phải nói rõ người dùng bắt buộc dùng username trước khi phone được verified.

### Khuyến nghị ban đầu của frontend

Ưu tiên **Phương án A** vì khớp Normal Flow và branch 3a rõ hơn. Dù chọn phương án nào, backend phải trả về next action rõ ràng sau khi credentials hợp lệ, ví dụ `CHANGE_TEMP_PASSWORD`, `VERIFY_PHONE` hoặc `ENTER_APP`; frontend không nên tự suy diễn từ tên role.

### Quyết định đã xác nhận

Chỉ `username`, số điện thoại đã xác minh hoặc email đã xác minh được dùng làm identifier đăng nhập.

Staff ở lần đăng nhập đầu dùng `username` và temporary password. Sau khi credentials hợp lệ, người dùng vẫn bị chặn ở gate xác minh số điện thoại theo UC02 branch 3a/UC08; chưa được mở các chức năng nghiệp vụ cho tới khi xác minh thành công.

Hệ quả frontend:

- Label/helper text phải nói rõ số điện thoại và email cần được xác minh.
- Không gửi một số điện thoại chưa xác minh như identifier đăng nhập trong mock/API contract.
- First-login test phải dùng username, sau đó đi tới phone-verification gate.
- Nếu backend hiện thực khác quyết định này, cần đưa chênh lệch trở lại nhóm/SRS trước khi đổi UI.

## WEB-AUTH-02 — Contract biểu diễn post-login gate

- **Trạng thái:** Deferred — chưa chặn route/layout foundation; phải xác nhận trước khi tích hợp login API thật.
- **Vấn đề:** UC02 yêu cầu ba kết quả sau khi credentials hợp lệ: buộc đổi temporary password, buộc xác minh phone, hoặc vào ứng dụng với permission scope.
- **Không được tự chốt:** tên field, token được phát trước hay sau gate, route đích, và payload `/me/permissions`.

## WEB-API-01 — Hướng session cho Web

- **Decided một phần, 23/10/2026, Duy Thái:** chọn BFF Next.js; browser giữ opaque SID trong HttpOnly cookie, token backend ở server.
- **Open:** nơi lưu phiên và môi trường deploy, TTL/cookie/CSRF, session giới hạn, cơ chế revoke/retry. Không tự chọn store production; dev/test adapter cũng cần ghi rõ phạm vi trước triển khai.
- Đọc W2 trong [plan API](../WEB_REAL_API_IMPLEMENTATION_PLAN.md). Không chuyển toàn bộ câu hỏi session thành “đã chốt” chỉ vì đồng ý BFF.

## WEB-API-02 — Refresh-Web trong lúc backend chưa có retry/idempotency

- **Open cho Web.** Quyết định đã có cho Mobile: chờ backend, không bật live refresh. Đề xuất áp dụng tương tự Web đã được hỏi trong phiên23/10; chưa có trả lời phần này.
- Bằng chứng backend48ae1e0: rotation; replay/concurrent refresh có thể revoke. Không mặc định frontend single-flight đã giải quyết mất response.
- Chưa tự quyết ép đăng nhập lại khi kết quả refresh không xác định. W6 vẫn có thể viết tests/coordinator contract bằng fixture.

## WEB-API-03 — Hồ sơ lát API đầu

- **Open:** đề xuất GET hồ sơ + PUT tên trước; không tích hợp thay email/SĐT, Customer hay đơn hàng trong lát này. Đã hỏi, đang chờ xác nhận.
- Backend PUT tên và contact-confirm là hai commit khác nhau. Không âm thầm tách nút Lưu hiện tại thành nhiều mutation; không chạy contact/password mock trong phiên API.
- Cần chốt UI capability ở API mode, profile phone null, validation max200, MSG06 thiếu structured params và xử lý save mất response. Không bịa thông tin để khớp domain cũ.

## WEB-API-04 — Gate, QA account và logout khi lỗi mạng

- **Đã có:** frontend Staff email OR phone / Owner-declared contact; backend/SRS snapshot vẫn phone-only. Không mở lại câu hỏi OR để tự chọn khác; cần nhóm xử lý alignment. Owner forced-password cần domain/UI đúng actor, không dùng Staff shell để vượt gate.
- **Đã có:** chỉ bootstrap Owner; Staff QA do backend cung cấp. Không sửa verified trực tiếp; không tự đổi password Owner local trong audit.
- **Open:** logout offline theo UC07, revoke intent phía BFF, cookie khi không tới được server, response logout cũ sau login mới. Đề xuất tombstone + bounded revocation debt; chưa chọn storage/queue hoặc cam kết đã revoke backend.
- Security dependency findings của audit23/10 đã được vá trong W0.4 ngày24/10; không bỏ qua các cổng session/authorization khi bật phiên thật.

### Cập nhật 24/10/2026 — dependency security

Duy Thái cho phép vá trên nhánh hiện tại. Next/eslint-config-next16.4.3, Vitest/mocker4.1.12 đã cài; audit0, build sau vá đạt. Không có nghĩa WEB-API-01 store, WEB-API-02 refresh hoặc WEB-API-03 phạm vi hồ sơ đã được chốt thêm. Không sửa Jira/SRS.

## WEB-API-05 — MSG06 không có structured người sửa/thời gian

- **Decided — chờ backend bổ sung đủ thông tin.** Duy Thái xác nhận ngày 24/10/2026; không áp dụng câu dự phòng đã đề xuất.
- **Dependency còn chờ:** backend trả structured params `user_name` và `time` cho MSG06; cần kiểm chứng contract/response và test trước khi ghép hiển thị conflict thật. Không parse detail tiếng Anh hoặc tự bịa tên/thời gian.
- Không thay catalog/UI. Parser hiện giữ `ApiError.problem.code/currentRowVersion`; appMessage vẫn fallback MSG04 nếu thiếu params, đây là giới hạn transport chưa ghép API, không phải UX conflict đã được chấp thuận. Có đủ params hợp lệ thì dùng MSG06 đầy đủ.
- Không tự tải lại, ghi đè form hoặc đổi rowVersion. Quyết định này không chốt policy retry mutation. W1.2 phần conflict và W5.3 tiếp tục chờ dependency; phần độc lập không bị chặn.

## WEB-API-06 — Catalog, record ownership và platform capability trước activation

- **Deferred trước live integration, chưa tự chốt:** OMTS-123 vẫn To Do; catalog26 functions trong mapper là snapshot backend48ae1e0, không phải BA-approved default role matrix.
- OwnRecords phải được giữ riêng với AssignedZone; chưa định nghĩa ownership theo createdBy/assignee/employee/account. Không viết record-level predicate giả định hoặc nâng quyền cho tiện demo. BA/backend cần xác nhận semantics theo entity trước feature API tương ứng.
- `platform.cooperative.provision` chưa có function/payload binding được xác nhận trong snapshot này. Projection để unmapped, không tự suy từ actor SysAdmin; mock menu hiện hành chưa đổi. Phải xác nhận API/permission source trước khi nối capability này vào phiên thật.
- `workspace.overview.view` trong projection chỉ mở trang; mỗi KPI/tile phải dùng function/action/dataScope và backend filtering riêng. Không dùng key mở trang để đọc mọi số liệu.
- Mapper/tests W1.4 không giải quyết các quyết định trên và không thay SRS/Jira.
