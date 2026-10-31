# OMTS Web — tiến độ đồng bộ Auth/Onboarding ngày 20/10/2026

## Trạng thái nguồn quyết định

Bộ rule do Duy Thái chấp thuận đã được dùng để điều chỉnh frontend mock/domain. Đây vẫn là đề xuất frontend chờ BA/PM và Backend xác nhận; báo cáo này không thay đổi SRS hoặc Jira và không tuyên bố các ticket QA API đã Done.

## Micro-task 1 — Domain onboarding Staff

Đã thay gate đổi mật khẩu rời rạc bằng `staff-onboarding-required`, trong đó type chỉ cho phép hai trạng thái tuần tự: đổi temporary password, sau đó xác minh email hoặc phone đã được Owner khai báo.

Trader vẫn giữ phone-verification gate riêng vì đề xuất hiện tại chỉ áp dụng cho Staff do Cooperative Owner tạo. Application session vẫn chỉ xuất hiện ở `access-granted`; onboarding token/cookie chưa được giả định.

## Micro-task 2 — Owner tạo/reset Staff không nhìn thấy password

Đã cập nhật màn Tài khoản nội bộ theo đề xuất:

- Owner nhập họ tên nhân viên, không nhập username;
- email hoặc phone phải có ít nhất một;
- Owner chọn channel nhận thông tin kích hoạt;
- mock repository tự sinh username từ họ tên và hậu tố unique;
- username giữ nguyên khi họ tên được cập nhật;
- phải có ít nhất một AccessGrant trước khi lưu;
- create/reset chỉ trả delivery receipt, không trả clear temporary password;
- hạn temporary password trong mock là 72 giờ;
- Owner xem/copy username và trạng thái gửi.

Mock username dùng hậu tố tăng dần để test ổn định. Đây không phải thuật toán Backend production.

## Lỗi thực tế đã phát hiện và sửa

Next.js 16 báo `instant-unrendered-segment` cho Dashboard và Account Management vì protected content chờ client auth bootstrap. Đã đặt `instant = false` tại đúng hai page theo tài liệu Next.js trong repo. Sau restart và điều hướng lại, browser console sạch.

## Bằng chứng hiện tại

- Auth focused tests: 22 pass.
- Account-management focused tests: 17 pass.
- Toàn bộ test suite: 51 files, 237 tests pass.
- Typecheck, lint và production build: pass.
- Browser smoke test hoàn tất ở desktop và vùng hiển thị xấp xỉ 360 px.
- Dialog kết quả tạo account không chứa hoặc render temporary password.

## Chưa hoàn thành

- Chưa có QA API/OpenAPI cho login, onboarding resume, session upgrade và credential delivery.
- Chưa có route onboarding thật, reload progress hoặc onboarding session.
- Chưa có retry delivery; UI hiện mới biểu diễn trạng thái failed để không nói sai rằng account chưa được tạo.
- Chưa chốt thuật toán username, phone normalization và payload HTTP.
- Chưa cập nhật Jira vì người dùng yêu cầu chỉ triển khai code/tài liệu repo ở bước này.

## Micro-task tiếp theo đề xuất

## Micro-task 3 — Staff onboarding shell và đổi mật khẩu tạm thời

Đã gắn `StaffOnboardingShell` trực tiếp vào luồng `/login`, không tạo route showcase hoặc route onboarding giả. Màn hình hiện tên đăng nhập đã gửi ở dạng chỉ đọc, checklist hai bước và form đổi mật khẩu ở forced mode.

`AuthRepository` có operation domain `changeTemporaryPassword` nhưng không định nghĩa endpoint, cookie, token hay DTO. Mock repository giữ một onboarding context giới hạn trong bộ nhớ. Nếu không có context thì trả MSG19; mật khẩu tạm sai trả MSG17; mật khẩu mới sai policy trả MSG01. Chỉ outcome MSG18 mới chuyển state machine sang `verify-contact` và giữ nguyên các contact channel được Owner khai báo.

Kiểm tra thực tế:

- nhập sai mật khẩu tạm hiển thị MSG17 và focus lại đúng field;
- nhập đúng chuyển checklist bước 1 sang hoàn tất và mở bước xác minh liên hệ;
- thông báo thành công MSG18 xuất hiện;
- browser console không có error/warning ứng dụng;
- 52 test files, 241 tests pass;
- lint, typecheck, build và `git diff --check` pass.

Giới hạn: lần kiểm tra browser này ở desktop 1280 px; cần kiểm tra riêng 360 px sau khi ghép SCR-02 để đánh giá toàn bộ bước OTP, không chỉ shell.

## Micro-task tiếp theo đề xuất

## Micro-task 4 — Xác minh liên hệ và cấp application session

Đã thay phần mô tả không tương tác bằng luồng hoàn chỉnh trong mock:

- Staff chọn một trong các channel Owner đã khai báo;
- hệ thống tạo SCR-02 challenge và chỉ hiển thị recipient đã che;
- form có OTP 6 số, thời hạn, resend countdown, số lượt gửi và đổi channel;
- proof được ràng buộc với purpose/channel/recipient và chỉ dùng một lần;
- application session chỉ được tạo sau khi proof hợp lệ;
- hoàn tất thành công điều hướng tới `/dashboard` với quyền Staff theo vùng.

Browser smoke test đã đi từ `staff-first-login` / `demo123`, đổi sang `newpass8`, chọn email, nhập OTP mock `123456` và vào Dashboard dưới tên “Nhân viên vùng Đông”. Console không có application error/warning.

Focused test ban đầu thất bại vì frontend tự thêm `staff-onboarding-contact` vào catalog purpose được khóa theo backend UC08. Thay đổi đó đã được rút lại. Mock adapter tạm ánh xạ onboarding vào `phone-after-login`; đây không phải contract production. Backend cần xác nhận purpose trung tính cho cả email và phone trước tích hợp QA.

Bản mock cũng có tài khoản `staff-verified` / `demo123` để review trực tiếp trạng thái đã kích hoạt. Với tài khoản đi qua onboarding, trạng thái xác minh được giữ trong vòng đời mock repository nên lần đăng nhập tiếp theo bằng mật khẩu mới đi thẳng vào ứng dụng.

Bằng chứng sau sửa: 53 test files, 245 tests pass; typecheck, lint, build và diff check đều pass.

## Micro-task tiếp theo đề xuất

Kiểm tra responsive toàn bộ onboarding ở viewport 360 px, sau đó thiết kế cơ chế resume/reload và mapper API chỉ khi Backend cung cấp session/next-action contract. Không chuyển Jira Done khi vẫn chỉ chạy mock.
