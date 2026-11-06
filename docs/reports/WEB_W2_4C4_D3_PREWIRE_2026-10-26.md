# W2.4c4a–d3a — Sở hữu runtime và quyết định truy cập trước khi nối route

Ngày 26/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`. Đây là phần pre-wire tiếp theo W2.4c–d; không bật API, không tạo URL onboarding và chưa import runtime vào product layout.

## 1. Runtime owner

`server-session-runtime-owner.ts` quản lý một runtime ready và tối đa một lần open đang chờ. Nhiều request đầu đồng thời nhận cùng promise, tránh mở nhiều kết nối Redis. Chỉ kết quả ready được cache; invalid-config/unavailable/exception được che và cho phép lượt sau thử lại.

`dispose()` tăng generation, đóng runtime hiện tại đúng một lần và không ném lỗi close ra caller. Nếu một lần open cũ hoàn thành sau dispose, owner đóng runtime đến muộn và trả unavailable thay vì công bố lại tài nguyên của generation cũ. Sau dispose có thể mở generation mới; điều này phục vụ lifecycle test/HMR, chưa phải chính sách restart production.

Owner vẫn nhận opener qua dependency. Chưa có module global đọc `process.env`, chưa đăng ký signal handler và chưa có live Redis; do đó không được gọi là process singleton đã kích hoạt trong ứng dụng.

## 2. Protected access decision

`protected-access-decision.ts` chuyển phase-guard result thành hành động trung lập với routing:

- application → render và giữ server capability;
- anonymous → redirect-login;
- invalid/expired/revoked cookie → recover-invalid-session;
- limited session → onboarding kèm đúng phase;
- Redis/key/clock unavailable → service-unavailable, không logout.

Chỉ nhánh render có `ResolvedServerSession`; object vẫn không serialize được. Module không tự chọn URL hoặc xóa cookie. Việc đó thuộc Next adapter sau khi route onboarding được chốt.

## 3. Compiler boundary

Thêm hai fixture cố tình sai:

- `session-runtime-boundary`: năm module keyring/config/runtime/DAL/capability;
- `session-access-boundary`: runtime owner và access decision.

`npm run test:boundary` đạt 10/10 intentional negative builds: Webpack và Turbopack đều từ chối import các module trên vào Client Component. Mỗi group giữ không quá năm module để không phụ thuộc phần lỗi bị Next cắt bớt.

## 4. Lỗi thực tế

Lượt focused đầu của owner có 1/49 test fail và typecheck fail. Assertion kiểm `open` ngay sau `get()`, nhưng owner gọi opener trong microtask để bắt cả synchronous throw; mock vì thế vẫn có zero calls ở đúng thời điểm assertion. Hai mock result cũng bị TypeScript widen `status` thành `string`, báo `TS2322` khi gán vào contract hẹp.

Sửa fixture bằng cách chờ một microtask trước assertion và dùng `as const` cho hai status. Không đổi runtime production để chiều một test sai thời điểm. Lượt sau 49/49, typecheck và lint PASS.

Trong lúc audit route, lệnh đọc đoán `src/app/providers.tsx` nhưng repo đặt providers trực tiếp trong root layout; PowerShell báo không tìm thấy file. Đã đọc đúng `src/app/layout.tsx`; không có source bị mất. Audit xác nhận onboarding hiện là state nội bộ của `LoginExperience`, không có URL phục hồi sau reload.

## 5. Bằng chứng cuối

- Focused owner/runtime/boundary: 49/49 PASS sau sửa fixture.
- Focused decision/owner/boundary: 50/50 PASS.
- Full suite: 119 files/1362 PASS; 3 files/27 Redis SKIP.
- Lint, typecheck và production build: PASS; vẫn 13 static routes, chưa có BFF/session route.
- Compiler boundary: 10/10 intentional negative builds PASS.
- `git diff --check` và link learning được kiểm ở bước bàn giao cuối.

## 6. Blocker cần quyết định

Protected layout chưa thể chuyển limited session đến “đúng màn” vì code hiện chỉ dựng password/contact onboarding bên trong state của `/login`. Có hai hướng hợp lệ:

1. Khuyến nghị: route riêng `/onboarding/password` và `/onboarding/contact`, mỗi route đọc phase từ BFF để reload/new tab phục hồi đúng bước.
2. Giữ một `/login`: Login page phải đọc BFF session phía server và khởi tạo panel tương ứng; URL không phản ánh bước hiện tại.

Không tự chọn giữa hai hướng vì nó thay đổi cấu trúc luồng auth, browser history và cách phục hồi phiên. Invalid-cookie recovery handler, actual process owner và protected-layout wiring chờ lựa chọn này để test thành một chuỗi hoàn chỉnh.
