# W2.3a1 — Server Web-origin và cookie-profile config

Ngày24/10/2026, nhánh `feature/OMTS-132-web-foundation`. Duy Thái đã chốt **C1A + C2A + C3A**, chỉ yêu cầu làm a1 trước. API/refresh thật vẫn tắt; không commit/push/merge.

## 1. Phạm vi đã thực hiện

Đã ghi quyết định tại WEB-API-07, cập nhật plan/context và giữ bản proposal làm lịch sử. Chọn chính sách không đồng nghĩa đã triển khai mọi phần: a1 chỉ có config parser/types/tests. Cookie serialize/parse/clear thuộc a2, CSRF guard a3, expiry helper a4, fixture/cookie browser behavior a5 và review/integration a6 vẫn chưa hoàn thành.

Đọc AGENTS/context, W2.3 plan/decision/proposal, backend-config và tests hiện có, marker/negative-build runner; đọc installed Next16.4.3 cookies/data-security/custom-Webpack docs. Jira OMTS-132 vẫn Done, parent OMTS-121 In Progress; không sửa tracking. NFR-01/defaults backend48ae1e0 được đối chiếu trong proposal trước, không fetch/backend smoke lại ở lượt này.

Không đổi auth composition/mock UI, product route/handler, backend/mobile, env local, DB, Docker/Redis hoặc SRS/Jira. Không đọc secret overrides hoặc chọn provider/production keys. Không cấp/xóa SID/cookie, áp CSRF hay expiry vào request; không bật API/refresh.

## 2. Micro-task a1.1 — Input config tường minh

`src/server/config/web-session-config.ts` nhận environment do server composition tương lai truyền vào, không đọc process.env khi import và không mặc định origin/profile. Các trường bắt buộc:

| Trường | Ý nghĩa |
| --- | --- |
| NODE_ENV | development/test/production; QA chạy production mode, không coi chuỗi qa/staging là NODE_ENV hợp lệ |
| OMTS_WEB_ORIGIN | Origin của Web đang nhận request, không phải upstream backend URL |
| OMTS_WEB_COOKIE_PROFILE | https hoặc http-loopback-dev, phải chọn rõ |

Public aliases NEXT_PUBLIC_OMTS_WEB_ORIGIN/NEXT_PUBLIC_OMTS_WEB_COOKIE_PROFILE bị từ chối nếu có giá trị. Origin Web tự nó không phải secret; lý do là policy phải lấy từ nguồn server tin cậy, không dùng bản public/client như authority hay fallback.

Không suy từ Host/X-Forwarded-Host/X-Forwarded-Proto, PORT, deployment URL hoặc OMTS_API_BASE_URL. Các env khác được bỏ qua để parser dùng được với bag môi trường server; đây không phải preflight toàn bộ env hay policy cache/API hiện hành. Env đặt thêm cookie-domain/secure/max-age không thay được attrs cố định; chúng không phải option được hỗ trợ.

## 3. Micro-task a1.2 — Kiểm tra origin và cặp profile

Kiểm tra theo ba lớp: lexical origin-only → native URL parsing/canonicalization → policy protocol/environment/loopback. Cho phép slash gốc cuối, normalize casing/default port, giữ non-default port. Không nhận path, query/fragment, userinfo kể cả rỗng, percent escapes/backslash/whitespace, danh sách origin bằng dấu phẩy/chấm phẩy, wildcard, port rỗng/0/out-of-range hoặc protocol khác HTTP(S).

HTTPS profile yêu cầu origin HTTPS trong cả development/test/production. Không tự hạ Secure theo NODE_ENV hoặc nâng profile lỗi thành profile khác. HTTP exception yêu cầu đồng thời profile http-loopback-dev, NODE_ENV development/test và authority viết rõ localhost/127.0.0.1/[::1] với port hợp lệ nếu có. Chặn LAN/0.0.0.0, lookalike domain, localhost dấu chấm cuối, integer/short/hex/expanded aliases không nằm trong allowlist; không DNS lookup để đoán origin nào là loopback.

