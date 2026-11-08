# Hoàn thiện luồng demo — 06/11/2026

## Nhật ký

- Nguyên nhân: API8082 từ nhánh harvest chưa chứa controller audit đã có trên develop. Endpoint trả404, không phải DB không có dữ liệu.
- Ghép controller, DTO, service đọc, repository query và serializer che dữ liệu nhạy cảm hiện có từ develop vào worktree demo `D:/Đồ_án/omts-backend-meeting-20261106`. Không merge develop, không tạo nghiệp vụ/quyền mới.
- Adapter query tương thích schema demo trước workforce: actor nhân viên chưa tồn tại trong schema, trả null ở trường đó; lọc actor nhân viên trả rỗng. Account/System giữ dữ liệu thực. Không sửa schema/migrate/reset DB. Không coi đây là integration đầy đủ workforce.
- Image `omts-api:meeting-audit-20261106`; container vẫn `omts-meeting-20261106-api`, cổng8082. Container cũ giữ tên `omts-meeting-20261106-api-before-audit` để rollback; volume và DB giữ nguyên. API8080 không đổi.
- Owner: danh sách296nhật ký + chi tiết HTTP200 qua BFF. Manager1/2, kế toán HTTP403; chưa có API Manager audit theo vùng, không dùng endpoint Owner để mở quyền.

## Thông báo

- Một mẫu `MSG-FARM-01` của chứng nhận HTX dùng certification_name/number, khác mẫu giấy phép vùng. Parser cũ từ chối làm hỏng toàn trang502. Đã thêm mẫu chính xác, giữ kiểm tra structured content.
- Thêm nội dung tiếng Việt: hoàn thành phiếu nhập, giao dịch NCC/trả lại/hủy, trả trước sau hủy phiếu, lô thu hoạch, hoàn thành thả giống, ghi nhật ký và nhắc đóng chu kỳ.
- Cho phép `/open` trả loại chứng nhận HTX, phiếu nhập, thanh toán, lô thu hoạch. Backend recheck trước, rồi UI đọc hồ sơ hiện tại qua BFF/feature sẵn có, không lấy ID từ câu tiếng Anh hoặc mở quyền client.
- Chuông dùng Next Link, đóng preview sau khi điều hướng; reload số chưa đọc khi đánh dấu đã đọc thành công.
- Live: hộp thư của Owner/Manager1/Manager2/Kế toán200. Owner mở5loại record trên200. Đã đánh dấu thông báo demo PN000024 là đã đọc và đọc lại xác nhận persisted; không đánh dấu toàn bộ hộp thư.

## Vùng/bè

- Cả card lưới là nút mở hồ sơ, có tên truy cập và focus bàn phím; không cần nhắm nút “Mở hồ sơ”.
- Trong hồ sơ có “Xem vị trí trên bản đồ”. Vùng chỉ hiển thị vùng đang xem cùng các bè; bè chỉ hiển thị đúng bè đó. Dùng danh sách map được backend cấp, không tự gán tọa độ. Bản đồ chung vẫn giữ ở directory.
- Bè không nằm trong dữ liệu map (ví dụ bè đã ngừng mà backend map chỉ trả bè đang dùng) có trạng thái không có vị trí phù hợp; không thay bằng vị trí giả.

## Kiểm tra

- Docker build API đạt; health ready200. Live smoke4tài khoản đạt toàn bộ ca đọc đã có và các ca inbox/audit/open mới.
- Lint, typecheck, build đạt.30test liên quan đạt; sau bổ sung nội dung cuối,27test inbox/message đạt. Không chạy lại fullsuite3017ca.
- Chưa xác nhận các màn mới bằng browser ở lượt này (Edge bị thu nhỏ và chưa lấy được nội dung trang sau khi khôi phục). Không nhận nghiệm thu toàn bộ dự án; runtime vẫn thiếu các API sản phẩm/khách hàng/workforce từ các nhánh khác như báo cáo trước.
- Chưa commit/push; GitGuardian lịch sử vẫn thuộc phần chủ repo xử lý.
