# Nhân viên ngoài giờ — 08/11/2026

## Phạm vi và thay đổi

- Trang API `/workspace/employees`: đổi tiêu đề thành Nhân viên ngoài giờ theo thuật ngữ đã duyệt, không thay tập nhân viên backend trả về.
- Dùng FilterWorkspace cho tìm tên/điện thoại, tình trạng và vùng bên trái. Đặt lại về đang làm việc/tất cả vùng/trang 1.
- Đầu bảng thể hiện phạm vi lọc và tổng nhân viên từ API. Tài khoản hiển thị username và tình trạng trên hai dòng.
- Phân trang server cho phép chọn 10/20/50/100, phù hợp giới hạn query hiện có (tối đa 100); query/payload không có trường mới. Paging lấy page/pageSize thực tế trả về.
- Hồ sơ chia nhịp thông tin cá nhân, vùng làm việc, ngân hàng, tài khoản liên kết, địa chỉ và ghi chú; ngân hàng hai cột desktop/một cột mobile. Không giấu trường, không thêm bước bắt buộc hoặc thay đổi xác thực.
- Giữ toàn bộ quyền Owner, linked account, nghỉ việc/đi làm lại, giữ nháp khi bỏ liên kết, rowVersion, đối chiếu xung đột, xác nhận bỏ nháp và follow-up tài khoản.

## Kiểm tra

- Lint/typecheck/build: PASS.
- `npx vitest run src/features/employee-api/workflow.test.tsx`: 13 PASS. Bao gồm validation ngân hàng/focus lỗi, giữ nháp và version khi unlink, tình trạng làm việc, duplicate/conflict và kết quả chưa rõ theo bộ test hiện có.
- Browser Owner với API8082: 7 nhân viên đang làm việc; chọn 10 dòng/trang được; tìm Tuấn còn 1; Đặt lại; mở Lê Minh Tuấn thấy đủ các nhóm/trường, đóng được. Không ghi dữ liệu hoặc thay tài khoản/việc làm.
- Danh sách chỉ 7 bản ghi nên chưa kiểm chứng chuyển trang thứ 2 với dữ liệu thật. Không tạo thêm nhân viên chỉ để kiểm trang.
- Kiểm tra DOM tại 360/1024/1440 CSS px: scrollWidth bằng innerWidth. Xem ảnh dialog và danh sách; đã khôi phục viewport.
- Ảnh ignored: `.hallmark/employee-detail-2026-11-08.jpg`, `.hallmark/employee-mobile-2026-11-08.jpg`. Ảnh desktop của công cụ có thể cắt phần bên phải, không coi là bộ ảnh nghiệm thu hoàn chỉnh.

## Tệp

- `src/features/employee-api/employee-screen.tsx`
- `src/features/employee-api/employee-screen.module.css`

Chưa commit/push/merge, giữ các thay đổi local trước đó. Không liên quan đến các endpoint sales/workforce đang thiếu trên runtime được ghi riêng ở các báo cáo trước.
