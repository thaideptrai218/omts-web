# Phase 4 — Gom hub Thiết lập kiểu KiotViet

**Ưu tiên:** Vừa · **Rủi ro:** Thấp · **Đụng:** web · **Trạng thái:** Chờ

## Mục tiêu
`/settings` là nơi duy nhất để tìm mọi cấu hình, chia nhóm rõ, mỗi mục ghi ai sửa được.

## Bố cục (theo `kiotviet-thiet-lap/01-thiet-lap-cua-hang.md`)
| Nhóm | Mục | Sửa |
|---|---|---|
| Cửa hàng (HTX) | Hồ sơ HTX, Ngân hàng nhận tiền, Chứng nhận | Owner |
| Người dùng | Quản lý người dùng (phase 3) | Owner |
| Nuôi trồng | Vùng/bè (link), Thiết lập thu hoạch, Ngưỡng nước | Owner |
| Vật tư & Giống | Đơn vị, nhóm, loại xuất, giá vốn | Owner |
| Nhân sự | Thiết lập nhân sự (checklist), Kỳ lương, Chấm công, Loại công việc & đơn giá | Owner / KT (đơn giá) |
| Bán hàng | Sản phẩm, Khách hàng (ngưỡng nợ, trường bắt buộc) | Owner |
| Tài chính | Sổ quỹ (TK ngân hàng, ví, loại phiếu) | Owner / KT |
| Hệ thống | Nhật ký thao tác, Phiên đăng nhập | Owner |

- Thanh bên trái nhóm + nội dung phải; mục người dùng không có quyền sửa → chỉ xem hoặc ẩn.
- Mục mở dạng panel tại chỗ khi có panel; còn lại link với nhãn "Mở màn".
- Ô tìm kiếm thiết lập.
- Manager mở `/settings`: chỉ thấy mục có quyền xem (thường: không có gì → ẩn bánh răng).

## File
- Sửa: `src/features/settings/settings-page.tsx` (tách `settings-hub-groups.ts` định nghĩa nhóm + gate), `api-workspace-shell.tsx:117-123`, `header-menu.tsx`.
- Dùng lại panel có sẵn; thêm ngưỡng nước (`operations/water-threshold-panel.tsx`), kỳ lương (`hr-setup/payroll-settings-dialog.tsx` dạng panel).
- Redirect URL kép `/employees`, `/farming/zones|rafts` giữ nguyên (không thuộc thiết lập) — chỉ ghi nhận.

## Thành công khi
Mọi mục ở research §5.1 có trong hub; không mục nào chỉ tìm được qua menu khác.
