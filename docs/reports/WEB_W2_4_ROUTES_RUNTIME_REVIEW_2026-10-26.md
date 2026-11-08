# W2.4 — Ghép route server, phục hồi cookie và kiểm chứng Redis

Ngày 26/10/2026 (Asia/Saigon), nhánh `feature/OMTS-132-web-foundation`. Giữ các thay đổi từ những phiên trước; không commit/push/merge. Đợt này hoàn thiện phần route/runtime có thể kiểm chứng của W2.4. **Đăng nhập API thật, form onboarding API, hydration tài khoản thật và logout API vẫn thuộc W3/W4; không báo toàn bộ kế hoạch tích hợp đã hoàn tất.**

## Nguồn đã đối chiếu

Đọc lại AGENTS, PROJECT_CONTEXT, kế hoạch API, quyết định session và mã nguồn hiện tại. Jira đọc mới: OMTS-132 `[WEB] Web foundation (Next.js)` đang Done, parent OMTS-121 đang In Progress; ticket yêu cầu route groups, permission menu/guard và trang mẫu bảo vệ bằng login. Trạng thái Jira không được dùng để kết luận API đã chạy. Không thay ticket/SRS.

Đối chiếu Report3Finnal.md về UC02/UC07/UC08, BR-34 và thời hạn phiên; tài liệu này còn quy định Staff/Trader phone verification. Quyết định frontend email-hoặc-phone đã được ghi trước đó vẫn cần backend/BA alignment. Không tự đổi quy tắc bằng route mới. Tài liệu Next16.4.3 đi kèm package đã đọc cho authentication với Cache Components, cookies, connection và Route Handlers. Không cần đọc lại Figma để thay đổi boundary server.

## Các lát đã triển khai

### Nguồn đọc phiên theo request

`session-gateway.ts` và `session-gateway.instance.ts` tạo một gateway lazy cho mỗi worker. Runtime Redis được chia sẻ qua owner; cookie và DTO của từng request không được cache dùng chung. Request không có cookie không mở Redis; cookie sai bị từ chối trước kết nối. API config sai không fallback mock.

Gateway gọi context DAL rồi kiểm lại phiên/revision trước khi trả DTO. Nếu logout, hết hạn hoặc revision thay đổi trong lúc `/me`/permissions đang chờ, dữ liệu cũ bị bỏ. Resolver cũng kiểm lại expiry sau khi key provider trả về. DAL kiểm thêm backend session ID bên cạnh account và subject type.

### Endpoint đọc và phục hồi phiên

- `GET /api/auth/session`: DTO identity/permissions cho phiên application; 401 cho anonymous/invalid, 403 kèm destination cố định cho onboarding, 503 cho trạng thái chưa xác nhận được. Response private/no-store; không trả token/raw grants/backend session ID.
- `POST /api/auth/session/recover`: áp C2A (Origin, marker, Fetch Metadata và body policy), sau đó đọc lại cookie của request. Chỉ server-confirmed invalid/expired/revoked mới có Set-Cookie xóa đúng scope. Phiên hợp lệ được giữ và trả destination đúng phase; unavailable giữ cookie. Không nhận SID hoặc URL redirect từ query/body.

Hai endpoint trả404 khi cấu hình mock. Chưa có endpoint login/logout/refresh mới. Recovery không thay server revocation và chưa giải quyết stale response xóa cookie của lần login mới ở tab khác; race đó vẫn thuộc W4.

### Route và giao diện

Đã chọn route riêng theo yêu cầu tiếp tục sau đề xuất:

- `/onboarding/password`;
- `/onboarding/contact`;
- `/session/recover` cho cookie không dùng được.

`next-session-access.ts` đọc raw cookie qua headers, dùng React cache trong một request và redirect theo phase server. Không dùng `use cache` cho session/DTO. Khách anonymous về login, invalid cookie qua recovery, người nhập sai URL onboarding được chuyển về phase thật, application không bị đưa trở lại bước trước.

