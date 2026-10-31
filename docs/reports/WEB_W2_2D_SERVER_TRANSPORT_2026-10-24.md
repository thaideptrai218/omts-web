# W2.2d — Server HTTP transport độc lập

Ngày24/10/2026, nhánh `feature/OMTS-132-web-foundation`. Phạm vi: chuẩn bị tầng HTTP server, không bật API/refresh thật, không commit/push/merge trong lượt này.

## 1. Kết luận và nguồn đối chiếu

Transport đã có code và tests độc lập. Factory không gửi request khi được tạo, không đọc `process.env` lúc import, không được app/components/features gọi. `auth-service.instance.ts` vẫn tạo mock environment. Không gọi backend .NET, thay env local, seed DB, sửa Docker/mobile/SRS/Jira hoặc thay luồng UI.

Đã đọc context, AGENTS, plan/decision register, config/catalog, HTTP parser/mapper và auth wire schema. Jira OMTS-132 hiện Done, parent OMTS-121 In Progress; đó là trạng thái tracking, không phải bằng chứng lát API mới đã nghiệm thu. Catalog tiếp tục dựa trên snapshot backend `develop@48ae1e0`; lượt này không fetch backend hoặc xác nhận deploy hiện hành. Phải audit lại contract trước tích hợp thật.

