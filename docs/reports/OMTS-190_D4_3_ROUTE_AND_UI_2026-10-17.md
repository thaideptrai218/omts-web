# OMTS-190 — D4.3 Route and UI

## Kết quả

Route `/access/accounts` là màn production-facing, không có development showcase. Navigation chỉ hiện khi effective access có `access.accounts.manage`. Mock Owner có capability; SysAdmin không có.

Màn được chia thành:

- `AccountList`: tìm theo display name, username hoặc phone; hiển thị trạng thái và số grant hiệu lực.
- `AccountEditor`: thông tin account, các action nhạy cảm và flow hai bước.
- `AccessGrantEditor`: grant hiện tại, history revoked và pending grant.
- `EffectivePermissionPreview`: union quyền theo từng zone trước khi save.
- `ReasonConfirmDialog`: reason bắt buộc cho lock/unlock/revoke.
- `OneTimeCredentialDialog`: dùng chung D1/D4, không dismiss vô ý, copy fallback và acknowledge rõ ràng.

Owner account được hiển thị read-only để người dùng biết đây là tài khoản được bảo vệ; SCR-09 không cho sửa/khóa nó. Grant Effective có thể bị revoke; grant Revoked chỉ đọc và không có nút restore.

## Luồng chính

1. Owner chọn Thêm tài khoản.
2. Nhập account và ít nhất một grant.
3. Chọn Xem quyền hiệu lực.
4. UI hiển thị union permission theo zone.
5. Owner xác nhận lưu.
6. Mock trả account và one-time temporary password.
7. Sau acknowledge, credential bị gỡ khỏi React tree.

## Defense Q&A

**Tại sao Save không nằm ngay ở form?**

UC11 bước 5 yêu cầu xem quyền hiệu lực trước khi xác nhận. Tách preview thành bước bắt buộc giúp phát hiện role chồng quyền hoặc All zones cấp rộng hơn dự kiến.

**Khóa account có thu hồi grant không?**

Không. Locked chặn login và backend thu hồi session, nhưng dữ liệu/grant vẫn được giữ. Khi unlock chỉ những grant còn hiệu lực mới được dùng.
