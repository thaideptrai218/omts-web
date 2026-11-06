# W2.3a3 — CSRF guard độc lập theo C2A

Ngày 24/10/2026, nhánh `feature/OMTS-132-web-foundation`. Chỉ làm a3: chưa nối handler, bật API/refresh, stage/commit/push/merge.

## 1. Context và nguồn đã đối chiếu

Đã đọc AGENTS/context, plan/WEB-API-07 và proposal C2A, config/cookie helpers a1–a2, transport/catalog/body budgets hiện có, Next16.4.3 installed Route Handlers/Request reference và data-security/DAL guidance. Jira OMTS-132 vẫn Done; parent metadata OMTS-121 In Progress. Trạng thái ticket không chứng minh lát BFF mới đã tích hợp; không chỉnh tracking. Đối chiếu NFR-01 Report3Finnal.md: guard CSRF không thay authentication, authorization, revoke hoặc HTTPS. Không thay UI nên không cần diễn giải wireframe thành nghiệp vụ mới.

Không fetch/chạy backend, không sửa backend/mobile/SRS/Jira/env local/DB/Docker/Redis. App vẫn mock, không thêm product route/handler hoặc import guard vào app/components/features. Không đổi dependency/production config, certificate hay trust store.

## 2. a3.1 — Explicit factory và policy của server

`src/server/auth/csrf-guard.ts` cung cấp `createCsrfGuard(environment)`, dùng config parser a1 để giữ canonical Web origin. Không đọc ambient process.env, không suy origin từ Host/Referer/forwarded header, API base URL hay request URL. Config sai không trả guard; getter lỗi được redacted theo a1.

Guard nhận **Request + policy do server/route sở hữu**, không lấy policy từ body/query client. Policy strict union: method POST/PUT/PATCH/DELETE, body json hoặc none, deadline1–60000 ms; nhánh json yêu cầu maxBytes1–65536. Không nhận option tùy ý như allowedOrigin hoặc bypass. Invalid policy trả invalid-policy, không phải lỗi quyền của người dùng; handler tương lai phải xử lý như lỗi cấu hình, không tiếp tục nghiệp vụ.

Policy được parse thành snapshot trước await, để thay object gốc không nới giới hạn lúc đang đọc body. Giới hạn byte/deadline là tài nguyên kỹ thuật, không validation trường nghiệp vụ/lifetime. Fixture chọn64 KiB/5 giây cho JSON và bodyless logout/5 giây; tương thích upper bound request transport hiện có. Chưa tạo catalog route BFF hoặc chốt maxBytes/deadline runtime cho từng handler chưa tồn tại. Upload/form tương lai cần policy được review riêng, không ép vào JSON guard hiện tại.

## 3. a3.2 — Kiểm header trước body/upstream

Thứ tự: validate server policy → Request/method → exact Origin + custom header → supplementary Sec-Fetch-Site → body stage. Method khác policy, kể cả GET/HEAD/OPTIONS, bị từ chối; không tự cho safe methods đi tới mutation. Đây không phải guard chung cho GET hay Server Actions. OPTIONS/Allow/CORS response khi có route thật phải do layer HTTP quản lý, không gọi nghiệp vụ từ OPTIONS.

Origin request phải bằng **chuỗi serialized origin** đã canonicalize trong config: scheme/hostname/port. Browser gửi origin dạng chuẩn; request có slash/path/userinfo/query/fragment, explicit default port/uppercase khác canonical, danh sách hoặc subdomain gần giống đều không được normalize để cứu. Config có uppercase/default port/root slash được parser chuẩn hóa trước; không nhầm việc canonicalize cấu hình tin cậy với nới request header. Headers API có thể trim OWS ở ngoài trước khi helper nhận; guard chỉ thấy giá trị Request cung cấp, không raw HTTP bytes.

Custom header cố định `X-OMTS-Request: web` bắt buộc ngay cả login chưa có cookie. Tên header không phân biệt hoa/thường; value phải đúng web. Đây không phải secret hoặc synchronizer token. Sec-Fetch-Site nếu có phải đúng same-origin; thiếu metadata vẫn phải có Origin/header, không bỏ qua hai lớp chính. same-site/cross-site/none/unknown/list đều bị chặn. Không fallback Referer hoặc tin metadata để thay Origin.

