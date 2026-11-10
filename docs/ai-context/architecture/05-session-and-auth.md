# 05 — Phiên và xác thực

## Cookie
| Cookie | Profile HTTPS | Profile dev |
| --- | --- | --- |
| SID phiên | `__Host-omts_web_sid` | `omts_web_sid_dev` |
| Ngữ cảnh đăng nhập | `__Host-omts_web_auth_context` | `omts_web_auth_context_dev` |

- Cờ: `Path=/; HttpOnly; SameSite=Lax`, thêm `Secure` ở profile https. Không Domain, không Max-Age → cookie phiên. Xóa bằng `Max-Age=0` và `Expires` epoch. Serializer cố định, không nhận tùy chọn của nơi gọi.
- SID = 32 byte ngẫu nhiên base64url (43 ký tự). Bộ đọc cookie kiểm đúng định dạng và từ chối trùng/sai dạng.
- Khóa Redis dùng hash: `sha256("omts-bff-sid:v1:" + bytes)` cho phiên, `sha256("omts-bff-auth-context:v1:" + bytes)` cho ngữ cảnh. Giá trị cookie thô không bao giờ được lưu.
- Chọn profile: `OMTS_WEB_COOKIE_PROFILE` = `https` | `http-loopback-dev`. `OMTS_WEB_ORIGIN` là origin của Web (không phải backend); `https` cần origin https; profile dev bị từ chối ở production và cần origin http loopback (`localhost`, `127.0.0.1`, `[::1]`).
- Các đối tượng "prepared" (`PreparedSessionCookie`, `PreparedContextCookie`, `ServerAuthTokens`, `GuardedMutationBody`, `ResolvedServerSession`) dùng private field và **ném lỗi** ở `toJSON`, `toString`, `inspect` để việc serialize nhầm sẽ thất bại.

## Redis (`@redis/client` 6.3.0)
- Cấu hình (đều bắt buộc, chỉ server): `OMTS_WEB_SESSION_REDIS_URL`, `..._CONNECT_TIMEOUT_MS`, `..._COMMAND_TIMEOUT_MS` (mỗi cái 1–60000), `..._NAMESPACE` (`[A-Za-z0-9_-]{1,64}`). URL phải `rediss:` (TLS), hoặc `redis:` trên loopback. `disableOfflineQueue` = true, `reconnectStrategy` = false; không có endpoint mặc định, không fallback RAM trong runtime.
- Không gian khóa: phiên `omts:bff:v1:<namespace>:<sidHash>`; ledger đăng nhập `omts:auth-context:v1:<namespace>:<contextHash>`; flow xác minh `omts:verification:v1:<namespace>:<contextHash>:<purpose>`.
- Bản ghi phiên: `phase`, `identity` (accountId, backendSessionId, subjectType), `protectedTokens {keyId, sealed}`, `accessExpiresAtMs`, `refreshExpiresAtMs`, `expiresAtMs`, `revision` (uuid), `schemaVersion:1`, `createdAtMs`.
- Phase: `password-change-required`, `contact-verification-required`, `application`. Đích (`session-destinations.ts`): `/onboarding/password`, `/onboarding/contact`, `/dashboard`.
- TTL phiên: hạn **tuyệt đối** = `min(accessExpiresAt, refreshExpiresAt)`, ghi bằng `SET ... PXAT`. Store từ chối bản ghi có `expiresAtMs` vượt mức đó. Đồng hồ cũng được kiểm ở phía Redis (`TIME` trong Lua). Không refresh, không gia hạn idle. Timestamp backend có độ chính xác dưới mili giây bị cắt, không làm tròn lên.
- Phiên bị thu hồi lưu tombstone `{kind:"revoked"}` đến hạn gốc. Thu hồi đua với snapshot đã đổi thì trả `unavailable`, không tuyên bố thành công.
- Bảo vệ token (`session-token-protector.ts`): blob AES-256-GCM `[1][nonce12][tag16][ciphertext]` base64url; AAD gắn `idHash`, định danh, phase, hạn, `keyId`. Token không bao giờ lưu dạng thô.
- Keyring: `OMTS_WEB_SESSION_ACTIVE_KEY_ID` và `OMTS_WEB_SESSION_KEYRING` dạng `id=<43 ký tự base64url của 32 byte>,id2=...` tối đa 8 mục; id cũ ở lại để mở phiên hiện có khi xoay khóa. Cả hai chỉ phía server.
- Chính sách ngữ cảnh: `OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS` (60.000–86.400.000) và `OMTS_WEB_AUTH_PENDING_TIMEOUT_MS` (10.000–300.000); idle TTL phải lớn hơn pending timeout. `setup-api-local.mjs` ghi 1.800.000 và 120.000.

