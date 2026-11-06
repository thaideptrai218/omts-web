# W2 — đề xuất session store BFF và cập nhật backend

> **Follow-up 24/10:** Duy Thái đã chọn **B: Redis runtime + RAM tests**, deploy chưa chốt và refresh thật tiếp tục tắt. Nội dung “chờ chọn” bên dưới là snapshot đề xuất trước quyết định. Tiến độ mới ở [W2.1a/c](WEB_W2_1A_1C_SESSION_CONTRACT_2026-10-24.md); không coi lựa chọn store là đã có Redis runtime.

Ngày 24/10/2026, Asia/Saigon. Web `4555c32`, nhánh `feature/OMTS-132-web-foundation`. **Đây là đề xuất đang chờ Duy Thái chốt, không phải quyết định đã được duyệt.** Chưa viết session runtime, cài dependency, mở Redis, bật refresh hoặc ghép API thật.

## 1. Kết luận cần chốt trước

Khuyến nghị **B: Redis làm session store dùng khi Web chạy API thật; RAM chỉ làm test adapter**. Redis là dịch vụ lưu key/value dùng chung giữa các tiến trình Next.js, không phải database nghiệp vụ HTX. Hướng này giữ BFF đã duyệt: browser chỉ có cookie HttpOnly chứa mã phiên ngẫu nhiên; access/refresh token ở server.

Nếu ưu tiên tiếp tục local mà chưa muốn vận hành Redis, phương án **A: RAM local tạm thời** vẫn có thể làm, nhưng cần chấp thuận rõ: một tiến trình Node, restart/HMR có thể mất phiên, không nghiệm thu multi-instance/production. Không âm thầm coi A là production store rồi đổi sau.

Quyết định store không tự chốt nhà cung cấp deploy, cookie lifetime, refresh-Web, logout offline, phạm vi profile hay các gate nghiệp vụ còn mở. Các phần đó vẫn ở decision register.

## 2. Session BFF thực chất giữ cái gì?

Hình dung người dùng nhận một mã gửi đồ. Mã không chứa món đồ; nhân viên dùng mã để tìm trong tủ. Browser giữ mã phiên, Next.js giữ “tủ” có token backend. HttpOnly ngăn JavaScript đọc cookie nhưng cookie vẫn là credential: nếu bị đánh cắp thì người khác có thể dùng nó cho tới khi phiên bị vô hiệu. Cần HTTPS, CSRF protection và revoke, không chỉ bật một cờ cookie. OWASP yêu cầu session ID không tiết lộ nội dung phiên. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Luồng dự kiến: đăng nhập → Next gọi .NET → validate tokens/identity/gates → tạo record trong store → browser nhận SID. Yêu cầu sau mang cookie → Next kiểm tra record → gọi .NET bằng token server → trả DTO tối thiểu không chứa token. Server/DAL kiểm tra quyền; menu không phải lớp authorization cuối cùng.

Backend đã có bảng `LoginSession`, nhưng đó là sổ quản lý phiên/token của .NET. Source chỉ lưu **hash refresh token**; không có cách lấy lại token thật từ hash để BFF gửi refresh. Store BFF phải giữ token theo dạng khôi phục được và được bảo vệ. Hai lớp có nhiệm vụ khác nhau; không cho Next truy cập thẳng bảng nghiệp vụ, không xin JWT signing secret của .NET, không thêm bảng BFF vào backend khi nhóm chưa duyệt.

## 3. So sánh ba lựa chọn

| Lựa chọn | Ưu điểm cụ thể | Đổi lại / giới hạn | Khi phù hợp |
| --- | --- | --- | --- |
| **A — RAM của Next.js** | Ít hạ tầng, dễ bắt đầu và test bằng clock giả | Mỗi process có một bản riêng; restart mất dữ liệu, có thể buộc đăng nhập lại; không dùng Map để đảm bảo đồng bộ nhiều worker/server | Unit tests; runtime local một process nếu được duyệt tạm |
| **B — Redis dùng chung** | Store tách khỏi vòng đời Next, có expiration và cơ chế cập nhật có điều kiện; phù hợp nhiều instance khi cấu hình đúng | Thêm dịch vụ/secret/kết nối; cần quản lý downtime, persistence/eviction và khả năng mất write khi failover; không tự bảo đảm token an toàn | Khuyến nghị cho runtime tích hợp và đường lên deploy |
| **C — Database riêng của BFF** | Có thể dùng conditional update/transaction; lưu bền và quản trị backup theo thiết kế DB | Thêm schema/migration/driver/connection pool/cleanup expiry; phải có hạ tầng DB được cấp riêng; không đồng nghĩa được sửa DB backend | Khi nhóm đã chọn DB dùng chung cho BFF và ưu tiên durability/transaction |

