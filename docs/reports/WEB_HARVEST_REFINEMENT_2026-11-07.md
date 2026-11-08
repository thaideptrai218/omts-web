# Đợt thiết kế Thu hoạch

- Giữ khung vùng/bè và sơ đồ làn đã làm ở đợt trước.
- Gom tiêu đề, tải lại, thông số quy đổi/tự đóng lô và ghi nhận chuyến vào một vùng thao tác.
- Thêm tìm mã lô, lọc trạng thái từ dữ liệu API, phân trang client10lô/trang.
- Bảng gom mã/thời điểm, làn/đã thu hết; căn số lồng và kg bên phải. Tổng cộng áp dụng trên toàn bộ lô phù hợp bộ lọc, không chỉ trang đang hiện.
- Hiển thị riêng ước tính, đã lập hóa đơn và còn lại; không suy ra doanh thu/đã bán từ số lập hóa đơn.
- Hồ sơ lô được polish phần số liệu và nhóm chọn làn; giữ ảnh, ghi nhận, chỉnh sửa, gỡ và xử lý xung đột hiện có.
- Không thêm API đóng lô thủ công; thông số tự đóng lô hiện có giữ nguyên. Không đổi quyền hoặc validation.
- Không commit/push/merge.

## Kết quả kiểm tra
- Browser API Owner: B1-01 có3lô,13lồng,680kgước tính; tìm mã lô lọc đúng1dòng. Mở/đóng form không ghi dữ liệu.
- Form ghi nhận chia Phạm vi thu hoạch và Sản lượng/ảnh, responsive xếp dọc; giữ nguyên field/validation và payload.
- Lint/typecheck/build đạt cho màn bảng; đã chạy lại kiểm tra sau khi chia bố cục form.
