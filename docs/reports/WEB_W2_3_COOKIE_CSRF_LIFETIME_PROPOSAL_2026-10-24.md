# W2.3 — Đề xuất cookie, CSRF và thời hạn phiên để xác nhận

Ngày24/10/2026. Nhánh `feature/OMTS-132-web-foundation`. Đây là snapshot đề xuất trước xác nhận. **Cập nhật: Duy Thái đã chốt C1A + C2A + C3A và cho làm W2.3a1; xem WEB-API-07 và [report implementation a1](WEB_W2_3A1_WEB_SESSION_CONFIG_2026-10-24.md).** Các đoạn chờ xác nhận/test849 bên dưới là lịch sử lượt đề xuất, không phải trạng thái mới nhất. Không bật API/refresh thật; không sửa SRS/Jira/backend.

## 1. Kết luận đề xuất

Đề xuất cho lát Web BFF hiện tại: **C1A + C2A + C3A**. Đây là ba quyết định độc lập, không phải một cấu hình đã áp dụng.

| Mã cần chốt | Đề xuất | Đánh đổi chính |
| --- | --- | --- |
| C1A | Session cookie HttpOnly, Secure ở HTTPS, SameSite=Lax, host-only, Path=/; chỉ chứa opaque SID | Không mặc định ghi nhớ qua lần mở browser; browser restore vẫn có thể giữ cookie, nên server phải kiểm tra expiry |
| C2A | Với mutation BFF: exact Origin + custom header bắt buộc + media type theo route + Fetch Metadata phòng thủ bổ sung; không mở cross-origin CORS | Phù hợp React fetch/JSON hiện tại, không cần CSRF-token store; native form/cross-origin integration sau này cần review riêng |
| C3A | Khi refresh tắt, phiên BFF không vượt access expiry hoặc refresh expiry đã nhận; hết hạn được xác nhận thì dùng MSG19/yêu cầu đăng nhập lại ở bước tích hợp | Thử nghiệm chỉ dùng được khoảng một access lifetime, mặc định15 phút; không phải hoàn thành mục tiêu refresh7 ngày/max30 ngày của SRS |

Chọn ba phương án này **không cho phép tự bật API hoặc refresh**. Sau xác nhận, làm helper/tests/fixture trước; runtime handlers/DAL/QA theo các cổng trong plan.

## 2. Bằng chứng và ranh giới nguồn

Đã đọc AGENTS/context, plan/decision register, store contract/validation, config backend, tài liệu Next16.4.3 cài trong repo và Jira OMTS-132/parent OMTS-121. Ticket vẫn Done/parent In Progress; không dùng trạng thái đó làm bằng chứng W2.3 đã làm xong.

Đối chiếu `D:/Đồ_án/Report3Finnal.md:1761` và NFR-01 tại5707: access15 phút, refresh Web7 ngày, tối đa30 ngày. Đây là bản Markdown đã được đưa vào nguồn dự án; không chỉnh SRS hoặc tự coi mọi bản DOCX/version khác đã được rà toàn bộ trong lượt này.

Backend local audit checkout sạch tại `48ae1e0`, không fetch/pull/checkout, không gọi API. `JwtOptions.cs` default khớp15 phút/7 ngày/30 ngày. `LoginSession.Rotate` gia hạn refresh sliding nhưng chặn ở absolute expiry. Đây là source/defaults, **không chứng minh runtime config hoặc deploy QA hiện hành**; khi ghép thật phải dùng timestamps response và audit revision/config được phép.

Store Web hiện chỉ yêu cầu expiresAtMs nằm trong refresh expiry; không có policy idle timeout/default duration. Chọn Redis không tự chốt cookie/lifetime. Không thêm idle30 phút hay absolute8 giờ như thể đó là yêu cầu SRS. Nếu muốn quy tắc ấy cho máy dùng chung, cần đề xuất BA/backend và quyết định riêng về việc tính activity; không sửa nguồn chuẩn ở đây.

## 3. C1 — Cookie: lưu gì và giữ ở browser thế nào?

### Phần cấu hình đề xuất chung

