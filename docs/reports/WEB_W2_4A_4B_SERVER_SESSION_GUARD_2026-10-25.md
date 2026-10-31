# W2.4a–b — Đọc phiên BFF và chặn phiên chưa vào được ứng dụng

Ngày 25/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`. Phạm vi chỉ gồm logic server và test; **chưa nối layout/Route Handler, chưa gọi backend thật, chưa bật refresh và chưa thay `AuthProvider` mock**.

## 1. Vấn đề cần giải quyết

Cookie trình duyệt chỉ chứa SID, không chứa JWT và cũng không tự chứng minh người dùng được vào phần nghiệp vụ. Server phải dùng SID đọc bản ghi phiên, kiểm tra thời hạn, mở access token đã mã hóa rồi mới phân biệt ba pha: buộc đổi mật khẩu, buộc xác minh liên hệ, hoặc đã vào ứng dụng.

Nếu chỉ kiểm tra “có token”, một tài khoản còn ở bước onboarding vẫn có thể bị code nghiệp vụ gọi `/employees`, `/accounts` hoặc API nhạy cảm. Nếu Redis lỗi mà lại coi như phiên hết hạn, Web còn có thể đăng xuất nhầm người dùng và che mất sự cố hạ tầng.

## 2. W2.4a — server session resolver

Thêm `server-session-resolver.ts` với chuỗi xử lý:

1. Đọc cookie SID bằng reader đã có; cookie thiếu là anonymous, cookie sai định dạng là invalid session.
2. Đọc bản ghi từ `SessionStore`; phân biệt missing/expired/revoked với unavailable.
3. Kiểm lại thời hạn C3A sau khi đọc store, không coi một record `found` là còn dùng được.
4. Mở access token bằng đúng context đã dùng làm AAD. Thay đổi account, phase hoặc các mốc thời gian sẽ làm việc giải mã thất bại.
5. Trả `ResolvedServerSession`, một server capability không serializable, không lộ refresh token, và che token khi log/inspect.

Kết quả giữ bốn trạng thái riêng: `anonymous`, `invalid-session`, `unavailable`, `resolved`. Chỉ `invalid-session` yêu cầu tầng HTTP xóa cookie cũ; sự cố store/key/clock không bị giả thành logout.

## 3. W2.4b — application phase guard

Thêm `application-session-guard.ts`. Hàm này nhận kết quả W2.4a, không đọc cookie hay Redis lần thứ hai:

- anonymous → `unauthenticated`, không yêu cầu xóa cookie;
- invalid session → `unauthenticated`, yêu cầu xóa cookie;
- hạ tầng unavailable → giữ `unavailable`;
- phiên đổi mật khẩu/xác minh liên hệ → `onboarding-required` kèm đúng phase nhưng không trả server capability;
- chỉ phase `application` → `granted` và giữ nguyên `ResolvedServerSession` cho code server gọi backend.

Đây là **authentication-phase gate**, không phải authorization theo function/action/zone. Nó chưa chứng minh Owner/Staff được mở một màn cụ thể. Permission guard và effective-permission DAL vẫn còn ở bước sau.

## 4. Lỗi thực tế và cách khắc phục

Lượt đầu của W2.4a chạy `npm run typecheck` báo `TS2339`: TypeScript chưa cho truy cập `idHash`, `session` hoặc `tokens` sau một số nhánh status. Nguyên nhân không phải lỗi runtime; các kiểu cũ gom nhiều literal vào một object, ví dụ `{ status: "missing" | "invalid-cookie" }`. Loại trừ từng giá trị chưa luôn làm compiler thu hẹp object về đúng positive member.

Cách sửa là thêm positive guard tường minh: chỉ đi tiếp khi status đúng bằng `found` hoặc `opened`; mọi trạng thái còn lại trả `unavailable`. Sau sửa, typecheck và test mục tiêu đều PASS. Không dùng type assertion để ép compiler im lặng, vì cách đó có thể che một nhánh response mới về sau.

## 5. Bằng chứng kiểm tra

W2.4a có 10 resolver tests: cookie thiếu/sai, record thiếu/hết hạn/revoked, hạ tầng lỗi, vi phạm C3A, key/clock lỗi, context bị sửa và phiên application hợp lệ không serializable. W2.4b có 10 guard cases: anonymous, năm invalid reasons, unavailable, hai onboarding phases và application. Boundary test bắt buộc cả hai module giữ `server-only`.

Lượt kiểm tra mục tiêu cuối của a–b:

- `npm test -- src/server/auth/application-session-guard.test.ts src/server/auth/session-server-boundary.test.ts`: 39/39 PASS.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.

Sau khi cập nhật tài liệu:

- `npm run build`: PASS, 13 static outputs; không có route API/session mới.
- `npm test` chạy riêng: 112 files/1278 PASS, 3 files/27 Redis SKIP.
- 85 file Markdown trong `docs/learning` không có relative `.md` link bị thiếu; `git diff --check` PASS.

Lượt đầu cố ý chạy full test song song với production build đã FAIL tại `session-cookie-fixture-tooling.test.ts`: hook nạp cấu hình ESLint vượt giới hạn 10 giây, thực tế mất 11.646 giây; 111 files/1269 tests khác PASS, suite đó skip 9 cases. Build chạy cùng lúc vẫn PASS. Chạy `npm test` riêng ngay sau đó đạt 1278 PASS trong 8.50 giây. Bằng chứng cho thấy test logic không hỏng trong điều kiện CI tuần tự hiện tại, nhưng chưa đủ kết luận root cause hoặc coi độ nhạy tài nguyên đã được sửa. Không tăng timeout để che hiện tượng và không cộng hai lượt chạy thành số test mới.

Các số trên không phải browser E2E, live Redis, QA API hay GitHub CI.

## 6. Tự review và giới hạn

Không thấy token được đưa vào DTO hoặc log ở hai module mới. Guard không sao chép capability cho phiên onboarding và không biến sự cố hạ tầng thành anonymous. Tuy vậy, việc class chống `JSON.stringify` chỉ là hàng rào phòng lỗi; code server vẫn có phương thức chủ động đọc access token để gọi backend, nên ranh giới import, handler và diagnostic vẫn phải được kiểm tra.

W2.4 chưa hoàn thành. Còn thiếu runtime composition với config/Redis/key provider, permission-aware DAL, bảo vệ layout/endpoint, direct-request/SSR/cache/race tests và thay client-only guard. Không tự chốt production key lifecycle, deployment hoặc refresh retry/idempotency trong bước này.
