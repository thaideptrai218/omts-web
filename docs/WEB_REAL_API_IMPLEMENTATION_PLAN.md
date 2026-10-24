# Web — kế hoạch ghép API thật: Auth và hồ sơ

> Lập ngày 23/10/2026, cập nhật/review ngày 24/10/2026 (Asia/Saigon). Trạng thái thực hiện xem checklist W0–W7 bên dưới; không coi toàn bộ plan là chưa làm hoặc đã hoàn thành.
> Duy Thái ưu tiên Web, tạm dừng Mobile. Không thay SRS/Jira, không tự sửa backend.
> Bằng chứng và vấn đề: [báo cáo audit](reports/WEB_REAL_API_READINESS_AUDIT_2026-10-23.md).

> **Tiến độ 24/10/2026:** W0.4, W1.1, W1.3 và W1.4 đã có implementation/tests độc lập theo snapshot. W1.2 phần MSG06 chờ backend bổ sung đủ thông tin, không thêm câu dự phòng. Mapper chưa ghép vào API/menu live; catalog BA và binding platform còn chờ. Báo cáo mới nhất: [W1.3/W1.4](reports/WEB_API_W1_3_W1_4_PROFILE_PERMISSION_MAPPING_2026-10-24.md); báo cáo trước: [W0–W1](reports/WEB_API_W0_W1_SECURITY_SCHEMA_ERRORS_2026-10-24.md).

> **Review toàn W0–W1:** [kết quả, findings và các cổng còn mở](reports/WEB_W0_W1_FULL_REVIEW_2026-10-24.md). Chạy lại 69 files/401 tests, lint/typecheck/build đều đạt; dependency audit 0 findings tại lượt review đó. W0.5 và phần conflict W1.2 vẫn chưa hoàn tất. Finding WREV-02 đã được [vá cấu hình CI](reports/WEB_CI_TEST_GATE_REVIEW_2026-10-24.md): thêm `npm test` trước build, checks local đạt. Giữ nguyên triggers; push feature không có PR phù hợp chưa kích hoạt CI/secret scan, chưa có bằng chứng GitHub runner cho bản vá.

## 1. Phạm vi và quyết định

- **Đã chốt trong phiên này:** Web dùng BFF Next.js; trình duyệt chỉ giữ mã phiên trong cookie HttpOnly, access/refresh token ở server. Chưa chốt nơi lưu phiên. Chấp thuận BFF không có nghĩa đã chấp thuận một thư viện, Redis, database hay cookie lifetime cụ thể.
- **Đã chốt trước:** không tự tạo Staff QA; chỉ bootstrap Owner, Staff do backend cung cấp. Không sửa trực tiếp cờ verified hoặc bỏ gate để demo.
- **Đã chốt trước cho Mobile:** chờ backend hỗ trợ refresh retry/idempotency. Đề xuất giữ nguyên cho Web; đang hỏi xác nhận, chưa bật refresh.
- **Đề xuất đang hỏi:** lát hồ sơ đầu chỉ đọc + lưu tên; email/SĐT, đổi mật khẩu tự nguyện, notification, đăng ký, recovery, quản trị tài khoản không nằm trong lát API đầu. Không gọi mock cho danh tính thật.
- **Nghiệp vụ chưa đồng bộ:** Staff email OR phone được Duy Thái chấp thuận cho frontend; backend/SRS hiện vẫn phone-only. Không tự đổi quyết định OR thành phone-only, cũng không bỏ gate backend.
- **Dependency blocker đã vá 24/10:** Next.js 16.4.3, eslint-config-next 16.4.3 và Vitest/mocker 4.1.12; audit 0 findings, build sau vá đạt. Đây không đóng các blocker session/guard/QA còn lại; không tắt cảnh báo để báo hoàn thành.

Mục tiêu đầu tiên là một lát có thể kiểm tra độc lập: credentials → phiên giới hạn hoặc phiên ứng dụng → hồ sơ đúng người → logout. Có endpoint chưa đồng nghĩa đã chạy QA đạt.

## 2. Contract là snapshot, không phải cam kết bất biến

Backend được kiểm tra: `develop@48ae1e0438cec5d1123e7f7f6726377242855ce5`; Web gốc `5ae1b66`, nhánh `feature/OMTS-132-web-foundation`.
Backend local `http://127.0.0.1:5280`, Swagger `/swagger/v1/swagger.json`, readiness 200. Chỉ truy cập loopback; không đưa dev inbox lên LAN/tunnel. Không ghi token, mật khẩu hay nội dung inbox vào fixture/report.

