# Đợt thiết kế: Thả giống và Sử dụng vật tư

- Giữ topnav và khung wireframe vùng/bè bên trái, hồ sơ vận hành bên phải.
- Danh sách bè phân trang8; tìm kiếm và đổi vùng trả về trang1. Phân trang phía client vì API chu kỳ trả mảng.
- Thả giống: thông tin bè/chu kỳ trên đầu, tiến độ làn theo ngày, chọn làn mở thông tin bên dưới, bảng ghi nhận10dòng/trang, trạng thái hoàn tất riêng; tổng giống từng lô mở rộng.
- Vật tư: tiêu đề/chức năng riêng, nhóm theo chu kỳ hoặc ngoài chu kỳ, phân biệt khóa; bảng10dòng/trang, định dạng số đúng đơn vị, không cộng các đơn vị khác nhau.
- Giữ API/query, validation, quyền, form và xác nhận lưu/xung đột. Component tiến độ mới chỉ đọc endpoint hiện hữu; không sửa shared LaneDetail/RaftProgress.
- Khung chọn bè/hồ sơ chung của màn Thu hoạch cũng nhận bố cục mới; chưa coi phần thu hoạch đã hoàn thiện trong đợt này.
- Không commit/push/merge.
