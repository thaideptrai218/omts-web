# OMTS-163 — C2.6–C2.7 Verification reuse and cancellation

## Kết quả

Đã tách logic nhập OTP, resend, countdown và MSG16 thành `VerificationForm`. Dialog SCR-02 hiện tại và trang recovery dùng chung form này, nên cùng tuân theo 6 chữ số, 5 lần nhập, 3 lần gửi và cooldown 60 giây của verification policy.

Đã thêm `cancel(requestId)` vào verification và recovery service/repository boundary. Khi chọn “Đổi cách nhận mã”, UI hủy request hiện tại trước khi quay về form nhập định danh. Mock xóa request nên mã cũ trả `request-not-found`; nút đổi phương thức có pending state để tránh double-click.

## Lỗi thực tế và cách sửa

Patch đầu tiên không áp dụng vì test suite thực tế dùng tên `describe("mock verification repository")`, khác chuỗi context dự kiến. `apply_patch` dừng trước khi sửa file, nên không có trạng thái nửa vời. Đã đọc đúng đầu file và chia patch thành phần domain/service trước, test sau; tất cả compile và test xanh.

## Bằng chứng

- Test xác nhận request đã cancel không còn verify được.
- Test environment xác nhận đổi identifier làm mã cũ vô hiệu.
- 35 test thuộc verification + account-recovery xanh sau refactor.
- Dialog cũ tiếp tục typecheck/build thành công.

## Tự đánh giá

Ranh giới hủy request đã rõ nhưng HTTP endpoint và semantics idempotent của backend chưa có. Adapter API sau này phải map trạng thái “đã hủy hoặc không còn tồn tại” về hành vi công khai giống nhau.
