# OMTS — Kế hoạch đồng bộ Auth/Onboarding trước khi tiếp tục code

> Tạo ngày 20/10/2026.
>
> Kế hoạch này được lập sau báo cáo `docs/reports/AUTH_DECISION_BACKEND_ALIGNMENT_REVIEW_2026-10-20.md`. Không bước nào được coi là đã hoàn thành chỉ vì đã có mock UI.

## Mục tiêu

Chuẩn bị một đề xuất Auth/Onboarding đủ rõ để BA/PM và Backend review; sau khi nhận được phản hồi bằng văn bản mới chốt frontend contract, tích hợp QA API và hoàn tất các màn Web liên quan.

## Nguyên tắc thực hiện

- Không sửa SRS hoặc Jira trong kế hoạch này.
- Không sửa UI trước để “đón” một contract chưa được BA/PM và Backend chốt.
- Không tự giải quyết câu hỏi nghiệp vụ bằng code.
- Mọi nội dung khác SRS/Jira hiện tại được gắn nhãn `Đề xuất`, không gắn nhãn `Đã quyết định`.
- Mỗi bước có đầu ra kiểm tra được; không gộp toàn bộ auth thành một lần sửa lớn.

### Ngoại lệ triển khai frontend đã được Duy Thái cho phép ngày 20/10/2026

Trong khi chờ BA/PM và Backend phản hồi, frontend được phép đồng bộ **domain, mock và UI không phụ thuộc HTTP transport** theo bộ rule ở mục 0.2 để tiếp tục kiểm tra trải nghiệm. Các thay đổi này phải giữ qua repository interface, không tự đặt tên DTO/endpoint/cookie/token và không được báo Jira Done.

## Giai đoạn 0 — Decision gate bắt buộc

### 0.1. Gửi đề xuất cho đúng người review

**Việc làm**

- Gửi `D:\Đồ_án\nghiệp_vụ\04-de-xuat-luong-auth-onboarding-cho-ba-backend.md` cho BA/PM và Backend.
- BA/PM review phần actor, điều kiện hoàn tất onboarding và quy tắc contact.
- Backend review khả năng lưu trạng thái, session/token, uniqueness và API.

**Đầu ra**

- Một phản hồi rõ cho từng câu hỏi có mã `BA-*` và `BE-*` trong tài liệu đề xuất.
- Phản hồi có thể là đồng ý, từ chối hoặc đề nghị phương án khác; frontend không tự suy diễn khi chưa có câu trả lời.

**Tiêu chí hoàn thành**

- Có phản hồi của BA/PM và Backend mà frontend có thể trích dẫn khi làm contract.

### 0.2. BA/PM review bộ rule frontend đã đề xuất

Duy Thái đã chấp thuận bộ rule sau để gửi review:

1. Chỉ áp dụng cho Staff do Cooperative Owner tạo; Trader và actor khác dùng luồng riêng.
2. Owner nhập/chọn `Employee.FullName`; Backend khởi tạo `Account.DisplayName` và tự sinh username unique.
3. Username không tự đổi khi họ tên thay đổi; Owner được xem/copy username.
4. Owner phải gán ít nhất một AccessGrant trước khi Account được tạo.
5. Backend gửi username và mật khẩu tạm trực tiếp cho Staff; Owner không thấy mật khẩu rõ.
6. Mật khẩu tạm hết hạn sau 72 giờ; cấp lại làm credential và onboarding session cũ mất hiệu lực.
7. Staff đăng nhập lần đầu bằng username và mật khẩu tạm.
8. Một trang onboarding nhưng đổi mật khẩu trước, sau đó xác minh contact.
9. Verified email hoặc verified phone là đủ hoàn tất contact requirement.
10. Staff không tự sửa contact trong onboarding; Owner sửa và Backend hủy challenge cũ.
11. Mất toàn bộ AccessGrant thì không được nhận application session.

**Tiêu chí hoàn thành**

- Mỗi câu có mã decision, actor, rule, exception và người xác nhận.

### 0.3. Backend trả lời các câu hỏi kỹ thuật

Backend cần trả lời bằng contract hoặc ví dụ payload cho:

- Backend tự sinh username, xử lý trùng và trả username cho Owner/Staff bằng contract nào.
- Delivery provider gửi username/mật khẩu tạm và trả trạng thái gửi bằng contract nào.
- Lưu onboarding progress ở field nào và tính `nextAction` ở đâu.
- Web nhận session bằng cookie hay response body.
- API nào dùng để tải lại onboarding state sau refresh trang.
- Contact chưa verified được normalize và giữ unique thế nào.
- Khi hoàn tất onboarding, session được đổi từ onboarding sang application bằng cách nào.

**Tiêu chí hoàn thành**

- Có draft API contract đủ để frontend viết HTTP adapter mà không tự đoán tên field hoặc token behavior.

## Giai đoạn 1 — Review contract, không chỉnh tài liệu nguồn

### 1.1. Backend đề xuất lifecycle và migration

**Cái gì**

- Chọn persisted status hoặc derived onboarding state.
- Thiết kế cơ chế username tự sinh cho Account mới mà không đổi username của Account hiện có.
- Thêm normalized contact và unique constraints phù hợp.

