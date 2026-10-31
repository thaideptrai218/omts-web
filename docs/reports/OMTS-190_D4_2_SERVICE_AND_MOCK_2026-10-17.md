# OMTS-190 — D4.2 Service, rules and mock

## Cái gì đã làm

Feature `account-management` có domain contract, Zod schema, effective-permission calculator, repository interface, service và in-memory mock. Component không biết dữ liệu là mock hay HTTP.

Mock bao phủ create/edit, duplicate username/phone, invalid/discontinued role/zone, nhiều grant, All zones, lock/unlock, revoke history, protected Owner và reset password. Temporary password dài 10 ký tự được tạo bằng `crypto.getRandomValues`, chỉ trả trong mutation result và không ghi storage/log.

## Data flow

UI tạo `SaveAccountInput` → service trim text và copy grant draft → repository revalidate metadata/catalog → mutation state trong memory → trả `ManagedAccount` snapshot. Khi create/reset, result có `OneTimeTemporaryCredential`; các mutation khác không mang secret.

Permission preview là hàm thuần. Nó nhận current effective grants + pending drafts, mở rộng All zones sang từng zone hiện hành, tìm role permission rồi union action theo feature. Revoked grant và discontinued zone bị bỏ khỏi preview.

## Lỗi thực tế

### Union type thiếu nhánh reset confirmation

- Lệnh: `npm run typecheck`.
- Thông báo: `MSG09 is not assignable to MSG19` và `confirmation-required` không thuộc `ResetPasswordResult`.
- Nguyên nhân: mock có preflight confirmation nhưng domain union mới chỉ khai báo reset/forbidden/session-expired.
- Sửa: thêm nhánh `confirmation-required` với MSG09 vào contract; không dùng `any` hoặc ép kiểu.
- Bằng chứng: targeted tests và typecheck chạy xanh sau sửa.

### Narrowing bị mất trong callback

- Lệnh: `npm run typecheck`.
- Thông báo: field union còn chứa `grants` khi truyền vào `setFocus`.
- Nguyên nhân: TypeScript không giữ narrowing của object property qua callback `requestAnimationFrame`.
- Sửa: chụp field đã narrow vào biến local trước khi tạo callback.
- Bằng chứng: typecheck pass.

## Defense Q&A

**Tại sao mock vẫn validate lại dù form đã dùng Zod?**

Form validation phục vụ UX. Repository/API boundary là ranh giới tin cậy và phải tự bảo vệ trước payload sai hoặc client bị sửa.

**Tại sao dùng discriminated union?**

Mỗi status chỉ cho phép đúng dữ liệu đi kèm. Ví dụ chỉ `reset` mới có credential; code không thể vô tình đọc password từ nhánh lỗi.
