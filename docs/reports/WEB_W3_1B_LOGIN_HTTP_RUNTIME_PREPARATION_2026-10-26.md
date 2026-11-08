# W3.1b — Chuẩn bị HTTP đăng nhập và runtime ghi phiên

Ngày: 26/10/2026. Repo: `omts-web`, nhánh `feature/OMTS-132-web-foundation`.

## Kết quả và phạm vi

Đã bổ sung factory xử lý HTTP đăng nhập và runtime có khả năng tạo phiên. Đây là phần chuẩn bị có test; **chưa có POST login trong product route, chưa thay form mock, chưa bật API hoặc refresh thật**. Runtime của product vẫn chỉ đọc phiên. W3.1b và W3.1 chưa được đánh dấu hoàn thành.

Nguồn phạm vi: Jira OMTS-201/OMTS-118 đã đọc trong lượt này; Next.js16.4.3 Route Handler docs tại package local; contract backend snapshot đang dùng trong schemas. Không fetch/chạy lại backend hoặc seed DB trong lượt này. Các xung đột actor/contact đã biết không được giải quyết bằng cách bỏ gate.

Duy Thái chốt WEB-API-08: POST login gặp phiên BFF hợp lệ sẽ giữ phiên và trả đích tương ứng, không gọi backend login hay phát cookie mới. Đổi tài khoản phải logout trước. Cookie hỏng dùng recovery; unavailable không tự xóa cookie. Quyết định này không giải quyết hai login ban đầu đều anonymous.

## Các micro-task đã làm

| Phần | Thay đổi | Bằng chứng chính |
| --- | --- | --- |
| b1 HTTP | `login-http.ts`: CSRF/body budget/schema trước session/backend; chỉ nhận identifier/password; đích cố định theo phase; no-store/Vary Cookie/nosniff | 29 HTTP factory cases |
| b2 Runtime | `openServerSessionLoginRuntime`: dùng cùng store/keyring với đọc phiên, cấu hình được chụp trước await; owner giữ một kết nối và giữ đúng kiểu runtime | 10 login-runtime cases, gồm hai test ghép nhiều tầng |
| b2 Hủy request | Transport nhận AbortSignal riêng, vẫn giữ deadline và không chuyển lý do abort ra ngoài; kiểm signal sau đọc body | 4 cancellation cases và tests transport cũ |
| b2 Candidate | Service trả cookie được bảo vệ bằng trạng thái request/expiry/runtime; `abandon()` chặn đọc cookie ngay, gộp cleanup lặp | 21 service cases và 4 pending-delivery cases |
| b3 Ranh giới server | Thêm HTTP/candidate module vào negative compiler fixture và kiểm server-only | 12 build cố ý sai phải bị từ chối, Webpack và Turbopack |

Luồng chuẩn bị: HTTP hợp lệ → đọc cookie/phiên → nếu đang có phiên thì trả đích cũ → nếu anonymous thì login backend giả lập → identity/permissions → SID mới → mã hóa token → store → cookie capability → HTTP response chỉ có dữ liệu cho trình duyệt. Token không nằm trong JSON response; browser không cung cấp SID hoặc clientType. Backend request luôn được service đặt clientType Web.

Session chỉ được xem là candidate trước khi response được xây dựng. Nếu request hủy, runtime đóng hoặc access-bound lifetime hết hạn trước lúc lấy cookie, handler không trả Set-Cookie và gọi cleanup best effort. Cleanup không dùng signal đã hủy của browser. Không retry login, create hoặc refresh.

## Tự review và lỗi đã xử lý

1. **Kết quả phiên về muộn sau close:** runtime cũ chỉ kiểm `closed` trước await. Nếu close trong lúc resolver đọc store, nó vẫn có thể trả capability. Đã kiểm lại sau await ở `resolve` và `resolveApplication`; hai test giữ read đang chờ rồi close xác nhận kết quả unavailable. Đây là sửa lỗi vòng đời trong phạm vi runtime, không phải lời khẳng định xử lý xong mọi race.
2. **TS2339 khi đọc phase/cookie:** kiểu kết quả gộp `invalid-input | unavailable` trong một member khiến TypeScript không loại hết nhánh đó. Tách thành hai member có discriminant riêng; typecheck đạt. Không ép kiểu để bỏ qua lỗi.
3. **Test mock-mode fail do fixture thiếu NODE_ENV:** config parser trả invalid-config đúng thiết kế. Đã thêm NODE_ENV=test cho fixture mock hợp lệ; không nới validator sản phẩm để làm test xanh.

