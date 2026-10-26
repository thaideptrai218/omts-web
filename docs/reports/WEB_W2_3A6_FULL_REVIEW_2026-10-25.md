# W2.3a6 — Review cookie, CSRF và thời hạn phiên

Ngày 25/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD trước thay đổi `4555c32`. Review phần chuẩn bị a1–a5; **không bật API/refresh thật, không triển khai DAL hoặc coi W2.3 đã tích hợp xong**. Theo yêu cầu lần này, HTTPS giữ pending. Không stage/commit/push/merge.

## 1. Nguồn và phạm vi

Đã đối chiếu AGENTS, PROJECT_CONTEXT, plan API, WEB-API-07/C1A/C2A/C3A, Report3Finnal.md (UC02, UC07, NFR-01), source/tests và tài liệu Route Handlers/cookies đi kèm Next16.4.3. Jira đọc lại: OMTS-132 Done, parent OMTS-121 In Progress; không sửa Jira/SRS và không dùng trạng thái ticket làm chứng cứ BFF chạy thật.

Các micro-task thực hiện lần lượt: rà policy/source → bổ sung regression → sửa lỗ hổng lint → chạy quality gates/Next fixtures → tự review và cập nhật tài liệu. Changes W2 tồn tại từ các phiên trước được giữ nguyên; không coi toàn bộ untracked `src/server`, `scripts`, `tests` là code mới của a6.

## 2. Kết quả review theo lớp

| Lớp | Điểm đã đối chiếu | Giới hạn còn lại |
| --- | --- | --- |
| a1 config | Origin/profile tường minh; HTTPS Secure/__Host-; HTTP chỉ loopback dev/test; không suy từ proxy/Host; output redacted/frozen | Đọc config đúng không chứng minh topology/deploy/certificate đúng |
| a2 cookie | Canonical SID; raw Cookie trước parsed map; duplicate/malformed fail closed; issue không persistence/Domain; clear đúng tên/path/flags; wrapper chống JSON/inspect vô tình | Hash không phải identity; clear không revoke; không giải quyết logout cũ xóa cookie login mới |
| a3 CSRF/body | Exact Origin + marker; Fetch Metadata bổ sung; policy server-owned; byte/deadline budget; JSON UTF-8; bodyless logout; consume một lần; cleanup/redaction | Cần binding vào handler thật trước upstream/store writes; CSRF không thay authorization hoặc chống XSS |
| a4 expiry | Min actual access/refresh; cắt sub-ms bảo thủ; giữ cap ngắn hơn; không sliding/grace; phân biệt expired/invalid/unavailable | Generic store vẫn refresh-bounded theo contract cũ; DAL tương lai phải áp C3A, không suy found = usable |
| a5 fixture | Tách khỏi src/app; fake SID/clock; opt-in/run-id/loopback; no-store; từ chối cookie lạ/duplicate; child do runner sở hữu | Không phải auth/session runtime; cookie chung host không cách ly theo port; HTTPS và race thật chưa nghiệm thu |
| Tooling | Lint/test/typecheck/build và negative boundary/serialization fixtures | Local PASS không phải GitHub CI/QA API PASS; live Redis không chạy lại |

Không xác nhận thêm lỗi logic P1/P2 trong các helper đã review. Đây là kết luận trong phạm vi source/tests hiện tại, không phải bảo đảm không còn lỗi. Phát hiện cụ thể và lỗi thực hành nằm dưới đây.

## 3. Finding đã sửa: P2 W23-REV-01 — lint mặc định bỏ sót fixture

`npm run lint` trước sửa chỉ chạy `eslint src scripts --max-warnings=0`; mã cookie fixture nằm trong `tests/fixtures/cookie-browser`. Một fixture có lỗi lint vẫn có thể không bị bước lint CI phát hiện. Đây là lỗ hổng kiểm tra, **không phải bằng chứng CSRF đã bị vượt qua**.

Thêm `session-cookie-fixture-tooling.test.ts` dùng cấu hình ESLint thật: kiểm script mặc định, bốn đường dẫn authored source, ba đường dẫn generated cần bỏ qua và một canary unused-variable bằng lintText (không viết file lỗi vào repo). Sau sửa lỗi đường dẫn của chính test, chạy trước khi sửa cấu hình cho kết quả **5 PASS/4 FAIL**: thiếu thư mục trong script và ba output generated chưa bị ignore.

Sửa `package.json` để lint thêm thư mục cookie fixture. Thêm hai global ignore hẹp trong `eslint.config.mjs`: `.next/**` và `next-env.d.ts` của đúng fixture này. Không ignore cả `tests/`, không hạ severity/max-warnings hoặc thêm dependency. Chín regression checks PASS sau sửa; lint mặc định cũng PASS. CI workflow không đổi, nhưng bước gọi npm run lint sẽ dùng phạm vi mới khi branch được chạy trên CI.

## 4. Regression bổ sung: 20 cases

- **2 queued-body abort cases:** JSON và bodyless stream có dữ liệu/EOF sẵn rồi request bị hủy. Giả thuyết đọc thắng Promise.race khiến guard vẫn cho qua **không tái hiện**: source cũ đã reject400 và cleanup timer/lock. Giữ test; không sửa logic dựa trên suy đoán. Không tuyên bố mọi race sau guard đã giải quyết.
- **9 tooling cases:** script coverage, source không bị ignore, generated output bị ignore và ESLint thực sự phát hiện unused variable. Tải config/plugin một lần ở beforeAll, assertions giữ deadline mặc định.
- **9 fixture composition cases khi đã có SID hợp lệ:** thiếu Origin/marker, khác port, Origin bị ghép, Fetch-Site none, simple media, JSON lỗi, vượt budget, clear có body. Kiểm đúng400/403/413/415, no-store, không Set-Cookie/CORS, không echo input và probe vẫn active với writes=1. Không biến rejection thành MSG19/logout.