| Nghiệp vụ | Wire contract đang thấy | Ranh giới cần giữ |
| --- | --- | --- |
| Login | `POST /api/auth/login`, `{identifier,password,clientType:"Web",deviceName?}` → `AuthTokens` | Token chỉ server; `mustChangePassword` ưu tiên trước `phoneVerificationRequired` |
| Identity | `GET /api/me` → accountId/sessionId/username/subjectType | Không đủ để suy ra quyền, tên cá nhân hoặc tên HTX |
| Quyền | `GET /api/me/permissions` → functions/actions/scope + grants | Có gate; không lấy role label làm quyền; đối chiếu accountId |
| Refresh | `POST /api/auth/refresh`, `{refreshToken}` → cặp token mới | Có rotation/reuse revocation; chưa có retry/idempotency được chốt |
| Hồ sơ đọc | `GET /api/me/profile` → ProfileView | Qua phone gate được, qua forced password gate không được; phone có thể null |
| Hồ sơ lưu tên | `PUT /api/me/profile`, `{displayName,rowVersion}` | Controller thực trả `{profile,message}`; Swagger annotation hiện lại ghi ProfileView |
| Logout | `POST /api/auth/logout`, Bearer → 204 | Qua hai gate được; local UI sạch không đồng nghĩa upstream đã revoke |

`rowVersion` phải được gửi lại nguyên giá trị đã đọc, không decode thành ngày giờ. Backend có giới hạn tên 200, schema Web hiện chưa có max; cần thống nhất validation trước khi áp dụng. Error thực là ProblemDetails có `code`/`detail`, không bảo đảm `{code,params}` như catalog UI. Enums runtime dùng tên; Swagger có thể không diễn tả đủ required/nullability nên phải kiểm tra controller, service và response thật, không sinh client rồi tin tuyệt đối.

Khi bắt đầu mỗi lát:

1. Ghi SHA backend, OpenAPI và endpoint đang dùng; không mặc định checkout local chính là deploy QA.
2. Đối chiếu phần request/response/error của lát đó, không snapshot cứng cả hệ thống.
3. Dùng fixture đã bỏ secret; test chấp nhận thêm field không ảnh hưởng, nhưng báo lỗi khi mất field thiết yếu/đổi kiểu/đổi enum ảnh hưởng bảo mật.
4. Nếu khác: chỉ dừng adapter phụ thuộc; không sửa toàn bộ UI hoặc tự nhận contract mới là nghiệp vụ được duyệt.
5. Smoke contract phải opt-in với server/fixture QA được cho phép; unit test vẫn chạy khi backend tắt. Không tự ghi đè expected fixture cho test xanh.

## 3. Thiết kế đã chọn và phần còn mở

Trình duyệt gọi endpoint cùng origin trong Next.js. Route Handler/DAL phía server gọi .NET với token lấy từ session store. React nhận DTO tối thiểu đã bỏ token, không nhận nguyên AuthTokens. Server Component gọi DAL trực tiếp thay vì vòng HTTP qua chính Route Handler.

Cookie chứa mã phiên không đoán được, không phải JWT backend. Session store cần tách theo phiên, hạn sử dụng, revoke/tombstone và cơ chế chống ghi đè bởi response cũ. Trước khi cài adapter lưu trữ phải chốt môi trường deploy, một hay nhiều instance, durability và cách bảo vệ token lúc lưu. In-memory chỉ là ứng viên dev/test, không được coi production-ready hoặc âm thầm chọn.

Cookie production cần HttpOnly, Secure, SameSite/path phù hợp; ngoại lệ HTTP local phải tách rõ. HttpOnly không chống mọi XSS/CSRF: mutation phải kiểm tra origin/CSRF theo thiết kế được duyệt, giới hạn payload, che secret trong log, chống open redirect, và không tạo generic proxy nhận URL tùy ý. Không tin `X-Forwarded-For` do browser gửi; thống nhất trusted proxy/rate limit với backend vì BFF có thể gom nhiều người vào một IP.

Next hiện bật Cache Components. Không cache chung session/profile/permissions giữa người dùng. Kiểm tra quyền tại DAL/endpoint/page có dữ liệu; layout hay Proxy chỉ là lớp điều hướng bổ sung. Cookie chỉ được đổi trong Route Handler/Server Action phù hợp, không refresh hoặc set cookie trong render RSC. Chưa thay SSR/caching code trong audit này.

## 4. Micro-task và tiêu chí nghiệm thu

