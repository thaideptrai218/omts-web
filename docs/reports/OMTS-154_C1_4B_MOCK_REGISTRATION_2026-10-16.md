# OMTS-154 C1.4b — Mock registration and verification composition

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: mock adapter chạy trong memory; chưa có form `/register`, phone validator production hoặc QA API

## 1. Cái gì

Đã tạo mock registration repository và một composition environment dùng chung với shared verification service. Environment giữ một registry proof trong RAM để mô phỏng việc backend chỉ chấp nhận verification token đã được cấp sau OTP đúng.

Các trường hợp được mô phỏng:

- bắt đầu xác minh thành công và chỉ trả recipient đã che;
- identifier đã tồn tại ngay từ bước start;
- dịch vụ gửi mã thất bại;
- proof giả hoặc proof thuộc identifier khác;
- đăng ký thành công sau OTP đúng;
- identifier bị phiên khác đăng ký trước bước complete;
- proof đã complete thành công không được dùng lại.

## 2. Tại sao

Nếu registration mock tự chấp nhận mọi chuỗi token, UI có thể trông như chạy đúng dù thứ tự nghiệp vụ sai. Ngược lại, nếu production code parse tiền tố `mock-proof-`, chi tiết test sẽ rò vào domain thật và HTTP adapter sau này khó thay thế.

Composition environment giải quyết hai việc cùng lúc: registration và verification vẫn có contract riêng, nhưng mock của chúng chia sẻ một proof registry nội bộ. UI chỉ nhìn thấy hai service bình thường và token vẫn là opaque string.

## 3. Hoạt động thế nào

1. `registrationService.start(draft)` kiểm tra identifier mock đã tồn tại chưa.
2. Repository ánh xạ method email/phone sang channel email/sms rồi gọi shared `verificationService.start` với purpose `registration`.
3. Mock verification chỉ gọi `onVerified` sau khi OTP đúng. Callback ghi `{token, purpose, channel, recipientValue}` vào registry; password không có trong record này.
4. `registrationService.complete` recheck password policy, rồi yêu cầu registry tiêu thụ proof khớp chính xác với draft.
5. Proof hợp lệ bị xóa khỏi registry. Sau đó mock kiểm tra duplicate race trước khi thêm identifier vào tập account đã đăng ký.

Mỗi verification request chỉ publish proof một lần. Nếu người dùng gọi lại verify trên cùng challenge, service có thể trả lại cùng opaque token cho caller nhưng callback không publish lại proof đã bị registration consume.

## 4. Bảo vệ dữ liệu nhạy cảm

- Password không được đưa vào verification challenge, proof registry, registered identifier set hoặc callback tạo duplicate race.
- Không có `console.log`, `localStorage` hoặc persistence cho password/token.
- Challenge chỉ chứa recipient đã che; test kiểm tra serialized result không có full identifier hoặc password.
- Mock chỉ so khớp identifier chính xác, chưa lowercase email hoặc normalize phone. Đây là chủ ý để không tự tạo quy tắc uniqueness chưa được SRS/backend xác nhận.

## 5. Lỗi thực tế và cách khắc phục

### Lỗi 1 — gọi sai API của password policy

Lệnh phát hiện:

```text
npm test -- src/features/registration/repositories/mock-registration-environment.test.ts ...
npm run typecheck
```

Thông báo chính:

```text
TypeError: isPasswordValid is not a function
TS2305: Module '@/shared/security/password-policy' has no exported member 'isPasswordValid'.
```

Nguyên nhân gốc: mock adapter dùng tên helper theo trí nhớ, trong khi API thật của shared policy là `satisfiesPasswordPolicy`. Runtime import trở thành `undefined`; khi gọi nó, test ném `TypeError`. TypeScript đồng thời chỉ đúng lỗi export nên đây không phải lỗi Vitest riêng lẻ.

Cách kiểm tra giả thuyết: mở `src/shared/security/password-policy.ts` và đối chiếu các export cùng test hiện hữu.

Cách sửa: thay import/call bằng `satisfiesPasswordPolicy`. Sau sửa, ba test từng lỗi runtime đều qua.

### Lỗi 2 — helper MSG14 có union quá rộng

Thông báo chính:

```text
TS2322: Type 'CompleteRegistrationResult | StartRegistrationResult'
is not assignable to type 'StartRegistrationResult'.
```

Nguyên nhân gốc: object MSG14 hợp lệ ở cả start và complete, nhưng helper khai báo trả toàn bộ hai union. Kiểu đó còn bao gồm `registered` và `verification-started`, nên compiler không thể chắc một call cụ thể luôn trả variant MSG14.

Cách sửa: dùng `Extract<StartRegistrationResult, { reason: "identifier-already-registered" }>` để helper chỉ trả đúng variant chung. Đây là thu hẹp type theo discriminant, không ép kiểu bằng `as`.

### Lỗi 3 — import thừa làm lint thất bại

`CompleteRegistrationInput` được import nhưng không dùng, tạo warning; project dùng `--max-warnings=0` nên warning cũng làm command fail. Import được xóa thay vì hạ chuẩn lint.

## 6. Quyết định còn chờ

1. Phone dùng định dạng nội địa, E.164 hay nhận cả hai và normalize về một canonical form.
2. Email uniqueness có case-insensitive và trim/normalize ở client hay hoàn toàn do backend trả canonical identifier.
3. Verification proof sống bao lâu sau khi OTP thành công; mock hiện không tự đặt một TTL chưa được xác nhận.
4. Backend dùng endpoint registration-start riêng hay frontend gọi UC08 start rồi registration-complete.
5. Reload giữa OTP bắt đầu lại hay dùng pending-registration handle; password sẽ không được lưu localStorage.

## 7. Defense Q&A

**Vì sao cần registry proof trong mock nếu backend mới là nơi xác thực token?**

Registry chỉ mô phỏng invariant của backend để UI test đúng thứ tự: OTP đúng trước, tạo account sau. Khi nối QA API, HTTP adapter gửi opaque token cho backend và registry mock không tham gia production request.

**Vì sao token phải ràng buộc cả purpose, channel và identifier?**

Một proof xác minh email A cho khôi phục mật khẩu không được dùng để đăng ký số điện thoại B. Ràng buộc context ngăn tái sử dụng proof sai nghiệp vụ.

**Vì sao mock kiểm tra password policy lần nữa khi form đã validate?**

Validation UI giúp người dùng sửa lỗi sớm, nhưng data boundary không nên tin rằng mọi caller đều đi qua form. Việc recheck mô phỏng nguyên tắc backend luôn xác thực lại dữ liệu đầu vào.

## 8. Bằng chứng kiểm tra

- 22 test files, 110/110 tests qua.
- `npm run typecheck` qua.
- `npm run lint` qua.
- `npm run build` qua; danh sách production route vẫn chỉ có `/`, `/dashboard` và `/login`, nên micro-task này chưa vô tình mở route đăng ký chưa hoàn chỉnh.
- `git diff --check` qua.
