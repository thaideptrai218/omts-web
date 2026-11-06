# W2.2e — DTO và serialization: phần chuẩn bị độc lập

Ngày24/10/2026. Nhánh `feature/OMTS-132-web-foundation`. Không bật API/refresh thật, không commit/push/merge.

## 1. Kết luận và phạm vi

Đã làm e1–e4: đối tượng giữ token ở server, DTO identity/hồ sơ/quyền, diagnostic tối thiểu, tests JSON/log và fixture Next kiểm tra Server → Client. **W2.2e/e5 và W2.2 tổng vẫn mở**: chưa có handler/DAL/cookie/real-session composition để kiểm chứng toàn luồng. Không coi fixture là Web API E2E hay kết quả QA.

Đã đọc AGENTS/context, plan/decision register, wire schemas, mapper profile/permissions W1, session/token protector và tài liệu Next16.4.3 đang cài. Jira OMTS-132 vẫn Done; parent OMTS-121 In Progress. Không sửa Jira/SRS. Backend contract tiếp tục là snapshot48ae1e0, không fetch/backend smoke ở lượt này.

`auth-service.instance.ts` vẫn tạo mock environment. Không thay UI, product route, backend, mobile, env local, Docker/Redis/DB hoặc seed. Không tạo session, không chọn gate/refresh/retry/logout UX, logger provider, key provider hoặc deployment policy. Factory transport chỉ được gọi trong test HTTP loopback với dữ liệu giả.

## 2. Các micro-task

### e1 — Giữ AuthTokens trong đối tượng server

`src/server/backend/server-auth-tokens.ts` dùng wire schema đã có, loại additive fields rồi snapshot dữ liệu vào class với private field. Class không có enumerable property chứa token; `toJSON` ném lỗi cố định `SERVER_AUTH_TOKENS_NOT_SERIALIZABLE`. String coercion và Node inspect trả nhãn REDACTED; tests dùng Console thật với sink RAM, không chọn logging provider.

Giữ nguyên subjectType và hai gate flags, không tự map Owner sang Staff, mở quyền hay chọn route. Đây là custody/accidental-disclosure guard, **không phải encryption, xác thực JWT hoặc session đã hợp lệ**. `readForSessionStore()` là escape hatch tường minh: plaintext đọc ra chỉ được dùng trong server validation/encryption, phải mã hóa trước khi lưu. Copy/serialize/log plaintext từ escape hatch vẫn có thể lộ secret.

Raw success của W2.2d transport vẫn là dữ liệu nội bộ chứa token; wrapper không tự gắn vào transport hoặc app. Có test chủ động chứng minh raw result vẫn stringify ra canary, rồi kiểm tra credential wrapper chặn NextResponse.json. Điều này ngăn báo cáo sai rằng cả hệ thống đã chống mọi đường serialize.

### e2 — DTO chọn field được phép đi qua

`browser-dto.ts` trả DTO hoặc failure status không có raw issues/cause. Expected accountId phải có dạng GUID, lấy từ DAL tin cậy tương lai; không lấy từ browser để tự cấp quyền. Matching accountId chỉ chống trộn dữ liệu hai tài khoản, không thay authentication/authorization.

- Identity chỉ chiếu accountId/username/subjectType. Backend sessionId không cần để hiển thị danh tính nên không gửi trong DTO này; không đổi UI hay session contract đang chạy.
- Profile tái dùng mapper W1 và shape PersonalProfile. Giữ tên cá nhân, null contacts, verified state, roles hiển thị và opaque recordVersion. Không tự sửa fields/validation max200, không bật PUT/contact mutation.
- Permissions tái dùng mapper W1; giữ action/zone/dataScope, OwnRecords riêng AssignedZone và gate hiện có. Không suy Owner từ role label hoặc tự hoàn thiện BA catalog/platform binding.