Không đọc SID/session/gate/quyền, không ghi store hoặc clear cookie, không chọn MSG19 hay MSG13. Request có cookie hoặc marker đúng nhưng Origin sai vẫn bị chặn. Guard không thêm Access-Control-Allow-Origin; tích hợp BFF phải giữ CORS đóng. Client ngoài browser có thể tự giả header nên CSRF không thay backend authentication/authorization; XSS/client-side CSRF cũng không được giải quyết chỉ bằng guard này.

## 4. a3.3 — Media type, body budget và lifecycle

`csrf-mutation-body.ts` là stage nội bộ, **không thay thế guard đầu vào**. Chỉ guard public gọi sau khi policy/header đạt. JSON policy nhận application/json, tùy chọn charset=utf-8 (case-insensitive, quoted/unquoted); từ chối text/plain, urlencoded, multipart, vendor/+json và params khác. Chỉ nhận không Content-Encoding hoặc identity; không tự giải nén payload rồi đoán nội dung.

Content-Length nếu có phải là một số nguyên không âm dạng digits, tối đa20 ký tự; số quá lớn bị so bằng BigInt trước khi đọc. Không tin length là đủ: đếm byte thực tế từng chunk, chặn overflow ngay, kiểm declared/actual bằng nhau nếu có khai báo. UTF-8 multibyte tính theo byte, không string.length. Actual stream sai kiểu bị từ chối. Sau khi đọc xong, fatal UTF-8 decode và JSON.parse; malformed/empty JSON không echo exception có thể chứa credential.

Nhánh none có byte budget0, không đòi Content-Type application/json hoặc `{}`. Nếu có stream thì vẫn đọc để chứng minh nó rỗng; Content-Length0 giả không được bypass. Any nonempty body bị413. Có Content-Type nhưng body rỗng vẫn không được diễn giải thành JSON ở nhánh này.

Deadline tính cho cả lượt đọc, không reset mỗi chunk. Abort trước/trong read, body consumed/locked, read lỗi đều bị từ chối. finally gỡ timer/listener, cancel/release reader; không await cancel vì underlying stream có thể không hoàn tất cancellation. Test fake timers kiểm deadline, partial chunks, abort, cleanup và cancel treo. Guard không tự retry hoặc tạo session.

Input stream đã được consume khi guard cho phép; handler không được gọi request.json() lần nữa. Success giữ parsed JSON/undefined trong private-field `GuardedMutationBody`; JSON serialization ném mã cố định, inspect/string thường REDACTED. Handler tương lai lấy qua readForValidation(), rồi phải validate wire/domain schema trước sử dụng. Escape hatch trả dữ liệu nhạy cảm nên không log/JSON/RSC/upstream tùy ý. Guard cho JSON null/array/primitive đi qua về cú pháp, không có nghĩa domain chấp nhận chúng. Chưa kiểm RSC fixture riêng cho wrapper mới.

## 5. Kết quả lỗi nội bộ, chưa phải UI contract

| Kết quả | Ý nghĩa |
| --- | --- |
| invalid-config / invalid-policy | Server composition/config sai; không có quyền tiếp tục |
| rejected403 | Origin/header/metadata không qua C2A |
| rejected405 | Không đúng method policy; không tự thực hiện mutation GET/OPTIONS |
| rejected415 | Media type hoặc encoding không được hỗ trợ |
| rejected413 | Declared/actual body vượt budget, kể cả logout có body |
| rejected400 | JSON/UTF-8/length/read/abort/input state không hợp lệ |
| rejected408 | Hết hạn chờ body |
| allowed + guarded body | Chỉ qua gate CSRF/body; chưa kiểm session/gate/quyền/domain |

Không có raw origin/headers/cookie/body/Error/cause trong rejected result. Chưa phát HTTP response/microcopy thật; handler tương lai cần mapping đồng nhất, no-store/Allow/CORS và kiểm capability. Không lấy403 này làm “không có quyền vùng”, hoặc408 làm token hết hạn.

## 6. a3.4 — Test, lỗi thực tế và sửa

122 case CSRF mới:58 header/config/policy,45 media/body,19 lifecycle/test-only composition. Thêm2 marker cases; boundary fixture hiện nhóm5+5, đủ10 modules dưới Webpack/Turbopack, vẫn4 negative builds. Fixtures nằm ngoài src/app; không thêm route showcase hoặc auth endpoint sản phẩm.

Test-only composition dùng fake callbacks cho upstream/session-write và fake paths/policies đại diện login/logout/profile/gated password/contact. Header/media/body/metadata rejection không chạy callback; valid input chỉ chạy một lần. Đây là bằng chứng về cách compose guard trong test, **không** chứng minh route/gate thật đã tồn tại, được bảo vệ hoặc có session/revoke semantics. Không có network .NET trong các test.

