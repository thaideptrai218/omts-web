# W2.1b — SID và bảo vệ token phía server

Ngày24/10/2026, Asia/Saigon. Web nhánh `feature/OMTS-132-web-foundation`, HEAD `4555c32`; giữ nguyên các thay đổi W2.0/W2.1a/c chưa commit từ lượt trước. Theo yêu cầu: micro-tasks, tests, tự review và báo cáo; không bật refresh thật. Không commit/push/merge, đổi backend/Mobile/Jira/SRS hoặc chọn deployment.

## 1. Kết quả và ranh giới

**W2.1b đã có helpers/tests độc lập:** SID32 byte ngẫu nhiên/hash tra cứu, token protector AES-256-GCM gắn metadata phiên, injected key provider và server-only markers. Thêm76 cases, toàn bộ **81 files/527 tests đạt**. Không nối LoginForm/AuthProvider, cookie, DAL, Redis hoặc API thật.

W2.1d/e chưa làm: chưa có Redis client/adapter hoặc kiểm tra store thật. Key provider production, key lifecycle/rotation, TTL/cookie/CSRF và deployment vẫn mở. Key trong tests được tạo trong bộ nhớ, không đọc/ghi `.env`, không tạo key production và không dùng key ký JWT backend.

## 2. Micro-task: Context → Design → Code

### b1 — SID và lookup hash

`session-id.ts` dùng `randomBytes(32)` tạo SID base64url43 ký tự. Hash SHA-256 có domain prefix riêng để tra store; không lưu SID gốc vào record. `hashSessionId` nhận unknown, từ chối kiểu/độ dài/ký tự sai và encoding không canonical, không trim/normalize chuỗi người dùng. Nếu entropy lỗi, tạo SID thất bại bằng lỗi generic, không fallback timestamp/Math.random.

