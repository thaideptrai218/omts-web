# W2.1d — Redis adapter cho session BFF

Ngày 24/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD `4555c32`. Giữ nguyên thay đổi W2.0/W2.1a/b/c chưa commit. Không commit/push/merge, sửa backend/Mobile/Jira/SRS hay bật refresh thật.

## 1. Kết quả và giới hạn nghiệm thu

Đã viết Redis adapter độc lập: kết nối có cấu hình tường minh, strict record codec, Lua tạo/cập nhật có điều kiện, thu hồi bằng tombstone, unit tests và integration suite opt-in. **Chưa khởi tạo adapter trong ứng dụng, chưa nối cookie/DAL/LoginForm/AuthProvider hoặc API thật.**

Kiểm tra cuối: **86 files đạt, 597 tests đạt; 1 file/7 integration tests bị skip vì chưa có Redis test endpoint**. Lint/typecheck/build đạt; dependency audit 0 findings. So với W2.1b có thêm 70 unit cases, không tính 7 live cases là đã đạt.

W2.1d có code/unit evidence, nhưng giữ checkbox nghiệm thu mở cho đến khi chạy Redis thật. W2.1e vẫn mở: distributed races, restart/failover/durability không được chứng minh bằng RAM, command stubs hay Next build.

## 2. Context và từng micro-task

Đã đọc lại quy tắc repo, project context, plan W2 và contract hiện có; ticket OMTS-132 cùng parent OMTS-121 được đọc, không cập nhật trạng thái. Redis runtime + RAM chỉ tests là quyết định đã duyệt; môi trường deploy/provider, TTL/cookie/CSRF và production key lifecycle chưa chốt.

### d1 — SDK và kết nối

Thêm chính xác `@redis/client@6.3.0` bằng `npm install --save-exact @redis/client@6.3.0 --ignore-scripts`. Node local 24.13.1 đáp ứng SDK yêu cầu Node >=20. Lock diff chỉ thêm package/root entry này trong lượt hiện tại; `server-only@0.0.1` trong diff tổng là thay đổi W2.1b trước đó, không phải dependency mới thứ hai của d1.

`session-redis-client.ts` nhận URL và hai timeout từ caller server. Không đọc `.env`, chọn mặc định localhost, tạo singleton hay kết nối khi import. Config strict; timeout số nguyên 1–60.000 ms là giới hạn kỹ thuật I/O, **không phải lifetime phiên**. Chỉ chấp nhận redis plaintext ở loopback cho local; endpoint từ xa phải rediss, không tắt TLS certificate validation. Điều này không chọn provider/deployment hay cho phép nới TLS khi production chưa chốt.

