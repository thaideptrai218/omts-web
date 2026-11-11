# 07 — Thương hiệu và tài sản hình ảnh

## Tệp
- `public/brand/trung-nam-oyster.webp` — tài sản công khai duy nhất (9.380 byte, 450×450). Là ảnh hàu do người dùng cung cấp (báo cáo 08/11/2026). **Không có** logo SVG trong `public/`.
- `src/app/favicon.ico`, `icon.png`, `apple-icon.png` — sinh từ cùng nguồn (ICO 16/32/48, PNG 192, Apple PNG 180), theo quy ước metadata của Next.

## Component (`src/components/brand/`)
- `brand-mark.tsx` — `BrandMark({compact, iconOnly, autoReveal, tone})`: ô icon 32px `rounded-lg` (compact) hoặc 44px bo `.7rem`, nền trắng có viền, ảnh webp đệm 2px; chữ "HTX Trung Nam" đậm `text-lg`; dòng phụ "Quản lý nuôi hàu · Truy xuất nguồn gốc" (ẩn khi compact); `iconOnly` đặt chữ `sr-only`; `tone="inverse"` cho nền tối; `autoReveal` cần cha `group/sidebar` (sidebar cũ).
- `oyster-mark.tsx` — SVG line-art hàu và ngọc 40×40 dùng `currentColor`. Không có nơi import ngoài chính nó.
- `animated-oyster.tsx` + `.module.css` — SVG trang trí (`aria-hidden`) 400×400 chỉ dùng ở panel auth. Kích thước `clamp(240px,30vw,400px)`. Vỏ mở theo chu kỳ 10 giây, thịt đập nhịp, bong bóng nổi, tia sáng đung đưa, gợn lan. Parallax theo con trỏ ghi `--px`/`--py` mỗi frame; reduced-motion đóng băng ở trạng thái vỏ mở nửa.

## Chưa kiểm kê
CSS của landing (`src/features/landing/*.module.css`), dashboard, trang `origin` và bảng màu biểu đồ chưa được đọc.
