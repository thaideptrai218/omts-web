# OMTS-163 C2.3 — Recovery start/reset contract

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: frontend domain/service/repository contract; chưa có mock, HTTP DTO hoặc route

## 1. Cái gì

Account recovery được chia thành hai operation:

1. `start({ identifier, channel })` trả public recovery challenge, MSG15 và trạng thái `verification-pending`.
2. `resetPassword({ verificationToken, newPassword })` mới có thể thay mật khẩu.

`RecoveryChallenge` thu hẹp `VerificationChallenge` thành `purpose: "recovery"`. Reset có ba kết quả typed: thành công, MSG16 khi proof không hợp lệ và MSG01 khi mật khẩu mới không hợp lệ.

## 2. Tại sao

Nếu start result có union như `account-not-found`, `account-locked` hoặc `delivery-failed`, component rất dễ hiển thị khác nhau và phá yêu cầu chống enumeration. Contract hiện tại làm các trạng thái bí mật đó không tồn tại trong không gian kiểu của UI.

Frontend vẫn cần challenge để render countdown, resend và nhập OTP theo một hành vi public thống nhất. Challenge này là abstraction; nó không khẳng định backend đã gửi code hoặc account tồn tại.

## 3. Hoạt động thế nào

```text
identifier + channel
        ↓
AccountRecoveryService.start
        ↓
MSG15 + public recovery challenge
        ↓
shared UC08 verification
        ↓ opaque proof
resetPassword(proof + newPassword)
        ↓
password-reset hoặc typed rejection
```

`confirmPassword` dừng ở schema/form. Backend không cần nhận cùng một password hai lần. Verification token không được parse, log hoặc lưu; service chỉ chuyển opaque proof xuống repository.

## 4. Invariant được type system bảo vệ

- Start result luôn có MSG15.
- Challenge luôn có purpose recovery.
- Start result không có field eligibility hoặc delivery result.
- Reset không thể được gọi qua contract mà thiếu verification token.
- Reset input không chứa confirmation hoặc current password.
- MSG16 và MSG01 đi cùng đúng domain reason.

Type system không thể tự bảo vệ timing hoặc status code HTTP. Các điểm đó vẫn cần backend và QA kiểm chứng.

## 5. Những gì chưa quyết định

- URL, method, request/response field names và HTTP status.
- Backend tạo real/dummy public handle ra sao.
- Dummy resend/verify/cancel giữ timing và quota thế nào.
- Cách hủy request cũ khi người dùng nhập identifier khác.
- Proof TTL sau OTP success.
- Success message canonical; contract chỉ trả `password-reset` và chưa gắn nhầm MSG18 của UC04.
- Reload có khôi phục flow hay bắt đầu lại.

## 6. Self-review

- Contract không import mock implementation hoặc Next.js API.
- Service chỉ delegate, nên mock và HTTP adapter dùng cùng boundary.
- Không có localStorage, logging hoặc token parsing.
- Không thêm account id/profile/session data vào success response.
- Không suy đoán channel từ chuỗi identifier; caller truyền channel sau validation đã được xác nhận.

Không phát sinh lỗi command trong micro-task. Targeted test, lint và typecheck đều qua ở lần chạy đầu.

## 7. Defense Q&A

**Vì sao start result không có failure khi account không tồn tại?**

Đó là trạng thái nội bộ của backend. Public recovery flow phải dùng MSG15 và hành vi giống nhau; nếu đưa failure vào frontend type, UI có thể trở thành oracle tra cứu account.

**Public challenge có chứng minh code đã được gửi không?**

Không. Nó chỉ là handle public để UI tiếp tục một luồng không phân biệt. Backend mới biết request thật có đủ điều kiện gửi code hay không.

**Tại sao reset không nhận identifier lần nữa?**

Verification proof phải đã ràng buộc purpose, channel và recipient. Gửi identifier riêng lần nữa tạo hai nguồn dữ liệu có thể lệch nhau; backend nên lấy identity từ proof đã xác minh.

## 8. Bằng chứng kiểm tra

- 24 test files, 120/120 tests qua.
- `npm run lint` qua.
- `npm run typecheck` qua.
- `npm run build` qua; production route vẫn chưa có `/recover`.
- `git diff --check` qua.
