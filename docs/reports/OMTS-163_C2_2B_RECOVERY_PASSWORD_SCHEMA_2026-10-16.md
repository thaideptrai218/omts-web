# OMTS-163 C2.2b — Recovery password schema

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: validation mật khẩu mới; chưa có recovery service, form hoặc route `/recover`

## 1. Cái gì

Đã tạo `recoveryPasswordSchema` gồm đúng hai field:

- `newPassword`;
- `confirmPassword`.

Phần validation dùng chung được chuyển về `shared/security/new-password-schema.ts`. Schema đổi mật khẩu hiện tại tiếp tục dùng primitive này và chỉ bổ sung `currentPassword` trong ngữ cảnh đã đăng nhập.

## 2. Tại sao

Recovery xảy ra vì người dùng quên mật khẩu, nên yêu cầu `currentPassword` là sai nghiệp vụ. Tuy nhiên copy toàn bộ rule sang một schema mới sẽ tạo hai nguồn sự thật: sau này sửa policy ở một nơi nhưng quên nơi còn lại.

Cách tách hiện tại giữ ranh giới:

```text
shared new-password validation
        ↑                   ↑
account-security       account-recovery
+ currentPassword      + recovery proof ở service sau này
```

Chỉ phần validation thuần được chia sẻ. Recovery không import component, repository, session behavior hoặc service của account-security.

## 3. Hoạt động thế nào

`newPasswordFieldsSchema` xác định shape hai string. `addNewPasswordIssues` đọc shared password policy và gắn issue vào đúng path:

- thiếu/sai rule → `newPassword`;
- thiếu hoặc không khớp → `confirmPassword`.

`recoveryPasswordSchema` dùng schema chung dưới tên theo ngữ cảnh UC03. Confirmation là bằng chứng UI giúp tránh gõ nhầm; khi tạo recovery service contract, chỉ new password và verification proof được phép vượt qua data boundary.

## 4. Các quy tắc được kiểm tra

- ít nhất 8 Unicode code points;
- có ít nhất một Unicode letter;
- có ít nhất một chữ số ASCII;
- confirmation khớp tuyệt đối;
- không cần current password;
- không trim hoặc transform giá trị.

Không thêm rule chữ hoa, ký tự đặc biệt hoặc cấm trùng mật khẩu cũ vì SRS/Jira chưa yêu cầu.

## 5. Self-review

- Không nhân bản thuật toán password policy.
- Recovery không phụ thuộc chéo vào feature account-security.
- Existing change-password schema vẫn giữ API cũ để không phá form hiện tại.
- Error nằm đúng field để React Hook Form có thể focus khi submit thất bại.
- Không có credential logging, persistence hoặc network code.

Không phát sinh lỗi command trong micro-task này. Targeted test, lint và typecheck đều xanh ở lần chạy đầu.

## 6. Defense Q&A

**Tại sao confirmation không được gửi backend?**

Backend chỉ cần mật khẩu mới một lần. Confirmation là kiểm tra lỗi gõ của UI; gửi cả hai làm contract dư thừa mà không tăng bảo mật.

**Tại sao không dùng thẳng schema đổi mật khẩu?**

Schema đổi mật khẩu authenticated còn có current password và session behavior. Recovery dùng verification proof. Hai use case chia sẻ password rule nhưng không chia sẻ bằng chứng xác thực.

**Tại sao không trim password?**

Khoảng trắng có thể là ký tự có chủ ý. Nếu frontend tự trim nhưng màn login không làm giống hệt, người dùng sẽ không đăng nhập được bằng giá trị họ nghĩ đã đặt.

## 7. Bằng chứng kiểm tra

- 23 test files, 117/117 tests qua.
- `npm run lint` qua.
- `npm run typecheck` qua.
- `npm run build` qua; production route vẫn chưa có `/recover` nên không mở một màn chưa hoàn chỉnh.
- `git diff --check` qua.
