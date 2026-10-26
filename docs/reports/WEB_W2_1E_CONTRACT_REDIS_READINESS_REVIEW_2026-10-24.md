# W2.1e — Contract review, thử Redis local và phần chưa kiểm chứng

Ngày 24/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD `4555c32`. Giữ thay đổi W2.0–W2.1d đang có; không commit/push/merge, sửa Jira/SRS/backend/Mobile hoặc bật refresh thật. OMTS-132 và parent OMTS-121 đã được đọc lại; trạng thái ticket không phải bằng chứng nghiệm thu Redis.

## 1. Kết quả trước, giới hạn sau

**Chưa chạy được Redis local.** Đã khởi động Docker Desktop đã cài bằng CLI, nhưng Engine không trả kết quả trong các lần kiểm tra có deadline; WSL Ubuntu cũng timeout. Không tạo Redis container, cài server/binary thay thế, reset/shutdown WSL, đổi Docker context hoặc chỉnh backend DB. Không giả lập Redis rồi báo nghiệm thu thành công.

Đã tiếp tục phần không bị chặn: shared contract suite cho RAM/Redis, test transport dùng SDK thật với TCP local bị treo/ngắt, scheduling gate cho race tests, live edge suite và lệnh test Redis riêng chống “thành công vì skip”. **618 tests đạt, 27 live Redis tests skip**; lint/typecheck/build đạt, dependency audit 0. Tăng 21 tests thực thi so với W2.1d; 20 live cases mới vẫn chưa thực thi.

W2.1e **chưa đóng nghiệm thu**, W2.1d/d5 vẫn mở. Ứng dụng vẫn mock; không có cookie/DAL/session runtime hoặc .NET API login/refresh/logout được bật trong lượt này.

## 2. e1 — Thử môi trường local, không mở rộng sang sửa hệ thống

Kiểm tra ban đầu `docker info --format '{{.ServerVersion}}'` exit 1, vẫn báo:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

