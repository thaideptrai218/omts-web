# W2.2 một phần — Server boundary/config và khắc phục Docker local

Ngày 24/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD `4555c32`; giữ các thay đổi W2.0–W2.1e chưa commit. Không commit/push/merge, sửa Jira/SRS/backend/Mobile hoặc bật API/refresh thật. Đã đọc lại quy tắc repo, context, plan, OMTS-132 cùng thông tin parent OMTS-121 và tài liệu Next đang cài.

## 1. Kết quả và ranh giới

**Đã khắc phục lỗi khởi động Docker trên máy**, Engine29.4.3 phản hồi; Redis test7.4.11 và6.2.24 đều PONG và chạy đạt **27/27 cases**. Full Vitest với Redis7.4.11 đạt **95 files/713 tests, không skip**. Không biến hai lượt27 cùng cases thành54 cases độc lập.

**W2.2 đã có phần không phụ thuộc Redis:** parser config server-only, source mode tường minh, origin/timeout validation, catalog endpoint cố định, marker cho runtime validation và negative Next builds. App vẫn mock; chưa có backend HTTP transport, cookie/DAL, Route Handler mới hoặc real-session DTO serialization. W2.2 tổng vẫn mở, không gọi đây là hoàn tất API integration.

Không Redis endpoint: `npm test` đạt **92 files/686 tests;3 files/27 live cases skip**. Có endpoint test được truyền riêng cho process: full suite713/713. Negative boundary build có2 kiểm tra compiler riêng, không cộng vào số Vitest.

## 2. W2.2a — Cấu hình là dữ liệu được kiểm tra, không phải công tắc bật API

`src/server/config/backend-config.ts` nhận một environment object từ caller server, không đọc process.env khi import, không tự kết nối, fetch hoặc chọn adapter. Cần source rõ `mock`/`api`, không suy API từ NODE_ENV production, không fallback mock khi config API sai.

| Trường | Quy tắc hiện tại | Điều không tự quyết |
| --- | --- | --- |
| NODE_ENV | development/test/production | Không chọn provider/deploy |
| OMTS_DATA_SOURCE | Bắt buộc mock hoặc api | Parse valid không đổi factory ứng dụng |
| OMTS_API_BASE_URL | API mode bắt buộc origin-only; không userinfo/path/query/fragment/escaping/backslash | Không lấy URL từ browser hoặc chọn QA server |
| OMTS_API_TIMEOUT_MS | API mode bắt buộc decimal integer1–60.000 ms | Không chọn session TTL/refresh retry |

HTTPS được chấp nhận cho origin được operator cấu hình. HTTP chỉ ở loopback trong development/test; production hiện từ chối cả loopback plaintext. Đây là guard chuẩn bị, không phê duyệt topology production; nếu deploy cần hop HTTP nội bộ thì phải review rõ trước, không âm thầm nới rule. Origin normalize theo URL parser, không resolve DNS hay gọi mạng.

Mock mode từ chối leftover API URL/timeout để tránh cấu hình trộn lẫn. Các biến môi trường không liên quan như PATH được bỏ qua có chủ ý; không áp dụng strictObject lên toàn bộ environment hệ điều hành. Hai public URL alias NEXT_PUBLIC_API_BASE_URL/NEXT_PUBLIC_OMTS_API_BASE_URL bị từ chối, không lấy làm fallback. Lỗi trả tên trường đã biết, không URL/value, raw Zod issues hoặc cause; config thành công được freeze.

`.env.example` chỉ còn server-only source=mock và hai ví dụ API comment-out. Không đọc/chỉnh `.env.local`, không tạo token/key, không thêm runtime Redis hoặc refresh switch. Factory `auth-service.instance.ts` vẫn tạo mock environment, không import parser mới. Theo [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables), NEXT_PUBLIC có thể được đưa vào bundle; BFF không cần browser nhận upstream config. API URL tự nó không nhất thiết là secret, nhưng không nên mở đường đưa token/key cùng nhóm config public.