**Bằng chứng cần có**

- ERD/migration proposal.
- Test duplicate unverified contact, email case-insensitive và phone normalization.

### 1.2. Backend đề xuất session/token

**Cái gì**

- Phân biệt `ONBOARDING` và `APPLICATION` session.
- Chốt access TTL, refresh policy, rotate/revoke và session upgrade.
- Chốt Web cookie contract và Mobile secure token contract.

**Bằng chứng cần có**

- Sequence diagram login → onboarding → complete → enter app.
- Threat cases: token replay, concurrent refresh, expired onboarding, password changed giữa phiên.

### 1.3. Backend cung cấp draft OpenAPI hoặc payload mẫu

Tối thiểu cần contract cho:

- login;
- refresh/resume onboarding;
- get onboarding status;
- update onboarding profile;
- change temporary password;
- start/verify contact;
- complete onboarding/session upgrade;
- logout;
- `/me/permissions`.

Response login phải có một discriminant ổn định như `nextAction`; checklist không được bắt Web/Mobile tự suy diễn từ role.

**Tiêu chí hoàn thành**

- OpenAPI chạy được trên QA.
- Có test account cho mọi outcome.
- Backend integration tests xanh trên commit/PR sẽ dùng để tích hợp.

## Giai đoạn 2 — Frontend contract và foundation

Chỉ bắt đầu khi Giai đoạn 0 và OpenAPI tối thiểu ở 1.3 hoàn tất.

### 2.1. Cập nhật domain contract

- Thay mock login outcome bằng schema khớp OpenAPI.
- Tạo discriminated union cho `nextAction` và checklist.
- Không để component đọc trực tiếp DTO HTTP.

### 2.2. Cập nhật auth/session boundary

- Cài Web cookie/refresh behavior đã chốt.
- Bootstrap lại state sau reload.
- Route guard dựa trên server-confirmed next action.
- Chỉ tải `/me/permissions` sau khi nhận application session.

### 2.3. Cập nhật account management

- Giữ username nhưng bỏ ô Owner nhập thủ công; form gửi `Employee.FullName`, còn username do Backend sinh và trả về.
- Nếu contact ít nhất một: form phải biểu diễn lựa chọn channel và delivery status.
- Không sửa Employee record khi chỉ cập nhật Account display name.

**Tiêu chí hoàn thành Giai đoạn 2**

- Unit tests cho mapper DTO → domain.
- Integration tests cho reload, session expiry và permission bootstrap.
- Không có token/password/OTP trong localStorage hoặc log.

## Giai đoạn 3 — UI theo lát dọc

Thực hiện tuần tự để dễ review:

1. Login form và error states.
2. Login outcome routing.
3. Onboarding shell và status reload.
4. Profile/display-name task.
5. Temporary-password change task.
6. Contact start/verify/resend task.
7. Completion và application-session upgrade.
8. Permission menu và protected route.
9. Logout/session expiry.
10. Account creation/reset phía Cooperative Owner.

Mỗi lát phải có loading, pending, error, accessibility, keyboard, 360 px và 1024 px; không thêm màn “development showcase”.

## Giai đoạn 4 — QA và hoàn tất Jira

### Ma trận bắt buộc

- Staff activation bằng từng channel được cho phép.
- Username tự sinh unique, không đổi khi họ tên được sửa và được Owner copy đúng.
- Contact trùng, sai format, delivery fail, OTP sai/hết hạn/hết lượt.
- Temporary password hết hạn sau 72 giờ và được cấp lại; credential/session cũ bị vô hiệu hóa.
- Token hết hạn trước/sau khi đổi password.
- Rời trang rồi quay lại; reload giữa từng checklist item.
- Account bị lock hoặc grant bị revoke trong onboarding.
- Hoàn tất đồng thời trên hai thiết bị.
- Không thể gọi API nghiệp vụ bằng onboarding token.
- Hoàn tất onboarding cấp application session và permissions đúng zone.
- Logout/revoke khiến token cũ không dùng lại được.

### Definition of Done

- SRS, Jira và OpenAPI cùng baseline.
- Backend tests và frontend lint/typecheck/build/test xanh.
- Web chạy với QA API, không chỉ mock.
- Jira chỉ được chuyển Done khi đúng `Done when` của ticket.

## Thứ tự công việc đề xuất ngay lúc này

1. Dừng sửa auth UI phụ thuộc contract.
2. Gửi bản đề xuất chi tiết cho BA/PM và Backend.
3. Thu phản hồi cho từng câu hỏi `BA-*` và `BE-*`; không tự sửa SRS/Jira.
4. Backend cung cấp payload mẫu hoặc OpenAPI khi đã thống nhất nội bộ.
5. Frontend thực hiện Giai đoạn 2 và 3 theo từng micro-task sau khi contract đủ rõ.

Trong lúc chờ auth contract, có thể tiếp tục các phần UI độc lập không dùng account identifier, onboarding state hoặc session transport; mọi phần phụ thuộc phải giữ trạng thái deferred rõ ràng.

