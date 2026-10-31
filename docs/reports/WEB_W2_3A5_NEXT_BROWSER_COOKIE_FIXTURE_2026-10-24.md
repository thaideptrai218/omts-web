# W2.3a5 — Next/browser fixture với cookie giả: HTTP đạt, HTTPS còn mở

Phiên bắt đầu 24/10, cập nhật hoàn tất báo cáo 25/10/2026 (Asia/Saigon); giữ ngày bắt đầu trong filename để bảo toàn liên kết. Nhánh `feature/OMTS-132-web-foundation`. Không bật API/refresh thật hoặc stage/commit/push/merge. **a5 mới hoàn thành phần HTTP loopback; không đóng toàn bộ a5 vì HTTPS Secure/__Host- chưa kiểm chứng.**

## 1. Context và ranh giới

Đã đọc AGENTS/context/plan/WEB-API-07, helper a1–a4, installed Next16.4.3 Route Handlers/cookies và fixture scripts hiện có. Jira OMTS-132 vẫn Done, parent metadata OMTS-121 In Progress; không sửa Jira/SRS hoặc coi ticket Done là BFF tích hợp xong. Không có thay đổi UI sản phẩm/Figma để diễn giải thành nghiệp vụ mới.

Không có HTTPS endpoint/certificate được cấp cho fixture này. Chỉ kiểm inventory phù hợp trong repo, không kết luận máy không có certificate nào khác. Không chạy experimental HTTPS/mkcert, tạo/cài certificate, bypass TLS warning, sửa trust store/browser security flags/hosts hoặc mở cổng LAN. Không gọi backend/mobile/API .NET, chạy Docker/Redis, sửa DB hoặc env local.

## 2. a5.1 — Fixture riêng, không route demo trong sản phẩm

Project Next riêng ở `tests/fixtures/cookie-browser`, dùng helper server a1–a4 thực và dữ liệu **giả**: SID public bytes cố định, clock giả, expiry/counter trong bộ nhớ của fixture. Không access/refresh token, account, role, thông tin cá nhân hay backend session. Đây không phải login/logout/DAL/store runtime; không mở API adapter của OMTS.

Các route fixture: `/check/[action]` với probe/issue/clear/expire, `/outside` kiểm cookie trên nhánh path khác, `/foreign` tạo native form từ hostname localhost tới127.0.0.1. Trang root chỉ có nút chạy/cleanup và các assertions; nó nằm ngoài src/app và không phải thiết kế screen chính thức. Manifest product được kiểm tra không có các route fixture; build sản phẩm vẫn13 static outputs như trước.

Factory đòi opt-in `OMTS_COOKIE_FIXTURE_ENABLED=isolated-test-only`, explicit origin HTTP127.0.0.1 với port hợp lệ và run identifier. Runner bind127.0.0.1, port tự cấp; readiness phải đúng identifier của child vừa tạo. Không lấy port3000/8082 hoặc dừng process có sẵn theo tên/port. Next build/start là production build nhưng helper nhận **test-only HTTP-loopback profile** tường minh trong fixture; không phải cách hạ Secure cho production app.

Cookie không cách ly theo port, nên trước issue/clear/expire fixture kiểm raw Cookie: SID khác fixture, sai định dạng hoặc duplicate đều409, không Set-Cookie và không mutation. Browser suite còn đòi ban đầu không có SID; nếu có thì dừng. Không đổi tên/flags của helper chỉ để dễ test. Không đặt Domain, không chạm tên HTTPS profile. Đây là bảo vệ test khỏi đè cookie bình thường, không giải quyết race của ứng dụng khác cùng host đang login đồng thời; không chạy fixture khi có hoạt động auth cạnh tranh ở cùng hostname.

## 3. a5.2 — Route composition và HTTP runner

Route mutation dùng C2A trước khi ghi state giả; issue nhận JSON, clear bodyless, expire chỉ dời fake clock. Missing/wrong Origin/marker/metadata/media/body bị từ chối mà không Set-Cookie. Probe chỉ trả trạng thái/counter/run id, không SID/hash/headers/input/cause. Response dữ liệu/clear/error dùng no-store; fixture không mở CORS wildcard hoặc cho origin ngoài.

