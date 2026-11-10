# DESIGN — Hệ thống thiết kế

Quét ngày 09/11/2026 từ source. Mọi giá trị đều trích từ code; khi code đổi, cập nhật lại các file này.

| File | Nội dung |
| --- | --- |
| [01-tokens.md](01-tokens.md) | Màu, bo góc, bóng, khoảng cách, z-index, breakpoint, chuyển động |
| [02-typography.md](02-typography.md) | Font, thang chữ |
| [03-components.md](03-components.md) | Từng component dùng chung: props, trạng thái, truy cập |
| [04-layout-shell.md](04-layout-shell.md) | Khung ứng dụng, auth shell, sidebar cũ |
| [05-patterns.md](05-patterns.md) | Trang danh mục, hộp thoại, form, trạng thái, định dạng số/ngày |
| [06-copy-and-glossary.md](06-copy-and-glossary.md) | Giọng văn, bảng thuật ngữ tiếng Việt |
| [07-brand-assets.md](07-brand-assets.md) | Logo, icon, hoạt ảnh |
| [08-known-inconsistencies.md](08-known-inconsistencies.md) | Chỗ code và tài liệu chưa khớp, cần quyết định |

## Tóm tắt nhanh
- Khung thật: **thanh menu ngang phía trên** (top navigation), không phải sidebar. Code sidebar còn lại gần như không dùng.
- Màu token: teal `#086f78`. Nhưng khung menu ngang đang hard-code bảng màu xanh khác (`#315a96`). Xem file 08.
- Font: Be Vietnam Pro (chữ) + Geist Mono (mã).
- Không có dark mode, không có breadcrumb.
- Chữ giao diện tiếng Việt; tiền `vi-VN` kèm "₫"; ngày `dd/MM/yyyy`, múi giờ Asia/Ho_Chi_Minh.
