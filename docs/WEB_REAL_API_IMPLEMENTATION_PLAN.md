# Web — kế hoạch ghép API thật: Auth và hồ sơ

> Lập ngày 23/10/2026, cập nhật/review ngày 24/10/2026 (Asia/Saigon). Trạng thái thực hiện xem checklist W0–W7 bên dưới; không coi toàn bộ plan là chưa làm hoặc đã hoàn thành.
> Duy Thái ưu tiên Web, tạm dừng Mobile. Không thay SRS/Jira, không tự sửa backend.
> Bằng chứng và vấn đề: [báo cáo audit](reports/WEB_REAL_API_READINESS_AUDIT_2026-10-23.md).

> **Cập nhật source 25/10:** `origin/develop@776fbc0` thêm Docker demo seed (Owner, Staff, Trader và dữ liệu HTX), nên W0.5 có thể thử bằng Development local sau khi Docker chạy; QA fixture/deployment vẫn chưa được chứng minh và checkbox W0.5 giữ mở. Endpoint auth/profile hiện hữu, nhưng refresh vẫn không có retry/idempotency và MSG06 vẫn không trả tên/thời gian dạng field. Xem [audit mới](reports/WEB_HALLMARK_BACKEND_AUDIT_2026-10-25.md); các dòng ghi `48ae1e0` bên dưới là snapshot lịch sử.

> **Tiến độ 24/10/2026:** W0.4, W1.1, W1.3 và W1.4 đã có implementation/tests độc lập theo snapshot. W1.2 phần MSG06 chờ backend bổ sung đủ thông tin, không thêm câu dự phòng. Mapper chưa ghép vào API/menu live; catalog BA và binding platform còn chờ. Báo cáo mới nhất: [W1.3/W1.4](reports/WEB_API_W1_3_W1_4_PROFILE_PERMISSION_MAPPING_2026-10-24.md); báo cáo trước: [W0–W1](reports/WEB_API_W0_W1_SECURITY_SCHEMA_ERRORS_2026-10-24.md).

> **Review toàn W0–W1:** [kết quả, findings và các cổng còn mở](reports/WEB_W0_W1_FULL_REVIEW_2026-10-24.md). Chạy lại 69 files/401 tests, lint/typecheck/build đều đạt; dependency audit 0 findings tại lượt review đó. W0.5 và phần conflict W1.2 vẫn chưa hoàn tất. Finding WREV-02 đã được [vá cấu hình CI](reports/WEB_CI_TEST_GATE_REVIEW_2026-10-24.md): thêm `npm test` trước build, checks local đạt. Giữ nguyên triggers; push feature không có PR phù hợp chưa kích hoạt CI/secret scan, chưa có bằng chứng GitHub runner cho bản vá.

## 1. Phạm vi và quyết định

> **Lát unlink UI26/10:** [đã ghép service/mock/editor và regression tests](reports/WEB_EMPLOYEE_ACCOUNT_UNLINK_REVIEW_2026-10-26.md), giữ bản nháp và version mới. Chưa có employee HTTP/BFF route, DTO mapper hay URL query test; không bật API/refresh khi PR16 chưa merge và chưa đạt release gates. Không thay checkbox W0–W7 bằng kết quả mock này.

> **Audit Jira/backend26/10:** develop vẫn776fbc0; PR15/16/17 đều draft/chưa merge. OMTS-214 comment10034 yêu cầu Web đổi employee unlink cùng release PR16; EMP-API-01…05 và source/CI evidence ở [báo cáo](reports/BACKEND_JIRA_EMPLOYEE_UNLINK_AUDIT_2026-10-26.md). Ticket Web hiện hành ACS201 và FARM-01/LAB-01 là203. OMTS-123 đã Done, cần đối chiếu appendix trước mapper activation. Không tự đổi checkbox auth hoặc chốt lại gate/MSG06/refresh từ các PR draft.

