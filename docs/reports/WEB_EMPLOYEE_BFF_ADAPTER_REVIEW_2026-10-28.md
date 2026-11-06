# EMP-API-03 — adapter BFF nhân viên, chưa mở API thật

Ngày28/10/2026, Asia/Saigon. Web giữ nhánh `feature/OMTS-132-web-foundation`, HEAD ban đầu `b60e9e7`; backend snapshot `953f597`. Giữ toàn bộ thay đổi P7 và EMP-API-01/02 trước đó. Không commit/push/merge, đổi Jira/SRS/backend, seed/migration, env hoặc bật API/refresh thật.

## 1. Phạm vi đã hoàn thành

Đã làm các phần độc lập của adapter mutation: catalog request server, transport PUT/DELETE, CSRF/Owner/session gate, kiểm lại phiên trước khi trả kết quả, success projection và phân loại lỗi nội bộ. Factory mới ở `src/server/employees/employee-mutation-adapter.ts` **chưa được import vào Route Handler, server instance hoặc component**.

Đây không phải một EmployeeManagementRepository hoàn chỉnh thay mock. GET danh sách/detail/picker, frontend binding, chuyển form/workspace cũ sang model đầy đủ, HTTP error DTO cho UI và release QA chưa hoàn tất. Các điều kiện còn chặn được tách ở mục6; không dùng kết quả fixture để nói API đã nghiệm thu.

