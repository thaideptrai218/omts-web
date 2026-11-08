# Đợt thiết kế Phân công và chấm công

- Thay hero lớn bằng heading gọn, ngày và phạm vi làm neo; filter ngày/vùng/từ khóa/trạng thái ở trái.
- Hai cách xem cùng nguồn dữ liệu: Phân công (việc, vị trí) và Chấm công (lượt vào/ra). Trạng thái hiển thị suy từ timestamp hiện hữu, không thêm trạng thái backend.
- Thao tác theo dòng mở rộng tại chỗ, giữ đúng điều kiện ngày, jobTypeId/raftId, quyền và confirmation cũ.
- Phân trang client10/20/50 cho mảng phân công theo ngày, nghỉ phépOwner10trang; ngày tiếng Việt. API hiện trả mảng, chưa phân trang từserver.
- Các form phân công/đổi việc/thiết lập/duyệt nghỉ phép và mutation unchanged. Không đổi shared workforce-layout để tránh tác động demo mock.
- Lint/typecheck/build đạt; kiểm tra tiếp browser chỉ đọc, không gửi chấm công hoặc duyệt nghỉ.
- Runtime local ban đầu dừng; mở DockerDesktop, khởi động đúng3container cũ API/SQL/Redis, FE3002. Không resetDB.
- Không commit/push/merge.

## Browser và giới hạn contract
Owner đăng nhập API thật thành công; màn render tab/bộ lọc/tổng hợp/phân trang. GET danh sách theo ngày trả404. Web hiện gọi /api/workforce/assignments?day=...; chưa thấy endpoint này trong source runtime meeting20261106. Chưa kiểm dữ liệu ngày công hay mutation thực tế ở runtime8082. Không thay adapter theo schemaLabor khác vì chưa đối chiếu hợp đồng và chưa có phê duyệt thay luồng; không giả data để nhận là API đã chạy. Cần backend xác nhận endpoint workforce tương thích hoặc contractLabor mới trước batch tích hợp riêng.
