# Browser QA 3003 — 30/10/2026

Đợt này kiểm thao tác trên **http://127.0.0.1:3003**, backend QA Zalo8081 và RedisDB3 riêng. PR #3 tiếp tục draft, chưa merge. Báo cáo [role/API audit](WEB_ROLE_FLOW_AUDIT_2026-10-30.md) là bằng chứng HTTP riêng; không thay thế kiểm thử browser.

## Kết quả thực tế trên browser

| Tài khoản | Đã xác minh trong lượt này | Còn cần kiểm trên browser |
| --- | --- | --- |
| Owner | Đăng nhập; dashboard/menu; mở inbox, đánh dấu một thông báo QA đã đọc (10→9); từ chối một yêu cầu Trader QA với lý do, xem lại ở Đã từ chối; tạo nhà cung cấp QA; đọc hồ sơ cá nhân | Toàn bộ form sau bản sửa dialog, phiếu nhập, thanh toán, đo nước, hồ sơ/quyền và logout |
| Manager DEMO-01 | Chưa chạy trong lượt browser này | Menu, phạm vi vùng, các thao tác được cấp, từ chối truy cập vùng khác |
| Manager DEMO-02 | Chưa chạy trong lượt browser này | Như trên với DEMO-02 |
| Kế toán | Chưa chạy trong lượt browser này | Đọc phiếu nhập, công nợ/thanh toán, giới hạn sửa |
| Thương lái | Chưa chạy trong lượt browser này | Hồ sơ/thông báo, không vào vận hành HTX |

Lý do từ chối rỗng giữ nút xác nhận disabled. Đã xác nhận lưu lý do `QA browser: kiểm tra luồng từ chối` cho `QA chờ từ chối 062bad05`. Hộp quyết định ở CSS360 vừa màn hình, không tràn ngang; CSS540 cũng vừa. Đây không phải bằng chứng responsive cho mọi màn.

Nhà cung cấp tạo qua UI: `QA browser supplier 1793324655590`, loại Other, số điện thoại giả0924655699. Bản ghi được giữ đang dùng ở DB QA. Ghi chú nháp `QA browser draft retained` chưa lưu. Tên Owner được nhập thử rồi đưa lại `Nguyễn Văn Hải`; không gửi lệnh lưu tên.

## Lỗi thao tác và bản sửa

Đóng editor nhà cung cấp đang có nháp gọi `window.confirm`. Hộp xác nhận native khiến tab điều khiển bị kẹt; API lấy/đóng dialog và đóng tab đều timeout. Tab mới đọc được trang và điền input, nhưng click/Enter không thực thi hành động. Đã yêu cầu người dùng chọn Cancel hoặc đóng tab `/workspace/suppliers` cũ; chưa có xác nhận đã xử lý lúc ghi báo cáo. Không coi lượt bấm không đổi trạng thái là test thành công.

Thay các `window.confirm`/`window.prompt` còn lại trong các màn API bằng `useActionDialog`, dùng Dialog hiện có trong ứng dụng. Áp dụng cho danh mục/tài khoản, phiếu nhập, thanh toán, đo nước/ngưỡng và file chứng nhận. Giữ nội dung, bước xác nhận, lý do, quyền, phiên bản và quy tắc không tự gửi lại lệnh. **Quay lại**, Escape hoặc đóng hộp xác nhận hủy quyết định, giữ editor/nháp; chỉ **Đồng ý** mới tiếp tục hành động. Khi editor unmount, quyết định chờ được hủy.

Bản sửa đã build và chạy lại QA3003. Do tab native cũ chưa giải phóng, chưa xác minh dialog mới bằng browser hoặc chạy tiếp bốn tài khoản còn lại. Console tab khôi phục không có error/warn trong lần đọc; điều này không chứng minh toàn bộ ứng dụng không có lỗi console.

## Kiểm tra tự động sau sửa

- Full **264 file /2.872 test PASS, 0fail/0skip**, Redis integration dùng DB2 riêng; JSON cục bộ `docs/learning/browser-role-full-tests.json`.
- 37 test targeted PASS gồm hook quyết định, giữ nháp nhà cung cấp, operations, farming và chứng nhận. Bốn test mới kiểm chờ quyết định/hủy/trim lý do/unmount và đóng nháp không ghi dữ liệu.
- Lint, typecheck, build41routes PASS;61 built-product HTTP/style assertions PASS.

Những kết quả trên là unit/component/HTTP build checks. Chưa nâng thành browser E2E cho năm tài khoản. Không đổi backend, seed credentials/grants, session/cookie/cache policy hoặc các nghiệp vụ đang chờ contract. Không ghi nghiệp vụ vào DB8080.

CI đầu04a628c bắt lỗi TypeScript trong test mới: `exact` là tùy chọn Playwright, không có trong Testing Library getByRole. File test được thêm sau lượt typecheck/build local nên bằng chứng local ở trên chưa bao phủ typecheck test này. Bỏ hai thuộc tính không hợp lệ (name string vốn khớp chính xác), chạy lại lint/typecheck và các test liên quan trước đẩy bản sửa; không đổi production code để né CI.

## Tiếp tục sau khi giải phóng hộp native

Reload QA3003; mở nhà cung cấp QA nêu trên, sửa nháp → Đóng → Quay lại (nháp còn) → Đóng → Đồng ý (không lưu). Kiểm tiếp complete/cancel/return phiếu, hủy phép đo và ngưỡng với dữ liệu QA. Sau đó logout/login lần lượt hai Manager, Kế toán, Trader, kiểm menu/quyền và thao tác bằng UI, ở360/1024. Giữ tài khoản seed và dữ liệu gốc. Chỉ cập nhật hàng tương ứng trong ma trận khi có kết quả hiển thị xác nhận.