Nguồn đã đọc lại: [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203) To Do, dependency [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199) Done, epic [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119), [OMTS-214](https://welterial.atlassian.net/browse/OMTS-214), UC10 và báo cáo [01a/01b](WEB_EMPLOYEE_SCHEMA_MAPPER_REVIEW_2026-10-28.md), [02](WEB_EMPLOYEE_REQUEST_SERIALIZATION_REVIEW_2026-10-28.md). Không có quyết định nghiệp vụ mới cần người dùng chọn lại trong lượt này. Audit26/10 đặt BFF ở EMP-API-04; lượt này theo yêu cầu mới dùng EMP-API-03 cho phần adapter BFF, còn số mốc cũ trong audit giữ để tra lịch sử.

## 2. Từng micro-task và luồng dữ liệu

### 03a — Catalog và request server

Mở rộng `src/server/backend/backend-endpoint.ts`, `backend-request.ts`, `backend-transport.ts` với hai operation cố định `employeeUpdate`/`employeeUnlink`. Không thêm generic URL, method, headers hoặc query từ browser. PUT chỉ có GUID; DELETE có GUID và raw version đã kiểm base64. Target vẫn phải thuộc origin được cấu hình phía server, refresh vẫn không có trong catalog.

Request server giữ bearer riêng; routing parameters được snapshot/freeze. PUT dùng serializer02 và giới hạn request64KiB sẵn có. DELETE chỉ encode version trong resolver target; không có body/Content-Type. Các request auth cũ vẫn giữ shape và path; test regression của transport/auth nằm trong suite cuối.

Catalog được mở rộng trong factory server không đồng nghĩa API đã bật. Không thêm singleton mới hoặc route cho nhân viên; mode mock/invalid vẫn không gửi HTTP.

### 03b — CSRF, input và Owner

Factory nhận environment và resolver/transport từ code server đáng tin cậy; không đọc `process.env` lúc import. Request đi qua source/config → method/cancellation → CSRF/body guard đã duyệt → GUID/schema/query → session resolver/application gate → subject Owner → transport.

PUT dùng JSON strict và body budget64KiB; DELETE không nhận body. Cả hai dùng policy đọc body5s. CSRF kiểm Origin/header tùy chỉnh/Sec-Fetch-Site bằng helper C2A hiện có. PUT không nhận query phụ; DELETE cần đúng một `rowVersion`. Version đã double-encode hoặc dấu cộng thô bị đọc thành khoảng trắng sẽ bị từ chối, không tự sửa.

Token chỉ lấy từ `ResolvedServerSession.readAccessTokenForBackend()`. Header Authorization do browser gửi bị bỏ qua; cookie browser chỉ đưa cho resolver, không chuyển lên backend. Staff/Trader/SystemAdministrator hoặc phiên onboarding không được gửi employee mutation. Kiểm subject ở BFF không thay authorization/HTX scope của .NET.

### 03c — Kết quả muộn, success và lỗi

Sau khi transport hoàn tất, adapter resolve lại **cookie của request đó** và so idHash/revision/account/backendSession/subject/phase trước khi trả dữ liệu. Nếu phiên không còn hoặc khác, bỏ dữ liệu và trả `session-changed`; hạ tầng không sẵn sàng trả `unavailable`. Không xóa cookie mới, không refresh hoặc gửi lại mutation. Abort được truyền xuống transport; một response success đến sau abort không được publish.

Việc đọc lại phiên phụ thuộc resolver cung cấp trạng thái đúng. Nó không chứng minh đã hoàn thành G1 nhiều tab: cookie trong một request là snapshot, không tự đổi theo cookie mới ở browser. G1 runtime/ledger và login/logout xuyên suốt vẫn là điều kiện trước khi mở ứng dụng API.

HTTP200 đi qua decoder02, kiểm envelope/ID; DELETE còn account hoặc response sai kiểu bị từ chối. No-op account đã null không bắt version phải tăng. Success chỉ trả EmployeeRecord đã project, không raw copy, token, cookie hoặc credential một lần.

MSG06 trả `{status: contract-blocked, reason: conflict-metadata, code: MSG06}` nội bộ; không bịa tên/giờ, parse câu tiếng Anh hoặc thêm fallback UI. Các lỗi khác giữ diagnostic có endpoint/status HTTP và code đã biết khi có; không raw detail/cause/URL/header. **Đây chưa phải error DTO hoàn chỉnh cho UI**: field errors, existingEmployeeId/MSG24 và cách ghép MSG19 vào HTTP/session lifecycle còn phải làm trước activation. Không dùng generic result này để báo mutation chắc chắn chưa lưu: timeout hoặc logout sau gửi có thể xảy ra sau khi backend đã commit.

### 03d — HTTP và compiler fixture

Thêm4 file test cùng fixture server ở `src/server/employees/`. Bốn ca HTTP dùng Node peer cổng loopback tạm thời: DELETE rồi PUT version mới;409 MSG06; redirect307;204 không có body. Đây là actual Node fetch tới fixture, **không phải gọi .NET hoặc DB**.

HTTP fixture xác nhận hai lượt encode trên hai chặng khác nhau: browser→BFF query được đọc thành version gốc, rồi BFF→backend encode version gốc một lần nữa. URL outbound không chứa `%25`, peer đọc đúng chuỗi raw. PUT sau đó có version mới nguyên văn trong JSON, giữ draft/ngân hàng/vùng; bearer chỉ từ phiên server, cookie browser và Set-Cookie upstream không được đưa vào kết quả.

Mở rộng negative fixture `tests/fixtures/expiry-boundary/app/page.jsx` và danh sách kiểm trong `scripts/test-server-boundary.mjs`. Cả Webpack và Turbopack phải chỉ rõ server-only rejection của adapter mới. Đây là fixture cố ý không build được, không phải route showcase/product.

## 3. Hai lỗi thực tế đã sửa

**Abort trước khi bắt đầu:** `npm test -- src/server/employees` đầu tiên có1 fail/51 pass. Ca request đã abort mong `unavailable` nhưng nhận `rejected/httpStatus400`. Guard body đang đúng: nó từ chối đọc request đã hủy. Adapter mới còn thiếu bước dừng sớm trước guard nên request hủy bị phân loại như input lỗi. Đã thêm kiểm `request.signal.aborted` trước CSRF/body, giữ nguyên guard chung và trạng thái nội bộ không retry. Ca này chạy lại đạt; không phát sinh request tới backend thật hoặc thay luồng UI.

**Kiểu header trong test:** `npm run typecheck` báo TS2345 tại employee-mutation-adapter.test.ts: bảng object có header khác nhau bị suy ra union với các key optional mang giá trị undefined, không phù hợp HeadersInit/Record<string,string>. Vitest vẫn chạy được vì bước transform không thay thế TypeScript typecheck. Đã khai báo bảng fixture là `RequestInit[]`, không cast any hoặc sửa production guard. Typecheck chạy lại đạt; không có thay đổi nghiệp vụ.

## 4. Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Nhóm test employee server mới |61 pass:13 request/target,25 gate/input,19 lifecycle,4 HTTP |
| Regression endpoint/request/transport cũ |82 pass ở lượt targeted đầu, sau đó bao gồm trong full suite |
| `npm test` |1.843 pass/31 Redis skip;158 files pass/4 skip,88,59s |
| `npm run typecheck` |Đạt sau sửa fixture; chạy lại sau bổ sung test cũng đạt |
| `npm run lint` |Đạt; chạy lại sau bổ sung test cũng đạt |
| `npm run test:boundary` |12 lượt kiểm đạt:6 fixture ×2 compiler; adapter được chặn import từ Client Component |
| `npm run build` |Đạt;18/18 pages, không thêm employee API route |
| `npm run test:serialization` |4 lượt Webpack/Turbopack đạt; DTO qua HTML/RSC, token props bị chặn đúng guard, không có secret canary trong public artifacts/logs |
| Tài liệu/Git |248 link Markdown nội bộ không có link hỏng; diff/whitespace đạt; bài học105–106 được ignore; backend vẫn sạch tại953f597 |

31 Redis skip không phải bằng chứng Redis được kiểm lại; không cung cấp Redis integration endpoint trong lượt này. Không chạy .NET, seed/migration, runtime/API thật, browser UI hoặc CI GitHub. Full suite bao gồm các thay đổi local trước đó;61 ca mới là phần EMP-API-03.

## 5. Tự review

Đã đối chiếu route/method/optional version với controller953f597; kiểm catalog không nhận origin/path tự do và dữ liệu auth cũ không bị thêm parameters. Đã rà cookie/token boundary, query duplicate/double-encode, Owner/onboarding, cancellation, late response, status200/204 và redaction. Hai lỗi trên có bằng chứng trước/sau sửa. Chưa phát hiện thêm lỗi trong phạm vi kiểm, không coi đây là bằng chứng không còn lỗi.

Không serialize ResolvedServerSession/GuardedMutationBody hoặc raw BackendTransportResult ra browser. Dependency resolver được test bằng fixture, chưa phải Redis/cookie acceptance mới. Adapter không bảo đảm rollback hoặc ngăn được backend commit sau khi request bị hủy; backend vẫn là nơi quyết định permission/version/transaction.

## 6. Điều kiện còn mở và phần làm tiếp

| Phần | Trạng thái và hướng tiếp theo |
| --- | --- |
| Mutation server seam |Đã có factory/tests, chưa mount HTTP route/singleton hoặc đổi product service |
| MSG06 |Chờ backend structured người sửa/thời gian theo quyết định cũ; không thêm fallback |
| API login/session/G1 và401/logout |Tiếp tục plan W3–W7/G1; chỉ dùng runtime đã kiểm phiên/ledger và policy hiện hành, không tự chọn nơi phát/clear cookie ở adapter này |
| Read API và error DTO cụ thể |Còn lát chuẩn bị cho GET/list/detail/picker và projection field/duplicate IDs; không ép vào workspace mock thiếu bank/zones hoặc nuốt metadata thành generic success |
| Role/contact gate |Các lệch đã ghi ở audit27/10 vẫn cần nhóm backend/BA đồng bộ trước các luồng liên quan; không dùng mock để bù real session |
| Backend CI/QA/DB |Trạng thái gần nhất là snapshot audit27/10, chưa kiểm lại ở lượt này; phải xác nhận revision/migration/dữ liệu được phép trước test QA |
| EMP-API-04/05 |Client/route binding và nghiệm thu race/release trên môi trường được chọn còn pending; không đánh dấu Jira Done |

Không có xung đột nghiệp vụ mới cần tự chốt. Đã tiếp tục các phần không phụ thuộc MSG06 qua HTTP/CSRF/session/boundary fixture, không dừng chờ metadata hoặc bật API thật để lấy bằng chứng. Bài học105–106 trong docs/learning được ignore; báo cáo và plan là tài liệu nhóm, bài học vẫn local.