Browser chỉ giữ SID CSPRNG32 byte đã chuẩn bị ở W2.1b; Redis giữ bản ghi/token đã mã hóa. SID vẫn là credential nhạy cảm, không log hoặc đưa vào URL/JSON/localStorage. Không dùng JWT backend hay ciphertext token làm cookie.

| Thuộc tính | HTTPS QA/production đề xuất | HTTP loopback development đề xuất |
| --- | --- | --- |
| Tên | `__Host-omts_web_sid` | `omts_web_sid_dev` |
| HttpOnly | true | true |
| Secure | true, không tự hạ cấp theo forwarded header | false, chỉ khi profile dev và Web origin loopback HTTP được khai báo rõ |
| SameSite | Lax, khai báo tường minh | Lax |
| Path | / | / |
| Domain | không đặt, host-only | không đặt |
| Giá trị | opaque SID, không chứa thông tin người dùng/token | SID giả trong tests; chính sách giống nhau khi tích hợp được duyệt |

Tiền tố __Host- buộc Secure/Path=/ và không Domain ở browser hỗ trợ. Không dùng tên đó rồi tắt Secure cho tiện. Ngoại lệ HTTP dev không phải cấu hình HTTPS đạt NFR-01; không dùng cho LAN, public tunnel hay QA/production. [HTTPWG cookie draft — cơ chế/prefix, tài liệu đang phát triển](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)

