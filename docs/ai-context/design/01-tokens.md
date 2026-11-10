# 01 — Token thiết kế

Nguồn: `src/app/globals.css` (193 dòng). Dưới `:root` là biến `--omts-*`; khối `@theme inline` đặt bí danh sang `--color-*` cho Tailwind v4. `color-scheme: light`, không có token dark.

## Màu
| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--omts-color-primary` / `-accent` | `#086f78` (teal) | Nút chính, liên kết, focus ring, `accent-color` checkbox |
| `-primary-hover` | `#075961` | Hover nút chính |
| `-primary-soft` | `#e7f3f3` | Hover hàng bảng, `::selection`, hover icon-button |
| `-canvas` | `#f5f7fa` | Nền `html`/`body`, BootScreen |
| `-surface` / `-surface-raised` | `#ffffff` | Thẻ, bảng, dialog |
| `-surface-subtle` | `#edf3f5` | Rail bộ lọc, nền skeleton, hover |
| `-text` | `#10243a` | Chữ chính |
| `-text-muted` | `#526674` | Chữ phụ, đầu bảng, gợi ý |
| `-border` | `#e1e7e3` | Đường kẻ, viền thẻ |
| `-border-strong` | `#829ba3` | Viền input |
| `-info` / `-success` | `#086f78` | Trùng primary |
| `-warning` / `-warning-soft` | `#98600b` / `#fef3c7` | Cảnh báo |
| `-danger` / `-danger-soft` | `#b52d42` / `#fff1f2` | Lỗi, nút nguy hiểm |
| `-overlay` | `rgb(15 23 42 / 0.45)` | Nền mờ drawer |
| `-focus-ring` | `#086f78` | Viền focus |

Bí danh Tailwind: `primary`, `primary-hover`, `primary-soft`, `accent`, `canvas`, `surface`, `surface-subtle`, `surface-raised`, `text`, `text-muted`, `border`, `border-strong`, `info`, `success`, `warning`, `warning-soft`, `danger`, `focus-ring`. **Không có** bí danh `danger-soft` và `overlay`.

### Màu hard-code ngoài token (xem file 08)
- Khung menu ngang (`top-shell.module.css`): thanh menu `#315a96` (hover `#2b5088`, active `#294d82`, vạch dưới `#c2d7f5`); nền trang `#f3f5f8`; chữ `#182f47`; hover dropdown `#edf3fc`; avatar `#edf2fa`/viền `#d8e2f1`/chữ `#305eb1`; focus `#8db4ff`; viền `#dce3ed`.
- Màu xanh-xám dùng nhiều trong feature: `#dbe3ed` (41 lần), `#687b90`, `#305eb1`, `#586b80`, `#f7f9fc`.
- Sidebar cũ (`app-shell.module.css`): `#f0f2ef`, `#65716c`, `#235c49`, `#dfe5de`.
- Xám xanh lá trong `management-page.tsx`, `data-grid.module.css`: `#f1f4f0`, `#526b5b`, `#f5f6f5`, `#f7f9f6`, `#75857b`, `#f8f9f7`, `#fafbf9`.
- Auth shell: `--auth-navy #10243a`, `--auth-paper #fbfcfd`, `--auth-pale #d9e8e4`.
- Hàu động: vỏ `#e2dac3`, `#b9af93`, `#8d8570`, nét `#5f594a`, xà cừ `#e9eef0`, `#c9d4d6`, `#bdb4cf`, thịt `#fbf3e0`, `#e6d9b9`, `#c4b48d`, tia/gợn `#8be8d8`, `#5fd3c4`.
- Tiện ích Tailwind dùng thẳng trong feature: `emerald-50`, `rose-50`, `amber-800`, `slate-200`.

