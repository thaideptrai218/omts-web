# Phase D — Full review D1–D5

## Phạm vi review

Đợt review này kiểm tra toàn bộ phần Web Phase D đang có trong working tree:

- D1 / `OMTS-196`: khởi tạo hợp tác xã tại `/system/cooperatives/new`;
- D2 / `OMTS-183`: hồ sơ hợp tác xã tại `/cooperative/profile`;
- D3 / `OMTS-193`: vai trò và quyền tại `/access/roles`;
- D4 / `OMTS-190`: tài khoản nội bộ và AccessGrant tại `/access/accounts`;
- D5 / `OMTS-186`: hồ sơ nhân viên tại `/employees`.

Các thay đổi C3/C4 đang chung working tree cũng được chạy cùng test, lint, typecheck, build và privacy scan trước khi commit. Review không chuyển Jira sang Done vì các ticket Web Phase D đều còn điều kiện QA API/backend.

## Kết luận trước

Phase D đạt mức **UI-ready với mock adapter**. Không tìm thấy lỗi chặn commit trong code hiện tại sau khi chạy lại toàn bộ quality gate. Cấu trúc chung giữ đúng ranh giới `component → service → repository`, route và navigation được lọc theo capability, mutation có pending/error feedback, và mock không ghi token, OTP hay temporary password vào browser storage hoặc log.

Review phát hiện một mâu thuẫn trong tài liệu D1: đoạn D1.1 cũ nói `preliminaryCode` và Owner identity/contact chưa được mã hóa vào schema, trong khi D1.4 đã đối chiếu SCR-56 và triển khai hai trường này có chủ đích. Plan đã được sửa để phản ánh đúng code và quyết định nguồn: giữ `preliminaryCode`, giữ identity/contact dưới dạng một text field, nhưng chưa tự tách thành các trường nghiệp vụ con.

## Review theo module

### D1 — Khởi tạo hợp tác xã

**Cái gì:** route SysAdmin-only có form hai bước, evidence image picker, review trước mutation và one-time Owner credential.

**Tại sao:** UC72 là thao tác khởi tạo một lần. Review trước submit giảm nguy cơ tạo sai HTX; credential dialog không dismiss vô ý vì mật khẩu tạm chỉ được bàn giao một lần.

**Hoạt động thế nào:** form validate dữ liệu → service trim text → repository mock kiểm tra session, field, evidence và duplicate → success trả summary cùng credential → UI xóa secret khỏi React tree sau khi người dùng xác nhận đã bàn giao.

**Kết quả review:** quyền SysAdmin tách khỏi quyền Owner; không tự tạo zone/customer/order/employee permission; file chỉ được preview trong browser và không lưu local. File count/size, QA DTO và cấu trúc Owner contact vẫn là câu hỏi tích hợp.

### D2 — Hồ sơ hợp tác xã

**Cái gì:** Owner hoàn thiện SCR-07, xem public preview và lưu từ Preliminary sang Completed.

**Tại sao:** public QR projection không được vô tình lộ tax/bank/contact data. `recordVersion` bảo vệ người dùng khỏi ghi đè bản mới hơn trong mock.

**Hoạt động thế nào:** service chuẩn hóa input → repository validate schema/bank/tax ID/version → success trả profile mới và public projection chỉ có tên HTX + địa chỉ văn phòng.

**Kết quả review:** MSG01/02/03/06/10 được typed; conflict không mutate state; Staff chưa được cấp read-only access vì nguồn dẫn xuất xung đột Jira/SRS.

### D3 — Vai trò và quyền

**Cái gì:** Owner tạo, sao chép, sửa, ngừng dùng role và cấu hình permission matrix theo catalog.

**Tại sao:** role phải do catalog quyết định action/scope hợp lệ; UI không hard-code rằng mọi feature đều có Create/Edit/Delete. Quyền thao tác tự kéo theo View để tránh cấu hình vô nghĩa.

**Hoạt động thế nào:** matrix thuần kiểm tra action, View implication và data scope → service chuẩn hóa → repository kiểm tra duplicate/version/impact → role đang được dùng cần xác nhận; role còn account holder không thể discontinue.

**Kết quả review:** không mất lịch sử role; duplicate mở được bản hiện có; mock catalog chỉ là fixture phát triển. Catalog chính thức từ `OMTS-123` vẫn là blocker.

### D4 — Tài khoản nội bộ và AccessGrant

**Cái gì:** Owner quản lý account nội bộ, nhiều cặp zone–role, All zones, preview effective permission, lock/unlock, reset password và revoke grant.

**Tại sao:** role không nằm trực tiếp trên Account vì cùng một người có thể giữ vai trò khác nhau theo vùng. Revoked grant được giữ lại để phục vụ audit.

**Hoạt động thế nào:** editor thu thập account + grant drafts → preview union action theo từng zone → repository revalidate role/zone/date/duplicate → create trả credential một lần; status/revoke/reset đi qua confirmation riêng.

**Kết quả review:** Owner account được bảo vệ; temporary password do Web Crypto tạo trong memory; lock/unlock/revoke cần reason, reset hiện chỉ cần confirmation theo UC11/SCR-09. Hai khoảng trống phải chốt với backend trước QA: (1) `effectiveFrom/effectiveTo` được biểu diễn thế nào khi grant scheduled/expired; (2) account/grant mutation dùng `recordVersion`, ETag hay cơ chế concurrency nào. Mock hiện không được xem là quyết định cho hai vấn đề này.

### D5 — Hồ sơ nhân viên