Protected layout đã dùng server boundary trong Suspense. Chọn source và provider cũng đợi `connection()` để không đóng cứng mock UI vào bản prerender. API mode chặn provider/login/recovery/business components đang dùng mock. Các phần API UI chưa ghép hiện trạng thái dịch vụ không khả dụng với retry; không render form giả, không báo lưu/đăng nhập thành công. **Các route onboarding mới chỉ có cổng kiểm phase; chưa có form API hoạt động.** Mock mode giữ nguyên luồng UI hiện có trong login.

Tạo `.env.local` local với duy nhất `OMTS_DATA_SOURCE=mock` vì checkout chưa có file này. File được ignore; không ghi key/token/Redis URL runtime thật. `.env.example` và README đã sửa mô tả phần vừa được wiring.

## Findings đã sửa và bằng chứng

| Mã | Vấn đề | Cách sửa / kiểm chứng |
| --- | --- | --- |
| W24-REV-02 | Runtime owner đã dispose vẫn giữ pending connect cũ, khiến generation mới phải chờ | Bỏ pending reference khi dispose; late completion vẫn đóng bằng generation check. Regression mở được generation mới trước khi connect cũ hoàn tất |
| W24-REV-03 | `any-assigned-zone` chấp nhận permission có danh sách vùng rỗng; requirement getter có thể throw | Từ chối scope rỗng; strict schema và redacted catch. Thêm2 regression cases, bỏ ép kiểu `as never` |
| W24-REV-04 | Expiry có thể qua trong lúc mở khóa hoặc phiên bị revoke trong lúc fetch DTO | Recheck sau giải mã và trước công bố context; test expired key-open, revoked/expired/revision-changed late response |
| W24-REV-05 | `/me` cùng account/subject nhưng khác backend session vẫn được ghép | Kiểm session ID; regression từ chối trước gọi permissions |
| W24-REV-06 | GET session bị prerender thành404 của mock khi build, dù start với API config | Smoke thực tế tái hiện404 thay vì401. Thêm connection() ở đầu GET; build ghi route dynamic,24 HTTP assertions PASS. Đưa smoke vào CI sau build |

Không coi các tests mới là independent security audit. Source marker/compiler/DTO checks giảm nguy cơ dùng sai nhưng server code vẫn có thể chủ động đọc access token; module boundary không thay backend authorization.

## Lỗi thực tế và chẩn đoán

### TypeScript fixture

`npm run typecheck` báo TS2322 ở hai mock của `session-http.test.ts`: `status` bị widen thành string, không phù hợp discriminated union. Sửa bằng literal `as const`, không ép response sản phẩm về kiểu sai. Các unit HTTP/gateway/Next routing và typecheck sau đó PASS. Có một lệnh đọc nhầm `personal-profile-experience.tsx`; inventory cho thấy file thật là `profile-experience.tsx`, đã đọc lại đúng source.

### Next route config

Build đầu báo `Route segment config "runtime" is not compatible with nextConfig.cacheComponents` ở hai route mới. Đây là export vừa thêm trong đợt này. Bỏ explicit runtime export; Node.js vẫn là default. Giữ Cache Components; build sau đạt và GET session chuyển sang dynamic sau khi thêm connection().

### Docker startup

Lệnh `docker info --format '{{.ServerVersion}}'` ban đầu không tìm thấy pipe dockerDesktopLinuxEngine. Sau start Docker hidden, log mới xác nhận engine đã shutdown vì socket dockerInference không thể remove, cùng lỗi đã gặp24/10. Không suy lỗi Redis từ named-pipe error.

Đã xác minh hai directory không phải reparse directory, chỉ chứa dockerInference/userAnalyticsOtlpHttp.sock/engine.sock là các socket0 byte; xác minh PID/path/start-time thuộc lần khởi động vừa tạo. Dừng đúng các PID đó, đổi tên hai directory và tạo directory runtime mới:

```
C:\Users\duyth\AppData\Local\Docker\run.stale-20261026-w24
C:\Users\duyth\AppData\Local\docker-secrets-engine.stale-20261026-w24
```

