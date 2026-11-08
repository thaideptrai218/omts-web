# Thao tác chu kỳ nuôi

Tiếp nối màn tra cứu `/farming/cycles`, dùng contract `origin/feature/OMTS-220-cycles`.

- Mở chu kỳ từ các bè có `canStart`; nhập ngày bắt đầu, lượng giống dự kiến, ngày thu hoạch dự kiến và sản lượng mục tiêu.
- Sửa kế hoạch từ tiến độ chu kỳ có `canEdit`; gửi nguyên `rowVersion` đã đọc.
- Hủy chu kỳ mở nhầm khi backend trả `canCancel`, người dùng có quyền Delete và xác nhận thao tác; gửi `rowVersion`.
- BFF kiểm CSRF, schema lệnh, phiên đăng nhập và quyền Create/Edit/Delete tương ứng. Backend kiểm phạm vi vùng và điều kiện nghiệp vụ.
- Lỗi giữ form; kết quả không chắc chắn khóa lệnh, không tự gửi lại. Thành công tải lại danh sách chu kỳ.
- Kết quả trả về phải đúng cycle ID khi sửa hoặc raft ID khi mở mới.

Lint, typecheck và production build đạt. Không kiểm thử ghi dữ liệu trên backend đang chạy hoặc browser. Nhật ký chăm sóc/upload ảnh vẫn chưa triển khai trong đợt này.
