# Admin local API — tài khoản và khóa truy cập

## Runtime và source

- Web: D:/Đồ_án/omts-web, API localhost:3002.
- Backend: D:/Đồ_án/omts-backend-meeting-20261106, controller mới AdminAccountsController.cs; image omts-api:meeting-admin-v2-20261106 trên cổng 8082.
- DB OMTS_MEETING_20261106 và volume tệp giữ nguyên. Container trước nâng cấp được giữ để rollback; không reset DB.
- Backend develop hiện không có actor SystemAdministrator. Chức năng này nằm trong runtime/worktree buổi họp, chưa tích hợp develop.

## Đã nối

- Dashboard/menu riêng Admin dẫn đến /system/accounts.
- Danh sách toàn bộ loại tài khoản: tìm tên/username, lọc loại/trạng thái, phân trang 20 bản ghi.
- Chi tiết tài khoản: tên, username, loại, liên hệ, trạng thái, ngày tạo/đăng nhập.
- Khóa/mở khóa Staff/Trader: lý do bắt buộc, xác nhận, rowVersion; khóa thu hồi phiên; lưu audit trong cùng SaveChanges.
- Bảo vệ tài khoản Owner/Admin khỏi khóa tại màn này. Không cho Admin dùng quyền Owner để chỉnh nuôi trồng.
- Nhật ký 100 thao tác Admin gần nhất: người thao tác, thời điểm Việt Nam, tài khoản, chuyển trạng thái và lý do.
- BFF chỉ nhận SystemAdministrator ở phase application, CSRF/body bound cho POST, whitelist query, schema validation response, recheck session; không tự gửi lại mutation.

## Kiểm tra

- Docker publish backend thành công. Lần đầu lỗi route ASP.NET do dùng tên dành riêng action với regex; đã đổi thành operation và khởi động được runtime.
- scripts/check-meeting-admin.mjs: đăng nhập sysadmin và session, danh sách DB, chi tiết, nhật ký; Owner bị chặn BFF.
- Với --test-lock-fixture: tài khoản QA riêng qa.admin.lockcheck.20261106 được khóa rồi mở lại thành công; rowVersion cũ bị từ chối; nhật ký có hai thao tác. QA fixture vẫn tồn tại, trạng thái cuối Active, không có grant; không sửa tài khoản nghiệp vụ.
- Web lint/typecheck/build chạy cho batch. Chưa kiểm tra visual browser ở lượt này.

## Còn thiếu

- Tạo tài khoản từ UI Admin, reset mật khẩu và quy trình cấp credential chưa triển khai. Quyết định cũ yêu cầu không trả mật khẩu tạm lên Web; API Owner hiện khác yêu cầu đó nên không tái sử dụng để giả tạo tài khoản Admin.
- Không mở khóa Owner/Admin, cấp thêm Admin, phân quyền vượt Owner hoặc tạo HTX mới trong đợt này.
- Không commit/push/merge. Báo cáo này không xác nhận Admin đã hoàn thiện toàn bộ SRS.
