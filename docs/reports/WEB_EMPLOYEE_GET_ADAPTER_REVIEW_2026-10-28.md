# EMP-API-04a — GET danh sách, hồ sơ và picker tài khoản

Ngày28/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD ban đầu `b60e9e7`; backend snapshot `953f597`. Đây là bước chuẩn bị server adapter, chưa bật API/refresh thật. Không đổi env, mount route, thay product service, commit/push/merge hoặc sửa Jira/SRS/backend. Giữ các thay đổi local từ trước.

## 1. Kết quả trong phạm vi yêu cầu

Đã chuẩn bị ba operation GET: danh sách nhân viên, hồ sơ đầy đủ theo ID và danh sách tài khoản có thể liên kết (`linkable-accounts`). Operation thứ ba là picker của màn nhân viên, không phải picker giao việc/lương mới. Adapter, query parser, serializer và success projection có test riêng và HTTP fixture.

MSG06 và các lệch role/contact gate không ngăn việc kiểm các hàm đọc này bằng fixture. Chưa nghiệm thu API/QA hoặc đổi nguồn dữ liệu của UI. Phần bounded error projection cho field/duplicate ID từng ghi chung ở04a được tách thành việc tiếp theo; yêu cầu lượt này là GET, không đóng phần lỗi mutation bằng generic diagnostic.

Nguồn đọc lại: [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203), dependency [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199), parent [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119), UC10 và [audit backend27/10](BACKEND_DEVELOP_UPDATE_AUDIT_2026-10-27.md); EmployeesController/EmployeeService/EmployeeRepository/StatusIds tại953f597. Ticket Web vẫn To Do, backend199 Done tại lượt đọc, không thay trạng thái.

## 2. Micro-task 04a.1 — query và request thuần

Thêm `src/features/employee-management/api/employee-read-request.ts` và34 test. List nhận đúng `search`, `statusId`, `zoneId`, `page`, `pageSize`; reject key lạ hoặc lặp. Giá trị số trong URL được kiểm toàn chuỗi trước khi chuyển kiểu, không dùng parseInt nhận cả `1junk`, không biến ô trống thành0. Default page1/pageSize20 theo backend; pageSize1–100.

Status ID401 là Employed,402 là Left, lấy từ catalog cố định. Không có statusId nghĩa là all theo API. **Không đổi default UI:** Jira quy định Employed ban đầu, nên caller UI tương lai phải gửi401 rõ ràng. Không gửi chuỗi `all` hoặc statusId rỗng để đoán ý định.

Search giữ nguyên ký tự và whitespace để backend tự xử lý; URLSearchParams encode tiếng Việt, dấu cộng, dấu &, dấu / hoặc chuỗi %20 như dữ liệu. Không decode hai lần hoặc nối search thẳng vào URL. Detail yêu cầu GUID; picker là endpoint cố định không nhận filter/employeeId phụ.

Kiểm thêm offset `(page-1)*pageSize` không vượt Int32 vì EmployeeRepository dùng phép tính đó trong Skip. Đây là kiểm giới hạn biểu diễn kỹ thuật ở request chưa mount, không đổi kích thước trang mặc định hoặc thêm bước nghiệp vụ. Đã kiểm nguồn và test biên, **chưa chạy .NET để tái hiện lỗi overflow**; không tuyên bố backend đã phát sinh incident hoặc tự sửa repository.

## 3. Micro-task 04a.2 — catalog và transport server

Mở rộng backend-endpoint.ts/backend-request.ts với `employeeList`, `employeeRead`, `employeeLinkableAccounts`. List có query đã kiểm; detail có GUID; picker không nhận body/query tùy ý. Parameters được parse/snapshot trước await; query server được freeze. Request không có body hoặc Content-Type, bearer vẫn do code server cung cấp.

Dùng transport chung đã có redirect:error, credentials:omit, cache:no-store, deadline và đọc response bounded. Không tạo generic proxy hoặc cho browser chọn origin/method/header backend. Mode mock/invalid không gửi HTTP. Các operation PUT/DELETE/auth hiện có được giữ và kiểm lại qua full suite.

## 4. Micro-task 04a.3 — read adapter và helper phiên dùng chung

Thêm `src/server/employees/employee-read-adapter.ts` với ba method list/detail/linkableAccounts. Factory chưa được product import hoặc mount. Chỉ nhận GET; input sai, method khác, request đã abort hoặc source không sẵn sàng bị chặn trước transport.

Sau validation, adapter resolve cookie, kiểm application phase và Owner, lấy access token từ phiên server, rồi gọi transport có AbortSignal. Authorization của browser không được dùng; cookie chỉ đưa cho resolver và không forward lên backend. Không gọi CSRF mutation guard cho GET vì endpoint này chỉ đọc; không thêm CORS/cookie/cache policy mới.

Resolve lại cùng cookie request sau HTTP để đối chiếu idHash/revision/account/backend session/subject/phase. Phiên đổi hoặc abort thì không trả dữ liệu cũ; lỗi hạ tầng không được coi là anonymous hoặc danh sách rỗng. Không retry, refresh, clear cookie hoặc gia hạn phiên.

Tách `resolveEmployeeSession`/`sameEmployeeSession` và dependency type sang `employee-session.ts`; mutation adapter03 dùng lại nguyên logic thay vì giữ hai bản. Helper resolve chỉ kiểm phase; từng adapter vẫn phải kiểm Owner trước upstream call. Tests mutation03 nằm trong suite cuối để kiểm hồi quy lần tách này.

## 5. Micro-task 04a.4 — success projection

