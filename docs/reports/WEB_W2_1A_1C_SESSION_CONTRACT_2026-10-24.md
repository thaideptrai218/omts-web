# W2.1a/c — contract session và RAM test adapter

> **Follow-up:** [W2.1b](WEB_W2_1B_SID_TOKEN_PROTECTION_2026-10-24.md) đã bổ sung SID/hash, AES-GCM và injected key provider cùng tests. Các đoạn “cipher/SID chưa làm” bên dưới là snapshot trước W2.1b. Production keys, cookie/DAL và Redis runtime vẫn chưa có; không thay kết quả451 tests lịch sử thành số mới.

Ngày 24/10/2026, Asia/Saigon. Web nhánh `feature/OMTS-132-web-foundation`, baseline `4555c32`; giữ các tài liệu đề xuất W2 chưa commit từ lượt trước. Duy Thái đã chọn Redis runtime + RAM tests, deployment chưa chốt, không bật refresh thật. Task này không commit/push/merge, không sửa Mobile/backend/SRS/Jira.

## 1. Phạm vi hoàn thành

**Đã làm W2.1a và W2.1c:** contract thuần, schema kiểm tra input, RAM adapter chỉ cho tests và50 regression cases. Cập nhật quyết định đã chọn B, plan và kiến thức local. **Chưa hoàn thành toàn W2.1:** W2.1b (SID/token protection/server-only), W2.1d (Redis runtime) và W2.1e (nghiệm thu adapter thật) còn pending.

Không tạo Route Handler, session cookie, token cipher, Redis client/connection, server DAL hoặc refresh coordinator. Auth/profile vẫn mock, UI không đổi. Không cài package/đổi lockfile, không chọn TTL hoặc provider mặc định. Docker Engine chưa kết nối được, nhưng đó không chặn contract/unit tests; không lén thay Redis runtime bằng Map.

## 2. Context → Design → Code theo micro-task

### W2.1a — contract và validation

`src/server/auth/session-store.ts` định nghĩa read/create/compareAndSet/revoke và typed results. “Found” có record; missing/expired/revoked, invalid-input và unavailable là các kết quả khác nhau. Redis không kết nối được không được diễn giải thành người dùng chưa từng đăng nhập. Bước này chỉ định nghĩa và dùng unavailable với clock dependency của test adapter, chưa test lỗi Redis.

Record gồm lookup hash, immutable identity (accountId/backendSessionId/actor), phase, protected-token envelope, các expiry do caller cung cấp, createdAt, schemaVersion1 và opaque revision. Hai phase yêu cầu password/contact là trạng thái dữ liệu, **không có mapper tự chuyển gate**. Store không xác thực actor, contact hay quyền; W3/DAL/backend phải quyết định điều đó.

`session-store-validation.ts` dùng Zod strict, từ chối field ngoài contract, raw accessToken/refreshToken/password ở create/update, invalid GUID/phase/timestamp/revision và envelope sai định dạng. Update không nhận idHash/identity/createdAt nên không thể chuyển record sang account khác qua patch. Clock sai kiểu hoặc ném exception trả unavailable, không lộ exception/cause.

Lifetime phải ở tương lai và không vượt refresh expiry được caller cung cấp. Đây là self-consistency check, **chưa xác nhận những giá trị đó đến từ backend đáng tin**. Không thêm sliding TTL qua read hoặc tự đặt7/30 ngày. Access-token expiry khác với expiry record: read có thể tìm thấy record có access token hết hạn, nhưng không cho phép dùng token đó gọi API hay tự refresh.

Envelope hiện chỉ là `{keyId,sealed}` có kiểm tra hình dạng/giới hạn, fixture là chuỗi giả. Chưa có mã hóa, xác thực ciphertext, key provider/rotation hoặc chứng minh token không rò qua mọi đường serialization. Không dùng contract này như một token vault đã an toàn. Việc bảo vệ thật thuộc W2.1b trước runtime.

### W2.1c — RAM adapter test-only

`src/server/auth/__tests__/memory-session-store.ts` là một Map đóng kín theo instance; không có singleton hoặc export factory runtime. Input/read/write snapshots được clone để caller sửa object không đổi dữ liệu đã lưu. Clock injection cho phép test biên thời gian không sleep.

Create không ghi đè record đang sống hoặc tombstone. CAS chỉ cập nhật khi revision còn khớp và record chưa hết hạn/revoked; không upsert khi missing. Revoke tạo tombstone tới expiry cũ, bỏ cả protected payload khỏi entry, lặp lại trả already-revoked. Không tạo revoke outbox hoặc quyết định logout offline; W4 còn phải thiết kế việc giữ credential cần thiết cho upstream revoke/retry trước khi runtime áp dụng.

