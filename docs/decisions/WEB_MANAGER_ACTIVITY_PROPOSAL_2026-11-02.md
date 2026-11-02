# Nhật ký thao tác cho Manager — đề xuất 02/11/2026

**Đã duyệt phạm vi 02/11/2026.** Người dùng đồng ý giới hạn đọc theo vùng và metadata bên dưới, đồng thời yêu cầu chỉ ghi API cần bổ sung, không tự tạo API; chờ xem thông báo của nhóm backend. Chưa triển khai endpoint, chưa mở menu nhật ký để tránh màn không có API.

Người dùng yêu cầu Manager xem ai đã thao tác, lúc nào, làm gì; xác nhận lại chỉ Owner được sửa bè/làn và vật tư.

## Contract đề nghị

- Endpoint đọc riêng `GET /api/zones/{zoneId}/activity`, phân trang, lọc khoảng ngày, trả mới nhất trước và thứ tự ổn định theo ID.
- Chỉ Owner hoặc Manager có phân công hiện còn hiệu lực tại chính vùng đó. Backend kiểm quyền trước khi truy vấn, luôn lọc ZoneId. Không cho Accountant/Trader hoặc dùng zoneId tùy ý để vượt vùng.
- Chỉ trả ID sự kiện, thời điểm UTC có offset (`occurredAt`), tên người thao tác, hành động, loại/mã bản ghi và vùng. Web hiển thị giờ Việt Nam. Tách ngày nghiệp vụ khỏi giờ ghi hệ thống.
- Không trả snapshot Before/After, thông tin xác thực, thông tin liên hệ/tài khoản/nhân viên hoặc bản ghi không gắn vùng. Không có thao tác sửa/xóa log và không tự suy vùng từ ID bản ghi hiện tại.
- Sidebar API thêm Nhật ký thao tác, chọn vùng được cấp rồi lọc ngày/đọc danh sách. Mất quyền phải từ chối, không tiếp tục dùng dữ liệu đã tải của vùng cũ.
- PR26 `/api/audit-events` hiện Owner-only: không bỏ attribute để mở toàn bộ nhật ký cho Manager. Đề nghị route riêng tránh thay quyền endpoint đó.

## Tình trạng môi trường

Đã xác minh localhost:3000 là `next dev` của D:/Đồ_án/omts-web, `.env.local` đặt OMTS_DATA_SOURCE=mock. Màn Phân công và chấm công nằm ở `/operations/workforce` của chế độ API; mock sidebar không có module này. Không có listener8080/8081/6379/6380 trong lần kiểm. Không đổi chế độ thành API khi thiếu runtime.

Đây là contract đề nghị gửi nhóm backend, chưa phải endpoint đã phát hành. Tên route có thể điều chỉnh theo contract nhóm backend công bố; phạm vi dữ liệu và quyền đọc đã được người dùng duyệt.