- **Đã chốt:** Web dùng BFF Next.js; trình duyệt chỉ giữ mã phiên trong cookie HttpOnly, access/refresh token ở server. Ngày24/10 Duy Thái chọn Redis runtime + RAM chỉ cho tests; deploy/key lifecycle/cookie lifetime chưa chốt. Không tự chọn provider hoặc dùng RAM khi Redis lỗi.
- **Đã chốt trước:** không tự tạo Staff QA; chỉ bootstrap Owner, Staff do backend cung cấp. Không sửa trực tiếp cờ verified hoặc bỏ gate để demo.
- **Đã chốt trước cho Mobile:** chờ backend hỗ trợ refresh retry/idempotency. Ngày24/10 Duy Thái xác nhận W2.1 Web chưa bật refresh thật; agreement retry và UX vẫn cần duyệt riêng.
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

Cookie chứa mã phiên không đoán được, không phải JWT backend. Store đã chọn Redis runtime; RAM chỉ là test adapter, không phải ứng viên runtime hoặc fallback. Store cần tách theo phiên, hạn sử dụng, revoke/tombstone và cơ chế chống ghi đè bởi response cũ. Trước triển khai production phải chốt môi trường deploy, số instance, durability và cách bảo vệ token lúc lưu.

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

### W2 — Session BFF, đã chọn Redis; deployment/key policy còn mở

- [x] **W2.0 — audit/đề xuất, đã chọn B ngày24/10:** [so sánh RAM/Redis/DB và backend mới](reports/WEB_W2_SESSION_STORE_PROPOSAL_BACKEND_AUDIT_2026-10-24.md). Redis runtime + RAM tests đã được Duy Thái duyệt; deploy chưa chốt. Backend develop vẫn48ae1e0 theo audit; chưa seed/chuyển backend đang chạy sang feature. Docker CLI có nhưng engine hiện chưa kết nối được.
- [ ] **W2.1 — store contract và adapters:** contract/RAM ở [W2.1a/c](reports/WEB_W2_1A_1C_SESSION_CONTRACT_2026-10-24.md), SID/token protector ở [W2.1b](reports/WEB_W2_1B_SID_TOKEN_PROTECTION_2026-10-24.md), adapter ở [W2.1d](reports/WEB_W2_1D_REDIS_ADAPTER_2026-10-24.md). [W2.1e](reports/WEB_W2_1E_CONTRACT_REDIS_READINESS_REVIEW_2026-10-24.md) là snapshot lúc môi trường bị chặn. **Bằng chứng mới:** [W2.2/Docker repair](reports/WEB_W2_2_SERVER_CONFIG_DOCKER_REPAIR_2026-10-24.md) khắc phục socket startup,27 live cases PASS trên Redis7.4.11 và6.2.24, full713/713. Server restart/restore/failover/lost-write-reply còn pending; không bật API/refresh thật.
  - [x] **W2.1a:** contract thuần read/create/revoke/CAS, typed outcomes và schema strict; tests identity/TTL/opaque revision, không default lifetime/transition policy.
  - [x] **W2.1b — helpers/tests, chưa runtime wiring:** SID32 byte CSPRNG/hash SHA-256, canonical base64url, AES-256-GCM envelope v1/AAD metadata và injected KeyObject provider, server-only markers.76 cases mới, tổng527 tests. Chưa có cookie/DAL/production key provider hoặc chứng minh mọi đường serialize DTO; W2.2 tiếp tục phụ trách ranh giới live.
  - [x] **W2.1c:** RAM adapter nằm trong `__tests__`, clock giả và clone isolation; ESLint chặn non-test imports.50 cases mới gồm expiry/revoke/late writes/concurrent writers/invalid input. Không chứng minh Redis hoặc distributed atomicity.
  - [x] **W2.1d — adapter/helpers và live core đã kiểm chứng:** SDK6.3.0, explicit config/no RAM fallback, strict codec, Lua NX/PXAT/exact-snapshot CAS/tombstone. Snapshot d có597 PASS/7 SKIP; sau sửa Docker, toàn27 live cases đã PASS ở hai phiên bản Redis. Không đồng nghĩa runtime app đã wiring hoặc production durability được nghiệm thu.
    - [x] d1: pinned SDK + server-only connection factory, strict config, no offline replay/reconnect, deadline bao handshake.
    - [x] d2: record schema/version/hash binding, namespace, redacted failure; không DEL dữ liệu hỏng.
    - [x] d3: Lua create/CAS/revoke và adapter theo contract; update cũ không tự ghi đè; revoke tranh chấp trả unavailable, không báo thành công giả.
    - [x] d4: unit/regression tests, opt-in integration harness, negative invalid-config check và tự review/báo cáo.
    - [x] d5: Redis7.4.11 và6.2.24 thật, Lua/PXAT/TIME/TTL/competing connections PASS; containers loopback/tmpfs riêng đã dọn đúng phạm vi.
  - [ ] **W2.1e — review/test preparation đã làm; nghiệm thu Redis còn mở:** xem báo cáo mới phía trên; không tự đóng bằng unit tests.
    - [x] e1: bước đầu Engine/WSL timeout; W2.2 follow-up tìm log/socket lỗi và khắc phục bằng quarantine IPC directories, Engine29.4.3 hoạt động. Không reset WSL/VHD/volume/database.
    - [x] e2:13 shared contract cases đã PASS trên RAM và Redis thật.
    - [x] e3:2 tests SDK thật + TCP silent/disconnect PASS; không coi TCP fixture là Redis.
    - [x] e4:read gate unit2 PASS;7 live edge cases scheduling/skew/expiry/cipher/client replacement đã PASS trên hai Redis versions.
    - [x] e5:`npm run test:redis` không cho thiếu endpoint trở thành successful skip;4 negative runner tests PASS, lint gồm scripts; review restart/restore risks và bài học70 local.
    - [x] e6:27/27 live cases PASS trên Redis7.4.11 và6.2.24; full suite713/713 với endpoint test riêng.
    - [ ] e7:disposable server restart, mất socket sau write, persistence/restore/failover; không đánh đồng thay client với restart Redis, chưa chốt production policy.
