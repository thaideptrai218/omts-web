# OMTS-183 — Báo cáo D2.1 đến D2.3

Ngày: 2026-10-17
Phạm vi: SCR-07 cooperative profile foundation, chưa dựng route/UI và chưa nối QA API.

## Nguồn đã đối chiếu

- Jira `OMTS-183`: form SCR-07, activity nhiều dòng, ngân hàng chọn từ danh sách, preview tên + địa chỉ, MSG01/02/10.
- Jira `OMTS-144`: danh sách trường bắt buộc, unique tax ID, Preliminary → Completed, audit và snapshot QR cũ không đổi.
- Jira `OMTS-182`: backend API hiện vẫn To Do.
- Jira `OMTS-184`: QA cần kiểm tra non-owner, validation, status transition, audit và bank data không xuất hiện trong public projection.
- SRS Report 3: UC09 và SCR-07.

## Phần đã xác nhận

Cooperative Owner là actor sửa hồ sơ. Form gồm tên HTX, mã số thuế, địa chỉ, điện thoại, email/website tùy chọn, người đại diện pháp luật, ít nhất một ngành nghề và tài khoản nhận chuyển khoản. Bước preview/public projection chỉ có tên và địa chỉ.

SRS/Jira không cho phép dùng dữ liệu mới để sửa ngược các phiên bản QR đã công bố. Frontend hiện chỉ mô hình hóa preview của lần công bố tiếp theo; không giả lập sửa publication snapshot.

## Xung đột chưa tự quyết

Tài liệu chức năng dẫn xuất `docs_v2` nói Staff có `COOPERATIVE.Read` có thể xem read-only, nhưng chính review note của tài liệu này ghi Permission Matrix và UC09 canonical chưa thống nhất. Contract hiện trả MSG02 cho non-owner và chưa cấp Staff route. Nếu nhóm phê duyệt read-only sau này, cần bổ sung capability đọc riêng; không biến quyền đọc thành quyền sửa.

## Thiết kế kỹ thuật

`PublicCooperativeProjection` chỉ có `cooperativeName` và `officeAddress`. Đây là biện pháp privacy theo kiểu dữ liệu: code sử dụng projection không thể vô tình đọc `taxId` hay `receivingBankAccount` nếu chưa cố ý đổi contract.

Repository trả discriminated union cho load/save. Save có các nhánh `saved`, `invalid-input`, `duplicate-tax-id`, `conflict`, `forbidden` và `session-expired`. `recordVersion` được gửi lại khi save để phát hiện stale edit thay vì ghi đè âm thầm.

Bank catalog được inject vào mock repository. Component sau này chỉ render danh mục service cung cấp, không tự hard-code một danh sách ngân hàng được xem như production truth.

## Kiểm tra

- `npm test -- --run src/features/cooperative-profile src/shared/messages/message-catalog.test.ts`: 4 files, 32 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `git diff --check`: passed.

## Giới hạn và bước tiếp theo

Phone mới kiểm tra required; format canonical phải xác nhận với backend. Tax ID dùng quy tắc 10 chữ số hoặc `10 chữ số-3 chữ số` trong tài liệu chức năng hiện hành và cần đối chiếu lại khi OpenAPI có sẵn. D2.4 tiếp theo sẽ dựng route, loading/forbidden state và navigation cho Owner.
