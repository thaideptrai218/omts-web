# 02 — Typography

## Font (`src/app/layout.tsx`, qua `next/font/google`)
- **Be Vietnam Pro** → `--font-app-sans`. Subset `vietnamese` + `latin`, weight 400/500/600/700, `display: swap`. Stack: `var(--font-app-sans), system-ui, Arial, Helvetica, sans-serif`. Lý do trong code: Geist không có subset tiếng Việt.
- **Geist Mono** → `--font-geist-mono`, chỉ latin. Dùng cho mật khẩu tạm (`font-mono`) và tên đăng nhập trong `employee-screen.module.css`.
- `<html lang="vi" class="… h-full antialiased">`, `<body class="min-h-full flex flex-col">`.
- Metadata: title "HTX Nuôi trồng Thủy sản Trung Nam"; description "Quản lý nuôi hàu, hoạt động hợp tác xã và truy xuất nguồn gốc."
- Body: 1rem, line-height 1.5, `text-rendering: optimizeLegibility`. `[data-currency], td, th, dd` dùng `tabular-nums`.
- Lưu ý: `docs/WEB_NAVIGATION_UX_UPGRADE_PLAN.md` còn ghi "giữ Geist" — lỗi thời.

## Thang chữ thực tế
| Ngữ cảnh | Cỡ |
| --- | --- |
| `text-sm` (516 lần, chiếm đa số) | 14px |
| `text-xs` (108) | 12px |
| `text-lg` / `text-xl` / `text-base` / `text-2xl` | 18 / 20 / 16 / 24px |
| `h1` trang (`ManagementHeading`) | 1.5rem, 1.65rem từ `sm`, weight 600, tracking `-.035em` |
| Mô tả trang | 13px, line-height 1.5rem |
| Nút | 13px, weight 500 |
| Ô bảng / đầu bảng | 13px / 11px (đầu bảng weight 550) |
| Status pill | 11px, weight 500 |
| Số tổng hợp | `text-xl`, `sm:text-2xl`, semibold, tabular |
| Tiêu đề dialog | `text-xl`, semibold, tracking chặt |
| Nhãn form | `text-sm` semibold (`FormField`); `text-xs` medium muted (`Field` của operations) |
| Link nav / tiêu đề nhóm | 13px / 10px |
| Tiêu đề login | 36px (30px ≤639px), weight 650 |
| Chữ auth | 14px |
| `h2` panel auth | `clamp(32px,3.3vw,48px)`, weight 450 |
| Chữ tài khoản | 10–11px |

`font-size` CSS phổ biến nhất: 12px (129), 13px (64), .875rem (61), .75rem (50), .8125rem (41), 11px (35).