`scripts/test-cookie-fixture.mjs` build/start fixture với child được sở hữu, kiểm readiness và gọi `cookie-fixture-checks.mjs`. Chế độ mặc định chạy Webpack rồi Turbopack, cleanup child mỗi lượt. `--serve` giữ child cho browser sau smoke; nó cũng theo dõi child exit khi đang chờ và cleanup đúng child, không quét/kill process khác. Port bind có khoảng release/start nhỏ; nếu collision/readiness sai thì fail, không chiếm hoặc dừng dịch vụ khác.

Hai lệnh mới:

```sh
npm run test:cookies
npm run test:cookies:serve
```

Lệnh đầu kiểm **HTTP wire**, không phải browser cookie jar: Node gửi Cookie thủ công cho fixture.24 assertions mỗi compiler gồm exact issue/clear flags, no Domain/persistence trên issue, no-store, JSON không chứa SID, method/Allow/no CORS, independent path, CSRF/media/body rejection, duplicate/foreign-cookie refusal, fake expiry và không có mutation khi reject. Lệnh thứ hai in URL loopback tự cấp để mở browser. Hai lệnh opt-in/local, chưa thêm vào CI; không báo GitHub CI PASS từ chúng.

## 4. a5.3 — Browser thật: 15 checks PASS

Browser in-app mở tab kiểm thử ẩn/background, không đổi tab localhost3000 của người dùng. Dùng nút UI của fixture, không giả Origin/Sec-Fetch-Site bằng evaluate hoặc đổi cookie trực tiếp qua automation.15 checks kiểm:

- Preflight không có SID, cùng-origin JSON qua guard.
- Set-Cookie không đọc được qua response.headers trong JavaScript.
- Browser lưu và gửi lại SID giả, trong khi document.cookie không thấy nó: kết hợp hai quan sát để chứng minh HttpOnly thay vì chỉ thấy “không có cookie”.
- Cookie được gửi tới /outside, ngoài nhánh route cấp, và response mutation có no-store.
- Clear thiếu marker bị403; JSON giả dưới text/plain bị415.
- Native form thực từ localhost khác origin sang127.0.0.1 bị từ chối, không mutation/clear. Browser check xác nhận rejection và state/cookie không đổi; HTTP code403 và missing marker/Origin được kiểm độc lập trong wire/unit tests, không đoán status từ iframe text.
- Fake clock tới boundary cho expiry=expired nhưng cookie vẫn còn: không lẫn hạn server với xóa browser cookie.
- Clear đúng scope được browser áp dụng; request sau đó trên cả hai path không còn SID.

Đã chạy PASS, reload và chạy lại PASS để kiểm không để SID giả lại; sau sửa self-review còn build/start bản cuối và chạy lại15 checks PASS. Không cộng số lượt lặp thành thêm unit tests. Screenshot bằng chứng lưu local/ignored trong bài79. Không kiểm browser close/session restore hoặc toàn bộ SameSite policy bằng những case này.

## 5. Lỗi thực tế và tự review

### HTTP405 thiếu Allow trong fixture

Review phát hiện helper rejection đã được fixture chuyển thành response405 nhưng chưa thêm Allow. Thêm regression rồi chạy `npm test -- src/server/auth/session-cookie-fixture.test.ts`:14 PASS/1 FAIL, `expected null to be 'POST'`. Đây là lỗi HTTP response của fixture, không phải C2A cho request sai đi qua.

Sửa response builder của mutation để405 có `Allow: POST`; không thêm Allow vào CORS allowlist hoặc cho OPTIONS chạy nghiệp vụ. Rerun15/15 PASS, wire assertions kiểm cả Allow và no Set-Cookie dưới hai compilers. Bổ sung real HTTP413 với clear có body và issue vượt1024-byte fixture budget; state giữ nguyên. Không đổi helper sản phẩm/gate hoặc backend.

### Screenshot full-page không chụp được

API browser `screenshot({fullPage:true})` trả “Unable to capture screenshot” sau khi suite đã PASS. Đã đọc troubleshooting và dùng API quan sát được hỗ trợ getScreenshot; viewport chụp đủ15 dòng PASS/DONE, lưu được PNG và chạy lại browser sau bản cuối. Chưa xác định nguyên nhân nội bộ của full-page API, không gán cho lỗi CSS/fixture hoặc tuyên bố browser không hỗ trợ screenshot. Không chuyển sang CDP/Windows helper khác, bật browser protection bypass hoặc đổi certificate.

### Một lượt build traces thất bại khi kiểm tra cuối