## Sổ đăng nhập (`login-ledger.ts`, `redis-login-ledger.ts`)
- Mỗi thao tác một script Lua trên một khóa, dùng `TIME` của Redis.
- Trạng thái: `idle`, `pending {attemptId, pendingUntilMs}`, `check-required`, `active {binding: sessionHash, sessionRevision, expiresAtMs}`, `revoked`.
- Thao tác: `create` (NX), `read`, `begin`, `renew` (reserveActive), `publish`, `settle` (`rejected` → `idle`, `unknown` → `check-required`), `invalidate`, `match`.
- Hạn pending/active hết → ngữ cảnh chuyển sang `check-required`.
- `generation` và `revision` cho ngữ nghĩa compare-and-set. `begin` chỉ chạy từ `idle` → mỗi ngữ cảnh trình duyệt chỉ một lần đăng nhập đang chờ (lần thứ hai nhận `pending` 409).
- `publish` kéo dài hạn ngữ cảnh đến `max(hạn ngữ cảnh, hạn binding)`.
- Không có cookie ngữ cảnh hợp lệ → login trả `reset-required` 409; client phải gọi `/api/auth/bootstrap` trước (script làm `bootstrap` rồi `login`).

## Luồng đăng nhập (`api-session-runtime.ts`, `login-session-service.ts`)
1. `bootstrap`: đọc/tạo ngữ cảnh trong ledger; cookie ngữ cảnh phát bằng Set-Cookie khi mới.
2. `login`: `resolve` trước — đã có phiên active thì trả `active`; rồi `ledger.begin` (lease pending).
3. `loginSessionService.login`: `POST /api/auth/login` với `clientType:"Web"`; parse token (`ServerAuthTokens`); lấy `/api/me` và xác minh accountId, subjectType khớp claim token; suy hạn ràng buộc theo access; quyết định phase từ `mustChangePassword` và `phoneVerificationRequired`; phase `application` thì lấy `/api/me/permissions` và kiểm có chiếu được; tạo sid, niêm phong token, `store.create` (NX); phát cookie phiên, tạo pending delivery, `ledger.publish` binding.
4. Lỗi thì runtime chạy `cleanup` (`store.revoke` + backend `logout`, best-effort, không dùng signal đã abort) và `ledger.settle` (`rejected` hoặc `unknown`). **Không replay.**
5. Request bị hủy trước khi giao thì phiên ứng viên bị bỏ.
6. `logout`: cần `expectedRevision` khớp revision ledger (không thì `reset-required`); vô hiệu hóa ledger, thu hồi phiên đã lưu, gọi backend `logout`, xóa cả hai cookie. Backend logout lỗi không chặn đăng xuất cục bộ.
7. `changePassword`: thuê ledger bằng `reserveActive`, gọi `/api/me/password`, yêu cầu token trả về khớp account/subject, rồi `acceptTokens` tạo phiên mới; phiên cũ bị thu hồi (xoay phiên). 4xx thì xuất bản lại binding gốc; bất định thì settle `unknown` và thu hồi phiên cũ.
- **Refresh token đang tắt**: không có code Web nào gọi endpoint refresh; access token hết hạn thì phiên coi như hết hạn.
- `resolve` cần ba điều: cookie SID hợp lệ mở được trong Redis (chưa hết hạn/thu hồi), cookie ngữ cảnh khớp, và `ledger.matchBinding` trên session hash + revision. Lệch → `invalid-session` kèm `clearCookie:true`.
- Phía client: `session-expiry-channel.ts` chia sẻ tín hiệu hết hạn; `AuthProvider`, `latest-operation`, `protected-cache-registry` xóa trạng thái UI được bảo vệ khi hết hạn.

## CSRF (`csrf-guard.ts`, `csrf-mutation-body.ts`)
Áp cho POST, PUT, PATCH, DELETE; dựng từ `OMTS_WEB_ORIGIN`. Kiểm theo thứ tự:
1. Method khớp policy (không thì 405).
2. Header `Origin` bằng đúng origin Web đã cấu hình.
3. `X-OMTS-Request: web`.
4. `Sec-Fetch-Site` vắng hoặc `same-origin`. Lỗi → 403.

