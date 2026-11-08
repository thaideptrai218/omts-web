# Khách hàng và thương lái — 08/11/2026

## Thay đổi

- Tái sử dụng FilterWorkspace và CSS danh mục đã có cho riêng customers; không tạo bộ lọc trạng thái hoặc liên kết chỉ lọc một trang rồi giả là toàn bộ dữ liệu.
- Tìm kiếm bên trái, Đặt lại, phạm vi tìm kiếm và tổng kết quả lấy từ repository. Giữ phân trang server 10/20/50/100 hiện có.
- Tên khách hàng rõ hơn, trạng thái tài khoản thương lái có nhãn Đã liên kết/Chưa liên kết dựa trên hasTraderAccount của API.
- Hồ sơ có tên ở đầu, công nợ hiện tại và tên tài khoản thương lái trong nhóm chỉ đọc. Email hiện khi backend có giá trị. Bỏ phần metadata lặp lại các trường nhập.
- Giữ nguyên phoneLocked, hồ sơ đã gộp chỉ đọc, payload CRUD, rowVersion, xử lý trùng/xung đột, giữ nháp và mọi quyền. Không bổ sung thao tác gộp hoặc liên kết tài khoản mới; chỉ trình bày dữ liệu và các điều kiện hiện có.
- Khi GET customers lỗi, không vẽ bảng trống kèm câu Không có dữ liệu phù hợp; giữ thông báo lỗi và tải lại, số kết quả là Chưa tải được dữ liệu.

## Kiểm tra

- Lint/typecheck/build: PASS.
- Hai tệp category-filters và resource-confirmation: 5 PASS. Hai ca mới kiểm lỗi tải khách hàng không hiện danh sách rỗng và hồ sơ đã liên kết giữ khóa điện thoại/công nợ khi mở. Các ca danh mục/xác nhận bỏ nháp hiện có tiếp tục qua.
- Lần chạy đầu ca mới thiếu showModal trong JSDOM; bổ sung setup/cleanup native dialog cho môi trường test, không sửa Dialog sản phẩm.
- Browser Owner mở `/workspace/customers`: khung/bộ tìm kiếm hiển thị, trạng thái GET lỗi có nút tải lại và không hiện câu danh sách rỗng nữa.
- **Blocker QA runtime:** API8082 GET `/api/customers` trả 404; chưa kiểm chứng dữ liệu thật, chuyển trang, hồ sơ hoặc CRUD khách hàng trên bản này. Không suy luận rằng mọi branch backend thiếu API.
- Chưa nghiệm thu responsive với bảng/hồ sơ khách hàng có dữ liệu thật; dùng DataGrid responsive và quy tắc CSS danh mục hiện có. Ảnh lỗi thật lưu ignored tại `.hallmark/customers-runtime-2026-11-08.jpg`.

## Tệp của đợt này

- `src/features/api-workspace/api-resource-screen.tsx`
- `src/features/api-workspace/catalog.module.css`
- `src/features/api-workspace/category-filters.test.tsx`

Chưa commit/push/merge, giữ các thay đổi local trước. Phần giao diện đã triển khai; việc nghiệm thu trọn luồng API còn chờ runtime có endpoint phù hợp.
