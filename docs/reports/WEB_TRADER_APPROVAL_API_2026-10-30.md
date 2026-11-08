# Owner duyệt yêu cầu thương lái — 30/10/2026

Người dùng trả lời “Đồng ý nối duyệt/từ chối” cho bước Owner xử lý yêu cầu tài khoản Trader từ Zalo, theo contract branchdc00b2f. Đây là quyết định cho luồng yêu cầu từ Zalo; không thay signup Web đã duyệt, tạo Staff hoặc chính sách ba role.

Owner mở **Yêu cầu thương lái** trong API workspace. Danh sách chờ/đã từ chối, tìm tên/SĐT, tên/phone/note/date/reason; preview và xác nhận trước khi ghi. Từ chối yêu cầu lý do trim1..1000 theo backend. Đang ghi khóa close/filter/actions. Chỉ success đúng accountId và ACTIVE/REJECTED mới báo thành công, reload list; không tự thay đổi account khác. Unknown write giữ selected request/reason, khóa mutation kể cả sau GET, không tự retry. Explicit cancel bỏ confirmation; không gửi lệnh.

Repository → BFF `/api/trader-requests` GET/POST → backend `/api/trader-requests` /`{accountId}/approve` /`{accountId}/reject`. Strictquery/body/confirmed:true, Owner application session, CSRF, fixed paths, projection, private/no-store, recheck session sau response, không trả token hoặc raw exception. Backend chịu status rule và customer link; Web không ghép thêm mutation account/customer. Rejected row chỉ xem, gửi lại là Mini App.

## Kiểm chứng

16 tests BFF/component đạt: Owner/read projection, Staff/Trader denied, duplicate/forgedquery, blank/longreason, confirmation, foreignCSRF, responseID/status mismatch, replaced session, cancel và uncertain/reload giữ lý do/no replay. Lint/typecheck/build41/41 đạt. Không mở rộng thành toàn bộ test suite sau thay đổi này.

Built-product regression61 assertions PASS, gồm route mới anonymous401/no-store/no Set-Cookie (GET vẫn dynamic, không bị prerender mock404).

HTTP thật Web127.0.0.1:3003/backend127.0.0.1:8081/database QA riêng: tạo2 yêu cầu qua FakeZalo Development provider; approve→ACTIVE và ZaloFake login200; repeatapprove bị từ chối; blankreason400; reject→REJECTED/reason giữ sau reread và ZaloFake login403. Manager GET403, Trader POST403, anonymous401, foreignCSRF403. Đã logout các session Web và session backend thử sau approve. Đây là kiểm API thật với provider giả của backend, không phải Zalo OpenAPI thật hoặc browser E2E.

Giữ thêm2 pending request có tên `QA chờ duyệt…` /`QA chờ từ chối…` để tester chạy. Account/customer/audit của lần QA được giữ trong DB8081; seed credentials và DB8080 không đổi. Evidence cục bộ ignored `docs/learning/trader-requests-live-evidence.json`.

## Giới hạn contract

Backend hiện chỉ nhận accountId, không nhận rowVersion hoặc request-generation ID. Status check ngăn repeat sau khi đã xử lý nhưng không đủ để đối chiếu atomically một yêu cầu cũ với lần Trader gửi lại sau khi bị từ chối. Web không bịa version, lock đa client hoặc hứa bảo vệ race này; cần backend bổ sung expected version/requestID nếu muốn ràng buộc quyết định vào đúng snapshot đã xem. User đã duyệt nối contract hiện tại; ghi rõ giới hạn cho reviewer. Thông báo sau approve được backend gửi sau lần save đầu tiên, nên lỗi sau commit có thể trả lỗi dù account đã active: UI phải đối chiếu, không replay.

Chưa kiểm browser/viewport cho modal mới trong lượt này; component tests không thay thế360/1024/browser. Bản built QA sẵn cho tester, chưa merge backend hoặc Web.
