# OMTS-175 — C4.2 Notification preference contract

## Cấu trúc

Domain biểu diễn ba lớp dữ liệu: channel presentation, notification item và cell giao nhau giữa item × channel. Mỗi cell cho biết giá trị hiện tại và có được chỉnh hay không. Cell không chỉnh được bắt buộc mang một lý do typed MSG21, MSG22 hoặc MSG23; UI không phải tự suy luận từ email, Zalo hay browser permission.

Repository có hai operation `load` và `save`. Save gửi danh sách selection động, không hard-code key của notification type/channel và không giả định HTTP DTO. Kết quả save phân biệt `saved`, `invalid-preference` và `session-expired`; saved có thể kèm warning MSG22.

MSG21, MSG22 và MSG23 đã được thêm vào message catalog với parameter `channel_name` cho MSG21. Targeted message/service tests, typecheck và lint đều đạt.

## Giới hạn có chủ ý

Contract không chứa catalog mặc định, record-version behavior hay enum channel đóng. Các phần đó chỉ được thêm khi BA/backend contract xác nhận, tránh biến phỏng đoán frontend thành luật hệ thống.