Mã lỗi chỉ được chuyển dưới dạng code có trong catalog và retryAfterMs hợp lệ; không gửi raw detail/exception/params từ backend. MSG06 chưa có structured metadata vẫn chờ backend, không thêm fallback copy hoặc UI xử lý conflict trong lát này.

## Kiểm chứng

- `npm test -- --maxWorkers=4`: **1.504 PASS, 31 Redis SKIP; 130 files PASS, 4 SKIP**. Tăng55 cases so với HEAD eb2f8b4, gồm regression và server-boundary markers; không đổi test thành skip để né lỗi.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS sau bản sửa vòng đời cuối. Build chỉ có hai endpoint session/recover hiện hữu, không có product login endpoint.
- `npm run test:boundary`: **12 negative compiler builds PASS**, kiểm từng nhóm module bằng Webpack/Turbopack. Đây là build cố ý import server-only vào client và phải bị từ chối, không phải12 build ứng dụng thành công.
- `npm run test:session-pages`: **24 built-product HTTP assertions PASS** cho API-mode blockade, anonymous SSR, recovery và unavailable Redis; không gọi credentials thật hoặc suy TLS/browser E2E từ HTTP test.
- `git diff --check`: PASS; bài91/README/lộ trình học đều được gitignore, không có learning file nào được track.
- Test dùng RAM adapter và backend response fixture; connector Redis trong test được thay bằng fake. Không có bằng chứng Redis thật, backend local, QA hoặc HTTPS browser mới trong lượt này.
- Không thay `.env.local`, dependencies, DB, seed, SRS hoặc trạng thái Jira. README tiếng Anh và mock UI cho giảng viên được giữ nguyên.

## Phần còn mở trước khi mount API

- Hai login anonymous có thể chạy đồng thời rồi trả cookie lệch thứ tự. Một owner runtime theo worker chỉ gộp việc mở kết nối, không phải khóa đăng nhập xuyên tab hoặc xuyên process. Cần thiết kế riêng cùng W3.4/W4; chưa tự chọn last-writer-wins.
- Handler trả Response không chứng minh browser đã nhận/lưu cookie. Request.signal không phải biên nhận từ browser; hủy fetch cũng không chứng minh backend rollback. Nếu backend tạo session nhưng phản hồi chứa token bị mất, BFF có thể không có đủ thông tin để cleanup. Không tự retry credentials.
- Cleanup đang so sealed packet trước revoke candidate; read rồi revoke không phải một CAS nguyên tử. Nếu connection đã đóng hoặc revoke/logout lỗi, cleanup có thể thất bại. Không báo “đã thu hồi chắc chắn”; lifetime chỉ giới hạn thời gian tồn tại.
- Chưa kiểm cookie/header delivery bằng Next route thật, chưa mount singleton gateway ghi, chưa có authenticated SSR/hydration/profile/logout API. Không trộn mutation mock với phiên API.
- HTTPS/certificate, refresh retry/idempotency, production key/Redis/deploy và các quyết định WEB-API khác vẫn theo decision register; không bị chốt bởi lượt chuẩn bị này.

## Tự đánh giá và việc tiếp theo

Phần HTTP/runtime độc lập đủ để review bằng fixture. Chưa đủ điều kiện bật đăng nhập API thật hay đánh dấu Jira Done. Bước kế tiếp là đề xuất cách phối hợp login attempts với session/logout, xác định hành vi lỗi và test lịch phản hồi lệch thứ tự trước khi mount route. Các câu hỏi nghiệp vụ mới sẽ được trình Duy Thái trước khi áp dụng.

Đợt này không sửa scanner hoặc rewrite lịch sử. GitGuardian ở HEAD trước còn6 occurrences thuộc5 incident IDs đã được phân tích trong báo cáo bàn giao; phân loại trên dashboard vẫn là việc riêng của chủ repo. Không gọi toàn bộ GitHub checks xanh từ kết quả local.

Bài học local: `docs/learning/91-http-dang-nhap-huy-request-va-runtime.md` (đã ignore, không đưa vào repo).