Self-review chọn revision ngẫu nhiên UUID thay vì đếm lại từ1: record hết hạn và được tạo lại cùng lookup key sẽ có revision khác, nên response cũ không thể khớp nhầm thế hệ mới (ABA). Revision không phải SID và không chứng minh đã tạo cookie đủ entropy. SID factory vẫn chưa làm.

Map thực thi các đoạn cập nhật đồng bộ trong một event loop. Test hai Promise cùng revision chỉ chứng minh một writer thắng ở adapter này, không chứng minh atomicity đa process hoặc Redis. Entries hết hạn được dọn khi truy cập (lazy cleanup); đây không phải memory store production hoặc garbage-collection strategy cho runtime.

### Hàng rào import test adapter

`eslint.config.mjs` thêm no-restricted-imports cho `src/**/*.{ts,tsx}`, trừ `.test.ts/.test.tsx` và `__tests__`. Non-test code import pattern `**/__tests__/**` bị lint từ chối. ESLint API probe xác nhận runtime import lỗi đúng rule; test-support/colocated test vẫn hợp lệ. Đây là kiểm tra import tĩnh theo pattern, không phải sandbox chặn mọi dynamic import hoặc thay thế `server-only`.

## 3. Tests và bằng chứng

Bốn test files mới: lifecycle8 cases, concurrency6, expiry12, validation24 = **50 cases**. Phủ lifecycle/ba phase, hai account/nhiều phiên, snapshots độc lập, duplicate create, stale revision, cạnh tranh writers, revoke idempotent, late update, expiry đúng mốc, tombstone expiry, absent update/revoke, re-create khác revision, invalid clock/input/extra credentials/identity mutation và lifetime không hợp lệ.

| Kiểm tra mới | Kết quả |
| --- | --- |
| Hai files đầu lifecycle/concurrency | 14/14 PASS |
| `npm test -- src/server/auth` | 4 files/50 tests PASS |
| `npm test` | 73 files/451 tests PASS (baseline69/401) |
| `npm run typecheck` | PASS — typegen + tsc exit0 |
| `npm run lint` sau rule mới | PASS — exit0 |
| `npm run build` | PASS — Next16.4.3 compile/types/prerender |
| ESLint API negative/positive probes | Runtime import bị chặn; hai kiểu test path được phép |
| Search non-test source | Không có reference tới RAM adapter |

Package/lock/Vitest config không đổi. Không chạy npm install/ci hoặc audit mới; không mượn audit cũ như kết quả mới. Tests không dùng browser, Redis, backend API hay tài khoản thật; không có integration/production evidence. Cấu hình build vẫn render các route hiện tại, không bật BFF runtime trong lượt này.

## 4. Lỗi thực tế, tự review và giới hạn

Không có unexpected test/typecheck/lint/build failure ở các lượt trên. Inputs cố tình sai và probe import bị lint từ chối là kết quả mong đợi, không phải lỗi ứng dụng chưa sửa.

`rg --files src/server ...` ban đầu báo path không có vì chưa tồn tại server folder trước W2. Đã xác nhận inventory rồi tạo đúng phạm vi, không kết luận app hỏng. `docker info` tiếp tục exit1 do không kết nối named pipe Docker Engine, như report đề xuất; không tự bật service/seed hoặc đổi context. Docker CLI tồn tại không đồng nghĩa Redis đã sẵn sàng.

Probe ESLint đầu gọi nhiều CLI liên tiếp, output ban đầu chỉ có phần runtime bị từ chối; không dùng output thiếu để kết luận cả ba path đạt. Đã chạy lại bằng một ESLint API process, assert số lỗi/rule cho từng path và nhận exit0/PASS đầy đủ. Không có probe file thật được tạo vào source.

Review bổ sung: strict update bảo vệ immutable identity, tombstone không giữ payload, cloned snapshots không chia sẻ reference, mỗi create/update đổi revision, không đổi default lifetime/gate/route/session policy. Không có token cipher/server-only runtime hoặc Redis adapter nên không đánh dấu W2.1b/d/e xong. Thỏa thuận retry/idempotency, MSG06 structured metadata, QA accounts và các gate W3 vẫn còn mở.

## 5. Tiếp theo

W2.1b làm SID/hash và protected-token boundary với injected key provider, review cách quản lý key trước runtime; chưa chọn provider/deploy hoặc lifetime mặc định. Sau đó W2.1d viết Redis adapter có conditional writes nguyên tử và opt-in integration suite; W2.1e chỉ nghiệm thu phần Redis khi có server/endpoint test được cho phép. Clock/schema/record decoding phải được áp nhất quán, không coi RAM test xanh là adapter Redis xanh.

Đã đọc lại OMTS-132/parent121 và Next local docs về DAL/server-only/data security. Chỉ đọc Jira, không cập nhật trạng thái. Learning bài67 nằm trong ignored `docs/learning/`; báo cáo nhóm không chứa secret. Các phần store được duyệt không tự cho phép bật refresh thật hoặc chuyển người dùng sang API mode.
