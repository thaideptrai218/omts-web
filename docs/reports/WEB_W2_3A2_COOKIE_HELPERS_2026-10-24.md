# W2.3a2 — Cookie helpers độc lập

Ngày 24/10/2026. Nhánh `feature/OMTS-132-web-foundation`. Chỉ thực hiện a2 theo C1A đã duyệt; không bật API/refresh, không commit/push/merge.

## 1. Context và ranh giới

Đã đọc AGENTS/context, plan/WEB-API-07, report a1, SID/config/token-custody helpers, installed Next16.4.3 cookies/NextResponse docs và parser đi kèm. Jira OMTS-132 vẫn Done; metadata parent OMTS-121 In Progress. Đây không phải bằng chứng tích hợp BFF đã xong; không sửa Jira. Đối chiếu NFR-01 tại Report3Finnal.md: cookie helper không thay chính sách session/revoke/HTTPS. Không làm màn hình nên không có thay đổi Figma/UI cần đối chiếu.

Hai module mới nằm trong `src/server/auth/`: `session-cookie-reader.ts` và `session-cookies.ts`. Không module nào được nối vào app/components/features. Không đọc/sửa env local, backend/mobile/DB, không chạy Docker/Redis hay gọi API .NET. `.env.example` vẫn chỉ bật mock. Không thêm dependency, route hay endpoint.

## 2. a2.1 — Đọc header gốc trước khi mất thông tin

`readSessionCookie(header, name)` nhận **raw Cookie header**, không nhận kết quả cookies().get()/NextRequest.cookies. Parser hiện có của Next dùng Map và ghi đè khóa trùng; test với NextRequest thật chứng minh hai cookie cùng tên chỉ còn một phần tử trong parsed map. Do đó getAll() sau bước đó cũng không khôi phục được bằng chứng trùng tên.

Reader kiểm cả header: ASCII, không CR/LF/control, tên token hợp lệ, giá trị theo cookie-octet hoặc dạng quoted hợp lệ cho cookie khác. Chấp nhận OWS space/tab quanh pair, empty value của cookie khác và dấu `=` trong value; không coi dấu phẩy là cookie separator. Header sai cú pháp ở bất kỳ pair nào bị từ chối, kể cả pair không phải SID. Đây là fail-closed parser, chưa phải quyết định logout/xóa cookie. Ngân sách 16 KiB chỉ giới hạn input parser; không đổi account validation hoặc lifetime, không thay giới hạn HTTP của reverse proxy/Next.

Tên SID phân biệt hoa/thường và phải khớp profile. Không fallback HTTPS sang tên dev hoặc ngược lại. Hai pair trùng **tên SID đang dùng**, kể cả value giống nhau/rỗng, đều invalid. Cookie khác trùng tên vẫn được bỏ qua vì không dùng để xác thực. Không decode percent, unquote hay normalize SID: gọi lại `hashSessionId` đã có để yêu cầu đúng 32 byte/43 ký tự base64url canonical.

Output frozen gồm `missing`, `invalid-cookie`, hoặc `found` với **idHash**, không SID/header thô. `found` chỉ có nghĩa đủ cú pháp để tra store: chưa chứng minh phiên tồn tại, còn hạn, đúng account/permission hay request dùng HTTPS. Incoming Cookie không mang Path/Domain/Secure; enforcement trình duyệt và transport phải kiểm riêng. Không chọn MSG19, truy cập Redis, tự clear hoặc redirect khi đọc lỗi.

## 3. a2.2 — Chuẩn bị Set-Cookie và clear đúng scope

`createSessionCookieHelpers(environment)` gọi config parser a1 bằng environment tường minh, giữ snapshot đã kiểm tra. Không tự đọc process.env, Host/forwarded headers, backend URL hoặc chọn profile. Invalid config chỉ trả mã/tên field đã biết, không có helpers hoặc raw error. Không nhận một object cookie-options tùy ý để caller hạ flags.

