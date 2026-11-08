# OMTS-193 — D3.2 Quy tắc ma trận, service và mock

## Quy tắc đã triển khai

- Chọn Create/Edit/Delete/other tự thêm View.
- View không thể bị bỏ khi còn action khác.
- Action không được catalog hỗ trợ không được thêm vào draft.
- Scope không được feature hỗ trợ bị loại bỏ; scope bắt buộc chỉ khi catalog ghi `requiredWhenGranted`.
- Mỗi feature phải có đúng một row; row trùng, feature lạ, action/scope lạ và mutation thiếu View đều bị repository revalidate.
- Khi row hết action, scope được xóa để không gửi dữ liệu mồ côi.

## Data flow

`RoleEditor → RoleManagementService → RoleManagementRepository`. Service chuẩn hóa khoảng trắng và action key trùng. Mock adapter revalidate metadata/matrix, version và unique name trước mutation. Component không biết mock storage và không hard-code catalog.

Save role đang dùng với `confirmImpact=false` trả `impact-confirmation-required` cùng danh sách account/zone. Sau khi người dùng xem impact và xác nhận, UI gửi lại draft với `confirmImpact=true`. Discontinue role còn holder trả MSG11 và không mutate. Role rảnh đổi sang Discontinued nhưng vẫn giữ record.

## Lỗi kỹ thuật đã gặp

TypeScript báo TS2322/TS2719 vì các nhánh return có `message.params` khác nhau bị suy luận thành object union chứa các key tùy chọn kiểu `undefined`, không tương thích `Record<string, string | number>`. Vitest vẫn chạy do transpile test không thay thế full typecheck. Cách sửa là khai báo rõ `Promise<RoleMutationResult>` và `Promise<DiscontinueRoleResult>` tại method boundary; compiler sau đó kiểm tra từng discriminated-union member riêng. Bằng chứng: typecheck và lint xanh.

## Kiểm thử chính

- View implication và lock.
- Unsupported action/scope.
- Required scope.
- Duplicate/unknown feature row.
- Duplicate role name trỏ về role hiện hữu.
- Hai bước impact confirmation.
- Discontinue blocked/success không xóa record.
- Service normalization.
