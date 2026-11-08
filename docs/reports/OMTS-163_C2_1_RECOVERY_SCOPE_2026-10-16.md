# OMTS-163 C2.1 — Recovery scope and anti-enumeration review

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: đọc nguồn và khóa luồng; chưa sửa product code hoặc tạo route `/recover`

## 1. Nguồn đã đối chiếu

- [OMTS-163 — WEB UC03 / SCR-04](https://welterial.atlassian.net/browse/OMTS-163)
- [OMTS-139 — UC03 story](https://welterial.atlassian.net/browse/OMTS-139)
- [OMTS-162 — recovery start/reset API](https://welterial.atlassian.net/browse/OMTS-162)
- [OMTS-165 — QA cases](https://welterial.atlassian.net/browse/OMTS-165)
- [OMTS-150 — shared verification dialog](https://welterial.atlassian.net/browse/OMTS-150)
- `Report3Finnal.md`: UC03, UC08, SCR-04, BR-31, MSG01, MSG15 và MSG16.
- Source hiện tại: shared verification UI/domain, shared password policy và login page chưa có link `/recover`.

Rovo search không trả kết quả cho truy vấn tên ticket, nên issue đã được đọc trực tiếp theo key và các sibling được lấy bằng JQL `parent = OMTS-139`.

## 2. Cái gì đã được xác nhận

UC03 là luồng anonymous cho Trader, Cooperative Owner và Staff:

1. Người dùng nhập verified email hoặc phone của account.
2. Hệ thống luôn hiển thị MSG15 giống nhau.
3. UC08 gửi/kiểm tra code với purpose `recovery`.
4. Chỉ sau verification success mới mở bước mật khẩu mới.
5. Reset thành công thay password, ghi nhận recovery, revoke mọi session cũ và đưa người dùng về login.

Nếu password mới sai rule hoặc confirmation không khớp, UI hiển thị MSG01 nhưng phải giữ proof nếu proof vẫn còn hiệu lực. Sai/hết hạn/quá số lần OTP dùng MSG16 và không được mở bước đặt password.

## 3. Tại sao anti-enumeration quan trọng

Account enumeration xảy ra khi người ngoài thử nhiều email/phone rồi suy ra account nào tồn tại từ message, status code, màn hình kế tiếp hoặc thời gian phản hồi. Với OMTS, biết một số điện thoại thuộc Owner hoặc nhân viên cũng đã là rò rỉ dữ liệu và tạo đầu vào cho phishing.

Vì vậy Jira yêu cầu response giống nhau cho năm trường hợp:

- identifier hợp lệ và có account;
- identifier không tồn tại;
- identifier tồn tại nhưng chưa verified;
- account bị locked hoặc không đủ điều kiện self-service;
- dịch vụ gửi code thất bại.

Frontend không chỉ dùng cùng câu MSG15; trạng thái nút, bước tiếp theo và timing nhìn thấy cũng không được biến thành tín hiệu phân biệt.

## 4. Luồng “Đổi cách nhận mã”

SRS UC03 nhánh 3a xác nhận người dùng tự nhập verified identifier khác của cùng account. Backend hủy unused code của request trước rồi xử lý lại từ bước kiểm tra identifier.

UI không được hiển thị danh sách kiểu `du***@...` hoặc `***1234` lấy từ account. Một danh sách như vậy vừa xác nhận account tồn tại vừa tiết lộ số phương thức liên hệ. Blueprint đã được sửa để action đưa người dùng về bước nhập identifier.

## 5. Khoảng trống contract phải chờ quyết định/backend

### Recovery handle không làm lộ eligibility

UI cần một handle/request id để resend, verify và cancel. Nhưng backend ticket đồng thời yêu cầu response giống nhau khi không có code thật được gửi. Chưa rõ API sẽ:

- luôn trả một opaque public handle kể cả request giả;
- dùng cùng cooldown/sends metadata cho request thật và giả;
- xử lý verify/resend/cancel trên dummy request thế nào để response và timing không tiết lộ account.

Frontend chưa tự tạo field hoặc status code cho cơ chế này.

### Identifier validation

SRS không chốt phone nội địa, E.164 hay cả hai. Recovery phải dùng cùng canonical phone contract với registration/login; chưa thêm regex riêng.

### Proof lifetime và reset success copy

SRS nói giữ verification result khi password invalid “while it remains valid” nhưng không nêu TTL riêng của proof sau OTP. UC03 cũng yêu cầu success rồi về login nhưng không chỉ định MSG code/canonical copy. Hai điểm này chưa được mã hóa tùy ý.

### Back/reload behavior

Chưa rõ reload ở bước OTP hoặc password mới có khôi phục bằng recovery handle hay bắt đầu lại. Password và proof không được lưu vào localStorage để tự giải quyết khoảng trống này.

## 6. Component/state định hướng

Màn `/recover` sẽ là một card có stepper ba nhãn: `Thông tin → Xác minh → Mật khẩu mới`. Mỗi thời điểm chỉ render nhiệm vụ hiện tại để người dùng ít kinh nghiệm không phải xử lý một form dài.

State dự kiến ở mức khái niệm:

```text
identifier-entry
  → verification-pending
  → password-entry
  → success / login
```

`verification-pending` không đồng nghĩa frontend biết account tồn tại; đó chỉ là trạng thái public của recovery flow. Chỉ proof thành công mới cho phép chuyển sang `password-entry`.

## 7. Defense Q&A

**Tại sao cùng MSG15 vẫn chưa đủ chống account enumeration?**

Vì attacker còn quan sát status code, màn hình kế tiếp, countdown, resend và thời gian phản hồi. Toàn bộ hành vi public phải khó phân biệt, không chỉ riêng nội dung câu chữ.

**Tại sao không cho người dùng chọn từ email/phone đã che để tiện hơn?**

Ở màn anonymous, danh sách đó xác nhận account và tiết lộ contact metadata. SRS yêu cầu người dùng tự nhập identifier khác mà họ đã biết.

**Frontend có chịu trách nhiệm revoke session cũ không?**

Không. Backend phải thay password và revoke mọi session trong cùng use case bảo mật. Frontend chỉ gửi recovery proof + password mới và chuyển về login sau kết quả thành công.

## 8. Kết luận micro-task

C2.1 hoàn thành ở mức source review. Chưa có code runtime nên không thay đổi route/build. Bước code an toàn kế tiếp là C2.2b: schema new password + confirmation dùng shared password policy; nó không phụ thuộc phone format hoặc recovery API DTO.