Factory hợp lệ trả `cookies.issue(sid)`, `cookies.read(rawHeader)` và `cookies.clear()`. Issue chỉ nhận SID đã chuẩn hóa; không mint SID hoặc tạo phiên. Serializer cố ý chỉ hỗ trợ alphabet SID cố định và attrs literal C1A, không phải serializer cookie tổng quát:

| Profile | Tên | Thuộc tính khi cấp |
| --- | --- | --- |
| HTTPS | __Host-omts_web_sid | Path=/; HttpOnly; Secure; SameSite=Lax |
| HTTP loopback dev/test | omts_web_sid_dev | Path=/; HttpOnly; SameSite=Lax |

Issue không Domain/Expires/Max-Age. Clear dùng chính tên/Path/flags của profile, empty value, thêm `Max-Age=0` và epoch Expires. Đây là lệnh hết hạn cookie, không tự biến session cookie cấp mới thành persistent cookie và không revoke Redis/backend. Không tự xóa cookie profile kia hoặc cố xử lý cookie lịch sử khác path/domain chưa được chứng minh.

Chỉ chuẩn bị header; **không** gọi cookies().set/delete hoặc gắn vào response sản phẩm. Khi tích hợp, caller chỉ phát cookie sau khi store/gate hợp lệ và phải phối hợp revoke, CSRF, generation/race. Không comma-join nhiều Set-Cookie hoặc đưa raw response/request headers qua upstream. Cookie không phân vùng theo port; HTTP dev không đủ nghiệm thu HTTPS production.

## 4. a2.3 — Chống vô tình tiết lộ

Issue hợp lệ trả wrapper private-field `PreparedSessionCookie`, không plain DTO. String coercion/inspect thường và showHidden trả REDACTED; JSON, kể cả nested, ném lỗi cố định `SESSION_COOKIE_NOT_SERIALIZABLE`. Freeze wrapper/results/helpers; throwing config getter và SID object không được echo/coerce vào header.

`readForResponseHeader()` là escape hatch tường minh để server lấy chuỗi Set-Cookie. Chuỗi lấy ra vẫn chứa SID, không được log/JSON/RSC hoặc gửi upstream. Wrapper không mã hóa SID, không chống caller cố tình lấy plaintext và không tự kiểm soát logger. idHash là dữ liệu nội bộ, không cần đưa ra browser. JSON/inspection đã test; chưa chạy Next RSC serialization fixture riêng cho wrapper mới, không tuyên bố đã có browser/RSC E2E.

## 5. a2.4 — Test và lỗi thực tế

48 reader cases +34 helper cases: profiles/flags, roundtrip fake canonical bytes gồm base64url `-`/`_`, missing/malformed, duplicates cùng/khác value/rỗng, input type/size/control/Unicode, exact names/no fallback, redaction/freeze, config snapshot/override, no network/response mutation. NextRequest test chứng minh mất duplicate trong parsed map; Headers nhiều field cũng bị reader từ chối. NextResponse test chỉ dựng object trong RAM và kiểm header/parsed metadata, không chạy handler/network/browser.

Thêm2 source marker cases và hai imports vào fixture web-config-boundary. Runner kiểm đúng8 modules qua hai nhóm5+3, dưới cả Webpack/Turbopack; vẫn4 negative builds. Không nới assertion thành “bất kỳ lỗi build nào cũng đạt”.

### Hai test clear ban đầu FAIL

Lệnh `npm test -- src/server/auth/session-cookies.test.ts src/server/auth/session-cookie-reader.test.ts` cho75 PASS/2 FAIL. Assertion mong parsed object có `value: ""` và `maxAge: 0`, nhưng actual thiếu hai field ấy. Kiểm header gốc thấy vẫn đúng; đọc `node_modules/next/dist/compiled/@edge-runtime/cookies/index.js`, hàm compact chỉ giữ field truthy nên bỏ empty string/0.