Đọc tài liệu `fetch`/data security của Next16.4.3 đang cài. Next mở rộng fetch với Data Cache: cấu hình `no-store` rõ ràng, mỗi request có signal riêng, không chọn revalidation/tags. [Next data security](https://nextjs.org/docs/app/guides/data-security) phân biệt server-only với việc lọc DTO; [Fetch Standard](https://fetch.spec.whatwg.org/#concept-request-redirect-mode) là cơ sở cho redirect error. Test HTTP dùng fetch thật của Node24.13.1 đang chạy, không suy kết quả từ tài liệu Node latest khác version.

## 2. Các micro-task đã thực hiện

### d1 — Chuẩn bị request

`src/server/backend/backend-request.ts` kiểm tra envelope strict. Public login chỉ nhận JSON body; các endpoint khác cần Bearer token riêng. Profile update nhận body; GET/logout không nhận body. Đây là kiểm tra hình thức truyền tải, không quyết định field hồ sơ, actor/gate hay validation nghiệp vụ. Service tương lai vẫn phải dùng wire schema, ví dụ `loginRequestSchema` và `clientType:"Web"`.

Không nhận URL, method, cookie/header bag, cache/redirect/dispatcher/signal override từ request. Method/path chỉ lấy từ catalog. Token giới hạn16 KiB và đúng ký tự Bearer, không trim; ký tự xuống dòng/control/space bị từ chối. Có token không có nghĩa đã kiểm tra quyền.

JSON được snapshot trước await, giữ nguyên khoảng trắng mật khẩu; caller đổi object sau đó không đổi request đang chạy. Giới hạn tài nguyên request64 KiB UTF-8, không phải validation độ dài tên/mật khẩu và không thay max200 đang cần xác nhận. Đây cũng không thay giới hạn ingress/body parsing của handler sau này. Cyclic/non-JSON/throwing input trả invalid-request, không giữ Zod issues/cause chứa secret.

### d2 — Đọc response có giới hạn

`backend-response.ts` đọc stream, đếm byte thực tối đa1 MiB, decode UTF-8 strict rồi parse JSON. Không tin Content-Length; trả invalid-response nếu success sai media type, malformed JSON/UTF-8 hoặc vượt cap. Giới hạn áp dụng cho các endpoint nhỏ trong catalog hiện tại, không phải generic upload/download client.

Logout204 không parse JSON;204 ở endpoint cần DTO bị từ chối. 3xx không được trả như success. Không trả raw Response, Set-Cookie, Location hoặc toàn bộ headers.

Failure HTTP chỉ giữ status, code có trong message catalog và Retry-After dạng số milliseconds hợp lệ. Không giữ raw detail/title/stack/params/currentRowVersion/cause vì upstream có thể phản chiếu request/secret. Error body sai định dạng vẫn giữ HTTP status, không tạo message nghiệp vụ mới. MSG06 code được nhận diện nhưng **chưa render conflict và chưa có projection metadata**. Không thay parser W1 đang có, không tự đóng W1.2/W5.3 hoặc dùng câu dự phòng đã bị từ chối. Khi backend bổ sung structured params, cần dedicated schema/projection và tests trước khi hỗ trợ đầy đủ.

### d3 — Thực thi transport

`backend-transport.ts` nhận environment server tường minh, dùng parser W2.2a để snapshot config. Thiếu/sai config trả invalid-config; mock source trả disabled, không gọi mock adapter. API config hợp lệ cũng không tự chạy vì module chưa nối vào composition.

Mỗi request tạo AbortController/timer riêng. Fetch dùng `credentials:"omit"`, `redirect:"error"`, `cache:"no-store"`; chỉ tự tạo Accept, Content-Type nếu có body và Authorization nếu cần. Deadline bao cả fetch lẫn đọc body; finally dọn timer. Redirect bị native fetch từ chối trả unavailable, không phân tích raw exception. Cancellation dựa vào fetch tuân thủ AbortSignal của Node/Next; injected fetcher là test/server seam tin cậy, không phải plugin/request từ browser.

Không retry401/429/5xx, không gọi refresh, không publish client session-expiry event hoặc tự xóa phiên. Retry-After chỉ là metadata. Timeout/mất mạng sau write có thể xảy ra **sau khi backend đã lưu hoặc revoke**; không báo rằng backend chắc chắn chưa xử lý. UX reconciliation vẫn chờ quyết định ở lát tương ứng.

`backend-result.ts` ghi rõ success.data là unknown nội bộ, có thể chứa token login. Cần validate DTO/account binding/gate và chỉ chiếu field công khai ở tầng kế tiếp; không trả nguyên kết quả này từ handler hay RSC. Marker không phải serializer an toàn. W2.2e và W2.3/W2.4 vẫn mở.

### d4 — Kiểm tra trên HTTP thật trong test

`__tests__/http-fixture.ts` tạo server chỉ127.0.0.1, port0 tự cấp và đóng server/sockets trong finally. Không cố định port5280, không truy cập DB/QA hoặc dùng credentials thật.

11 cases dùng native Node fetch chứng minh: JSON login giữ password, không gửi cookie; upstream Set-Cookie không được trả trong result; logout204; cross-origin302/307/308 đích nhận0 requests; same-origin redirect không vượt catalog; stalled headers/body hết deadline; đọc update rồi mất socket chỉ có1 write; chunked body quá cap; concurrent identities/token riêng;429/code/retry metadata được lọc, không retry. Không coi fixture là backend contract hoặc Web browser/RSC/Next Data Cache E2E.

### d5 — Boundary và tự review

Thêm4 runtime marker cases và mở rộng fixture Client Component cố tình import cả config/transport. Runner yêu cầu lỗi server-only có trace hai module dưới Webpack và Turbopack, không chấp nhận bất kỳ lỗi build ngẫu nhiên nào. Fixture nằm ngoài product app. Không đổi resolver Vitest sang react-server toàn cục hoặc bỏ guard thật để tests chạy.

Đã review đường input → URL/method/headers/body → deadline → stream → typed result; các nhánh401/timeout/redirect không thay session, config mock/invalid không gửi request. Grep không thấy runtime import transport/config trong app/components/features; auth composition vẫn mock. README sửa hướng dẫn cũ vốn bảo đặt public upstream URL, không sửa env thực tế.

## 3. Bằng chứng kiểm tra mới

| Kiểm tra | Kết quả |
| --- | --- |
| Request preparation |36 cases PASS |
| Response projection |30 cases PASS |
| Transport unit |23 cases PASS |
| Native fetch + local HTTP |11 cases PASS |
| Existing endpoint catalog |23 cases PASS; tổng backend folder123 PASS |
| Toàn Vitest |96 files/792 PASS,3 files/27 live Redis SKIP; tổng819 cases |
| npm run test:boundary |2 negative builds PASS: Webpack + Turbopack |
| npm run lint |PASS |
| npm run typecheck |PASS sau sửa test ES2017 |
| npm run build |PASS,13 static outputs, không thêm product route/handler |
| npm audit --json |PASS, vulnerabilities {}, total0; không thay dependency |
| Docs/Git hygiene |51 relative links resolve;12 untracked files trong backend/report không trailing whitespace; git diff --check PASS; learning72 ignored, staged diff rỗng |

100 cases transport mới,4 marker và2 config regression là106 cases thêm so với baseline686 PASS. Redis không bị sửa và không chạy lại live trong lượt này; bằng chứng713/713 và27 live trên6.2.24 thuộc lượt trước, không thay27 SKIP hiện tại. Không thêm dependency hoặc thay lockfile trong W2.2d; các thay đổi package đang có là W2 tích lũy từ trước.

## 4. Lỗi thực tế và cách sửa

Lần đầu `npm test -- src/server/backend` có response suite parse error ở assertion UTF-8: dấu ngoặc đóng `expect` sai khiến `.status` nằm ngoài biểu thức. Tách result ra biến rồi assert result.status; suite mới thực sự được chạy, không che bằng skip.

Cùng lượt có4 assertion GET/logout fail: `expect.anything()` loại cả undefined, trong khi body undefined là hành vi đúng. Đổi expected body thành JSON string cho request có body và undefined cho request không body; không sửa transport để gửi `{}` vào GET/logout cho test xanh.

`npm run typecheck` báo TS2737 tại literal `1n`: tsconfig target ES2017 không phát sinh cú pháp BigInt literal, dù runtime Node hỗ trợ. Dùng `BigInt(1)` làm invalid-input fixture, giữ target và libs hiện tại. Vitest xanh không thay typecheck vì transform không kiểm tra type/target như tsc. Rerun transport120 cases, full787 và typecheck/build đều PASS sau sửa; review regression sau đó nâng tổng cuối lên792.

Tự review đặt giả thuyết dấu `$` có thể nhận terminator cuối token/timeout. Đã thêm3 bearer và3 config cases rồi chạy **trước khi sửa**; tất cả PASS (native regex và Zod đều từ chối trên Node hiện tại). Giả thuyết không tái hiện, không có căn cứ sửa production. Loại config LF test trùng case đã có; giữ5 regression cases mới (3 token,2 config CR/CRLF). Không báo đây là lỗ hổng đã được vá; không thay regex đã kiểm chứng đúng. Full suite sau đó792 PASS/27 SKIP.

Lúc tìm docs có một đường dẫn cũ `03-api-reference/02-functions/fetch.md` không tồn tại. Dùng `rg --files` tìm file thật trong `04-functions/fetch.md`, đọc trước khi code; không coi lỗi file thiếu là Next không có tài liệu.

## 5. Giới hạn và bước tiếp theo

Không phát hiện xung đột nghiệp vụ mới cần tự chốt. Các điểm cũ giữ nguyên: MSG06 metadata, refresh ambiguous/retry, profile slice/capability, Staff email-OR-phone vs backend, cookie/CSRF/lifetime, key provider/deploy và Redis durability. Không áp dụng profile update thật chỉ vì catalog có PUT.

Tiếp theo W2.2e: chia nhỏ typed DTO/error projection và kiểm tra serialize/log ở server, tách public DTO khỏi token-bearing success; chỉ đánh dấu JSON/RSC/handler evidence khi có đường chạy thật. Sau đó mới chốt cookie/CSRF ở W2.3, DAL guards W2.4 và login W3. Audit backend/OpenAPI trước activation; không bật refresh thật.

Bài học72 ở docs/learning được lưu local, gồm khái niệm, data flow, lỗi test thực tế và defense Q&A. Thay đổi chưa staged/commit/push; không merge develop.
