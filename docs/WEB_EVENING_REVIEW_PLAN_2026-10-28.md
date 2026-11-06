# Hoàn thiện các luồng Web cho buổi kiểm tra 28/10

Mục tiêu là đi hết các luồng quản trị hiện có bằng mock, không tuyên bố toàn bộ SRS hay API đã hoàn thành. Baseline e9f1bdb; giữ các sửa hồ sơ/thông báo/Dialog đang local để review chung, không ghi đè chúng.

## Từng bước và tiêu chí

1. Đọc lại OMTS-201 và parent118, đối chiếu quyết định đã chốt. Giữ ba vai trò cố định, liên hệ email HOẶC SĐT, lưu hồ sơ nhân viên trước rồi tạo account. Không tự sửa Jira/SRS/backend.
2. Review P7 hồ sơ/thông báo/Dialog local. Chạy các test vòng đời, pending, đóng/mở, đổi account và focus; ghi rõ bằng chứng mới khác snapshot27/10.
3. Sửa gửi OTP đổi liên hệ: đóng/mở form không nhận kết quả của lần cũ; validation về sau unmount không gửi yêu cầu. Không đổi TTL/OTP, phone validation hoặc quy tắc lưu liên hệ đã xác minh.
4. Hoàn thiện đổi mật khẩu: bắt lỗi kết nối, giữ form để sửa; bỏ phản hồi của form đã đóng, xóa mật khẩu khi đóng, không gửi sau unmount. Chặn đóng popup khi lệnh đã bắt đầu. Giữ current-password proof và quy tắc mật khẩu.
5. Hoàn thiện lưu hồ sơ: không để phản hồi cũ cập nhật tên/sidebar hoặc báo MSG19/toast sau khi rời trang; không cho sửa tiếp trong lúc đang lưu. Giữ version và verified proof.
6. Kiểm thử OTP dùng chung: không verify/resend đồng thời hoặc dùng kết quả của form đã đóng. Giữ số lượt, cooldown và thông báo hiện có.
   - Bổ sung theo quyết định mới: xác minh đúng liên hệ hiện có chưa verified, OTP → chờ lưu → lưu; không cho dùng intent này để chọn liên hệ tùy ý.
   - Khi audit hồ sơ HTX: sửa vòng đời load/retry/MSG02 độc lập, giữ ngân hàng theo lựa chọn chờ BA; không tự đổi public QR/logo.
7. Chạy lint, typecheck, full test, build, HTTP smoke tuần tự. Dựng bản preview riêng, không phá server3000, kiểm luồng và responsive360/1024 bằng browser.
8. Cập nhật báo cáo, guide tiếng Anh và bài học tiếng Việt local; nêu chức năng đã đi hết, lỗi đã sửa và giới hạn. Không tự đánh Jira Done hoặc merge develop.
9. Finding native phát sinh: form login còn credentials khi quay lại sau logout. Xóa form sau accepted, dọn gate sau onboarding; test giữ component mounted và kiểm lại bằng production browser, không đổi Cache Components/session policy.

## Kết quả lượt hoàn thiện

Các bước1–9 đạt trong phạm vi được mô tả;39 test mới cùng14 test P7 local, tổng2.302 PASS/31 Redis SKIP; lint/typecheck/build18/18/24 HTTP đạt. Browser kiểm xác minh email hiện có→save→login bằng email, thông báo save/reopen/focus và logout về form trống trên build cuối. [Báo cáo](reports/WEB_EVENING_REVIEW_COMPLETION_2026-10-28.md) ghi RED/GREEN, lỗi tooling và phần chưa triển khai. Đây là phạm vi mock/current flows, không tick Done toàn Jira hoặc tự nhận có API/logo/module vận hành.

## Giới hạn đã chốt

API thật/refresh vẫn tắt. MSG06 và tên MSG24 chờ backend. GitGuardian để sau. Không thêm đăng ký Thương lái Web, cron/cache/session policy hoặc module nuôi/thu chi chưa có yêu cầu rõ. Các lỗi cần đổi nghiệp vụ sẽ ghi bằng chứng và hỏi trước.