Phân biệt origin-only với endpoint: helper này không nhận URL API path, không tạo target, không gửi request và không phải CSRF Origin-header validator. Kiểm tra request sender thực tế còn a3; không suy parser thành công nghĩa mọi request đã an toàn.

## 4. Micro-task a1.3 — C1A cookie metadata, immutable và redacted

Output là discriminated union theo cookieProfile:

| Profile | Cookie name | Secure | Thuộc tính chung |
| --- | --- | --- | --- |
| https | __Host-omts_web_sid | true | HttpOnly=true, SameSite=lax, Path=/ |
| http-loopback-dev | omts_web_sid_dev | false | HttpOnly=true, SameSite=lax, Path=/ |

Không có Domain/Max-Age/Expires/value hoặc knob tùy chỉnh tên/flags. Vì chưa có value và chưa gọi cookies()/NextResponse, đây chỉ là metadata chuẩn bị cho session-cookie helper, không có Set-Cookie thật. HTTP dev không phải cấu hình HTTPS đạt NFR cho QA/production; cookie không cách ly theo port và browser close không được coi là server logout.

Result/config/cookie được freeze, schema trả snapshot trước khi caller sửa input. Failure chỉ giữ invalid-config và tên field đã biết, không raw Zod issue/input/URL/Error/cause. Throwing getter của input cũng bị chặn, trả field list rỗng khi không có đường dẫn đáng tin. Field list được freeze; unknown secret getter không bị đọc.

Type cookieProfile ràng buộc HTTPS với Secure=true/name __Host-, HTTP dev với Secure=false/name dev, giảm tổ hợp vô nghĩa ở compile time. Runtime vẫn kiểm tra dữ liệu; readonly TypeScript hoặc as const không tự tạo bảo mật khi chạy.

`.env.example` chỉ thêm ví dụ Web origin/profile dạng comment. Active source vẫn mock; không tạo biến cookie runtime hay thay env local. Helpers tiếp theo phải nhận config đã kiểm tra, không đọc request headers để sửa policy.

## 5. Micro-task a1.4 — Test và server-only boundary

75 config cases mới phủ positive profiles, normalization/port, missing/unknown values, production plaintext, unsafe URLs, exact loopback aliases, public aliases, headers/deployment/API-origin không fallback, fixed attrs, snapshot/freeze/redaction, throwing getters và không network. Thêm1 marker case cho runtime module.

Negative Next fixture cũ hiện có5 server imports. Thêm module mới vào cùng một page làm kỳ vọng trace6 vượt giới hạn output Webpack của Next. Đã tách thành hai test projects bên ngoài src/app: server-boundary5 imports và web-config-boundary1 import. Cả hai compilers phải từ chối đúng các module trong từng nhóm; runner không chấp nhận lỗi build ngẫu nhiên.

Fixture config dùng chung, chỉ test fixture tắt Webpack cache để lấy diagnostics mới; product next.config.ts không đổi. Generated .next/next-env/tsconfig của fixture mới được ignore/exclude hẹp. Không tắt marker, lint/typecheck, không đổi resolver test toàn cục, không tạo route showcase trong app.

## 6. Lỗi thực tế, giả thuyết và khắc phục

### Native URL parse được nhưng chưa đúng policy

Ban đầu chỉ có71 config tests PASS. Tự review chạy Node URL với comma/semicolon trong authority, thấy constructor vẫn nhận. Thêm2 regression cases rồi chạy `npm test -- src/server/config/web-session-config.test.ts`: **2 FAIL/71 PASS**, actual status valid trong khi expected invalid-config. Gốc lỗi là đồng nhất khả năng parse URL với cấu hình origin đơn, không phải URL library hỏng.

Đã chặn separators ở lexical layer; rerun73/73 PASS. Review tiếp exact-origin semantics thêm2 wildcard cases: **2 FAIL/73 PASS**, vì native URL cũng chấp nhận dấu sao trong hostname. Chặn wildcard trước URL parsing; kết quả cuối75/75 và full925 PASS. Không thêm wildcard matcher hay cho subdomain tự lọt vào CSRF allowlist để làm test xanh. Không thay backend-origin parser không thuộc a1.

