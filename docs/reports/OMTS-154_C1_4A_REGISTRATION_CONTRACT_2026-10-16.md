# OMTS-154 C1.4a — Registration start/complete contract

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: domain/service/repository contract; chưa có mock adapter hoặc HTTP DTO

## 1. Cái gì

Luồng đăng ký được tách thành hai operation có kiểu độc lập:

1. `start(draft)` chỉ khởi tạo bước xác minh và trả challenge, MSG14 hoặc MSG04.
2. `complete({ draft, verificationToken })` mới có thể tạo account và trả `registered`.

MSG14 được bổ sung vào message catalog với nội dung không nói identifier đã thuộc account nào.

## 2. Tại sao

UC01 và backend ticket `OMTS-153` yêu cầu verification token purpose Registration cho cùng identifier trước khi account được tạo. Nếu một hàm submit vừa gửi OTP vừa tạo account, code khó chứng minh rằng account chưa tồn tại trước verification.

Typed union còn buộc reason đi cùng đúng message code. Ví dụ `identifier-already-registered` chỉ đi với MSG14; adapter trả nhầm MSG01 sẽ bị TypeScript báo.

## 3. Data flow

Registration form tạo draft trong memory. `start` kiểm tra/khởi tạo verification và trả `VerificationChallenge`. Shared SCR-02 resend/verify challenge. Khi nhận `VerificationToken`, flow gọi `complete` với draft ban đầu và token. Chỉ kết quả `registered` mới được chuyển về login.

Password không đi vào URL, localStorage, log hoặc verification challenge. Nó chỉ nằm trong draft memory và input hoàn tất đăng ký.

## 4. Decision pending

1. Backend có một endpoint start registration riêng hay frontend gọi UC08 start trực tiếp rồi gọi registration complete?
2. Khi reload giữa OTP, người dùng phải đăng ký lại hay backend cấp pending-registration handle để khôi phục flow? Không lưu password vào localStorage để “tiếp tục tiện hơn”.
3. Verification token sống bao lâu và complete trả lỗi nào khi token đúng purpose nhưng hết hạn?
4. Success response có account id/display data hay chỉ cần 204; frontend hiện chỉ cần trạng thái `registered`.

Các điểm này cần OpenAPI/backend xác nhận trước HTTP adapter. Domain hiện không đặt tên endpoint hoặc field DTO.

## 5. Defense Q&A

**Vì sao complete vẫn có MSG14 khi start đã kiểm tra trùng?**

Giữa start và complete, một phiên khác có thể đăng ký cùng identifier. Backend phải kiểm tra uniqueness lại tại transaction cuối và frontend cần xử lý race đó an toàn.

**Vì sao verification token không được lưu?**

Đó là proof ngắn hạn gắn với purpose/channel/recipient. Lưu lâu làm tăng nguy cơ bị tái sử dụng; flow chỉ chuyển token trực tiếp sang complete.

## 6. Kiểm tra

- Service start không gọi complete.
- Verification token chỉ được truyền ở complete.
- Typed results giữ đúng MSG01/04/14/16.
- Không có HTTP URL, localStorage hoặc logging credential trong bước này.
