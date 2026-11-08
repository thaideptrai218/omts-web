# Nhà cung cấp và danh mục vật tư — 08/11/2026

## Phạm vi

- `/workspace/suppliers` và `/workspace/input-items` trên nhánh thử nghiệm giao diện hiện có; không merge, commit hoặc push.
- Tái sử dụng FilterWorkspace, DataGrid responsive, StatusPill, Dialog và repository hiện tại. CSS mới chỉ áp dụng hai danh mục này; các tài nguyên khác giữ cách trình bày bộ lọc cũ.
- Không đổi API, validation, payload, quyền, quy tắc ngừng/khôi phục, khóa nhóm/đơn vị của vật tư đã dùng, rowVersion hay xử lý xung đột.

## Đã thay đổi

- Bộ lọc trái: tìm kiếm, trạng thái, loại nhà cung cấp/nhóm vật tư; nút Đặt lại đưa về trang 1.
- Đầu danh sách hiển thị phạm vi lọc và tổng kết quả từ repository; không hiển thị 0 kết quả khi chưa tải được dữ liệu.
- Bảng gọn, tên bản ghi nổi bật, mã dùng chữ mono, hành động có nhãn truy cập chứa tên bản ghi. Phân trang hiện có 10/20/50/100 dòng được giữ nguyên.
- Hồ sơ có tên, mã vật tư và trạng thái trên đầu; bỏ bảng metadata lặp lại các trường của form và enum tiếng Anh. Các trường và thao tác cũ vẫn có trong form.

## Kiểm tra

- `npm run lint`, `npm run typecheck`, `npm run build`: PASS sau khi sửa điều kiện render mã vật tư kiểu unknown thành kiểm tra string.
- Runtime API 8082 readiness Healthy; khởi động lại các container SQL, Redis và API đã có, rồi Web API 3002. Không reset DB/volume hoặc seed dữ liệu.
- Browser Owner: đăng nhập, đọc 5 nhà cung cấp; lọc loại Vật tư còn 2 kết quả; mở/đóng hồ sơ Bạch Long được.
- Browser Owner: đọc 15 vật tư; đổi 10 dòng/trang thành 2 trang, chuyển trang 2 và mở Dầu diesel được. Nhóm/đơn vị của bản ghi đã dùng vẫn bị khóa; mã/tên còn trường sửa. Không lưu thay đổi.
- Kiểm tra DOM ở chiều rộng CSS thực tế 360, 1024, 1440: scrollWidth bằng innerWidth, không tràn ngang toàn trang. Đã xem ảnh bảng và dialog, khôi phục viewport sau kiểm tra.
- Ảnh cục bộ trong `.hallmark/catalog-mobile-2026-11-08.jpg` và `.hallmark/catalog-desktop-2026-11-08.jpg` (ignored). Công cụ chụp màn rộng có hiện tượng cắt khung bên phải; chỉ dùng làm ghi nhận tham khảo, không coi là bộ ảnh nghiệm thu hoàn chỉnh.

## Giới hạn

- Đợt này chỉ kiểm tra nhẹ luồng đọc, lọc, phân trang, mở/đóng hồ sơ bằng Owner. Chưa chạy lại CRUD, ca xung đột hay tất cả vai trò; không khẳng định nghiệm thu toàn bộ nghiệp vụ.
- Workforce runtime thiếu endpoint đã nêu trong báo cáo trước vẫn là blocker riêng; không được giải quyết bằng thay đổi giao diện danh mục.

## Tệp của đợt này

- `src/features/api-workspace/api-resource-screen.tsx`
- `src/features/api-workspace/catalog.module.css`
- Báo cáo này.
