# OMTS-175 — C4.1 Notification preference scope review

## Kết luận

C4 là SCR-06 cho System Administrator, Cooperative Owner, Staff và Trader. Màn hình chỉ thay đổi cách nhận thông báo phát sinh sau thời điểm lưu; nó không tạo notification, không thay đổi permission và không làm cho người dùng có quyền mở một record mà họ vốn không được phép xem.

Ba item bắt buộc đã được SRS/Jira xác nhận là water alert, new order và QR sent. Hệ thống phải giữ chúng bật và dùng MSG23 khi có yêu cầu tắt. Email hoặc Zalo chưa cấu hình/không đủ điều kiện phải bị chặn bằng MSG21. Nếu thiết bị từ chối push, push vẫn inactive nhưng những channel hợp lệ khác được lưu và UI hiển thị MSG22.

## Dependency chưa hoàn tất

`OMTS-124 — [BA] Notification types catalog for UC06` vẫn ở trạng thái To Do. Vì vậy chưa có danh sách được duyệt về id, tên, mandatory flag và eligible channels của từng notification type.

Có thêm một xung đột phạm vi: `OMTS-124` yêu cầu catalog xét in-app/push/email/Zalo/SMS, còn SCR-06 trong SRS chỉ liệt kê in-app/push/email/Zalo OA. Việc thêm SMS vào Web matrix hoặc loại SMS khỏi catalog là quyết định nghiệp vụ, không phải chi tiết giao diện.

## Quyết định triển khai an toàn

Frontend tiếp tục bằng contract data-driven và mock factory nhận fixture từ bên ngoài. Không tạo production catalog mặc định và chưa mount route bằng dữ liệu suy đoán. C4.4 phải được mở lại khi BA hoặc Duy Thái chốt nguồn catalog/channel scope.
