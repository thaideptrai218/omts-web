# Thử phân công và chấm công trên local3000 — 02/11/2026

## Điều chỉnh phạm vi theo người dùng

Người dùng yêu cầu nhìn thấy màn và thao tác thử local, sau đó hỏi rõ vì sao phải có backend. Đã bổ sung demo local cho workforce. Đây là thay đổi tiếp theo so với quyết định chỉ màn API trước đây; không chuyển dữ liệu demo thành dữ liệu thật hoặc tạo API backend. Môi trường `.env.local` giữ mock.

## Đã làm

- Sidebar local có Phân công và chấm công trong Nhân sự & phân quyền, route `/operations/workforce` không còn404 ở mock. Chế độ API tiếp tục render WorkforceScreen cũ, không sửa auth/session/gateway/BFF.
- Demo có danh sách theo ngày, lọc vùng, tìm nhân viên/công việc, form chọn vùng/bè/loại việc/ngày/nhân viên, lưu có xác nhận, gỡ phân công chưa vào làm, ghi vào/ra và hiện giờ Việt Nam.
- Repository demo dùng danh sách nhân viên, vùng, bè và quyền hiện tại của môi trường mock. Chỉ nhân viên đang làm việc ở vùng đó được chọn. Owner xem các vùng đang dùng; Manager chỉ vùng đang có grant Quản lý vùng hiệu lực, kiểm lại mỗi lần đọc/ghi. Accountant/không có quyền bị từ chối. Alias staff-verified của demo dùng hồ sơ Manager Đông tương ứng.
- Không gửi HTTP hoặc ghi backend. Dữ liệu trong bộ nhớ cùng phiên trang, quay lại bằng navigation trong ứng dụng còn dữ liệu; tải lại trang/tab mới khởi tạo lại. UI báo rõ chế độ thử và giới hạn này.
- Không đổi quyền thêm/xóa cấu trúc vùng, bè, làn. Yêu cầu mới Manager đánh dấu đang/đã thu hoạch được note riêng ở `docs/decisions/WEB_MANAGER_HARVEST_MARKING_2026-11-02.md`; tiếp tục chờ contract backend, không tự tạo endpoint.
- Sửa cảnh báo Next instant-unrendered-segment của route operations: `instant=false` riêng page vì demo session được phục hồi trên client và chủ động chưa render children trước xác thực; theo tài liệu Next cài trong repo. Không đổi policy cookie/session hoặc tuyên bố navigation đã tối ưu.

## Kiểm tra

29 targeted tests PASS (5 files): sidebar local, scope Manager, chặn chéo vùng, gán hàng loạt atomic, trùng phân công, version cũ và chấm công, UI đầy đủ từ lưu đến vào/ra và không gọi fetch, các luồng auth/profile mock liên quan. Lint/types/build41 routes PASS sau sửa instant flag và capability `workforce.assign` chỉ dùng điều hướng demo; không đổi permission payload API.

Browser Owner local3000: login, thấy menu, mở form, chọn Khu Đông/B1-01/Thu hoạch/Nguyễn Văn An, xác nhận lưu, vào làm và ra về có xác nhận đều PASS; hiển thị giờ20:16 ngày02/11/2026. Ảnh local `docs/learning/workforce-local-demo-20261102.png`. Không coi demo là QA API end-to-end. Phần đổi việc, thêm loại việc, cấu hình công và nghỉ phép đầy đủ tiếp tục có ở màn API; demo hiện hỗ trợ chuỗi phân công/chấm công cơ bản trên đây.

Browser Manager `nguyen.an`: đăng nhập thấy mục ở Nhân sự & phân quyền, mở trang và form chỉ có Khu Đông; không hiện Khu Nam. Form360px hiển thị đủ trường/nút, đóng không kẹt nháp; desktop1024 hiển thị sidebar. Đã reset viewport. Kiểm tra sau sửa instant không có badge issue mới trên route.
