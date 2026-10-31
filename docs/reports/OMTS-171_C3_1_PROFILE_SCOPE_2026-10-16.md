# OMTS-171 C3.1 — Profile scope and state review

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: đọc nguồn, khóa ranh giới nghiệp vụ và chia state; chưa tạo route `/account`

## 1. Nguồn đã đối chiếu

- [OMTS-171 — WEB UC05 / SCR-05](https://welterial.atlassian.net/browse/OMTS-171)
- [OMTS-141 — UC05 story](https://welterial.atlassian.net/browse/OMTS-141)
- [OMTS-170 — Profile API](https://welterial.atlassian.net/browse/OMTS-170)
- [OMTS-172 — Mobile sibling](https://welterial.atlassian.net/browse/OMTS-172)
- [OMTS-173 — QA cases](https://welterial.atlassian.net/browse/OMTS-173)
- `Report3Finnal.md`: UC05, UC08, SCR-05, BR-31 đến BR-34, MSG01, MSG04, MSG06, MSG10, MSG16, MSG19, MSG20, MSG57 và MSG62.
- Source hiện tại: authenticated shell, auth session, shared SCR-02 verification, message catalog và mock/service/repository conventions.

Rovo search tìm được story cha nhưng không trả trực tiếp ticket Web. Các subtask được lấy bằng JQL `parent = OMTS-141`, sau đó đọc nội dung ticket theo key.

## 2. Phạm vi đã xác nhận

Mọi người dùng đã đăng nhập gồm System Administrator, Cooperative Owner, Staff và Trader đều có khu vực hồ sơ cá nhân. Màn hình phải:

- cho sửa display name, email và phone;
- hiển thị username và role/scope ở dạng chỉ đọc;
- không dùng role hiển thị để suy ra permission;
- giữ email/phone cũ cho đến khi giá trị mới được xác minh thành công và save thành công;
- dùng proof UC08 gắn với đúng purpose, channel và giá trị mới;
- gửi `rowVersion`/record version khi save để backend phát hiện cập nhật đồng thời;
- giữ nguyên permission, công nợ, payroll, document history và liên kết Employee/Customer;
- hiển thị MSG10 khi save thành công, MSG06 khi version cũ và MSG19 khi session hết hạn hoặc account vừa bị khóa.

Đối với Trader, backend chịu trách nhiệm liên kết offline customer profile theo BR-34. Frontend chỉ hiển thị MSG57 khi backend trả kết quả không thể tự liên kết; frontend không tự tìm hoặc gộp customer profile.

## 3. Vì sao email và phone không phải input thông thường

Display name có thể đi thẳng vào draft và save. Email/phone là login identifier và recovery channel nên thay đổi chúng cần hai bằng chứng:

1. người dùng yêu cầu gửi code tới giá trị mới;
2. UC08 trả proof xác nhận code đúng và proof đó được gửi cùng lệnh save.

Việc chỉ đổi text trong input không được làm thay giá trị đang có hiệu lực. UI cần phân biệt rõ:

- `current value`: giá trị backend đang dùng;
- `candidate value`: giá trị mới người dùng đang nhập;
- `verified candidate`: candidate đã có proof nhưng chưa save;
- `saved value`: backend đã chấp nhận proof và trả profile/version mới.

Proof chỉ nằm trong React memory. Không đưa OTP hoặc proof vào URL, localStorage hay log.

## 4. State model dự kiến

```text
loading
  -> ready(profile + recordVersion)
       -> editing(display name / candidate identifiers)
       -> verifying-email(challenge)
       -> verifying-phone(challenge)
       -> saving
       -> saved(profile + new recordVersion)
       -> conflict(MSG06; chờ người dùng tải bản mới)
       -> session-expired(MSG19; auth shell đưa về login)
  -> load-error(retry)
```

`role/scope` là dữ liệu trình bày chỉ đọc từ profile response. Effective permission của menu vẫn lấy từ auth/access boundary; hai dữ liệu không được trộn thành một global role.

## 5. Validation đã rõ và điểm còn mở

Đã rõ:

- display name bắt buộc;
- email mới phải có cú pháp email và khác giá trị hiện tại;
- phone mới bắt buộc, phải khác giá trị hiện tại;
- backend kiểm tra uniqueness toàn hệ thống trước khi gửi code và khi save;
- username không xuất hiện dưới dạng editable input.

Còn mở:

- SRS không chọn phone nội địa, E.164 hay cho phép cả hai;
- API field names, row-version serialization, proof TTL và HTTP status mapping chưa có;
- khi conflict xảy ra sau khi identifier đã verified, SRS không nói proof có còn được tái sử dụng sau reload hay phải xác minh lại.

Frontend chưa tự đặt regex hoặc cơ chế tái sử dụng proof. Phần không phụ thuộc các quyết định này vẫn có thể triển khai bằng typed contract và mock adapter.

## 6. Component/data boundary

```text
/account page
  -> ProfileExperience
       -> ProfileService
            -> ProfileRepository (mock hôm nay, HTTP sau)
       -> shared VerificationForm
            -> VerificationService
                 -> VerificationRepository
```

Profile component không đọc mock trực tiếp. Mock environment phối hợp profile repository và verification repository để proof được ràng buộc đúng giá trị mới, nhưng UI chỉ thấy service contract.

## 7. Defense Q&A

**Tại sao email/phone đã xác minh vẫn phải bấm Lưu?**

Xác minh chỉ chứng minh người dùng kiểm soát địa chỉ/số mới. Save mới áp dụng toàn bộ draft, kiểm tra version và ghi audit atomically. Tách hai việc giúp tránh đổi một phần profile khi phần còn lại bị conflict.

**Tại sao role hiển thị không dùng để ẩn/hiện chức năng?**

Một Staff account có thể có nhiều cặp zone–role. Role text trong hồ sơ chỉ để người dùng đọc; quyết định truy cập phải dùng effective permissions và scope do backend tính.

**Frontend có tự gộp hồ sơ Trader không?**

Không. Matching và merge liên quan dữ liệu lịch sử, phải do backend thực hiện theo BR-34. Frontend chỉ trình bày outcome/MSG57.

## 8. Kết luận micro-task

C3.1 hoàn thành ở mức source review. Lát code an toàn tiếp theo là C3.2: định nghĩa profile domain, schema và typed outcome mà chưa giả định URL hoặc JSON của QA API.
