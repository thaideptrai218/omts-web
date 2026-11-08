# Công việc thanh toán của Kế toán

## Đã nối Web

- Thanh toán nhà cung cấp: chọn nhà cung cấp, xem các phiếu còn phải trả từ API debt, mở phiếu, bấm Lập thanh toán để điền nhà cung cấp/số tiền còn lại/ghi chú đối chiếu. Người dùng kiểm tra và xác nhận trước khi lưu qua API thật.
- Giao dịch vẫn ghi theo nhà cung cấp, không giả phân bổ tiền trực tiếp vào phiếu. Số dư và phân bổ do backend tính; lưu thành công tải lại công nợ và danh sách phiếu.
- Ẩn nhóm Nuôi trồng và shortcut Chu kỳ khỏi sidebar Staff có quyền chi nhà cung cấp mà không có quyền ghi nuôi trồng. Staff có cả quyền quản lý vùng vẫn giữ menu theo quyền. Không thu hồi hoặc tự cấp grant backend.

## Backend cần bổ sung

- PurchaseReceiptNotifications.CompletedAsync hiện chỉ lấy Owner bằng GetOwnersAndRolesAsync([]). Chưa gửi thông báo phiếu mới cho Accountant.
- Cần sự kiện/notification cho Accountant khi Manager hoặc Owner hoàn thành/gửi phiếu; Owner chỉ nhận để theo dõi. Thông báo cần mở được đúng phiếu và không phát trùng.
- Chưa có trạng thái request thanh toán riêng, endpoint gửi/nhận request hay người xử lý trong contract hiện tại. Web đang hiển thị phiếu còn nợ thực tế, chưa gọi đó là yêu cầu đã gửi/đã nhận.
- Nếu cần loại bỏ quyền đọc nuôi trồng từ API của Kế toán, nhóm backend cần sửa ma trận role và dữ liệu grant; thay menu không thay bảo vệ API.

Chưa browser QA, không tạo giao dịch mới, không commit/push/merge.
