# OMTS-167 — Báo cáo B3.4b1: xử lý service result trong form

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: ánh xạ typed result vào form/callback; chưa mount forced gate và chưa quyết định post-change session

## 1. Kết quả

`ChangePasswordForm` không còn nhận một callback submit `void` chung chung. Form nhận function `changePassword` theo domain contract và xử lý bốn outcome:

| Outcome | Hành vi UI |
| --- | --- |
| Current password sai / MSG17 | Đặt lỗi và focus `currentPassword` |
| New password bị data boundary từ chối / MSG01 | Đặt lỗi và focus `newPassword` |
| Session hết hạn / MSG19 | Reset password rồi gọi `onSessionExpired` |
| Đổi thành công / MSG18 | Reset password rồi gọi `onChanged` |

Không có redirect, mở application shell hay giả lập phone gate trong form. Hai callback cấp luồng là điểm composition bắt buộc sau khi contract session được xác nhận.

## 2. Thiết kế

`change-password-feedback.ts` là presenter thuần: domain result đi vào, quyết định hiển thị đi ra. Nhờ tách khỏi React, toàn bộ bảng mapping được unit test mà không cần một route/harness thử nghiệm.

Domain result được sửa thành correlated discriminated union. Mỗi reason chỉ có thể đi với đúng code:

- `invalid-current-password` ↔ MSG17;
- `invalid-new-password` ↔ MSG01;
- `session-expired` ↔ MSG19;
- `changed` ↔ MSG18.

Nếu adapter ghép sai reason và message, TypeScript sẽ báo lỗi trước runtime.

## 3. Bảo vệ password

Form chỉ gửi `currentPassword` và `newPassword`; confirmation không vượt khỏi UI. Với outcome cấp luồng, `reset()` chạy trước callback để ba field không còn giữ password trong React Hook Form memory trong lúc component cha chuyển state hoặc điều hướng.

Field error không reset form, vì người dùng cần giữ new password/confirmation để chỉ sửa evidence sai.

## 4. Lỗi thực tế và cách sửa

### Lỗi 1: reason và message chưa tương quan

Test runtime đạt nhưng `npm run typecheck` báo TS2322 tại nhánh `session-expired`: message vẫn có kiểu MSG01 | MSG17 | MSG19 nên không thể truyền cho callback chỉ nhận MSG19.

Nguyên nhân gốc là kiểu rejected cũ dùng một object chứa union của ba reason và union của ba message. TypeScript không có bằng chứng cặp nào đi cùng nhau. Cách sửa là tách thành ba object variant tương quan. Sau sửa, compiler tự thu hẹp đúng message code theo reason.

### Lỗi 2: đọc property trên `never`

Lần typecheck kế tiếp báo TS2345/TS2339 ở `assertNever(result.reason)`. Switch đã bao phủ hết variant nên trong `default`, toàn bộ `result` là `never`; truy cập property của nó không hợp lệ.

Cách sửa là lưu `const reason = result.reason` trước switch rồi `assertNever(reason)` ở default. Exhaustiveness check vẫn được giữ, không dùng `any` hoặc type assertion. Typecheck sau sửa đạt.

## 5. Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Test mục tiêu | 2 files, 7/7 tests đạt |
| Typecheck sau hai lần sửa | Đạt |
| ESLint | Đạt, không warning |
| Toàn bộ unit test | 14 files, 82/82 tests đạt |
| Production build | Đạt, 6/6 static pages; không có `/dev/*` route |
| `git diff --check` | Đạt |

## 6. Tự đánh giá

Mapping outcome đã rõ, testable và không đẩy quyết định session vào form. Correlated union còn làm contract chặt hơn B3.4a. Điểm chưa hoàn thành có chủ ý là DOM interaction test và forced-flow composition; không thể chốt hành vi success nếu `WEB-AUTH-02` chưa xác nhận session và next gate.

Kết luận: B3.4b1 đạt; `OMTS-167` vẫn chưa Jira ready.