## 3. W2.2b — Catalog đích gọi server, chưa phải HTTP transport

`src/server/backend/backend-endpoint.ts` chỉ dựng target `{url,method}` từ config đã validate và key enum. Catalog snapshot backend48ae1e0:

| Key | Method/path |
| --- | --- |
| login | POST /api/auth/login |
| identity | GET /api/me |
| permissions | GET /api/me/permissions |
| profileRead | GET /api/me/profile |
| profileUpdate | PUT /api/me/profile |
| logout | POST /api/auth/logout |

Không có refresh entry. URL tùy ý, //host, traversal, query injection, prototype keys và key lạ bị từ chối. Mock trả disabled. Target mới/frozen, origin phải giữ nguyên; internal config bị dựng sai trả invalid-target thay vì phát tán lỗi URL chứa dữ liệu đầu vào.

**Origin được cấu hình là allowlist đích; config phải đến từ operator server tin cậy**, không từ request. Catalog không xác thực danh tính, cấp quyền hay phê duyệt scope profileUpdate đang chờ WEB-API-03. Không có fetch, headers/Bearer, redirect/caching policy hoặc parser response ở đây. DNS rebinding, redirect sang origin khác và streaming/DTO redaction phải được kiểm tra khi có transport thật; không claim đã xử lý SSRF toàn diện chỉ từ URL builder.

## 4. W2.2c — Server-only và kiểm tra compiler thực tế

Hai module mới có server-only. Thêm marker vào session-store-validation để runtime schema/clock helpers trong server/auth không bị UI import nhầm. File session-store.ts chỉ có type-only contract nên không cần marker runtime. Năm test files RAM thêm mock marker riêng từng file; không đổi điều kiện toàn cục Vitest hoặc bỏ server-only trong sản phẩm.

`npm run test:boundary` build fixture cố tình sai: Client Component import chính backend-config.ts của repo. **Webpack và Turbopack đều exit1 với diagnostic server-only/backend-config và Client/Server Component; runner kiểm tra đúng diagnostic rồi PASS**. Một lỗi build bất kỳ, thiếu package, timeout hoặc compile thành công không được nhận là boundary đạt.

Fixture nằm ở tests/fixtures/server-boundary, không trong src/app và không tạo route/showcase sản phẩm. Root app build vẫn có cùng routes cũ. Chỉ output .next/type files do fixture tạo được ignore, và tsconfig loại đúng .next artifact đó; không bỏ typecheck source/tests. Không sửa next.config.ts sản phẩm hoặc bật experimental taint/caching policy mới.

