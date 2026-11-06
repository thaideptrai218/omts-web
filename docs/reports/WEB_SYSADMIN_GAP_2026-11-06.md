# Sysadmin: nguyên nhân và phạm vi cần bổ sung

## Kết quả kiểm tra source local

- Web mock có tài khoản sysadmin / Demo@1234, chỉ có workspace.overview.view và platform.cooperative.provision.
- .env.local là mock; .env.api.local là api. Tài khoản mock không phải tài khoản backend. Chưa tái hiện đăng nhập trên browser trong lượt này nên chưa khẳng định cổng user đang mở dùng mode nào.
- Backend develop: src/OMTS.Domain/Enums/SubjectType.cs chỉ có CooperativeOwner, Staff, Trader.
- DeploymentBootstrapper ghi rõ “no System Administrator since 22/10”; bootstrap triển khai tạo Owner đầu tiên, không tạo sysadmin.
- AccountsController và AuditEventsController yêu cầu RequireCooperativeOwner; không phải API quản trị toàn hệ thống.
- Web /system/cooperatives/new API hiện trả thông báo không có quyền; mock có màn provisioning.

## Yêu cầu người dùng mới

Admin xem tất cả tài khoản, tạo tài khoản và khóa/mở khóa; cần thêm nhật ký quản trị. Đây là yêu cầu khôi phục actor backend đã bỏ, không thể hoàn thành bằng mở menu hoặc chèn tài khoản DB.

## Backend cần triển khai trước khi nối API thật

1. Actor quản trị và cách cấp tài khoản ban đầu; không cho tự đăng ký Admin.
2. Danh sách/chi tiết tất cả tài khoản, phân trang/lọc loại/trạng thái; xác định phạm vi một HTX hoặc nền tảng.
3. API tạo tài khoản và quy tắc loại tài khoản được phép tạo, cấp credential đúng contract đã thống nhất.
4. Khóa/mở khóa kèm lý do, xử lý phiên hiện hữu, bảo vệ quản trị viên cuối cùng và ràng buộc Owner/Kế toán duy nhất.
5. Nhật ký hành động Admin; phân biệt quyền Owner đọc nhật ký HTX hiện có.
6. Contract quyền, đăng nhập/refresh/permissions cho actor mới; seed và migration có kiểm tra dữ liệu.

## Web cần triển khai khi có contract

Không gian quản trị riêng; danh sách tài khoản; chi tiết; tạo; xác nhận khóa/mở khóa; lịch sử quản trị; điều hướng và route/BFF gates tương ứng. Không dùng API Owner để vượt phạm vi.

Giữ yêu cầu trước đây: chỉ note API backend còn thiếu, không tự tạo API khi chưa chốt mở phạm vi. Không sửa DB, không commit/push trong lượt kiểm tra này.