Nguyên nhân là dùng parsed view mất thông tin làm bằng chứng duy nhất cho wire header, không phải serializer làm mất lệnh clear. Đã chuyển assertion deletion sang exact raw header/getSetCookie, vẫn kiểm parsed name/path/HttpOnly/SameSite/Secure/epoch expiry. Rerun tập trung101/101 PASS trước khi bổ sung5 case self-review; không sửa Next/node_modules để làm test xanh. Helper sau này không được dựa vào parsed maxAge tồn tại để xác nhận logout.

### Typecheck bắt hai lỗi test mà Vitest không bắt

`npm run typecheck` ban đầu exit1 với TS2339: `.getTime` không có trên `number | Date`, và `.OMTS_WEB_ORIGIN` không có trên `{}`. Vitest transform/chạy JavaScript không thay thế TypeScript kiểm kiểu. Kiểu expires của Next rộng hơn nhánh runtime Date; bảng invalid fixtures có `{}` nên không thể mặc định mọi phần tử có origin.

Đã kiểm `instanceof Date` trước getTime, đồng thời giữ assertion Date/epoch; khai báo callback input `Record<string, unknown>` đúng boundary của factory. Không ép any/tắt TS/lược test. Typecheck và build sau sửa PASS; full test cuối1009 PASS/27 SKIP.

## 6. Kết quả kiểm chứng

| Lệnh | Kết quả |
| --- | --- |
| npm test |103 files/1009 PASS;3 files/27 Redis SKIP;106 files/1036 tổng |
| Cases tăng so a1 |82 cookie cases +2 marker =84;925 →1009 PASS |
| npm run lint |PASS, max-warnings=0 |
| npm run typecheck |PASS sau sửa lỗi test |
| npm run build |PASS;13 static outputs, không thêm route/handler |
| npm run test:boundary |4 negative builds PASS,8 modules/2 compilers |
| npm audit --json |0 vulnerabilities, không đổi dependency |
| Docs/scope/Git |14 files kiểm whitespace đạt;87 relative links hợp lệ; diff --check PASS; staged diff rỗng; lesson76/learning index ignored; không có helper imports mới trong app/components/features; env example chỉ active mock; HEAD vẫn4555c32 |

27 Redis SKIP không phải live PASS; không cấp endpoint/chạy Redis trong lượt này. Không chạy lại test:serialization cũ, API QA/local, HTTPS browser/certificate fixture hoặc GitHub CI. Kết quả lịch sử không tính là kiểm chứng mới.

## 7. Tự review và bước tiếp

Đã rà input → config snapshot → canonical SID → raw parser → header literal → disclosure guard → Next in-memory response và marker/compiler boundary. Hai vấn đề phát hiện nằm trong test assumptions/types, đã sửa; không phát hiện lỗi logic còn mở trong phạm vi helper sau review, không coi đó là bằng chứng không còn bug toàn hệ thống. Không phát sinh xung đột nghiệp vụ cần tự chốt.

Chưa giải quyết race response logout cũ xóa cookie login mới; reader không tự clear để tránh bổ sung side effect đó. Không coi clearing là revoke, missing/invalid là known expiry hoặc session cookie là bảo đảm browser close logout. a3 CSRF, a4 expiry, a5 browser fixture, a6 composition review, W2.4 DAL và W3/W4 race vẫn mở; MSG06/refresh agreement vẫn chờ backend.

Tiếp theo a3 theo C2A đã chốt, vẫn cần implementation/test riêng trước upstream. Report/plan/context/decision/README được cập nhật; kiến thức/Defense và lỗi chi tiết lưu lesson76 local/ignored. Chưa stage/commit/push/merge hoặc sửa SRS/Jira/backend/mobile.

Nguồn giao thức: [RFC6265 §§4.1–4.2](https://httpwg.org/specs/rfc6265.html). Cú pháp/duplicate/scope theo RFC; profile C1A và fail-closed/budget là quyết định triển khai đã nêu, không gán chúng thành mặc định bắt buộc của RFC.
