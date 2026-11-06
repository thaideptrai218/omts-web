# OMTS-154 C1.1 — Registration method boundary

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: Context → Design → domain nhỏ; chưa dựng route/form và chưa gọi API

## 1. Nguồn đã đối chiếu

- Jira `OMTS-154`: chọn email hoặc phone, password + confirmation, tiếp tục SCR-02 và thành công quay về SCR-03; Done khi chạy với QA API.
- Story `OMTS-137`: actor là Trader; account chỉ được tạo sau xác minh, không nhận internal permission và không cho claim lịch sử cũ trên màn đăng ký.
- Dependency `OMTS-150`: SCR-02 nhận purpose, recipient và trả verification token; ticket đang In Progress và block `OMTS-154`.
- SRS UC01, SCR-01, BR-31, BR-32: verified email/phone là duy nhất toàn hệ thống; đăng ký bằng phone dùng SMS, đăng ký bằng email dùng Email Service.

Figma/wireframe chỉ là nguồn tham khảo. Các trường họ tên, ngày sinh và giới tính cũ không được đưa vào baseline vì Jira/SRS hiện tại không bắt buộc chúng.

## 2. Thay đổi

Tạo `registrationMethods = ["email", "phone"]` dưới dạng literal tuple và type union tương ứng. Hàm `getRegistrationVerificationChannel` ánh xạ:

- `email` → `email`;
- `phone` → `sms`.

Tên phương thức nghiệp vụ và tên kênh kỹ thuật được tách riêng: người dùng chọn “số điện thoại”, nhưng UC08 gửi qua kênh “SMS”.

## 3. Lý do kiến trúc

Không dùng một identifier chung rồi tìm ký tự `@` để đoán kênh. UC01 yêu cầu người dùng chủ động chọn phương thức, vì vậy lựa chọn đó phải đi xuyên suốt luồng như dữ liệu có kiểu. Cách này cũng ngăn UI vô tình gửi OTP sai kênh khi một chuỗi có định dạng chưa hoàn chỉnh.

Domain chỉ import type `VerificationChannel`; nó không gọi repository, mock hay React. Do đó mapping có thể được test độc lập và dùng lại khi C1.5 compose SCR-02.

## 4. Điểm chưa chốt

SRS yêu cầu số điện thoại đúng định dạng nhưng chưa nói baseline là số Việt Nam 10 chữ số hay E.164. C1.1 không thêm regex. Quyết định này cần backend/OpenAPI hoặc xác nhận của nhóm trước C1.2 để frontend và API không từ chối hai tập giá trị khác nhau.

## 5. Defense Q&A

**Tại sao không để component segmented control trả thẳng `sms`?**

Vì UI đang biểu diễn phương thức đăng ký “số điện thoại”, còn `sms` là kênh gửi của UC08. Tách hai khái niệm giúp domain đúng ngôn ngữ nghiệp vụ và vẫn map rõ sang tích hợp kỹ thuật.

**Type union giúp gì hơn string?**

TypeScript sẽ báo lỗi nếu code truyền một phương thức ngoài `email | phone`; test khóa thêm mapping để thay đổi sau này không âm thầm gửi sai channel.

## 6. Tiêu chí kiểm tra

- Có đúng hai phương thức theo UC01.
- Mỗi phương thức map sang đúng UC08 channel.
- Không có route, API DTO, regex phone hoặc field profile nào được tự thêm trong bước này.
