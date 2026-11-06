# Bàn giao tester — cập nhật 02/11/2026

**Cập nhật 03/11/2026 — tài khoản local mock.** Dùng `owner`, `manager`, `manager2`, `ketoan`, `trader` với mật khẩu chung `demo123`. Kế toán là tài khoản duy nhất toàn HTX; không thể cấp thêm vai trò Kế toán khi grant hiện tại còn hiệu lực. Manager gửi phiếu cho Kế toán; Owner không có bước accept. Thông báo Owner vẫn chờ backend event contract, không tính PASS chỉ từ mock UI.

Để thử local: đăng nhập `manager` → **Vật tư & mua hàng → Phiếu nhập và yêu cầu thanh toán** → nhập vùng/NCC/mã hóa đơn/số tiền → gửi. Đăng xuất, vào `ketoan` → **Thanh toán nhà cung cấp** → xác nhận bản ghi demo. Đăng xuất, vào `owner` → **Phiếu nhập và yêu cầu thanh toán** để xem thông báo/trạng thái; không có accept. Dữ liệu reset khi reload/tab mới. [Bằng chứng](../reports/WEB_LOCAL_ACCOUNTING_FLOW_2026-11-03.md).

**Cập nhật mới hơn: thử local không cần backend.** Người dùng làm rõ muốn chạy thử ngay trên3000, nên đã bổ sung demo workforce. Vào Nhân sự & phân quyền → Phân công và chấm công hoặc `/operations/workforce`; chọn ngày, vùng/bè, công việc và nhân viên → Lưu → xác nhận; thử Gỡ khi chưa vào làm hoặc Vào làm → Ra về. Owner xem các vùng đang dùng, Manager chỉ vùng được giao. Đây là dữ liệu thử trong bộ nhớ, reload/tab mới sẽ khởi tạo lại. Không tạo dữ liệu backend; các mô tả chỉ có route API ở đoạn lịch sử bên dưới đã được thay bằng bản demo cho workforce. Xem [báo cáo](../reports/WEB_LOCAL_WORKFORCE_DEMO_2026-11-02.md).

Lưu ý local3000: đã xác minh đang chạy chế độ mock, nên sidebar không có Phân công và chấm công. Màn API ở `/operations/workforce` (menu Chức năng → Phân công và chấm công cho Owner/Manager đủ quyền); route này cố ý không mở ở mock. Cần backend và Redis chạy cùng cấu hình API trước khi kiểm luồng này. Chưa đổi `.env.local` hoặc tự mở dịch vụ. Owner demo đã đổi tên thành Ngô Nam Trung; nếu phiên đang mở còn tên cũ, đăng xuất/đăng nhập lại, không xóa dữ liệu hoặc reset mật khẩu.

Manager chỉ xem bè/làn/vật tư theo quyền; Owner mới được sửa. Nhật ký Manager đã duyệt phạm vi trong [đề xuất](../decisions/WEB_MANAGER_ACTIVITY_PROPOSAL_2026-11-02.md), nhưng chỉ note để nhóm backend bổ sung API, chưa có màn/API phát hành. Đợt đổi tên/ghi nhận này:30 targeted tests, lint/types/build41 routes PASS trong bản copy riêng để tránh ghi `.next` của dev3000.

**Chưa thông báo nghiệm thu end-to-end thu hoạch→giao dịch.** Những bước đó còn chờ API backend, theo lựa chọn trực tiếp của người dùng. Xem [báo cáo API](../reports/HARVEST_TO_TRANSACTION_API_GAP_2026-11-02.md).

## Địa chỉ và môi trường

- URL chính: https://omts-web.vercel.app/ (project omts-web). `/login` là màn đăng nhập thật; `/` đã sửa để đi vào luồng này.
- URL deployment ngẫu nhiên có Vercel Deployment Protection; tester dùng URL chính.
- Project Vercel hiện chưa có environment production. Cần backend HTTPS, Redis phục vụ BFF và bộ biến G1/G2 hợp lệ trước khi có thể đăng nhập API thật. Ready của build chưa chứng minh dịch vụ đăng nhập hoặc backend sẵn sàng. Không dùng mock để che việc thiếu dịch vụ.
- QA local dự kiến http://127.0.0.1:3003 / API8081. Docker đang được khôi phục; chưa xác nhận runtime API/SQL/Redis hoặc browser theo role ở revision này. Không reset DB/volume, không tự thu hồi grant để vượt migration.

## Luồng hiện có cần chạy khi môi trường sẵn sàng

1. **Owner:** đăng nhập; quản lý sản phẩm; mở yêu cầu mua; chấp nhận số lồng/ngày nhận/cho trả sau hoặc từ chối có lý do. Đối chiếu lại yêu cầu từ phiên Trader.
2. **Trader:** chỉ xem sản phẩm đang dùng; gửi yêu cầu mua số lồng nguyên dương; xem phản hồi của Owner và hủy trong trạng thái cho phép. Không xem/sửa yêu cầu của tài khoản khác. Luồng này chưa tạo giao dịch bán/hóa đơn/thanh toán.
3. **Hai quản lý vùng:** menu/action theo effective functions, kiểm vùng được cấp và chặn vùng còn lại; đọc yêu cầu mua theo quyền, không có nút Owner phản hồi. Hồ sơ nhân viên đầy đủ còn Owner-only theo backend.
4. **Kế toán:** chỉ các action có effective permission; quyền danh mục/nợ/thanh toán NCC theo fixed matrix, không suy từ tên role. Chặn tạo/sửa các màn không được cấp.
5. **Thông báo:** mở hộp thư không tự đánh đọc. Với thông báo có ID hồ sơ được hỗ trợ, chọn Xem hồ sơ liên quan; backend kiểm quyền lại rồi Web tải hồ sơ thật. Kiểm phép đo, nhắc đo theo vùng, giấy phép, tài khoản.403/404 giữ thông báo và trạng thái đọc; không suy UUID từ mã hiển thị. Bản ghi cũ không có ID vẫn đọc nội dung được.
6. **Tùy chọn Push:** catalog theo tài khoản, mandatory khóa bật; lưu optional Push khi chưa có thiết bị vẫn nhận notice; tải lại kiểm dữ liệu đã lưu.
7. **Sau lỗi ghi chưa rõ kết quả:** đối chiếu dữ liệu thật, giữ nháp; không bấm gửi lại liên tiếp hoặc coi GET là bằng chứng lệnh trước chưa chạy.

Tài khoản QA dùng bộ seed và tài liệu QA hiện có; không reset mật khẩu trong đợt này. Các số liệu unit/CI không thay cho kết quả browser/runtime, và bộ dữ liệu QA cũ phải được giữ trước khi nâng migration.

## GitGuardian

Người dùng chọn để chủ repo xử lý. Backend finding nằm ở commit lịch sửf752693, `tests/OMTS.Api.IntegrationTests/Accounts/AccountMessageCodeQaTests.cs`; HEAD đã sinh dữ liệu password test theo lượt chạy. Web findings trỏ các commit fixture/mock/test lịch sử. Chủ repo cần đối chiếu incident trong workspace846924; không suppress check hoặc viết lại lịch sử để đổi trạng thái CI. Phần này không được ghi là đã sửa xanh.
