# Đợt thiết kế Theo dõi chất lượng nước

- Giữ bộ lọc vùng/ngày/trạng thái bên trái. Tiêu đề vùng, tải lại và biểu đồ nằm bên phải.
- Giữ biểu đồ SVG và dữ liệu thật; số liệu theo kỳ được mở rộng khi cần, có trạng thái thiếu dữ liệu.
- Lịch sử gom thời điểm/điểm đo/ảnh, làm rõ trạng thái và cảnh báo. Chọn dòng mở ảnh và ngưỡng đã dùng ngay dưới dòng.
- Nút xem đầy đủ/lịch sử giữ toàn bộ thông tin và phiên bản trong dialog read-only hiện có.
- Phân trang server10/20/50 bản ghi; đổi vùng/bộ lọc/trang bỏ lựa chọn cũ để tránh hiển thị lệch phạm vi.
- Giữ Web chỉ đọc phép đo, quyền cấu hình ngưỡng và xuất theo API cũ. Không thêm nhiệt độ vì payload hiện có chỉ pH/độ mặn.
- Không commit/push/merge.

## Kết quả
- Lint/typecheck/build đạt.
- Browser Owner/API: vùng Ngọc Vừng30bản ghi, phép đo05/11/2026pH8,2/độmặn28; mở inline và dialog đầy đủ thành công. Không có nút Ghi phép đo/Hiệu chỉnh trong màn chỉ đọc.
- Trong lúc kiểm tra,3container API/SQL/Redis đã dừng; khởi động lại đúng container cũ và frontend3002 để phục hồi kết nối. Health backend200; không resetDB/volume.
