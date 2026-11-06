# Khung tài khoản và hồ sơ

- /account và /account/security cùng dùng PersonalApiScreen, gồm Hồ sơ, Đổi mật khẩu, Thông báo. Route security chọn sẵn phần đổi mật khẩu.
- Chuyển ba mục trong khung giữ component đã mở, do đó giữ nháp hồ sơ và tùy chọn thông báo; nút đổi mật khẩu cuối hồ sơ cũng chuyển nội bộ.
- Gom hồ sơ vào một khung hai cột: tên/liên hệ bên trái, thông tin chỉ xem và vùng/quyền bên phải. Mobile một cột.
- Không thay đổi OTP, lưu liên hệ từng phần, rowVersion, quyền hoặc xử lý kết quả chưa rõ.
- Kiểm thử giữ nháp profile khi chuyển tab đạt. Chưa visual QA browser trong lượt này.

Không commit/push.