Các DTO này dành cho browser của người dùng đã được phép xem, **không phải dữ liệu công khai/anonymous**. Vẫn có PII hợp lệ như tên/email/SĐT của chính tài khoản; không được log toàn bộ DTO chỉ vì đã bỏ token.

Allowlist loại field thừa và tham chiếu thừa lồng nhau, không nhận diện ý nghĩa mọi chuỗi. Có test ghi nhận rõ nếu backend điền secret vào field displayName hợp lệ thì mapper vẫn giữ nó. Không áp regex DLP làm mất tên hợp lệ hoặc âm thầm đổi nghiệp vụ; cần boundary review/data-source correctness ở bước tích hợp.

### e3 — Diagnostic chỉ giữ metadata kỹ thuật

`backend-diagnostic.ts` chỉ chiếu event, endpoint trong catalog, outcome và HTTP status hợp lệ khi là HTTP failure. Không nhận raw context/header/body/Error bag và không đọc data getter. Unknown target/status hoặc throwing input trả invalid-diagnostic cố định. Không log identifier, email/SĐT, accountId, SID, token/cipher/version, raw error hoặc URL.

Không chọn nơi gửi log hay gắn logger vào runtime. Tự review đã dùng chung schema endpoint với catalog để tránh copy danh sách lệch nhau. Diagnostic projection không phải browser error DTO và không tự hiển thị MSG19/MSG06, logout hay quyết định retry.

### e4 — JSON, HTTP seam và Next RSC fixture

54 tests mới:19 credential custody,14 browser DTO,17 diagnostic,4 HTTP-pipeline. Thêm3 runtime marker cases vào suite có sẵn. JSON tests dùng cả native Response.json và NextResponse.json. HTTP-pipeline dùng Node HTTP peer tại127.0.0.1/port0; login chỉ validate/wrap token, profile chiếu DTO, HTTP200 sai account/malformed vẫn bị từ chối. Không gọi .NET hoặc tạo phiên giả trong app.

Fixture mới ở `tests/fixtures/serialization`, không trong src/app. `npm run test:serialization` chạy bốn build:

1. Webpack positive production: profile DTO qua Server Component → Client Component, có HTML và RSC.
2. Webpack negative diagnostic: cố truyền credential class, guard từ chối serialization.
3. Turbopack positive production: kiểm tra tương tự.
4. Turbopack negative diagnostic: kiểm tra đúng guard tương tự.

Positive builds kiểm tra canary không xuất hiện trong HTML/RSC, `.next/static` và build logs. Server bundle chứa fake test inputs là điều dự kiến, không phải artifact gửi browser; scanner không coi server source là public. Canaries được khai báo duy nhất tại fixture canaries.mjs, unit/HTTP data và runner cùng dùng nguồn đó.

Negative builds dùng `--debug-prerender` theo tài liệu Next để thấy exact guard; output này chỉ chẩn đoán fixture, không deploy/chạy thay product app. Client fixture không tự JSON.stringify prop, nên lỗi được quan sát từ đường serialization Server → Client, không do code client cố ý gọi guard. Kiểm tra canary áp dụng cả log của positive và negative builds.

Boundary runner hiện dùng `--debug`, yêu cầu trace đủ5 module config/transport/credentials/DTO/diagnostic cùng server-only error, dưới cả hai compiler. Generated fixture outputs được ignore/exclude hẹp, không tắt typecheck/lint hay marker thật. Không bật experimental taint ở config sản phẩm.

## 3. Lỗi thực tế và chẩn đoán

Lần đầu `npm run test:serialization` positive Webpack PASS nhưng negative runner báo `Unexpected --webpack negative build outcome (exit 1)`. Build đã fail, song không có chuỗi guard mà assertion yêu cầu. Chạy lại compiler lấy log thấy Next production cố ý che message lỗi Server Components, chỉ còn digest. Vì vậy exit1 chưa đủ chứng minh đúng nguyên nhân, không nới assertion thành “fail là PASS”.