### Negative build có lỗi thật nhưng diagnostic thiếu

`npm run test:boundary` đầu lượt trả exit1 nhưng chỉ có “Failed to compile / webpack errors”, thiếu server-only traces nên runner fail đúng. Thử async spawn thay sync vẫn chỉ nhận171 ký tự summary, không có marker/module; giả thuyết do parent sync không drain output không được chứng minh.

Tắt Webpack cache **trong fixture** thì có lại module traces. Nhưng runner vẫn fail vì chỉ thấy5/6 modules. Đọc `node_modules/next/dist/build/webpack-build/impl.js:312` xác nhận Next cắt result.errors.length về5. Đây là nguyên nhân cụ thể của việc không thể yêu cầu trace6 trong một build.

Giải pháp là nhóm5+1, không sửa node_modules hoặc nới assertion thành “exit1 là PASS”. Runner giữ exact marker/module checks, dùng exitCode sau catch để không ép process.exit làm rơi output. Hai lần chạy lại đủ4 builds PASS; sau lần hardening cuối cũng PASS. Triệu chứng diagnostic summary được tránh bằng fresh fixture cache; chưa kết luận cơ chế nội bộ SWC/cache nào làm mất text trong lượt cũ. Không gọi đây là cookie implementation bug.

Một lệnh rg chẩn đoán dùng thêm path format-webpack-messages cũ không tồn tại; kết quả tìm được impl.js thật đã được mở và kiểm chứng. Không chỉnh package Next hoặc xóa cache/workspace để che lỗi.

## 7. Kết quả và giới hạn nghiệm thu

| Kiểm tra mới | Kết quả |
| --- | --- |
| Config tests |75 PASS |
| Full Vitest |101 files/925 PASS,3 files/27 Redis SKIP;104 files/952 tổng |
| Cases tăng |75 config +1 marker =76; baseline849 →925 |
| npm run test:boundary |4 negative builds PASS:2 fixture groups ×2 compilers, phủ6 modules |
| npm run lint / typecheck / build |PASS; product vẫn13 static outputs, không thêm handler |
| npm audit --json |vulnerabilities {},total0; không thêm dependency |
| Docs/scope/Git |64 relative links hợp lệ;15 files kiểm whitespace đạt; scan258 product files không có config/runtime import mới; .env.example chỉ active OMTS_DATA_SOURCE=mock; diff --check PASS, staged diff rỗng, learning75/fixture outputs ignored |

Không cấp endpoint Redis nên27 SKIP là đúng opt-in; không gọi đó là live Redis PASS. Không chạy lại test:serialization trong a1 vì config mới chưa nối DTO/RSC; kết quả W2.2e cũ không tính thành evidence lượt này. Boundary checks là local, chưa GitHub runner. Không có browser Set-Cookie acceptance/HTTPS fixture/CSRF request/gate/expiry E2E; các cổng ấy chưa tồn tại trong a1.

## 8. Tự review, quyết định và bước kế tiếp

Đã review input → lexical URL → cross-field policy → immutable output; request/proxy headers và unknown cookie knobs không thể hạ flags. C1A/C2A/C3A là quyết định đã được xác nhận, nhưng chỉ phần cấu hình C1A có code. Không phát sinh xung đột nghiệp vụ mới hoặc thêm lifetime/idle/refresh/logout policy.

Tiếp theo **W2.3a2**: serialize/parse/clear cookie helpers với SID đã chuẩn bị, thêm tests duplicates/canonical SID/scope/redaction. Chưa chuyển sang a2 trong lượt này. CSRF a3/expiry a4 và full W2.2e/e5/W2.4/W3–W4 preflight tiếp tục mở; không bật runtime chỉ vì config hợp lệ.

Report/plan/decision/context được cập nhật; bài học75 local/ignored giải thích profile, URL validation, readonly/freeze và lỗi harness. Không stage/commit/push/merge, không thay env local/secret/backend/mobile/DB.
