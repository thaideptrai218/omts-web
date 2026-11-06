# Yêu cầu theo role và việc tiếp theo — 02/11/2026

Người dùng yêu cầu ưu tiên hoàn thiện màn API thật hiện có, giữ thay đổi local, chưa merge develop. Sau đó xác nhận đang xem localhost:3000/farming/rafts: tiến trình next dev đúng repo, nhưng OMTS_DATA_SOURCE=mock nên sidebar cũ không có workforce. Màn Phân công và chấm công nằm ở /operations/workforce khi chạy API. Các mục dưới là yêu cầu và khoảng thiếu, không phải tính năng đã hoàn thành.

| Phạm vi | Đã có trong Web/API hiện tại | Việc cần bổ sung / phụ thuộc |
|---|---|---|
| System Administrator: toàn bộ tài khoản, khóa/mở khóa, nhật ký | `/api/accounts` quản lý Staff của HTX và khóa/mở khóa có lý do, backend chỉ cho Cooperative Owner | Cần API quản trị toàn hệ thống và ma trận quyền Admin; không dùng API Owner để suy ra quyền toàn hệ thống. Xác định phạm vi HTX, loại tài khoản, lý do ban, hệ quả với phiên và lịch sử. |
| Manager: xem bè/làn | Có màn xem bè, sơ đồ theo ngày/phiên bản, chọn đoạn xem sự kiện/người ghi/xác nhận | Người dùng đã sửa lại yêu cầu: chỉ Owner tạo/sửa bè, ảnh và trạng thái. Manager giữ quyền đọc trong vùng được cấp. |
| Manager: biết ai làm gì lúc nào | Đoạn làn có ngày nghiệp vụ, người ghi và xác nhận; đã hiển thị khi chọn đoạn | Nguồn hiện chỉ trả ngày, không có giờ thao tác. PR26 audit search cho Owner, chưa có quyền Manager theo vùng. Cần actor, action, recordedAt có timezone, entity/zone, phân trang/lọc; phân biệt thời điểm ghi và ngày nghiệp vụ. Không dựng giờ giả hoặc lấy log Owner cho Manager. |
| Manager: phân công nhân viên thu hoạch | Màn Phân công và chấm công đã chọn nhân viên, vùng, bè, loại việc, ngày; có vào/ra và đổi việc theo API workforce | Có thể dùng loại việc thu hoạch đã cấu hình. Việc tạo hồ sơ nhân viên mới vẫn Owner-only trong backend. Chưa có liên kết assignment ↔ harvest lot hoặc form báo cáo kết quả thu hoạch. |
| Báo cáo thu hoạch trong ngày | Sơ đồ có từng khoảng từ–đến m và trạng thái nguồn | Cần HARVEST API (OMTS-221), phụ thuộc CYCLE OMTS-220 và invoices OMTS-224: kg thực tế/ước tính, bè/làn/khoảng mét, phần đã thu/chưa thu, nhân viên/ca, ghi chú và lịch sử chỉnh sửa. Không tự đổi mét thành kg. |
| Danh bạ thương lái / bên nhận giao hàng | Có yêu cầu mua và phản hồi Owner; duyệt yêu cầu tài khoản Zalo | Chưa có API danh bạ khách/thương lái đầy đủ để lưu liên hệ. Cần ID liên kết tài khoản/khách, tên, liên hệ, địa chỉ giao, trạng thái và quyền xem/sửa. Phân biệt thương lái nhận hàng với đơn vị vận chuyển; chờ BA xác định nếu cần cả hai. Không biến danh sách yêu cầu mua hoặc nhà cung cấp thành danh bạ. |
| Quản lý vật tư | Có Danh mục vật tư (`/workspace/input-items`), tìm/lọc nhóm/trạng thái, tạo/sửa/ngừng/Resume theo Owner; phiếu nhập/trả NCC và chi phí vật tư theo bè | Người dùng xác nhận chỉ Owner ghi danh mục; Manager chỉ đọc theo quyền. Quản lý tồn kho/cấp phát/tiêu hao chưa được coi là có chỉ vì đã có danh mục và phiếu nhập. |

## Đã sửa trong lượt này

- Sidebar ẩn hình thanh cuộn trên desktop/mobile drawer, vẫn giữ `overflow-y: auto` để cuộn bằng chuột, touch và bàn phím.
- Sơ đồ bè thêm tổng chiều dài Chưa thả / Đang nuôi / Đã thu / Đã ghi giảm từ các đoạn tình trạng API của ngày đang xem. Không lấy lịch dự kiến thu làm kết quả đã thu. Thêm hướng dẫn chọn đoạn để xem nguồn.
- Kiểm tra targeted workflow 12 tests PASS; lint/typecheck/build PASS (41 routes). Chưa nhận browser QA role PASS hoặc deploy thay đổi mới này.

## Backend cần phản hồi cùng một lần

1. Admin API quản lý toàn bộ tài khoản, ban/unban có lý do và nhật ký toàn hệ thống thuộc ticket nào?
2. Đã chốt lại 02/11: chỉ Owner sửa cấu trúc bè/làn và danh mục vật tư; không mở quyền ghi cho Manager.
3. Khi nào phát hành nhật ký theo vùng cho Manager, với giờ, người thao tác, hành động, bản ghi và quyền bảo vệ dữ liệu?
4. Contract HARVEST và liên kết nhân viên/phân công, ngày/vùng/bè, kg, khoảng m làn, ghi chú, chỉnh sửa và phần còn lại?
5. Contract danh bạ khách/thương lái, liên hệ và giao hàng; có cần đơn vị vận chuyển riêng không?

Giữ phạm vi API thật đã được người dùng chốt. Các đề nghị mới được ghi để backend/BA xác nhận contract; không tự thêm endpoint backend hoặc cho quyền bằng frontend.
