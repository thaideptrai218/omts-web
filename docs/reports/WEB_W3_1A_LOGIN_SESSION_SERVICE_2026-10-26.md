# W3.1a — Tạo phiên đăng nhập ở server bằng fixture

Ngày26/10/2026 (Asia/Saigon), nhánh `feature/OMTS-132-web-foundation`. Tiếp tục sau phần route/runtime W2.4. Service này chưa có public HTTP handler và chưa được đưa vào runtime UI; không gọi credentials backend thật, không bật refresh hoặc thay nghiệp vụ xác minh.

## Luồng đã có trong source

`login-session-service.ts` nhận backend requester, session store, token protector, clock và cookie config đã chốt. Nó trim identifier, giữ nguyên password, cố định clientType Web rồi gửi login. Response phải qua schema/server token custody. Không decode JWT để tìm account/session ID.

Sau login, service gọi `/me` để lấy session ID; endpoint này có AllowWhenPasswordChangeRequired và AllowWhenPhoneUnverified trong source backend đã audit. Account và subject phải khớp token response. Các cờ backend được chuyển thành phase theo thứ tự password → contact → application. Service giữ contact gate, không tự coi email verified là đã qua backend phone gate.

Chỉ phase application mới đọc permissions và yêu cầu schema/account/subject/gate đều hợp lệ. Limited phase không gọi endpoint permissions đang bị backend chặn. Sau đó derive C3A, sinh SID mới, mã hóa token bundle, ghi store, kiểm lại thời hạn sau write và chuẩn bị session cookie. Kết quả giữ prepared-cookie wrapper không serializable; không trả JWT/password/profile ra browser.

## Xử lý thất bại

Sai credentials trả HTTP status/code/retry metadata đã được transport lọc, không đọc hoặc xóa cookie phiên đang có. Service chưa nhận request cookie nên không thể tự làm logout một account cũ. Login timeout không được replay vì backend có thể đã tạo phiên.

Sau khi đã có token response hợp lệ, nếu một bước tiếp theo thất bại, service yêu cầu upstream logout theo cách best-effort. Nếu candidate store có thể đã commit nhưng mất phản hồi, chỉ revoke khi đọc được record có sealed packet khớp candidate vừa tạo. Response exists hoặc record khác không bị revoke. Cleanup thất bại không được báo là đã thành công; TTL vẫn giới hạn record không cấp cookie đó.

Giới hạn quan trọng: token response malformed đến mức không xác nhận được credentials thì không có cách cleanup upstream đáng tin cậy. Client cancellation, mất response sau prepared-cookie và request login/logout ở nhiều tab còn phải giải quyết ở public handler/lifecycle W3.1b/W4. Không gọi service fixture là login end-to-end hoàn tất.

## Test và review

15 cases cover: trim identifier/không trim password/Web client type, token trong store được mã hóa, session ID binding, C3A, fresh SID mỗi login, ba tổ hợp limited flags/không gọi permissions, sai credentials không sửa store, identity mismatch, permission gate, expired access, create committed/reply lost, collision không revoke, input sai, login timeout không replay, malformed tokens và expiry qua trong lúc store.create.

Focused15/15 PASS, lint/typecheck/build PASS. Final default suite1414 PASS/31 Redis SKIP;12/12 negative compiler builds (gồm service mới) và24 product HTTP checks PASS. Redis runtime31/31 đã được kiểm riêng trước khi thêm service; không coi service memory fixtures là integration backend. Không đổi dependency, backend/SRS/Jira hoặc commit/push. Self-review đã thêm kiểm hạn sau create để tránh chuẩn bị cookie đã hết hạn nếu Redis write bị chậm; logic cleanup dùng sealed-packet equality để tránh xóa record không thuộc candidate.

## Micro-task tiếp theo

W3.1b cần nối service vào runtime write owner và CSRF/body/schema handler, kiểm cancellation/double submit/mất phản hồi và cookie race cùng logout. W3 hydration phải dùng profile/permission thật trước khi mở business UI. Staff email-OR-phone, Owner forced-password UI, contact purpose và các quyết định còn mở vẫn theo decision register; không chốt lại bằng fixture.
