# Sản phẩm và yêu cầu mua — 08/11/2026

## Đã chỉnh

- Sản phẩm đang được route sử dụng là `sales-api/products-screen.tsx`; không sửa màn SalesProductsScreen cũ không được OperationScreen gọi.
- Danh mục sản phẩm: bộ lọc trái theo tên/trạng thái, Đặt lại, số kết quả, bảng responsive và phân trang cục bộ 10/20/50. API vẫn trả danh sách như trước; không thêm tham số server. Trang hiện tại được giới hạn lại khi danh sách thu hẹp.
- Giữ quyền Owner thêm/sửa/trạng thái; Trader vẫn không thấy giá; ProductForm, payload và xử lý xung đột không đổi.
- Yêu cầu mua: lọc trạng thái bên trái, mã và thương lái cùng cột; số lồng căn phải; ngày nhận dd/MM/yyyy; badge trạng thái; phản hồi HTX hiển thị ngay trong bảng bằng dữ liệu đã có.
- Giữ phân trang server với query 20 dòng như cũ, nhưng dùng page/pageSize thực tế trả về để hiển thị và chuyển trang. Không tìm kiếm riêng một trang rồi hiển thị như toàn bộ dữ liệu.
- Giữ nguyên mine/list, mine-detail/detail, dialog tạo và phản hồi, các bước lập kế hoạch/mời nhân viên, trạng thái và đơn vị số lồng. Không thêm API, không thay permissions hoặc routing.

## Kiểm tra và giới hạn

- Lint, typecheck và production build: PASS.
- `npx vitest run src/features/operations/new-module-screens.test.tsx -t Trader`: 2 PASS, 3 không thuộc bộ chọn được bỏ qua. Kiểm personal feed/lọc/reload và mở chi tiết qua mine-detail. Điều chỉnh assertion trong dialog vì phản hồi nay cũng hiển thị ở bảng.
- Browser Owner mở hai màn, bộ lọc/toolbar/error state render được. Không tạo, nhận, hủy yêu cầu hoặc sửa giá.
- **Blocker runtime có trước redesign:** QA API8082 trả 404 cho GET `/api/products` và `/api/purchase-requests`. Browser qua BFF cũng báo không tìm thấy. Source runtime meeting-20261106 có entity Product nhưng không tìm thấy endpoint sản phẩm/yêu cầu mua tương ứng. Không suy luận rằng mọi nhánh backend đều thiếu API.
- Vì vậy chưa xác nhận bảng có dữ liệu, phân trang, chi tiết và CRUD thật trên runtime này; chưa xem đợt này là nghiệm thu trọn luồng API. Không chuyển runtime/DB/branch backend để che lỗi trong phạm vi redesign.
- Chỉ xem trạng thái lỗi trên viewport mặc định, chưa nhận đủ visual QA bảng có dữ liệu ở mọi breakpoint. DataGrid responsive được tái sử dụng với data-label đầy đủ.
- Ảnh trạng thái thật: `.hallmark/purchase-requests-runtime-2026-11-08.jpg` (ignored).
- Chưa commit, push hoặc merge; giữ toàn bộ thay đổi local từ các đợt trước.

## Tệp

- `src/features/sales-api/products-screen.tsx`
- `src/features/sales-api/sales-workspace.module.css`
- `src/features/operations/new-module-screens.tsx`
- `src/features/operations/new-module-screens.test.tsx`