SameSite=Lax giữ trải nghiệm mở link từ email/Zalo/QR vào Web; mutation vẫn được CSRF gate bảo vệ. Strict hạn chế cookie trên lần điều hướng từ site khác, có thể làm request đầu trông như chưa đăng nhập; không chọn mặc định khi người dùng thường mở link ngoài. None chưa có nhu cầu nhúng/cross-site trong lát BFF này, tăng bề mặt kiểm tra và cần Secure. HttpOnly không chặn XSS thực hiện hành động thay người dùng; nó chỉ hạn chế đọc cookie bằng JavaScript. [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

Cookie không phân biệt port: localhost:3000 và localhost:8082 không phải hai kho cookie riêng. Tên riêng giúp tránh đè cookie giữa dự án, không tạo cách ly an ninh theo port. Exact Origin ở C2 kiểm cả port để chống mutation chéo origin; vẫn không nên chạy dịch vụ không tin cậy trên cùng hostname dev.

### C1A — Session cookie, đề xuất

Không đặt Max-Age/Expires khi cấp SID. Không thêm checkbox Ghi nhớ đăng nhập; source login hiện cũng không có option đó. Khi browser kết thúc session, cookie thường được bỏ, phù hợp mặc định thận trọng với máy HTX có thể dùng chung.

Nhược điểm: mở lại browser có thể cần đăng nhập, không tiện bằng ghi nhớ. Browser restore có thể phục hồi session cookie, nên **không hứa đóng tab/browser là logout**. Server expiry/revoke và nút Đăng xuất mới là nơi quyết định quyền dùng phiên. [MDN: session-cookie restore](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#expiresdate)

### C1B — Persistent cookie, lựa chọn thay thế

Đặt Max-Age/Expires không vượt expiry của record BFF. Browser mở lại trong hạn còn SID nên tiện hơn. Khi C3A áp dụng, persistence cũng chỉ đến access-bound expiry, không mặc định7 ngày.

Đổi lại, dễ để lại phiên trên máy dùng chung nếu quên logout. Persistent cookie không làm token sống lâu hơn và không bảo đảm Redis record còn tồn tại. Nếu sau này muốn ghi nhớ7 ngày, phải có refresh an toàn và lifecycle/tuyệt đối30 ngày được kiểm chứng; không chỉ sửa Max-Age.

Cookie helper tương lai phải tạo SID mới khi login được phép, kiểm tra SID canonical/duplicate cookie names, serialize/clear đúng scope và không echo giá trị trong lỗi. Helpers không được tự tạo application session hoặc xóa cookie từ response cũ sau khi người dùng đã login phiên mới; concurrency đó phải kiểm theo W3/W4.

## 4. C2 — CSRF: chống website khác lợi dụng cookie tự gửi

Ví dụ: người dùng đã login OMTS rồi mở trang lạ; trang đó cố gửi lệnh đổi hồ sơ/logout tới OMTS. Nếu server chỉ thấy cookie rồi xử lý, người dùng có thể bị thực hiện thao tác không mong muốn. CORS không tự chặn mọi request được gửi và SameSite không đồng nghĩa same-origin, nên không dùng một cờ cookie làm toàn bộ giải pháp.

### C2A — Chính sách nhiều lớp cho browser BFF JSON, đề xuất

1. Mutation POST/PUT/PATCH/DELETE, gồm login/logout và phiên giới hạn, phải có Origin khớp **đúng scheme + host + port** với Web origin server cấu hình. Origin thiếu, null, sai hoặc malformed bị từ chối; không fallback mù sang Host/Referer hay hostname suffix.
2. Bắt buộc custom header, ví dụ `X-OMTS-Request: web`. Giá trị cố định này **không phải secret/token**. Form cross-origin thông thường không tự thêm được header; fetch cross-origin phải qua browser preflight. Không mở BFF CORS cho origin ngoài, wildcard hoặc mọi subdomain.
3. Login/update profile nhận JSON đúng media type và budget theo endpoint. Logout không body vẫn cần Origin/header; không ép upstream logout phải nhận `{}`. Không chấp nhận text/plain/form payload rồi đoán đó là JSON. Upload/native-form tương lai cần policy theo route, không phá chức năng bằng cách bắt mọi file là JSON.
4. Nếu Sec-Fetch-Site được browser gửi, mutation chỉ chấp nhận same-origin; cross-site/same-site/giá trị bất thường bị từ chối. Nếu thiếu metadata, vẫn phải qua Origin và custom header, không được bypass hai lớp chính.
5. GET/HEAD không làm mutation; OPTIONS không gọi nghiệp vụ. Không cho GET logout. Reject trước upstream call/ghi store; trả HTTP rejection phù hợp nhưng không tự đổi thành MSG19, xóa phiên hoặc lộ Origin/cookie trong lỗi. Client error contract/microcopy kiểm khi nối handler.

Web origin là cấu hình server riêng với upstream API origin; đề xuất tên `OMTS_WEB_ORIGIN`, chưa thêm env/code. HTTPS production, HTTP chỉ loopback dev rõ ràng. Proxy/forwarded headers chỉ được dùng khi topology/trusted ingress đã chốt, không tin X-Forwarded-Host vì browser gửi được header giả từ client ngoài browser. Cơ chế Origin/custom-header AJAX và trusted target origin được mô tả trong [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Ưu điểm trong OMTS: bảo vệ được cả login trước khi có SID; không thêm pre-login CSRF session, Redis schema/version hay token RAM. Phù hợp React submit qua fetch và BFF cùng origin hiện dự kiến.

Nhược điểm: phải áp dụng đều ở **mọi mutation handler**, giữ CORS chặt và kiểm tra client compatibility. Native form không custom header hoặc browser/proxy làm mất Origin sẽ bị chặn; không âm thầm nới guard. XSS hoặc client code lấy URL không tin cậy để tự gửi request vẫn là rủi ro khác, không được giải quyết chỉ bởi CSRF gate.

### C2B — Synchronizer CSRF token gắn phiên, lựa chọn thay thế

Giữ các lớp kiểm tra origin/media type, đồng thời server tạo random CSRF token, browser nhận token riêng và gửi lại trong header/form. Token phải được server đối chiếu với đúng session; CSRF token được JS đọc không phải SID HttpOnly hay access/refresh token. Không đặt token trong URL/log/storage lâu dài.

Ưu điểm: có bằng chứng chống giả mạo gắn riêng theo phiên, thuận tiện hơn nếu sau này chấp nhận native form; không chỉ dựa vào custom header cố định. OWASP mô tả synchronizer cho stateful apps và custom-header như lựa chọn riêng cho AJAX APIs. Đây là lựa chọn hợp lệ khác, không gọi là giải pháp sai.

Nhược điểm cụ thể trong repo: store/codec/Lua đang strict, chưa có csrfHash; cần version/schema migration và shared-contract tests. Login trước SID cần anonymous/pre-auth CSRF context có TTL, hoặc một cơ chế login-CSRF tương đương được duyệt. Cần lifecycle khi login/logout/đổi phase, nhiều tab, hết token và Redis outage. Không thêm tất cả điều đó trước khi chốt C2B; cũng không dùng double-submit cookie so sánh đơn giản làm thay thế.

## 5. C3 — Thời hạn BFF khi refresh vẫn tắt

### C3A — Cửa sổ tích hợp ngắn, đề xuất

Khi tới bước tích hợp được cho phép, lấy timestamps thực đã validate từ response, đặt hạn dùng active BFF record:

`expiresAt = min(accessTokenExpiresAt, refreshTokenExpiresAt)`

Đây là upper bound, không tự cộng15 phút theo máy browser và không tự kéo TTL mỗi lần request. Nếu timestamp đã hết hạn thì không tạo phiên dùng được. Default backend thường cho access15 phút, nhưng latency/config khác có thể làm thời gian còn lại ngắn hơn. Không dùng clock-skew30 giây của JWT validation để cố kéo dài BFF.

Khi server xác nhận access/phiên đã hết hạn, không gọi protected API bằng token cũ: trình bày MSG19 và yêu cầu đăng nhập lại tại lát tích hợp. Đây là expiry **đã biết**, không phải refresh đã gửi nhưng mất response; C3A không chốt cách xử lý kết quả refresh chưa biết vì không hề gọi refresh.

Ưu điểm: không tạo cảm giác cookie7 ngày đồng nghĩa phiên dùng được7 ngày, không giữ BFF active quá khả năng thực tế, không đụng cơ chế rotation chưa an toàn. Store hiện có thể biểu diễn hạn này mà không tự chọn idle policy.

Nhược điểm: khi refresh tắt, dùng khoảng một access lifetime rồi phải đăng nhập lại, bất tiện cho công việc cả ngày. Chỉ là chế độ chuẩn bị/thử nghiệm tạm thời, **không nghiệm thu NFR-01 refresh7 ngày/max30 ngày**. Chưa thêm idle30 phút/absolute8 giờ; muốn thêm phải bàn riêng với BA/backend. OWASP có hướng dẫn về timeout server-side, nhưng không tự cung cấp con số nghiệp vụ cho OMTS. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Gate/password/contact limited session vẫn không được vào app; C3A không tự đổi thứ tự gate hoặc cấp lại session mới sau đổi mật khẩu. Cookie hết hạn/không có SID khác Redis unavailable: lỗi hạ tầng phải fail closed với lỗi dịch vụ, không tự coi người dùng hết phiên hoặc xóa cookie. Hạn active record không tự định nghĩa tombstone TTL, revoke debt hoặc upstream logout; chúng thuộc W2.1/W4 và không tự sửa theo cookie.

### C3B — Chưa chốt chính sách ngắn; chỉ chuẩn bị phần không phụ thuộc

Tiếp tục cookie/CSRF helpers nếu C1/C2 được duyệt, chưa chọn UX/expiry active session cho integration. Chờ backend refresh agreement và lifecycle dài trước khi ghép login API.

Ưu điểm: không đưa quy trình re-login15 phút vào bản demo. Nhược điểm: lát login → profile → logout thật vẫn chưa có policy đủ để bật. Không giải quyết bằng cách giữ cookie7 ngày rồi dùng access token hết hạn.

### Baseline dài hạn vẫn giữ

Refresh7 ngày sliding/absolute30 ngày ở Web tiếp tục là baseline nguồn. Việc bật refresh, nhận/rotate token mới, giữ mốc absolute ban đầu, metadata/cookie alignment và retry/idempotency phải được duyệt/test riêng. Cookie/TTL nào cũng không vượt quyền backend hoặc tự làm backend revoke khi chỉ xóa SID browser.

Trước khi dùng phiên nhiều ngày trên máy HTX dùng chung, vẫn cần chốt idle policy và định nghĩa activity ở server. Refresh sliding không đồng nghĩa người dùng đã thao tác; polling nền không được âm thầm coi là đồng ý giữ phiên vô hạn. Không thêm idle timeout trong lát ngắn hiện tại không có nghĩa đã quyết định bỏ idle protection vĩnh viễn.

## 6. Micro-task sau khi có xác nhận

| Task | Thay đổi dự kiến | Tiêu chí test, chưa thực thi ở lượt này |
| --- | --- | --- |
| W2.3a0 | Đọc nguồn, đề xuất và decision record | Báo cáo này; cả3 lựa chọn còn Proposed |
| W2.3a1 | Server Web-origin/cookie-policy config tường minh | Production HTTPS; loopback dev; reject missing/unsafe/forwarded spoof; không đọc config lúc import hoặc đổi composition |
| W2.3a2 | Cookie serialize/parse/clear helpers dùng SID W2.1b | Flags/prefix/name/scope, canonical SID, duplicates, malformed/expired input, không leak value; header test không được gọi là browser Secure enforcement |
| W2.3a3 | CSRF guard riêng theo C2 đã chọn | Origin null/missing/lookalike/sai port, custom-header thiếu/sai, media type, metadata, login/logout; denied request không gọi upstream/ghi session; nếu C2B phải làm token-store lifecycle trước |
| W2.3a4 | Expiry helper thuần theo C3 đã chọn | Fake clock, token đã hết hạn, boundaries, server timestamps, không gia hạn TTL do polling; infrastructure error không thành expiry; không bật refresh |
| W2.3a5 | Isolated Next/browser fixture với fake SID | Set-Cookie/clear/no-store; real browser behavior chỉ xác nhận khi có HTTPS fixture phù hợp; không tự import certificate vào Windows hay chỉnh trust store |
| W2.3a6 | Review/report, kiểm tra regression | Lint/typecheck/build/tests; phase/generation/logout cookie race cần integration W3/W4, không tự đóng bằng pure helper |

Server Components/DAL đọc cookie qua API async của Next; set/delete chỉ trong handler/action phù hợp trước streaming, không trong render. CSRF built-in của Server Actions không được suy là Route Handlers tự có cùng guard. Tài liệu Next cài tại cookies.md/server-actions.md đã được đối chiếu; không sửa config cho Server Actions vì lát này dự kiến dùng Route Handlers.

## 7. Kiểm chứng và tự review lượt đề xuất

- Rerun `npm test`:100 files/849 PASS,3 files/27 Redis SKIP. Không thêm test/implementation mới vì quyết định chưa được duyệt; test matrix ở trên là kế hoạch, không bằng chứng đã chạy.
- Không chạy lại lint/typecheck/build/Next fixtures trong lượt tài liệu này; các kết quả W2.2e trước đó là lịch sử, không tính thành lần chạy mới. Không có runtime change để tuyên bố W2.3 implementation hoàn thành.
- Không mở secret/config override của backend; chỉ đọc source defaults/session logic. Không gọi API, Docker/Redis hoặc đổi DB/account.
- Tự review tách rõ cookie persistence, BFF expiry, access expiry và refresh/absolute expiry; không mặc định localhost khác port có cookie riêng, browser close là logout, SameSite là toàn bộ CSRF, hoặc refresh timeout là access expiry đã biết.
- Không phát sinh lỗi test/command cần sửa trong lượt này. Các quyết định về CSRF từ chối, HTTP-dev exception và lifetime đều được ghi Proposed, không dùng báo cáo để tự phê duyệt.
- Kiểm tra6 file tài liệu:59 relative links hợp lệ, không trailing whitespace; git diff --check PASS, không staged changes; learning74 ignored. Backend audit checkout vẫn sạch, branch/HEAD Web không đổi.

Đề nghị Duy Thái trả lời riêng **C1A/C1B, C2A/C2B, C3A/C3B** hoặc nêu thay đổi. Chỉ sau đó mới cập nhật trạng thái từng mục và bắt đầu micro-task tương ứng. Bài học74 local giải thích thuật ngữ, ví dụ request và defense Q&A; không stage/commit/push/merge.