Lượt rerun `npm run test:cookies` cuối ban đầu trả exit1: Webpack đã compile/typecheck/generate static pages, output dừng ở Collecting build traces rồi runner báo build failed. Runner đang có deadline60 giây, nhưng lượt cũ chưa in status/signal/error.code nên **không đủ bằng chứng kết luận mã ETIMEDOUT hoặc nguyên nhân nội bộ**. Không gọi đây là bug cookie hay coi rerun là đã sửa root cause.

Đã kiểm process/diagnostics read-only, không kill process không thuộc runner. Bổ sung thông báo thất bại có exit/signal/error.code (không input/credentials), giữ nguyên deadline/compiler/security policy. Rerun sau đó đủ24 assertions dưới cả Webpack/Turbopack PASS. Hiện chưa tái hiện để xác định root cause; ghi nhận build-trace flake/môi trường cần theo dõi, không xóa cache/node_modules hoặc nới test để che lỗi. Explicit fixture lint hoàn tất exit0; không gán thời gian chờ tool thành lỗi lint.

### Dừng server kiểm thử (kết quả)

Hai phiên serve được dừng bằng Ctrl+C; shell PTY báo exit1 do interrupt. Không tính đó là test assertion failure hay claimed graceful exit0. Kiểm tra read-only xác nhận hai port browser đã dùng64429/63888 không còn listener. Tab agent-created đã đóng; suite tự clear SID trước cleanup. Không xóa dữ liệu máy/repo, không dừng dịch vụ của người dùng.

## 6. Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| npm test |109 files/1234 PASS;3 files/27 Redis SKIP;112 files/1261 tổng |
| Cases tăng so a4 |15 fixture unit cases;1219 →1234 PASS |
| npm run test:cookies |2 positive Next builds + real HTTP24 assertions/compiler PASS;48 wire assertions, không gọi là48 browser cases |
| Browser HTTP |15 checks PASS; rerun sau reload và bản review cuối PASS, cleanup cookie/tab/server |
| npm run lint / typecheck / build |PASS; product vẫn13 static outputs |
| Explicit ESLint fixture server/app/config |PASS; fixture code nằm ngoài phạm vi lint src/scripts mặc định |
| npm run test:boundary |6 negative builds PASS/11 modules/2 compilers |
| npm audit --json |0 vulnerabilities;không thêm dependency |
| HTTPS Secure/__Host- |**Chưa kiểm chứng**, không có endpoint HTTPS được cấp cho fixture |
| Docs/scope/Git |23 files không trailing whitespace;102 relative links hợp lệ; learning79/PNG và generated outputs ignored; staged diff rỗng; branch/HEAD4555c32 không đổi; app composition không import fixture |

Không chạy lại test:serialization cũ, live Redis, API .NET/QA, full session/gate/authorization/cache/race integration hoặc GitHub CI.27 Redis SKIP không là live PASS. Header đúng không chứng minh browser Secure enforcement; HTTP loopback có ngoại lệ riêng nên cũng không dùng để suy TLS/SameSite production đúng.

## 7. Trạng thái và phần còn mở

Đã hoàn thành fixture safety, Next wire và HTTP browser subset. Plan ghi a5 **partial**, tách checkbox HTTP đã đạt với HTTPS còn mở; chưa đóng a5/a6/W2.3 hoặc W2.2e-e5/W2.4/W3/W4. Muốn kiểm HTTPS cần môi trường/endpoint/certificate được cấp và tin cậy đúng, không tự cài/trust/bypass warning để làm test xanh.

Không phát sinh quyết định nghiệp vụ mới hoặc sửa C1A/C2A/C3A. No-store/synthetic clock/counter là test harness, không chốt UX missing/expired/MSG19 hoặc session backend. Chưa chứng minh stale logout/login race, Redis durability, refresh, protected SSR/prefetch/back/cache, production deployment or browser family compatibility.

Report/plan/context/decision/README cập nhật; bài79 và screenshot local/ignored giải thích quy trình/bằng chứng/lỗi từ gốc. Giữ changes trên nhánh hiện tại, chưa stage/commit/push/merge.

Tham khảo giao thức: [HTTPWG Cookie draft](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html), tài liệu đang phát triển về HttpOnly/prefix/scope/port; policy C1A/C2A/C3A và kết quả cụ thể lấy từ quyết định/source/test OMTS, không coi draft là chứng nhận browser hoặc production.