**Cái gì:** Owner tìm, tạo và sửa Employee; liên kết tùy chọn với một internal Account; chuyển Employed/Left.

**Tại sao:** Employee là hồ sơ nhân sự, Account là danh tính đăng nhập. Gộp hai entity sẽ khiến một thay đổi nhân sự âm thầm thay đổi quyền truy cập.

**Hoạt động thế nào:** repository lọc account chưa liên kết và recheck khi save → duplicate full name + phone trả hồ sơ hiện có → status change chỉ trả follow-up để Owner sang UC11 xem lock/access, không tự mutate Account.

**Kết quả review:** MSG24 chặn account-link race; trạng thái hai chiều giữ account độc lập; leaving date và chuẩn phone vẫn chưa có nguồn đủ rõ để thêm validation/field.

## Lỗi và điểm cần ghi nhận

### 1. Mâu thuẫn tài liệu D1

- **Dấu hiệu:** `WEB_IMPLEMENTATION_PLAN.md` D1.1 nói hai field chưa mã hóa vào schema, nhưng schema và báo cáo D1.4 đều dùng chúng.
- **Nguyên nhân gốc:** D1.1 là ghi chú sau lần đọc scope đầu; D1.4 đã đối chiếu thêm SCR-56 nhưng câu cũ chưa được cập nhật.
- **Cách khắc phục:** sửa D1.1 để nêu đúng: SRS yêu cầu hai nhóm dữ liệu, frontend giữ field tối thiểu và để QA DTO/sub-field cho backend.
- **Bằng chứng:** plan, schema và D1.4 hiện thống nhất; không có thay đổi nghiệp vụ hoặc UI.

### 2. Khoảng trống temporal/concurrency ở D4

- **Dấu hiệu:** model có ngày hiệu lực và `recordVersion`, nhưng mock preview dùng trạng thái Effective/Revoked và save chưa thực thi version conflict.
- **Ý nghĩa:** đây chưa phải lỗi UI chặn demo, nhưng nếu tự suy diễn có thể làm preview quyền khác backend hoặc ghi đè thay đổi đồng thời.
- **Xử lý:** không tự chốt trong review. Ghi thành câu hỏi bắt buộc trước khi nối `OMTS-188/189` và QA.

### 3. Bảo vệ route hiện mới ở client

- **Dấu hiệu:** production build prerender các route và `AuthProvider` vẫn dùng mock session; HTTP request không được backend/session middleware chặn.
- **Ý nghĩa:** permission-aware navigation và component boundary chỉ bảo vệ trải nghiệm, không phải ranh giới bảo mật.
- **Xử lý:** giữ release blocker đã có trong `PROJECT_CONTEXT.md`; phải thiết kế session/guard với backend trước release.

## Quality gates

Chạy ngày 17/10/2026 tại nhánh `feature/OMTS-132-web-foundation`:

- `npm test`: 51 test files, 231/231 tests pass;
- `npm run lint`: pass, zero warnings;
- `npm run typecheck`: Next route type generation và TypeScript pass;
- `npm run build`: pass, sinh đủ routes D1–D5;
- production smoke test bằng `next start -p 3001`: cả năm route D1–D5 trả HTTP 200;
- `git diff --check`: pass;
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities;
- privacy scan: không có `console.*`, `localStorage`, `sessionStorage`, `dangerouslySetInnerHTML`, `@ts-ignore` hoặc `as any` trong phần Phase D; temporary password chỉ xuất hiện ở typed contract, mock/test và one-time dialog.

Browser review riêng của từng module trước đó đã xác nhận không có application horizontal overflow ở 360 px và 1024 px. Full review này dùng lại bằng chứng đó và chạy lại production build; không tuyên bố QA API đã đạt.

## Tự đánh giá

**Điểm mạnh:** phạm vi actor rõ; D2/D3 có optimistic conflict; D4 giữ audit history; D5 không trộn Employee với Account; component không phụ thuộc trực tiếp mock adapter; state loading/error/success/permission denied có mặt; responsive và accessibility đã được kiểm tra theo từng module.

**Điểm cần cải thiện trước Jira Done:** thay service instance mock bằng API adapter; xác nhận server-side authorization/session; chốt D3 catalog; chốt D4 temporal/concurrency/reset reason; chốt D5 leaving date/phone; chạy test case QA chính thức và audit backend.

**Mức sẵn sàng:** phù hợp để commit/push như một frontend UI checkpoint. Chưa phù hợp để merge/release như bản hoàn thành Jira nếu chưa có backend contract và QA API.

## Defense Q&A

**Hỏi: Test pass có chứng minh phân quyền an toàn không?**

Không. Test hiện chứng minh UI ẩn/hiện đúng capability và mock trả forbidden. Phân quyền an toàn phải được backend kiểm tra ở mỗi API; route guard phía client không phải security boundary.

**Hỏi: Tại sao không sửa luôn các khoảng trống D4 trong review?**

Vì cách tính grant scheduled/expired và cơ chế concurrency ảnh hưởng contract backend, trạng thái nghiệp vụ và audit. Tự chọn trong frontend có thể tạo hai nguồn sự thật. Review phải phát hiện và khóa câu hỏi, không biến giả định thành quy tắc.

**Hỏi: Vì sao Phase D được gọi UI-ready nhưng Jira chưa Done?**

UI-ready nghĩa là route, interaction, state và mock contract đã đủ để review giao diện. Jira Done còn yêu cầu chạy với QA API, backend authorization/audit và QA acceptance; các bằng chứng đó chưa tồn tại.