Các directory cách ly vẫn giữ, có thể đổi lại khi Docker đã dừng. Không reset Docker, đổi context, xóa volume/SQL, cài certificate hoặc sửa trust store. Sau restart Engine trả29.4.3. Đây là phục hồi startup local; nguyên nhân hệ điều hành làm socket lỗi lặp lại vẫn chưa được xác định.

### Full suite và ngân sách worker

Lượt full đầu với Redis thật:125 files/1420 PASS; hook tải ESLint config của9 cases tooling vượt10 giây và thực tế kéo dài82.148 giây; suite fail sau93.85 giây. Trên máy có16 GiB RAM và đang chạy Docker, đây là độ nhạy tài nguyên đã tái diễn từ báo cáo trước, không được ghi là code auth hỏng.

Lượt cùng suite dùng `--maxWorkers=4`:1429/1429 PASS trong12.31 giây. Cấu hình Vitest đã đặt maxWorkers4, giữ nguyên timeout/assertion và chạy lại `npm test` bình thường với cùng Redis:1429/1429 PASS trong11.48 giây. Giới hạn worker cải thiện các lượt kiểm chứng; chưa có profiling đủ để khẳng định nguyên nhân hệ điều hành hoặc bảo đảm không còn timeout ở mọi máy.

## Kiểm chứng mới

- Lint/typecheck/production build: PASS; hai BFF handlers dynamic, các UI route dùng phần render theo request.
- Full `npm test` với Redis7.4.11:126 files/1429 PASS, không skip.
- `npm run test:redis`:4 suites/31 PASS, gồm4 runtime cases mới (3 phases và cross-connection revoke). Không cộng31 thêm lần nữa vào1429.
- `npm run test:session-pages`:24 HTTP assertions PASS trên product build, build mock/start API; kiểm anonymous SSR/direct endpoint, invalid cookie, Redis unavailable và API mock blockade. Script kiểm Location hoặc streamed body, không chỉ status.
- Compiler boundary:12/12 negative builds PASS, cả Webpack và Turbopack chặn24 server modules trong6 nhóm, gồm login service W3.1a mới.
- Hygiene: git diff --check PASS;89 Markdown learning/index files không có relative .md link bị thiếu; .env.local, bài86–87 và generated boundary output đều ignored; staged diff rỗng, HEAD4555c32 không đổi.

Sau khi làm thêm W3.1a, lượt final default suite đạt123 files/1414 PASS,4 files/31 live Redis SKIP (1445 cases tổng) trong12.38 giây. Container Redis đã dọn nên không gọi đây là full live rerun. W2 live baseline1429/1429 và31 integration cases phía trên được ghi trước phần service mới; không cộng các lượt thành số cases khác nhau. Final lint/typecheck/build,24 product HTTP assertions và12 negative builds đều PASS. CI workflow đã thêm test:session-pages nhưng chưa có GitHub runner evidence vì chưa push/PR.

Redis test dùng image có sẵn redis:7.4.11-alpine, container label w24-20261026, port tự cấp chỉ127.0.0.1, /data tmpfs32MiB, memory128MiB, save/AOF tắt trong fixture. Đã inspect và xóa đúng container e0444a99ff60… sau tests; chỉ dữ liệu test trong RAM bị bỏ, có thể sinh lại. Images, SQL/volume và Docker runtime được giữ. Chưa kiểm lại phiên bản Redis6.2 trong lượt này.

## Đánh giá và việc tiếp theo

Phần guard/runtime/read-recovery của W2.4 đã có wiring và bằng chứng local. Parent W2.4 tiếp tục mở cho authenticated SSR/feature DAL, account switching/prefetch/back/browser/logout races và production runtime policy. HTTPS browser acceptance vẫn pending theo quyết định trước; HTTP assertion không chứng minh Secure/__Host- được browser thi hành.

W3.1 tiếp theo là server login tạo SID/mã hóa/expiry/store transaction, sau đó W3 hydration và W4 logout để có vòng đời thật. Staff email-hoặc-phone, Owner forced-password, contact purpose, profile write scope/MSG06 metadata, refresh retry/idempotency và production deploy/key lifecycle vẫn theo decision register. Không tự sửa backend/SRS/Jira, không báo phần chưa tích hợp là xong.
