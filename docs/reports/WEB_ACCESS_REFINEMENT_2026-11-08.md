# Tài khoản nội bộ và vai trò — 08/11/2026

## Thay đổi

- `/workspace/accounts` và `/workspace/roles`: tái sử dụng bộ lọc trái, đầu danh sách/tổng kết quả, phân trang 10/20/50/100 của danh mục; tên gọi và mô tả phù hợp từng trang. Khi đọc lỗi không trình bày thành bảng rỗng.
- Hồ sơ tài khoản có tên hiển thị, username và trạng thái rõ ở đầu, bỏ metadata lặp các input; khóa/mở khóa và xem quyền vùng giữ nguyên.
- Hồ sơ vai trò hiển thị tên Việt và mã; bỏ danh sách quyền thô trùng với ma trận chi tiết.
- Ma trận quyền dùng DataGrid responsive: tìm theo tên/mã chức năng, chọn tất cả hoặc chức năng có quyền, phân trang cục bộ 10 dòng. Đây chỉ là bộ lọc cách xem, không gửi mutation/cập nhật quyền.
- Giữ đủ quyền không có trong catalog trong phần mở rộng riêng; không bỏ dữ liệu khi thiếu nhãn chức năng.
- Dịch chính xác hai mô tả seed tiếng Anh đã quan sát được, ánh xạ theo nguyên văn để không ghi đè mô tả mới nếu backend thay nội dung. Thêm nhãn Việt cho LOT_TRACING và SALES_RETURNS. Không suy ra quyền từ mô tả, luôn đọc actions/scope hiện có.
- Giữ phần giải thích Nhân viên thông thường; không tạo thêm role hoặc quyền. Không thay routing, API, validator, actor/scope, ghi tài khoản hay cơ chế phiên.

## Kiểm tra

- Lint/typecheck/build: PASS.
- Ba tệp account-follow-up, category-filters, resource-confirmation: 7 PASS. Không chạy sâu toàn bộ nghiệp vụ phân quyền.
- Browser Owner với API8082: danh sách 7 tài khoản; tìm quanlyvung1 còn 1; mở/đóng hồ sơ có tên, trạng thái, nút khóa và xem quyền vùng. Không kích hoạt khóa/cấp/thu hồi quyền hoặc lưu thông tin.
- Danh sách 2 vai trò; mở Kế toán và Quản lý vùng, matrix catalog 28 chức năng. Kế toán chọn chức năng được cấp rồi tìm nhà cung cấp còn 2; quản lý vùng chuyển trang 2 được.
- Mô tả quản lý vùng hiển thị Việt; số liệu/scope/actions dựa trên API, không có số minh họa.
- Đo DOM khi mở matrix ở 360/1024/1440 CSS px: scrollWidth bằng innerWidth; khôi phục viewport và đóng dialog sau kiểm tra. Ảnh ignored `.hallmark/role-matrix-2026-11-08.jpg`, `.hallmark/role-mobile-2026-11-08.jpg`; công cụ ảnh desktop có thể cắt khung bên phải nên chưa phải bộ ảnh nghiệm thu đầy đủ.
- Danh sách tài khoản chỉ 7 nên chưa kiểm trang 2 bằng dữ liệu thật; paging matrix đã được kiểm với 28 chức năng.

## Tệp

- `src/features/api-workspace/api-resource-screen.tsx`
- `src/features/personal-api/role-read-view.tsx`
- `src/features/personal-api/role-read-view.module.css`

Chưa commit/push/merge. Giữ thay đổi local từ các đợt trước. Không thay backend hoặc DB.