- [ ] **W2.2 — server boundary, config/helper, transport và DTO độc lập:** xem report W2.2/Docker phía trên, [W2.2d transport](reports/WEB_W2_2D_SERVER_TRANSPORT_2026-10-24.md) và [W2.2e DTO](reports/WEB_W2_2E_DTO_SERIALIZATION_2026-10-24.md). Chưa app wiring; fixture JSON/RSC không thay bằng chứng luồng/handler thật.
  - [x] W2.2a:server-only config parser, explicit OMTS_DATA_SOURCE, origin/decimal timeout validation, redacted field errors; .env.example chỉ mock, không sửa env local.
  - [x] W2.2b:fixed endpoint catalog dưới configured origin; không arbitrary URL/refresh, không fetch; API mode valid chưa đổi composition mock.
  - [x] W2.2c:runtime validation marker + per-file test mocks; negative Next client import bị cả Webpack/Turbopack từ chối;65 config/target tests và3 marker cases thêm, lint/typecheck/build PASS.
  - [x] W2.2d:server HTTP transport độc lập,100 tests mới +4 marker và2 config regression cases; full792 PASS/27 Redis SKIP. Không API .NET/app wiring/refresh. Snapshot48ae1e0 vẫn lịch sử; rerun contract snapshot trước tích hợp.
    - [x] d1:strict request preparation, catalog-only methods/targets, Bearer protected vs public login; reject RequestInit/header overrides và snapshot input trước await. Request JSON cap64 KiB, không sửa validation nghiệp vụ.
    - [x] d2:bounded streaming JSON1 MiB, UTF-8 strict,204 logout không parse; failure chỉ status/known code/retry metadata, không raw detail/params/headers/cause. MSG06 conflict projection vẫn pending.
    - [x] d3:factory explicit config, no-store/credentials omit/redirect error, per-call abort deadline gồm body; không retry/refresh/fallback/session-expiry events.
    - [x] d4:11 tests dùng HTTP peer loopback port tự cấp, fake credentials; redirect destination0 hits, timeout headers/body, mất response sau write chỉ1 request, chunk limit, concurrent isolation và error redaction.
    - [x] d5:tự review, lint/typecheck/build, negative Webpack/Turbopack imports và báo cáo/bài học72 local. Không coi transport success unknown là public DTO an toàn.
  - [ ] W2.2e:DTO/JSON/RSC/log preparation đã làm, full source/config preflight khi có handler/composition vẫn mở; production key/deploy policy chưa chốt.
    - [x] e1:validate token wire vào server class/private field; JSON guard và redacted inspection/logging, không tạo session/chọn gate. Plaintext escape hatch chỉ cho server validation/encryption, không coi wrapper là encryption/DLP.
    - [x] e2:identity/profile/permissions DTO allowlists theo mapper W1 và expectedAccountId từ DAL tương lai; bỏ backend sessionId ở browser identity, giữ profile recordVersion/null contacts/permission scopes; không sửa UI/luồng.
    - [x] e3:diagnostic chỉ event/endpoint/outcome/HTTP status; không logger provider/raw context/Error/data/PII;54 tests mới +3 marker cases, full849 PASS/27 Redis SKIP.
    - [x] e4:JSON/NextResponse và4 HTTP-pipeline cases;2 positive Next production builds scan HTML/RSC/client artifacts/logs,2 diagnostic negative builds chặn exact token guard.2 compiler boundary builds chặn cả5 modules; không gọi .NET/API/refresh thật.
    - [ ] e5:real handler/DAL/cookie composition preflight, auth/gate/capability binding, redaction mọi đường log/JSON/RSC/error và account switching/prefetch/back/cache. Các helpers/fixture hiện tại không đủ đóng cổng này; làm theo W2.3/W2.4/W3 khi có policy và wiring.