Thêm `map-employee-read-success.ts` và15 test. Chỉ nhận200; list dùng schema/page mapper01, detail dùng full mapper với expected ID, picker dùng danh sách LinkableAccount. List không có version/ngân hàng để giả làm detail. Detail giữ đủ nullable fields, bank/zones, DateOnly và version; picker giữ phone của chính tài khoản, kể cả null.

List kiểm page/pageSize response khớp request đã kiểm. Không tự thay page hoặc nhận một page khác làm kết quả mới. Response204, status khác200, envelope sai, field thiết yếu thiếu, detail sai ID hoặc picker bị bọc `{items:...}` đều không được biến thành dữ liệu loaded/empty giả.

Result type khai báo rõ union của loaded page/employee/accounts và các lỗi projection. Failure server chỉ trả diagnostic/code đã được transport lọc; không raw body/cause/header/URL. Đây chưa phải DTO lỗi UI hoàn chỉnh hoặc policy xử lý401/logout mới.

## 6. Micro-task 04a.5 — lifecycle, HTTP và boundary

Thêm12 test adapter,17 test lifecycle và6 test HTTP. Có gate Owner/onboarding, source tắt, query/ID/method sai, server token, upstream error, resolver throw, recheck unavailable, abort và logout lúc response đang pending.

Hai detail request đồng thời được gắn với ID riêng, không có shared last-result cache. Test này **không chứng minh UI tự chọn filter mới nhất**: hai request cùng phiên cho hai bộ lọc đều có thể hợp lệ. Khi bind UI vẫn cần cancel/operation tracking và loại response cũ theo selection/query hiện tại. Recheck phiên không thay bài toán đó hoặc giao thức G1 nhiều tab.

HTTP dùng actual Node fetch tới peer loopback cổng tạm, không gọi .NET/DB. Kiểm query metacharacters nguyên vẹn, GET không có body/Content-Type/cookie browser, bearer từ phiên server, response được project, lỗi401/403/404,204,200 sai shape/page và redirect không được theo sang nơi khác.

Mở rộng negative compiler fixture để Client Component import read adapter và employee-session phải bị server-only từ chối. Không thêm route showcase trong sản phẩm hoặc fetch nhân viên trong render RSC.

## 7. Lỗi thực tế và cách sửa

Các test runtime mới chạy đạt, nhưng `npm run typecheck` bắt TS18048 ở map-employee-read-success.test.ts: `result.page is possibly undefined` dù đã kiểm loaded và có thuộc tính page. Nguyên nhân là TypeScript suy kiểu trả về từ ba nhánh object loaded khác nhau thành union có các field optional; kiểm `in` không đủ chứng minh page có giá trị.

Đây là vấn đề hợp đồng kiểu trả về, không phải API trả rỗng hoặc ngân hàng bị mất. Đã khai báo `EmployeeReadProjection` rõ ba dạng success với field bắt buộc tương ứng và union failure. Không thêm field JSON mới, không dùng any, cast hoặc non-null assertion để bỏ lỗi. Typecheck chạy lại đạt; test runtime/full suite kiểm sau sửa. Không có lỗi backend hoặc dữ liệu thật cần khôi phục.

## 8. Kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Query/request thuần |34 pass |
| Success projection |15 pass |
| Adapter/gates |12 pass |
| Lifecycle/concurrency |17 pass |
| HTTP loopback fixture |6 pass |
| `npm run typecheck` |Đạt sau sửa return type |
| `npm run test:boundary` |12 lượt đạt,6 fixture ×2 compiler; nhóm expiry kiểm4 module server gồm cả hai employee adapter và helper |
| `npm test` |1.927 pass/31 Redis skip;163 files pass/4 skip,94,81s |
| `npm run lint` |Đạt, không warning |
| `npm run build` |Đạt;18/18 pages, không thêm employee API route |
| `npm run test:serialization` |4 lượt Webpack/Turbopack đạt; DTO qua HTML/RSC, token props bị chặn, không có secret canary trong public artifacts/logs |
| Tài liệu/Git |250 link Markdown nội bộ không có link hỏng; diff/whitespace đạt; bài học107 được ignore; backend sạch tại953f597, Web HEAD vẫnb60e9e7 |

Tổng84 test mới.31 Redis skip vì không cung cấp integration endpoint chuyên dụng, không tính là đã kiểm Redis lại. Không chạy lại backend CI, QA, migration/seed hoặc browser UI. Kết quả full-suite này bao gồm các thay đổi local từ trước, không chỉ riêng GET.

## 9. Tự review và phần chưa hoàn tất

Đã rà các key/default/filter status với backend, duplicate query, encoding, Int32 offset, origin/headers/body, row summary/detail/picker, session isolation, response status/ID/page và old mutation regressions. Có kiểm trước/sau cho lỗi type; chưa phát hiện lỗi khác trong phạm vi đã kiểm, không coi là bằng chứng không còn lỗi.

GET preparation không cần chờ MSG06 nên đã hoàn thành riêng. Còn mở: bounded field/duplicate error DTO; product routes và no-store response headers khi mount; G1/session/login/logout runtime; frontend query/selection tracking và chuyển workspace/form cũ sang model đầy đủ; QA trên revision/DB được phép. MSG06/role/contact/refresh giữ quyết định cũ, không dùng mock để bù phiên API.

Không có quyết định nghiệp vụ mới cần người dùng chốt. UI tiếp tục mock. Plan/context ghi rõ phạm vi GET đã chuẩn bị; bài học107 lưu local trong docs/learning theo gitignore.
