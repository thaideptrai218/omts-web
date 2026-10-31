# OMTS-171 C3.3 — Profile mock environment

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: mock profile + shared verification composition; chưa tạo route `/account`

## 1. Kết quả

Mock environment hiện mô phỏng được:

- load hồ sơ hiện tại;
- từ chối candidate trùng giá trị hiện tại hoặc đã thuộc account khác trước khi gửi code;
- gửi challenge đúng purpose `email-change`/`phone-change`;
- ràng buộc proof với đúng purpose, channel và recipient value;
- save display name và identifier đã verified;
- consume proof đúng một lần sau save thành công;
- không consume proof sớm khi một thay đổi khác trong cùng save bị invalid;
- stale record version trả MSG06 và không ghi đè;
- session expired trả MSG19;
- delivery failure trả MSG04;
- outcome Trader không tự liên kết được lịch sử trả notice MSG57.

Không có nút developer hoặc tài khoản/kịch bản mock nào được hiển thị trong product UI.

## 2. Composition root

`createMockPersonalProfileEnvironment` tạo verification repository, proof registry, profile repository và hai service. Component sau này chỉ nhận `profileService` và `verificationService`; nó không biết token được lưu bằng `Map` trong mock.

```text
Mock verification repository
  -> onVerified(proof)
  -> in-memory proof registry
  -> profile repository checks purpose/channel/value
  -> consume only after every save precondition passes
```

Đây là điểm quan trọng: nếu email proof hợp lệ nhưng phone proof sai trong cùng lệnh save, email proof vẫn còn để người dùng sửa phần phone. Consume proof trước khi kiểm tra toàn bộ input sẽ tạo partial side effect dù profile chưa được lưu.

## 3. Shared recipient masking

Mask email/phone trước đây bị lặp ở registration và recovery. C3 cần cùng quy tắc nên logic được đưa về `verification/lib/mask-verification-recipient.ts` và cả ba flow cùng dùng.

Việc gom logic không đổi business flow. Nó tránh registration hiển thị bốn số cuối nhưng recovery hiển thị ba số cuối cho cùng một phone.

## 4. Conflict simulation

Mock repository có control test-only `simulateExternalUpdate`. Control này tăng record version và thay dữ liệu server-side trong memory; không được render thành product control. Save bằng version cũ trả MSG06, sau đó `load()` trả bản mới.

## 5. Bằng chứng kiểm tra

- 6 test files, 21 tests pass cho profile, shared masking và regression registration/recovery;
- `npm run typecheck`: pass;
- `npm run lint`: pass.

## 6. Defense Q&A

**Tại sao mock cần kiểm tra proof nếu backend sau này vẫn kiểm tra?**

Mock là executable specification cho UI contract. Nếu mock chấp nhận token bất kỳ, giao diện có thể được xây sai nhưng vẫn có vẻ chạy tốt; lỗi chỉ lộ khi nối QA API.

**Tại sao consume proof sau mọi validation?**

Save phải có tính nguyên tử ở góc nhìn người dùng. Một lỗi ở phone không được làm mất email proof khi chưa có thay đổi nào được lưu.

**Control mô phỏng conflict có phải product feature không?**

Không. Nó chỉ là API của mock factory dùng trong test. Product UI không có nút bật lỗi hay màn showcase.

## 7. Trạng thái

C3.3 hoàn thành. C3 chưa UI-ready; bước tiếp theo là C3.4 tạo route `/account` và static/loading profile layout dùng service instance.