Mỗi task đi theo Context → Design → Code → Test → Review. Trước code giải thích Cái gì/Tại sao/Hoạt động/Defense; sau task lưu bài học local, báo cáo file đổi + test + giới hạn. Không tạo branch/commit cho mỗi dòng nhỏ, không tự merge develop.

### W0 — Audit và cổng môi trường

- [x] **W0.1:** Đọc context, service/repository, auth state, HTTP client, route shell, profile editor; đối chiếu SRS UC02/05/07, backend source/OpenAPI và Jira foundation.
- [x] **W0.2:** Kiểm tra readiness, anonymous SSR, baseline; thêm 5 characterization tests tái hiện mất mã lỗi. Test xanh không có nghĩa các lỗi đã sửa.
- [x] **W0.3:** Viết plan, report và decision register; không ghi credentials. Không đổi Jira/SRS.
- [x] **W0.4 — dependency security:** được Duy Thái cho phép 24/10, đã nâng patch và review package/lock diff; audit 0 findings, test/lint/typecheck/build đạt. Có npm cleanup EPERM với SWC cũ trên Windows, ghi rõ trong report; không force-delete hoặc coi warning là đã giải quyết. Dev server cũ cần restart trước review runtime mới.
- [ ] **W0.5 — QA fixture:** backend cung cấp account sẵn dùng và account gate cho từng actor/scope. Owner bootstrap hiện còn forced password; không tự đổi mật khẩu để vượt cổng. Ghi ma trận accountId/actor/trạng thái, giữ credential ngoài Git. Thiếu account thì chạy fixture tests, không báo end-to-end thật đạt.

### W1 — Adapter chịu được API thay đổi, làm được trước store

- [x] **W1.1 — wire schemas:** đã có `src/features/auth/api/` và `src/features/profile/api/`, schemas login/tokens/refresh/me/permissions/profile/update envelope theo snapshot48ae1e0, cùng37 tests mới. Không token storage/fetch/UI hoặc `as AuthAccount`; domain mapper và live adapter chưa được triển khai ở bước này. Test missing/wrong type/enum/additive/null và request boundaries.
- [ ] **W1.2 — lỗi theo ngữ cảnh (transport đã làm, MSG06 chờ backend):** parser ProblemDetails, errorContext opt-in protected/profile, MSG12/13/67/68/69, retry metadata, abort/network/body read, structured JSON và observer isolation đã có tests. Năm audit cases chuyển thành regression tests. WEB-API-05 đã chốt không dùng câu dự phòng; chờ backend trả đủ structured user_name/time, kiểm chứng response và bổ sung test trước ghép conflict thật. MSG06 vẫn giữ wire code/currentRowVersion; fallback MSG04 hiện tại không được coi UX conflict hoàn chỉnh. Không bật refresh hoặc API thật.
- [x] **W1.3 — profile DTO/domain:** mapper thuần parse/account binding/nullable contact, giữ Unicode và opaque version, role labels không cấp quyền. Mock/UI xử lý contact null; có25 tests mới gồm2 component render tests. Chưa gọi API hoặc đổi validation/contact/Customer policy.
- [x] **W1.4 — permission mapping theo snapshot, chưa activation:** catalog26 functions tại48ae1e0, action-specific grant projection giao summary, union chỉ cùng function/action/dataScope. Bảng capability binding ở report; platform provisioning chưa có binding nên unmapped. Có36 cases mới/hồi quy; helper từ chối scope rỗng và hợp nhiều entries đúng. OwnRecords được giữ, không tự định nghĩa record ownership; OMTS-123 chưa chốt. Không thay mock menu hoặc coi quyền frontend thay backend/server guard.

Đầu ra W1 là mapper/test độc lập; chưa bật request thật trong UI. Nếu backend đổi, sửa schema/mapper của lát tương ứng, không đổi LoginForm/ProfileEditor đồng loạt.

### W2 — Session BFF, phụ thuộc chốt nơi lưu phiên

- [ ] **W2.1 — store contract:** đề xuất `src/server/auth/session-store.ts` với read/create/revoke/compare-and-set, clock và store injection. Mô hình limited/password-required/contact-required/application tách rõ. Test TTL, SID không tồn tại, revoked, hai account, stale update sau logout. Chốt store adapter trước triển khai runtime.
- [ ] **W2.2 — server boundary:** `src/server/auth/` và backend transport có `server-only`; URL dùng env server `OMTS_API_BASE_URL` (tên đề xuất), không secret trong `NEXT_PUBLIC_*`. Thêm validated config với source mode tường minh; API lỗi không fallback mock. Test invalid config, không rò token qua JSON/log/RSC, chỉ gọi backend allowlisted.
- [ ] **W2.3 — cookie/CSRF:** Route Handlers dưới `src/app/api/`, session cookie helper, origin/CSRF checks được thống nhất. Test cookie flags theo env, cookie sai/hết hạn, origin lạ, credential log redaction và redirect ngoài origin. Không commit `.env.local`.
- [ ] **W2.4 — DAL/guard:** verify session + effective permission trước dữ liệu nhạy cảm trong DAL/page/endpoint. Client AuthProvider chỉ phục vụ UI. Test anonymous SSR và direct endpoint không trả private DTO; không lấy HTTP status của streamed redirect làm bằng chứng duy nhất. Test RSC/prefetch/back sau logout không lộ dữ liệu cache. Không dùng `use cache` chung cho thông tin phiên.