Không lựa chọn “mã hóa cả access/refresh token rồi để cookie” trong đợt này: dù có thể xây hệ thống như vậy, token vẫn được chuyển tới browser dưới dạng ciphertext, khác quyết định token chỉ ở server. `localStorage` chứa token thật cũng không phải phương án được xét.

Redis có expiration qua SET và optimistic conditional transactions; **khả năng của Redis không tự làm adapter đúng**—cần kiểm tra version, tính nguyên tử và lỗi kết nối. [SET](https://redis.io/docs/latest/commands/set/), [Redis transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)

Redis tách khỏi restart Next, nhưng Redis restart có giữ dữ liệu hay không còn phụ thuộc persistence. Không cam kết “không bao giờ mất phiên”. Eviction hoặc mất record phải làm phiên không còn dùng được, không tái tạo từ cookie. [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

### Khuyến nghị B áp dụng cụ thể thế nào?

- Runtime dùng Redis được khai báo tường minh; RAM adapter chỉ nằm trong tests. Local có thể dùng Docker sau khi engine sẵn sàng; production chọn endpoint/tô-pô theo môi trường deploy sau, không tự đăng ký dịch vụ có phí.
- Store không truy cập được thì chặn thao tác bảo vệ với lỗi dịch vụ có thể thử lại; không đổi thành “sai mật khẩu”, không tự xóa cookie và không fallback sang RAM/mock. Store lỗi khác với SID hết hạn hoặc không tồn tại.
- Đề xuất token bundle được mã hóa xác thực ở tầng ứng dụng trước khi ghi store bằng thư viện/primitive chuẩn; key BFF độc lập backend và nằm trong secret config. Hash SID làm lookup key; không hash token rồi kỳ vọng khôi phục. Chốt/review key lifecycle, rotation và encrypted payload trước adapter runtime, không tự chế thuật toán.
- Redis local không mở public/LAN; môi trường từ xa cần mạng riêng/ACL/TLS và bảo vệ dữ liệu persistence/backup. Redis hỗ trợ TLS/ACL nhưng phải cấu hình, không mặc nhiên bật. [Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- Đề xuất `create` chỉ tạo nếu chưa có; update chỉ khi version/status còn đúng; record mất/hết hạn/revoked không được upsert sống lại từ response cũ. Tombstone/expiry và fencing cần thiết kế/test trước khi dùng coordinator. Không dùng một Redis lock đơn giản rồi tuyên bố refresh đã an toàn.

## 4. Record và vòng đời dự kiến — chưa code

Các nhóm trường đề xuất: SID hash; accountId; backendSessionId từ `/api/me`; actor; trạng thái giới hạn/ứng dụng; token bundle được bảo vệ cùng access/refresh expiry; expiry BFF; version; trạng thái/metadata revoke cần thiết. Không chứa password, OTP, toàn bộ profile, danh sách contact hay mặc định role từ tên hiển thị.

SID BFF và sessionId backend là hai mã khác nhau. `AuthTokens` hiện không trả sessionId hoặc absolute session expiry; không tự đọc cấu trúc refresh token để ràng buộc phiên hoặc bịa hard limit. `/api/me` được backend cho qua cả hai gate để đọc identity. TTL BFF không được vượt giới hạn có bằng chứng từ backend; chưa chốt một lifetime mới hoặc “nhớ đăng nhập”.

Ví dụ race phải test: request A đọc phiên version1; người dùng logout, store đánh dấu revoked/version2; A hoàn tất muộn và cố ghi version1. Store phải từ chối ghi, không khôi phục phiên. Nếu SID mới được tạo khi login lần sau, response logout cũ cũng không được xóa cookie mới. Store contract là một phần của giải pháp; cookie/coordinator còn phải xử lý phần còn lại ở W2–W4.

Redis/CAS chỉ giúp phối hợp cập nhật trong BFF. Nó không khôi phục được kết quả nếu .NET đã rotate refresh token nhưng phản hồi bị mất; không bật refresh thật khi backend chưa có agreement retry/idempotency.

## 5. Backend đã cập nhật/đọc được những gì?

Đã `git fetch origin` ở `D:\Đồ_án\omts-backend`, kiểm tra clean rồi chuyển audit checkout detached từ `14d7839` tới `origin/develop@48ae1e0438cec5d1123e7f7f6726377242855ce5`. Không `git pull` mù trên detached HEAD, không merge nhánh feature. Checkout đang chạy `D:\Đồ_án\omts-backend-local` vẫn ở `48ae1e0`, không restart backend/migrate/seed DB.

**Develop chưa có commit mới so với snapshot Web W1.** Login/refresh/profile/logout vẫn cùng contract; chưa có bằng chứng để bật API thật ngay. Đọc lại `AuthService`, AuthTokens/RefreshRequest, MeController/MeProfileController, AccountStateGateFilter, LoginSession, RowVersionGuard và ProblemResults:

- Refresh vẫn rotate; replay/concurrent refresh có thể revoke. Request chỉ có refreshToken; chưa thấy idempotency/retry contract được bổ sung trong phần auth đã kiểm tra.
- MSG06 vẫn đưa người sửa/thời gian vào câu `detail`; RowVersionGuard có `currentRowVersion` nhưng chưa có `params.user_name/time`. Quyết định chờ backend vẫn giữ nguyên.
- Gate password rồi phone vẫn tồn tại. Cơ chế Staff email OR phone đã duyệt phía frontend chưa được đồng bộ; không bỏ gate.
- PUT profile thực trả `{profile,message}` nhưng annotation còn ProfileView. Không sửa schema để chạy theo annotation sai.

### Điểm mới ở các nhánh chưa merge

| Nguồn đã fetch / trạng thái lúc kiểm tra | Nội dung thấy trong source | Ảnh hưởng Web |
| --- | --- | --- |
| [PR #14](https://github.com/thaideptrai218/omts-backend/pull/14), OPEN → develop; head `9b678eceb168a52d77bd4cad51e395c135a0d0be` | Dockerfile/Compose, CORS, demo seeder và tests; dữ liệu HTX, vùng, giấy phép, bè, employee/staff, Trader, vật tư/NCC/phiếu nhập | Có thể cung cấp fixtures thật sau khi chọn revision và seed DB riêng; chưa coi đã chạy QA |
| [PR #11](https://github.com/thaideptrai218/omts-backend/pull/11), OPEN → develop; head `78a0c5a325de03b84816bda05d3cc8f7a5420fd0` | ENV/đo nước và migration cập nhật | Chưa phải API deploy chuẩn cho Web |
| [PR #13](https://github.com/thaideptrai218/omts-backend/pull/13), OPEN → nhánh ENV; head `c92787b131af6f4995a09916ce0e30a2a45bd75b` | LAB/lao động, chấm công và lương | Nhánh phụ thuộc nhánh chưa merge, không trộn vào auth scope |

Đã đọc seed orchestrator, Staff/Employee step, các trạng thái login trong employee plans và Development guard của PR #14. Có Staff bình thường, buộc đổi mật khẩu, chưa verified phone và grant hết hạn. **Đây là dữ liệu demo do backend cung cấp, không phải tài khoản đã tồn tại trong DB hiện đang chạy.** Seeder có thao tác gán credential/cờ gate trực tiếp cho demo, tạm đặt ngày cấp password xa tương lai cho case đổi mật khẩu; không coi đó là nghiệp vụ production hoặc tự chạy trên DB hiện có. Không ghi passwords/demo contacts vào report.

PR #14 còn mô tả browser Web gọi backend bằng CORS. BFF đã được duyệt vẫn giữ: browser gọi cùng origin Next; Next gọi .NET server-to-server nên không cần bật CORS cho chặng đó. Backend có thêm CORS không buộc đổi Web sang token trong browser; đây là điểm cần nhóm hiểu thống nhất, không phải lý do tự thay kiến trúc.

Nhánh Docker chưa có Redis service; chọn B không có nghĩa PR #14 đã cung cấp sẵn BFF store. Không sửa Compose backend để thêm dịch vụ khi chưa chốt.

## 6. Micro-task W2 sau khi chốt

1. **W2.0 — audit/đề xuất (đã làm):** báo cáo này, cập nhật decision register, chờ chọn store. Không đánh dấu W2.1 xong.
2. **W2.1a — contract thuần:** read/create/revoke/compare-and-set, clock và store injection, typed missing/expired/revoked/unavailable/conflict. Test account isolation, TTL boundary, SID không có, stale version; chưa gắn route.
3. **W2.1b — SID/token boundary:** server-only, random SID/hash lookup, metadata tối thiểu, protected token payload. Test không serialize token, dữ liệu mã hóa hỏng/key sai và sinh SID mới; review trước runtime.
4. **W2.1c — RAM test adapter:** cùng contract, không export làm runtime fallback. Test fake clock, clone isolation, pending write sau revoke.
5. **W2.1d — adapter runtime đã duyệt:** Redis hoặc lựa chọn khác; kiểm tra kết nối/config riêng, expiration+conditional update nguyên tử, revoke/tombstone không upsert. Integration tests opt-in dùng store riêng, không test vào dữ liệu người dùng.
6. **W2.1e — review adapter:** chạy contract suite cho test adapter và runtime adapter, test concurrent writers/logout, store unavailable và restart semantics đúng lựa chọn. Chỉ đóng phần có evidence.
7. **W2.2 → W2.4:** server transport/config allowlist → cookie/CSRF → DAL/guard với Cache Components. Mỗi lát có unit tests và report riêng; không mở API mode trước các cổng cần thiết. Cookie/gate/refresh/lifetime chưa duyệt vẫn phải hỏi.

Các micro-task không tự thêm default TTL, tự refresh, record ownership hoặc queue offline. Không chọn provider/deployment/client library trước quyết định tương ứng.

## 7. Kiểm tra thực tế, lỗi và giới hạn

`npm test` Web chạy lại: **69 files/401 tests PASS**. Chỉ đổi tài liệu trong task này; không thêm tests session trước thiết kế được chốt, không chạy lại lint/typecheck/build/audit và không mượn kết quả cũ như mới. Kiểm tra diff/link và learning ignore trước bàn giao. Không commit/push trong task đề xuất này.

Docker CLI có trên máy; `docker context show` = `desktop-linux`. `docker info --format '{{.ServerVersion}}'` exit1: “failed to connect ... dockerDesktopLinuxEngine ... The system cannot find the file specified.” Nghĩa là CLI không tới được engine qua named pipe, **không phải lỗi Redis hay backend schema**. Cần người dùng mở/kiểm tra Docker Desktop đúng context rồi kiểm tra `docker info` lại trước khi dùng container; không tự bật service/đổi context/cài Redis hoặc xóa volume. Chưa kiểm chứng nguyên nhân sâu hơn như WSL/service.

Probe chung `Get-Command docker,redis-server` trả exit1 vì không thấy executable Redis native; Docker vẫn được tìm thấy. Không nhầm exit code cuối lệnh probe với fetch/switch thất bại. Lần tra source đầu dùng các path namespace cũ không tồn tại sau cập nhật audit checkout; đã tìm lại bằng `rg --files`, đọc đúng `Features/Auth`, `Features/Accounts` và `Api/Common`. Không tạo file hoặc kết luận backend mất chức năng từ lỗi tra cứu.

Không chạy backend tests, API smoke, auth mutation, Docker build/up hoặc seed. Trạng thái PR OPEN là snapshot từ GitHub CLI, không chứng minh review/CI đã đạt. Fetch ghi nhận một số remote feature/docs refs bị force-update bởi phía remote; đây không phải agent force-push, không cần reset/ghi đè checkout đang chạy.

Tự review: khuyến nghị B có cơ sở nhưng tăng hạ tầng, engine local hiện chưa sẵn sàng và production chưa chọn; A chỉ hợp lệ khi người dùng chấp nhận giới hạn local rõ ràng. Không có phương án nào tự giải quyết business conflicts hoặc refresh lost-response. Chờ chốt trước W2 implementation.
