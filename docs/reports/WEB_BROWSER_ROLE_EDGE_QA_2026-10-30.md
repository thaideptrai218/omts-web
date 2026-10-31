# QA3003 — bổ sung ca biên theo role, 30/10/2026

Tiếp nối [role matrix](WEB_BROWSER_ROLE_QA_2026-10-30.md), [quản trị](WEB_BROWSER_ADMIN_QA_2026-10-30.md) và [contact/inbox](WEB_BROWSER_CONTACT_INBOX_QA_2026-10-30.md). Chỉ QA3003/backend8081/RedisDB3; không merge hoặc ghi nghiệp vụ8080. Fetch backend vẫn develop953f597 và Zalo dc00b2f, chưa có API v2 mới để mở thêm màn.

## Ca bổ sung

| Role | Ca và kết quả |
| --- | --- |
| Manager DEMO-01 | Lịch sử nước30bản ghi: trang2 hiển thị các ngày cũ; đổi lọc Nháp về0bản ghi/trang1. Chỉ có vùng Ngọc Vừng. Nháp phép đo chỉ đổi thời điểm rồi Đóng bị mất không xác nhận; sửa bên dưới |
| Manager DEMO-02 | Chỉ có vùng Minh Châu; lọc PR029 trả đúng1phiếu/3.000phải trả/2.000còn nợ. Trả hàng còn được3, nhập4 bị native rangeOverflow chặn trước dialog/lệnh ghi. Quay lại bỏ nháp; mã phiếu không tồn tại trả0bản ghi/trang1 |
| Kế toán | Supplier QA Manager2 có khoản1.000/PR029; kết hợp phiếu và Chuyển khoản trả0tổng/0bản ghi. Đổi supplier xóa receiptId cũ. Nháp chỉ đổi hình thức rồi Đóng bị mất không xác nhận; sửa bên dưới |
| Owner | Tìm `QA browser account 20261030` + Locked có đúng1; đổi Active trả0; xóa tìm kiếm/status về8tài khoản. Không mở khóa hoặc ghi tài khoản |
| Trader | Truy cập trực tiếp `/workspace/roles` bị chặn “Bạn không có quyền xem chức năng này”; vẫn mở được hồ sơ cá nhân và username đúng. Logout rồi Back trở lại form đăng nhập trống, không hiện lại dữ liệu hồ sơ cũ |

Không tạo phép đo, khoản tiền hoặc trả hàng mới trong các ca này. Mật khẩu/contact/grants seed giữ nguyên. Các form đóng và phiên đăng xuất trước build. Save password/contact vẫn chưa tính browser PASS theo quyết định người dùng trước đó; không dùng CLI đổi credential để thay bằng chứng.

## Lỗi mất nháp khi chỉ sửa trường ít dùng

NewMeasurement chỉ kiểm photo/pH/độ mặn khi đóng, bỏ sót measuredAt/mode. PaymentEditor chỉ kiểm receipt/amount/reference, bỏ sót supplier/date/method. Tái hiện bằng UI: Manager1 đổi thời điểm sang29/10 08:15 (đã kiểm React value attribute), Accountant đổi riêng hình thức Chuyển khoản; Close đóng ngay không hỏi.

Giữ giá trị ban đầu ổn định khi mở editor, so sánh toàn bộ trường nháp. Có thay đổi thì dùng dialog bỏ nháp sẵn có; Quay lại giữ giá trị, Đồng ý mới đóng. Form chưa sửa hoặc đã trả về ban đầu đóng trực tiếp. Giữ nguyên câu xác nhận, API, validation, quyền, khóa pending, conflict/unknown và quy tắc không replay.

Thêm6test: thời điểm/mode, ngày/method/supplier, form trở về baseline. Source trước sửa5fail/7pass đúng lỗi; sau sửa nhóm operations/action-dialog4files24PASS, lint/typecheck/build41routes và61built-product assertions PASS. Full local mới chưa chạy; full2879/RedisDB2 của snapshot trước không gắn thành kết quả source mới.

## Replay bản build cuối

- Manager1: sửa riêng thời điểm29/10 08:15 → Đóng có xác nhận; Quay lại giữ đúng React value, Đồng ý đóng. Form mới đổi sang OCR cũng có xác nhận; Quay lại/chọn lại Nhập tay về baseline thì đóng trực tiếp. Không gửi lệnh lưu phép đo.
- Kế toán: chỉ đổi BankTransfer → Đóng có xác nhận, Quay lại giữ BankTransfer; trả method về Cash rồi chỉ sửa ngày cũng có xác nhận. Form mới chỉ chọn supplier QA cũng có xác nhận. Đồng ý đóng không gửi lệnh ghi khoản tiền.
- Giao diện kiểm ở kích thước mặc định1280; không áp viewport override lên usertab khác. Không nhận đây là lượt360/1024 mới; dialog/layout không thay đổi và bằng chứng responsive trước được giữ riêng.
- Các phiên cuối đã logout. Console đọc cuối không có error/warn, không suy ra mọi race/luồng đều không lỗi. Công cụ ban đầu chờ heading Vai trò của Trader bị timeout vì route hiển thị alert chặn quyền; snapshot sau đó xác nhận đúng denial, không coi timeout của selector là lỗi ứng dụng.

Ảnh outputs workspace: `qa-payment-method-draft-before-close.png`, `qa-water-time-draft-retained.png`, `qa-payment-method-draft-retained.png`. Role Staff mới/System Administrator/QR Viewer chưa có fixture/contract tương ứng; không tự gán role khác hoặc cấp quyền để tạo ca thử. Các dependency và APIv2 ở báo cáo trước vẫn giữ.