Docker Desktop executable có sẵn. `docker desktop status` ban đầu báo không lấy được trạng thái và gợi ý start. Đã đọc help, sau đó chạy `docker desktop start --detach`: exit 0, `✓ Starting Docker Desktop`. CLI này là cách khởi động bản đã cài, không cài hay nâng Docker. [Docker Desktop CLI](https://docs.docker.com/desktop/features/desktop-cli/)

**Start được chấp nhận không đồng nghĩa Engine đã khỏe.** Sau đó `docker info`, `docker version --format '{{.Server.Version}}'` và `docker desktop status` không trả kết quả trong 7 giây ở các kiểm tra bounded. Wrapper Node ghi `status:null`, `error:"ETIMEDOUT"`, stdout/stderr rỗng. Exit 0 của wrapper ghi log **không phải** exit 0 của Docker con. Hai CLI chẩn đoán không deadline lúc đầu đã được ngắt bằng Ctrl+C; không kill Docker backend hoặc ứng dụng khác.

Kiểm tra thay thế chỉ đọc: `wsl -d Ubuntu --exec sh -c "command -v redis-server"` cũng ETIMEDOUT sau 7 giây. Vì chưa có output nên **không kết luận Ubuntu thiếu Redis**. Docker Desktop processes xuất hiện và log CLI có request `/backend/state`, nhưng không có kết quả server khỏe; chưa xác định nguyên nhân gốc bên trong Engine/WSL. Không suy đoán lỗi license, quyền, virtualization hay mật khẩu Redis khi chưa có bằng chứng.

`OMTS_TEST_REDIS_URL` chưa có. Không gửi lệnh tạo container khi Engine chưa xác nhận hoạt động để tránh một thao tác create treo rồi bất ngờ chạy muộn. Không tạo volume, xóa dữ liệu hoặc dùng một Redis chưa biết chủ sở hữu. Docker Desktop đã được yêu cầu start; không stop/reset toàn bộ môi trường để “dọn” vì có thể ảnh hưởng công việc khác.

## 3. e2 — Shared contract thay cho hai bộ kỳ vọng độc lập

`__tests__/session-store-contract.ts` đăng ký **13 case cùng kỳ vọng** cho hai adapter. RAM chạy trực tiếp; Redis chạy qua connection factory với namespace test riêng. Không nới kỳ vọng cho Redis để che sai khác, cũng không yêu cầu RAM giả vờ chứng minh mạng/physical TTL.

Cases bao gồm round-trip identity/lifetime/revision; ba phase định dạng; create trùng; missing không upsert; input/result clone isolation; nhiều phiên cùng account và account khác; field credential dư; CAS giữ identity/createdAt; validation/lifetime; 20 updates cùng revision chỉ một updated; revoke idempotent, chặn stale update và create lại trước expiry.

Input dùng Date.now và hash ngẫu nhiên; TTL test 60 giây không phải quyết định session production. Fake envelope chỉ là dữ liệu định dạng trong contract cases, không phải token backend. Kết quả **13/13 RAM PASS; 13 Redis pending**. Case 20 updates trên RAM không được gọi là bằng chứng distributed CAS.

## 4. e3 — Kiểm tra SDK thật khi không có Redis

`session-redis-transport.test.ts` không mock `@redis/client`. TCP fixture chỉ nghe loopback ở port ngẫu nhiên, nhận bytes handshake và hoặc không trả lời, hoặc đóng socket. Nó không hiểu Redis, không trả ACK, không GET/SET hay chạy Lua.

Hai tests đạt: handshake không phản hồi bị giới hạn bởi deadline factory; socket ngắt sau handshake trả unavailable, không làm process văng raw error. Test có watchdog riêng và finally dọn socket/server để lỗi không giữ test process treo. Đây là bằng chứng thật cho **hai đường lỗi transport**, không chứng minh command timeout sau authentication, TLS/ACL, reconnect với Redis hoặc mất reply sau một write đã commit.

## 5. e4 — Chuẩn bị race/boundary tests, chưa gọi là đã chạy

`redis-read-gate.ts` giữ response của một GET sau khi nguồn đã trả snapshot. Test cho connection B làm việc rồi mới thả connection A vào Lua. Gate không tự tính kết quả CAS hoặc chế Redis reply. Hai unit tests cho gate đã đạt; chúng chỉ chứng minh scheduling/forwarding helper.

`redis-session-edge.integration.test.ts` thêm **7 live cases**, hiện đều pending:

1. A đọc active → B revoke → A update: Lua phải trả changed, adapter conflict, tombstone còn nguyên.
2. A đọc để revoke → B update → A revoke: unavailable/changed, không nhận vơ đã thu hồi.
3. JSON bị làm hỏng giữa GET và EVAL: exact-snapshot comparison không ghi đè; lần đọc sau unavailable.
4. Key hết TTL trong lúc GET bị giữ: dù caller xin expiry dài hơn và clock app đứng sau, Lua không được hồi sinh key missing.
5. Clock app đi sau chấp nhận một expiry đã qua: Redis TIME phải từ chối create, không để lại key.
6. Envelope AES-GCM thực sự từ helper W2.1b đi qua Redis rồi mở lại; raw record không chứa plaintext token fixture. Không dùng JWT thật hoặc key production.
7. Thay toàn bộ client connections vẫn đọc đúng active/tombstone từ store dùng chung; old disposed client phải unavailable. **Đây không phải test restart server Redis.**

Fixture mở connection lỗi một phần sẽ đóng các connection đã sở hữu. Dữ liệu corruption chỉ ghi vào key namespace ngẫu nhiên của suite và có TTL; không flush/scan/delete data dùng chung. Các case thuộc 3 suites gồm **7 W2.1d + 13 shared + 7 edges = 27**, không cộng thành PASS khi skip.

## 6. e5 — Lệnh nghiệm thu không được xanh vì không chạy gì

Thêm `npm run test:redis` qua `scripts/test-session-redis.mjs`. Lệnh bắt buộc có `OMTS_TEST_REDIS_URL`, chạy đúng 3 live suites từ repo root dù người gọi ở directory khác, và truyền exit code thất bại ra ngoài. Không đọc `.env`, in connection URL hoặc mặc định localhost; thiếu/blank endpoint exit 1 trước khi gọi Vitest.

Bốn runner tests đã đạt: endpoint absent, empty, whitespace đều fail rõ; URL invalid cố ý làm cả 3 suites fail setup. Đây là **negative checks**, không tạo server và không gọi dữ liệu thật. Trong `npm test` thông thường, 3 live suites vẫn opt-in/skip khi thiếu endpoint để không bắt unit tests phụ thuộc Docker. README ghi hai loại lệnh khác nhau.

`lint` mở rộng từ `src` sang `src scripts` để helper mới cũng được CI lint qua lệnh hiện hành. Không sửa trigger/workflow, giảm strictness hay continue-on-error. Không thêm/nâng dependency; package-lock vẫn giữ các thay đổi W2.1b/d từ lượt trước.

## 7. Review restart/failover semantics — không tự chốt production

| Sự kiện | Adapter hiện tại xử lý/giới hạn | Bằng chứng còn thiếu |
| --- | --- | --- |
| Thay Next worker/client, Redis và key provider còn nguyên | Không có RAM runtime cần khôi phục; client mới tra cùng namespace. Client cũ không tự reconnect | Live client-replacement test chưa chạy; key-provider production chưa có |
| Redis restart không persistence | Key có thể mất; GET null là missing, không tự dựng phiên từ RAM | Chưa restart Redis thật; UI xử lý mất phiên chưa ghép |
| Redis khôi phục snapshot cũ trước revoke | Tombstone có thể biến mất/bản active cũ trở lại; CAS không nhận ra lịch sử đã bị rollback | Cần chốt durability/restore/failover policy trước production |
| Failover/replica hoặc eviction | Không bảo đảm một revoke đã ACK tồn tại ở bản dữ liệu được phục hồi; TTL không thay độ bền | Chưa test topology, memory policy, persistence/replication |
| Write xong nhưng mất reply | unavailable là chưa xác nhận, không phải chưa ghi; không auto retry/fallback | Chưa có fault injection sau Redis write; không bật refresh |

RDB là snapshot theo thời điểm, AOF ghi lại thao tác; các cấu hình persistence có đánh đổi về chi phí và cửa sổ mất dữ liệu. [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) là cơ sở cho các rủi ro trong bảng; bảng là phân tích thiết kế, không phải kết quả chạy của máy này. Không chọn AOF/RDB/fsync, provider hoặc recovery epoch thay người dùng/nhóm.

Không suy rằng AES-GCM ngăn replay nguyên snapshot hợp lệ: nó kiểm tra tính toàn vẹn theo metadata, không biết lịch sử Redis bị khôi phục. Backend vẫn phải kiểm tra quyền; phase/store found cũng chưa phải permission để gọi API. Không phát hiện xung đột nghiệp vụ mới cần tự giải quyết ở lát tests này; các quyết định cookie/TTL/key/deploy/refresh cũ vẫn mở.

## 8. Lỗi code thực tế và tự review

Sau khi 4 runner tests xanh, `npm run typecheck` exit 1:

```text
src/server/auth/redis-test-command.test.ts(8,14): error TS2339:
Property 'OMTS_TEST_REDIS_URL' does not exist on type
'{ NO_COLOR: string; NODE_ENV: "development" | "production" | "test"; }'.
```

Typegen đã thành công; lỗi ở TypeScript test. Spread process.env khiến object được suy luận quá hẹp để delete một tên env động. Sửa thành `const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };`, chỉ sửa bản sao env đưa cho child process, không sửa environment của người dùng. Không ép any, ignore hoặc bỏ typecheck. Chạy lại typecheck đạt; full suite/build đạt. Không có lỗi sản phẩm dây chuyền cần sửa.

Tự review kiểm tra timer/socket cleanup, partial-connection cleanup, gate forwarding, không chế Lua reply, distinct namespaces/expiry, runner cwd/exit code, và scope không bật runtime. Bổ sung giữ address validation của TCP fixture trong try/finally và timeout hợp lý cho client-replacement case. Không đổi runtime code của adapter/crypto trong lượt này; không tuyên bố không có bug chỉ vì các tests đã chạy xanh.

## 9. Verification và bàn giao

| Lệnh/kiểm tra | Kết quả |
| --- | --- |
| `npm test` | **90 files/618 tests PASS; 3 files/27 live Redis tests SKIP** |
| `npm run lint` | PASS, src và scripts, exit 0 |
| `node --check scripts/test-session-redis.mjs` và ESLint script riêng | PASS |
| `npm run typecheck` sau sửa TS2339 và sau build | PASS |
| `npm run build` | PASS, Next16.4.3 compile/types/prerender |
| `npm audit --json` | vulnerabilities `{}`, total 0 |
| `npm run test:redis` khi không có endpoint | Exit 1 có chủ ý: không nghiệm thu bằng skip |
| Tài liệu/working tree | 57 relative links resolve; diff/whitespace checks đạt; basic private-key/credential-URL scan 45 files không thấy match, không thay dedicated secret scanner; learning ignored, không staged |

Learning 70 lưu local/ignored, kèm kiến thức nền, lỗi thực tế và đáp án bảo vệ. Không claim browser E2E/QA API hoặc CI remote. Chưa commit/push/merge.

Muốn hoàn tất W2.1e cần Engine hoạt động hoặc endpoint **Redis test riêng >=6.2** được cung cấp an toàn, rồi chạy `npm run test:redis`. Sau 27 cases còn phải kiểm chứng server restart/loss/restore ở môi trường disposable; suite hiện tại không tự dừng hay restart một Redis được cung cấp ngoài. Có thể tiếp tục W2.2 ở phần server boundary/config/tests không cần Redis, nhưng không activation API trước các cổng config/key/cookie/DAL và không tự đóng câu hỏi production.