Focused ba file vừa sửa: **54/54 PASS**. Tổng default suite tăng từ1234 lên1254 PASS; không cộng các lượt chạy lặp thành test mới.

## 5. Lỗi thực tế, chẩn đoán và giới hạn kết luận

### Sai root trong test tooling mới

Lệnh `npx vitest run src/server/auth/session-cookie-fixture-tooling.test.ts` ban đầu trả9 FAIL: `ENOENT ... D:\Đồ_án\package.json` và `Could not find config file`. Nguyên nhân đã xác định: từ `src/server/auth/<file>` đi lên bốn cấp thay vì ba, khiến cả đọc package và cwd ESLint trỏ ra ngoài repo. Sửa URL thành `../../../`; lần chạy kế tiếp mới tái hiện đúng4 failures về coverage/ignore, rồi9 PASS sau sửa cấu hình. Đây là lỗi test tác giả vừa viết, không phải package hoặc ESLint trên máy bị hỏng.

### Hai timeout ở lượt full đầu

Lượt đầu chạy npm test đồng thời npm run lint/audit: test đầu cần load Next ESLint config mất5346ms, vượt timeout5000ms; test Redis negative-command cũ báo `spawnSync ... ETIMEDOUT` tại deadline15000ms. Kết quả:1252 PASS/2 FAIL/27 SKIP. Mã lỗi Redis chứng minh child vượt deadline, không chứng minh Redis server hỏng hoặc API không truy cập được: đây là test **invalid config**, không chạy live Redis.

Chuyển việc nạp config/plugin mới sang beforeAll dùng hook timeout mặc định; không tăng testTimeout toàn cục, nới deadline Redis hay sửa runner Redis. Hai lượt npm test riêng sau đó đều đạt1254 PASS/27 SKIP. Tải đồng thời là yếu tố quan sát được, nhưng chưa có profiling để chốt root cause timeout Redis; rerun PASS không được gọi là đã sửa triệt để lỗi đó. Chi tiết kiến thức/lệnh nằm trong bài80 local.

Ở bước inventory đã gọi nhầm `csrf-lifecycle.test.ts` và `vitest.config.ts`; file thực là `csrf-guard-lifecycle.test.ts` và `vitest.config.mts`. Get-Content báo không tìm thấy; dùng rg --files xác định đúng rồi đọc lại. Không có file sản phẩm nào bị mất hoặc cần khôi phục.

## 6. Evidence của lần review này

| Lệnh/kiểm tra | Kết quả mới trong a6 |
| --- | --- |
| npm test |110 files/1254 PASS;3 files/27 Redis SKIP;113 files/1281 tổng |
| Focused ba file mới/sửa |54/54 PASS;20 cases tăng so a5 |
| Focused toàn W2.3 |10 files/399 PASS; không cộng thêm vào số test full suite |
| npm run lint |PASS, bao gồm authored cookie fixture bằng script mặc định |
| npm run typecheck / build |PASS; product13 static outputs, không thêm fixture route/API handler |
| npm run test:cookies |2 positive Next builds;24 HTTP assertions/compiler,48 tổng PASS |
| npm run test:boundary |6 intentional negative builds;11 modules dưới cả2 compilers bị chặn đúng marker |
| npm run test:serialization |4 builds PASS:2 positive HTML/RSC/artifact-canary và2 exact token-guard negatives |
| npm audit --json |0 vulnerabilities; không thay dependency |
| Hygiene |12 files không trailing whitespace;109 relative Markdown links hợp lệ; learning80/index và output Next ignored; staged diff rỗng; HEAD/branch không đổi |
| Browser/HTTPS/live Redis/QA/CI |Không chạy mới;27 Redis SKIP không phải live PASS |

Serialization fixture cũ kiểm token custody/DTO, không bổ sung negative RSC cookie/body-wrapper case trong a6. Unit tests vẫn kiểm JSON/inspection của hai wrapper; không gọi bằng chứng đó là full handler/log/RSC redaction.

Browser HTTP15 checks của a5 là **bằng chứng phiên trước**, không tính thành browser run mới của a6. HTTPS pending theo yêu cầu người dùng; không tạo/cài certificate, thay trust store hoặc bypass TLS warning. Build-trace flake lịch sử của a5 không tái hiện trong lượt test:cookies này, nhưng chưa có root cause/fix được xác nhận.

Tự review thay đổi cuối: production helper logic không đổi; diff thực thi a6 chỉ mở rộng script/ignore lint và thêm test. Positive/negative fixtures vẫn tách khỏi src/app, `.env.example` vẫn mock. Giữ nguyên code dirty từ các micro-task W2 trước đó và không đưa bài học vào Git.

## 7. Tự đánh giá và việc tiếp theo

a6 chỉ đóng **review/regression/report phần chuẩn bị**. a5 HTTPS, parent W2.3 và W2.2e/e5 vẫn mở. Sản phẩm vẫn mock/client guard, chưa an toàn để phát hành real API; không trộn mutation mock vào phiên thật.

Bước kế tiếp hợp lý là W2.4: thiết kế contract đọc session/DAL, phân biệt limited/application, áp C3A sau đọc store và kiểm permission trước trả private DTO. Sau đó mới ghép handler/login/logout qua fake transport và kiểm anonymous SSR/direct endpoint/cache/race; chỉ bật API khi các cổng được đáp ứng. Không tự quyết gate Staff email-OR-phone đang khác backend, MSG06 thiếu metadata hoặc refresh retry/idempotency. Không phát sinh quyết định nghiệp vụ mới trong a6.