## Bo góc
| Token | Giá trị | Dùng |
| --- | --- | --- |
| `--omts-radius-control` | 0.375rem (6px) | Nút, input, icon-button |
| `--omts-radius-card` | 0.625rem (10px) | Thẻ, bảng, dialog (qua `rounded-card`) |
| `--omts-radius-dialog` | 0.875rem (14px) | Có định nghĩa nhưng `Dialog` **không** dùng |

Ad-hoc: pill 5px, avatar `rounded-lg`, empty-state icon `rounded-2xl`, nội dung shell 12px, panel auth 18px, rail lọc 10px, track boot 999px.

## Bóng
- `--omts-shadow-card`: `0 1px 3px rgb(16 36 58 / 0.06)` (toast).
- `--omts-shadow-raised`: `0 12px 36px rgb(16 36 58 / 0.12)` (drawer mobile).
- Dialog: `shadow-2xl`, backdrop `bg-slate-950/45` + `backdrop-blur-[1px]`. Menu tài khoản `0 12px 40px #142b3821`; dropdown `0 14px 32px #142b3826`.

## Khoảng cách và bố cục
- Thang `--omts-space-1..12`: 0.25, 0.5, 0.75, 1, 1.5, 2, 3 rem. **Gần như không dùng**; feature dùng Tailwind hoặc px.
- `--omts-content-max-width: 88rem`. Shell ngang thực tế dùng 1440px cứng.
- Đệm trang (shell ngang): desktop `32px 48px 56px`; 901–1199px ngang 32px; ≤900px `22px 18px`; ≤540px `18px 12px`.
- `html { min-width: 20rem }` (320px).

## z-index (không có token)
| Lớp | Giá trị |
| --- | --- |
| Cột đầu bảng dính (mobile) | 1 |
| Header dính trong dialog | `z-10` |
| Header mobile cũ | 20 |
| Header trên cùng, header desktop dính | 30 |
| Chồng toast | `z-50` |
| Skip link | 100 |

## Breakpoint
Không tùy chỉnh Tailwind (`sm` 640, `lg` 1024). Media query thô trong CSS feature, theo tần suất: `max-width:639px` (11), `600px` (9), `min-width:1024px` (6), `max-width:900px` (5), `min-width:640px` (4), `48rem` (3), `1100px` (3), còn lại 960, 768, 720, 540, 1199, 1200, 80rem, 767, 640.

Ngưỡng của component dùng chung: 640 và 1024 (Button `lg:min-h-10`, Dialog `max-sm`); 640 và 960 (filter-workspace: rail 232px dính từ 960); 639 (data-grid, filter-checks); 1024 (auth shell hai cột), thêm 1200 và max-height 720.

## Chuyển động
- Keyframes: `omts-reveal-from-left`, `omts-reveal-from-bottom` (toast), `omts-dialog-enter` (220ms), `omts-boot-slide`, `omts-boot-breathe`, `omts-page-enter` (0.28s, áp `#workspace-main > section`), `omts-shimmer` (1.4s).
- Nút nhấn `scale(.985)`; hàng đổi màu 140–150ms.
- `prefers-reduced-motion` được tôn trọng ở globals, animated-oyster, Button (`motion-reduce`), openable-table-row và các shell.

## Hành vi toàn cục
- Thanh cuộn **ẩn** (`scrollbar-width: none`, `::-webkit-scrollbar {display:none}`), vẫn cuộn được.
- Khóa cuộn: `html[data-omts-scroll-locked]` đặt `overflow:hidden !important`, `scrollbar-gutter: stable`.
- Focus: `:where(a,button,input,select,textarea,summary):focus-visible` → outline 3px solid focus-ring, offset 3px.
- `disabled` → `cursor: not-allowed`. `scroll-behavior: smooth`. `touch-action: manipulation` trên nút.
- Ẩn icon hiện mật khẩu của Edge: `input[data-password-field]::-ms-reveal/::-ms-clear`.
- Class tiện ích: `.management-heading` (kẻ dưới), `.omts-boot-track`, `.omts-boot-bar`, `.omts-boot-mark`, `.omts-skeleton`.