- [ ] **W2.3 — cookie/CSRF:** Route Handlers dưới `src/app/api/`, session cookie helper, origin/CSRF checks được thống nhất. Test cookie flags theo env, cookie sai/hết hạn, origin lạ, credential log redaction và redirect ngoài origin. Không commit `.env.local`.
  - [x] W2.3a0 — đề xuất đã được chốt C1A/C2A/C3A ngày24/10 bởi Duy Thái: [phương án gốc](reports/WEB_W2_3_COOKIE_CSRF_LIFETIME_PROPOSAL_2026-10-24.md), quyết định ở WEB-API-07. Không chọn persistent cookie/token-store CSRF/hoãn expiry. Không tự thêm idle30 phút/absolute8 giờ hoặc bật API/refresh.
  - [x] W2.3a1 — [config server độc lập](reports/WEB_W2_3A1_WEB_SESSION_CONFIG_2026-10-24.md): explicit Web origin + cookie profile, HTTPS vs loopback dev, fixed C1A attrs, immutable/redacted results.75 tests +1 marker, full925 PASS/27 Redis SKIP;4 compiler boundary builds PASS. Không tin forwarded headers hoặc đổi app composition; chưa cookie/CSRF/expiry helpers.
  - [x] W2.3a2 — [cookie helpers độc lập](reports/WEB_W2_3A2_COOKIE_HELPERS_2026-10-24.md): explicit config factory, canonical SID/raw-header reader, duplicate rejection, fixed C1A issue/clear scope và redacted wrapper.82 cookie cases +2 marker, full1009 PASS/27 Redis SKIP;4 boundary builds PASS. Không tạo session/response runtime, chọn MSG19, revoke hoặc bật API/refresh; browser/CSRF/expiry/race vẫn pending.
  - [x] W2.3a3 — [guard độc lập theo C2A](reports/WEB_W2_3A3_CSRF_GUARD_2026-10-24.md): exact configured Origin + X-OMTS-Request:web, supplementary Sec-Fetch-Site, server-owned method/media/body budget/deadline, guarded input/redacted failures.122 cases +2 marker, full1133 PASS/27 Redis SKIP;4 negative builds PASS,10 modules. Fake login/logout/profile/gated composition reject trước callbacks; chưa real handlers/CORS/browser/gate/session binding, không bật API/refresh hoặc chọn C2B.
  - [x] W2.3a4 — [expiry helper độc lập C3A](reports/WEB_W2_3A4_SESSION_EXPIRY_2026-10-24.md): ISO backend → conservative ms → min(access,refresh), stored cap recheck/no extension, explicit server clock và expired/invalid-input/unavailable riêng.85 cases +1 marker; full1219 PASS/27 Redis SKIP;6 negative builds PASS/11 modules. Không đổi generic store/Lua/tombstone, ghi TTL, map MSG19, nối handler hoặc bật API/refresh; actual clock/Redis/DAL/composition vẫn pending.
  - [ ] W2.3a5 — [Next/browser fake-cookie fixture](reports/WEB_W2_3A5_NEXT_BROWSER_COOKIE_FIXTURE_2026-10-24.md): **partial, HTTP đạt/HTTPS chưa kiểm chứng**; không endpoint auth thật, certificate/trust bypass hoặc API/refresh.
    - [x] a5.1:fixture ngoài src/app, explicit test-only opt-in/run-id/loopback; foreign/duplicate-cookie refusal; no-store và owned-child cleanup.15 unit cases; full1234 PASS/27 Redis SKIP.
    - [x] a5.2:2 positive Next builds/Webpack+Turbopack,24 HTTP assertions/compiler PASS (48 tổng); flags/clear/Allow/CSRF/body/foreign-cookie/state checks, không gọi Node HTTP client là browser jar.
    - [x] a5.3:15 browser HTTP checks PASS, rerun sau reload và self-review; lưu/gửi HttpOnly SID/Path=/, JS không đọc Set-Cookie, cross-origin form rejected, expiry khác cookie clear, cleanup; screenshot local/ignored.
    - [ ] a5.4:browser HTTPS Secure/__Host-/TLS enforcement với endpoint/certificate được cấp phù hợp. **Giữ pending theo yêu cầu25/10.** Không suy từ HTTP loopback, tự cài cert/trust hoặc bỏ qua browser warning. Cookie restore/production matrix còn cần kiểm riêng.
  - [x] W2.3a6 — [review/regression/report phần chuẩn bị](reports/WEB_W2_3A6_FULL_REVIEW_2026-10-25.md),25/10. Không đóng parent W2.3, a5 HTTPS hoặc W2.2e/e5; chưa runtime composition/DAL/race/API/refresh.
    - [x] a6.1:đối chiếu C1A/C2A/C3A với config/cookie/CSRF/body/expiry/fixture và Jira/SRS; không thay policy hoặc tự giải quyết gate đang xung đột.
    - [x] a6.2:20 regression cases mới; sửa P2 W23-REV-01 để lint mặc định phủ authored cookie fixture và ignore generated output đúng phạm vi. Hai queued-abort cases đã PASS trên logic cũ, không ghi thành bug fix.
    - [x] a6.3:full1254 PASS/27 Redis SKIP; lint/typecheck/build/audit0;48 HTTP assertions/2 compilers;6 negative boundary builds/11 modules;4 serialization builds PASS. Local evidence, không phải GitHub CI/live Redis/QA hoặc browser HTTPS.
    - [x] a6.4:report/context/decision/README và bài80 local; ghi cả lần fail đường dẫn test và timeout full suite, không coi rerun PASS là sửa root cause Redis/build-trace flake. Full cookie/session race integration tiếp tục cùng W3/W4.
