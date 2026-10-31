# OMTS-193 — D3.3 Route và UI SCR-10

## Màn hình

Route production: `/access/roles`.

Màn gồm tiêu đề/hướng dẫn ngắn, nút Thêm/Sao chép, danh sách role có filter trạng thái, editor metadata, impact summary và permission matrix. Role Discontinued chỉ đọc nhưng vẫn có thể dùng làm nguồn copy. Không có nút Delete hoặc luồng Reactivate vì ticket không yêu cầu và backend scope ghi rõ discontinue/no delete.

## Responsive và accessibility

- 360–1280 px: mỗi function là disclosure card; summary cho biết số quyền đã chọn.
- Từ 1536 px: bảng semantic để so sánh action; breakpoint muộn tránh thanh cuộn ngang khi sidebar và role list cùng hiện.
- Checkbox/select là native control, label có tên function, target tối thiểu 44 px.
- Unsupported cell ghi “Không áp dụng”, không truyền trạng thái chỉ bằng màu.
- Validation focus vào name hoặc feature row tương ứng.
- Impact dialog liệt kê display name, username và zone; initial focus đặt ở “Kiểm tra lại”.
- Role list dùng đúng `ul/li/button`; không ghi đè semantic button bằng role giả.

## Browser flow đã kiểm tra

- Copy “Quản lý vùng” tạo role mới và không ảnh hưởng source.
- Chọn Delete cho Bè nuôi tự bật/khóa View.
- Thiếu scope báo lỗi tại đúng feature và focus DETAILS row.
- Sửa role có 2 holder mở MSG09 dialog, hiển thị Nguyễn Văn An/Khu Đông và Trần Thị Bình/Khu Đông, Khu Nam; xác nhận mới lưu.
- Discontinue role đang dùng bị MSG11 chặn và hiện holder; role không có holder chuyển sang “Đã ngừng”.
- Không overflow toàn trang tại CSS viewport 360 px và 1024 px.