Tắt offline queue, auto reconnect và Enterprise maintenance redirect. Kết nối hỏng không âm thầm phục hồi rồi replay lệnh; cần composition/health recovery ở bước sau. Có error listener để EventEmitter không làm process crash vì thiếu listener; không log raw error, URL, credential hoặc token. Thao tác store bắt lỗi thành unavailable, không echo cause. [Hướng dẫn node-redis](https://redis.io/docs/latest/develop/clients/nodejs/produsage/) giải thích lỗi kết nối, hàng đợi offline và rủi ro thực thi lệnh khi mất phản hồi.

Đối chiếu source/types SDK đã cài: commandOptions.timeout giới hạn lệnh thông thường; socket.connectTimeout chưa đủ bao toàn bộ Redis handshake. Vì vậy factory có deadline riêng bao connect + handshake và destroy socket khi thất bại. Unit test fake timers kiểm tra nhánh handshake treo. Không có assertion rằng timeout nghĩa là Redis chắc chắn chưa ghi.

### d2 — Record codec và key namespace

`session-redis-record.ts` tái sử dụng schema W2.1a, bổ sung schemaVersion=1, createdAt/revision và quan hệ thời gian. Active record chứa StoredSession; revoked record chỉ còn kind/schemaVersion/idHash/expiresAtMs, không giữ identity hoặc envelope token. Từ chối JSON sai, field dư, phiên bản lạ, revision lỗi, hash khác lookup key và record quá 32 KiB; không tự migrate, sửa, xóa hay coi dữ liệu hỏng là missing.

`redis-session-store.ts` nhận command interface nhỏ GET/EVAL và namespace bắt buộc. Key có dạng `omts:bff:v1:<namespace>:<SID-hash>`. Không dùng SID gốc, username/accountId làm key, không SCAN hoặc FLUSHALL. Namespace ngăn lẫn các môi trường dùng cùng Redis; không thay backend authorization.

GET được kiểm tra clock **sau await** để không trả found nếu phiên hết hạn trong khi chờ mạng. Nếu Redis đã xóa key vì TTL thì kết quả là missing: không thể phân biệt never-created và expired từ GET null. Nếu còn record nhưng clock app thấy hết hạn thì expired; không DEL vô điều kiện vì có thể xóa nhầm snapshot mới. Access-token expiry riêng không xóa phiên BFF hay gọi refresh.

### d3 — Lua create/CAS/revoke

`session-redis-scripts.ts` có hai script ngắn, mỗi lần chỉ một key. Lua cung cấp vùng thực thi không bị lệnh khác chen giữa; đây là cơ chế thiết kế, **chưa là bằng chứng script hiện tại đã chạy đúng trên Redis thật**. [Redis scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/) quy định tính nguyên tử và việc script chặn hoạt động khác khi chạy; vì vậy không đưa vòng lặp/scan lớn vào script.

Create dùng NX: không ghi đè active record hoặc tombstone còn sống. CAS trước hết đọc/validate record và đối chiếu revision; script sau đó so sánh chính xác chuỗi JSON đã được validate trước khi SET XX. Nếu record bị cập nhật, thu hồi hoặc hỏng giữa hai bước thì snapshot không khớp, không ghi đè. Revision mới từ randomUUID; entropy lỗi trả unavailable, không tạo revision dự phòng.

Write đặt expiry tuyệt đối bằng PXAT, cùng lệnh SET với payload; không tách SET và EXPIRE thành hai lượt có thể đứt giữa chừng. Kiểm tra expiry theo Redis TIME bên cạnh clock caller; SET không thành công không trả stored. **Yêu cầu tối thiểu Redis 6.2** do PXAT; chưa xác minh server thực tế nào đáp ứng. [SET reference](https://redis.io/docs/latest/commands/set/) ghi PXAT có từ 6.2 và mô tả NX/XX.

CAS giữ identity/createdAt; chỉ thay SessionValues và revision. Các trường metadata được AAD xác thực ở W2.1b vẫn cần caller re-protect trước khi đổi; store không tự giải mã, chuyển phase hoặc quyết định quyền.

Revoke thay payload bằng tombstone, giữ expiry cũ; gọi lại tombstone trả already-revoked. CAS đang giữ snapshot trước revoke không thể thay tombstone. Nếu revoke gặp một update chen giữa GET và Lua thì trả **unavailable**, không tự retry và không nhận vơ rằng đã thu hồi. Đây là tín hiệu “chưa xác nhận được”, không phải cam kết logout thành công; W4 phải xử lý đúng trước khi tích hợp UI. Chưa quyết định UX/refresh retry hay tự chốt nghiệp vụ mới.

### d4 — Unit tests và live harness

Unit command stubs chỉ cung cấp replies/ghi nhận arguments. Chúng **không chạy Lua và không viết một Redis giả bằng JavaScript để nhận đó là bằng chứng atomicity**. Bao phủ create/NX response, schema/corruption, missing/expired/revoked, revision cũ, payload tombstone, identity/namespace, redaction, no replay, entropy failure, async input snapshots, server markers và connection settings/deadline.

Live suite `redis-session-store.integration.test.ts` chỉ bật nếu `OMTS_TEST_REDIS_URL` được cung cấp. Endpoint đã cung cấp nhưng invalid/unavailable phải làm suite fail; không biến thành skip. Có 7 cases: concurrent NX; CAS giữa hai kết nối; tombstone chống stale write/recreate; namespace/account isolation; revoke và CAS đồng thời; physical expiry active/tombstone; fail-closed sau dispose. Dùng Date.now, không dùng expiry cố định của clock unit test để ghi Redis thật.

Mỗi lượt dùng namespace test UUID và hash ngẫu nhiên, key tự hết hạn ngắn; không xóa dữ liệu dùng chung. Các timeout/TTL trong suite chỉ là dữ liệu thử, không chọn TTL production. Suite dùng protected-envelope fixture định dạng hợp lệ, không có JWT thật; không phải smoke test backend hoặc chứng minh crypto key deployment.

## 3. Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` cuối lượt | 86 files/597 tests PASS; 1 file/7 live tests SKIP |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` sau build | PASS, typegen + tsc |
| `npm run build` | PASS, Next 16.4.3 compile/types/prerender |
| `npm audit --json` | PASS, vulnerabilities `{}`, total 0 |
| Negative opt-in check | Child Vitest với URL cố ý invalid trả exit 1 và `Live Redis setup failed: invalid-config`; wrapper assertion PASS; không gọi Redis |
| Import review | Không có import server/auth trong app/components/features; UI vẫn mock |
| Learning | Bài 69 local, Git ignore; không đưa vào phần code nhóm |

Không có browser E2E, live Redis, .NET login/logout/refresh hoặc production deployment trong lượt này. Không thay workflow để skip lỗi, không restart dev server port3000.

## 4. Redis chưa chạy: lỗi chính xác và phần chưa chứng minh

`docker info --format '{{.ServerVersion}}'` exit **1**:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

Docker CLI có mặt nhưng named pipe của Linux Engine không truy cập được. Đây là lỗi kết nối Engine, không phải lỗi mật khẩu Redis hoặc Lua. Chưa khẳng định Docker chưa cài hay tự đổi Docker context; không cài/start service hoặc chọn cloud Redis để lách lỗi. `Test-Path Env:OMTS_TEST_REDIS_URL` trả False.

Do đó **0 live Redis cases được thực thi**, 7 cases để pending. Chưa chứng minh Lua syntax/runtime compatibility, PXAT/Redis TIME/physical TTL, CAS/revoke thực tế giữa worker, ACL/TLS thực tế, mất socket giữa write/reply, persistence/restart/failover hoặc non-eviction của tombstone. Unit test timeout dùng mock không thay được network fault injection.

## 5. Lỗi thực tế ở test và tự review

Lệnh test 3 files ban đầu có 1 failed/57 passed, báo `Error: private fixture URL` ở test SDK construction. Nguyên nhân là `beforeEach(() => sdk.createClient.mockReset())` trả về mock function. Vitest coi function trả về từ hook là cleanup, nên gọi mock đang được cấu hình throw lúc kết thúc test. Lỗi không chứng minh exception factory lọt qua catch.

Đổi hook sang block không return: `beforeEach(() => { sdk.createClient.mockReset(); });`. Chạy lại chính 3 files: **58/58 PASS**, sau đó full suite đạt. Không bỏ nhánh SDK throw, tắt assertion hoặc nới error redaction. Chi tiết dòng chảy nguyên nhân và cách phân biệt assertion/hook cleanup nằm ở bài 69 local.

Tự review bổ sung kiểm tra kết quả SET trong Lua trước stored, deadline bao handshake, test stale input trong await và marker server-only trên cả 4 runtime modules mới. Không có xung đột nghiệp vụ mới cần tự quyết ở lát adapter này. Còn giới hạn đã nêu: revoke tranh chấp chưa bảo đảm thu hồi, unavailable có thể là kết quả ghi không xác định, durability/replay sau restore Redis chưa giải quyết, wrapper là single endpoint chứ chưa là Cluster/Sentinel/failover client.

## 6. Bước tiếp theo

Khi có **Redis local/test riêng >=6.2** và endpoint được cung cấp an toàn, chạy lại suite opt-in theo README, rồi W2.1e review contract/races/restart semantics. Không đóng W2.1 tổng chỉ từ build/unit tests. Có thể tiếp tục phần server boundary thuần/helper phù hợp trong W2.2 khi Redis chờ, nhưng không bật runtime/login thật trước các cổng config/key/cookie/DAL được hoàn tất; refresh vẫn tắt theo quyết định hiện hành.

Production provider, durability/non-eviction, key lifecycle, cookie TTL/CSRF và refresh lost-response vẫn cần chốt riêng. MSG06 vẫn chờ backend structured metadata; không liên quan và không được adapter này tự đóng.
