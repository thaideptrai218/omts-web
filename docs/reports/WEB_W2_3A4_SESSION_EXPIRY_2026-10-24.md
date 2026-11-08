# W2.3a4 — Expiry helper độc lập theo C3A

Ngày 24/10/2026, nhánh `feature/OMTS-132-web-foundation`. Chỉ triển khai helper/tests/fixture của a4. Chưa nối app/handler/DAL, bật API/refresh, stage/commit/push/merge.

## 1. Context, nguồn và quyết định đã giữ

Đã đọc AGENTS/context/plan/WEB-API-07/C3A proposal, auth wire schema, token wrapper, store/validation/Redis record schema và RAM test adapter. Installed Next16.4.3 authentication/data-security hướng dẫn phân biệt auth/session/authorization và server-only DAL; không thay bằng cơ chế cookie/SSR khác. Jira OMTS-132 vẫn Done, parent metadata OMTS-121 In Progress; không dùng trạng thái đó làm bằng chứng BFF mới hoàn tất và không sửa Jira. Không thay màn hình nên không có Figma/UI mới cần suy diễn.

SRS Report3Finnal.md NFR-01 vẫn access15 phút, Web refresh7 ngày/max30 ngày. Chỉ đọc source backend audit checkout local HEAD48ae1e0: AuthTokens có DateTimeOffset expiry; JwtTokenService lấy actual expiresAt từ TimeProvider, JwtOptions giữ defaults khớp SRS. Không fetch/pull, chạy backend hoặc đọc secret config; đây không phải bằng chứng backend remote/deploy hiện hành. Không decode JWT để tự chọn thời hạn.

C3A đã duyệt: khi refresh tắt, active BFF lifetime không vượt mốc sớm hơn giữa actual access/refresh expiry. Không thêm idle30 phút/absolute8 giờ, grace/skew30 giây, refresh retry hoặc default15 phút từ lúc browser nhận response. Giai đoạn này không nghiệm thu long-lived refresh NFR.

## 2. a4.1 — Chuẩn hóa expiry metadata, không nhận credential authority

`src/server/auth/session-expiry.ts` thêm `deriveAccessBoundExpiry(input, clock)`. Input chỉ cần hai trường wire `accessTokenExpiresAt` và `refreshTokenExpiresAt`; caller tương lai phải lấy chúng từ backend response đã validate qua server transport/token boundary, không lấy browser làm authority. Helper không chứng thực nguồn metadata, JWT hoặc chữ ký.

ISO validation dùng explicit Z/offset, calendar/time hợp lệ, không whitespace/local-time/missing seconds. Mỗi chuỗi tối đa64 ký tự là parser budget, không business lifetime. Sau schema, fractional seconds được pad/truncate về đúng3 chữ số trước native Date.parse: .NET có thể trả7 chữ số; không làm tròn expiry muộn hơn hoặc dựa vào parser chấp nhận format tùy tiện. Sai ngày không được Date.parse tự rollover thành ngày khác.

Epoch milliseconds dùng schema timestamp của store hiện có: số nguyên từ0 đến8_640_000_000_000_000. Không đổi contract timestamp, không coercion từ chuỗi number hoặc Date object. ISO offset khác nhau có cùng instant cho cùng millisecond output; không dùng timezone browser/máy local để đoán.

Sau parse, expiresAtMs là min(accessExpiresAtMs, refreshExpiresAtMs). Đọc clock server tường minh đúng một lần qua readSessionClock đã có. expiresAtMs > now trả active với chỉ ba mốc số; bằng now hoặc nhỏ hơn trả expired. Delay nhận response và polling chỉ làm giảm khoảng còn dùng, không dời deadline. Sub-ms được truncation bảo thủ nên có thể dừng sớm dưới1ms, không cộng grace.

## 3. a4.2 — Kiểm hạn đã lưu và giữ cap chặt hơn

`checkAccessBoundExpiry(input, clock)` chỉ project/kiểm ba số `accessExpiresAtMs`, `refreshExpiresAtMs`, `expiresAtMs`. Hạn đã lưu ngắn hơn vẫn được giữ nguyên; không tính lại min rồi kéo dài cap ấy. Nếu expiresAtMs vượt một trong hai token expiry, trả invalid-input: không tự migrate/clamp/update record để che lỗi cấu hình. Input extras/status/identity/phase/ciphertext không được echo vào output.

