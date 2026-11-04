# Tinh chỉnh màn theo dõi chất lượng nước

Ngày: 04/11/2026  
Nhánh: `feature/OMTS-132-web-foundation`

## Phạm vi

Đối chiếu `docs/PROJECT_CONTEXT.md` và báo cáo tích hợp đo nước: giữ nguyên chọn vùng, phạm vi quyền, bộ lọc, lịch sử, ghi/hiệu chỉnh/hủy phép đo, ngưỡng, xuất Excel và contract API. Không thêm nghiệp vụ hoặc số liệu minh họa.

## Thay đổi

- Chia rõ lịch sử phép đo và xu hướng chất lượng nước; đưa tổng bản ghi và khoảng thời gian về cạnh tiêu đề từng khu.
- Biểu đồ dùng thang đo, lưới, đường ngưỡng, điểm trung bình và biên độ nhỏ nhất–lớn nhất; giữ kỳ trống là khoảng trống, không nối thành số 0.
- Bổ sung chú giải và tổng lượt đo/kỳ thiếu dữ liệu tính trực tiếp từ phản hồi chart API; giữ bảng thống kê theo kỳ để đối chiếu chi tiết.
- Tinh gọn bộ chọn khoảng gộp và định dạng số liệu trong bảng lịch sử.

## Kiểm tra và giới hạn

- `npm run lint`, `npm run typecheck`, `npm run build` đạt.
- Browser local không kết nối tại `localhost:3000`, nên chưa xác minh visual QA trực tiếp trong trình duyệt.
- Không thay endpoint, payload, quyền hoặc vòng đời phép đo.