### W3 — Đăng nhập và khôi phục phiên

- [ ] **W3.1 — login server:** handler nhận identifier/password, trim identifier nhưng giữ nguyên password, gửi clientType Web. Validate token response ở server, tạo SID mới chống fixation; không mở application session nếu đang gate. Request thất bại hoặc thiếu quyền không để lại phiên app mồ côi. Test đúng/sai credentials, double submit, timeout, malformed token response, các MSG lỗi.
- [ ] **W3.2 — hydration:** server phân biệt application session/limited session, gọi `/me` và quyền/hồ sơ ở thời điểm hợp lệ. `organizationName` không có trong login payload: không gán tên cá nhân bằng tên HTX. Test reload/new tab, lỗi permissions không nhảy dashboard; accountId nhất quán giữa các payload; không cache account A cho B.
- [ ] **W3.3 — gate mapping:** bổ sung khả năng Owner forced password (domain hiện Staff-only); phải duyệt luồng/gate trước code. Thứ tự password → contact → app. API chưa hỗ trợ email-OR-phone theo quyết định frontend: phần Staff đó chờ alignment, không hack `/me/permissions` hay verified flags. Test từng tổ hợp cờ bằng fixtures; runtime chỉ dùng actor/fixture đã hợp lệ.
- [ ] **W3.4 — UI composition:** thay `auth-service.instance.ts` qua factory/repository injection sau khi server đủ cổng; LoginForm giữ thiết kế hiện tại, có pending, retry lỗi mạng, MSG12 không xóa một phiên khác. AuthProvider cập nhật có session generation; response login/getSession/onboarding cũ không phục hồi phiên sau logout. Test trước bằng fake scheduler; browser thật khi có fixture.

Không bật credentials API thật rồi vẫn gọi account-security/profile/verification mock của account đó. Các màn chưa nối API phải được giới hạn capability/điều hướng trong API mode theo phương án được duyệt; giữ mock mode riêng để phát triển phần còn lại, không thêm panel “showcase” vào sản phẩm.

### W4 — Logout sớm để thử vòng đời an toàn

- [ ] **W4.1 — revoke server:** BFF đánh dấu phiên không dùng được trước khi chờ .NET logout; clear cookie đúng phạm vi, upstream204 không parse JSON. Test logout từ limited/app session, cookie thiếu, upstream401/timeout. Timeout không được báo rằng upstream chắc chắn đã revoke.
- [ ] **W4.2 — race/cache:** dùng generation/tombstone để load profile/onboarding/refresh đang treo không phục hồi phiên. Logout cũ trả về sau login mới không xóa cookie phiên mới. Test late response, hai tab, quay lại protected route, pending submit và user B login sau user A logout.
- [ ] **W4.3 — offline/revocation debt:** SRS UC07 có đánh dấu revoke khi online; helper hiện chỉ bỏ qua lỗi. Đề xuất server-side revoke intent có hạn dùng và retry an toàn, tách xóa quyền BFF khỏi xác nhận backend. Chốt policy khi browser không tới được cả BFF: HttpOnly cookie không xóa bằng JS; không lưu token vào browser để “queue”. Chưa chốt policy thì không báo UC07 offline hoàn thành.

### W5 — Hồ sơ thật, tách khỏi xác minh liên hệ