Đọc body (`readMutationBody`): `Content-Encoding` vắng hoặc `identity` (415); JSON cần `application/json` charset utf-8 tùy chọn (415); `Content-Length` hợp lệ và giới hạn (413), giới hạn dòng stream, timeout (408; 5000 ms trong handler), xử lý abort; `maxBytes` ≤ 65.536; lỗi không bao giờ lộ input. Upload multipart dùng `checkHeaders` rồi `readOperationUpload`/`readBoundedBytes`. Không phát header CORS (fixture cookie kiểm).

## Luồng chứng minh xác minh (G1/G2)
- G1 = phiên và ngữ cảnh đăng nhập (ở trên). G2 = `POST /api/verifications` với lệnh `{op, purpose, ...}`. Purpose: `registration`, `recovery`, `contact`, `password-email`. Op: `start`, `read`, `verify`, `resend`, `complete`, `cancel`.
- Code: `src/server/verification/{verification-http,flow-service,flow-store}.ts`; hợp đồng ở `features/verification-api/contracts`.
- Trình duyệt chỉ giữ flow id mờ và metadata an toàn (`view()`: id, purpose, phase, channel, maskedTarget, expiresAt, nextResendAt, sendsLeft).
- `verificationToken` do backend trả ở bước verify **chỉ** nằm trong bản ghi Redis, mã hóa AES-256-GCM; AAD gắn namespace, contextHash, binding, purpose, flow id, keyId; dùng cùng keyring với phiên.
- Binding (sha256 của JSON): purpose ẩn danh (`registration`, `recovery`) → `[context.revision, "anonymous"]`, ledger phải `idle` và phiên ẩn danh; purpose đã đăng nhập (`contact`, `password-email`) → `[context.revision, sidHash, session.revision, accountId]`, ledger phải `active`. `contact` cần phase `application`; `password-email` cho phép thêm `password-change-required`. `current()` kiểm lại binding trước và sau mỗi lần gọi backend; đổi ngữ cảnh/phiên làm flow `unknown` hoặc 409.
- Phase flow: `pending`, `code`, `verified`, `unknown`, `failed`, `done`. TTL 300 s (tối đa 600 s qua `PXAT`); lease `pending` 60 s, hết hạn thì `unknown`. Mỗi thao tác được `reserve` qua Lua rồi settle. `complete` chỉ từ `verified`; `verify`/`resend` chỉ từ `code`.
- Backend gọi: `POST /api/verifications` (registration), `/api/me/contact-changes`, `/api/me/password/code`; `POST /api/verifications/{id}/verify` với `{code}` và `/resend`; recovery `POST /api/auth/recovery` (nhận 202 + `requestId`, đồng nhất cho thật và giả) rồi `/api/auth/recovery/reset`; complete: `POST /api/auth/register` (201), `/api/me/contact-changes/confirm`, hoặc với `password-email` xoay phiên bằng `changePasswordFromVerification` (proof chỉ cấp phía server).
- Hoàn tất liên hệ đọc lại `/api/me/profile` và kiểm liên hệ mới đã xác minh; không khớp thì `profile` = `null` nhưng flow vẫn báo hoàn tất.
- Gửi lại: kiểm `nextResendAt` 60 s phía Web, trả `TOO_MANY_REQUESTS` kèm `retryAfterMs` (tối đa 3.600.000); `sendsLeft` tối đa 2, lấy từ backend. Mock trả 404 `{status:"error"}`.

## Giới hạn tốc độ, đồng thời, khóa (lớp Web)
- **Không** tìm thấy limiter theo IP/toàn cục ở lớp Web. Tín hiệu giới hạn đến từ backend (MSG-ACCOUNT-06: khóa 15 phút sau nhiều lần sai; MSG-ACCOUNT-18; `Retry-After` hiện thành `retryAfterMs`).
- Kiểm soát đồng thời bằng trạng thái lạc quan trên Redis: session store `compareAndSet` với revision và so sánh snapshot chính xác trong Lua; ledger dùng generation, revision, attempt id; verification store dùng revision và lease pending.
- Singleton theo worker: `createServerSessionRuntimeOwner`, `getSessionGateway` giữ một kết nối Redis mỗi worker; `dispose` đóng nó.