Marker/compiler ngăn import client, **không ngăn server code tự serialize object nhạy cảm vào props/JSON**. Kiểm tra DTO, RSC/prefetch, log và handler thực tế còn pending khi có wiring. [Next data security](https://nextjs.org/docs/app/guides/data-security) phân biệt server-only module và trách nhiệm trả DTO tối thiểu; không dùng marker để thay authorization.

## 5. Docker — nguyên nhân có bằng chứng, không chỉ timeout

Log com.docker.backend.exe.log chỉ ra startup bị chặn ở Inference manager: socket `C:\Users\duyth\AppData\Local\Docker\run\dockerInference` không remove được, báo `The file cannot be accessed by the system`, rồi engines shutdown complete/backend crashed. Đây là nguyên nhân trực tiếp Docker Engine không lên; chưa đủ để khẳng định sự kiện Windows nào trước đó đã làm socket hỏng.

File là ReparsePoint,0 byte, timestamp23/07/2026. Đối chiếu issue gốc [Docker desktop-feedback448](https://github.com/docker/desktop-feedback/issues/448) cho thấy cùng nhóm startup lỗi AF_UNIX/socket ngay cả khi model runner tắt; không lấy đó làm bằng chứng phiên bản khác trên máy mình. Không bật/tắt feature inference hoặc sửa settings-store.

`docker desktop stop --detach` timeout8 giây vì backend đang crash. Đã xác minh executable paths thuộc bản Docker đã cài rồi dừng đúng Docker frontend/backend processes đã crash; không kill WSL service, vmcompute, ứng dụng khác hoặc dùng taskkill tên rộng. Log đã ghi local engines stopped trước sửa; không gửi lệnh stop container đang chạy.

Thử Move-Item riêng dockerInference sang tên cách ly vẫn lỗi file inaccessible. Thay vì xóa/reparsepoint-delete hoặc reset data, kiểm tra thư mục run: chỉ2 socket0 byte, không subdirectory hay data file. Xác minh source/parent/destination tuyệt đối và không reparse directory, không overwrite; **rename nguyên directory runtime** thành run.stale-20261024-w22, tạo directory run mới và start Docker hidden.

Docker qua được Inference nhưng log mới crash tại `C:\Users\duyth\AppData\Local\docker-secrets-engine\engine.sock`. Kiểm tra thư mục chỉ1 socket0 byte; không có file chứa secret. Áp dụng guard tương tự và rename directory thành docker-secrets-engine.stale-20261024-w22; run vừa tạo chỉ có1 IPC socket cũng được cách ly trước lần start tiếp theo. Hiện tượng lỗi socket nối tiếp có báo cáo tại [Docker desktop-feedback554](https://github.com/docker/desktop-feedback/issues/554); máy này được xác nhận bằng log/metadata và kết quả sau sửa, không chạy script của issue một cách mù quáng.

## 6. Phạm vi sửa máy và khả năng đối chiếu

Ba directory cách ly còn giữ nguyên:

```text
C:\Users\duyth\AppData\Local\Docker\run.stale-20261024-w22
C:\Users\duyth\AppData\Local\Docker\run.stale-20261024-w22-step2
C:\Users\duyth\AppData\Local\docker-secrets-engine.stale-20261024-w22
```

Chúng chứa các socket tạm đã kiểm tra, không database/VHD/volume hay real secret. Không recursive delete, không Clean/Purge/Factory Reset, không unregister/shutdown WSL, không đổi Docker context, settings/policies, nâng version hoặc upload diagnostics. [Docker troubleshooting](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/) mô tả reset/cleanup data là thao tác có thể phá dữ liệu; không cần dùng để khắc phục case này.

Sau sửa `docker info --format '{{.ServerVersion}}'` exit0 trả29.4.3, nhiều lần kiểm tra sau vẫn đạt. Docker còn chạy sau cleanup. Container SQL Server có sẵn hiện healthy; không gửi query/migration/seed hay chỉnh/xóa data của nó. Đây là khắc phục local socket startup, không phải vá upstream Docker hay bảo đảm lỗi không tái diễn sau crash/standby tương lai.

## 7. Redis acceptance thật sau khi mở được Engine

Dùng hai official images, không Redis đang có của người dùng:

| Image | Digest lúc pull | Kết quả |
| --- | --- | --- |
| redis:7.4.11-alpine | sha256:57e4255cc971b1c8d6f8a6ca283ac01bc3ecdd914273ef6bfaede87aaecd6541 | PONG,27/27 live PASS; full713/713 |
| redis:6.2.24-alpine | sha256:592b215e9287182f11ba9d7c229dc0ba312bb900a016ea65ae378b0127567319 | PONG,27/27 live PASS |

Containers tên omts-w22-redis-20261024 và omts-w22-redis-min-20261024, label omts.test.run=w22-20261024; publish chỉ127.0.0.1 với port tự cấp. /data là tmpfs32 MiB, memory128 MiB, save/AOF tắt **chỉ trong test fixture**; không chọn durability production. Kiểm tra inspect xác nhận không bind/named volume và tmpfs thật.

Đã chạy đủ3 suites:7 lifecycle/concurrent/expiry cases,13 shared contract và7 edge cases. Chứng minh Lua/PXAT/TIME/physical TTL và các controlled races hiện tại trên hai phiên bản này, cùng cipher round-trip/client replacement. Không gọi2 connections là nhiều Next workers end-to-end hoặc gọi client replacement là Redis restart.

Test endpoint chỉ đưa vào env của child Vitest, không ghi env file/bật source API. Xong tests đã kiểm tra full container ID, label, tên, loopback binding, no persistent mounts rồi xóa đúng hai container tmpfs của task. Dữ liệu giả RAM đó không cần giữ lại và có thể sinh lại; images cached, quarantines và containers khác không xóa.

**Chưa kiểm chứng:** Redis server restart, crash sau write/lost reply, persistence/restore/failover/replica, eviction hoặc production TLS/ACL. W2.1d/d5 và W2.1e/e6 có thể đóng; W2.1e/e7 cùng W2.1 tổng vẫn mở.

## 8. Tests, tự review và lỗi thực tế

Thêm65 unit cases cho config/endpoint và3 marker cases; không sửa assertion cũ để qua lỗi. Tests bao phủ nguồn thiếu/sai, mock/API không trộn, timeout biên/định dạng, origin/casing/credentials/path/query/escaping, public aliases, freeze/redaction, catalog methods, arbitrary URL/refresh/prototype keys và internal config sai. Fetch spies xác nhận helper không gửi request.

Tự review phát hiện cần chặn cả userinfo rỗng `https://@host`, bắt lỗi URL nội bộ và chỉ trả tên config fields đã biết thay vì cast tùy ý issue.path. Đã bổ sung regression checks; không có lỗi sản phẩm mới bị che hoặc nghiệp vụ được tự chốt. Server/config/backend không được app/components/features import runtime; fixture là ngoại lệ test cố tình sai.

Lỗi thực tế chính là Docker socket rename/Engine crash đã ghi theo từng bước ở trên; không có TS/test failure sau các thay đổi W2.2 này. Có một lệnh đọc nhầm src/lib/api/api-client.ts; rg tìm đúng src/shared/http/api-client.ts, đã đọc file thật, không dựng client trùng. Không coi exit code cuối chuỗi PowerShell là bằng chứng câu đọc sai đã thành công.

| Cổng kiểm tra | Kết quả mới |
| --- | --- |
| Full Vitest với Redis7.4.11 |95 files/713 PASS,0 skip |
| Vitest không endpoint |92 files/686 PASS,3 files/27 SKIP đúng opt-in |
| Redis6.2.24 riêng |3 files/27 PASS |
| test:boundary |2 negative compiler checks PASS; intentional child build failures được xác nhận |
| npm run lint / npm run typecheck sau build / npm run build |PASS |
| npm audit --json |vulnerabilities {},total0; không thêm/nâng dependency |
| git diff/check, generated artifacts, local learning |62 relative links resolve; whitespace/private-key pattern checks54 files và Redis credential-URL check20 non-test files đạt (không thay dedicated secret scanner); fixture output/learning71 ignored, không staged/commit/push |

## 9. Việc tiếp theo vẫn cần làm

W2.2 còn transport server thật (fixed targets, credential/header handling, redirect/timeouts/cache/error redaction) và DTO/JSON/RSC/log evidence khi có handler. Cookie/CSRF, DAL guards và full source composition thuộc các bước kế tiếp; server session/key-provider/cookie lifetime và profile scope chưa được report này chốt.

MSG06 vẫn chờ structured backend params; refresh/lost-response agreement và production Redis durability/key lifecycle vẫn mở. Không sửa SRS/Jira hoặc gọi .NET thật trong lượt này. Bài học71 local giải thích config, marker vs serialization, negative testing, lỗi AF_UNIX và cách sửa không mất Docker data.