- [ ] **W2.4 — DAL/guard:** verify session + effective permission trước dữ liệu nhạy cảm trong DAL/page/endpoint. Client AuthProvider chỉ phục vụ UI. Test anonymous SSR và direct endpoint không trả private DTO; không lấy HTTP status của streamed redirect làm bằng chứng duy nhất. Test RSC/prefetch/back sau logout không lộ dữ liệu cache. Không dùng `use cache` chung cho thông tin phiên.
  - [x] **W2.4a — server session resolver:** cookie SID → store → C3A expiry → mở access token theo context; phân biệt anonymous/invalid/unavailable/resolved, không lộ refresh token và chống serialize capability. 10 resolver cases; report chung a–b ngày 25/10.
  - [x] **W2.4b — application phase guard:** chỉ phase `application` được nhận server capability; password/contact gate trả phase, không trả token capability; unavailable không bị giả thành logout. 10 guard cases; đây chưa phải permission authorization.
  - [ ] **W2.4c — runtime composition:** nối config, cookie reader, Redis adapter, key provider và clock; production secret manager/lifecycle/deployment chưa chốt, không hard-code key hoặc dùng RAM runtime.
    - [x] c1:keyring server-only nhiều phiên bản, active key cho write và retained key cho read; strict32-byte/key-ID/duplicate/count checks, không serializable material. Chưa chốt rotation/retirement production.
    - [x] c2:runtime config gom cookie+Redis URL/timeouts/namespace+key provider, fail closed và không default/public alias; P2 W24-REV-01 đã thêm explicit rejection cho2 keyring +4 Redis `NEXT_PUBLIC_*` aliases.
    - [x] c3:read-runtime factory nối Redis store/protector/cookie reader/resolver/phase guard, close idempotent và fail closed sau dispose.
    - [ ] c4:Next process ownership/singleton lifecycle + live Redis runtime acceptance; factory chưa được app layout/handler import.
      - [x] c4a:lazy/single-flight runtime owner; cache ready only, retry failure, generation-safe late completion/dispose và redacted exception.
      - [x] c4b-local:lazy gateway instance theo worker đọc snapshot server env, đọc riêng cookie từng request; runtime thật đã qua31 Redis tests (4 cases runtime mới). Docker được phục hồi bằng cách ly IPC sockets; không chỉnh DB/volume.
      - [ ] c4c-production:health/reconnect policy, shutdown integration theo nền tảng deploy, key rotation/retirement và Redis durability/restore/failover.
  - [ ] **W2.4d — permission-aware DAL/route boundary:** kiểm function/action/zone trước dữ liệu nhạy cảm; test SSR/direct endpoint/RSC/prefetch/back/cache. Chưa thay client guard hoặc bật API thật.
    - [x] d1:application context DAL gọi identity rồi permissions; bind account+subject+phase, chỉ trả allowlisted DTO và redacted diagnostic.
    - [x] d2:function capability guard dùng function/action/zone/all-zones và giữ riêng OwnRecords/AssignedZone; không quyết định record ownership.
    - [ ] d3:route/layout/feature DAL thật + direct endpoint/RSC/prefetch/back/cache tests.
      - [x] d3a:navigation-neutral protected access decision tách render/login/invalid-cookie/onboarding/unavailable; chỉ render giữ server capability.
      - [x] d3b:đã chọn route riêng theo yêu cầu tiếp tục26/10; `/onboarding/password` và `/onboarding/contact` kiểm phase server và điều hướng về bước thật. `/session/recover` chỉ clear qua POST+CSRF sau server recheck. Có GET session BFF/no-store, app SSR boundary và API-mode mock blockade. Chưa có login/onboarding mutation adapter W3.
      - [x] d3c-local:24 HTTP assertions trên Next product build (build mock/start API), anonymous SSR, invalid cookie/recovery, no private fixture data, Redis unavailable; phát hiện và sửa GET session bị static hóa. Không coi unit phase tests là browser/QA.
      - [ ] d3d:authenticated SSR/private DTO feature integration, account A/B/back/prefetch/browser/logout race xuyên suốt cùng W3/W4; HTTPS vẫn pending theo yêu cầu.

### W3 — Đăng nhập và khôi phục phiên

- [ ] **W3.1 — login server:** handler nhận identifier/password, trim identifier nhưng giữ nguyên password, gửi clientType Web. Validate token response ở server, tạo SID mới chống fixation; không mở application session nếu đang gate. Request thất bại hoặc thiếu quyền không để lại phiên app mồ côi. Test đúng/sai credentials, double submit, timeout, malformed token response, các MSG lỗi.
  - [x] W3.1a:service tạo phiên độc lập với HTTP: login wire→identity binding→phase→permission preflight cho application→C3A→SID/mã hóa/store→prepared cookie. Limited session không gọi permissions; cleanup best-effort chỉ revoke candidate có sealed packet khớp.15 fixture cases; chưa public handler/runtime write composition.
  - [ ] W3.1b:CSRF/body/schema route binding + runtime write ownership, request cancellation và header/cookie-response race; chưa mount form API hoặc gọi credentials thật.
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