Tại sao cần kiểm tra canonical? Node có thể decode hai chuỗi khác padding bits thành cùng bytes. Re-encode và so đúng chuỗi đầu vào tránh nhận nhiều cách biểu diễn cho cùng mã. Test kiểm tra trường hợp này, không chỉ happy path.100 SID không trùng là smoke test, không phải bằng chứng thống kê entropy. Yêu cầu session ID không tiết lộ thông tin có cơ sở từ [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

SID/hash không phải accountId, backendSessionId hoặc revision CAS. Module trả SID cho caller server để set cookie ở bước sau; bản thân helper không ngăn caller ghi log hoặc serialize SID nhầm. W2.2/W2.3 còn phải kiểm tra các đường dùng thật.

### b2 — Envelope và metadata được xác thực

`session-token-format.ts` quy định packet v1: byte version, nonce12 byte, tag16 byte, ciphertext; base64url nằm trong `{keyId,sealed}` đã có ở contract. `session-store-validation.ts` tách schema envelope dùng chung, không đổi shape contract. Payload mã hóa chỉ accessToken/refreshToken, strict schema từ chối password/profile/field dư. Không đọc claim JWT để cấp quyền, không tự trim token.

`session-token-protector.ts` dùng AES-256-GCM của Node: key32 byte dạng secret KeyObject, nonce mới từ CSPRNG cho mỗi lần mã hóa, tag cố định16 byte. Không tự viết cipher hoặc nhận algorithm từ input. [Node.js crypto24](https://nodejs.org/docs/latest-v24.x/api/crypto.html#class-cipheriv)

AAD là mảng serialize ổn định gồm domain/version, keyId, idHash, accountId/backendSessionId canonical GUID, actor, phase và ba expiry. Đổi các trường này hoặc copy packet sang phiên khác làm mở token thất bại; key alias cùng material nhưng khác ID cũng không dùng thay được. Metadata vẫn nhìn được trong record, AAD bảo vệ tính toàn vẹn chứ không che metadata.

Giới hạn sealed16,384 ký tự được giữ nguyên từ W2.1a. Header29 byte còn tối đa12,259 byte JSON plaintext; kiểm tra UTF-8 bytes, không chỉ string.length, không cắt token để vừa. Đây là giới hạn envelope nội bộ, không đổi validation form/backend. Nếu contract token tương lai vượt giới hạn, phải review adapter/format thay vì âm thầm chấp nhận hoặc truncate.

### b3 — Key provider và mở token

`session-token-keys.ts` định nghĩa async active()/byId(). Protector nhận provider từ ngoài, không có default key, env reader, global singleton hay tự đăng ký dịch vụ. Cần KeyObject thật, type secret và32 byte; fake object/asymmetric/wrong-length key bị từ chối.

`session-token-open.ts` validate envelope/context, canonical versioned packet, lookup đúng keyId rồi giải mã. Chỉ parse/return plaintext **sau `decipher.final()` xác thực tag thành công**; schema strict và fatal UTF-8 decoder chặn payload JSON/encoding sai. Unknown key hoặc tag/context sai trả invalid-protected-tokens; provider/config lỗi trả unavailable. Không lộ exception/cause, thử key mặc định hoặc fallback key khác.

Provider trả key mới cho writes trong khi còn đọc được key cũ nếu provider giữ nó: đã test capability này nhưng **không áp dụng lịch rotation/retirement production**. Các buffer plaintext do helper chủ động giữ được fill0 khi kết thúc; không cam kết xóa mọi bản sao strings/buffer nội bộ OpenSSL khỏi bộ nhớ JavaScript.

### b4 — Async snapshots và server boundary

Schema tạo snapshot trước khi await provider. Caller sửa tokens/context/envelope trong lúc chờ key không thay dữ liệu đã kiểm tra. Đây là chống thay đổi giữa kiểm tra và sử dụng, không phải store CAS hoặc chống replay.

Cả năm module SID/crypto có `import "server-only"`. Thêm đúng `server-only@0.0.1` theo hướng dẫn Next đang cài; lockfile chỉ thêm package này và root dependency, không nâng package khác. Unit tests mock marker riêng từng file; không sửa global Vitest config/đặt react-server condition cho cả suite. Test khác chạy package thật ở process Node mặc định (bị chặn) và react-server condition (được phép), đồng thời kiểm tra marker còn trong source. Đây chưa phải negative browser-bundle build của Next.

## 3. Tests và verification mới

8 files mới/76 cases: SID12, protector5, tampering21, keys7, input20, async snapshots2, entropy failure2, server markers7. Bao gồm ciphertext/version/nonce/tag sửa,8 trường metadata, key ID alias, GUID casing tương đương, schema/UTF-8/JSON sai, envelope cap đúng biên, multibyte payload, key rotation capability/provider outage, CSPRNG lỗi, và tích hợp protector với RAM test store. Không dùng token/account thật.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` cuối lượt | 81 files/527 tests PASS, từ baseline73/451 |
| `npm run lint` | PASS — exit0 |
| `npm run typecheck` sau sửa lỗi và sau build | PASS — typegen + tsc exit0 |
| `npm run build` | PASS — Next16.4.3 compile/types/prerender |
| `npm audit --json` | PASS — exit0, vulnerabilities `{}`, total0 |
| `npm ls server-only next vitest --depth=0` | server-only0.0.1, Next16.4.3, Vitest4.1.12 |

`npm view` đã đối chiếu version/integrity package với lock; `npm install --save-exact server-only@0.0.1 --ignore-scripts` exit0, thêm đúng1 package, không có warning cleanup như lần SWC cũ. Không chạy npm ci hoặc restart dev server; CLI build dùng tree mới không đồng nghĩa process port3000 cũ đã restart.

## 4. Lỗi thực tế: TS2540 ở test snapshot

Lệnh `npm run typecheck` ban đầu exit1 với `TS2540: Cannot assign to 'keyId' because it is a read-only property` và tương tự `sealed` tại test snapshot dòng42/43 lúc đó. Typegen đã thành công; lỗi nằm ở TypeScript test, không phải route/schema/cipher.

Nguyên nhân: fixture seal() trả `ProtectedSessionTokens` Readonly, còn test cố sửa trực tiếp để mô phỏng caller. Vitest transpile/chạy test mà không thay tsc nên tests vẫn xanh. Không bỏ Readonly, không any-cast hoặc tắt typecheck. Đã đổi test sang bản sao spread `{ ...await seal() }`, vốn là object có thể sửa; giữ nguyên contract sản phẩm. Typecheck chạy lại exit0, full tests và build đạt. Không có lỗi ứng dụng dây chuyền cần sửa.

## 5. Tự review và phần chưa chứng minh

- Snapshot trước await, AAD đầy đủ, key/tag length cố định, random failure fail-closed, no raw cause/log và strict packet decoder đã được đọc lại/test. Store shape không đổi; cipher yêu cầu re-protect nếu metadata được xác thực thay đổi, không tự cấp phase application.
- Mã hóa không chứng minh token do backend cấp, chưa hết hạn hoặc đã revoke. Open có thể giải mã record đã hết hạn; caller server phải đọc/kiểm tra store rồi dùng đúng context đã validate, không lấy context từ browser. Không dùng kết quả opened như DTO trả frontend.
- AAD không chứa revision/createdAt: freshness/CAS/revoke vẫn thuộc store. Replay cả một snapshot hợp lệ không được giải quyết chỉ bằng GCM; Redis/durability và server state phải được review ở các bước sau. Crypto không sửa refresh lost-response.
- Server-only marker không chống server RCE, key-store compromise hoặc sai serialization trong Route Handler sau này. Không có independent cryptographic audit, coverage percentage, live Redis/API tests hay browser E2E trong task này; không gọi helpers/tests là production-ready BFF.
- Không bật API mode, cookie, session store runtime, refresh, user gate hoặc migration/seed. BFF store/provider deployment, production key lifecycle và các câu hỏi nghiệp vụ cũ vẫn chưa tự chốt.

Plan/context/decision register và bài học68 local đã cập nhật. Kiểm tra diff/link, ignore learning và không có secret file trước bàn giao; chưa commit/push. Tiếp theo W2.1d Redis adapter và W2.1e opt-in integration; production provider/key policy phải được chốt trước activation phù hợp.
