# 05 — Mẫu giao diện

## Trang danh mục (mẫu `employee-api/employee-directory.tsx`)
1. `ManagementHeading` kèm nút thêm bên phải.
2. Ô tìm kiếm phía trên, debounce 300ms.
3. `FilterWorkspace`: rail trái gồm `FilterChecks` (trạng thái…) và select cho ngữ cảnh đơn (vùng, số dòng).
4. Kết quả: hàng tiêu đề (`.resultHeading`) có số lượng → `DataTable`/`DataGrid` + `StatusPill` → `Paging`.
5. Mở hàng: `OpenableTableRow` + nút thật "Xem / chỉnh sửa".
6. Trình sửa mở trong `Dialog`.
- Quyết định `WEB_CHECKBOX_FILTERS_AND_LOGIN_2026-11-08`: danh sách chỉ có ô tìm kiếm thì **không** có rail lọc bên trái.
- Danh sách bè: lưới thẻ 1 cột (hẹp), 2 (vừa), 3 (rộng). Vùng nuôi: chuyển bảng/lưới qua `useDirectoryView`. Chu kỳ nuôi: bảng, lọc trái, hồ sơ mở rộng dưới hàng.

## Hộp thoại và trình sửa
- Trình sửa dùng `Dialog` cỡ md/lg/xl; hộp phụ dùng bố cục mobile `compact`.
- Hành động nguy hiểm: `ConfirmDialog tone="danger"` hoặc `useActionDialog` với lý do bắt buộc.
- Xung đột MSG06 chặn ghi tiếp đến khi tải lại (`useMutation.blocked`).
- Dialog lồng nhau: Escape chỉ đóng cái trên cùng.

## Form và validation
- Nhãn trên input; lỗi dưới trường có `aria-describedby`; `aria-invalid` khi lỗi.
- Gửi trống: giữ thông báo tiếng Việt và chuyển focus tới trường lỗi đầu tiên.
- Thứ tự: lỗi theo trường trước, rồi `ErrorNotice` (`role="alert"`) cho lỗi không gắn trường.
- Nút pending dùng trạng thái cục bộ, không dùng skeleton.
- Giữ bản nháp khi trùng/tải lên lỗi; thông báo nói rõ ("Thông tin đang nhập được giữ", "Bản nháp được giữ").
- Danh mục thông báo: `shared/messages/message-catalog.ts`. Mã backend (`MSG-GEN-xx`, `MSG-ACCOUNT-xx`…) ánh xạ sang `MSGnn` cũ ở `shared/messages/backend-message-code.ts`; `operationError()` giữ ghi đè theo feature.

## Toast
`ToastProvider`; gọi `notify()` sau khi lưu, đổi mật khẩu… Tone danger dùng `role="alert"`.

## Loading / trống / lỗi / từ chối quyền
- **Loading**: tải lần đầu dùng `Skeleton` (`.omts-skeleton`). Toàn trang hoặc kiểm tra phiên dùng `BootScreen` ("Đang kiểm tra phiên đăng nhập...", "Đang chuyển về trang đăng nhập..."). Thao tác ghi dùng spinner trên nút. Dashboard: hiện khung + lối tắt trước, chỉ đặt skeleton ở ô số; không hiện 0 khi thiếu dữ liệu.
- **Trống**: "Không có dữ liệu phù hợp."; `DirectoryEmpty` khi tìm không ra; "Chưa có ảnh được ghi nhận."; "Không có dữ liệu phù hợp với khoảng thời gian và bộ lọc đã chọn."
- **Lỗi**: `ErrorNotice` `role="alert"`, nói người dùng nên kiểm tra gì tiếp.
- **Từ chối quyền**: màn feature dùng `<p role="alert">` ("Bạn không có quyền quản trị hệ thống."…) hoặc thẻ giữa trang với `RestrictedAccessIcon`, h1 "Không có quyền quản lý …" và `MSG02`. **Chưa có component dùng chung** → không nhất quán.
- **Tài khoản chưa có quyền nghiệp vụ**: "Tài khoản hiện chưa được cấp chức năng nghiệp vụ. Bạn có thể xem hồ sơ cá nhân."
- Offline, syncing, success: `AGENTS.md` yêu cầu nhưng chưa thấy component dùng chung.

## Tiền, số, ngày, giờ
- Tiền: `Intl.NumberFormat("vi-VN")`, 0 số lẻ, hậu tố " ₫", dấu chấm ngăn nghìn (vd `10.008.000`); null → "—". Số tiền phải là bội số của 1.000 đồng (MSG41). Ô tiền canh phải.
- Số lượng: tối đa 3 số lẻ (MSG59).
- Ngày UI `dd/MM/yyyy`, service ISO; múi giờ Asia/Ho_Chi_Minh; `toApiTime` thêm `+07:00`; `displayTime` dạng vi-VN ngắn.

## Nhãn trạng thái
- `StatusPill` có 3 tone; success dùng teal primary (trùng primary), danger đỏ, neutral xám.
- `statusLabel`: Nháp, Hoàn thành, Đã hủy, Đã ghi nhận, Đã xác nhận, Đã hiệu chỉnh, Đang cảnh báo.
- Nhân viên: "Đang làm việc"/"Đã nghỉ việc". Thiếu giấy tờ: "Thiếu hồ sơ".
- Quy tắc blueprint: trạng thái luôn có chữ + chấm/icon, không chỉ dựa vào màu. Chưa có tone warning cho pill (cảnh báo dùng chữ/hộp `warning-soft`).

## Khác
- Xuất hàng loạt: một phạm vi ra XLSX, nhiều phạm vi ra ZIP, tối đa 64MB.
- Lọc đa chọn: UI giữ một truy vấn API cho mỗi lựa chọn bằng cách chạy nhiều truy vấn rồi gộp; giới hạn 100 trang.
- Skip link trên mọi trang có bảo vệ; hàng bảng có nền khi hover và `focus-within`.
