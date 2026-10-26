# W2.4c–d — Cấu hình phiên, runtime đọc và DAL quyền

Ngày 25/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`. Tiếp nối W2.4a–b. Theo xác nhận “tiếp tục hàng loạt” sau đề xuất, dùng keyring nhiều phiên bản từ secret server-only; provider/deploy production vẫn chưa chốt. Không bật refresh, không commit secret và chưa thay layout/client mock.

## 1. W2.4c1 — keyring nhiều phiên bản

`session-keyring-config.ts` nhận `active key ID` và tối đa tám cặp `key-id=base64url-32-byte-secret`. Parser từ chối key ID sai, key không đúng 32 byte, duplicate, active key không tồn tại, quá số lượng và getter gây lỗi. Buffer decode tạm được xóa sau khi tạo `KeyObject`; provider chỉ trả key object qua `active()`/`byId()`, không serialize material.

Token mới chỉ dùng active key. Token cũ vẫn mở được nếu key ID cũ còn được giữ. Đây là cơ chế kỹ thuật cho rotation, **không tự chọn lịch rotation/retirement, secret manager hoặc durability production**. `.env.example` chỉ ghi placeholder, không tạo khóa thật.

## 2. W2.4c2–c3 — config và read runtime

`server-session-runtime-config.ts` gom cookie profile, Redis URL/timeouts/namespace và key provider thành một kết quả đã kiểm tra. Không có Redis/key/cookie mặc định, không dùng biến `NEXT_PUBLIC_*` và không fallback RAM.

`server-session-runtime.ts` là composition root có dependency injection để test. Khi mở thành công, nó dùng cùng clock/config để nối Redis store, token protector, cookie reader, resolver và application guard. Runtime có hai đường đọc:

- `resolve`: cho luồng cần biết limited/application phase;
- `resolveApplication`: chỉ cấp capability cho phase application.

`close()` idempotent, đóng đúng Redis connection; mọi resolve sau close fail closed thành unavailable. Factory chưa được import vào product layout, chưa tạo process singleton hoặc connection pool ngầm. Vì vậy đây là runtime có thể ghép, chưa phải bằng chứng Next app đang sử dụng Redis.

## 3. W2.4d1 — application context DAL

`application-context-dal.ts` chỉ gọi backend khi nhận `granted` application session. Nó gọi `/api/me` trước, kiểm account và subject type khớp phiên, rồi mới gọi `/api/me/permissions` và kiểm lại cùng identity. Permission response báo còn gate trong khi BFF session là application sẽ bị từ chối với `phase-mismatch`.

Kết quả thành công chỉ có allowlisted identity và `PermissionProjection`; không có access token, refresh token, raw grants, backend session ID hoặc upstream payload. Lỗi transport được chiếu thành diagnostic tối thiểu; exception/request data không đi ra result.

## 4. W2.4d2 — function capability guard

`function-capability-guard.ts` kiểm ba chiều: function code, action và phạm vi (`zone`, `all-zones`, hoặc `any-assigned-zone` cho discovery). Quyền một vùng không thành all-zones. Kết quả granted chỉ trả danh sách `OwnRecords`/`AssignedZone` đã được cấp, không trả role/raw grants.

Guard **không tự định nghĩa record nào là “của tôi”**. Feature DAL tương lai phải gửi data scope cho backend hoặc áp hợp đồng filtering đã được BA/backend duyệt. Bước này cố ý không nâng `OwnRecords` thành `AssignedZone` và không coi tên role Manager/Accountant là authorization.

## 5. Bằng chứng mục tiêu

- Keyring + boundary: 45/45 PASS; typecheck/lint PASS.
- Runtime config/keyring/boundary: 54/54 PASS; typecheck PASS.
- Read runtime/config/boundary: 46/46 PASS; typecheck/lint PASS.
- Application context DAL/phase/boundary: 59/59 PASS; typecheck/lint PASS.
- Function capability/DAL/boundary: 62/62 PASS; typecheck/lint PASS.

Các lượt trên có test lặp lại; không cộng chúng thành tổng số test mới. Full suite/build và live Redis được kiểm tra ở cuối rồi cập nhật riêng.

Kết quả cuối sau self-review:

- `npm test`: 117 files/1346 PASS; 3 files/27 Redis SKIP.
- `npm run typecheck`, `npm run lint`, `npm run build`: PASS; build vẫn có 13 static product outputs và chưa có session/API route.
- `npm run test:boundary`: 8 intentional negative builds PASS; Webpack và Turbopack đều chặn 5 module W2.4 mới khỏi Client Component.
- `docker info --format '{{.ServerVersion}}'`: FAIL vì không tìm thấy named pipe `dockerDesktopLinuxEngine`. Không có container được tạo; live Redis/runtime chưa chạy lại.

## 6. Tự review và phần chưa hoàn thành

Đã kiểm account/subject/phase consistency, không gọi backend ở anonymous/onboarding/unavailable, không lộ key/token qua JSON result, không tạo default secret/Redis endpoint và giữ data scope. Không phát hiện lỗi logic mới trong focused tests.

Self-review phát hiện **P2 W24-REV-01**: parser private key/Redis ban đầu bỏ qua alias `NEXT_PUBLIC_*`. Nếu một cấu hình vừa có biến private hợp lệ vừa vô tình đặt secret vào alias public, runtime vẫn có thể khởi động trong khi một phần client khác có nguy cơ dùng alias đó. Đã thêm `z.never().optional()` cho hai alias keyring và bốn alias Redis, cộng sáu regression cases. Focused 35/35, full1346 PASS sau sửa. Đây là phòng rò cấu hình; không khẳng định scan được mọi tên secret tùy ý.

Lỗi thao tác khi dựng boundary fixture: lệnh đọc ban đầu đoán `page.tsx`, `tsconfig.json`, `next.config.ts` và `package.json`, trong khi fixture mẫu dùng `page.jsx`/`next.config.mjs` và các file còn lại chưa tồn tại trước build. PowerShell báo `Cannot find path`; dùng inventory thực tế rồi đọc đúng file. Không có source sản phẩm bị thiếu hoặc khôi phục. Generated `.next`, `next-env.d.ts`, `tsconfig.json` của fixture mới được ignore đúng phạm vi.

W2.4 vẫn mở vì chưa có process-level runtime ownership trong Next, chưa bảo vệ layout/Route Handler thật, chưa test anonymous direct endpoint/RSC/prefetch/back/cache và chưa có feature DAL dùng capability result. API mode vẫn mock; refresh, production key lifecycle, Redis deploy/durability và record-ownership contract vẫn giữ nguyên trạng thái chờ.