Đọc phần Debugging prerender trong installed CLI docs rồi thử `--debug-prerender`: thấy rõ `ServerAuthTokens.toJSON`, dòng ném guard và không có canary trong log. Runner sửa để chỉ negative fixture dùng flag chẩn đoán, positive vẫn production thường. Cả bốn builds sau sửa PASS. Đây là sửa giả định của test harness, không vá hay tắt guard sản phẩm.

Một lượt `npm run test:boundary` cũng chỉ in “Failed to compile / webpack errors”, thiếu trace nên runner từ chối. Lệnh trực tiếp thêm `--debug` đưa ra đủ server-only import traces. Đã để flag này cố định trong runner và giữ yêu cầu trace đủ5 modules; rerun hai compilers PASS. **Nguyên nhân gate fail đã rõ là thiếu diagnostic text; chưa chứng minh cơ chế sâu bên trong Next khiến lượt mặc định mất trace**, không kết luận do cache hay code sản phẩm. Không xóa cache/reset repo để che lỗi.

Một lệnh đọc đoán `effective-access.ts` không tồn tại; inventory cho thấy type thật là `access-types.ts`. Đọc đúng file trước khi code, không tạo thêm model trùng. Không có lỗi TypeScript/lint/logic test mới sau implementation này; các lỗi harness ở trên được ghi riêng, không gọi là lỗi nghiệp vụ đã sửa.

## 4. Kết quả kiểm chứng

| Cổng | Kết quả |
| --- | --- |
| Full Vitest |100 files/849 PASS;3 files/27 Redis SKIP;876 tổng |
| Phần thêm W2.2e |54 cases +3 marker =57; baseline792 →849 PASS |
| test:serialization |2 positive production +2 negative diagnostic builds PASS |
| test:boundary |2 negative compiler builds PASS, trace đủ5 modules |
| npm run lint / typecheck / build |PASS; app vẫn13 static outputs, không thêm handler/route |
| npm audit --json |vulnerabilities {}, total0; không thêm dependency |
| Docs/Git hygiene |55 relative links resolve;27 untracked files thuộc backend/fixture/runner/report không trailing whitespace; diff --check PASS, staged diff rỗng; lesson73/generated fixture artifacts ignored |

Các build scripts là checks local riêng, chưa đưa vào workflow CI; không có GitHub runner evidence hoặc PR/Jira mutation ở lượt này. Không chạy Redis live lại, không lấy evidence713/713 lượt cũ thay27 SKIP hiện tại. Không có browser navigation/cookie/real-session E2E trong phạm vi này.

## 5. Tự đánh giá và việc chưa đóng

Đã review đường dữ liệu từ raw HTTP → schema/custody hoặc mapper → DTO/diagnostic → JSON/RSC. Các helper không import vào app/components/features; runtime mock composition giữ nguyên. Không có cơ chế tự refresh/retry/fallback, global logger, experimental taint hoặc key/cookie policy mới.

Không phát hiện xung đột nghiệp vụ mới cần chốt. Các dependency cũ vẫn mở: MSG06 structured user_name/time và dedicated conflict projection; Staff email-OR-phone vs backend; profile mutation/capability; refresh ambiguous-result policy; cookie/CSRF/lifetime, deploy/keys/Redis durability.

W2.2e/e5 cần tiếp tục khi có handler/DAL/composition: đảm bảo mọi đường success/error/JSON/RSC/log không trả raw transport/plaintext, kiểm tra session/gate/account binding, response headers/cache, logout/account switch/prefetch/back và config/key preflight. Không triển khai login/public session DTO trước khi các quyết định liên quan được duyệt. W2.3/W2.4/W3 chưa được tự động đánh dấu hoàn thành nhờ fixture này.

Bài học73 được lưu local/ignored. Giữ nhánh hiện tại và mọi thay đổi W2 chưa commit trước đó; không stage/commit/push/merge.