### Spy trên bodyless logout

Lệnh test3 file CSRF ban đầu cho113 PASS/1 FAIL. Lỗi `undefined is not a spy or a call to a spy!` xảy ra ở logout: không body nên không có stream/getReader spy. Không phải guard cho request sai đi qua. Đã chỉ assert spy khi stream tồn tại và vẫn kiểm bodyUsed=false cho mọi header rejection; các callback upstream/write phải giữ0. Rerun đạt; thêm regression Content-Length0 giả và non-byte chunks khi review.

### TypeScript bắt lỗi fixture

`npm run typecheck` ban đầu exit1: TS2345 cho heterogeneous header fixtures có optional undefined không phù hợp Record<string,string>; union policy bị khai báo rộng khiến spread maxBytes có thể rơi vào nhánh none; TS2352 cho getter chỉ throw suy kiểu void khi cố cast sang policy.

Sửa fixture arrays bằng RequestInit[]/Headers thật; dùng satisfies CsrfMutationPolicy để kiểm contract mà giữ discriminator json/none cụ thể; throwing getter có annotation method đúng và đầy đủ fields. Không thêm any, tắt typecheck hoặc nới schema sản phẩm. Typecheck sau sửa PASS. Vitest transform không thay tsc, nên test xanh chưa đủ kết luận build đúng.

### Lỗi thao tác công cụ, không phải logic ứng dụng

Đọc nhầm vitest.config.ts báo không tồn tại; dùng rg --files tìm đúng vitest.config.mts và đọc config thực. Hai patch bị tool từ chối: lặp hai Update cho cùng file trong một patch, rồi hunk theo thứ tự ngược vị trí file. Đã đọc lại file xác nhận chưa đổi, gộp một Update/file và xếp hunk từ trên xuống; patch sau áp dụng thành công. Không sửa file qua shell hoặc bỏ test để tránh lỗi.

## 7. Kiểm chứng và tự review

| Lệnh | Kết quả |
| --- | --- |
| npm test |106 files/1133 PASS;3 files/27 Redis SKIP;109 files/1160 tổng |
| Tăng so a2 |122 CSRF +2 marker =124;1009 →1133 PASS |
| npm run lint / typecheck / build |PASS; product vẫn13 static outputs, không thêm route |
| npm run test:boundary |4 negative builds PASS,10 modules/2 compilers, nhóm5+5 |
| npm audit --json |0 vulnerabilities, không thêm dependency |
| Docs/scope/Git |16 files không trailing whitespace;92 relative links hợp lệ; diff --check PASS; staged diff rỗng; learning77/index ignored; không guard imports trong app/components/features; env example chỉ active mock; branch/HEAD4555c32 không đổi |

Đã tự rà config snapshot → policy → method/origin/header/site → budget/decoder/deadline → cleanup → redacted result. Các lỗi phát hiện ở test/typing đã sửa; không phát hiện lỗi logic còn mở trong phạm vi guard sau review, không tuyên bố hệ thống hết bug. Không phát sinh xung đột nghiệp vụ cần chốt mới. C2A không bị đổi thành C2B/token-store, không sửa cookie/lifetime/gate.

Giới hạn: chưa real handler/upstream/store composition; chưa browser preflight/CORS/Origin compatibility, proxy/body-size deployment, HTTPS acceptance hoặc wrapper RSC E2E. Guard giới hạn dữ liệu nó đọc, không thay ingress limits/rate-limit/DoS protection. Chưa chạy lại test:serialization lịch sử;27 Redis SKIP không là live PASS; không GitHub CI hoặc backend fetch/smoke mới.

Tiếp theo W2.3a4 expiry helper theo C3A, vẫn không bật refresh. a5 browser fixture, a6/full W2.2e-e5 preflight, W2.4 DAL, W3/W4 integration/race/revoke vẫn mở. Báo cáo/plan/context/decision/README được cập nhật; bài77 local/ignored giải thích từ gốc và lỗi cụ thể. Chưa stage/commit/push/merge.

Tham khảo kỹ thuật: [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) cho Origin/custom-header/defense-in-depth; [W3C Fetch Metadata](https://www.w3.org/TR/fetch-metadata/) cho ý nghĩa Sec-Fetch-Site (Working Draft, không mô tả là final standard). C2A và các giới hạn triển khai cụ thể lấy từ quyết định dự án/code/test, không gán mọi lựa chọn thành quy định bắt buộc của nguồn này.