Store tổng quát hiện chỉ ràng buộc expiresAtMs <= refreshExpiresAtMs, chưa áp access-bound policy. Đó là chủ ý của W2.1 trước khi chốt C3A, không tự sửa shared schema/Lua/tombstone contract trong lượt này. Test tạo một record legacy hợp generic store rồi chứng minh helper không coi nó C3A-ready và không sửa record. Khi có composition W3/DAL, phải dùng derive đúng trước create và check đúng trước sử dụng; không bật app chỉ vì generic store.read trả found.

Active ở đây chỉ là **hạn thời gian đạt tại snapshot clock**, không có nghĩa phase application hoặc có permission. Test cả password-change-required/contact-verification-required/application giữ nguyên phase. Sau await/delay, handler phải kiểm lại tại điểm cần thiết, không cache một verdict active rồi dùng mãi. Backend vẫn kiểm token/quyền cuối cùng; helper không chốt xử lý401, thay gate hoặc cấp lại session sau đổi mật khẩu.

## 4. a4.3 — Kết quả tách lỗi khỏi expiry

| Kết quả | Ý nghĩa, không tự kèm hành động UI |
| --- | --- |
| active +3 mốc số | Hợp C3A tại clock snapshot, chưa xác thực/ủy quyền |
| expired | Dữ liệu hạn hợp lệ và clock hợp lệ cho thấy đã đến hạn |
| invalid-input | Metadata/schema/calendar/range/cap sai; không tự kết luận người dùng hết phiên |
| unavailable | Clock không đọc được/hỏng, không có bằng chứng now để kết luận expiry |

Không đọc Date.now ngầm, fallback sang client time hoặc cộng default duration khi clock lỗi. Throwing clock/getter không lộ Error/cause/raw input; result được freeze. Clock lỗi vẫn unavailable kể cả timestamp0 nhìn có vẻ cũ; không suy hiện tại khi clock không đáng tin.

Helper **không đọc Redis** hay nhận SessionReadResult như thể đó là bộ mốc thời gian. Test-only stage selection giữ nguyên unavailable/missing/revoked/expired/invalid-input của store; chỉ found mới được check. Gọi nhầm một object status vào helper trả invalid-input, không đổi thành expired. Mapping MSG19/relogin ở W3/DAL tương lai phải dùng đúng phân loại; không xóa cookie vì lỗi hạ tầng hoặc tự claim missing chắc chắn là expiry.

Không store write/CAS/revoke, thay Redis TTL/tombstone, clear cookie, refresh, fetch hoặc phát message/event. Output không có credential/identity/session phase. Không coi numeric expiry projection là DTO được tự gửi ra browser.

## 5. a4.4 — Test, boundary fixture và bằng chứng

85 expiry cases mới:72 unit và13 RAM-store/test-only composition. Phủ min access/refresh/equal, <=now/+1ms, Z/offset, leap day, malformed/local/missing/oversized ISO, .NET fractions và conservative sub-ms, invalid ms/range/clock, single clock snapshot, no ambient Date.now, redaction/freeze/unknown credential getters, stricter cap và legacy record.

RAM test chỉ dùng adapter test hiện có, không phải runtime fallback. Create với time projection từ helper hợp store contract; đọc nhiều lần giữ expiry/revision/phase, exact boundary expired rồi missing. Test delay sau read kiểm lại found snapshot thành expired đúng clock mới. Infra clock failure không bị gán hết phiên và record giữ nguyên khi dependency hồi phục. Fake stage selection giữ riêng store outcomes, không là DAL sản phẩm đã tích hợp.

Thêm1 marker case cho runtime module. Hai nhóm negative build cũ đã đủ5 imports mỗi nhóm, nên thêm fixture expiry-boundary riêng (ngoài src/app), không yêu cầu trace thứ6 vượt Next Webpack diagnostic cap. Runner hiện3 nhóm5+5+1, dưới2 compilers =6 intentional negative builds, phủ11 modules. Chỉ ignore/exclude generated outputs hẹp của fixture mới; không bỏ lint/typecheck/marker hoặc đổi root product config.