- [ ] **W5.1 — đọc:** adapter GET profile → domain nullable, skeleton/lỗi/retry; displayName sidebar cùng account. Forced password không gọi profile vô ích. Test 200/401/403 gate/5xx, nullphone, stale result sau logout, không suy “không có fixture” thành account thật không có hồ sơ.
- [ ] **W5.2 — lưu tên, chờ xác nhận phạm vi:** PUT chỉ `{displayName,rowVersion}`; parse `{profile,message}` theo controller, không tin annotation Swagger hiện tại. Xác nhận max200/độ dài với backend trước áp schema UI. Test trim, Unicode,200/201 ký tự, version conflict409, username không gửi, null/malformed envelope. Thành công cập nhật sidebar theo accountId/generation.
- [ ] **W5.3 — conflict và mất phản hồi:** theo WEB-API-05 đã chốt 24/10, chờ backend bổ sung đủ structured user_name/time; không thêm câu dự phòng, parse câu tiếng Anh hoặc bịa thông tin. Với timeout PUT, đề xuất không tự resend mutation mà tải lại để đối chiếu trước khi cho lưu tiếp, giữ draft an toàn; policy mất phản hồi vẫn cần duyệt riêng. Test retry không ghi đè version mới, không toast thành công khi chưa biết kết quả.
- [ ] **W5.4 — ranh giới contact/security:** API mode không cho nút đổi email/SĐT/đổi mật khẩu chạy mock rồi báo đã lưu. Đề xuất contact read-only và thao tác chưa hỗ trợ được giới hạn có lời giải thích đúng người dùng; giữ flow mock ở mode riêng. Phải duyệt cách giới hạn trước đổi UI. Tách integration contact sau vì có currentPassword, OTP, commit riêng và tác động Customer phía backend.

### W6 — Refresh: chuẩn bị bằng fixture, live vẫn chờ

- [ ] **W6.1 — contract/backend agreement:** BE cung cấp retry key/idempotency semantics: cùng token+key, hai key song song, response bị mất, process crash, retry window, lỗi/đổi quyền/expiry/revoke. Đây là đề xuất câu hỏi, không yêu cầu tự sửa backend. Chưa có thì không gọi endpoint refresh thật tự động.
- [ ] **W6.2 — coordinator:** per-session single-flight + atomic replacement trong store đã chốt, hỗ trợ nhiều tab/Next workers. Promise/module Map chỉ gom được một process, chưa đủ production. Test 20 request đồng thời, session A không khóa session B, store conflict, response cũ sau logout, access token hết hạn với clock giả.
- [ ] **W6.3 — policy replay:** chỉ replay request an toàn theo policy đã duyệt; không refresh vì login401, không retry vô hạn, không replay PUT mù sau timeout. Phân biệt network không biết kết quả với refresh bị từ chối. Test lost response sau rotate, replay token cũ, expiry tuyệt đối,403 quyền không refresh, mutation không tự lặp.
- [ ] **W6.4 — bật có kiểm soát:** opt-in config, default live refresh tắt tới khi có bằng chứng; expired access không lén dùng mock hay tự kéo TTL. Chốt hành vi UX trong thời gian refresh tắt trước demo API, không tự chọn forced login cho kết quả refresh không xác định. Smoke đúng backend revision rồi mới mở QA.

### W7 — Review xuyên suốt và nghiệm thu

- [ ] **W7.1:** unit/contract tests không cần backend; opt-in smoke API bằng account được cấp, không tự seed/update quyền.
- [ ] **W7.2:** browser 360/1024, bàn phím, focus lỗi, pending/toast, reload, expiry, logout/back/new tab; test anonymous SSR/direct route và không thấy JWT trong browser response/storage.
- [ ] **W7.3:** full test/lint/typecheck/build + security audit, ghi pass/fail/skip và SHA. Review diff không secrets/learning files; báo cáo hạn chế local/QA, không chuyển Jira Done bằng số unit tests.

## 5. Làm gì khi phải chờ backend?

Ưu tiên W0.4 → W1.1/W1.2 → W1.3/W1.4; sau khi chốt store mới W2. Login ghép cùng logout, rồi profile; refresh live làm sau. Có thể tách người làm schema/profile/permission fixtures nhưng review từng task và chỉ một nơi sửa auth state/session.

Trong lúc chờ contract/gate/QA account: hoàn thiện test dữ liệu null, message parser, mapping scope, accessibility của UI sẵn có và tài liệu kiến thức. Không tự chuyển sang module nghiệp vụ mới, thay policy xác minh hoặc mở API mode nửa thật nửa mock. Thay đổi dependency là task an toàn riêng; đổi nghiệp vụ luôn hỏi.

## 6. Checklist đóng mỗi lát

Đọc lại ticket và parent/dependency truy cập được; ghi rõ phần không đọc được. Cập nhật contract revision và decision liên quan. Thêm test happy/error/race, chạy checks; tự review security và UI. Cập nhật report và bài local. Chỉ commit/push khi được yêu cầu, không merge develop. Mốc “chuẩn bị xong” không phải “ghép API xong”, “local xong” không phải “QA xong”.