| Kiểm tra | Kết quả |
| --- | --- |
| npm test |108 files/1219 PASS;3 files/27 Redis SKIP;111 files/1246 tổng |
| Tăng so a3 |85 expiry +1 marker =86;1133 →1219 PASS |
| npm run lint / typecheck / build |PASS;13 static outputs, không thêm product route/handler |
| npm run test:boundary |6 negative builds PASS;3 groups/11 modules/2 compilers |
| npm audit --json |0 vulnerabilities;không thêm dependency |
| Docs/scope/Git |17 files không trailing whitespace;97 relative links hợp lệ; diff --check PASS; staged diff rỗng; learning78/index và generated expiry fixture ignored; không helper imports mới trong app/components/features; env example chỉ active mock; branch/HEAD không đổi |

Không chạy live Redis, browser cookie/CSRF/expiry E2E, API .NET/QA, test:serialization lịch sử hoặc GitHub CI.27 SKIP không được báo thành live PASS. Không sửa env local/backend/mobile/DB/SRS/Jira hoặc Docker/certificates.

## 6. Lỗi thực tế và tự review

Không phát sinh test/lint/typecheck/build failure trong lượt a4. Các case date rollover/sub-ms/latency/invalid cap là phòng lỗi đã được test, không mô tả chúng như bug sản phẩm đã gặp rồi vá.

Có lỗi lệnh đọc: `rg ... src/server/auth/session-memory* ...` trả os error123 “filename/directory name/volume label syntax is incorrect”. PowerShell không expand glob đối số native như dự kiến, và path đoán chưa đúng. Dùng rg --files rồi lọc tên để xác định file thật `src/server/auth/__tests__/memory-session-store.ts`; đọc source đúng, không tạo/di chuyển file để khớp path đoán. Một scan rộng session-expiry khớp shared/session-expiry-channel cũ; phải scan đúng server module/function trước khi kết luận có runtime import mới.

Tự review wire calendar/zone → precision/range → min cap → clock → equality boundary → stored cap → status separation → side effects. Đã bổ sung3 regression checks trong lượt review: clock unavailable với epoch cũ, snapshot/redaction stored fields và delayed found snapshot. Không phát hiện lỗi logic còn mở trong phạm vi helper sau review, không coi đó là bằng chứng toàn hệ thống hết bug. Không có xung đột nghiệp vụ mới cần tự chốt.

## 7. Giới hạn và bước tiếp

Helper stateless dựa vào trusted server clock tại từng call; không có high-water mark/monotonic clock toàn cụm hoặc bảo vệ clock rollback/clock drift giữa Web–Redis–backend. Không cộng skew để che sai lệch. Runtime clock source/observability và cross-node timing cần kiểm khi composition/deployment; helper không tự hồi sinh phiên hoặc tạo/tăng TTL. Expired verdict cũng không tự thành tombstone/revoke; store và W4 quản lý vòng đời ấy.

Chưa chứng minh actual Redis TTL, key expiry, encrypted-record integration hoặc race dưới I/O thật. C3A implementation độc lập không bật refresh7 ngày hay đóng cổng W2.4/W3/W4. Full W2.2e-e5/wiring/no-store/account/gate/permission/cache/error contracts vẫn mở.

Tiếp theo a5 isolated Next/browser fake-cookie fixture; chưa làm a5 trong lượt này và không tự cài certificate/trust. a6/full composition review theo plan. Report/plan/context/decision/README cập nhật; bài78 local/ignored giải thích kiến thức và lỗi lệnh thật. Chưa stage/commit/push/merge, HEAD vẫn4555c32.

Nguồn tham khảo: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) về kiểm timeout ở server; [ECMAScript Date Time String Format](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format) về biểu diễn/parser thời gian. Chính sách C3A lấy từ quyết định OMTS, không gán15 phút/7 ngày hoặc cap cụ thể thành yêu cầu mặc định của các nguồn này.
